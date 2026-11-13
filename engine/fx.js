// Horror toolkit: PBR textures (ambientCG), film/night-vision post pass, flashlights with beams,
// blood decals that spread over time, wounds that soak clothes, bandages that bleed through, drips.
import * as THREE from 'three';
import { canvas, tex, mulberry32, clamp, smooth, easeOut, rbox, std, cyl } from './lib.js';

// ---------------- PBR textures ----------------
const TEX = {};
export const TEX_NAMES = ['concrete', 'planks', 'rmetal', 'tiles']; // LITE: only the PBR sets used by built-in props
// extra texture sets are loaded only when a location asks for them (meta.set.tex) — keeps VRAM low on weak PCs
export const TEX_EXTRA = [];
export async function preloadTex(extra = []) {
  const L = new THREE.TextureLoader();
  await Promise.all([...TEX_NAMES, ...extra.filter(n => TEX_EXTRA.includes(n))].flatMap(n => ['c', 'n', 'r'].map(async s => {
    let t; try { t = await L.loadAsync(`/assets/tex/${n}_${s}.jpg`); } catch (e) { console.warn('texture missing', n, s); t = new THREE.DataTexture(new Uint8Array(s === 'n' ? [128, 128, 255, 255] : [190, 190, 190, 255]), 1, 1); t.needsUpdate = true; }
    if (s === 'c') t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; TEX[n + '_' + s] = t;
  })));
}
// pbr('tiles', [4,4], {color, ns, rough, metal})
export function pbr(name, rep = [1, 1], o = {}) {
  const k = s => { const t = TEX[name + '_' + s].clone(); t.repeat.set(rep[0], rep[1]); if (o.rot) t.rotation = o.rot; t.needsUpdate = true; return t; };
  return new THREE.MeshStandardMaterial({ map: k('c'), normalMap: k('n'), roughnessMap: k('r'), roughness: o.rough ?? 1, metalness: o.metal ?? 0, color: o.color || '#ffffff', normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1), ...(o.extra || {}) });
}

// ---------------- film / night vision pass ----------------
export const FilmShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, uw: { value: 0 }, grain: { value: .07 }, vig: { value: .55 }, ca: { value: .012 }, nv: { value: 0 }, sat: { value: .78 }, contrast: { value: 1.08 }, lift: { value: -.012 }, tint: { value: new THREE.Vector3(.96, 1.0, 1.04) }, flick: { value: 1 }, res: { value: new THREE.Vector2(810, 1440) }, blackT: { value: 0 }, red: { value: 0 }, fish: { value: 0 }, sharp: { value: 0 }, dirt: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uw; uniform float time, grain, vig, ca, nv, sat, contrast, lift, flick, blackT, red, fish, sharp, dirt; uniform vec3 tint; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33 + time * 7.0); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec2 uv = vUv, d = uv - .5;
      if (fish > 0.) { vec2 q = d * vec2(res.x / res.y, 1.) * 2.; float rr = dot(q, q); float rm = dot(vec2(res.x / res.y, 1.), vec2(res.x / res.y, 1.));
        d *= (1. + fish * rr) / (1. + fish * rm); uv = .5 + d; }
      // underwater: refraction wobble (sampled below)
      if (uw > 0.) { uv += uw * vec2(sin(uv.y * 23. + time * 3.1) * .006 + sin(uv.y * 7. - time * 1.7) * .01, cos(uv.x * 19. + time * 2.6) * .006); d = uv - .5; }
      float r2 = dot(d * vec2(1., 1.78), d * vec2(1., 1.78));
      float cab = ca * (1. + nv * 1.5);
      vec3 col = vec3(texture2D(tDiffuse, uv - d * cab * r2).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv + d * cab * r2).b);
      if (sharp > 0.) { vec2 px = 1. / res; vec3 bl = (texture2D(tDiffuse, uv + vec2(px.x, 0.)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.)).rgb + texture2D(tDiffuse, uv + vec2(0., px.y)).rgb + texture2D(tDiffuse, uv - vec2(0., px.y)).rgb) * .25;
        col += (col - bl) * sharp; col = max(col, 0.); }
      float l = dot(col, vec3(.299, .587, .114));
      col = mix(vec3(l), col, sat);
      col = (col - .5) * contrast + .5 + lift;
      col *= tint;
      col = mix(col, col * vec3(1.25, .55, .5), red);
      if (nv > 0.) {
        float L = dot(texture2D(tDiffuse, uv).rgb, vec3(.3, .59, .11));
        L = pow(clamp(L * 2.4 + .05, 0., 1.), .62);
        float n = hash(floor(uv * res * .5) + floor(time * 24.) * 1.7) - .5;
        vec3 g = vec3(.36, 1.0, .42) * L + n * .2;
        g *= .9 + .1 * sin(uv.y * res.y * 1.1);
        float cv = smoothstep(.95, .45, length(d * vec2(1., 1.78) * 1.25));
        g *= mix(.15, 1., cv);
        col = mix(col, g, nv);
      }
      if (uw > 0.) { vec2 px = 3. / res; vec3 bl = (texture2D(tDiffuse, uv + px).rgb + texture2D(tDiffuse, uv - px).rgb + texture2D(tDiffuse, uv + vec2(px.x, -px.y)).rgb + texture2D(tDiffuse, uv + vec2(-px.x, px.y)).rgb) * .25;
        float ll = dot(bl, vec3(.3, .59, .11)); vec3 murk = vec3(.16, .2, .11) * (.35 + ll * 1.6) + vec3(.25, .02, .01) * smoothstep(.25, .6, bl.r - bl.g);
        float caust = pow(max(0., sin(uv.x * 40. + time * 2.) * sin(uv.y * 31. - time * 1.6)), 6.) * .08;
        col = mix(col, col * vec3(.6, .85, .7) * 1.3 + murk * .5 + caust, uw * .85); col *= mix(1., smoothstep(.9, .15, length(d * vec2(1., 1.6))), uw); }
      col *= mix(1., smoothstep(1.05, .22, length(d * vec2(1.05, 1.5))), vig);
      float gr = hash(uv * res + fract(time * 13.37) * 311.) - .5;
      col += gr * grain * (1.15 - l * .6);
      if (dirt > 0.) { vec2 g2 = floor(uv * vec2(9., 16.)); float sm = 0.; for (int i = 0; i < 5; i++) { vec2 c = vec2(fract(sin(float(i) * 12.9898) * 43758.5), fract(sin(float(i) * 78.233) * 12345.6)); vec2 dd = (uv - c) * vec2(res.x / res.y, 1.); sm += smoothstep(.09 + .05 * fract(c.x * 7.), 0., length(dd)) * (.4 + .6 * fract(c.y * 13.)); }
        col = col * (1. - sm * dirt * .25) + sm * dirt * .12 * l; }
      // digital sensor: noisy chroma in the dark, hard highlight clip
      if (sharp > 0.) { float cn = hash(uv * res * .5 + 17.) - .5; col += vec3(cn, -cn * .6, cn * .4) * grain * .35 * (1. - l); }
      col *= flick * (1. - blackT);
      gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
    }`,
};

// ---------------- light beams + flashlight ----------------
let beamTex;
function beamTexture() {
  if (beamTex) return beamTex;
  const c = canvas(4, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.1, 'rgba(255,255,255,.75)'); gr.addColorStop(.45, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); beamTex = tex(c, { srgb: false }); return beamTex;
}
// cone with apex at origin pointing along -y
export function beamMesh(len = 14, rad = 3.2, color = '#fff2d8', op = .1) {
  const geo = new THREE.CylinderGeometry(.12, rad, len, 28, 1, true); geo.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, alphaMap: beamTexture(), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.renderOrder = 5; m.castShadow = m.receiveShadow = false; m.userData.beam = true; return m;
}
let glowTex;
export function glowSprite(color = '#fff2d8', size = 1.2, op = .9) {
  if (!glowTex) { const c = canvas(128, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); glowTex = tex(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.scale.setScalar(size); s.renderOrder = 6; return s;
}
// hand prop: beam points along the arm (-y)
export function flashlight(shadow = true, o = {}) {
  const g = new THREE.Group();
  const body = cyl(.11, .1, .9, std('#16181b', .45, { metalness: .6 }), 12); body.position.y = -.35; g.add(body);
  const head = cyl(.2, .13, .3, std('#202328', .35, { metalness: .7 }), 16); head.position.y = -.9; g.add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.17, 20), new THREE.MeshBasicMaterial({ color: '#fffbe8' })); lens.position.y = -1.06; lens.rotation.x = Math.PI / 2; g.add(lens);
  const spot = new THREE.SpotLight(o.color || '#fff1d6', o.intensity ?? 420, o.dist ?? 46, o.angle ?? .42, .55, 1.5);
  spot.position.set(0, -1.08, 0); const tgt = new THREE.Object3D(); tgt.position.set(0, -12, 0); g.add(tgt); spot.target = tgt; g.add(spot);
  if (shadow) { spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0006; spot.shadow.normalBias = .04; spot.shadow.camera.near = .5; spot.shadow.camera.far = 46; }
  const beam = beamMesh(o.beamLen ?? 15, o.beamRad ?? 5.2, o.color || '#fff1d6', o.beamOp ?? .035); beam.position.y = -1.06; g.add(beam);
  const glow = glowSprite(o.color || '#fff4dc', .55, .6); glow.position.y = -1.12; g.add(glow);
  g.userData.light = spot; return g;
}

// ---------------- blood ----------------
const BLOOD = '#5c0303';
function fieldTex(w, h, fn, seed) {
  const R = mulberry32(seed), c = canvas(w, h), g = c.getContext('2d'), id = g.createImageData(w, h), d = id.data;
  // value noise
  const N = 24, grid = Array.from({ length: (N + 1) * (N + 1) }, () => R());
  const vn = (x, y) => { x *= N; y *= N; const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = k => k * k * (3 - 2 * k); const a = grid[(yi % N) * (N + 1) + (xi % N)], b = grid[(yi % N) * (N + 1) + (xi % N) + 1], cc = grid[((yi + 1) % N) * (N + 1) + (xi % N)], dd = grid[((yi + 1) % N) * (N + 1) + (xi % N) + 1]; return a + (b - a) * s(xf) + (cc - a) * s(yf) + (a - b - cc + dd) * s(xf) * s(yf); };
  const noise = (x, y) => vn(x, y) * .6 + vn(x * 2.1 + .3, y * 2.1 + .7) * .3 + vn(x * 4.3, y * 4.3) * .1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = clamp(fn(x / w, y / h, noise, R)); const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v * 255; d[i + 3] = 255; }
  g.putImageData(id, 0, 0); const t = tex(c, { srgb: false }); return t;
}
function bloodColorTex(seed) {
  const c = canvas(128, 128), g = c.getContext('2d'); const R = mulberry32(seed);
  g.fillStyle = '#7a0a08'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${30 + R() * 40 | 0},0,0,${.15 + R() * .3})`; g.beginPath(); g.arc(R() * 128, R() * 128, 4 + R() * 18, 0, 7); g.fill(); }
  return tex(c);
}
const FIELDS = {
  // radial pool with lobes
  pool: (u, v, n, R) => { const dx = u - .5, dy = v - .5, r = Math.hypot(dx, dy) * 2; const a = Math.atan2(dy, dx); const lobes = .18 * Math.sin(a * 3 + 1) + .12 * Math.sin(a * 5 + 2); return 1 - r * (1 + lobes) - (n(u, v) - .5) * .35; },
  // splatter: core + satellites + streaks (static after it lands)
  splat: (u, v, n, R) => { const dx = u - .5, dy = v - .5, r = Math.hypot(dx, dy) * 2, a = Math.atan2(dy, dx); const spikes = Math.pow(Math.abs(Math.sin(a * 7 + Math.sin(a * 3) * 2)), 8) * .45; const core = 1 - r * 1.6 + spikes - (n(u, v) - .5) * .5; const dots = n(u * 3.1, v * 3.1) > .78 && r < .95 ? .8 : 0; return Math.max(core, dots * (1 - r)); },
  // wall drips: reveal top -> bottom
  drip: (u, v, n, R) => { const col = n(u * 1.0, .1); const lane = Math.pow(Math.max(0, Math.sin(u * 38 + col * 9)), 6) * (.4 + col); const top = 1 - v * 3.2; const run = lane > .25 ? 1 - v * (1.05 - col * .4) : -1; const w = Math.abs(u - .5) * 2; return Math.max(top - (n(u, v) - .5) * .4, run) * (1 - Math.pow(w, 4)); },
  // smear trail along u (reveals start -> end)
  trail: (u, v, n, R) => { const w = Math.abs(v - .5) * 2; const edge = .55 + (n(u * 2, .3) - .5) * .5; return w < edge ? (1 - u * .96) - (n(u * 3, v) - .5) * .12 : (w < edge + .2 && n(u * 6, v * 2) > .7 ? (1 - u) * .7 : 0); },
};
const fieldCache = new Map();
function getField(kind, seed) { const key = kind + seed; if (!fieldCache.has(key)) fieldCache.set(key, fieldTex(kind === 'trail' ? 512 : 256, kind === 'trail' ? 96 : 256, FIELDS[kind], seed)); return fieldCache.get(key); }

// decal: {kind, at:[x,y,z], r, len (trail), rot (yaw), wall: normal yaw (vertical decal), t, grow}
export function makeDecal(e, i) {
  const seed = 101 + i * 37 + Math.round((e.at[0] + e.at[2]) * 10);
  const kind = e.kind || 'pool', w = kind === 'trail' ? (e.len || 4) : (e.r || 1) * 2, h = kind === 'trail' ? (e.r || .5) * 2 : (e.r || 1) * 2;
  const mat = new THREE.MeshStandardMaterial({ color: e.color || BLOOD, map: bloodColorTex(seed), alphaMap: getField(kind, seed % 7), alphaTest: .99, roughness: e.dry ? .75 : .16, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4 - (i % 4), polygonOffsetUnits: -4, envMapIntensity: 1 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.receiveShadow = true; m.castShadow = false;
  if (e.wall != null) { m.position.set(...e.at); m.rotation.set(0, e.wall, e.tilt || 0); }
  else { m.position.set(e.at[0], (e.at[1] || 0) + .025 + (i % 5) * .002, e.at[2]); m.rotation.set(-Math.PI / 2, 0, e.rot || 0); if (kind === 'trail') { m.geometry.translate(w / 2, 0, 0); } }
  m.userData.ev = e; m.visible = false; return m;
}
export function updateDecal(m, t) {
  const e = m.userData.ev; if (t < e.t) { m.visible = false; return; }
  const dur = e.grow ?? ({ pool: 4, splat: .12, drip: 2.5, trail: 1.5 }[e.kind || 'pool']);
  const k = dur <= 0 ? 1 : clamp((t - e.t) / dur); const kk = e.kind === 'pool' ? Math.sqrt(easeOut(k)) : easeOut(k);
  m.visible = true; m.material.alphaTest = Math.max(.03, .985 - kk * (.985 - (e.edge ?? .04)));
  // fresh blood darkens over a minute
  const age = clamp((t - e.t) / 25); m.material.color.set(e.color || BLOOD).multiplyScalar(1 - age * .35);
}

// wound overlay on a body part: blood spreading through the clothes from height y0 (0 = top of part, 1 = bottom)
const woundFieldCache = new Map();
function woundField(y0, seed) {
  const key = y0.toFixed(2) + ':' + seed; if (woundFieldCache.has(key)) return woundFieldCache.get(key);
  const t = fieldTex(128, 256, (u, v, n) => { const vv = 1 - v; /* canvas y down -> uv v up */ const yy = 1 - vv; const dy = yy - y0; const dist = dy > 0 ? dy * 1.25 : -dy * 2.6; const front = Math.abs(u - .5) * .35; const runs = Math.pow(Math.max(0, Math.sin(u * 23 + seed)), 10) * clamp(dy * 2) * .35; return 1 - dist - front + runs - (n(u, v) - .5) * .45; }, seed);
  woundFieldCache.set(key, t); return t;
}
export function woundMesh(part, y0, seed, size) {
  const [w, h, d] = size;
  const mat = new THREE.MeshStandardMaterial({ color: '#7d0606', map: bloodColorTex(seed), alphaMap: woundField(y0, seed), alphaTest: .99, roughness: .28, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const m = rbox(w + .03, h + .03, d + .03, mat, .14, 4); m.castShadow = false; return m;
}
// gauze wrap with blood soaking through from the middle
let gauzeTex;
function gauze() {
  if (gauzeTex) return gauzeTex; const c = canvas(128, 128), g = c.getContext('2d'); g.fillStyle = '#efece4'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(120,110,95,.35)'; g.lineWidth = 2; for (let i = -128; i < 256; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 40, 128); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  gauzeTex = tex(c); return gauzeTex;
}
export function bandageMesh(width, seed) {
  const grp = new THREE.Group();
  const wrap = rbox(width + .1, .75, width + .1, new THREE.MeshStandardMaterial({ map: gauze(), roughness: .95 }), .1, 3); grp.add(wrap);
  for (const y of [-.3, .3]) { const ring = rbox(width + .14, .1, width + .14, new THREE.MeshStandardMaterial({ map: gauze(), roughness: .95 }), .05, 2); ring.position.y = y; grp.add(ring); }
  const soakF = fieldTex(128, 128, (u, v, n) => { const dx = (u - .5) * 1.6, dy = (v - .5) * 2.2; return 1 - Math.hypot(dx, dy) - (n(u, v) - .5) * .5; }, seed);
  const soak = rbox(width + .12, .78, width + .12, new THREE.MeshStandardMaterial({ color: '#a00000', alphaMap: soakF, alphaTest: .99, roughness: .5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), .1, 3);
  soak.castShadow = false; grp.add(soak); grp.userData.soak = soak; return grp;
}
export function updateBandage(b, t, ev) {
  const k = clamp((t - ev.t) / (ev.wrap ?? .9)); b.visible = t >= ev.t;
  b.scale.set(1, Math.max(.02, easeOut(k)), 1); b.rotation.y = (1 - k) * 2.5;
  const s = clamp((t - ev.t - (ev.wrap ?? .9)) / (ev.soak ?? 8)); const soak = b.userData.soak;
  soak.material.alphaTest = Math.max(.03, .985 - smooth(s) * (.985 - (1 - (ev.amt ?? .75))));
  soak.visible = s > 0; soak.material.color.set('#a80000').lerp(new THREE.Color('#4a0606'), clamp((t - ev.t) / 40));
}
let dropGeo;
export function dropMesh() { dropGeo ||= new THREE.SphereGeometry(.07, 8, 6); const m = new THREE.Mesh(dropGeo, new THREE.MeshStandardMaterial({ color: '#8a0000', roughness: .1 })); m.castShadow = false; m.scale.set(1, 1.6, 1); return m; }
