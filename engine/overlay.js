// 2D overlay layer (1080x1920 design space): captions, speaker cards, chips, big text, stream UI, views, flashes.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOutBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const easeOut = k => 1 - Math.pow(1 - k, 3);
const W = 1080, H = 1920;
const F = (w, s) => `${w} ${s}px Inter`;

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(g, words, maxW) {
  const lines = []; let cur = [], wsum = 0; const sp = g.measureText(' ').width;
  for (let i = 0; i < words.length; i++) { const w = g.measureText(words[i]).width; if (cur.length && wsum + sp + w > maxW) { lines.push(cur); cur = []; wsum = 0; } wsum += (cur.length ? sp : 0) + w; cur.push(i); }
  if (cur.length) lines.push(cur); return lines;
}
function curWord(line, t) { let k = -1; for (let i = 0; i < line.words.length; i++) if (t >= line.t0 + line.words[i][1] - .04) k = i; if (k < 0 || line.words.length === line.display.length) return k; return Math.round(k * (line.display.length - 1) / Math.max(1, line.words.length - 1)); }

// narrator caption: white boxes, black text, current word in a yellow highlight (reference style)
function narrCaption(g, line, t) {
  const age = t - line.t0, out = line.t1 + .25 - t; const a = clamp(Math.min(age / .15, out / .2)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = F(800, 62);
  const words = line.display, lines = wrap(g, words, 900), cw = curWord(line, t), lh = 92, y0 = 230;
  const sc = .9 + .1 * easeOutBack(clamp(age / .25)); g.translate(W / 2, y0); g.scale(sc, sc); g.translate(-W / 2, -y0);
  const sp = g.measureText(' ').width;
  lines.forEach((idx, li) => {
    const txt = idx.map(i => words[i]).join(' '), tw = g.measureText(txt).width, y = y0 + li * lh;
    g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, W / 2 - tw / 2 - 26 + 4, y - 44 + 6, tw + 52, 84, 18); g.fill();
    g.fillStyle = '#fff'; rr(g, W / 2 - tw / 2 - 26, y - 44, tw + 52, 84, 18); g.fill();
    let x = W / 2 - tw / 2; g.textBaseline = 'middle';
    for (const i of idx) { const w = g.measureText(words[i]).width; if (i === cw) { g.fillStyle = '#ffd21a'; rr(g, x - 8, y - 36, w + 16, 70, 12); g.fill(); } g.fillStyle = i <= cw ? '#111' : '#666'; g.fillText(words[i], x, y + 2); x += w + sp; }
  });
  g.restore();
}
// plain subtitles: white text with a thick black outline, current word in the speaker colour (no boxes)
function plainSub(g, line, spk, t) {
  const age = t - line.t0, out = line.t1 + .2 - t; const a = clamp(Math.min(age / .1, out / .15)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; const fs = 66; g.font = F(900, fs); g.lineJoin = 'round'; g.textBaseline = 'middle';
  const words = line.display, lines = wrap(g, words, 840), cw = curWord(line, t), lh = 84, sp = g.measureText(' ').width;
  const y0 = 1290 - (lines.length - 1) * lh / 2; const sc = .85 + .15 * easeOutBack(clamp(age / .22));
  g.translate(W / 2, y0); g.scale(sc, sc); g.translate(-W / 2, -y0);
  const hi = spk.narrator ? '#ffd43b' : (spk.color || '#ffd43b');
  lines.forEach((idx, li) => {
    const gap = sp + 5, ex = i => i === cw ? g.measureText(words[i]).width * .06 : 0;
    const tw = idx.reduce((a, i) => a + g.measureText(words[i]).width + 2 * ex(i), 0) + gap * (idx.length - 1); let x = W / 2 - tw / 2; const y = y0 + li * lh;
    for (const i of idx) { x += ex(i); const w = g.measureText(words[i]).width; const on = i === cw; g.save(); g.translate(x + w / 2, y); if (on) g.scale(1.1, 1.1);
      g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; g.shadowOffsetY = 5; g.lineWidth = 14; g.strokeStyle = '#000'; g.strokeText(words[i], -w / 2, 0); g.shadowColor = 'transparent';
      g.fillStyle = on ? hi : '#ffffff'; g.fillText(words[i], -w / 2, 0); g.restore(); x += w + ex(i) + gap; }
  });
  g.restore();
}
// character line: colored name tag + white card, current word colored
function speakerCard(g, line, spk, t) {
  const age = t - line.t0, out = line.t1 + .2 - t; const a = clamp(Math.min(age / .12, out / .18)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = F(800, 58);
  const words = line.display, lines = wrap(g, words, 860), cw = curWord(line, t), lh = 80, sp = g.measureText(' ').width;
  const boxW = Math.max(...lines.map(idx => g.measureText(idx.map(i => words[i]).join(' ')).width)) + 70, boxH = lines.length * lh + 40;
  const y0 = 1330 - boxH / 2, x0 = W / 2 - boxW / 2;
  const sc = .7 + .3 * easeOutBack(clamp(age / .28)); g.translate(W / 2, y0 + boxH / 2); g.scale(sc, sc); g.translate(-W / 2, -(y0 + boxH / 2));
  g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, x0 + 5, y0 + 8, boxW, boxH, 26); g.fill();
  g.fillStyle = '#fff'; rr(g, x0, y0, boxW, boxH, 26); g.fill(); g.strokeStyle = spk.color; g.lineWidth = 7; g.stroke();
  // name tag
  g.font = F(900, 42); const nw = g.measureText(spk.name).width + 50;
  g.save(); g.translate(x0 + 30, y0 - 26); g.rotate(-.04); g.fillStyle = spk.color; rr(g, 0, -30, nw, 64, 18); g.fill(); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(spk.name, 25, 3); g.restore();
  g.font = F(800, 58); g.textBaseline = 'middle';
  lines.forEach((idx, li) => {
    const txt = idx.map(i => words[i]).join(' '), tw = g.measureText(txt).width; let x = W / 2 - tw / 2; const y = y0 + 20 + lh / 2 + li * lh + 4;
    for (const i of idx) { const w = g.measureText(words[i]).width; g.fillStyle = i === cw ? spk.color : i < cw ? '#151515' : '#8a8a8a'; if (i === cw) { g.save(); g.translate(x + w / 2, y); g.scale(1.08, 1.08); g.fillText(words[i], -w / 2, 0); g.restore(); } else g.fillText(words[i], x, y); x += w + sp; }
  });
  g.restore();
}
function chip(g, o, t) {
  const age = t - o.t, a = clamp(Math.min(age / .2, (o.t + (o.dur || 2.4) - t) / .3)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = F(900, 38); const tw = g.measureText(o.text).width;
  const x = 40 - (1 - easeOut(clamp(age / .35))) * 300, y = 470;
  g.fillStyle = 'rgba(15,15,25,.78)'; rr(g, x, y - 34, tw + 92, 68, 34); g.fill();
  g.fillStyle = o.color || '#ffd21a'; g.beginPath(); g.arc(x + 38, y, 13, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(o.text, x + 64, y + 2); g.restore();
}
function big(g, o, t) {
  const age = t - o.t, dur = o.dur || 1.2, a = clamp(Math.min(age / .06, (o.t + dur - t) / .2)); if (a <= 0) return;
  const size = o.size || 150;
  g.save(); g.globalAlpha = a; g.font = F(900, size); g.textAlign = 'center'; g.textBaseline = 'middle';
  const sc = easeOutBack(clamp(age / .3)) * (1 + Math.max(0, age - .3) * .04);
  g.translate(W / 2, o.y || 900); g.rotate(o.rot ?? -.05); g.scale(sc, sc);
  let s = size; while (g.measureText(o.text).width > 980 && s > 40) { s -= 6; g.font = F(900, s); }
  g.lineJoin = 'round'; g.lineWidth = s * .16; g.strokeStyle = '#111'; g.strokeText(o.text, 0, 0);
  g.fillStyle = o.color || '#fff'; g.fillText(o.text, 0, 0); g.restore();
}
function eye(g, x, y, s, col) { g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * .14; g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * .9, s, 0); g.quadraticCurveTo(0, s * .9, -s, 0); g.stroke(); g.beginPath(); g.arc(0, 0, s * .35, 0, 7); g.fill(); g.restore(); }
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function views(g, o, t) {
  const age = t - o.t, dur = o.dur || 3, a = clamp(Math.min(age / .2, (o.t + dur - t) / .3)); if (a <= 0) return;
  const k = clamp((age - .2) / (o.count || 1.8)), val = (o.from || 0) + ((o.to || 1e6) - (o.from || 0)) * (k * k * (3 - 2 * k));
  g.save(); g.globalAlpha = a; const y = o.y || 760, sc = easeOutBack(clamp(age / .3)) * (k >= 1 ? 1 + Math.sin((age - .2 - (o.count || 1.8)) * 12) * .03 * Math.exp(-(age - 2) * 2) : 1);
  g.translate(W / 2, y); g.scale(sc, sc);
  g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, -480 + 6, -95 + 10, 960, 190, 95); g.fill();
  g.fillStyle = '#fff'; rr(g, -480, -95, 960, 190, 95); g.fill(); g.strokeStyle = '#ff2d55'; g.lineWidth = 10; g.stroke();
  eye(g, -360, -5, 62, '#ff2d55');
  g.fillStyle = '#111'; g.font = F(900, 110); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(fmt(val), -270, -12);
  g.fillStyle = '#ff2d55'; g.font = F(800, 38); g.fillText(o.label || 'ПРОСМОТРОВ', -265, 62); g.restore();
}
function heart(g, x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-14, -4, -10, -16, 0, -9); g.bezierCurveTo(10, -16, 14, -4, 0, 6); g.fill(); g.restore(); }
function stream(g, o, t) {
  const age = t - o.t, dur = o.dur || 3, a = clamp(Math.min(age / .2, (o.t + dur - t) / .25)); if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  // camera viewfinder corners
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 10; const m = 60, L = 110;
  for (const [x, y, sx, sy] of [[m, 560, 1, 1], [W - m, 560, -1, 1], [m, 1700, 1, -1], [W - m, 1700, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); }
  g.fillStyle = '#ff2d55'; rr(g, 90, 600, 170, 66, 14); g.fill(); g.fillStyle = '#fff'; g.font = F(900, 40); g.textBaseline = 'middle';
  if (Math.floor(age * 2) % 2 === 0) { g.beginPath(); g.arc(122, 633, 12, 0, 7); g.fill(); } g.fillText('LIVE', 145, 635);
  g.fillStyle = 'rgba(0,0,0,.5)'; rr(g, 275, 600, 230, 66, 14); g.fill(); eye(g, 318, 633, 24, '#fff'); g.fillStyle = '#fff'; g.font = F(800, 38);
  g.fillText(fmt(1200 + Math.pow(age, 2.2) * 900), 352, 635);
  const comments = o.comments || ['вау 😍', 'где это?!', 'хочу лимонад', 'лайк!!!', 'бегу туда'];
  g.font = F(700, 38);
  comments.forEach((c, i) => { const ct = .35 + i * .5; if (age < ct) return; const k = clamp((age - ct) / .25); const y = 1640 - (comments.filter((_, j) => age >= .35 + j * .5).length - 1 - i) * 74; g.globalAlpha = a * k * clamp(1 - (1640 - y) / 420); g.fillStyle = 'rgba(0,0,0,.45)'; const tw = g.measureText(c).width; rr(g, 90, y - 30, tw + 120, 60, 30); g.fill(); g.fillStyle = ['#ffd21a', '#7fd0ff', '#ff9ad5', '#9cf59c', '#ffb36b'][i % 5]; g.beginPath(); g.arc(120, y, 18, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText(c, 150, y + 2); });
  g.globalAlpha = a;
  for (let i = 0; i < 14; i++) { const st = i * .22, k = (age - st) / 1.6; if (k < 0 || k > 1) continue; heart(g, 930 + Math.sin(k * 8 + i) * 40, 1650 - k * 700, 3 + (i % 3), ['#ff2d55', '#ff7aa2', '#ffd21a'][i % 3]); }
  g.restore();
}
function sparkles(g, o, t, project) {
  const age = t - o.t; if (age < 0 || age > .9) return; const p = project(o.pos); if (!p) return;
  g.save();
  for (let i = 0; i < 10; i++) {
    const ang = i / 10 * Math.PI * 2 + .3, r = 60 + easeOut(clamp(age / .7)) * (140 + (i % 3) * 50), s = (1 - age / .9) * (18 + (i % 2) * 14);
    const x = p[0] + Math.cos(ang) * r, y = p[1] + Math.sin(ang) * r; g.fillStyle = i % 2 ? '#fff6a8' : '#ffd21a'; g.beginPath();
    for (let k = 0; k < 8; k++) { const a2 = k / 8 * Math.PI * 2, rr2 = k % 2 ? s * .35 : s; g.lineTo(x + Math.cos(a2 + age * 4) * rr2, y + Math.sin(a2 + age * 4) * rr2); } g.closePath(); g.fill();
  }
  g.restore();
}

export function drawOverlay(g, t, C, project, noClear) {
  if (!noClear) g.clearRect(0, 0, W, H);
  for (const o of C.overlays) {
    if (t < o.t - .01 || t > o.t + (o.dur || 3) + .5) continue;
    if (o.kind === 'chip') chip(g, o, t);
    else if (o.kind === 'big') big(g, o, t);
    else if (o.kind === 'views') views(g, o, t);
    else if (o.kind === 'stream') stream(g, o, t);
    else if (o.kind === 'sparkle') sparkles(g, o, t, project);
  }
  if (C.subStyle !== 'none') for (const line of C.speech) {
    if (t < line.t0 - .01 || t > line.t1 + .3) continue;
    const spk = C.speakers[line.spk] || {};
    if (C.subStyle === 'plain') plainSub(g, line, spk, t); else if (spk.narrator) narrCaption(g, line, t); else speakerCard(g, line, spk, t);
  }
  for (const o of C.overlays) {
    if (o.kind === 'credit') { const a = clamp(Math.min((t - o.t) / .4, (o.t + (o.dur || 3) - t) / .4)); if (a > 0) { g.save(); g.globalAlpha = a * .9; let fs = 34; g.font = F(600, fs); while (g.measureText(o.text).width > 980) g.font = F(600, --fs); g.textAlign = 'center'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8; g.fillText(o.text, W / 2, 1560); g.restore(); } }
  }
  // flashes & fades on top
  for (const o of C.overlays) {
    if (o.kind === 'flash') { const k = (t - o.t) / (o.dur || .25); if (k >= 0 && k <= 1) { g.fillStyle = `rgba(255,255,255,${(1 - k) * (o.alpha || .85)})`; g.fillRect(0, 0, W, H); } }
    if (o.kind === 'dip') { const k = (t - o.t) / (o.dur || .5); if (k >= 0 && k <= 1) { g.fillStyle = `rgba(0,0,0,${Math.min(1, (1 - Math.abs(k * 2 - 1)) * 1.6)})`; g.fillRect(0, 0, W, H); } }
    if (o.kind === 'binary' || o.kind === 'glitch') { const k = (t - o.t) / o.dur; if (k >= 0 && k <= 1) {
      const env = Math.min(1, k * 6, (1 - k) * 5) * (o.amt || 1), fr = Math.floor(t * 24), hsh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      g.save();
      if (o.kind === 'binary') { g.font = '700 34px monospace'; g.textAlign = 'center'; const cols = 26; for (let c = 0; c < cols; c++) { const sp = 300 + hsh(c) * 700, off = hsh(c + 9) * H; for (let r = 0; r < 14; r++) { const y = ((off + (t - o.t) * sp) + r * 46) % (H + 200) - 100; const a = env * (r === 13 ? 1 : .25 + .55 * r / 13); g.fillStyle = r === 13 ? `rgba(220,255,230,${a})` : `rgba(${o.col || '60,255,120'},${a})`; g.fillText(hsh(c * 31 + r + Math.floor((t - o.t) * 10)) < .5 ? '0' : '1', (c + .5) * W / cols, y); } }
        g.fillStyle = `rgba(20,255,100,${.08 * env})`; g.fillRect(0, 0, W, H); }
      for (let i = 0; i < (o.kind === 'glitch' ? 9 : 6); i++) { if (hsh(fr * 7 + i) > .55 * (o.kind === 'glitch' ? .6 : 1) + .3) continue; const y = hsh(fr * 13 + i) * H, h = 8 + hsh(fr + i * 3) * 70; g.globalCompositeOperation = 'lighter'; g.fillStyle = i % 3 === 0 ? `rgba(255,0,60,${.35 * env})` : i % 3 === 1 ? `rgba(0,255,200,${.35 * env})` : `rgba(255,255,255,${.25 * env})`; g.fillRect((hsh(fr + i) - .5) * 120, y, W, h); }
      g.globalCompositeOperation = 'source-over'; for (let y = 0; y < H; y += 6) { g.fillStyle = `rgba(0,0,0,${.18 * env})`; g.fillRect(0, y, W, 2); }
      g.restore(); } }
    if (o.kind === 'fade' && !(o.end != null && t > o.end)) { const k = clamp((t - o.t) / (o.dur || .5)); if (t >= o.t) { const al = o.dir === 'in' ? 1 - k : k; if (al > 0) { g.fillStyle = `rgba(0,0,0,${al})`; g.fillRect(0, 0, W, H); } } }
  }
}
