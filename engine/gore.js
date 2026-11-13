// Fire, explosions, blood sprays and dismemberment. Everything is a pure function of t (chunked renders stay consistent).
import * as THREE from 'three';
import { rbox } from './lib.js';

const S = Math.sin, G = 24;
const hash = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
let flameTex, smokeTex, sparkTex;
function radial(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2); for (const [p, col] of stops) gr.addColorStop(p, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texes() {
  if (flameTex) return;
  flameTex = radial([[0, 'rgba(255,250,220,1)'], [.25, 'rgba(255,200,90,.95)'], [.55, 'rgba(255,90,20,.55)'], [1, 'rgba(120,20,0,0)']]);
  smokeTex = radial([[0, 'rgba(40,38,36,.8)'], [.6, 'rgba(30,28,27,.4)'], [1, 'rgba(20,20,20,0)']]);
  sparkTex = radial([[0, 'rgba(255,255,230,1)'], [.4, 'rgba(255,190,80,.8)'], [1, 'rgba(255,120,20,0)']], 32);
}

const tintCache = {};
function hexA(h, a, k = 1) { const n = parseInt(h.slice(1), 16); return `rgba(${Math.round((n >> 16 & 255) * k)},${Math.round((n >> 8 & 255) * k)},${Math.round((n & 255) * k)},${a})`; }
// ---------------- fire ----------------
// makeFire(scale, {smoke, light, n}) -> Group with userData.update(t, k) (k = intensity 0..1)
export function makeFire(scale = 1, o = {}) {
  texes();
  const g = new THREE.Group(), n = o.n || 16, m = o.smoke === false ? 0 : (o.nSmoke || 10);
  const fl = [], sm = [];
  // tint: gas cloud colour (e.g. '#7cff3a') -> green glow + coloured smoke
  const fT = o.tint ? (tintCache[o.tint] ||= [radial([[0, 'rgba(240,255,220,1)'], [.3, hexA(o.tint, .9)], [.65, hexA(o.tint, .4)], [1, hexA(o.tint, 0)]]), radial([[0, hexA(o.tint, .75, .55)], [.6, hexA(o.tint, .4, .45)], [1, hexA(o.tint, 0, .4)]])]) : null;
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fT ? fT[0] : flameTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); g.add(s); fl.push(s); }
  for (let i = 0; i < m; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fT ? fT[1] : smokeTex, transparent: true, depthWrite: false, opacity: .6 })); g.add(s); sm.push(s); }
  const L = o.light === false ? null : new THREE.PointLight(o.color || '#ff7a2a', (o.intensity ?? 60) * scale, 18 * scale, 1.5);
  if (L) { L.position.y = 1.5 * scale; g.add(L); }
  g.userData.update = (t, k = 1) => {
    for (let i = 0; i < n; i++) {
      const r = .7 + hash(i, 1) * .8, ph = (t * r * 1.3 + hash(i, 2)) % 1, a = hash(i, 3) * 6.28, rad = (.25 + hash(i, 4) * .6) * scale * (1 - ph * .6);
      const s = fl[i]; s.position.set(Math.cos(a) * rad + S(t * 7 + i) * .08 * scale, ph * 2.8 * scale * (o.tall || 1), Math.sin(a) * rad);
      s.scale.setScalar(((1 - ph) * 1.6 + .25) * scale * k); s.material.opacity = S(ph * Math.PI) * (.85 + .15 * S(t * 31 + i)) * Math.min(1, k * 1.5);
    }
    for (let i = 0; i < m; i++) {
      const ph = (t * (.18 + hash(i, 5) * .12) + hash(i, 6)) % 1, a = hash(i, 7) * 6.28;
      const s = sm[i]; s.position.set(Math.cos(a) * .5 * scale + ph * 2.4 * scale * (o.wind ?? .6), 2 * scale + ph * 9 * scale, Math.sin(a) * .5 * scale);
      s.scale.setScalar((1.2 + ph * 5) * scale); s.material.opacity = S(ph * Math.PI) * .55 * Math.min(1, k * 1.5);
    }
    if (L) L.intensity = (o.intensity ?? 60) * scale * k * (.8 + .14 * S(t * 23) + .08 * S(t * 37.3));
  };
  return g;
}
// explosion fireball: a fire that blooms then dies over `life` seconds
export function fireK(e, t) {
  if (t < e.t) return 0; if (e.until != null && t >= e.until) return 0;
  if (!e.life) return Math.min(1, (t - e.t) / .25);
  const k = (t - e.t) / e.life; if (k >= 1) return 0;
  return k < .12 ? k / .12 * 1.8 : 1.8 * Math.pow(1 - (k - .12) / .88, 1.4);
}

// ---------------- blood particles ----------------
// pool of instanced droplets shared by all sprays in a scene
export function makeBloodPool(scene, max = 700, col) {
  const geo = new THREE.SphereGeometry(.05, 8, 6);
  const mat = col ? new THREE.MeshStandardMaterial({ color: col, roughness: .2, metalness: 0, emissive: col, emissiveIntensity: .9 }) : new THREE.MeshStandardMaterial({ color: '#5a0000', roughness: .15, metalness: .05, emissive: '#140000' });
  const im = new THREE.InstancedMesh(geo, mat, max); im.count = 0; im.frustumCulled = false; scene.add(im);
  const sparkM = new THREE.SpriteMaterial({ map: (texes(), sparkTex), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const sparks = Array.from({ length: 120 }, () => { const s = new THREE.Sprite(sparkM.clone()); s.userData.c0 = sparkM.color.clone(); s.userData.m0 = sparkM.map; s.visible = false; scene.add(s); return s; });
  return { im, max, m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), sc: new THREE.Vector3(), sparks };
}
// source: { t0, dur, n, seed, origin(ti)->[x,y,z], dir:[x,y,z], speed, spread, ground, size }
const _vd = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
export function drawSprays(pool, sources, t) {
  let c = 0; const { im, m4, q, e, v, sc } = pool;
  for (const src of sources) {
    if (t < src.t0) continue;
    const n = src.n || 30, dur = src.dur ?? .4, sp = src.speed ?? 7, spr = src.spread ?? .5, d = src.dir || [0, 1, 0];
    for (let i = 0; i < n && c < pool.max; i++) {
      const ti = src.t0 + dur * (i / n) + hash(i, src.seed) * .03; if (t < ti) continue;
      const age = t - ti; if (age > 2.2) continue;
      const o = src.origin(ti);
      const s = sp * (.45 + hash(i, src.seed + 1) * .8);
      const vx = (d[0] + (hash(i, src.seed + 2) - .5) * 2 * spr) * s, vy = (d[1] + (hash(i, src.seed + 3) - .5) * 2 * spr) * s, vz = (d[2] + (hash(i, src.seed + 4) - .5) * 2 * spr) * s;
      const y = o[1] + vy * age - .5 * G * age * age; if (y < (src.ground ?? 0) + .02) continue;
      v.set(o[0] + vx * age, y, o[2] + vz * age);
      // droplets stretch along their velocity (streaks), small ones dominate
      const k = (src.size || 1) * (.35 + Math.pow(hash(i, src.seed + 5), 2) * .9), vyy = vy - G * age, sp2 = Math.hypot(vx, vyy, vz);
      if (sp2 > .01) { _vd.set(vx / sp2, vyy / sp2, vz / sp2); q.setFromUnitVectors(_up, _vd); } else q.identity();
      sc.set(k * .5, k * (1 + Math.min(4.5, sp2 * .4)), k * .5);
      m4.compose(v, q, sc); im.setMatrixAt(c++, m4);
    }
  }
  im.count = c; im.instanceMatrix.needsUpdate = true;
}
// white (tintable) spark texture
let _ws = null;
function whiteSpark() { if (_ws) return _ws; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _ws = new THREE.CanvasTexture(c); _ws.colorSpace = THREE.SRGBColorSpace; return _ws; }
// muzzle / impact sparks
export function drawSparks(pool, list, t) {
  let c = 0; for (const s of pool.sparks) s.visible = false;
  for (const src of list) {
    if (t < src.t0 || t > src.t0 + 1) continue;
    for (let i = 0; i < (src.n || 10) && c < pool.sparks.length; i++) {
      const age = t - src.t0 - hash(i, 9) * .05; if (age < 0 || age > .45) continue;
      const a = hash(i, 10) * 6.28, up = hash(i, 11), sp = 5 + hash(i, 12) * 6; const o = src.at;
      const s = pool.sparks[c++]; s.visible = true; s.position.set(o[0] + Math.cos(a) * sp * age, o[1] + (up * 4) * age - 12 * age * age, o[2] + Math.sin(a) * sp * age); s.scale.setScalar((src.size || .35) * (1 - age / .45)); s.material.opacity = 1; if (src.color) { s.material.color.set(src.color); s.material.map = whiteSpark(); } else { s.material.color.copy(s.userData.c0); s.material.map = s.userData.m0 || (s.userData.m0 = s.material.map); }
    }
  }
}

// ---------------- dismemberment ----------------
export const JOINT = { armL: [1.5, 3.85, 0], armR: [-1.5, 3.85, 0], legL: [.5, 2, 0], legR: [-.5, 2, 0], head: [0, 4.0, 0], forearmL: [1.5, 2.95, 0], forearmR: [-1.5, 2.95, 0], handL: [1.5, 2.1, 0], handR: [-1.5, 2.1, 0], shinL: [.5, 1.05, 0], shinR: [-.5, 1.05, 0] };
export const SPRAY_DIR = { armL: [1, .9, 0], armR: [-1, .9, 0], legL: [.3, -.2, .5], legR: [-.3, -.2, .5], head: [0, 1.6, 0], forearmL: [.8, .4, .5], forearmR: [-.8, .4, .5], handL: [.6, .2, .6], handR: [-.6, .2, .6], shinL: [.3, -.1, .6], shinR: [-.3, -.1, .6] };
export function localToWorld(s, sc, l) { const c = Math.cos(s.rot), sn = Math.sin(s.rot), x = l[0] * sc[0], y = l[1] * sc[1], z = l[2] * sc[2]; return [s.pos[0] + x * c + z * sn, s.pos[1] + y + (s.pose?.y || 0), s.pos[2] - x * sn + z * c]; }
export function dirToWorld(s, d) { const c = Math.cos(s.rot), sn = Math.sin(s.rot); return [d[0] * c + d[2] * sn, d[1], -d[0] * sn + d[2] * c]; }
// stump caps glued to the body where the part used to be
export function stumpMesh(part) {
  const red = new THREE.MeshStandardMaterial({ color: '#5a0505', roughness: .3, emissive: '#1a0000' }), bone = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: .5 });
  const g = new THREE.Group();
  if (part === 'head') { const n = new THREE.Mesh(new THREE.CylinderGeometry(.36, .4, .22, 14), red); n.position.y = 4.08; g.add(n); const b = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .3, 8), bone); b.position.y = 4.2; g.add(b); for (let i = 0; i < 4; i++) { const d = rbox(.12, .3 + i * .1, .12, red, .05, 1); d.position.set(-.3 + i * .2, 3.9, .45); g.add(d); } }
  else if (part.startsWith('arm')) { const x = part === 'armL' ? 1.02 : -1.02; const p = rbox(.1, .95, .95, red, .04, 1); p.position.set(x, 3.4, 0); g.add(p); const b = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .3, 8), bone); b.rotation.z = Math.PI / 2; b.position.set(x * 1.08, 3.5, 0); g.add(b); }
  else { const x = part === 'legL' ? .5 : -.5; const p = rbox(.95, .1, .95, red, .04, 1); p.position.set(x, 1.96, 0); g.add(p); const b = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .35, 8), bone); b.position.set(x, 1.85, 0); g.add(b); }
  return g;
}
// ballistic flight of a severed part: returns {pos, rot, landed, tl}
export function limbFlight(p0, v, ground, spin, dt) {
  const a = .5 * G, b = -v[1], c = ground - p0[1];
  const tl = (v[1] + Math.sqrt(Math.max(0, v[1] * v[1] + 2 * G * (p0[1] - ground)))) / G;
  const tt = Math.min(dt, tl); const pos = [p0[0] + v[0] * tt, p0[1] + v[1] * tt - a * tt * tt, p0[2] + v[2] * tt];
  if (dt >= tl) { const sl = Math.min(dt - tl, .35), f = sl - sl * sl / .7; pos[0] += v[0] * .25 * f; pos[2] += v[2] * .25 * f; pos[1] = ground; }
  return { pos, landed: dt >= tl, tl, rot: spin * tt };
}
