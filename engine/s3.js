// Season-3 helpers: Poly Haven CC0 props, gore organs, CRT TV playing a pre-rendered tape, reach IK for the proxy rig.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeOrgans } from './gore2.js';

// ---------------- Poly Haven models ----------------
export const PH_LIST = []; // LITE: no downloaded Poly Haven props
export const PH = {};
export const M_PER_U = 1 / 3.2; // hero 5.3u ≈ 1.65 m
export async function preloadPH(list = PH_LIST) {
  const L = new GLTFLoader();
  await Promise.all([...new Set(list.filter(Boolean))].map(async k => {
    if (PH[k]) return;
    try {
      const key = String(k).replace(/\\/g, '/').replace(/^\/+/, '');
      if (/(^|\/)\.\.?(\/|$)/.test(key) || /[:?#]/.test(key)) throw new Error('invalid local model path');
      const url = key.startsWith('assets/') ? '/' + key : `/assets/props/${key}${/\.gltf?$|\.glb$/i.test(key) ? '' : '.glb'}`;
      const g = await L.loadAsync(url); const s = g.scene;
      s.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) if (m) for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (m[t]) m[t].anisotropy = 4; } });
      s.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(s); s.userData.box = b; PH[k] = s;
    } catch (e) { console.warn('Не загружен реквизит', k, e.message); }
  }));
}
// clone a Poly Haven model in studio units; o: { scale (extra), tint, dark, rough, emissive }
export function ph(key, o = {}) {
  const T = PH[key]; if (!T) { console.warn('no ph', key); return new THREE.Group(); }
  const g = T.clone(true); g.userData.phKey = key; const k = 3.2 * (o.scale ?? 1); g.scale.setScalar(k);
  if (o.tint || o.dark || o.rough != null || o.dirt) g.traverse(m => {
    if (!m.isMesh) return; const c = m.material.clone();
    if (o.tint) c.color = new THREE.Color(o.tint); if (o.dark) c.color.multiplyScalar(o.dark); if (o.rough != null) c.roughness = o.rough;
    m.material = c;
  });
  const w = new THREE.Group(); w.add(g); w.userData.size = T.userData.box.getSize(new THREE.Vector3()).multiplyScalar(k); return w;
}

// ---------------- organs (16+) ----------------
let organMat, ribMat;
function mats() {
  organMat ||= new THREE.MeshPhysicalMaterial({ color: '#7c2522', roughness: .3, clearcoat: 1, clearcoatRoughness: .2, sheen: .35, sheenColor: new THREE.Color('#d08070'), emissive: '#100000', emissiveIntensity: .2 });
  ribMat ||= new THREE.MeshPhysicalMaterial({ color: '#8a5a50', roughness: .4, clearcoat: .8 });
  return { organMat, ribMat };
}
// guts hanging from a torn torso: returns { grp, update(k, t) } (k = spill progress 0..1). Attach grp to the proxy torso.
export function makeGuts(seed, options = {}) { return makeOrgans(seed, options); }
// Self-contained TV cabinet. An optional imported model may be used instead.
export function makeTelevision() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.3, .82), new THREE.MeshStandardMaterial({ color: '#383a36', roughness: .66, metalness: .18 })); shell.position.y = 1.5; shell.castShadow = shell.receiveShadow = true; g.add(shell);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.85, .16, 1), new THREE.MeshStandardMaterial({ color: '#202622', roughness: .75 })); stand.position.y = .85; g.add(stand);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#d8d3b9', metalness: .7, roughness: .3 })); knob.position.set(.68, 1.1, .44); g.add(knob);
  return g;
}
export function makeCRT(w = 1.0, h = .75) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1, 1, 1) }); const glow = (k) => mat.color.setScalar(k);
  const geo = new THREE.PlaneGeometry(w, h, 12, 9); // slight bulge
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / w, y = p.getY(i) / h; p.setZ(i, (1 - (x * x + y * y) * 2) * .04 * w); } geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  let lastKey = '';
  // mode: 'off' | 'static' | 'tape' ; tt = tape time
  const draw = (mode, feed, tt, t, seed = 1) => {
    const key = mode + ':' + (mode === 'tape' ? Math.floor(tt * (feed?.fps || 12)) : Math.floor(t * 24)); if (key === lastKey) return; lastKey = key;
    const W = 320, H = 240;
    if (mode === 'off') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); glow(0); tex.needsUpdate = true; return; }
    glow(mode === 'tape' ? (feed?.glow ?? 1.25) : .8);
    const rnd = (i) => { const x = Math.sin(i * 12.9898 + Math.floor(t * 24) * 78.233 + seed) * 43758.5453; return x - Math.floor(x); };
    if (mode === 'tape' && feed && feed.imgs.length) {
      const i = Math.min(feed.imgs.length - 1, Math.max(0, Math.floor(tt * feed.fps)));
      // tracking wobble: horizontal line offsets
      const im = feed.imgs[i]; g.filter = `brightness(${feed.bright ?? 1.6}) contrast(1.08)`;
      for (let y = 0; y < H; y += 8) { const off = (rnd(y) - .5) * 3 + (Math.abs(((tt * 40) % H) - y) < 10 ? 9 : 0); g.drawImage(im, 0, y * im.height / H, im.width, 8 * im.height / H, off, y, W, 8); }
      // chroma bleed
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = .12; g.drawImage(im, 2, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    } else { // static snow
      const id = g.createImageData(W, H), d = id.data; let s = Math.floor(t * 24) * 7919 + 1;
      for (let k = 0; k < d.length; k += 4) { s = (s * 16807) % 2147483647; const v = (s & 255); d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
      g.putImageData(id, 0, 0);
    }
    // scanlines + vignette
    g.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    const gr = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .85); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    tex.needsUpdate = true;
  };
  return { mesh, mat, draw };
}
export async function loadFeed(dir, fps) {
  const imgs = [], lum = [];
  for (let i = 0; ; i++) {
    const r = await fetch(`/${dir}/f${String(i).padStart(4, '0')}.jpg`); if (!r.ok) break;
    const fk = window._opts?.feedScale || 1, bl = await r.blob(); const b = fk < 1 ? await createImageBitmap(bl, { resizeWidth: Math.round(320 * fk), resizeHeight: Math.round(240 * fk) }) : await createImageBitmap(bl); imgs.push(b);
    const c = document.createElement('canvas'); c.width = 8; c.height = 6; const g = c.getContext('2d'); g.drawImage(b, 0, 0, 8, 6); const d = g.getImageData(0, 0, 8, 6).data; let s = 0; for (let k = 0; k < d.length; k += 4) s += d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11; lum.push(s / 48 / 255);
  }
  return { imgs, fps, lum };
}

// ---------------- reach IK (proxy rig arms point at a world target) ----------------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();
export function reachArm(arm, target, w) {
  if (w <= 0) return; arm.updateMatrixWorld(true);
  const sp = arm.getWorldPosition(new THREE.Vector3()); const dir = target.clone().sub(sp).normalize();
  const pq = arm.parent.getWorldQuaternion(_q2); const local = dir.applyQuaternion(pq.clone().invert());
  const q = _q.setFromUnitVectors(new THREE.Vector3(0, -1, 0), local);
  arm.quaternion.slerp(q, Math.min(1, w));
}

// ---------------- neck stump (head blown off) ----------------
export function makeStump(size = .5) {
  const g = new THREE.Group();
  const meat = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#5a0c0a', roughness: .25, clearcoat: 1 }));
  meat.scale.y = .35; g.add(meat);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(size * .16, size * .2, size * .5, 8), new THREE.MeshStandardMaterial({ color: '#c8b8a0', roughness: .5 }));
  spine.position.set(0, size * .1, -size * .15); g.add(spine);
  const tube = new THREE.Mesh(new THREE.TorusGeometry(size * .14, size * .05, 6, 10), new THREE.MeshPhysicalMaterial({ color: '#8a2a28', roughness: .3, clearcoat: 1 }));
  tube.rotation.x = Math.PI / 2; tube.position.set(size * .05, size * .14, size * .2); g.add(tube);
  return g;
}
