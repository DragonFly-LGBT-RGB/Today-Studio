// Downloaded CC0 models (Kenney): preload GLBs, clone them for props/sets, and skin procedural characters
// with model geometry ("blocky" rigid-part characters: torso/head/arm-*/leg-* nodes).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MODELS = {};           // key -> gltf.scene (template)
const IMG = {};                     // key -> source texture image of a character
const PARTS = {};                   // key -> { torso, head, 'arm-left', ... } geometries (node transforms baked)

// models that sets/cast may use (small files; loaded once per render process)
const BLOCKY = 'abcdefghijklmnopqr'.split('').map(c => 'blocky/character-' + c);
const GRAVE = ['ghost', 'keeper', 'skeleton', 'vampire', 'zombie'].map(c => 'graveyard/character-' + c);
export const MODEL_LIST = [...BLOCKY]; // LITE: Kenney Blocky Characters (CC0), optional

export async function preloadModels(list = MODEL_LIST) {
  const L = new GLTFLoader();
  await Promise.all(list.filter(k => !MODELS[k]).map(async k => {
    let g; try { g = await L.loadAsync(`/assets/models/${k}.glb`); } catch (e) { console.warn('model missing', k); return; }
    const s = g.scene; s.updateMatrixWorld(true); MODELS[k] = s;
    s.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material) { o.material.roughness = Math.max(o.material.roughness ?? .8, .55); o.material.metalness = Math.min(o.material.metalness ?? 0, .3); } } });
    if (k.includes('character-')) {
      const P = {};
      s.traverse(o => { if (o.isMesh) { const nm = (o.name || o.parent?.name || '').replace(/_\d+$/, ''); const NM = ['torso', 'head', 'arm-left', 'arm-right', 'leg-left', 'leg-right']; const key = NM.find(n => nm === n) || NM.find(n => o.parent?.name === n && !o.children.length && o.parent.type !== 'Mesh'); if (key && !P[key]) { const geo = o.geometry.clone(); const m = new THREE.Matrix4().copy(o.matrixWorld); const ps = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); m.decompose(ps, q, sc); geo.applyMatrix4(new THREE.Matrix4().makeScale(sc.x, sc.y, sc.z)); P[key] = geo; if (!IMG[k] && o.material?.map?.image) IMG[k] = o.material.map.image; } } });
      PARTS[k] = P;
    }
  }));
}

// desaturated copy of a texture (Kenney colormaps are pastel; tinting a grey version gives believable materials)
const DESAT = new Map();
function desatTex(t, k = 1) {
  if (!t || !t.image) return t; const key = t.uuid + ':' + k; if (DESAT.has(key)) return DESAT.get(key);
  const im = t.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const L = .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2]; const v = Math.min(255, 70 + L * .75); d[i] = d[i] + (v - d[i]) * k; d[i + 1] = d[i + 1] + (v - d[i + 1]) * k; d[i + 2] = d[i + 2] + (v - d[i + 2]) * k; }
  g.putImageData(id, 0, 0); const n = new THREE.CanvasTexture(c); n.flipY = t.flipY; n.colorSpace = THREE.SRGBColorSpace; n.wrapS = t.wrapS; n.wrapT = t.wrapT; n.magFilter = t.magFilter; n.minFilter = t.minFilter; n.channel = t.channel; DESAT.set(key, n); return n;
}
// clone a model for a set/prop: model('station/computer', {scale, tint, dark, emissive, emissiveIntensity})
export function model(key, o = {}) {
  const T = MODELS[key]; if (!T) { console.warn('no model', key); return new THREE.Group(); }
  const g = T.clone(true);
  if (o.tint || o.dark || o.emissive || o.mat || o.rough != null || o.metal != null || o.desat) {
    const ds = o.desat ?? (o.tint ? .85 : 0);
    g.traverse(m => {
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const nm = mats.map(mt => {
        if (o.mat) return o.mat;
        const c = mt.clone(); if (ds && c.map) c.map = desatTex(c.map, ds);
        if (o.tint) c.color = new THREE.Color(o.tint);
        if (o.dark) c.color.multiplyScalar(o.dark);
        if (o.emissive) { c.emissive = new THREE.Color(o.emissive); c.emissiveIntensity = o.emissiveIntensity ?? 1; c.emissiveMap = c.map; }
        if (o.rough != null) c.roughness = o.rough; if (o.metal != null) c.metalness = o.metal;
        return c;
      });
      m.material = Array.isArray(m.material) ? nm : nm[0];
    });
  }
  const s = o.scale ?? 1; if (Array.isArray(s)) g.scale.set(...s); else g.scale.setScalar(s);
  return g;
}

// ---------------- character skins ----------------
// Atlas regions (1024² Kenney "blocky" texture, image pixel coords)
const R = { head: [0, 0, 512, 384], face: [128, 128, 128, 128], torso: [0, 688, 448, 336], arms: [480, 534, 544, 234], legs: [480, 800, 544, 224] };
const hex = c => { const v = new THREE.Color(c); return [v.r * 255, v.g * 255, v.b * 255].map(Math.round); };
const isBg = (d, i) => Math.abs(d[i] - 31) < 6 && Math.abs(d[i + 1] - 31) < 6 && Math.abs(d[i + 2] - 36) < 7;
// recolor keeping the source shading/details: out = col * (L / Lmedian)^k
function recolor(g, [x, y, w, h], col, k = .85, keepBg = true) {
  const id = g.getImageData(x, y, w, h), d = id.data, Ls = [];
  for (let i = 0; i < d.length; i += 16) if (!isBg(d, i)) Ls.push(.3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2]);
  Ls.sort((a, b) => a - b); const Lm = Math.max(20, Ls[Ls.length >> 1] || 128); const c = hex(col);
  for (let i = 0; i < d.length; i += 4) { if (keepBg && isBg(d, i)) continue; const L = .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2]; const f = Math.min(1.5, Math.max(.45, Math.pow(L / Lm, k))); d[i] = Math.min(255, c[0] * f); d[i + 1] = Math.min(255, c[1] * f); d[i + 2] = Math.min(255, c[2] * f); }
  g.putImageData(id, x, y);
}
function flat(g, [x, y, w, h], col, noise = 10) {
  g.fillStyle = col; g.fillRect(x, y, w, h);
  for (let i = 0; i < w * h / 90; i++) { g.fillStyle = Math.random() > .5 ? `rgba(255,255,255,${noise / 400})` : `rgba(0,0,0,${noise / 300})`; g.fillRect(x + Math.random() * w, y + Math.random() * h, 3, 3); }
}
function stripes(g, [x, y, w, h], col, step = 14, th = 6) { g.fillStyle = col; for (let yy = y + 4; yy < y + h; yy += step) g.fillRect(x, yy, w, th); }
function stain(g, [x, y, w, h], n, col = 'rgba(70,8,6,.75)') { for (let i = 0; i < n; i++) { g.fillStyle = col; g.beginPath(); g.arc(x + Math.random() * w, y + Math.random() * h, 4 + Math.random() * 14, 0, 7); g.fill(); } }

// build the atlas canvas for one character (o = look; o.model = {src, keepHead, ...})
function skinCanvas(o) {
  const M = o.model, src = M.src, img = IMG[src];
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d', { willReadFrequently: true });
  if (img) g.drawImage(img, 0, 0, 1024, 1024);
  if (M.raw) return c;
  const skin = o.skin || '#e8c39e';
  if (!M.keepHead) flat(g, R.head, skin, 8);
  else if (M.eraseFace !== false) { // keep painted hair, wipe painted eyes/mouth so the animated face decal can sit on top
    const fy = M.hairline ?? 150; flat(g, [130, fy, 124, 252 - fy], skin, 6); flat(g, [0, Math.max(fy, 140), 128, 116 - Math.max(0, fy - 140)], skin, 0);
    if (M.headTint) recolor(g, R.head, M.headTint, .9);
  }
  if (M.keepHead && M.skinHead) recolor(g, R.head, skin, .9);
  const sl = o.sleeve ?? .9;
  if (o.shirt && !M.keepTorso) recolor(g, R.torso, o.shirt, M.k ?? .85);
  if (o.shirtKind === 'stripes') { stripes(g, [0, 784, 448, 144], o.stripe || '#1c3d8a'); }
  if (o.vest) { const v = o.vest; recolor(g, [0, 784, 96, 144], v, .7); recolor(g, [224, 784, 224, 144], v, .7); recolor(g, [96, 784, 34, 144], v, .7); recolor(g, [190, 784, 34, 144], v, .7); recolor(g, [96, 688, 128, 96], v, .7); }
  if (o.coat) { recolor(g, R.torso, o.coat, .6); g.fillStyle = o.shirt || '#9fb4c8'; g.fillRect(146, 784, 28, 70); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(159, 784, 2, 144); g.fillRect(110, 860, 30, 3); }
  // arms: sleeve rows then hand skin
  const ay = 598, ah = 126, sy = ay + Math.round(ah * Math.min(1, sl));
  if (o.shirt) recolor(g, [480, ay, 544, sy - ay], o.coat || o.shirt, .8);
  if (o.shirtKind === 'stripes' && sl > .5) stripes(g, [480, ay, 544, sy - ay], o.stripe || '#1c3d8a');
  if (o.shirt) for (const x of [480, 768]) recolor(g, [x, 534, 64, 64], o.coat || o.shirt, .8);
  flat(g, [480, sy, 544, 768 - sy], skin, 6); flat(g, [544, 534, 64, 64], skin, 6); flat(g, [832, 534, 64, 64], skin, 6);
  // legs: pants then shoes
  if (o.pants) recolor(g, [480, 864, 544, 120], o.pants, .8);
  if (o.shoe) { flat(g, [480, 984, 544, 40], o.shoe, 8); flat(g, [544, 800, 64, 64], o.shoe, 6); flat(g, [832, 800, 64, 64], o.shoe, 6); }
  if (o.zombie || M.grime) { stain(g, R.torso, 14 * (o.torn || 1), 'rgba(60,70,30,.35)'); stain(g, R.torso, 8 * (o.torn || 1)); stain(g, [480, 598, 544, 160], 10); stain(g, [480, 864, 544, 120], 8, 'rgba(50,40,25,.5)'); }
  if (M.blood) stain(g, R.torso, M.blood);
  if (M.paint) M.paint(g);
  return c;
}

// fit a part geometry into a w×h×d box centred on the origin
function fitGeo(geo, w, h, d) {
  const G = geo.clone(); G.computeBoundingBox(); const b = G.boundingBox, s = new THREE.Vector3(), ctr = new THREE.Vector3(); b.getSize(s); b.getCenter(ctr);
  G.translate(-ctr.x, -ctr.y, -ctr.z); G.scale(w / s.x, h / s.y, d / s.z); G.clearGroups(); G.computeBoundingBox(); G.computeBoundingSphere(); return G;
}
const PART_DIM = { torso: [2, 2, 1], 'leg-left': [.98, 2, .98], 'leg-right': [.98, 2, .98], 'arm-left': [.98, 2, .98], 'arm-right': [.98, 2, .98], head: [1.3, 1.25, 1.2] };

// replace the procedural body meshes of a makeChar() character with model geometry + skinned atlas
export function applyModel(ch, o) {
  const M = o.model; const P = PARTS[M.src]; if (!P) { console.warn('no parts', M.src); return; }
  const t = new THREE.CanvasTexture(skinCanvas(o)); t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: M.rough ?? .78, metalness: 0 });
  if (M.emissive) { mat.emissive = new THREE.Color(M.emissive); mat.emissiveMap = t; mat.emissiveIntensity = M.emissiveIntensity ?? .4; }
  ch.modelMat = mat;
  const put = (mesh, key, scl) => { if (!mesh || !P[key]) return; let [w, h, d] = PART_DIM[key]; if (scl) { w *= scl[0]; h *= scl[1]; d *= scl[2]; } mesh.geometry = fitGeo(P[key], w, h, d); mesh.material = mat; mesh.castShadow = mesh.receiveShadow = true; };
  put(ch.torso, 'torso');
  put(ch.legL.children[0], 'leg-left'); put(ch.legR.children[0], 'leg-right');
  put(ch.armL.children[0], 'arm-left', o.armScale ? [o.armScale, 1.08, o.armScale] : null); put(ch.armR.children[0], 'arm-right', o.armScale ? [o.armScale, 1.08, o.armScale] : null);
  if (o.armScale) for (const a of [ch.armL, ch.armR]) a.children[0].scale.set(1, 1, 1);
  if (ch.hm) { put(ch.hm, 'head', M.headScale); }
  if (ch.neck) ch.neck.visible = false;
  if (M.noFace && ch.faceMesh) ch.faceMesh.visible = false;
}
