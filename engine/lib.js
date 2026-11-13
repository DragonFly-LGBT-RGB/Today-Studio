// shared helpers, textures, character factory
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyModel } from './models.js';
import { makeToyChar, drawToyFace } from './toy-characters.js';

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let _rng = mulberry32(1337);
export const rnd = () => _rng();
export const reseed = s => { _rng = mulberry32(s); };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = k => k * k * (3 - 2 * k);
export const easeOut = k => 1 - Math.pow(1 - k, 3);
export const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
export const easeOutBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
export const seg = (t, a, b, f = smooth) => f(clamp((t - a) / (b - a)));
export const lin = k => k;
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function tex(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export function addNoise(g, w, h, amt) {
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
}
export function fabricCanvas(color, size = 256, amt = 18) {
  const c = canvas(size, size), g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, size, size);
  g.globalAlpha = .06;
  for (let i = 0; i < size; i += 3) { g.fillStyle = i % 6 ? '#000' : '#fff'; g.fillRect(0, i, size, 1); g.fillRect(i, 0, 1, size); }
  g.globalAlpha = 1; addNoise(g, size, size, amt);
  return c;
}
export const bumpTex = (() => { const c = canvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); addNoise(g, 256, 256, 90); return tex(c, { srgb: false, repeat: [2, 2] }); })();
export function std(color, rough = .7, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }); }
export function mapMat(c, rough = .8, extra = {}) { return new THREE.MeshStandardMaterial({ map: tex(c), roughness: rough, bumpMap: bumpTex, bumpScale: .6, ...extra }); }
export function repMat(c, rep, rough = .8, extra = {}) { const m = mapMat(c, rough, extra); m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(rep[0], rep[1]); return m; }
const geoCache = new Map();
export function rbox(w, h, d, mat, r = .08, sg = 3) {
  const rr = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001);
  const key = [w, h, d, rr, sg].join(',');
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, sg, rr));
  const m = new THREE.Mesh(geoCache.get(key), mat);
  m.castShadow = m.receiveShadow = true; return m;
}
export function textCanvas(w, h, draw) { const c = canvas(w, h); draw(c.getContext('2d'), w, h); return c; }
export function cyl(rt, rb, h, mat, seg = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; }

// ---------------- faces ----------------
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
export function drawFace(F, e, kind) {
  if (F.style === 'toy') return drawToyFace(F, e);
  const g = F.g; g.clearRect(0, 0, 512, 512);
  const ex = [190, 322], ey = 236 + (e.lookY || 0) * 10, lx = (e.lookX || 0) * 14;
  g.fillStyle = '#141414'; g.strokeStyle = '#141414'; g.lineCap = 'round'; g.lineJoin = 'round';
  const Z = F.zombie;
  if (Z) { // decay: bruises, scar with stitches
    g.fillStyle = 'rgba(70,40,80,.22)'; g.beginPath(); g.ellipse(120, 140, 70, 50, .4, 0, 7); g.fill(); g.beginPath(); g.ellipse(400, 420, 60, 40, -.3, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,30,30,.75)'; g.lineWidth = 7; g.beginPath(); g.moveTo(300, 70); g.lineTo(420, 150); g.stroke();
    g.lineWidth = 5; for (let k = 0; k < 5; k++) { const x = 312 + k * 24, y = 78 + k * 16; g.beginPath(); g.moveTo(x - 6, y + 14); g.lineTo(x + 8, y - 12); g.stroke(); }
    g.fillStyle = '#141414'; g.strokeStyle = '#141414';
  }
  if (F.beard) {
    g.fillStyle = F.beard; g.beginPath(); g.moveTo(40, 250); g.quadraticCurveTo(60, 420, 150, 480); g.quadraticCurveTo(256, 530, 362, 480); g.quadraticCurveTo(452, 420, 472, 250);
    g.quadraticCurveTo(440, 330, 380, 360); g.quadraticCurveTo(256, 300, 132, 360); g.quadraticCurveTo(72, 330, 40, 250); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; for (let k = 0; k < 40; k++) { const x = 70 + k * 9.5; g.beginPath(); g.moveTo(x, 380 + Math.sin(k) * 20); g.lineTo(x + 4, 440 + Math.sin(k * 2) * 25); g.stroke(); }
    g.fillStyle = '#141414'; g.strokeStyle = '#141414';
  }
  for (let i = 0; i < 2; i++) {
    const x = ex[i] + lx, y = ey;
    if (Z && e.eyes !== 'closed' && e.eyes !== 'happy') {
      const open = (e.eyeOpen ?? 1) * (e.blink ? .15 : 1), r = (i ? 27 : 22) * (e.eyeW || 1), yy = y + (i ? -3 : 4);
      g.fillStyle = 'rgba(60,20,50,.4)'; g.beginPath(); g.ellipse(x, yy + 4, r + 14, r * open + 14, 0, 0, 7); g.fill();
      g.fillStyle = Z.eye || '#f4f1d8'; g.beginPath(); g.ellipse(x, yy, r, Math.max(3, r * open), 0, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = '#141414'; g.stroke();
      if (open > .3) { g.strokeStyle = 'rgba(200,40,40,.7)'; g.lineWidth = 2.5; for (let k = 0; k < 4; k++) { const a = k * 1.7 + i; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .95, yy + Math.sin(a) * r * open * .95); g.lineTo(x + Math.cos(a) * r * .45, yy + Math.sin(a) * r * open * .45); g.stroke(); }
        g.fillStyle = Z.pupil || '#141414'; g.beginPath(); g.arc(x + lx * .5 + (i ? 4 : -3), yy + (i ? 2 : -2), 6.5, 0, 7); g.fill(); }
      g.fillStyle = '#141414'; g.strokeStyle = '#141414'; continue;
    }
    if (e.eyes === 'happy') { g.lineWidth = 16; g.beginPath(); g.arc(x, y + 14, 24, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
    if (e.eyes === 'star') { g.fillStyle = '#ffd21a'; star(g, x, y, 42); g.fill(); g.lineWidth = 7; g.stroke(); g.fillStyle = '#141414'; continue; }
    if (e.eyes === 'closed') { g.lineWidth = 12; g.beginPath(); g.moveTo(x - 26, y + 6); g.quadraticCurveTo(x, y + 20, x + 26, y + 6); g.stroke(); continue; }
    if (e.eyes === 'lid') {
      g.beginPath(); g.ellipse(x, y + 4, 26, 26, 0, 0, Math.PI); g.closePath(); g.fill();
      g.lineWidth = 12; g.beginPath(); g.moveTo(x - 34, y + 2 - (i ? 4 : 0)); g.lineTo(x + 34, y + 2 + (i ? 0 : -4)); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 8, y + 14, 6, 0, 7); g.fill(); g.fillStyle = '#141414';
      continue;
    }
    const open = e.eyeOpen ?? 1, ry = 34 * open * (e.blink ? .1 : 1);
    g.beginPath(); g.ellipse(x, y, 23 * (e.eyeW || 1), Math.max(ry, 3), 0, 0, 7); g.fill();
    if (ry > 8) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 7, y - ry * .4, 7, 0, 7); g.fill(); g.fillStyle = '#141414'; }
    if (F.lashes && ry > 8) { g.lineWidth = 6; const s = i ? 1 : -1; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + s * (10 + k * 7), y - ry + 6 + k * 6); g.lineTo(x + s * (24 + k * 9), y - ry - 6 + k * 8); g.stroke(); } }
  }
  if (F.glasses) { g.strokeStyle = '#3a2a1a'; g.lineWidth = 8; for (const x of ex) { g.beginPath(); g.arc(x + lx, ey, 46, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(ex[0] + 46 + lx, ey - 6); g.lineTo(ex[1] - 46 + lx, ey - 6); g.stroke(); g.strokeStyle = '#141414'; }
  g.lineWidth = F.browW || 14; g.strokeStyle = F.browCol || '#141414';
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1, x = ex[i] + lx, y = ey - 62 - (e.browY || 0) * 22 - (i === 1 ? (e.browRaiseR || 0) * 26 : 0) - (F.glasses ? 14 : 0);
    const inner = s < 0 ? x + 32 : x - 32, outer = s < 0 ? x - 32 : x + 32;
    g.beginPath(); g.moveTo(outer, y - (e.browAng || 0) * 14); g.lineTo(inner, y + (e.browAng || 0) * 14); g.stroke();
  }
  g.strokeStyle = '#141414';
  const mx = 256 + lx * .6, my = 346, mo = e.mouthOpen || 0;
  if (mo > .08) {
    const w = 46 + mo * 22 + (e.mouth === 'grin' ? 18 : 0), h = 14 + mo * 52;
    g.fillStyle = '#5a1e1e'; g.beginPath();
    g.moveTo(mx - w, my - 8);
    g.quadraticCurveTo(mx, my - 14 + (e.mouth === 'frown' ? -10 : 0), mx + w, my - 8);
    g.quadraticCurveTo(mx + w * .9, my + h, mx, my + h);
    g.quadraticCurveTo(mx - w * .9, my + h, mx - w, my - 8); g.fill();
    g.save(); g.clip(); g.fillStyle = Z ? '#e8e0b0' : '#fff'; if (Z) { g.beginPath(); g.moveTo(mx - w, my - 20); for (let k = 0; k <= 8; k++) g.lineTo(mx - w + k * w / 4, my - 20 + (k % 2 ? 26 : 6)); g.lineTo(mx + w, my - 20); g.fill(); } else g.fillRect(mx - w, my - 20, 2 * w, 18); g.fillStyle = '#e46a6a'; g.beginPath(); g.ellipse(mx, my + h, w * .55, h * .4, 0, 0, 7); g.fill(); g.restore();
    if (F.lips) { g.strokeStyle = F.lips; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#141414'; }
  } else {
    g.lineWidth = 12; g.beginPath();
    if (F.lips) g.strokeStyle = F.lips;
    if (Z && (!e.mouth || e.mouth === 'flat' || e.mouth === 'frown')) { g.lineWidth = 9; g.moveTo(mx - 52, my + 4); for (let k = 1; k <= 6; k++) g.lineTo(mx - 52 + k * 17.3, my + (k % 2 ? 12 : -4)); g.stroke(); g.lineWidth = 4; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(mx - 40 + k * 20, my - 12); g.lineTo(mx - 40 + k * 20, my + 20); g.stroke(); } g.beginPath(); }
    else if (e.mouth === 'smile' || e.mouth === 'grin') { g.moveTo(mx - 50, my - 10); g.quadraticCurveTo(mx, my + 38, mx + 50, my - 10); }
    else if (e.mouth === 'smirk') { g.moveTo(mx - 44, my + 6); g.quadraticCurveTo(mx + 6, my + 18, mx + 46, my - 18); }
    else if (e.mouth === 'frown') { g.moveTo(mx - 42, my + 16); g.quadraticCurveTo(mx, my - 18, mx + 42, my + 16); }
    else if (e.mouth === 'o') { g.ellipse(mx, my + 4, 16, 22, 0, 0, 7); }
    else if (e.mouth === 'wavy') { g.moveTo(mx - 44, my + 6); for (let k = 0; k < 4; k++) g.quadraticCurveTo(mx - 33 + k * 22, my + (k % 2 ? 16 : -6), mx - 22 + k * 22, my + 6); }
    else if (e.mouth === 'jaw') { g.fillStyle = '#5a1e1e'; g.ellipse(mx, my + 40, 34, 70, 0, 0, 7); g.fill(); }
    else { g.moveTo(mx - 36, my + 4); g.lineTo(mx + 36, my + 4); }
    g.stroke(); g.strokeStyle = '#141414';
  }
  if (F.mustache) {
    g.fillStyle = F.mustache; g.beginPath();
    g.moveTo(mx, my - 26); g.bezierCurveTo(mx - 30, my - 50, mx - 80, my - 34, mx - 92, my - 4); g.bezierCurveTo(mx - 60, my - 18, mx - 30, my - 12, mx, my - 18);
    g.bezierCurveTo(mx + 30, my - 12, mx + 60, my - 18, mx + 92, my - 4); g.bezierCurveTo(mx + 80, my - 34, mx + 30, my - 50, mx, my - 26); g.fill();
  }
  if (F.bloodMouth) {
    g.fillStyle = 'rgba(110,4,4,.88)'; g.beginPath(); g.ellipse(mx, my + 14, 70, 26, 0, 0, 7); g.fill();
    for (const [x0, len, w] of [[-52, 120, 13], [-20, 70, 9], [18, 150, 12], [50, 95, 10], [0, 40, 16]]) { g.beginPath(); g.moveTo(mx + x0 - w, my + 10); g.quadraticCurveTo(mx + x0 - w * .6, my + 10 + len * .7, mx + x0, my + 10 + len); g.quadraticCurveTo(mx + x0 + w * .6, my + 10 + len * .7, mx + x0 + w, my + 10); g.fill(); g.beginPath(); g.arc(mx + x0, my + 10 + len, w * .9, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(60,0,0,.5)'; g.beginPath(); g.ellipse(mx - 20, my + 30, 30, 10, .3, 0, 7); g.fill();
  }
  if (e.infected) {
    const k = e.infected; g.lineCap = 'round';
    for (let i = 0; i < 2; i++) { const x = ex[i] + lx, y = ey; g.fillStyle = `rgba(70,30,60,${.32 * k})`; g.beginPath(); g.ellipse(x, y + 34, 44, 22, 0, 0, 7); g.fill();
      g.strokeStyle = `rgba(60,25,75,${.75 * k})`; g.lineWidth = 3.5; for (let v = 0; v < 6; v++) { const a = (i ? -1 : 1) * (.4 + v * .45) + (i ? Math.PI : 0); let px = x + Math.cos(a) * 34, py = y + Math.sin(a) * 30; g.beginPath(); g.moveTo(px, py); for (let s2 = 0; s2 < 4; s2++) { px += Math.cos(a + Math.sin(v * 3 + s2) * .6) * 14 * k; py += Math.sin(a + Math.cos(v * 2 + s2) * .6) * 14 * k; g.lineTo(px, py); } g.stroke(); }
      if (k > .45) { g.fillStyle = `rgba(214,222,196,${clamp((k - .45) * 2.2)})`; g.beginPath(); g.ellipse(x, y, 17 * (e.eyeW || 1), Math.min(17, 34 * (e.eyeOpen ?? 1) * (e.blink ? .1 : 1)) * .9, 0, 0, 7); g.fill(); g.fillStyle = `rgba(150,20,20,${clamp((k - .45) * 2) * .8})`; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }
    g.strokeStyle = '#141414'; g.fillStyle = '#141414';
  }
  if (F.freckles) { g.fillStyle = 'rgba(160,90,50,.5)'; for (const [x, y] of [[150, 300], [170, 315], [140, 318], [362, 300], [342, 315], [372, 318]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }
  if (e.blush || F.blush) { g.fillStyle = 'rgba(255,90,90,.25)'; g.beginPath(); g.ellipse(150, 312, 34, 18, 0, 0, 7); g.ellipse(362, 312, 34, 18, 0, 0, 7); g.fill(); }
  if (e.sweat) { g.fillStyle = 'rgba(120,190,255,.95)'; g.beginPath(); g.moveTo(400, 140); g.quadraticCurveTo(428, 190, 400, 202); g.quadraticCurveTo(372, 190, 400, 140); g.fill(); }
  if (e.tears) { g.fillStyle = 'rgba(110,180,255,.85)'; for (const x of ex) g.fillRect(x - 10 + lx, ey + 20, 20, 160); }
  F.t.needsUpdate = true;
}

// ---------------- clothes ----------------
function shirtCanvas(o, part) {
  const base = o.shirt, kind = o.shirtKind;
  const c = fabricCanvas(base, 256, 16), g = c.getContext('2d');
  if (kind === 'plaid') {
    g.globalAlpha = .28; g.fillStyle = '#3a0d0d';
    for (let i = 0; i < 256; i += 64) { g.fillRect(i, 0, 26, 256); g.fillRect(0, i, 256, 26); }
    g.globalAlpha = .35; g.fillStyle = '#f5e6c8'; for (let i = 40; i < 256; i += 64) { g.fillRect(i, 0, 4, 256); g.fillRect(0, i, 256, 4); }
    g.globalAlpha = 1;
  }
  if (kind === 'camo') { const cols = ['#3f4a2a', '#6b5a3a', '#1e2214', '#5a6a3a']; for (let i = 0; i < 46; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); const x = rnd() * 256, y = rnd() * 256; g.ellipse(x, y, 14 + rnd() * 26, 8 + rnd() * 16, rnd() * 3, 0, 7); g.fill(); } addNoise(g, 256, 256, 12); }
  if (kind === 'labcoat' && part === 'front') { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(124, 0, 8, 256); g.fillStyle = '#d8dde0'; g.beginPath(); g.moveTo(70, 0); g.lineTo(124, 90); g.lineTo(100, 0); g.fill(); g.beginPath(); g.moveTo(186, 0); g.lineTo(132, 90); g.lineTo(156, 0); g.fill(); g.fillStyle = o.under || '#4a5a6a'; g.beginPath(); g.moveTo(100, 0); g.lineTo(128, 80); g.lineTo(156, 0); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.strokeRect(150, 120, 50, 40); }
  if (kind === 'stripes') { g.globalAlpha = .9; g.fillStyle = o.stripe || '#fff'; for (let i = 0; i < 256; i += 48) g.fillRect(0, i, 256, 18); g.globalAlpha = 1; addNoise(g, 256, 256, 10); }
  if (o.tie && part === 'front') { g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(88, 0); g.lineTo(128, 60); g.lineTo(168, 0); g.fill(); g.fillStyle = o.tie; g.beginPath(); g.moveTo(118, 8); g.lineTo(138, 8); g.lineTo(146, 150); g.lineTo(128, 175); g.lineTo(110, 150); g.closePath(); g.fill(); }
  if (o.vest && part === 'front') { g.fillStyle = o.vest; g.fillRect(0, 0, 80, 256); g.fillRect(176, 0, 80, 256); g.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 30; y < 256; y += 56) { g.fillRect(14, y, 50, 30); g.fillRect(192, y, 50, 30); } }
  if (kind === 'gown') { g.fillStyle = 'rgba(40,70,110,.35)'; for (let y = 8; y < 256; y += 26) for (let x = (y / 26 % 2) * 13; x < 256; x += 26) { g.save(); g.translate(x, y); g.rotate(.785); g.fillRect(-3, -3, 6, 6); g.restore(); } }
  if (kind === 'scrubs' && part === 'front') { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.moveTo(84, 0); g.lineTo(128, 70); g.lineTo(172, 0); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; g.strokeRect(150, 90, 50, 42); }
  if (kind === 'uniform' && part === 'front') { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(80, 0); g.lineTo(128, 50); g.lineTo(176, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(28, 70, 56, 46); g.fillRect(172, 70, 56, 46); g.fillStyle = '#d4a017'; g.beginPath(); g.moveTo(200, 76); g.lineTo(214, 84); g.lineTo(212, 102); g.lineTo(200, 110); g.lineTo(188, 102); g.lineTo(186, 84); g.fill(); g.fillStyle = '#c9c2a8'; for (let y = 70; y < 250; y += 40) { g.beginPath(); g.arc(128, y, 5, 0, 7); g.fill(); } }
  if (kind === 'nurse' && part === 'front') { g.fillStyle = '#d9480f'; g.fillRect(52, 70, 34, 10); g.fillRect(64, 58, 10, 34); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 4; g.beginPath(); g.moveTo(90, 0); g.lineTo(128, 50); g.lineTo(166, 0); g.stroke(); }
  if (o.ribs && part === 'front') { g.fillStyle = '#5a0c0c'; g.beginPath(); g.ellipse(128, 120, 70, 88, 0, 0, 7); g.fill(); g.fillStyle = '#8a1a14'; g.beginPath(); g.ellipse(128, 125, 58, 76, 0, 0, 7); g.fill(); g.strokeStyle = '#e9dcc0'; g.lineWidth = 9; g.lineCap = 'round'; for (let i = 0; i < 5; i++) { const y = 70 + i * 24; g.beginPath(); g.moveTo(122, y); g.quadraticCurveTo(80, y + 6, 76, y + 26); g.stroke(); g.beginPath(); g.moveTo(134, y); g.quadraticCurveTo(176, y + 6, 180, y + 26); g.stroke(); } g.lineWidth = 11; g.beginPath(); g.moveTo(128, 56); g.lineTo(128, 190); g.stroke(); }
  if (o.bloody) { for (let i = 0; i < 6 * o.bloody; i++) { const x = rnd() * 256, y = rnd() * 200, r = 8 + rnd() * 26; g.fillStyle = `rgba(${95 + rnd() * 50 | 0},4,4,${.55 + rnd() * .35})`; g.beginPath(); for (let k = 0; k < 16; k++) { const an = k / 16 * 6.283, rr = r * (.6 + rnd() * .5); g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 1.2); } g.fill(); const runs = 1 + (rnd() * 3 | 0); for (let k = 0; k < runs; k++) { const xx = x + (rnd() - .5) * r, w = 3 + rnd() * 5, L = 20 + rnd() * 70; g.fillRect(xx - w / 2, y, w, L); g.beginPath(); g.arc(xx, y + L, w * .8, 0, 7); g.fill(); } } }
  if (part === 'front') {
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6;
    if (kind === 'plaid' || kind === 'cardigan') {
      g.fillStyle = kind === 'cardigan' ? '#f2ead8' : 'rgba(0,0,0,.25)';
      if (kind === 'cardigan') { g.beginPath(); g.moveTo(90, 0); g.lineTo(128, 120); g.lineTo(166, 0); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(128, 120); g.lineTo(128, 256); g.stroke(); g.fillStyle = '#3a2a1a'; for (let y = 140; y < 250; y += 36) { g.beginPath(); g.arc(128, y, 7, 0, 7); g.fill(); } }
      else {
        g.beginPath(); g.moveTo(80, 0); g.lineTo(128, 50); g.lineTo(176, 0); g.fill();
        g.fillStyle = '#f2ead8'; g.beginPath(); g.moveTo(84, 0); g.lineTo(128, 46); g.lineTo(110, 60); g.lineTo(70, 6); g.fill(); g.beginPath(); g.moveTo(172, 0); g.lineTo(128, 46); g.lineTo(146, 60); g.lineTo(186, 6); g.fill();
        g.fillStyle = '#f2ead8'; for (let y = 80; y < 250; y += 45) { g.beginPath(); g.arc(128, y, 6, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(128, 50); g.lineTo(128, 256); g.stroke();
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(30, 70, 50, 40); g.strokeRect(30, 70, 50, 40);
      }
    } else if (kind === 'hoodie') {
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(70, 0); g.quadraticCurveTo(128, 70, 186, 0); g.fill();
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 6; g.beginPath(); g.moveTo(110, 40); g.lineTo(106, 110); g.moveTo(146, 40); g.lineTo(150, 110); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.moveTo(60, 256); g.lineTo(76, 170); g.lineTo(180, 170); g.lineTo(196, 256); g.fill();
      if (o.print) { g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '900 30px Inter'; g.textAlign = 'center'; g.fillText(o.print, 128, 140); }
    } else {
      g.beginPath(); g.moveTo(88, 2); g.quadraticCurveTo(128, 46, 168, 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(90, 8); g.quadraticCurveTo(128, 50, 166, 8); g.stroke();
      if (o.print) { g.fillStyle = o.printCol || 'rgba(255,255,255,.9)'; g.font = `900 ${o.printSize || 34}px Inter`; g.textAlign = 'center'; g.fillText(o.print, 128, 160); }
    }
    const sh = g.createLinearGradient(0, 0, 0, 256); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = sh; g.fillRect(0, 0, 256, 256);
  }
  if (o.torn) tearCanvas(g, o.skin || '#8fb07a', o.torn);
  return c;
}
// rips showing skin + dirt stains (zombie clothes)
export function tearCanvas(g, skin, amt = 1) {
  // dirt and dried-blood stains
  for (let i = 0; i < 7 * amt; i++) { const x = rnd() * 256, y = rnd() * 256, red = rnd() < .35; g.fillStyle = red ? `rgba(${90 + rnd() * 30 | 0},20,18,${.18 + rnd() * .15})` : `rgba(${55 + rnd() * 30 | 0},${45 + rnd() * 20 | 0},25,${.16 + rnd() * .14})`; g.beginPath(); for (let k = 0; k < 14; k++) { const an = k / 14 * Math.PI * 2, rr = (8 + rnd() * 14) * (.6 + rnd() * .6); g.lineTo(x + Math.cos(an) * rr * 1.4, y + Math.sin(an) * rr); } g.closePath(); g.fill(); }
  // irregular holes showing skin
  const hole = (cx, cy, rx, ry) => {
    g.beginPath(); const n = 22; for (let k = 0; k < n; k++) { const an = k / n * Math.PI * 2, j = .62 + rnd() * .38 + (k % 3 === 0 ? rnd() * .25 : 0); g.lineTo(cx + Math.cos(an) * rx * j, cy + Math.sin(an) * ry * j); }
    g.closePath(); g.fillStyle = skin; g.fill(); g.strokeStyle = 'rgba(25,18,10,.55)'; g.lineWidth = 2.5; g.stroke();
  };
  for (let i = 0; i < 3 * amt; i++) hole(rnd() * 210 + 23, rnd() * 210 + 23, 10 + rnd() * 16, 6 + rnd() * 10);
  // slashes
  for (let i = 0; i < 2 * amt; i++) {
    const x0 = rnd() * 200 + 28, y0 = rnd() * 200 + 28, an = -.6 + rnd() * 1.2, L = 40 + rnd() * 40, w = 4 + rnd() * 4, ca = Math.cos(an), sa = Math.sin(an);
    g.beginPath(); const pts = 8;
    for (let k = 0; k <= pts; k++) { const t = k / pts, ww = w * Math.sin(t * Math.PI) * (.6 + rnd() * .7); g.lineTo(x0 + ca * L * t - sa * ww, y0 + sa * L * t + ca * ww); }
    for (let k = pts; k >= 0; k--) { const t = k / pts, ww = w * Math.sin(t * Math.PI) * (.6 + rnd() * .7); g.lineTo(x0 + ca * L * t + sa * ww, y0 + sa * L * t - ca * ww); }
    g.closePath(); g.fillStyle = skin; g.fill(); g.strokeStyle = 'rgba(25,18,10,.5)'; g.lineWidth = 2; g.stroke();
  }
}
function limbCanvas(o, topCol, botCol, split, kind, shoe) {
  const top = shirtCanvas({ ...o, shirt: topCol, shirtKind: kind }), c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = botCol; g.fillRect(0, 0, 256, 256); addNoise(g, 256, 256, 6);
  g.drawImage(top, 0, 0, 256, 256 * split, 0, 0, 256, 256 * split);
  if (split < 1) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 256 * split - 6, 256, 6); }
  if (kind === 'jeans') { g.strokeStyle = 'rgba(240,190,90,.6)'; g.setLineDash([6, 5]); g.lineWidth = 3; g.beginPath(); g.moveTo(20, 0); g.lineTo(20, 256); g.moveTo(236, 0); g.lineTo(236, 256); g.stroke(); g.setLineDash([]); }
  if (o.torn) tearCanvas(g, o.skin || '#8fb07a', o.torn * .7);
  if (shoe) { g.fillStyle = shoe; g.fillRect(0, 256 * .86, 256, 256 * .14); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, 256 * .955, 256, 256 * .045); }
  return c;
}

export const SKINS = ['#f3d6ae', '#e8bf8f', '#c98f5f', '#8d5a3b', '#f7dcc0'];

export function makeChar(scene, o) {
  if (o?.style === 'toy') return makeToyChar(scene, o);
  let ch_badge = null;
  const root = new THREE.Group(); root.rotation.order = 'YXZ'; scene.add(root);
  const skin = o.skin || SKINS[0];
  const skinMat = o.zombie ? mapMat(textCanvas(128, 128, (g, w, h) => { g.fillStyle = skin; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '70,90,40' : '120,70,90'},.18)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 14, 0, 7); g.fill(); } addNoise(g, w, h, 16); }), .75, { bumpScale: 1 }) : std(skin, .55);
  const M = c => mapMat(c, .85, { bumpScale: .5 });
  const front = M(shirtCanvas(o, 'front')), plain = M(shirtCanvas({ ...o, print: null }));
  const torso = rbox(2, 2, 1, [plain, plain, plain, plain, front, plain], .14, 4); torso.position.y = 3; root.add(torso);
  const limb = (topCol, botCol, split, kind, shoe, bottom) => { const s = M(limbCanvas(o, topCol, botCol, split, kind, shoe)); const t = M(shirtCanvas({ ...o, shirt: topCol, shirtKind: kind, print: null })); return [s, s, t, bottom, s, s]; };
  const pant = o.pants;
  const legMats = limb(pant, pant, 1, o.pantsKind, o.shoe, std(o.shoe || pant, .6));
  const armMats = limb(o.shirt, skin, o.sleeve, o.shirtKind === 'hoodie' || o.shirtKind === 'cardigan' ? 'plain' : o.shirtKind, null, skinMat);
  const mkLeg = x => { const p = new THREE.Group(); p.position.set(x, 2, 0); root.add(p); const m = rbox(.98, 2, .98, legMats, .13, 4); m.position.y = -1; p.add(m); return p; };
  const mkArm = x => { const p = new THREE.Group(); p.position.set(x, 3.85, 0); root.add(p); const m = rbox(.98, 2, .98, armMats, .14, 4); m.position.y = -.85; p.add(m); const hand = new THREE.Group(); hand.position.set(0, -1.8, 0); p.add(hand); p.userData.hand = hand; return p; };
  const legR = mkLeg(-.5), legL = mkLeg(.5), armR = mkArm(-1.5), armL = mkArm(1.5);
  const head = new THREE.Group(); head.position.y = 4.0; root.add(head);
  const neck = cyl(.32, .36, .3, skinMat, 16); neck.position.y = .1; head.add(neck); const _neck = neck;
  const hm = rbox(1.3, 1.25, 1.2, skinMat, .3, 5); hm.position.y = .7; head.add(hm);
  const c = canvas(512, 512);
  const F = { c, g: c.getContext('2d'), t: tex(c), ...o.face, zombie: o.zombie || o.face?.zombie };
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.02), new THREE.MeshStandardMaterial({ map: F.t, transparent: true, roughness: .55, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
  face.position.set(0, .68, .603); head.add(face); const _face = face;
  // hair
  if (o.hairStyle !== 'none') {
    const hairC = canvas(256, 256), hg = hairC.getContext('2d'); hg.fillStyle = o.hair; hg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) { hg.strokeStyle = rnd() > .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.25)'; hg.lineWidth = 1 + rnd() * 3; const x = rnd() * 256; hg.beginPath(); hg.moveTo(x, 0); hg.quadraticCurveTo(x + (rnd() - .5) * 30, 128, x + (rnd() - .5) * 20, 256); hg.stroke(); }
    const hairMat = new THREE.MeshStandardMaterial({ map: tex(hairC), roughness: .45, bumpMap: bumpTex, bumpScale: 1.5 });
    const Hb = (w, h, d, x, y, z, rx = 0, rz = 0, r = .2, mat = hairMat) => { const m = rbox(w, h, d, mat, r, 4); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); head.add(m); return m; };
    const st = o.hairStyle;
    if (st === 'long') {
      Hb(1.5, .55, 1.42, 0, 1.38, -.02, 0, 0, .25); Hb(1.48, 1.45, .45, 0, .85, -.52, 0, 0, .2);
      Hb(.32, 1.25, 1.25, -.72, .85, -.03, 0, .04, .15); Hb(.32, 1.25, 1.25, .72, .85, -.03, 0, -.04, .15);
      Hb(.62, .38, .3, -.36, 1.17, .55, .2, .35, .12); Hb(.55, .34, .3, .32, 1.2, .55, .2, -.3, .12);
    } else if (st === 'short') {
      Hb(1.42, .32, 1.32, 0, 1.36, -.02, 0, 0, .14); Hb(1.42, .8, .3, 0, 1.0, -.5, 0, 0, .12);
      Hb(.18, .55, 1.0, -.68, 1.08, -.12, 0, 0, .08); Hb(.18, .55, 1.0, .68, 1.08, -.12, 0, 0, .08);
    } else if (st === 'spiky') {
      Hb(1.4, .3, 1.3, 0, 1.36, -.02, 0, 0, .12);
      for (let i = 0; i < 5; i++) Hb(.3, .45, .3, -.5 + i * .25, 1.6, .3 - (i % 2) * .4, .3, (i - 2) * .2, .1);
      Hb(1.42, .7, .3, 0, 1.05, -.5, 0, 0, .12);
    } else if (st === 'ponytail') {
      Hb(1.46, .45, 1.38, 0, 1.36, -.02, 0, 0, .2); Hb(1.46, 1.0, .35, 0, 1.0, -.52, 0, 0, .15);
      Hb(.22, .9, 1.1, -.7, .95, -.1, 0, .03, .1); Hb(.22, .9, 1.1, .7, .95, -.1, 0, -.03, .1);
      Hb(1.2, .3, .3, 0, 1.22, .55, .25, 0, .12);
      const pt = Hb(.45, 1.2, .45, 0, .95, -.95, -.5, 0, .2);
      const bow = rbox(.6, .3, .25, std(o.bow || '#ff4fa0', .5), .1); bow.position.set(0, 1.42, -.78); head.add(bow);
    } else if (st === 'bun') {
      Hb(1.44, .42, 1.36, 0, 1.36, -.02, 0, 0, .2); Hb(1.44, .9, .32, 0, 1.0, -.5, 0, 0, .14);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(.38, 16, 12), hairMat); bun.position.set(0, 1.75, -.25); bun.castShadow = true; head.add(bun);
    } else if (st === 'bald') {
      Hb(.2, .5, .8, -.68, .95, -.15, 0, 0, .08); Hb(.2, .5, .8, .68, .95, -.15, 0, 0, .08); Hb(1.36, .45, .2, 0, .9, -.6, 0, 0, .08);
    } else if (st === 'hardhat') {
      const hhM = std(o.hat || '#ffd43b', .35);
      Hb(1.42, .55, .3, 0, .95, -.5, 0, 0, .12);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(.86, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), hhM); dome.scale.set(1, .78, .95); dome.position.set(0, 1.22, -.02); dome.castShadow = true; head.add(dome);
      Hb(1.95, .08, 1.85, 0, 1.24, .02, 0, 0, .04, hhM); Hb(.24, .2, 1.5, 0, 1.82, -.02, 0, 0, .08, hhM);
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(.5, .22), new THREE.MeshStandardMaterial({ map: tex(textCanvas(128, 56, (g, w, h) => { g.fillStyle = o.hat || '#ffd43b'; g.fillRect(0, 0, w, h); g.fillStyle = '#c92a2a'; g.font = '900 34px Inter'; g.textAlign = 'center'; g.fillText('СМУ', w / 2, 40); })), roughness: .4 })); logo.position.set(0, 1.5, .78); logo.rotation.x = -.5; head.add(logo);
    } else if (st === 'kerchief') {
      const kC = textCanvas(256, 256, (g, w, h) => { g.fillStyle = o.hat || '#c92a2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const x = rnd() * w, y = rnd() * h; g.fillStyle = i % 3 ? '#fff3bf' : '#69db7c'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 7, y + Math.sin(k * 1.26) * 7, 5, 0, 7); g.fill(); } g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } addNoise(g, w, h, 14); if (o.torn) tearCanvas(g, '#3a3a3a', .5); });
      const kM = new THREE.MeshStandardMaterial({ map: tex(kC), roughness: .85, bumpMap: bumpTex, bumpScale: .8 });
      Hb(1.1, .2, .14, 0, 1.2, .6, 0, 0, .06);
      Hb(1.5, .5, 1.44, 0, 1.38, -.02, 0, 0, .22, kM); Hb(1.5, 1.25, .34, 0, .85, -.58, 0, 0, .15, kM);
      Hb(.24, 1.2, 1.3, -.75, .82, -.03, 0, 0, .1, kM); Hb(.24, 1.2, 1.3, .75, .82, -.03, 0, 0, .1, kM);
      Hb(1.2, .2, .3, 0, .12, .45, 0, 0, .08, kM); Hb(.4, .32, .3, 0, -.05, .6, 0, 0, .1, kM);
    } else if (st === 'hazmat') {
      const hz = new THREE.MeshStandardMaterial({ map: tex(fabricCanvas(o.hat || '#e8c020', 128, 10)), roughness: .6, bumpMap: bumpTex, bumpScale: .4 });
      Hb(1.78, .38, 1.66, 0, 1.52, -.02, 0, 0, .16, hz); Hb(1.78, 1.8, .3, 0, .72, -.74, 0, 0, .12, hz); Hb(.3, 1.8, 1.66, -.86, .72, -.02, 0, 0, .1, hz); Hb(.3, 1.8, 1.66, .86, .72, -.02, 0, 0, .1, hz); Hb(1.78, .3, 1.66, 0, -.12, -.02, 0, 0, .1, hz);
      const vc = textCanvas(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(160,220,230,.18)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, 40); g.lineTo(90, 20); g.stroke(); if (o.visorBlood !== false) { g.fillStyle = 'rgba(110,4,4,.85)'; g.beginPath(); g.ellipse(180, 70, 40, 26, .4, 0, 7); g.fill(); for (let i = 0; i < 4; i++) g.fillRect(160 + i * 12, 70, 5, 50 + i * 22); } });
      const vis = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 1.5), new THREE.MeshStandardMaterial({ map: tex(vc), transparent: true, roughness: .05, metalness: .3, depthWrite: false })); vis.position.set(0, .74, .8); head.add(vis);
      const resp = rbox(.8, .42, .32, std('#222', .6), .14, 2); resp.position.set(0, .2, .82); head.add(resp); for (const x of [-.48, .48]) { const f = cyl(.2, .2, .2, std('#333', .5), 12); f.rotation.x = Math.PI / 2; f.position.set(x, .18, .86); head.add(f); }
    } else if (st === 'helmet') {
      const hm2 = new THREE.MeshStandardMaterial({ map: tex(fabricCanvas(o.hat || '#4a5530', 128, 18)), roughness: .75, bumpMap: bumpTex, bumpScale: .8 });
      Hb(1.62, .62, 1.56, 0, 1.5, -.04, 0, 0, .28, hm2); Hb(1.72, .16, 1.66, 0, 1.2, -.04, 0, 0, .06, hm2); Hb(1.5, .7, .3, 0, .95, -.62, 0, 0, .12, hm2);
      const gg = rbox(1.1, .32, .14, std('#151515', .4), .1, 2); gg.position.set(0, 1.42, .74); head.add(gg); for (const x of [-.28, .28]) { const l = cyl(.13, .13, .06, new THREE.MeshStandardMaterial({ color: '#203a30', roughness: .05, metalness: .6, emissive: '#0a2a1a' }), 14); l.rotation.x = Math.PI / 2; l.position.set(x, 1.42, .82); head.add(l); }
      for (const x of [-.7, .7]) { const st2 = rbox(.06, .7, .1, std('#222', .7), .02, 1); st2.position.set(x, .7, .2); head.add(st2); }
    } else if (st === 'brain') {
      const bc = textCanvas(256, 256, (g, w, h) => { g.fillStyle = '#d9707a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a2a38'; g.lineWidth = 7; for (let i = 0; i < 40; i++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - .5) * 50; y += (rnd() - .5) * 50; g.lineTo(x, y); } g.stroke(); } g.fillStyle = 'rgba(120,0,10,.4)'; for (let i = 0; i < 20; i++) g.fillRect(rnd() * w, rnd() * h, 6, 14); });
      const bm2 = new THREE.MeshStandardMaterial({ map: tex(bc), roughness: .25, metalness: .05, bumpMap: tex(bc), bumpScale: 3, emissive: '#3a0008', emissiveIntensity: .4 });
      const b1 = new THREE.Mesh(new THREE.SphereGeometry(.62, 20, 14), bm2); b1.scale.set(1.15, .7, 1.2); b1.position.set(0, 1.42, -.05); head.add(b1);
      const skull = std('#c9c4b0', .6); Hb(1.36, .22, .3, 0, 1.18, .5, 0, 0, .06, skull); for (const [x, rz] of [[-.66, .5], [.66, -.5]]) Hb(.22, .3, 1.2, x, 1.25, -.05, 0, rz, .06, skull);
      const veins = std('#5a0a10', .3); for (let i = 0; i < 6; i++) { const d = rbox(.08, .25 + rnd() * .3, .08, veins, .03, 1); d.position.set(-.5 + rnd(), .95, .62); head.add(d); }
    } else if (st === 'scrubcap') {
      const sc = new THREE.MeshStandardMaterial({ map: tex(fabricCanvas(o.hat || '#3f8f7a', 128, 14)), roughness: .9, bumpMap: bumpTex, bumpScale: .6 });
      Hb(1.48, .55, 1.42, 0, 1.4, -.02, 0, 0, .24, sc); Hb(1.46, .7, .3, 0, 1.0, -.55, 0, 0, .12, sc); Hb(1.46, .14, .3, 0, 1.12, .58, 0, 0, .06, sc);
    } else if (st === 'nursecap') {
      Hb(1.44, .42, 1.36, 0, 1.36, -.02, 0, 0, .2); Hb(1.44, .9, .32, 0, 1.0, -.5, 0, 0, .14);
      const cm = new THREE.MeshStandardMaterial({ map: tex(textCanvas(128, 64, (g, w, h) => { g.fillStyle = '#f1efe8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c92a2a'; g.fillRect(54, 14, 20, 36); g.fillRect(46, 22, 36, 20); addNoise(g, w, h, 10); })), roughness: .8 });
      const cap = rbox(1.0, .42, .55, cm, .08, 2); cap.position.set(0, 1.66, .18); cap.rotation.x = -.25; head.add(cap);
    } else if (st === 'guardcap') {
      const gm = std(o.hat || '#1d2533', .6, { bumpMap: bumpTex, bumpScale: .4 });
      Hb(1.42, .55, .3, 0, .95, -.5, 0, 0, .12);
      Hb(1.6, .5, 1.5, 0, 1.55, -.02, 0, 0, .18, gm); Hb(1.5, .14, 1.4, 0, 1.28, -.02, 0, 0, .05, std('#0d1118', .5));
      Hb(1.3, .07, .62, 0, 1.3, .92, .12, 0, .03, std('#0b0d12', .3)); const bd = rbox(.3, .26, .05, std('#d4a017', .3, { metalness: .8 }), .04, 1); bd.position.set(0, 1.55, .77); head.add(bd);
    } else if (st === 'cap') {
      const capMat = std(o.cap || '#e04b3c', .6, { bumpMap: bumpTex, bumpScale: .5 });
      Hb(1.44, .5, 1.36, 0, 1.42, -.02, 0, 0, .22, capMat);
      Hb(1.2, .08, .7, 0, 1.22, .85, .08, 0, .03, capMat);
      Hb(1.42, .55, .3, 0, .95, -.5, 0, 0, .12);
    }
  }
  if (o.hairStyle === 'ushanka') {
    const furC = canvas(256, 256), fg = furC.getContext('2d'); fg.fillStyle = o.hat || '#6b4a2e'; fg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) { fg.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.2)'; fg.fillRect(rnd() * 256, rnd() * 256, 2, 5 + rnd() * 6); }
    const fur = new THREE.MeshStandardMaterial({ map: tex(furC), roughness: 1, bumpMap: bumpTex, bumpScale: 3 });
    const H = (w, h, d, x, y, z, r = .2) => { const m = rbox(w, h, d, fur, r, 4); m.position.set(x, y, z); head.add(m); return m; };
    H(1.5, .55, 1.42, 0, 1.5, -.02, .22); H(1.62, .32, .3, 0, 1.3, .66, .14); H(.24, .85, 1.0, -.8, .95, -.05, .1); H(.24, .85, 1.0, .8, .95, -.05, .1); H(1.5, .55, .26, 0, 1.0, -.66, .1);
    const badge = rbox(.2, .2, .04, std('#e8b923', .3, { metalness: .8 }), .03, 1); badge.position.set(0, 1.32, .83); head.add(badge);
    if (o.hair) { const side = std(o.hair, .6); for (const x of [-.7, .7]) { const m = rbox(.12, .3, .5, side, .05, 1); m.position.set(x, .62, .1); head.add(m); } }
  }
  if (o.face?.beard) { const bc = canvas(64, 64), bg = bc.getContext('2d'); bg.fillStyle = o.face.beard; bg.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { bg.fillStyle = 'rgba(0,0,0,.12)'; bg.fillRect(rnd() * 64, rnd() * 64, 1, 5); }
    const bm = rbox(1.22, .62, .42, new THREE.MeshStandardMaterial({ map: tex(bc), roughness: .9, bumpMap: bumpTex, bumpScale: 2 }), .2, 4); bm.position.set(0, .05, .44); head.add(bm); }
  if (o.headband) { const hb = rbox(1.38, .17, 1.28, std(o.headband, .7), .06, 2); hb.position.set(0, 1.12, 0); head.add(hb); }
  let packG = null;
  if (o.backpack) { const bpC = textCanvas(256, 256, (g, w, h) => { g.fillStyle = o.backpack.color || '#ffcc00'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, w, 18); g.fillStyle = o.backpack.ink || '#222'; g.font = '900 64px Inter'; g.textAlign = 'center'; const bt = o.backpack.text ?? 'ЕДА'; if (bt) { g.fillText(bt, w / 2, 150); g.beginPath(); g.arc(w / 2, 200, 16, 0, 7); g.fill(); } else { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(20, 120, w - 40, 6); g.fillRect(w / 2 - 3, 18, 6, h - 18); } addNoise(g, w, h, 12); if (o.torn) tearCanvas(g, '#3a3a3a', .6); });
    const bpm = new THREE.MeshStandardMaterial({ map: tex(bpC), roughness: .7 }); const bpG = new THREE.Group(); root.add(bpG); packG = bpG; if (o.backpack.scale) { const k = o.backpack.scale; bpG.scale.setScalar(k); bpG.position.set(0, 3.3 * (1 - k), -.53 * (1 - k)); } const bp = rbox(1.8, 1.8, 1.1, bpm, .12, 3); bp.position.set(0, 3.3, -1.08); bpG.add(bp);
    if (o.backpack.roll) { const rl = cyl(.38, .38, 1.9, std(o.backpack.roll, .8), 10); rl.rotation.z = Math.PI / 2; rl.position.set(0, 4.35, -1.08); bpG.add(rl); }
    if (o.backpack.pocket) { const pk = rbox(1.2, .8, .35, bpm, .08, 2); pk.position.set(0, 2.85, -1.75); bpG.add(pk); }
    for (const x of [-.6, .6]) { const st = rbox(.22, 2.0, .08, std('#222', .7), .03, 1); st.position.set(x, 3.05, .53); bpG.add(st); } }
  // accessories
  const acc = {}; if (packG) acc.pack = packG;
  const glassMat = new THREE.MeshStandardMaterial({ color: '#0b0b10', roughness: .08, metalness: .6 });
  acc.shades = new THREE.Group(); head.add(acc.shades); acc.shades.position.set(0, .78, .66); acc.shades.visible = false;
  { const l = rbox(.5, .3, .06, glassMat, .08, 2); l.position.x = -.29; acc.shades.add(l); const r = l.clone(); r.position.x = .29; acc.shades.add(r); const b = rbox(.2, .06, .05, glassMat, .02, 1); b.position.y = .08; acc.shades.add(b); const top = rbox(1.25, .07, .06, glassMat, .02, 1); top.position.y = .14; acc.shades.add(top); }
  if (o.apronText !== undefined) {
    const ac = textCanvas(256, 256, (g, w, h) => { g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f80ed'; g.fillRect(0, 0, w, 14); g.fillStyle = '#2f80ed'; g.font = '900 40px Inter'; g.textAlign = 'center'; g.fillText(o.apronText, w / 2, 120); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(60, 160, 136, 60); addNoise(g, w, h, 8); });
    acc.apron = rbox(1.7, 1.85, .05, new THREE.MeshStandardMaterial({ map: tex(ac), roughness: .9 }), .02, 1); acc.apron.position.set(0, 2.98, .53); root.add(acc.apron); acc.apron.visible = false;
    const legA = rbox(1.7, 1.2, .05, new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: .9 }), .02, 1); legA.position.set(0, -.5, .55); acc.apron.add(legA);
  }
  if (o.mask) { const mc = textCanvas(128, 64, (g, w, h) => { g.fillStyle = o.mask; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; for (const y of [18, 32, 46]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } if (o.maskBlood) { g.fillStyle = 'rgba(120,5,5,.85)'; g.beginPath(); g.ellipse(70, 40, 26, 14, .2, 0, 7); g.fill(); g.fillRect(64, 40, 6, 24); } addNoise(g, w, h, 8); });
    const mk = rbox(1.14, .58, .1, new THREE.MeshStandardMaterial({ map: tex(mc), roughness: .9 }), .05, 2); mk.position.set(0, .42, .63); head.add(mk);
    for (const x of [-.6, .6]) { const st = rbox(.04, .05, .9, std('#e8e8e8', .8), .02, 1); st.position.set(x, .6, .2); head.add(st); } }
  if (o.noLegs) { legL.visible = legR.visible = false; const stump = rbox(1.9, .35, .95, std('#5a0a08', .35), .12, 3); stump.position.y = 1.9; root.add(stump); for (let i = 0; i < 4; i++) { const d = rbox(.22, .5 + i * .15, .22, std('#6a0c0a', .3), .08, 2); d.position.set(-.7 + i * .45, 1.55 - i * .06, (i % 2 - .5) * .4); root.add(d); } }
  if (o.gasmask) { const gm = std('#1b1d1f', .55); const mk = rbox(1.1, .62, .34, gm, .16, 2); mk.position.set(0, .38, .66); head.add(mk); const f = cyl(.24, .26, .38, std('#3a3d40', .4, { metalness: .6 }), 14); f.rotation.x = Math.PI / 2; f.position.set(0, .3, .95); head.add(f); for (const x of [-.3, .3]) { const l = cyl(.2, .2, .08, new THREE.MeshStandardMaterial({ color: '#2a0a08', roughness: .05, metalness: .4, emissive: o.gasEyes || '#000000' }), 16); l.rotation.x = Math.PI / 2; l.position.set(x, .82, .66); head.add(l); } }
  if (o.spikes) { const bone = std('#e6dfc8', .5); for (let i = 0; i < 7; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.16, .9 + rnd() * .6, 6), bone); sp.position.set(-.8 + (i % 4) * .53, 3.2 + Math.floor(i / 4) * .7 + rnd() * .2, -.55); sp.rotation.x = -1.1; root.add(sp); } for (const x of [-1.5, 1.5]) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.18, 1.1, 6), bone); sp.position.set(x, 4.3, -.1); sp.rotation.z = -x * .25; root.add(sp); } }
  // glowing mutant veins (mutant look): jagged emissive strips on torso / arms / head + torn-skin patches
  if (o.veins) { const vm = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.veins.color || '#7dff5a').multiplyScalar(o.veins.k || 1.6), toneMapped: false });
    const tm = std(o.veins.torn || '#5a1010', .35);
    const vein = (par, x0, y0, z, n, sx, sy, scl = 1) => { let x = x0, y = y0; for (let i = 0; i < n; i++) { const nx = x + (rnd() - .5) * .35 * sx, ny = y + (.12 + rnd() * .18) * sy; const len = Math.hypot(nx - x, ny - y); const m = new THREE.Mesh(new THREE.BoxGeometry(.045 * scl, len, .02), vm); m.position.set((x + nx) / 2, (y + ny) / 2, z); m.rotation.z = Math.atan2(-(nx - x), ny - y); par.add(m); x = nx; y = ny; } };
    for (let i = 0; i < 9; i++) vein(torso, -.85 + rnd() * 1.7, -.95 + rnd() * .5, i % 2 ? .515 : -.515, 6 + (rnd() * 4 | 0), 1, 1);
    for (const a of [armL, armR]) for (let i = 0; i < 3; i++) { const g = new THREE.Group(); a.children[0].add(g); vein(g, -.3 + rnd() * .6, -.95, i % 2 ? .5 : -.5, 8, 1, 1, .9); }
    for (let i = 0; i < 4; i++) vein(head, -.5 + rnd(), -.5, .61, 4, 1, .8, .8);
    for (let i = 0; i < 6; i++) { const t = rbox(.3 + rnd() * .4, .2 + rnd() * .35, .04, tm, .05, 1); t.position.set(-.7 + rnd() * 1.4, -.7 + rnd() * 1.4, rnd() < .5 ? .51 : -.51); t.rotation.z = rnd() * 3; torso.add(t); } }
  if (o.armLen) for (const a of [armL, armR]) { a.children[0].scale.y = o.armLen; a.children[0].position.y *= o.armLen; a.userData.hand.position.y *= o.armLen; }
  if (o.claws) { const cm = std('#efe8d0', .35); for (const a of [armL, armR]) for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.07, .7, 5), cm); c.position.set(-.3 + i * .3, -.25, .1); c.rotation.x = Math.PI; a.userData.hand.add(c); } }
  if (o.badge) { const bc = textCanvas(128, 160, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#c92a2a'; g.fillRect(0, 0, w, 34); g.fillStyle = '#fff'; g.font = '900 22px Inter'; g.textAlign = 'center'; g.fillText('ДОСТУП', w / 2, 25); g.fillStyle = '#333'; g.fillRect(30, 50, 68, 60); g.fillStyle = '#111'; g.font = '800 20px Inter'; g.fillText(o.badge, w / 2, 140); }); const bd = rbox(.55, .7, .04, new THREE.MeshStandardMaterial({ map: tex(bc), roughness: .4, emissive: '#331010', emissiveIntensity: .3 }), .03, 1); bd.position.set(.5, 3.25, .53); root.add(bd); ch_badge = bd; }
  if (o.armScale) for (const a of [armL, armR]) { a.children[0].scale.set(o.armScale, 1.08, o.armScale); a.userData.hand.position.y *= 1.08; }
  if (o.bulk) { const tr = rbox(2.5, .7, 1.25, skinMat, .3, 3); tr.position.y = 3.85; root.add(tr); armL.position.x = 1.75; armR.position.x = -1.75; }
  if (o.scale) root.scale.set(...o.scale);
  const ch = { root, torso, head, armL, armR, legL, legR, F, acc, o, skinMat, badge: ch_badge, hm, neck: _neck, faceMesh: _face };
  if (o.model) applyModel(ch, o);
  ch.reset = () => { for (const p of [armL, armR, legL, legR, head]) p.rotation.set(0, 0, 0); root.rotation.set(0, 0, 0); root.visible = true; acc.shades.visible = false; if (acc.apron) acc.apron.visible = false; };
  ch.hand = side => { const v = new THREE.Vector3(); (side === 'L' ? armL : armR).userData.hand.getWorldPosition(v); return v; };
  return ch;
}
