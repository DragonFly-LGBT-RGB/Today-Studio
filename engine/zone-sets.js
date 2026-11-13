// Three self-contained procedural sets inspired by the reference films.
// Dimensions are in Studio units (a block character is about 5.3 units tall).
import * as THREE from 'three';

const M = (c, rough = .8, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
const emit = (c, power = .5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: power, roughness: .5 });
function box(host, size, pos, mat, rot = [0, 0, 0], cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...pos); m.rotation.set(...rot);
  m.castShadow = cast; m.receiveShadow = true; host.add(m); return m;
}
function cylinder(host, r1, r2, height, pos, mat, rot = [0, 0, 0], sides = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, height, sides), mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; host.add(m); return m;
}
function canvasTex(draw, w = 512, h = 512) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function rng(seed) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; }
function concreteTexture(seed = 4) {
  const t = canvasTex((g, w, h) => { const r = rng(seed); g.fillStyle = '#77776d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 11000; i++) { const a = r() * .12; g.fillStyle = r() > .5 ? `rgba(220,216,195,${a})` : `rgba(30,32,28,${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 5, 1 + r() * 5); }
    g.strokeStyle = 'rgba(40,38,32,.16)'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 8; j++) { x += (r() - .5) * 35; y += r() * 20; g.lineTo(x, y); } g.stroke(); }
  }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); t.anisotropy = 4; return t;
}
function floor(host, w, d, at = [0, 0, 0], repeats = 12) {
  const tex = concreteTexture(); tex.repeat.set(repeats, repeats * d / w);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })); f.rotation.x = -Math.PI / 2; f.position.set(...at); f.receiveShadow = true; host.add(f); return f;
}
function textSign(text, { sub = '', bg = '#ddd8c2', fg = '#9b2422', width = 3, height = 1, fs = 74 } = {}) {
  const tex = canvasTex((g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.font = `900 ${fs}px Inter, sans-serif`; g.fillText(text, w / 2, sub ? h * .47 : h * .63, w * .9); if (sub) { g.font = '700 35px Inter, sans-serif'; g.fillText(sub, w / 2, h * .78, w * .88); } }, 512, 180);
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: tex, roughness: .8, side: THREE.DoubleSide }));
}
function barrel(host, x, z, color = '#742d23', y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); host.add(g); const body = M(color, .55, .45), ring = M('#30312e', .55, .55);
  cylinder(g, .72, .72, 1.8, [0, .9, 0], body);
  for (const h of [.14, .62, 1.25, 1.72]) cylinder(g, .74, .74, .075, [0, h, 0], ring);
  return g;
}
function crate(host, pos, s = 1) {
  const g = new THREE.Group(); g.position.set(...pos); host.add(g); const wood = M('#70583c'), dark = M('#443d31');
  box(g, [1.8 * s, 1.5 * s, 1.5 * s], [0, .75 * s, 0], wood);
  for (const x of [-.72, .72]) box(g, [.12 * s, 1.5 * s, 1.53 * s], [x * s, .75 * s, 0], dark);
  for (const y of [.15, 1.35]) box(g, [1.8 * s, .12 * s, 1.55 * s], [0, y * s, 0], dark);
  return g;
}
// An arched hangar shell, open along Z, with curved ribs.
function arch(host, width, depth, zcenter = 0) {
  const r = width / 2, seg = 36, positions = [], inds = [];
  for (let a = 0; a <= seg; a++) { const angle = Math.PI * a / seg; for (const z of [-depth / 2, depth / 2]) positions.push(Math.cos(angle) * r, Math.sin(angle) * r, z + zcenter); }
  for (let a = 0; a < seg; a++) { const i = a * 2; inds.push(i, i + 1, i + 2, i + 2, i + 1, i + 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(inds); geo.computeVertexNormals();
  const skin = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#464b49', roughness: .9, metalness: .25, side: THREE.DoubleSide })); skin.receiveShadow = true; host.add(skin);
  const ribmat = M('#242b2c', .7, .5);
  for (let z = -depth / 2; z <= depth / 2 + .1; z += 4) {
    const pts = []; for (let a = 0; a <= 24; a++) { const v = a * Math.PI / 24; pts.push(new THREE.Vector3(Math.cos(v) * (r - .13), Math.sin(v) * (r - .13), z + zcenter)); }
    const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, .11, 6), ribmat); host.add(rib);
  }
}
function wreck() {
  const g = new THREE.Group(), hull = M('#7b7d72', .75, .32), dark = M('#242b2b', .5, .55), glass = M('#213b3d', .22, .45), red = M('#8c342a', .65, .25);
  box(g, [3.6, 2.5, 7.2], [0, 2.1, 0], hull, [.06, 0, -.16]);
  box(g, [3.5, 1.35, 2.3], [0, 3.1, 2.0], glass, [-.2, 0, -.16]);
  box(g, [2.1, 1.8, 1], [0, 1.8, 3.9], hull, [-.35, 0, -.16]);
  box(g, [.55, .65, 8.1], [0, 2.55, -6.7], hull, [.06, 0, -.12]);
  box(g, [2.8, .12, 1.1], [0, 3.0, -10.6], red, [0, 0, .15]);
  box(g, [.25, 2.2, 1.1], [0, 3.3, -10.6], hull, [0, 0, .15]);
  for (const x of [-1.3, 1.3]) { box(g, [.16, .14, 7], [x, .38, .1], dark); for (const z of [-1.6, 1.8]) box(g, [.12, 1, .12], [x, .9, z], dark, [0, 0, x * -.15]); }
  cylinder(g, .23, .3, 1.1, [0, 3.8, -.4], dark);
  const rotor = new THREE.Group(); rotor.position.set(0, 4.35, -.4); rotor.rotation.z = -.12; g.add(rotor);
  for (const a of [0, Math.PI / 2]) box(rotor, [14, .12, .42], [0, 0, 0], dark, [0, a, .02]);
  g.userData.rotor = rotor; return g;
}
function plane() {
  const g = new THREE.Group(), body = M('#989080', .7, .3), dark = M('#272b2b', .5, .55), wing = M('#7b8175', .7, .35), red = M('#9e3d2c');
  // Small prop aircraft silhouette, made from original primitives (not a downloaded model).
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.8, 11, 12), body); fus.rotation.x = Math.PI / 2; fus.position.set(0, 3.4, 0); fus.castShadow = true; g.add(fus);
  box(g, [13.5, .22, 3.1], [0, 4.5, .5], wing); box(g, [12, .18, 2.6], [0, 2.8, .2], wing);
  for (const x of [-4.8, 4.8]) for (const z of [-.7, 1.4]) box(g, [.14, 1.7, .14], [x, 3.65, z], dark);
  box(g, [4, .15, 1.8], [0, 4, -5.3], wing); box(g, [.15, 2, 1.9], [0, 4.7, -5.3], red);
  cylinder(g, .46, .46, .25, [0, 3.4, 5.5], dark, [Math.PI / 2, 0, 0]);
  const prop = new THREE.Group(); prop.position.set(0, 3.4, 5.7); g.add(prop); box(prop, [.2, 5.2, .12], [0, 0, 0], dark, [0, 0, .3]);
  for (const x of [-1.3, 1.3]) { box(g, [.12, 1.7, .12], [x, 1.4, 2], dark, [0, 0, x * -.14]); cylinder(g, .54, .54, .32, [x, .55, 2], dark, [0, 0, Math.PI / 2]); }
  g.userData.propeller = prop; return g;
}
function industrialLight(scene, at, color = '#dbf1e3', intensity = 100) {
  box(scene, [1.8, .12, .7], at, emit(color, 2), [0, 0, 0], false);
  const L = new THREE.PointLight(color, intensity, 35, 1.5); L.position.set(at[0], at[1] - .5, at[2]); scene.add(L); return L;
}

export function zoneAirfield(scene) {
  const props = {}; floor(scene, 150, 160, [0, 0, -20], 18);
  const runway = box(scene, [23, .03, 120], [0, .015, -22], M('#3c3d38'), [0, 0, 0], false);
  for (let z = -75; z < 45; z += 12) box(scene, [.42, .035, 6], [0, .045, z], M('#c6bba1'), [0, 0, 0], false);
  // Hangar behind the crash site.
  const hg = new THREE.Group(); hg.position.set(0, 0, -38); scene.add(hg); arch(hg, 32, 25, 0);
  box(hg, [32, 1.3, .4], [0, .65, 12.5], M('#353a35'));
  box(hg, [7, 9, .35], [-12.5, 4.5, 12.5], M('#525650')); box(hg, [7, 9, .35], [12.5, 4.5, 12.5], M('#525650'));
  box(hg, [18, .5, .5], [0, 8.6, 12.5], M('#474b44'));
  const sign = textSign('САНПРОПУСКНИК', { width: 7, height: 1.2, fs: 55 }); sign.position.set(0, 7.4, 12.76); hg.add(sign);
  const helicopter = wreck(); helicopter.position.set(-5, .2, -8); helicopter.rotation.y = -.5; helicopter.rotation.z = -.12; scene.add(helicopter); props.wreck = helicopter; props.rotor = helicopter.userData.rotor;
  props.barrels = new THREE.Group(); scene.add(props.barrels); for (const [x, z, c] of [[7, -9, '#1f5270'], [8.5, -10, '#8b3528'], [8, -12, '#8b3528'], [-13, -13, '#72502e']]) barrel(props.barrels, x, z, c);
  for (const [x, z] of [[-12, -18], [-14, -17], [12, -19], [13, -17]]) crate(scene, [x, 0, z], 1.1);
  const polemat = M('#3c443e', .7, .5);
  for (const x of [-25, 25]) for (let z = -52; z <= 20; z += 6) { box(scene, [.14, 3.7, .14], [x, 1.85, z], polemat); }
  for (const x of [-25, 25]) for (const y of [1, 2.1, 3.2]) box(scene, [.07, .05, 76], [x, y, -16], polemat, [0, 0, 0], false);
  for (let i = 0; i < 6; i++) { const x = -34 + i * 13, z = -60 - (i % 2) * 5; const tree = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9 + i % 3, 7), M('#36382e')); tree.position.set(x, 4.5, z); tree.castShadow = true; scene.add(tree); }
  const L = new THREE.PointLight('#ff8b46', 130, 48, 1.5); L.position.set(-6, 5, -12); scene.add(L);
  return { props, far: 220, update(t) { L.intensity = 110 + Math.sin(t * 8) * 12; } };
}

export function zoneHangar(scene) {
  const props = {}; floor(scene, 32, 44, [0, 0, 0], 5); arch(scene, 32, 44);
  const wall = M('#343d3b', .92), iron = M('#232e2d', .7, .6);
  box(scene, [32, 12.5, .4], [0, 6.25, -21.8], wall);
  // Sliding red-black doors at the far end.
  props.door = new THREE.Group(); props.door.position.set(0, 0, -21.45); scene.add(props.door);
  for (const x of [-5, 5]) { box(props.door, [9.8, 10, .25], [x, 5, 0], M('#3e2726', .8, .4)); for (let j = -4; j <= 4; j++) box(props.door, [.08, 9.8, .27], [x + j, 5, .02], iron); }
  const warning = textSign('ОБЪЕКТ 0', { sub: 'ПОСТОРОННИМ ВХОД ВОСПРЕЩЁН', width: 5, height: 1.4, fs: 70 }); warning.position.set(0, 10.8, -21.1); scene.add(warning);
  props.barrels = new THREE.Group(); scene.add(props.barrels); for (const [x, z, c] of [[-10, -13, '#95392e'], [-8.5, -13, '#95392e'], [-10, -11.4, '#95392e'], [9, -12, '#2f5260'], [11, 1, '#755239']]) barrel(props.barrels, x, z, c);
  for (const [x, z] of [[9, -17], [11, -16], [-11, 3]]) crate(scene, [x, 0, z]);
  const p = plane(); p.position.set(6, 0, -12); p.rotation.y = -.25; p.scale.setScalar(.8); scene.add(p); props.aircraft = p; props.propeller = p.userData.propeller;
  const L1 = industrialLight(scene, [-7, 12.5, -10], '#c7e1ed', 130), L2 = industrialLight(scene, [6, 12.5, 7], '#e9d8bc', 100);
  const warningL = new THREE.PointLight('#fa5130', 65, 25, 1.5); warningL.position.set(0, 5, -19); scene.add(warningL);
  return { props, far: 100, update(t) { L1.intensity = 120 + 8 * Math.sin(t * 5); L2.intensity = 100; warningL.intensity = 50 + 15 * (1 + Math.sin(t * 2)); } };
}

export function zoneShelter(scene) {
  const props = {}; floor(scene, 25, 23, [0, 0, 0], 5);
  const wall = M('#55605a'), upper = M('#7d8b80'), dark = M('#283c33', .7, .4), metal = M('#53675c', .7, .5);
  box(scene, [25, 8, .3], [0, 4, -10], wall); box(scene, [.3, 8, 23], [-12.4, 4, 1.5], wall); box(scene, [.3, 8, 23], [12.4, 4, 1.5], wall);
  box(scene, [25, .25, 23], [0, 8, 1.5], upper, [0, 0, 0], false);
  box(scene, [25, 1.1, .12], [0, .55, -9.8], dark);
  props.lockers = new THREE.Group(); scene.add(props.lockers);
  for (let i = 0; i < 9; i++) {
    const x = -10.5 + i * 1.55; box(props.lockers, [1.45, 5.3, 1.1], [x, 2.65, -9.1], metal);
    box(props.lockers, [1.25, 5.0, .08], [x, 2.7, -8.51], dark);
    for (let j = 0; j < 4; j++) box(props.lockers, [.58, .035, .03], [x, 4.6 - j * .18, -8.45], upper, [0, 0, 0], false);
    box(props.lockers, [.12, .42, .09], [x + .42, 2.7, -8.42], M('#b8ba9c'));
  }
  const poster = canvasTex((g, w, h) => {
    g.fillStyle = '#e5dfc6'; g.fillRect(0, 0, w, h); g.fillStyle = '#9e2921'; g.textAlign = 'center'; g.font = '900 32px Inter'; g.fillText('СХЕМА ЗОНЫ ОТЧУЖДЕНИЯ', w / 2, 52);
    g.strokeStyle = '#a34d42'; g.lineWidth = 4; g.setLineDash([10, 7]); g.beginPath(); g.arc(260, 250, 165, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#447488'; g.lineWidth = 15; g.beginPath(); g.moveTo(390, 80); g.bezierCurveTo(350, 180, 440, 300, 370, 470); g.stroke();
    g.fillStyle = '#282e27'; g.font = '700 24px Inter'; for (const [x,y,s] of [[260,250,'СТАНЦИЯ'],[125,170,'ГОРОД'],[140,350,'АЭРОДРОМ'],[345,385,'УКРЫТИЕ']]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.fillText(s, x, y - 12); }
  });
  const map = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), new THREE.MeshStandardMaterial({ map: poster, roughness: .85 })); map.position.set(7.9, 4, -9.79); scene.add(map); props.map = map;
  const table = new THREE.Group(); table.position.set(-5, 0, -2); scene.add(table); box(table, [5.6, .25, 2.4], [0, 2.5, 0], M('#a9ac9a'));
  for (const x of [-2.3, 2.3]) for (const z of [-.8, .8]) box(table, [.18, 2.5, .18], [x, 1.25, z], dark);
  box(table, [1.1, .55, .75], [0, 2.9, 0], M('#262e28')); box(table, [.45, .12, .4], [0, 3.2, .1], emit('#92f1a2', .8)); props.radio = table;
  for (const z of [-5.5, 2.5]) { box(scene, [7, .35, 1.2], [2, 1.3, z], M('#4a4036')); for (const x of [-.9, 4.9]) box(scene, [.18, 1.3, .18], [x, .65, z], dark); }
  const L1 = industrialLight(scene, [-5, 7.8, -2], '#daf1d7', 80), L2 = industrialLight(scene, [5, 7.8, -4], '#ccedcf', 70);
  return { props, far: 80, update(t) { L1.intensity = 75 + Math.sin(t * 7) * 3; L2.intensity = 65 + Math.sin(t * 3.7) * 3; } };
}
