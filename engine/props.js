// Prop library: hand props (attach to a character's hand) and world props (cart, wash station, money table).
import * as THREE from 'three';
import { rnd, mulberry32, canvas, tex, addNoise, bumpTex, std, mapMat, rbox, textCanvas, cyl } from './lib.js';
import { flashlight, glowSprite } from './fx.js';
import { model } from './models.js';
import { ph } from './s3.js';

export function woodCanvas(base = '#c99a62', w = 256, h = 256) {
  const c = canvas(w, h), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.globalAlpha = .18; g.strokeStyle = '#5a3a1e';
  for (let k = 0; k < 18; k++) { g.beginPath(); const y = rnd() * h; g.moveTo(0, y); g.bezierCurveTo(w * .3, y + (rnd() - .5) * 14, w * .6, y + (rnd() - .5) * 14, w, y); g.lineWidth = 1 + rnd() * 2.5; g.stroke(); }
  g.globalAlpha = 1; addNoise(g, w, h, 16); return c;
}
export const M = {};
export function initMaterials() {
  M.wood = mapMat(woodCanvas(), .7);
  M.woodLight = mapMat(woodCanvas('#e2b77e'), .6);
  M.woodDark = std('#3b2416', .45);
  M.glass = new THREE.MeshStandardMaterial({ color: '#e8f6ff', roughness: .05, transparent: true, opacity: .35, depthWrite: false });
  M.lemonade = new THREE.MeshStandardMaterial({ color: '#ffe55c', roughness: .2, emissive: '#ffcc00', emissiveIntensity: .25, transparent: true, opacity: .9 });
  M.lemon = std('#ffd21a', .45, { bumpMap: bumpTex, bumpScale: 1.5 });
  const billC = textCanvas(512, 256, (g, w, h) => { g.fillStyle = '#7cc47a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2f6b37'; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#2f6b37'; g.beginPath(); g.arc(w / 2, h / 2, 70, 0, 7); g.fill(); g.fillStyle = '#d9f2d0'; g.font = '900 90px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₽', w / 2, h / 2 + 4); g.fillStyle = '#2f6b37'; g.font = '900 56px Inter'; g.fillText('1000', 90, 64); g.fillText('1000', w - 90, h - 60); addNoise(g, w, h, 18); });
  M.bill = new THREE.MeshStandardMaterial({ map: tex(billC), roughness: .8, side: THREE.DoubleSide });
  M.stackSide = std('#a9d9a2', .9, { bumpMap: bumpTex, bumpScale: 2 });
  M.kvass = new THREE.MeshStandardMaterial({ color: '#7a3e12', roughness: .15, emissive: '#3a1a05', emissiveIntensity: .3, transparent: true, opacity: .92 });
  M.billGeo = new THREE.PlaneGeometry(.9, .45, 4, 1);
  const p = M.billGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 3) * .04); M.billGeo.computeVertexNormals();
}

export function cup(full = true, liq = M.lemonade) {
  const g = new THREE.Group(); const c = cyl(.17, .13, .42, M.glass, 16); c.castShadow = false; g.add(c);
  const l = cyl(.155, .125, .3, liq, 16); l.position.y = -.05; l.visible = full; g.add(l); g.userData.liquid = l;
  const straw = cyl(.025, .025, .6, std('#ff4f70', .5), 6); straw.position.set(.05, .2, 0); straw.rotation.z = -.2; straw.visible = full; g.add(straw);
  return g;
}
export function phone(screenCol = '#4fa3ff') { const g = new THREE.Group(); g.add(rbox(.5, .95, .07, std('#15151a', .25, { metalness: .5 }), .07, 2)); const s = new THREE.Mesh(new THREE.PlaneGeometry(.44, .86), new THREE.MeshBasicMaterial({ color: screenCol })); s.position.z = .04; g.add(s); return g; }
export function billMesh() { const b = new THREE.Mesh(M.billGeo, M.bill); b.castShadow = true; return b; }

// Hand props. Each returns an Object3D already oriented for mounting on a hand group.
export function sixPack(label = '#4dabf7') {
  const g = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: '#bfe3ff', roughness: .05, transparent: true, opacity: .55 }); const cap = std(label, .4); const lab = std('#2b8a3e', .6);
  for (let i = 0; i < 6; i++) { const b = new THREE.Group(); b.position.set((i % 3 - 1) * .3, 0, (i < 3 ? -.15 : .15)); const body = cyl(.14, .14, .75, bm, 12); b.add(body); const neck = cyl(.06, .12, .18, bm, 10); neck.position.y = .46; b.add(neck); const c = cyl(.065, .065, .07, cap, 10); c.position.y = .58; b.add(c); const l = cyl(.145, .145, .25, lab, 12); l.position.y = -.05; b.add(l); g.add(b); }
  const band = rbox(.98, .3, .66, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .2, transparent: true, opacity: .35 }), .05, 1); band.position.y = .05; g.add(band);
  return g;
}
export const HAND_PROPS = {
  // ── season 2: downloaded-model hand props (Kenney CC0) ──
  hammer() { const g = new THREE.Group(); const m = model('survival/tool-hammer', { scale: 13 }); m.rotation.x = Math.PI; m.position.y = .35; g.add(m); return g; },
  plasma() {
    const g = new THREE.Group(); const m = model('blaster/blaster-q', { scale: 4.2 }); m.rotation.x = -Math.PI / 2; m.position.set(0, -1.2, .15); g.add(m);
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .6, 10), new THREE.MeshStandardMaterial({ color: '#5ad8ff', emissive: '#5ad8ff', emissiveIntensity: 2 })); cell.position.set(0, -.9, .55); g.add(cell);
    const flash = new THREE.Group(); flash.position.set(0, -2.8, .2); flash.visible = false; g.add(flash);
    const sp = glowSprite('#7ae8ff', 2.2, 1); flash.add(sp); const core = glowSprite('#ffffff', .8, 1); flash.add(core);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 7, 8), new THREE.MeshBasicMaterial({ color: '#9af0ff', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); bolt.position.y = -3.5; flash.add(bolt);
    const L = new THREE.PointLight('#5ad8ff', 70, 16, 1.6); flash.add(L); g.userData.flash = flash; return g;
  },
  serum() { const g = new THREE.Group(); const body = cyl(.16, .16, 1.2, new THREE.MeshStandardMaterial({ color: '#e8fff0', roughness: .05, transparent: true, opacity: .5 }), 14); body.position.y = -.65; g.add(body);
    const liq = cyl(.13, .13, 1.0, new THREE.MeshStandardMaterial({ color: '#2aff6a', emissive: '#2aff6a', emissiveIntensity: 2.2 }), 14); liq.position.y = -.6; g.add(liq);
    const nd = cyl(.03, .015, .6, std('#dfe6ea', .2, { metalness: .9 }), 6); nd.position.y = -1.55; g.add(nd); const pl = cyl(.06, .06, .5, std('#dfe6ea', .3, { metalness: .6 }), 8); pl.position.y = .15; g.add(pl);
    const sp = glowSprite('#3aff7a', 1.4, .8); sp.position.y = -.6; g.add(sp); const L = new THREE.PointLight('#3aff7a', 8, 7, 1.6); L.position.y = -.6; g.add(L); return g; },
  ampoule() { const g = new THREE.Group(); const body = cyl(.11, .11, .8, new THREE.MeshStandardMaterial({ color: '#fff4e0', roughness: .05, transparent: true, opacity: .45 }), 12); body.position.y = -.45; g.add(body);
    const liq = cyl(.085, .085, .62, new THREE.MeshStandardMaterial({ color: '#ffb030', emissive: '#ff9010', emissiveIntensity: 1.8 }), 12); liq.position.y = -.5; g.add(liq);
    const nd = cyl(.025, .012, .45, std('#dfe6ea', .2, { metalness: .9 }), 6); nd.position.y = -1.05; g.add(nd); const cap = cyl(.12, .12, .12, std('#2a2a2a', .5), 10); cap.position.y = .02; g.add(cap);
    const sp = glowSprite('#ffa030', .32, .45); sp.position.y = -.5; g.add(sp); const L = new THREE.PointLight('#ffa030', 1.4, 3, 1.6); L.position.y = -.5; g.add(L); return g; },
  tablet() { const g = new THREE.Group(); const c = textCanvas(256, 340, (gg, w, h) => { gg.fillStyle = '#021a10'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#3aff9a'; gg.font = '700 22px monospace'; for (let r = 0; r < 14; r++) gg.fillText(Array.from({ length: 12 }, (_, k) => ((r * 7 + k * 3) % 5 < 2 ? '1' : '0')).join(''), 14, 30 + r * 22); gg.fillStyle = '#ff3a6a'; gg.fillRect(14, 300, 120, 22); gg.fillStyle = '#021a10'; gg.font = '900 18px Inter'; gg.fillText('ВЗЛОМ', 26, 318); });
    const t = tex(c); const scr = new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: .9, roughness: .3 }); const blk = std('#1a1c20', .4, { metalness: .4 });
    const b = rbox(.95, .08, 1.25, [blk, blk, scr, blk, blk, blk], .04, 1); b.position.set(0, -.35, .45); b.rotation.x = .5; g.add(b); const L = new THREE.PointLight('#3aff9a', 4, 4, 1.6); L.position.set(0, .2, .9); g.add(L); return g; },
  rifle() {
    const g = new THREE.Group(), blk = std('#1a1c1e', .45, { metalness: .6 }), olive = std('#3c4430', .7);
    const body = rbox(.3, 1.6, .42, blk, .05, 1); body.position.set(0, -.75, .05); g.add(body);
    const stock = rbox(.26, .9, .5, olive, .06, 1); stock.position.set(0, .35, -.05); g.add(stock);
    const hand = rbox(.32, .9, .36, olive, .05, 1); hand.position.set(0, -1.85, .02); g.add(hand);
    const bar = cyl(.06, .06, 1.1, blk, 8); bar.position.set(0, -2.75, .08); g.add(bar);
    const mag = rbox(.22, .4, .6, blk, .04, 1); mag.position.set(0, -1.05, -.42); mag.rotation.x = .25; g.add(mag);
    const sc = cyl(.1, .1, .6, blk, 10); sc.position.set(0, -.9, .38); g.add(sc);
    const fl = flashlight(false, { intensity: 130, beamOp: .008, angle: .36 }); fl.scale.setScalar(.55); fl.position.set(0, -1.75, -.28); g.add(fl);
    const flash = new THREE.Group(); flash.position.set(0, -3.4, .08); flash.visible = false; g.add(flash);
    const starT = tex(textCanvas(128, 128, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.translate(64, 64); const gr = gg.createRadialGradient(0, 0, 2, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(.25, 'rgba(255,200,90,.95)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); gg.fillStyle = gr; for (let k = 0; k < 7; k++) { gg.rotate(Math.PI * 2 / 7); gg.beginPath(); gg.moveTo(-9, 0); gg.lineTo(0, -(k % 2 ? 40 : 62)); gg.lineTo(9, 0); gg.fill(); } gg.beginPath(); gg.arc(0, 0, 16, 0, 7); gg.fill(); }));
    const fm = new THREE.MeshBasicMaterial({ map: starT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    for (let i = 0; i < 3; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), fm); pl.rotation.y = i * 1.05; flash.add(pl); }
    const sm = new THREE.SpriteMaterial({ map: starT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, toneMapped: false }); const sp = new THREE.Sprite(sm); sp.scale.setScalar(1.4); flash.add(sp); const L = new THREE.PointLight('#ffc070', 90, 16, 1.6); flash.add(L);
    g.userData.flash = flash; return g;
  },
  fartbomb() { const g = new THREE.Group(); const c = textCanvas(256, 128, (gg, w, h) => { gg.fillStyle = '#2b2f2a'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#8ce936'; gg.fillRect(0, 44, w, 40); gg.fillStyle = '#111'; gg.font = '900 34px Inter'; gg.textAlign = 'center'; gg.fillText('ПУК-1', w / 2, 76); });
    const b = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .35, metalness: .3 })); b.position.set(0, -.62, .2); b.rotation.y = -Math.PI / 2; g.add(b);
    const cap = cyl(.16, .2, .2, std('#555', .4, { metalness: .7 }), 12); cap.position.set(0, -.1, .2); g.add(cap); const fuse = cyl(.03, .03, .35, std('#d9c39a', .8), 6); fuse.position.set(.05, .1, .2); fuse.rotation.z = .4; g.add(fuse);
    const sp = glowSprite('#c6ff6a', .5, .9); sp.position.set(.12, .3, .2); g.add(sp); return g; },
  flare() { const g = new THREE.Group(); const st = cyl(.1, .1, .9, std('#c92a2a', .5), 8); st.position.y = -.35; g.add(st); const tip = glowSprite('#ff3a2a', .9, .9); tip.position.y = -.9; g.add(tip); const L = new THREE.PointLight('#ff2a1a', 26, 20, 1.4); L.position.y = -1; g.add(L); return g; },
  keycard() { const g = new THREE.Group(); const c = textCanvas(128, 80, (gg, w, h) => { gg.fillStyle = '#f4f4f0'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#c92a2a'; gg.fillRect(0, 0, w, 22); gg.fillStyle = '#111'; gg.font = '900 18px Inter'; gg.fillText('СЕКТОР 2', 10, 52); }); const card = rbox(.7, .06, .45, new THREE.MeshStandardMaterial({ map: tex(c), roughness: .4, emissive: '#331111', emissiveIntensity: .4 }), .02, 1); card.position.set(0, -.25, .25); card.rotation.x = .5; g.add(card); return g; },
  // fire extinguisher (Poly Haven model, held upside-down by the neck like a club; falls back to a red cylinder)
  extinguisher() { const g = new THREE.Group(); const m = ph('korean_fire_extinguisher_01', { scale: 1.1 }); const sz = m.userData.size;
    if (sz && sz.y > .1) { m.rotation.x = Math.PI; m.position.y = .1; g.add(m); } else { const b = cyl(.28, .28, 1.6, std('#b01a14', .35, { metalness: .3 }), 14); b.position.y = -.9; g.add(b); } return g; },
  crowbar() { const g = new THREE.Group(); const m = std('#7a1a14', .4, { metalness: .7 }); const b = cyl(.06, .06, 2.4, m, 8); b.position.y = -.9; g.add(b); const h = cyl(.06, .06, .5, m, 8); h.position.set(0, -2.15, .2); h.rotation.x = .9; g.add(h); return g; },
  jerrycan() { const g = new THREE.Group(); const m = ph('metal_jerrycan_green', { scale: 1 }); const sz = m.userData.size; if (sz && sz.y > .1) { m.position.set(0, -(sz.y || 1.6) - .05, 0); g.add(m); } else { const b = rbox(1.1, 1.4, .5, std('#3e5a2e', .5, { metalness: .3 }), .08, 2); b.position.y = -.85; g.add(b); } return g; },
  battery() { const g = new THREE.Group(); const b = rbox(1.2, .8, .6, std('#1a1a1a', .5), .06, 2); b.position.y = -.55; g.add(b); const lb = rbox(1.0, .4, .02, std('#c8a020', .6), .02, 1); lb.position.set(0, -.55, .31); g.add(lb);
    for (const [x, c] of [[-.35, '#b01a14'], [.35, '#222']]) { const t = cyl(.07, .07, .16, std(c, .4, { metalness: .5 }), 8); t.position.set(x, -.08, 0); g.add(t); } return g; },
  flashlight() { return flashlight(true); },
  torchS() { const g = flashlight(false, { intensity: 70, beamOp: 0, beamLen: .1, beamRad: .05 }); g.traverse(o => { if (o.isMesh && o.material && o.material.opacity === 0) o.visible = false; }); return g; },
  flashlightN() { return flashlight(false, { intensity: 300, beamOp: .055 }); },
  guardLight() { return flashlight(false, { intensity: 360, color: '#ffe9c4', beamOp: .06 }); },
  scalpel() { const g = new THREE.Group(); const h = rbox(.12, .7, .08, std('#c9ced6', .25, { metalness: .9 }), .03, 1); h.position.y = -.4; g.add(h); const b = rbox(.1, .45, .03, std('#e8ecf2', .12, { metalness: 1 }), .015, 1); b.position.y = -.95; g.add(b); const bl = rbox(.11, .2, .035, std('#6a0404', .2), .015, 1); bl.position.y = -1.05; g.add(bl); return g; },
  syringe() { const g = new THREE.Group(); const body = cyl(.12, .12, .9, new THREE.MeshStandardMaterial({ color: '#dfe9ee', roughness: .1, transparent: true, opacity: .75 }), 12); body.position.y = -.5; g.add(body); const liq = cyl(.09, .09, .5, std('#6fbf3f', .3, { emissive: '#2a5a10', emissiveIntensity: .6 }), 10); liq.position.y = -.65; g.add(liq); const n = cyl(.015, .015, .5, std('#cfd4da', .2, { metalness: 1 }), 6); n.position.y = -1.18; g.add(n); const pl = cyl(.16, .16, .05, std('#e0e0e0', .4), 12); pl.position.y = -.02; g.add(pl); return g; },
  syringeRed() { const g = new THREE.Group(); const body = cyl(.12, .12, .9, new THREE.MeshStandardMaterial({ color: '#dfe9ee', roughness: .1, transparent: true, opacity: .75 }), 12); body.position.y = -.5; g.add(body); const liq = cyl(.09, .09, .5, std('#7a0a0a', .25, { emissive: '#200000', emissiveIntensity: .3 }), 10); liq.position.y = -.65; g.add(liq); const n = cyl(.015, .015, .5, std('#cfd4da', .2, { metalness: 1 }), 6); n.position.y = -1.18; g.add(n); const pl = cyl(.16, .16, .05, std('#e0e0e0', .4), 12); pl.position.y = -.02; g.add(pl); return g; },
  pills() { const g = new THREE.Group(); const b = cyl(.17, .17, .42, std('#c26b1a', .25, { transparent: true, opacity: .9 }), 14); b.position.y = -.3; g.add(b); const cap = cyl(.18, .18, .12, std('#f2f2f2', .5), 14); cap.position.y = -.05; g.add(cap); const lab = cyl(.175, .175, .2, std('#f4f0e2', .7), 14); lab.position.y = -.3; g.add(lab); return g; },
  gauze() { const g = new THREE.Group(); const r = cyl(.28, .28, .4, std('#efece4', .95), 16); r.position.y = -.3; r.rotation.z = Math.PI / 2; g.add(r); return g; },
  pan() { const g = new THREE.Group(); const h = cyl(.06, .07, .8, std('#2a1a10', .6), 8); h.position.y = -.3; g.add(h); const pan = cyl(.55, .48, .12, std('#2b2d31', .35, { metalness: .8 }), 24); pan.position.y = -1.15; pan.rotation.x = Math.PI / 2; g.add(pan); const rim = new THREE.Mesh(new THREE.TorusGeometry(.55, .04, 8, 24), std('#3a3d42', .3, { metalness: .9 })); rim.position.copy(pan.position); g.add(rim); g.rotation.x = -Math.PI / 2; g.position.z = .1; return g; },
  water() { const p = sixPack(); p.position.set(.75, -.45, .2); p.scale.setScalar(1.1); return p; },
  bottle() { const g = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: '#a8e6a1', roughness: .05, transparent: true, opacity: .6 }); const b = cyl(.15, .15, .8, bm, 12); g.add(b); const n = cyl(.06, .13, .2, bm, 10); n.position.y = .5; g.add(n); const l = cyl(.155, .155, .3, mapMat(textCanvas(256, 64, (gg, w, h) => { gg.fillStyle = '#2f9e44'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#fff'; gg.font = '900 30px Inter'; gg.textAlign = 'center'; gg.fillText('ОГУРЕЦ', w / 2, 44); }), .5), 12); g.add(l); g.position.set(0, -.2, .25); g.rotation.x = Math.PI / 2; return g; },
  bag() { const g = new THREE.Group(); const b = rbox(.9, .7, .35, std('#7a4a22', .8), .08, 2); b.position.set(0, -.5, 0); g.add(b); const l = rbox(.95, .25, .37, std('#5a3415', .8), .06, 2); l.position.set(0, -.25, .01); g.add(l); return g; },
  book() { const g = new THREE.Group(); const cov = textCanvas(256, 340, (gg, w, h) => { gg.fillStyle = '#1c7ed6'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#fff'; gg.textAlign = 'center'; gg.font = '900 50px Inter'; gg.fillText('ФИЗИКА', w / 2, 80); gg.font = '700 34px Inter'; gg.fillText('9 класс', w / 2, 126); gg.strokeStyle = '#ffe066'; gg.lineWidth = 7; for (let k = 0; k < 3; k++) { gg.beginPath(); gg.ellipse(w / 2, 235, 80, 28, k * 1.05, 0, 7); gg.stroke(); } gg.fillStyle = '#ff6b6b'; gg.beginPath(); gg.arc(w / 2, 235, 15, 0, 7); gg.fill(); addNoise(gg, w, h, 10); });
    const pg = std('#f1ead8', .9), cm = new THREE.MeshStandardMaterial({ map: tex(cov), roughness: .6 }); const b = rbox(1.15, 1.5, .24, [pg, pg, pg, pg, cm, std('#1864ab', .6)], .03, 1); b.rotation.x = Math.PI / 2; b.position.set(0, -.32, .55); g.add(b); return g; },
  keys() { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(.16, .03, 8, 20), std('#c0c4c8', .25, { metalness: .9 })); g.add(ring); for (const [a, c] of [[-.4, '#d4b13a'], [.3, '#c0c4c8']]) { const k = new THREE.Group(); k.rotation.z = a; g.add(k); const bl = rbox(.08, .5, .03, std(c, .25, { metalness: .9 }), .01, 1); bl.position.y = -.4; k.add(bl); const hd = rbox(.2, .18, .05, std(c, .25, { metalness: .9 }), .03, 1); hd.position.y = -.12; k.add(hd); } const tag = rbox(.22, .3, .04, std('#e03131', .5), .04, 1); tag.position.set(.18, -.2, 0); g.add(tag); g.position.set(0, -.35, .25); return g; },
  radio() { const g = new THREE.Group(); const body = rbox(.5, .95, .28, std('#23262b', .5), .07, 2); g.add(body); const ant = cyl(.04, .05, .7, std('#111', .5), 6); ant.position.set(.14, .8, 0); g.add(ant); const gr = new THREE.Mesh(new THREE.PlaneGeometry(.36, .3), new THREE.MeshStandardMaterial({ map: tex(textCanvas(64, 54, (gg, w, h) => { gg.fillStyle = '#3a3f46'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#15171a'; for (let y = 6; y < h; y += 8) gg.fillRect(4, y, w - 8, 4); })), roughness: .7 })); gr.position.set(0, .15, .145); g.add(gr); const led = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff3b3b', emissive: '#ff2020', emissiveIntensity: 2 })); led.position.set(-.15, .42, .1); g.add(led); g.rotation.x = Math.PI / 2; g.position.set(0, -.3, .1); return g; },
  remote() { const r = rbox(.18, .55, .08, std('#1a1a1a', .5), .04, 1); r.position.set(0, -.15, .2); r.rotation.x = -1.2; return r; },
  phoneLit() { const p = phone('#9cf5ff'); p.position.set(0, -.15, .35); p.rotation.set(-Math.PI / 2 + .4, 0, 0); p.traverse(o => { if (o.material && o.material.map) { o.material = o.material.clone(); o.material.emissive = new THREE.Color('#9cf5ff'); o.material.emissiveIntensity = .8; } }); return p; },
  phone() { const p = phone('#7fd0ff'); p.position.set(0, -.15, .35); p.rotation.set(-Math.PI / 2 + .4, 0, 0); return p; },
  hammer() { const g = new THREE.Group(); const h = rbox(.12, .9, .12, M.wood, .03, 1); h.position.y = -.35; g.add(h); const hd = rbox(.5, .2, .2, std('#555', .3, { metalness: .9 }), .04, 1); hd.position.y = -.8; g.add(hd); g.rotation.x = -Math.PI / 2; g.position.z = .1; return g; },
  cup() { const c = cup(true); c.position.set(0, -.15, .28); c.rotation.x = Math.PI / 2; return c; },
  cupKvass() { const c = cup(true, M.kvass); c.position.set(0, -.15, .28); c.rotation.x = Math.PI / 2; return c; },
  cupEmpty() { const c = cup(false); c.position.set(0, -.15, .28); c.rotation.x = Math.PI / 2; return c; },
  bill() { const b = billMesh(); const g = new THREE.Group(); g.add(b); b.rotation.set(0, 0, Math.PI / 2); g.position.set(0, -.1, .3); return g; },
  fan() { const f = new THREE.Group(); for (let i = 0; i < 6; i++) { const b = billMesh(); const p = new THREE.Group(); p.rotation.z = (i - 2.5) * .22; b.position.y = .25; p.add(b); f.add(p); } f.position.set(0, -.2, .3); f.rotation.x = -Math.PI / 2 + .3; return f; },
  selfie() { const g = new THREE.Group(); const st = cyl(.03, .03, 1.7, std('#222', .3, { metalness: .8 }), 8); st.position.y = -.85; g.add(st); const ph = phone('#ff9ad5'); ph.position.y = -1.75; ph.rotation.set(Math.PI / 2 + .3, Math.PI, 0); g.add(ph); g.userData.pov = ph; g.position.y = -.1; return g; },
};

// ---------------- lemonade cart ----------------
const CART_DEFAULT = { title: 'ЛИМОНАД', sub: 'ОТ МАКСА', price: '50₽', stripe: ['#ffcf1f', '#ffffff'], border: '#2f9e44', titleColor: '#1f6f2e', subColor: '#e0463c', signBg: '#fff6c7', drink: 'lemonade', fruit: 'lemon' };
const stripeC = (o) => textCanvas(512, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = o.stripe[i % 2]; g.fillRect(i * w / 8, 0, w / 8, h); } addNoise(g, w, h, 10); });
const signC = (o) => textCanvas(1024, 380, (g, w, h) => {
  g.fillStyle = o.signBg; g.fillRect(0, 0, w, h); g.strokeStyle = o.border; g.lineWidth = 16; g.strokeRect(14, 14, w - 28, h - 28);
  if (o.fruit === 'lemon') { g.fillStyle = '#ffd21a'; g.beginPath(); g.ellipse(150, 190, 95, 72, -.3, 0, 7); g.fill(); g.strokeStyle = '#d9a400'; g.lineWidth = 8; g.stroke(); g.fillStyle = '#4caf50'; g.beginPath(); g.ellipse(215, 110, 40, 18, -.6, 0, 7); g.fill(); }
  else { g.fillStyle = '#b5651d'; g.beginPath(); g.ellipse(150, 190, 80, 105, 0, 0, 7); g.fill(); g.strokeStyle = '#5a2e0a'; g.lineWidth = 10; for (const y of [120, 260]) { g.beginPath(); g.moveTo(80, y); g.lineTo(220, y); g.stroke(); } g.fillStyle = '#f6e3b4'; g.beginPath(); g.ellipse(150, 100, 60, 18, 0, 0, 7); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 150; g.font = `900 ${fs}px Inter`; while (g.measureText(o.title).width > 700) g.font = `900 ${fs -= 6}px Inter`;
  g.fillStyle = o.titleColor; g.fillText(o.title, 610, 160);
  g.fillStyle = o.subColor; g.font = '900 80px Inter'; g.fillText(o.sub, 610, 290); addNoise(g, w, h, 10);
});
function drawPrice(c, text) { const g = c.getContext('2d'), w = c.width, h = c.height; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = text === '0₽' ? '#2f9e44' : '#e0463c'; let fs = 150; g.font = `900 ${fs}px Inter`; while (g.measureText(text).width > 370) g.font = `900 ${fs -= 8}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 135); g.fillStyle = '#333'; g.font = '800 46px Inter'; g.fillText('стакан', w / 2, 250); }
export function buildCart(opts = {}) {
  const o = { ...CART_DEFAULT, ...opts };
  const priceCanvas = canvas(400, 300); drawPrice(priceCanvas, o.price);
  const cartTex = { stripe: tex(stripeC(o)), sign: tex(signC(o)), price: tex(priceCanvas) };
  const LIQ = o.drink === 'kvass' ? M.kvass : M.lemonade;
  const g = new THREE.Group(); const parts = {};
  const add = (name, obj) => { parts[name] = obj; g.add(obj); return obj; };
  add('body', rbox(3.4, 1.5, 1.5, M.wood, .06)).position.set(0, 1.25, 0);
  for (const [n, x] of [['wheelL', -1.6], ['wheelR', 1.6]]) { const wg = new THREE.Group(); wg.position.set(x, .6, 0); const w = cyl(.6, .6, .16, std('#333', .7), 24); w.rotation.z = Math.PI / 2; wg.add(w); const hub = cyl(.18, .18, .2, std('#d8322a', .4, { metalness: .4 }), 12); hub.rotation.z = Math.PI / 2; wg.add(hub); add(n, wg); }
  add('top', rbox(3.8, .14, 1.85, M.woodLight, .04)).position.set(0, 2.07, 0);
  add('postL', rbox(.14, 3.5, .14, M.woodLight, .03)).position.set(-1.75, 3.8, -.75);
  add('postR', rbox(.14, 3.5, .14, M.woodLight, .03)).position.set(1.75, 3.8, -.75);
  const cm = new THREE.MeshStandardMaterial({ map: cartTex.stripe, roughness: .8, bumpMap: bumpTex, bumpScale: .5 });
  const canopy = new THREE.Group(); canopy.position.set(0, 5.6, -.1); add('canopy', canopy);
  const cb = rbox(4.2, .22, 2.3, cm, .05); cb.rotation.x = .12; canopy.add(cb);
  const val = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .4), cm); val.position.set(0, -.25, 1.15); val.castShadow = true; canopy.add(val);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.15), new THREE.MeshStandardMaterial({ map: cartTex.sign, roughness: .85 })); sign.position.set(0, 1.25, .76); add('sign', sign);
  const pc = new THREE.Group(); pc.position.set(1.2, 2.14, .3); pc.rotation.set(-.2, -.25, 0); add('price', pc);
  const pcb = rbox(.95, .72, .05, M.wood, .02, 1); pcb.position.y = .36; pc.add(pcb);
  const pcf = new THREE.Mesh(new THREE.PlaneGeometry(.88, .66), new THREE.MeshStandardMaterial({ map: cartTex.price, roughness: .8 })); pcf.position.set(0, .36, .03); pc.add(pcf);
  const lem = new THREE.Group(); lem.position.set(-.2, 2.14, -.35); add('lemons', lem);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std('#5fb3e0', .3)); bowl.rotation.x = Math.PI; bowl.position.y = .45; bowl.scale.y = .8; lem.add(bowl);
  if (o.fruit === 'barrel') { bowl.visible = false; const br = cyl(.42, .42, .8, std('#b5651d', .6, { bumpMap: bumpTex, bumpScale: 1 }), 20); br.position.y = .4; lem.add(br); for (const y of [.15, .65]) { const band = cyl(.44, .44, .07, std('#3a2a1a', .4, { metalness: .6 }), 20); band.position.y = y; lem.add(band); } const tap = rbox(.1, .1, .25, std('#999', .3, { metalness: .9 }), .03, 1); tap.position.set(0, .2, .45); lem.add(tap); }
  else for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.17, 14, 10), M.lemon); l.scale.set(1.25, 1, 1); l.position.set(i ? Math.cos(i) * .26 : 0, .5 + (i ? 0 : .12), i ? Math.sin(i) * .22 : 0); l.castShadow = true; lem.add(l); }
  const pit = new THREE.Group(); pit.position.set(-1.15, 2.14, .15); add('pitcher', pit);
  const pg = cyl(.32, .28, .95, M.glass, 24); pg.position.y = .48; pg.castShadow = false; pit.add(pg);
  const pl = cyl(.29, .26, .7, LIQ, 24); pl.position.y = .38; pit.add(pl);
  const hnd = new THREE.Mesh(new THREE.TorusGeometry(.2, .04, 8, 16, Math.PI), M.glass); hnd.position.set(-.32, .5, 0); hnd.rotation.z = Math.PI / 2; pit.add(hnd);
  for (let k = 0; k < 2; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .03, 16), std('#ffe14a', .4)); s.position.set(0, .7 - k * .2, 0); s.rotation.z = .3; pit.add(s); }
  const cups = new THREE.Group(); cups.position.set(.35, 2.14, .45); add('cups', cups);
  for (let i = 0; i < 3; i++) { const c = cup(true, LIQ); c.position.set(i * .42 - .4, .21, 0); cups.add(c); }
  const jar = new THREE.Group(); jar.position.set(-1.45, 2.14, -.55); add('jar', jar);
  const jg = cyl(.25, .25, .55, M.glass, 16); jg.position.y = .28; jar.add(jg); const coins = cyl(.22, .22, .2, std('#e0b84a', .3, { metalness: .8 }), 16); coins.position.y = .12; jar.add(coins);
  // dynamic bits for pour/serve
  const stream = cyl(.04, .04, .55, LIQ, 8); stream.castShadow = false; stream.position.set(-.62, 2.75, -.25); stream.visible = false; g.add(stream);
  const pourCup = cup(true, LIQ); pourCup.position.set(-.55, 2.35, -.25); pourCup.visible = false; g.add(pourCup);
  const flyCup = cup(true, LIQ); flyCup.visible = false; g.add(flyCup);
  g.userData = { setPrice: t => { drawPrice(priceCanvas, t); cartTex.price.needsUpdate = true; g.userData.priceText = t; }, priceText: o.price, parts, order: ['body', 'wheelL', 'wheelR', 'top', 'postL', 'postR', 'canopy', 'sign', 'price', 'lemons', 'pitcher', 'cups', 'jar'], stream, pourCup, flyCup, pitcher: pit };
  return g;
}

export function buildWashStation() {
  const g = new THREE.Group();
  const tb = rbox(1.9, .12, 1.3, M.woodLight, .03); tb.position.y = 1.9; g.add(tb);
  for (const x of [-.8, .8]) for (const z of [-.5, .5]) { const l = rbox(.1, 1.9, .1, M.woodLight, .02, 1); l.position.set(x, .95, z); g.add(l); }
  const basin = cyl(.75, .6, .45, std('#9aa3ad', .3, { metalness: .7 }), 24); basin.position.y = 2.2; g.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(.7, 24), new THREE.MeshStandardMaterial({ color: '#9fd3f5', roughness: .05, transparent: true, opacity: .85 })); water.rotation.x = -Math.PI / 2; water.position.y = 2.38; g.add(water);
  const bm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .1, transparent: true, opacity: .85 });
  const bubbles = [];
  for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.08 + rnd() * .1, 10, 8), bm); const a = rnd() * 6.28, r = rnd() * .6; b.position.set(Math.cos(a) * r, 2.42, Math.sin(a) * r); b.userData.ph = rnd() * 6; g.add(b); bubbles.push(b); }
  for (let i = 0; i < 5; i++) { const c = cup(); c.position.set(.95 + (i % 2) * .05, 2.17, -.4 + i * .2); g.add(c); }
  g.userData.bubbles = bubbles;
  return g;
}

export function buildMoneyTable() {
  const g = new THREE.Group();
  const top = rbox(4.2, .22, 2.0, M.woodLight, .06); top.position.set(0, 1.25, -.9); g.add(top);
  for (const x of [-1.9, 1.9]) for (const z of [-1.7, -.1]) { const l = cyl(.08, .08, 1.15, M.woodDark, 10); l.position.set(x, .6, z); g.add(l); }
  const stackGeo = new THREE.BoxGeometry(.9, .16, .45); const r2 = mulberry32(77);
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(stackGeo, [M.stackSide, M.stackSide, M.bill, M.stackSide, M.stackSide, M.stackSide]); m.castShadow = m.receiveShadow = true;
    const layer = i < 26 ? 0 : i < 40 ? 1 : 2;
    m.position.set((r2() - .5) * 3.2 * (1 - layer * .3), 1.44 + layer * .16, -.9 + (r2() - .5) * 1.4 * (1 - layer * .3)); m.rotation.y = (r2() - .5) * .8; g.add(m);
  }
  for (let i = 0; i < 18; i++) { const b = billMesh(); b.rotation.set(-Math.PI / 2, 0, r2() * 6); b.position.set((r2() - .5) * 7, .04 + i * .002, -.9 + (r2() - .5) * 3.5); b.receiveShadow = true; g.add(b); }
  return g;
}
