#!/usr/bin/env node
// Studio Lite CLI: one scenario file per video -> mp4.  See README.md
//   node studio.js voice-script <ep>        print lines per speaker (text to feed into TTS)
//   node studio.js prep <ep>                align voice files to script lines (words.json or whisper)
//   node studio.js build <ep>               compile episode.mjs -> work/<ep>/compiled.json (prints timeline)
//   node studio.js preview <ep> [t1,t2,..|shots] [--res WxH]   still frames + contact sheet
//   node studio.js render <ep> [--res 810x1440] [--ao] [--chunk 48]   resumable render -> renders/<ep>.mp4
import fs from 'fs'; import path from 'path'; import http from 'http'; import { createHash } from 'crypto'; import { spawn, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { SETS } from './engine/setdata.mjs';
import { gains as spatialGains, sourceAt as spatialSource, ffmpegPan } from './tools/spatial.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = (await import('ffmpeg-static')).default;
const argv = process.argv.slice(2), cmd = argv[0], EP = argv[1];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const epDir = ep => path.join(ROOT, 'episodes', ep), workDir = ep => { const d = path.join(ROOT, 'work', ep); fs.mkdirSync(d, { recursive: true }); return d; };
const log = (...a) => console.log(...a);
const r2 = x => Math.round(x * 1000) / 1000;

async function loadEpisode(ep) {
  const f = path.join(epDir(ep), 'episode.mjs');
  const mod = await import(pathToFileURL(f).href + '?v=' + fs.statSync(f).mtimeMs);
  return mod.default;
}
// ---------- script lines in order ----------
const tokens = text => text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
function scriptLines(E) {
  const out = []; let n = {};
  E.scenes.forEach((sc, si) => sc.beats.forEach((b, bi) => { if (!b.say) return; const [spk, text] = b.say; n[spk] = (n[spk] || 0); out.push({ spk, text, k: n[spk]++, si, bi }); }));
  return out;
}
// ---------- audio helpers ----------
function decode(file, sr = 16000) {
  const r = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (r.status) throw new Error('ffmpeg decode failed ' + file + r.stderr);
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
}
function voiceFile(ep, spk) { for (const ext of ['mp3', 'wav', 'm4a', 'ogg']) { const f = path.join(epDir(ep), 'voice', `${spk}.${ext}`); if (fs.existsSync(f)) return f; } return null; }

// ---------- prep: align ----------
async function prep(ep, E) {
  const lines = scriptLines(E), bySpk = {};
  for (const l of lines) (bySpk[l.spk] ||= []).push(l);
  const wfile = path.join(epDir(ep), 'voice', 'words.json');
  let words = fs.existsSync(wfile) ? JSON.parse(fs.readFileSync(wfile, 'utf8')) : {};
  // voice/<spk>/1.mp3, 2.mp3 ... (one clip per line) -> joined voice/<spk>.mp3 with 0.8s pauses
  const partsBy = {};
  for (const spk of Object.keys(bySpk)) {
    const dir = path.join(epDir(ep), 'voice', spk); if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    const parts = fs.readdirSync(dir).filter(f => /^\d+\.(mp3|wav|m4a|ogg)$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).map(f => path.join(dir, f));
    if (!parts.length) continue;
    partsBy[spk] = parts;
    const out = path.join(epDir(ep), 'voice', spk + '.mp3');
    const newest = Math.max(...parts.map(f => fs.statSync(f).mtimeMs));
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs > newest) continue;
    if (parts.length !== bySpk[spk].length) log(`! ${spk}: ${parts.length} clips for ${bySpk[spk].length} lines`);
    const ins = parts.flatMap(f => ['-i', f]);
    const fc = parts.map((_, i) => `[${i}:a]aresample=44100,aformat=channel_layouts=mono,apad=pad_dur=0.8[a${i}]`).join(';') + ';' + parts.map((_, i) => `[a${i}]`).join('') + `concat=n=${parts.length}:v=0:a=1[o]`;
    const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex', fc, '-map', '[o]', '-b:a', '160k', out], { encoding: 'utf8' });
    if (r.status) throw new Error('join failed: ' + r.stderr);
    if (!(words[spk] && words[spk].filter(w => w[3] === '|').length === parts.length)) delete words[spk]; log(`joined ${parts.length} clips -> voice/${spk}.mp3`);
  }
  const missing = Object.keys(bySpk).filter(s => !words[s] && voiceFile(ep, s));
  if (missing.length) {
    const py = fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3';
    log('whisper:', missing.join(', '));
    const files = missing.flatMap(s => partsBy[s] || [voiceFile(ep, s)]);
    const r = process.env.NOWHISPER ? { status: 1, stderr: 'NOWHISPER' } : spawnSync(py, [path.join(ROOT, 'tools/align.py'), E.lang || 'ru', ...files], { maxBuffer: 1 << 26, encoding: 'utf8', env: { ...process.env, FFMPEG } });
    let res;
    if (r.status) {
      // fallback without whisper: one clip per line -> evenly spread script tokens over the clip (line boundaries stay exact)
      if (!missing.every(s => partsBy[s] && partsBy[s].length === bySpk[s].length)) throw new Error('align.py failed (run: bash setup.sh --whisper)\n' + r.stderr);
      log('! whisper unavailable -> even word timing per clip');
      res = missing.flatMap(s => partsBy[s].map((f, i) => { const d = decode(f).length / 16000, tk = tokens(bySpk[s][i].text), a = .08, b = Math.max(a + .1, d - .1); return tk.map((w, j) => [w, r2(a + (b - a) * j / tk.length), r2(a + (b - a) * (j + 1) / tk.length)]); }));
    } else res = JSON.parse(r.stdout);
    let k = 0;
    for (const s of missing) {
      if (!partsBy[s]) { words[s] = res[k++]; continue; }
      // per-clip words, shifted by the clip offsets inside the joined file
      let off = 0; words[s] = [];
      for (const f of partsBy[s]) { const d = decode(f).length / 16000; const ws = res[k++]; if (!ws.length) ws.push(['…', 0.05, d - 0.05]); ws[ws.length - 1][2] = Math.max(ws[ws.length - 1][2], d - 0.04); ws[ws.length - 1].push('|'); words[s].push(...ws.map(w => [w[0], +(w[1] + off).toFixed(3), +(w[2] + off).toFixed(3), ...w.slice(3)])); off += d + 0.8; }
    }
    fs.writeFileSync(wfile, JSON.stringify(words));
  }
  const align = {};
  for (const [spk, ls] of Object.entries(bySpk)) {
    const file = voiceFile(ep, spk); if (!file) { log(`! no voice file for "${spk}" — lines will use estimated timing`); continue; }
    const pcm = decode(file), fdur = pcm.length / 16000, W = words[spk] || [];
    const need = ls.map(l => tokens(l.text).length), total = need.reduce((a, b) => a + b, 0);
    if (W.length !== total && !W.some(w => w[3] === '|')) log(`! ${spk}: whisper words ${W.length} vs script tokens ${total} (boundaries snapped to pauses)`);
    // boundaries: expected by token count, snapped to the longest pause within +-2 words
    const bounds = []; let acc = 0;
    for (let i = 0; i < ls.length - 1; i++) {
      acc += need[i]; let e = Math.round(acc / total * W.length);
      let best = e, bg = -1;
      for (let j = Math.max(1, e - 2); j <= Math.min(W.length - 1, e + 2); j++) { const gap = W[j][1] - W[j - 1][2] - Math.abs(j - e) * .04; if (gap > bg && (!bounds.length || j > bounds[bounds.length - 1])) { bg = gap; best = j; } }
      bounds.push(best);
    }
    const marks = W.map((w, i) => w[3] === '|' ? i + 1 : -1).filter(i => i > 0);
    if (marks.length === ls.length) bounds.splice(0, bounds.length, ...marks.slice(0, -1));   // one clip per line: exact
    const segs = []; let prev = 0;
    for (const b of [...bounds, W.length]) { segs.push({ ws: W.slice(prev, Math.max(b, prev + 1)) }); prev = Math.max(b, prev + 1); }
    segs.forEach((sg, i) => {
      const ws = sg.ws, first = ws[0], last = ws[ws.length - 1];
      const prevEnd = i ? segs[i - 1].ws[segs[i - 1].ws.length - 1][2] : 0;
      const nextStart = i < segs.length - 1 ? segs[i + 1].ws[0][1] : fdur;
      const ss = Math.max(prevEnd + .01, first[1] - .06, 0), to = Math.min(nextStart - .03, last[2] + .18, fdur);
      // mouth envelope (30 Hz)
      const rate = 30, env = [];
      // Typed arrays require integer indices: adding a fractional hop (16000/30)
      // made almost every later sample undefined and the mouth mostly static.
      for (let f = 0; ; f++) {
        const k = Math.floor(ss * 16000 + f * 16000 / rate);
        if (k >= to * 16000) break;
        const end = Math.min(pcm.length, Math.floor(ss * 16000 + (f + 1) * 16000 / rate));
        let s = 0; for (let j = k; j < end; j++) s += pcm[j] * pcm[j];
        env.push(Math.sqrt(s / Math.max(1, end - k)));
      }
      sg.out = { file: path.relative(ROOT, file), ss: r2(ss), to: r2(to), words: ws.map(w => [w[0], r2(w[1] - ss), r2(w[2] - ss)]), env };
    });
    const all = segs.flatMap(s => s.out.env).sort((a, b) => a - b), p95 = all[Math.floor(all.length * .95)] || 1;
    segs.forEach((sg, i) => { const e = sg.out.env.map(v => Math.min(1, Math.pow(v / p95, .7))); sg.out.env = e.map((v, k) => r2(Math.max(0, (v + (e[k - 1] ?? v) * .5) / 1.5 - .08) * 1.1)); align[`${spk}#${i}`] = { ...sg.out, text: ls[i].text }; });
  }
  fs.writeFileSync(path.join(workDir(ep), 'align.json'), JSON.stringify(align));
  log('aligned', Object.keys(align).length, 'lines');
  return align;
}

// ---------- crowd looks ----------
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// voice effects: 'zombie' | 'zombie:0.7' (pitch) | 'tv' | 'radio' | raw ffmpeg filter string ending with ','
function voiceFx(spec) {
  if (!spec) return '';
  if (typeof spec === 'string' && spec.endsWith(',')) return spec;
  const [kind, arg] = String(spec).split(':');
  if (kind === 'zombie') { const p = parseFloat(arg || '0.78'); return `aresample=44100,asetrate=${Math.round(44100 * p)},aresample=44100,atempo=${(1 / p).toFixed(4)},vibrato=f=5.5:d=0.2,acrusher=bits=9:mix=0.22:mode=log,bass=g=6,aecho=0.8:0.55:45|95:0.3|0.16,volume=1.35,`; }
  if (kind === 'tv') return 'highpass=f=320,lowpass=f=3300,acrusher=bits=11:mix=0.12:mode=log,volume=1.6,';
  if (kind === 'radio') return 'highpass=f=500,lowpass=f=2600,acrusher=bits=8:mix=0.25:mode=log,volume=1.8,';
  return '';
}
function zombieLooks(n, seed) {
  const R = mulberry32(seed || 13), pick = a => a[Math.floor(R() * a.length)];
  const skins = ['#8fae7a', '#9db38a', '#7f9c6e', '#a6b48e', '#8ba382', '#98a87a'];
  const shirts = ['#5c5f66', '#7a6a55', '#4f6170', '#6b4f4f', '#80745e', '#3f5a4a', '#9a8f7a', '#6a5a7a', '#8a4a3a', '#c9c2b0'];
  const pants = ['#2f3135', '#3b4552', '#4a3f35', '#2b3a2f', '#555'];
  const hair = ['#2b1d14', '#4a3a2a', '#6b6b5a', '#1a1a1a', '#5a4030', '#8a8a7a'];
  const styles = ['short', 'spiky', 'bald', 'long', 'short', 'none', 'cap'];
  return Array.from({ length: n }, () => ({ zombie: true, torn: 1 + R() * .8, shirt: pick(shirts), shirtKind: pick(['plain', 'plain', 'stripes', 'hoodie', 'plaid']), stripe: '#d8d0c0', pants: pick(pants), shoe: pick(['#3a3a3a', '#5a4a3a', '#222']), skin: pick(skins), hair: pick(hair), hairStyle: pick(styles), cap: pick(shirts), sleeve: R() > .5 ? .45 : .9, tie: R() > .8 ? pick(['#8a1c1c', '#1c3a8a']) : undefined, face: { browW: 12 } }));
}
function crowdLooks(n, seed) {
  const R = mulberry32(seed || 7), pick = a => a[Math.floor(R() * a.length)];
  const shirts = ['#e8590c', '#1c7ed6', '#f783ac', '#40c057', '#fab005', '#7950f2', '#12b886', '#fa5252', '#ffffff', '#343a40', '#74c0fc', '#ffd43b'];
  const pants = ['#343a40', '#1864ab', '#495057', '#5c3d2e', '#2b8a3e', '#212529', '#868e96'];
  const hair = ['#2b1d14', '#4a2c17', '#e0b050', '#141414', '#8a3b12', '#c9c9c9', '#6b4423'];
  const styles = ['short', 'spiky', 'long', 'ponytail', 'cap', 'bun', 'short', 'cap'];
  const kinds = ['plain', 'plain', 'stripes', 'hoodie', 'plain'];
  const skins = ['#f3d6ae', '#e8bf8f', '#c98f5f', '#8d5a3b', '#f7dcc0'];
  return Array.from({ length: n }, () => { const st = pick(styles), fem = st === 'long' || st === 'ponytail' || st === 'bun'; return { shirt: pick(shirts), shirtKind: pick(kinds), stripe: '#fff', pants: pick(pants), shoe: pick(['#ffffff', '#222', '#e03131']), skin: pick(skins), hair: pick(hair), hairStyle: st, cap: pick(shirts), bow: pick(shirts), sleeve: R() > .5 ? .45 : .9, face: { lashes: fem, lips: fem && R() > .5 ? '#c2255c' : undefined, freckles: R() > .8 } }; });
}

// ---------- compile ----------
function resolvePos(set, p) {
  if (Array.isArray(p)) return [...p];
  if (typeof p === 'string') { const m = p.match(/^(\w+)([+-].*)?$/); const a = SETS[set].anchors[m[1]]; if (!a) throw new Error(`unknown anchor "${p}" in set ${set}`); return [...a]; }
  if (p && p.at) { const b = resolvePos(set, p.at); const o = p.off || [0, 0, 0]; return [b[0] + o[0], b[1] + o[1], b[2] + o[2]]; }
  throw new Error('bad position ' + JSON.stringify(p));
}
const norm = w => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').replace(/ё/g, 'е');

async function build(ep, quiet) {
  const E = await loadEpisode(ep);
  const af = path.join(workDir(ep), 'align.json');
  const align = fs.existsSync(af) ? JSON.parse(fs.readFileSync(af, 'utf8')) : await prep(ep, E);
  const fps = E.fps || 30;
  const speakers = {}; for (const [id, s] of Object.entries(E.speakers || {})) speakers[id] = { name: s.name || id.toUpperCase(), color: s.color || '#333', narrator: !!s.narrator, fx: voiceFx(s.fx) };
  const looks = { ...(E.cast || {}) };
  const crowdN = E.crowd?.count || 0, cl = E.crowd?.kind === 'zombie' ? zombieLooks(crowdN, E.crowd?.seed) : crowdLooks(crowdN, E.crowd?.seed); const crowdIds = cl.map((_, i) => 'c' + i); cl.forEach((l, i) => looks['c' + i] = l);
  const C = { title: E.title, inspect: E.inspect || 0, camBounds: E.camBounds || null, fps, speakers, subStyle: E.subtitles || 'cards', look: E.look || null, handheld: E.handheld ?? 1, looks: [], scenes: [], speech: [], overlays: [], punches: [], shakes: [], audio: { voices: [], sfx: [], music: null }, ...(E.spatial ? { spatial: E.spatial } : {}) };
  const spkCount = {}; let T = 0;
  const SFX_SUB = {}; // aliases: { oldName: 'newName' }
  const sfx = (name, t, o = {}) => { name = SFX_SUB[name] || name; const f = path.join(ROOT, 'assets/sfx', name + '.mp3'); if (!fs.existsSync(f)) throw new Error('no sfx ' + name); const n = o.count || 1; for (let i = 0; i < n; i++) C.audio.sfx.push({ file: path.relative(ROOT, f), at: r2(t + i * (o.every || 0)), vol: o.vol ?? 1, ...(o.at != null ? { src: o.at } : {}), ...(o.wet != null ? { wet: o.wet } : {}), ...(o.flat ? { flat: 1 } : {}), ...(o.tv ? { tv: 1 } : {}), ...(o.dur ? { ss: o.ss || 0, to: (o.ss || 0) + o.dur } : {}) }); };
  const timeline = [];

  E.scenes.forEach((S, si) => {
    const set = S.set; if (!SETS[set]) throw new Error('unknown set ' + set);
    const sc = { set, light: S.light || 'day', look: S.look || null, fills: S.fills || [], t0: r2(T), props: { ...(S.props || {}) }, actors: {}, world: [], shots: [], colliders: S.colliders || [], doors: (S.doors || []).map(d => ({ ...d, at: resolvePos(set, d.at), hits: [...(d.hits || [])] })), tvs: (S.tvs || []).map(v => ({ ...v, at: resolvePos(set, v.at) })), models: (S.models || []).map(m => ({ ...m, at: resolvePos(set, m.at) })), floorY: S.floorY ?? 0 };
    // actors (main cast)
    const ev = {}; const addEv = (id, t, cmd, arg) => { if (!sc.actors[id]) throw new Error(`actor "${id}" not in scene ${si + 1} cast`); (ev[id] ||= []).push({ t: r2(t), cmd, arg }); };
    const lookEv = {};
    for (const [id, c] of Object.entries(S.cast || {})) {
      if (!looks[id]) throw new Error('no look for cast member ' + id);
      sc.actors[id] = { app: looks[id], init: { pos: resolvePos(set, c.at || [0, 0, 0]), rot: c.rot || 0, visible: c.visible !== false, pose: c.pose || 'idle', expr: c.expr || 'neutral', hold: c.hold || {}, shades: !!c.shades, apron: !!c.apron, pack: c.pack !== false }, mode: c.look ?? 'auto' };
    }
    // crowd
    let queue = [];
    if (S.crowd) {
      const q = S.crowd.queue, from = S.crowd.place ? [0, 0, 0] : resolvePos(set, q?.from || 'front'), step = q?.step || [1.95, 0, 0], n = Math.min(q?.n ?? crowdN, crowdN), off = q?.offset || 0;
      if (S.crowd.place) {
        S.crowd.place.forEach((pl, i) => { const id = crowdIds[i]; if (!id) return; const p = resolvePos(set, Array.isArray(pl) ? [pl[0], 0, pl[1]] : pl.at); sc.actors[id] = { app: looks[id], init: { pos: p, rot: Array.isArray(pl) ? (pl[2] ?? 0) : (pl.rot ?? 0), visible: pl.visible !== false, pose: pl.pose || S.crowd.pose || 'zombie', expr: pl.expr || S.crowd.expr || 'neutral', hold: {} }, mode: pl.look || S.crowd.look || 'none', crowd: true }; queue.push(id); });
        sc.queueSlots = queue.map(id => sc.actors[id].init.pos);
      } else
      crowdIds.forEach((id, i) => {
        const inQ = i < n, p = [from[0] + step[0] * (i + off), from[1] + step[1] * (i + off), from[2] + step[2] * (i + off) + (inQ ? Math.sin(i * 2.3) * .25 : 0)];
        sc.actors[id] = { app: looks[id], init: { pos: p, rot: (q?.rot ?? -1.15) + Math.sin(i * 1.7) * .12, visible: inQ, pose: S.crowd.pose || 'idle', expr: S.crowd.expr || ['neutral', 'happy', 'bored', 'neutral'][i % 4], hold: {} }, mode: S.crowd.look ?? 'auto', crowd: true };
        if (inQ) queue.push(id);
      });
      sc.queueSlots = queue.map(id => sc.actors[id].init.pos);
    }
    const chipT = T + .1;
    if (S.chip) C.overlays.push({ kind: 'chip', text: S.chip, t: r2(chipT), dur: 2.4, color: S.chipColor });
    const tr = S.transition ?? E.transition ?? 'flash';
    if (si > 0 && tr === 'flash') { C.overlays.push({ kind: 'flash', t: r2(T), dur: .22, alpha: .7 }); sfx('swoosh', Math.max(0, T - .12), { vol: .55 }); }
    if (si > 0 && tr === 'black') C.overlays.push({ kind: 'dip', t: r2(T - .2), dur: .5 });
    if (si > 0 && tr === 'whoosh') sfx('whoosh', Math.max(0, T - .15), { vol: .45 });
    let cursor = T, shotStart = T, lastCam = null;
    const pushShot = (t, cam) => { const spec = normCam(set, cam); sc.shots.push({ t0: r2(t), cam: spec }); };

    S.beats.forEach((B, bi) => {
      const gap = B.gap ?? E.gap ?? (bi === 0 ? (si === 0 ? .3 : .22) : .18);
      const start = cursor + gap; let sStart = start + (B.pre || 0), sEnd = sStart, line = null;
      if (B.say) {
        const [spk, text] = B.say; const k = spkCount[spk] = (spkCount[spk] ?? -1) + 1; const A = align[`${spk}#${k}`];
        if (A && A.text !== text) log(`! line text changed since prep: ${spk}#${k} — run prep`);
        const disp = tokens(text);
        if (A) { sEnd = sStart + (A.to - A.ss); line = { spk, t0: r2(sStart), t1: r2(sEnd), text, display: disp, words: A.words, env: A.env, envRate: 30 }; C.audio.voices.push({ file: A.file, ss: A.ss, to: A.to, at: r2(sStart), fx: speakers[spk]?.fx || '', vol: E.speakers?.[spk]?.volume ?? 1, spk, ...(B.src !== undefined ? { src: B.src } : {}), ...(B.tv || E.speakers?.[spk]?.tv ? { tv: 1 } : {}), ...(B.wet != null ? { wet: B.wet } : {}) }); }
        else { const d = disp.length * .38 + .3; sEnd = sStart + d; line = { spk, t0: r2(sStart), t1: r2(sEnd), text, display: disp, words: disp.map((w, i) => [w, i * .38, i * .38 + .34]), env: [], envRate: 30 }; }
        C.speech.push(line);
      }
      const end = Math.max(sEnd + (B.hold ?? E.hold ?? .28), start + (B.dur || 0), B.say ? 0 : start + 1);
      const at = (v) => {
        if (v == null) return start;
        if (typeof v === 'number') return start + v;
        const m = String(v).match(/^(.*?)([+-]\d*\.?\d+)?$/); let base = m[1], off = m[2] ? parseFloat(m[2]) : 0, t;
        if (base === 'start' || base === '') t = start; else if (base === 'end') t = end; else if (base === 'speech') t = sStart; else if (base === 'speechEnd') t = sEnd;
        else if (base.startsWith('w:')) {
          if (!line) throw new Error('w: reference in beat without say');
          const key = base.slice(2); let idx = /^\d+$/.test(key) ? parseInt(key) - 1 : line.display.findIndex(w => norm(w).startsWith(norm(key)));
          if (idx < 0) throw new Error(`word "${key}" not found in "${line.text}"`); const wi = line.words.length === line.display.length ? idx : Math.round(idx * (line.words.length - 1) / Math.max(1, line.display.length - 1)); t = sStart + line.words[Math.min(wi, line.words.length - 1)][1];
        } else throw new Error('bad at: ' + v);
        return t + off;
      };
      // camera at beat start (cut lands in the gap, just before speech)
      if (B.cam) { pushShot(bi === 0 ? T : cursor + Math.min(gap, .12), B.cam); }
      else if (bi === 0) pushShot(T, S.cam || 'wide');
      for (const d of B.do || []) {
        const [tg, c, arg, when, o = {}] = d; const t = at(when);
        if (tg === 'sfx') { sfx(c, t, arg || {}); continue; }
        if (tg === 'fx') {
          if (c === 'big') C.overlays.push({ kind: 'big', text: arg, t: r2(t), ...o });
          else if (c === 'sparkle') C.overlays.push({ kind: 'sparkle', pos: arg, t: r2(t) });
          else if (c === 'views') C.overlays.push({ kind: 'views', t: r2(t), ...(arg || {}) });
          else if (c === 'stream') C.overlays.push({ kind: 'stream', t: r2(t), ...(arg || {}) });
          else if (c === 'flash') C.overlays.push({ kind: 'flash', t: r2(t), dur: arg || .25 });
          else if (c === 'credit') C.overlays.push({ kind: 'credit', text: arg, t: r2(t), dur: o.dur || 3 });
          else if (c === 'fade') C.overlays.push({ kind: 'fade', dir: arg, t: r2(t), dur: o.dur || .5, ...(o.end != null ? { end: r2(t + o.end) } : {}) });
          else if (c === 'nv') C.looks.push({ t: r2(t), dur: o.dur || arg || 2, nv: 1 });
          else if (c === 'red') C.looks.push({ t: r2(t), dur: o.dur || .6, red: arg || .6 });
          else if (c === 'underwater') C.looks.push({ t: r2(t), dur: o.dur || 2, uw: arg || 1 });
          else if (c === 'binary') C.overlays.push({ kind: 'binary', t: r2(t), dur: o.dur || 2, amt: arg || 1, col: o.col });
          else if (c === 'glitch') C.overlays.push({ kind: 'glitch', t: r2(t), dur: o.dur || .35, amt: arg || 1 });
          else throw new Error('unknown fx ' + c);
          continue;
        }
        if (tg === 'cam') {
          if (c === 'punch') C.punches.push({ t: r2(t), amt: arg || .16 });
          else if (c === 'shake') C.shakes.push({ t: r2(t), amt: arg || .15, dur: o.dur || .5 });
          else if (c === 'cut') pushShot(t, arg);
          else throw new Error('unknown cam cmd ' + c);
          continue;
        }
        if (tg === 'set') {
          if (c === 'move') { sc.world.push({ kind: 'move', name: arg.prop, to: arg.to, rot: arg.rot, rx: arg.rx, rz: arg.rz, t: r2(t), dur: arg.dur || 2, ease: arg.ease || 'in', shake: arg.shake || 0 }); continue; }
          if (c === 'blood') { const list = Array.isArray(arg) ? arg : [arg]; for (const b of list) sc.world.push({ kind: 'blood', ...b, at: resolvePos(set, b.at), t: r2(t + (b.delay || 0)) }); continue; }
          if (c === 'fire') { const list = Array.isArray(arg) ? arg : [arg]; for (const f of list) sc.world.push({ kind: 'fire', ...f, at: f.prop ? f.at : resolvePos(set, f.at), t: r2(t + (f.delay || 0)), until: f.for != null ? r2(t + (f.delay || 0) + f.for) : undefined }); continue; }
          if (c === 'spray') { const list = Array.isArray(arg) ? arg : [arg]; for (const f of list) sc.world.push({ kind: 'spray', ...f, at: f.at ? resolvePos(set, f.at) : undefined, t: r2(t + (f.delay || 0)) }); continue; }
          if (c === 'door') { const D = sc.doors.find(v => v.id === (arg.id || 'door')) || sc.doors[0]; if (D) { if (arg.hit) (D.hits ||= []).push(r2(t)); if (arg.break) D.breakT = r2(t); } continue; }
          if (c === 'tv') { const T = sc.tvs.find(v => v.id === (arg.id || 'tv')) || sc.tvs[0]; if (T) T[arg.mode || 'on'] = r2(t); continue; }
          if (c === 'phys') { const list = Array.isArray(arg) ? arg : [arg]; for (const f of list) sc.world.push({ ...f, at: resolvePos(set, f.at), t: r2(t + (f.delay || 0)), ...(f.after != null ? { until: r2(t + f.after) } : {}) }); continue; }
          if (c === 'sparks') { sc.world.push({ kind: 'sparks', ...arg, at: resolvePos(set, arg.at), t: r2(t) }); continue; }
          if (c === 'val') { sc.world.push({ kind: 'pval', name: arg.prop, key: arg.key, to: arg.to, t: r2(t), dur: arg.dur ?? .5 }); continue; }
          if (c === 'fade') { sc.world.push({ kind: 'pfade', name: arg.prop, to: arg.to, t: r2(t), dur: arg.dur ?? .5 }); continue; }
          if (c === 'shake') { sc.world.push({ kind: 'pshake', name: arg.prop, t: r2(t), dur: arg.dur || 1, amt: arg.amt || .06 }); continue; }
          sc.world.push({ kind: 'prop', name: arg, visible: c === 'show', t: r2(t) }); continue;
        }
        if (/^cart\d*$/.test(tg)) { const cartName = tg; const W0 = sc.world.length;
          if (c === 'reveal') sc.world.push({ kind: 'reveal', part: arg, t: r2(t) });
          else if (c === 'build') { const parts = arg.parts || ['body', 'wheelL', 'wheelR', 'top', 'postL', 'postR', 'canopy', 'sign', 'price', 'lemons', 'pitcher', 'cups', 'jar']; const dt = (arg.dur || 5) / parts.length; parts.forEach((p, i) => { sc.world.push({ kind: 'reveal', part: p, t: r2(t + i * dt) }); if (i % (arg.sfxEvery || 1) === 0) sfx(arg.sfx || 'hammer', t + i * dt - .05, { vol: .55 }); }); }
          else if (c === 'pour') { sc.world.push({ kind: 'pour', t: r2(t), dur: arg || 1.2 }); sfx('pour', t, { vol: .7 }); }
          else if (c === 'serve') {
            let to = arg.to; if (to === 'queue') to = queue[0]; const dur = arg.dur || .5;
            const pour = [...sc.world].reverse().find(w => w.kind === 'pour' && (w.cart || 'cart') === tg && w.until == null && w.t <= t); if (pour && !arg.from) pour.until = r2(t);
            sc.world.push({ kind: 'fly', t: r2(t), dur, to, side: arg.side || 'R', from: arg.from || (pour ? null : [.35, 2.5, .45]) });
            addEv(to, t + dur, 'hold', { [arg.side || 'R']: arg.prop || (cartName === 'cart2' ? 'cupKvass' : 'cup') }); sfx('pop', t + dur, { vol: .5 });
          } else if (c === 'price') { sc.world.push({ kind: 'price', text: arg, t: r2(t) }); sfx('pop', t, { vol: .6 }); }
          else throw new Error('unknown cart cmd ' + c);
          for (let i = W0; i < sc.world.length; i++) sc.world[i].cart = cartName;
          continue;
        }
        if (tg === 'crowd') {
          const R = mulberry32(Math.round(t * 1000));
          if (c === 'advance') {
            const front = queue.shift(); const exit = resolvePos(set, arg?.exit || 'exit'); const dur = arg?.dur || .8;
            if (front) { addEv(front, t, 'walk', { to: exit, speed: 4.2, rot: arg?.exitRot }); addEv(front, t + 2.2, 'hide'); }
            queue.forEach((id, i) => addEv(id, t + .15 + i * .06, 'walk', { to: sc.queueSlots[i], dur, rot: sc.actors[id].init.rot }));
          } else if (c === 'requeue') {
            const from = resolvePos(set, arg.from), step = arg.step || [1.95, 0, 0], off = arg.offset || 0;
            sc.queueSlots = queue.map((id, i) => [from[0] + step[0] * (i + off), from[1], from[2] + step[2] * (i + off) + Math.sin(i * 2.3) * .25]);
            queue.forEach((id, i) => addEv(id, t + (arg.stagger ?? .12) * i + R() * .1, 'walk', { to: sc.queueSlots[i], speed: arg.speed || 5.5, cadence: arg.speed > 5 ? 13 : 9, rot: (arg.rot ?? -1.15) + Math.sin(i * 1.7) * .12 }));
          } else if (c === 'converge') {
            const to = resolvePos(set, arg.to), rad = arg.radius ?? 2.2; const ids = arg.ids || Object.keys(sc.actors).filter(k => sc.actors[k].crowd);
            ids.forEach((id, i) => { const a = (i / ids.length) * Math.PI * 2 + R() * .5, rr = rad * (.6 + R() * .5); const p = [to[0] + Math.cos(a) * rr, 0, to[2] + Math.sin(a) * rr * .6]; addEv(id, t + (arg.stagger ?? .15) * i + R() * .2, 'walk', { to: p, speed: arg.speed || 1.6, cadence: arg.cadence || 5, rot: arg.face ? Math.atan2(to[0] - p[0], to[2] - p[2]) : undefined }); });
          } else if (c === 'cheer') { for (const id of crowdIds) if (sc.actors[id]) { addEv(id, t + R() * .3, 'pose', arg || 'cheer'); addEv(id, t + R() * .3, 'expr', 'joy'); } }
          else if (['pose', 'expr', 'look'].includes(c)) { for (const id of crowdIds) if (sc.actors[id]) c === 'look' ? (lookEv[id] ||= []).push({ t: r2(t + R() * .2), target: arg }) : addEv(id, t + R() * .25, c, arg); }
          else throw new Error('unknown crowd cmd ' + c);
          continue;
        }
        // actor commands
        if (!sc.actors[tg]) throw new Error(`scene ${si + 1}: unknown target "${tg}"`);
        if (c === 'look') (lookEv[tg] ||= []).push({ t: r2(t), target: arg });
        else if (c === 'place') addEv(tg, t, 'place', { pos: resolvePos(set, arg.at ?? arg), rot: arg.rot });
        else if (c === 'walk') addEv(tg, t, 'walk', typeof arg === 'string' || Array.isArray(arg) ? { to: arg } : arg);
        else if (c === 'enter') { addEv(tg, t, 'show'); addEv(tg, t, 'walk', arg); }
        else if (c === 'exit') { addEv(tg, t, 'walk', arg); }
        else addEv(tg, t, c, arg);
      }
      timeline.push({ si, bi, start: r2(start), end: r2(end), say: B.say ? B.say[0] + ': ' + B.say[1] : '' });
      cursor = end;
    });
    T = cursor + (S.tail || 0); sc.t1 = r2(T);
    // shots end + framing time
    sc.shots.sort((a, b) => a.t0 - b.t0);
    sc.shots.forEach((s, i) => { s.t1 = i < sc.shots.length - 1 ? sc.shots[i + 1].t0 : sc.t1; const fa = s.cam.frameAt ?? 'end'; s.frameT = r2(fa === 'start' ? s.t0 + .01 : fa === 'end' ? s.t1 - .01 : s.t0 + fa); });
    // simulate positions -> walk.from, durations, turn-to-actor
    const posTrack = {};
    for (const [id, A] of Object.entries(sc.actors)) {
      const list = (ev[id] || []).sort((a, b) => a.t - b.t); let p = [...A.init.pos]; const track = [{ t: -1, p }];
      for (const e of list) {
        if (e.cmd === 'place') { p = [...e.arg.pos]; track.push({ t: e.t, p }); }
        if (e.cmd === 'walk') { const g = e.arg; g.to = resolvePos(set, g.to); g.from = [...p]; const d = Math.hypot(g.to[0] - p[0], g.to[2] - p[2]); g.dur = r2(g.dur || Math.max(.4, d / (g.speed || 3.6))); p = [...g.to]; track.push({ t: e.t + g.dur, p }); if (g.rot && typeof g.rot === 'string') g.rotTarget = g.rot; }
      }
      A.ev = list; posTrack[id] = track;
    }
    const posAt = (id, t) => { let p = posTrack[id][0].p; for (const k of posTrack[id]) if (k.t <= t) p = k.p; return p; };
    if (process.argv.includes('--occ')) for (const sh of sc.shots) {
      const c = sh.cam; if (!c || !Array.isArray(c.pos) || !Array.isArray(c.target)) continue; const t = sh.frameT;
      if (E.camBounds && !E.camBounds.some(([x0, x1, z0, z1]) => c.pos[0] > x0 && c.pos[0] < x1 && c.pos[2] > z0 && c.pos[2] < z1)) log(`OCC S${si + 1} t=${t} camera OUTSIDE rooms ${c.pos.map(v => v.toFixed(1))}`);
      for (const [id, A] of Object.entries(sc.actors)) {
        let vis = A.init.visible !== false; for (const e of (ev[id] || [])) if (e.t <= t) { if (e.cmd === 'hide') vis = false; if (e.cmd === 'show') vis = true; if (e.cmd === 'ragdoll') vis = false; }
        if (!vis) continue; const p = posAt(id, t); if (p[1] > 3) continue;
        for (const hy of [2.2, 4.4]) {
          const h = [p[0], hy, p[2]], d = c.target.map((v, i) => v - c.pos[i]), L = Math.hypot(...d), u = d.map(v => v / L), w = h.map((v, i) => v - c.pos[i]);
          const along = w[0] * u[0] + w[1] * u[1] + w[2] * u[2], perp = Math.hypot(...w.map((v, i) => v - along * u[i])), dc = Math.hypot(...w);
          if (dc < 2.4) { log(`OCC S${si + 1} t=${t} ${id} camera INSIDE (${dc.toFixed(1)})`); break; }
          if (along > .5 && along < L - 3 && perp < 1.3) { log(`OCC S${si + 1} t=${t} ${id} BLOCKS view (along ${along.toFixed(1)} of ${L.toFixed(1)}, perp ${perp.toFixed(1)})`); break; }
        }
      }
    }
    for (const [id, A] of Object.entries(sc.actors)) for (const e of A.ev) {
      const face = (tg, t) => { const a = posAt(id, t), b = posAt(tg, t); return Math.atan2(b[0] - a[0], b[2] - a[2]); };
      if (e.cmd === 'turn' && typeof e.arg === 'string') e.arg = r2(face(e.arg, e.t));
      if (e.cmd === 'walk' && typeof e.arg.rot === 'string') e.arg.rot = r2(face(e.arg.rot, e.t + e.arg.dur));
    }
    // look timelines (auto = look at whoever is speaking)
    const switches = C.speech.filter(l => l.t0 >= sc.t0 - .01 && l.t0 < sc.t1 && !speakers[l.spk]?.narrator).map(l => ({ t: r2(Math.max(sc.t0, l.t0 - .15)), spk: l.spk }));
    for (const [id, A] of Object.entries(sc.actors)) {
      const mains = Object.keys(sc.actors).filter(k => k !== id && !sc.actors[k].crowd);
      const nearest = () => { let best = null, bd = 1e9; for (const k of mains) { const a = A.init.pos, b = sc.actors[k].init.pos; const d = Math.hypot(a[0] - b[0], a[2] - b[2]); if (d < bd) { bd = d; best = k; } } return best; };
      let mode = A.mode, last = null; const L = [];
      const auto = spk => { if (spk && spk !== id && sc.actors[spk]) return spk; return last && last !== 'cam' && typeof last === 'string' ? last : nearest(); };
      const evs = [...(lookEv[id] || []).map(e => ({ ...e, ex: true })), ...switches].sort((a, b) => a.t - b.t);
      A.lookInit = mode === 'auto' ? null : mode === 'none' ? null : mode;
      if (mode !== 'auto') last = A.lookInit;
      for (const e of evs) {
        if (e.ex) { if (e.target === 'auto') { mode = 'auto'; last = auto(null); } else { mode = 'fixed'; last = e.target === 'none' ? null : e.target; } L.push({ t: e.t, target: last }); }
        else if (mode === 'auto') { const nt = auto(e.spk); if (nt !== last) { last = nt; L.push({ t: e.t, target: nt }); } }
      }
      A.look = L; delete A.mode;
    }
    C.scenes.push(sc);
  });
  C.duration = r2(T + (E.tail ?? .6)); C.feeds = E.feeds || [];
  C.scenes[C.scenes.length - 1].t1 = C.duration;
  if (Array.isArray(E.music)) {
    C.audio.musicTracks = E.music.map(m => ({ file: 'assets/music/' + m.file, at: m.at || 0, ss: m.start || 0, to: r2((m.start || 0) + m.dur), vol: m.volume ?? 1, fx: `afade=t=in:d=${m.fadeIn ?? 1.5},afade=t=out:st=${Math.max(0, m.dur - (m.fadeOut ?? 2)).toFixed(2)}:d=${m.fadeOut ?? 2},` }));
    C.audio.music = { file: path.relative(ROOT, path.join(workDir(ep), 'music.wav')), vol: E.musicVolume ?? .3, start: 0 };
  } else if (E.music) { const f = path.join(ROOT, 'assets/music', E.music.file); C.audio.music = { file: path.relative(ROOT, f), vol: E.music.volume ?? .22, start: E.music.start || 0 }; if (E.music.credit && E.music.creditOnScreen !== false) C.overlays.push({ kind: 'credit', text: E.music.credit, t: r2(C.duration - (E.music.creditDur || 3.2)), dur: 3.2 }); }
  // a fade-out stays black until the next fade-in starts (otherwise overlay.js keeps it forever)
  { const F = (C.overlays || []).filter(o => o.kind === 'fade').sort((a, b) => a.t - b.t);
    for (const o of F) if (o.dir === 'out' && o.end == null) { const nx = F.find(q => q.dir === 'in' && q.t > o.t); if (nx) o.end = nx.t; } }
  fs.writeFileSync(path.join(workDir(ep), 'compiled.json'), JSON.stringify(C));
  if (!quiet) { for (const b of timeline) log(`S${b.si + 1}.${b.bi + 1}  ${b.start.toFixed(2).padStart(6)}–${b.end.toFixed(2).padStart(6)}  ${b.say}`); log(`duration ${C.duration}s, ${C.scenes.length} scenes, ${C.scenes.reduce((a, s) => a + s.shots.length, 0)} shots`); }
  return C;
}
function normCam(set, cam) {
  if (typeof cam === 'string') {
    if (SETS[set].cams[cam]) return { type: 'set', name: cam };
    const [type, ...who] = cam.split(/\s+/); if (type === 'two') return { type, who }; return { type, who: who[0] };
  }
  if (cam.name && !cam.type) return { type: 'set', ...cam };
  if (cam.pos && !cam.type) return { type: 'explicit', ...cam };
  return { ...cam };
}

// ---------- browser ----------
function serve() {
  const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.json': 'application/json' };
  return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { if (process.env.LOG404) console.log('404', f); r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1', () => res(s)); });
}
async function browser(C, res, ao, extra = {}) {
  const puppeteer = (await import('puppeteer')).default;
  const srv = await serve();
  const b = await puppeteer.launch({ headless: true, protocolTimeout: 600000, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] });
  const page = await b.newPage(); await page.setViewport({ width: 1080, height: 1920 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/engine/page.html`);
  await page.waitForFunction('window.studioReady && window.initStudio', { timeout: 60000 });
  const [w, h] = String(res).split('x').map(Number);
  const fo = {}; if (opt('noaa', false)) fo.aa = false; if (opt('shadowk', false)) fo.shadowK = +opt('shadowk'); if (opt('bloomk', false)) fo.bloomScale = +opt('bloomk'); if (opt('noshadow', false)) fo.noShadow = true; if (opt('nocull', false)) fo.nocull = true; if (opt('noshsplit', false)) fo.noshsplit = true; if (opt('dbg', false)) fo.dbg = true; if (opt('out', false)) { const [ow, oh] = String(opt('out')).split('x').map(Number); fo.ow = ow; fo.oh = oh; }
  await page.evaluate((C, o) => window.initStudio(C, o), C, { w, h, ao, ...fo, ...extra });
  return { page, close: async () => { await b.close(); srv.close(); } };
}
async function frame(page, t) { const d = await page.evaluate(t => window.grabFrame(t), t); return Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'); }

async function frames(ep) {
  // --from/--to <sec> render only a time range (patching one shot of a finished episode), --dir <path> output folder, --out WxH output size
  const C = await build(ep, true); const fps = +opt('fps', 12); const dir = opt('dir', false) ? path.resolve(opt('dir')) : path.join(workDir(ep), 'frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const R = String(opt('res', '320x240')).split('x').map(Number); const B = await browser(C, R.join('x'), false, opt('out', false) ? {} : { ow: R[0], oh: R[1] }); const N = Math.ceil(C.duration * fps);
  const fA = opt('from', false) ? Math.ceil(+opt('from') * fps - 1e-6) : 0, fB = opt('to', false) ? Math.min(N, Math.floor(+opt('to') * fps - 1e-6) + 1) : N;
  for (let f = fA; f < fB; f++) { const buf = await frame(B.page, f / fps); fs.writeFileSync(path.join(dir, `f${String(f).padStart(4, '0')}.jpg`), buf); if (f % 24 === 0) log(`frame ${f}/${N}`); }
  await B.close(); log('frames done', dir, N);
}
// probe: what is under a screen point? node studio.js probe <ep> <t> <u,v>[;<u,v>...]  (u,v in 0..1 from top-left)
async function probe(ep) {
  const C = await build(ep, true); const t = +argv[2]; const pts = String(argv[3] || '.5,.5').split(';').map(p => p.split(',').map(Number));
  const B = await browser(C, opt('res', '432x768'), false);
  await frame(B.page, t);
  const out = await B.page.evaluate(pts => { const THREE = window._THREE; const cam = window._camera(), sc = window._scene, rc = new THREE.Raycaster(); const res = [];
    for (const [u, v] of pts) { rc.setFromCamera(new THREE.Vector2(u * 2 - 1, 1 - v * 2), cam); const hits = rc.intersectObjects(sc.children, true).filter(h => h.object.visible && h.object.isMesh).slice(0, 3);
      res.push(`(${u},${v}): ` + hits.map(h => { const o = h.object, m = Array.isArray(o.material) ? o.material[0] : o.material; const chain = []; let x = o; while (x && x !== sc) { chain.push(x.name || x.type); x = x.parent; }
        return `${chain.join('<')} geo=${o.geometry.type} mat=${m.type} col=#${m.color?.getHexString()} op=${m.opacity} map=${!!m.map} emis=${m.emissive ? m.emissive.getHexString() : ''} at=${h.point.toArray().map(n => n.toFixed(2))} d=${h.distance.toFixed(2)}`; }).join(' | ')); }
    return 'cam=' + cam.position.toArray().map(v => v.toFixed(2)) + '\n' + (window._actorsDump ? window._actorsDump() : '') + '\n' + res.join('\n'); }, pts);
  console.log(out); await B.close();
}
async function preview(ep) {
  const C = await build(ep, true); const W = workDir(ep), pd = path.join(W, 'preview'); fs.rmSync(pd, { recursive: true, force: true }); fs.mkdirSync(pd);
  let ts = argv[2] && !argv[2].startsWith('--') ? argv[2] : 'shots';
  let times;
  if (ts === 'shots' || ts.startsWith('scene')) { const only = ts.startsWith('scene') ? parseInt(ts.slice(5)) - 1 : null; times = C.scenes.flatMap((s, i) => only != null && only !== i ? [] : s.shots.map(sh => r2(sh.t0 + (sh.t1 - sh.t0) * .6))); }
  else times = ts.split(',').map(Number);
  const B = await browser(C, opt('res', '540x960'), !!opt('ao', false)); const files = [];
  for (const [i, t] of times.entries()) { const t0 = Date.now(); const buf = await frame(B.page, t); const f = path.join(pd, `p${String(i).padStart(2, '0')}_${t.toFixed(2)}.jpg`); fs.writeFileSync(f, buf); files.push(f); log(f, ((Date.now() - t0) / 1000).toFixed(1) + 's'); }
  await B.close();
  const cols = Math.min(4, files.length);
  const sheet = path.join(pd, 'sheet.jpg');
  if (files.length === 1) run(['-y', '-v', 'error', '-i', files[0], '-vf', 'scale=270:480,pad=276:486:3:3:black', '-frames:v', '1', sheet]);
  else if (files.length) {
    // Explicit inputs work on Windows too (ffmpeg's glob input does not).
    const ins = files.flatMap(f => ['-i', f]);
    const scaled = files.map((_, i) => `[${i}:v]scale=270:480,pad=276:486:3:3:black[v${i}]`);
    const layout = files.map((_, i) => `${(i % cols) * 276}_${Math.floor(i / cols) * 486}`).join('|');
    const graph = `${scaled.join(';')};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black[out]`;
    run(['-y', '-v', 'error', ...ins, '-filter_complex', graph, '-map', '[out]', '-frames:v', '1', sheet]);
  }
  log('sheet', sheet);
}

function renderSignature(C, chunk) {
  const hash = createHash('sha256').update(JSON.stringify(C));
  hash.update(JSON.stringify({ chunk, fps: C.fps, res: opt('res', '810x1440'), ao: !!opt('ao', false), flags: ['noaa', 'shadowk', 'bloomk', 'noshadow', 'out', 'crf', 'preset'].map(k => opt(k, '')) }));
  // Changes in code or assets must also invalidate resumable frames.
  for (const f of fs.readdirSync(path.join(ROOT, 'engine')).sort()) if (/\.(js|mjs|html)$/.test(f)) hash.update(f).update(fs.readFileSync(path.join(ROOT, 'engine', f)));
  const walk = dir => { if (!fs.existsSync(dir)) return; for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const f = path.join(dir, entry.name); if (entry.isDirectory()) walk(f); else if (entry.isFile()) { const s = fs.statSync(f); hash.update(path.relative(ROOT, f) + ':' + s.size + ':' + s.mtimeMs); } } };
  walk(path.join(ROOT, 'assets'));
  return hash.digest('hex');
}
async function render(ep) {
  const C = await build(ep, true); if (opt('fps', false)) C.fps = +opt('fps'); const W = workDir(ep), cd = path.join(W, 'chunks'); fs.mkdirSync(cd, { recursive: true });
  const fps = C.fps, N = Math.ceil(C.duration * fps), CH = parseInt(opt('chunk', 48)), nCh = Math.ceil(N / CH);
  if (!(fps > 0 && Number.isFinite(fps)) || !(CH > 0 && Number.isInteger(CH))) throw new Error('fps and chunk must be positive numbers');
  const sig = renderSignature(C, CH);
  const sf = path.join(cd, 'sig.txt'); if (fs.existsSync(sf) && fs.readFileSync(sf, 'utf8') !== sig) { log('compiled episode or render settings changed -> clearing old chunks'); fs.rmSync(cd, { recursive: true, force: true }); fs.mkdirSync(cd); }
  fs.writeFileSync(sf, sig);
  const todo = [...Array(nCh).keys()].filter(c => { const name = path.join(cd, `c${String(c).padStart(4, '0')}`); return !fs.existsSync(name + '.ok') || !fs.existsSync(name + '.mp4') || !fs.statSync(name + '.mp4').size; });
  log(`${N} frames, ${nCh} chunks, ${todo.length} to render`);
  if (todo.length) {
    let B = await browser(C, opt('res', '810x1440'), !!opt('ao', false)); const t00 = Date.now(); let done = 0, sinceLaunch = 0;
    for (const c of todo) {
      // fresh browser every few chunks: long sessions in software WebGL accumulate state/memory and start emitting broken frames
      if (sinceLaunch >= +opt('relaunch', 6)) { await B.close(); B = await browser(C, opt('res', '810x1440'), !!opt('ao', false)); sinceLaunch = 0; }
      sinceLaunch++;
      const f0 = c * CH, f1 = Math.min(N, f0 + CH), name = path.join(cd, `c${String(c).padStart(4, '0')}`);
      const ff = spawn(FFMPEG, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', String(opt('preset', 'medium')), '-tune', 'animation', '-crf', String(opt('crf', 27)), '-pix_fmt', 'yuv420p', '-r', String(fps), name + '.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = f0; f < f1; f++) { const buf = await frame(B.page, f / fps); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); done++; }
      ff.stdin.end(); const code = await new Promise((resolve, reject) => { ff.on('error', reject); ff.on('close', resolve); });
      if (code !== 0 || !fs.existsSync(name + '.mp4') || !fs.statSync(name + '.mp4').size) { fs.rmSync(name + '.mp4', { force: true }); throw new Error(`ffmpeg failed while encoding chunk ${c + 1} (exit ${code})`); }
      fs.writeFileSync(name + '.ok', ''); const el = (Date.now() - t00) / 1000;
      log(`chunk ${c + 1}/${nCh} ok  ${(el / done).toFixed(2)} s/frame  eta ${((N - (nCh - todo.length) * CH - done) * el / done / 60).toFixed(1)} min`);
    }
    await B.close();
  }
  // concat
  const list = path.join(cd, 'list.txt'); fs.writeFileSync(list, [...Array(nCh).keys()].map(c => `file 'c${String(c).padStart(4, '0')}.mp4'`).join('\n'));
  const video = path.join(W, 'video.mp4'); run(['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  // motion-compensated frame interpolation: render at N fps, deliver at 2N fps (smooth motion for half the render time)
  const ifps = opt('interp', false) ? +opt('interp') : 0;
  if (ifps && ifps > fps) {
    const vi = path.join(W, 'video_i.mp4'); log(`interpolating ${fps} -> ${ifps} fps`); const t0 = Date.now();
    run(['-y', '-v', 'error', '-i', video, '-vf', `minterpolate=fps=${ifps}:mi_mode=mci:mc_mode=obmc:me_mode=bilat:me=epzs:search_param=16:scd=fdiff:scd_threshold=8`, '-c:v', 'libx264', '-preset', 'fast', '-tune', 'animation', '-crf', String(opt('icrf', 21)), '-pix_fmt', 'yuv420p', vi]);
    fs.renameSync(vi, video); log(`interp done ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
  const audio = path.join(W, 'audio.wav'); await mixAny(C, ep, audio);
  fs.mkdirSync(path.join(ROOT, 'renders'), { recursive: true }); const outF = path.join(ROOT, 'renders', `${ep}.mp4`);
  run(['-y', '-v', 'error', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(C.duration), '-movflags', '+faststart', outF]);
  log('DONE', outF);
  if (!opt('keep', false)) { fs.rmSync(cd, { recursive: true, force: true }); fs.rmSync(video, { force: true }); }
}
function run(args) { const r = spawnSync(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'] }); if (r.status) throw new Error('ffmpeg failed: ' + args.join(' ')); }
function mixAudio(C, out) {
  const D = C.duration, dir = path.dirname(out);
  // render one bus (list of clips) to a wav in its own ffmpeg call
  const bus = (items, file) => {
    const ins = [], fl = [], labs = [];
    items.forEach((it, n) => {
      const ms = Math.max(0, Math.round(it.at * 1000));
      if (it.ss != null) ins.push('-ss', String(it.ss), '-t', String(r2(it.to - it.ss)));
      ins.push('-i', path.join(ROOT, it.file));
      const fade = it.ss != null ? `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, it.to - it.ss - .05).toFixed(3)}:d=0.05,` : '';
      const spatial = it._spatial?.length ? ffmpegPan(it._spatial) : '';
      fl.push(`[${n}:a]${it.fx || ''}aformat=sample_rates=44100:channel_layouts=${spatial ? 'mono' : 'stereo'},${spatial}${fade}volume=${it.vol ?? 1},adelay=${ms}|${ms}[c${n}]`); labs.push(`[c${n}]`);
    });
    const g = labs.length ? [...fl, `${labs.join('')}amix=inputs=${labs.length}:normalize=0:dropout_transition=0,apad=whole_dur=${D},atrim=duration=${D}[out]`] : [`anullsrc=r=44100:cl=stereo,atrim=duration=${D}[out]`];
    const gs = file + '.txt'; fs.writeFileSync(gs, g.join(';\n'));
    run(['-y', '-v', 'error', ...ins, '-filter_complex_script', gs, '-map', '[out]', '-ar', '44100', file]);
  };
  const voxF = path.join(dir, 'vox.wav'), fxF = path.join(dir, 'fx.wav');
  if (C.audio.musicTracks) bus(C.audio.musicTracks, path.join(ROOT, C.audio.music.file));
  bus(C.audio.voices, voxF);
  if (C.audio.sfx.length) bus(C.audio.sfx, fxF);
  const i2 = ['-i', voxF]; const g2 = ['[0:a]volume=1.3,asplit=2[v1][vsc]']; let mix = '[v1]', k = 1;
  if (C.audio.sfx.length) { i2.push('-i', fxF); g2.push(`[${i2.filter(x => x === '-i').length - 1}:a]volume=0.5[f1]`); mix += '[f1]'; k++; }
  if (C.audio.music) { i2.push('-stream_loop', '-1', '-i', path.join(ROOT, C.audio.music.file)); const mi = i2.filter(x => x === '-i').length - 1; g2.push(`[${mi}:a]atrim=start=${C.audio.music.start}:duration=${D},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,volume=${C.audio.music.vol},afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, D - 1.5).toFixed(2)}:d=${Math.min(D, 1.5).toFixed(2)},apad=whole_dur=${D}[mraw]`, `[mraw][vsc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[m1]`); mix += '[m1]'; k++; }
  else g2.push('[vsc]anullsink');
  g2.push(`${mix}amix=inputs=${k}:normalize=0:dropout_transition=0,atrim=duration=${D},alimiter=limit=0.95[out]`);
  run(['-y', '-v', 'error', ...i2, '-filter_complex', g2.join(';'), '-map', '[out]', '-ar', '44100', out]);
}

async function mixAny(C, ep, out) {
  if (!C.spatial) return mixAudio(C, out);
  const config = C.spatial === true ? {} : C.spatial;
  const durCache = new Map();
  const durationOf = it => {
    if (it.ss != null && it.to != null) return Math.max(0, it.to - it.ss);
    if (!durCache.has(it.file)) durCache.set(it.file, decode(path.join(ROOT, it.file)).length / 16000);
    return durCache.get(it.file);
  };
  const plans = [], allTimes = new Set();
  for (const it of [...C.audio.voices, ...C.audio.sfx]) {
    if (it.flat || it.src === 'flat' || (it.spk && C.speakers[it.spk]?.narrator && it.src == null)) continue;
    const spec = it.src ?? it.spk;
    if (spec == null) continue; // undirected UI sounds stay stereo
    const duration = Math.min(durationOf(it), Math.max(0, C.duration - it.at));
    if (duration <= 0) continue;
    const interval = Math.max(.1, Math.min(1, config.interval ?? .25));
    const segments = Math.max(1, Math.min(32, Math.ceil(duration / interval)));
    const samples = [];
    for (let i = 0; i <= segments; i++) {
      const rel = duration * i / segments, key = r2(Math.min(C.duration - .001, it.at + rel));
      samples.push({ t: rel, key }); allTimes.add(key);
    }
    plans.push({ it, spec, samples });
  }
  if (plans.length) {
    log(`spatial stereo: ${plans.length} источников, ${allTimes.size} положений камеры`);
    const B = await browser(C, '96x96', false, { bloom: false, aa: false, noShadow: true, ow: 96, oh: 96 });
    try {
      const times = [...allTimes].sort((a, b) => a - b);
      const tracks = await B.page.evaluate(ts => ts.map(t => window.trackAt(t)), times);
      const map = new Map(times.map((t, i) => [t, tracks[i]]));
      for (const p of plans) {
        const samples = p.samples.map(s => {
          const track = map.get(s.key), pos = spatialSource(p.spec, track, SETS);
          return { t: s.t, g: pos ? spatialGains(track, pos, config) : null };
        });
        const first = samples.find(s => s.g)?.g;
        if (!first) { log(`! spatial: источник ${JSON.stringify(p.spec)} не найден; оставлен обычный стереозвук`); continue; }
        let prev = first; for (const s of samples) { if (!s.g) s.g = prev; else prev = s.g; }
        p.it._spatial = samples;
      }
    } finally { await B.close(); }
  }
  return mixAudio(C, out);
}

function voiceScript(E) {
  const by = {}; for (const l of scriptLines(E)) (by[l.spk] ||= []).push(l.text);
  for (const [spk, ls] of Object.entries(by)) { log(`=== ${spk}${E.speakers?.[spk]?.voice ? ' (' + E.speakers[spk].voice + ')' : ''} -> episodes/${EP}/voice/${spk}.mp3`); log(ls.join('\n\n')); log(''); }
}

const main = async () => {
  if (!cmd || !EP) { log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 8).join('\n')); return; }
  if (cmd === 'voice-script') return voiceScript(await loadEpisode(EP));
  if (cmd === 'prep') return prep(EP, await loadEpisode(EP));
  if (cmd === 'build') return build(EP);
  if (cmd === 'probe') return probe(EP);
  if (cmd === 'preview') return preview(EP);
  if (cmd === 'frames') return frames(EP);
  if (cmd === 'render') return render(EP);
  if (cmd === 'audio') { const C = await build(EP, true); const f = path.join(workDir(EP), 'audio.wav'); await mixAny(C, EP, f); return log(f); }
  log('unknown command ' + cmd);
};
main().catch(e => { console.error('ERROR:', process.env.DEBUG ? e.stack : e.message); process.exit(1); });
