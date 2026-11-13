// Locations + lighting presets. Each builder returns { group, props:{name:Object3D}, update(t) }.
import * as THREE from 'three';
import { rnd, canvas, tex, addNoise, fabricCanvas, bumpTex, std, mapMat, repMat, rbox, textCanvas, cyl } from './lib.js';
import { M, woodCanvas, buildCart, buildWashStation, buildMoneyTable, sixPack } from './props.js';
import { SETS } from './setdata.mjs';
import { zoneAirfield, zoneHangar, zoneShelter } from './zone-sets.js';
import { toyKitchen } from './toy-kitchen.js';

const plankCanvas = (base = '#b98552') => textCanvas(512, 512, (g, w, h) => {
  for (let r = 0; r < 8; r++) { const off = (r % 2) * 180; for (let k = -1; k < 3; k++) { const c = new THREE.Color(base).offsetHSL(0, 0, (rnd() - .5) * .08); g.fillStyle = '#' + c.getHexString(); g.fillRect(k * 300 + off, r * 64, 300, 64); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(k * 300 + off, r * 64, 3, 64); } g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, r * 64, w, 3); }
  g.globalAlpha = .12; g.strokeStyle = '#3d2410'; for (let i = 0; i < 90; i++) { const y = rnd() * h; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 6, w * .6, y - 6, w, y); g.stroke(); } g.globalAlpha = 1; addNoise(g, w, h, 14);
});
const wallpaperCanvas = (base = '#b9a7e3') => textCanvas(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.18)';
  for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { const ox = (y / 64) % 2 ? 32 : 0; g.beginPath(); g.moveTo(x + ox + 32, y + 8); g.lineTo(x + ox + 48, y + 32); g.lineTo(x + ox + 32, y + 56); g.lineTo(x + ox + 16, y + 32); g.closePath(); g.fill(); }
  addNoise(g, w, h, 12);
});
const grassCanvas = () => textCanvas(512, 512, (g, w, h) => { g.fillStyle = '#5fae46'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `hsla(${95 + rnd() * 25},${45 + rnd() * 20}%,${30 + rnd() * 25}%,.55)`; g.fillRect(rnd() * w, rnd() * h, 2, 4 + rnd() * 5); } });
const pavingCanvas = () => textCanvas(512, 512, (g, w, h) => { g.fillStyle = '#c9c2b6'; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const c = new THREE.Color('#cfc8bb').offsetHSL(0, 0, (rnd() - .5) * .07); g.fillStyle = '#' + c.getHexString(); g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); } addNoise(g, w, h, 18); });
const asphaltCanvas = () => textCanvas(512, 512, (g, w, h) => { g.fillStyle = '#4a4c52'; g.fillRect(0, 0, w, h); addNoise(g, w, h, 40); g.fillStyle = '#f2f2f2'; for (let x = 0; x < w; x += 128) g.fillRect(x + 20, h / 2 - 6, 80, 12); });
const brickCanvas = (base) => textCanvas(512, 512, (g, w, h) => { g.fillStyle = '#d8d0c4'; g.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let k = -1; k < 9; k++) { const c = new THREE.Color(base).offsetHSL((rnd() - .5) * .02, 0, (rnd() - .5) * .1); g.fillStyle = '#' + c.getHexString(); g.fillRect(k * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); } addNoise(g, w, h, 14); });
const S = Math.sin;
const P_ = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const R_ = (m, x, y, z) => { m.rotation.set(x, y, z); return m; };
function skyTexture(top, bot) { const c = canvas(4, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); return tex(c); }

function tree(x, z, s = 1, scene) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  const tr = cyl(.35, .5, 4, std('#6b4527', .9, { bumpMap: bumpTex, bumpScale: 2 }), 10); tr.position.y = 2; g.add(tr);
  const lm = std('#3f8f3a', .8, { bumpMap: bumpTex, bumpScale: 2 });
  for (const [px, py, pz, r] of [[0, 5.2, 0, 2.2], [1.3, 4.6, .4, 1.5], [-1.2, 4.7, -.3, 1.6], [.2, 6.3, -.2, 1.5]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), lm); b.position.set(px, py, pz); b.castShadow = b.receiveShadow = true; g.add(b); }
  scene.add(g); return g;
}
function cloud(x, y, z, s, scene) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: .35 }); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1 + rnd() * .8, 12, 8), m); b.position.set(i * 1.3 - 2.6, rnd() * .6, rnd() * .5); g.add(b); } g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g); return g; }
function house(x, z, col, roof, scene, w = 9) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const body = rbox(w, 7, 6, mapMat(brickCanvas(col), .85), .05, 1); body.position.y = 3.5; g.add(body);
  const rf = new THREE.Mesh(new THREE.ConeGeometry(w * .75, 3.5, 4), std(roof, .7)); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, .7); rf.position.y = 8.7; rf.castShadow = true; g.add(rf);
  const winM = new THREE.MeshStandardMaterial({ color: '#9fd0ef', roughness: .1, metalness: .3, emissive: '#bfe6ff', emissiveIntensity: .1 }); g.userData.windows = [];
  for (const wx of [-w / 4, w / 4]) for (const wy of [2.4, 5.2]) { const fr = rbox(1.7, 1.5, .2, std('#fff', .5), .03, 1); fr.position.set(wx, wy, 3.02); g.add(fr); const wi = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.25), winM); wi.position.set(wx, wy, 3.13); g.add(wi); g.userData.windows.push(wi); }
  scene.add(g); return g;
}

const flick = (t, f = 4, k = .15) => 1 - k * (.5 + .5 * Math.sin(t * f * 6.283) * Math.sin(t * f * 2.1));
export const KVASS = { title: 'КВАС', sub: 'ОТ ПАПЫ', price: '40₽', stripe: ['#a0522d', '#fff3d6'], border: '#8b4513', titleColor: '#7a3b10', subColor: '#c92a2a', signBg: '#fff3d6', drink: 'kvass', fruit: 'barrel' };
// ---------------- builders ----------------
const BUILD = {
  toy_kitchen: toyKitchen,
  zone_airfield: zoneAirfield,
  zone_hangar: zoneHangar,
  zone_shelter: zoneShelter,
  living(scene, o = {}) {
    const props = {};
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), repMat(plankCanvas(), [5, 4], .6)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const wallM = repMat(wallpaperCanvas(o.wall), [8, 3], .9);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallM); back.position.set(0, 7, -6.5); back.receiveShadow = true; scene.add(back);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), wallM); side.position.set(-11, 7, 6); side.rotation.y = Math.PI / 2; side.receiveShadow = true; scene.add(side);
    for (const [z0, z1] of [[-6.5, -1.9], [.9, 14]]) { const len = z1 - z0; const rw = new THREE.Mesh(new THREE.PlaneGeometry(len, 14), wallM); rw.position.set(11, 7, (z0 + z1) / 2); rw.rotation.y = -Math.PI / 2; rw.receiveShadow = true; scene.add(rw); }
    { const top = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 7.4), wallM); top.position.set(11, 10.3, -.5); top.rotation.y = -Math.PI / 2; scene.add(top);
      for (const z of [-1.95, .95]) { const j = rbox(.35, 6.7, .3, std('#f4f0f8', .5), .04, 1); j.position.set(10.9, 3.35, z); scene.add(j); }
      const lin = rbox(.35, .35, 3.2, std('#f4f0f8', .5), .04, 1); lin.position.set(10.9, 6.6, -.5); scene.add(lin);
      const hall = new THREE.Mesh(new THREE.PlaneGeometry(6, 14), std('#5a4a7a', .9)); hall.position.set(14, 7, -.5); hall.rotation.y = -Math.PI / 2; scene.add(hall); }
    const base = rbox(40, .5, .15, std('#f4f0f8', .5), .03, 1); base.position.set(0, .25, -6.42); scene.add(base);
    // sofa
    const sofaM = mapMat(fabricCanvas('#3d6fd1', 256, 26), .95, { bumpScale: 1.2 });
    const sofa = new THREE.Group(); sofa.position.set(0, 0, -4.6); scene.add(sofa);
    const seat = rbox(6.4, 1.1, 2.5, sofaM, .25); seat.position.set(0, 1.0, .2); sofa.add(seat);
    const backr = rbox(6.4, 2.3, .8, sofaM, .3); backr.position.set(0, 2.3, -.85); sofa.add(backr);
    for (const x of [-3.5, 3.5]) { const a = rbox(.8, 1.9, 2.6, sofaM, .3); a.position.set(x, 1.3, .1); sofa.add(a); }
    for (const x of [-1.5, 1.5]) { const c = rbox(2.9, .45, 2.1, sofaM, .2); c.position.set(x, 1.75, .35); sofa.add(c); }
    const pil = rbox(1.1, 1.0, .35, mapMat(fabricCanvas('#ffcc4d', 128, 20), .9), .15); pil.position.set(-2.6, 2.4, -.25); pil.rotation.z = .2; sofa.add(pil);
    // window
    const win = new THREE.Group(); win.position.set(-6.5, 5.5, -6.45); scene.add(win);
    const wf = rbox(4.4, 3.6, .2, std('#ffffff', .4), .05, 1); win.add(wf);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.2), new THREE.MeshBasicMaterial({ color: '#bfe6ff' })); glass.position.z = .11; win.add(glass); props.windowGlass = glass;
    const cr = rbox(4.2, .12, .1, std('#fff', .4), .02, 1); cr.position.z = .15; win.add(cr); const cr2 = rbox(.12, 3.4, .1, std('#fff', .4), .02, 1); cr2.position.z = .15; win.add(cr2);
    for (const x of [-2.7, 2.7]) { const cu = rbox(1.1, 4.6, .15, mapMat(fabricCanvas(o.curtain || '#ff8fa3', 128, 18), .95), .05); cu.position.set(x, -.3, .3); win.add(cu); }
    // picture frame
    const pic = new THREE.Group(); pic.position.set(4.8, 6, -6.45); scene.add(pic);
    pic.add(rbox(2.6, 1.9, .12, std('#6b4527', .5), .03, 1));
    const art = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshStandardMaterial({ map: tex(textCanvas(256, 180, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd27f'); gr.addColorStop(1, '#ff7b6b'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#4a7c59'; g.beginPath(); g.moveTo(0, h); g.lineTo(80, 90); g.lineTo(150, 140); g.lineTo(210, 70); g.lineTo(w, h); g.fill(); g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(190, 50, 22, 0, 7); g.fill(); })), roughness: .7 })); art.position.z = .07; pic.add(art);
    // lamp + plant + rug
    const lamp = new THREE.Group(); lamp.position.set(5.6, 0, -5.2); scene.add(lamp);
    const pole = cyl(.06, .06, 5, std('#333', .3, { metalness: .8 }), 8); pole.position.y = 2.5; lamp.add(pole);
    const shade = cyl(.5, .8, .9, new THREE.MeshStandardMaterial({ color: '#fff4d6', roughness: .9, emissive: '#ffcf7a', emissiveIntensity: .0 }), 20); shade.position.y = 5.1; lamp.add(shade); props.lampShade = shade;
    const lb = cyl(.6, .6, .08, std('#333', .3, { metalness: .8 }), 16); lb.position.y = .04; lamp.add(lb);
    const pot = cyl(.55, .4, 1, std('#e07a4f', .7), 16); pot.position.set(-4.6, .5, -5.4); scene.add(pot);
    for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8), std('#3f9b4a', .7)); lf.scale.set(.6, 1.6, .3); lf.position.set(-4.6 + Math.cos(i) * .35, 1.8 + rnd() * .5, -5.4 + Math.sin(i) * .3); lf.rotation.set(Math.sin(i) * .5, i, Math.cos(i) * .5); lf.castShadow = true; scene.add(lf); }
    const rug = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), mapMat(textCanvas(256, 256, (g, w, h) => { g.fillStyle = '#f2e4c9'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d98b5f'; g.lineWidth = 10; for (let r = 30; r < 128; r += 26) { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); } addNoise(g, w, h, 16); }), .95)); rug.rotation.x = -Math.PI / 2; rug.position.set(0, .02, -.8); rug.scale.set(1.4, 1, 1); rug.receiveShadow = true; scene.add(rug);
    if (!o.noMoney) { const mt = buildMoneyTable(); mt.position.set(0, 0, 0); mt.visible = false; scene.add(mt); props.moneyTable = mt; }
    return { props, update() { } };
  },
  yard(scene) {
    const props = {};
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), repMat(grassCanvas(), [10, 8], .95)); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; scene.add(gr);
    const fenceM = mapMat(woodCanvas('#d9b07a'), .8);
    for (let i = -20; i <= 20; i++) { const p = rbox(.8, 3.4, .2, fenceM, .05, 1); p.position.set(i * .95, 1.7, -8); scene.add(p); const tip = new THREE.Mesh(new THREE.ConeGeometry(.4, .5, 4), fenceM); tip.position.set(i * .95, 3.6, -8); tip.rotation.y = Math.PI / 4; scene.add(tip); }
    for (const y of [1, 2.6]) { const rail = rbox(40, .25, .15, fenceM, .03, 1); rail.position.set(0, y, -8.15); scene.add(rail); }
    const shed = new THREE.Group(); shed.position.set(-9, 0, -5.5); scene.add(shed);
    const sb = rbox(5, 4.5, 4, mapMat(plankCanvas('#c0563c'), .8), .05, 1); sb.position.y = 2.25; shed.add(sb);
    const sr = new THREE.Mesh(new THREE.ConeGeometry(4, 2, 4), std('#4a4a55', .7)); sr.rotation.y = Math.PI / 4; sr.scale.set(1, 1, .8); sr.position.y = 5.5; sr.castShadow = true; shed.add(sr);
    const door = rbox(1.6, 2.8, .1, std('#f0e6d0', .6), .03, 1); door.position.set(0, 1.4, 2.02); shed.add(door);
    tree(9, -10, 1.2, scene); tree(-15, -12, 1.4, scene); tree(15, -6, 1, scene);
    // planks + toolbox (yard dressing)
    for (let i = 0; i < 4; i++) { const p = rbox(3, .15, .5, M.wood, .03, 1); p.position.set(4.8 + (i % 2) * .2, .08 + i * .15, -2.5 + i * .1); p.rotation.y = .3 + i * .1; scene.add(p); }
    const tb = rbox(1.2, .6, .6, std('#d8322a', .4, { metalness: .3 }), .06, 2); tb.position.set(-3.8, .3, .2); tb.rotation.y = .4; scene.add(tb);
    for (let i = 0; i < 4; i++) cloud(-20 + i * 14, 20 + rnd() * 4, -45, 1.4, scene);
    const cart = buildCart(); scene.add(cart); props.cart = cart;
    return { props, update() { } };
  },
  street(scene) {
    const props = {};
    const side = new THREE.Mesh(new THREE.PlaneGeometry(120, 14), repMat(pavingCanvas(), [24, 3], .9)); side.rotation.x = -Math.PI / 2; side.position.set(0, 0, 1); side.receiveShadow = true; scene.add(side);
    const curb = rbox(120, .3, .4, std('#9a958d', .8), .05, 1); curb.position.set(0, .15, -6); scene.add(curb);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 12), repMat(asphaltCanvas(), [12, 1], .85)); road.rotation.x = -Math.PI / 2; road.position.set(0, -.01, -12); road.receiveShadow = true; scene.add(road);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), repMat(grassCanvas(), [20, 5], .95)); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -.02, -33); lawn.receiveShadow = true; scene.add(lawn);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), repMat(grassCanvas(), [20, 5], .95)); front.rotation.x = -Math.PI / 2; front.position.set(0, -.02, 23); front.receiveShadow = true; scene.add(front);
    const cols = [['#e8a87c', '#8c3b2a'], ['#f2e3b3', '#3b5f8c'], ['#c9d7e8', '#7a3b3b'], ['#f0c4c4', '#4a4a55'], ['#cde8c4', '#8c5a2a'], ['#f2d29b', '#3b3b4a']];
    props.houses = [];
    for (let i = 0; i < 9; i++) { const [c, r] = cols[i % cols.length]; props.houses.push(house(-36 + i * 11, -26, c, r, scene)); }
    for (let i = 0; i < 7; i++) tree(-30 + i * 10 + 3, -19, .9 + rnd() * .3, scene);
    props.lamps = [];
    for (let i = 0; i < 5; i++) {
      const L = new THREE.Group(); L.position.set(-22 + i * 12, 0, -5.2); scene.add(L);
      const p = cyl(.1, .14, 7, std('#2c3036', .4, { metalness: .7 }), 8); p.position.y = 3.5; L.add(p);
      const arm = rbox(1.2, .12, .12, std('#2c3036', .4, { metalness: .7 }), .03, 1); arm.position.set(.5, 7, 0); L.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), new THREE.MeshStandardMaterial({ color: '#fff2c4', emissive: '#ffd27a', emissiveIntensity: .2 })); bulb.position.set(1.0, 6.8, 0); L.add(bulb); props.lamps.push(bulb);
    }
    for (let i = 0; i < 5; i++) cloud(-30 + i * 15, 22 + rnd() * 4, -60, 1.6, scene);
    const cart = buildCart(); cart.position.set(...SETS.street.anchors.cart); scene.add(cart); props.cart = cart;
    const cart2 = buildCart(KVASS); cart2.position.set(...SETS.street.anchors.dadCart); cart2.visible = false; scene.add(cart2); props.cart2 = cart2;
    const ws = buildWashStation(); ws.position.set(-3.6, 0, -.6); ws.visible = false; scene.add(ws); props.washStation = ws;
    return {
      props, update(t) { for (const b of ws.userData.bubbles) b.position.y = 2.42 + Math.sin(t * 3 + b.userData.ph) * .05; },
    };
  },
  // ======================= ZOMBIE SERIES =======================
  flat(scene) {
    const r = BUILD.living(scene, { wall: '#c4c9a6', curtain: '#9b6b4a', noMoney: true }); const props = r.props;
    // wall TV (left wall) with news screen
    const tv = new THREE.Group(); tv.position.set(-10.82, 4.6, -1.4); tv.rotation.y = Math.PI / 2; scene.add(tv);
    tv.add(rbox(3.7, 2.25, .18, std('#0d0d10', .25, { metalness: .4 }), .06, 2));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 2.02), new THREE.MeshBasicMaterial({ map: tex(textCanvas(690, 404, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0b2a5c'); gr.addColorStop(1, '#16185a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 12; i++) g.fillRect(0, i * 36, w, 2);
      // city map with red zone
      g.fillStyle = '#26467a'; g.fillRect(380, 40, 270, 210); g.strokeStyle = '#5f86c4'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(380 + i * 45, 40); g.lineTo(380 + i * 40, 250); g.stroke(); g.beginPath(); g.moveTo(380, 40 + i * 35); g.lineTo(650, 50 + i * 32); g.stroke(); }
      g.fillStyle = 'rgba(255,40,40,.55)'; g.beginPath(); g.arc(520, 140, 70, 0, 7); g.fill(); g.fillStyle = '#ff3030'; g.beginPath(); g.arc(520, 140, 16, 0, 7); g.fill();
      // anchor silhouette
      g.fillStyle = '#e9c39b'; g.beginPath(); g.arc(190, 120, 52, 0, 7); g.fill(); g.fillStyle = '#2a2a35'; g.beginPath(); g.ellipse(190, 290, 130, 110, 0, Math.PI, 0); g.fill(); g.fillRect(60, 285, 260, 40); g.fillStyle = '#c92a2a'; g.beginPath(); g.moveTo(180, 190); g.lineTo(200, 190); g.lineTo(206, 270); g.lineTo(190, 290); g.lineTo(174, 270); g.fill();
      g.fillStyle = '#3b2414'; g.beginPath(); g.ellipse(190, 85, 56, 30, 0, Math.PI, 0); g.fill();
      // breaking banner
      g.fillStyle = '#d00000'; g.fillRect(0, 300, w, 70); g.fillStyle = '#fff'; g.fillRect(0, 300, 190, 70); g.fillStyle = '#d00000'; g.font = '900 44px Inter'; g.fillText('СРОЧНО', 14, 351);
      g.fillStyle = '#fff'; g.font = '800 38px Inter'; g.fillText('ЗОМБИ В ГОРОДЕ', 210, 350); g.fillStyle = '#ffd21a'; g.fillRect(0, 370, w, 34); g.fillStyle = '#111'; g.font = '700 24px Inter'; g.fillText('НЕ ВЫХОДИТЕ ИЗ ДОМА • НЕ ОТКРЫВАЙТЕ ДВЕРЬ • ЗАПАСИТЕСЬ ВОДОЙ', 10, 395);
      g.fillStyle = '#fff'; g.font = '900 26px Inter'; g.fillText('LIVE', 600, 30); g.fillStyle = '#ff2020'; g.beginPath(); g.arc(585, 21, 8, 0, 7); g.fill();
    })) })); scr.position.z = .1; tv.add(scr); props.tvScreen = scr;
    const cab = rbox(4.2, 1.3, 1.4, mapMat(woodCanvas('#5b3a24'), .6), .06, 2); cab.position.set(-10.2, .65, -1.4); scene.add(cab);
    const tvL = new THREE.PointLight('#7fa8ff', 0, 14, 1.6); tvL.position.set(-9, 4.5, -1.4); scene.add(tvL); props.tvLight = tvL;
    // bookshelf (back wall right)
    const bs = new THREE.Group(); bs.position.set(8.4, 0, -5.9); scene.add(bs); const wd = mapMat(woodCanvas('#6b4a2e'), .7);
    bs.add(P_(rbox(3.4, 7, .9, wd, .05, 1), 0, 3.5, 0));
    for (let r2 = 0; r2 < 4; r2++) { let x = -1.45; while (x < 1.35) { const bw = .18 + rnd() * .2, bh = 1.0 + rnd() * .45; const b = rbox(bw, bh, .7, std(['#c92a2a', '#1971c2', '#2b8a3e', '#e67700', '#5f3dc4', '#e9ecef', '#495057'][Math.floor(rnd() * 7)], .7), .02, 1); b.position.set(x + bw / 2, .55 + r2 * 1.65 + bh / 2, .12); b.rotation.z = rnd() < .1 ? .25 : 0; bs.add(b); x += bw + .03; } }
    // wall clock
    const clk = new THREE.Group(); clk.position.set(1.6, 8.6, -6.42); scene.add(clk); clk.add(R_(cyl(.75, .75, .12, std('#f8f9fa', .4), 32), Math.PI / 2, 0, 0));
    for (const [len, a] of [[.45, .6], [.6, 2.2]]) { const hnd = rbox(.06, len, .03, std('#111', .5), .01, 1); hnd.geometry = hnd.geometry.clone(); hnd.geometry.translate(0, len / 2, 0); hnd.position.z = .08; hnd.rotation.z = -a; clk.add(hnd); }
    // curtains closed + boards (toggle with set show/hide)
    const cc = new THREE.Group(); cc.position.set(-6.5, 5.3, -6.15); scene.add(cc); cc.visible = false; props.curtainClosed = cc;
    for (const x of [-1.1, 1.1]) { const cu = rbox(2.3, 4.6, .15, mapMat(fabricCanvas('#9b6b4a', 128, 18), .95), .05); cu.position.set(x, 0, 0); cc.add(cu); }
    const bd = new THREE.Group(); bd.position.set(-6.5, 5.5, -6.0); scene.add(bd); bd.visible = false; props.boards = bd;
    for (const [y, rz] of [[1.0, .15], [0, -.12], [-1.0, .08], [.4, .6]]) { const p = rbox(5, .5, .15, mapMat(plankCanvas('#a8865a'), .8), .03, 1); p.position.set(0, y, .1); p.rotation.z = rz; bd.add(p); }
    // front door in the doorway (shown when closed)
    const door = new THREE.Group(); door.position.set(10.92, 0, -.5); scene.add(door); door.visible = false; props.frontDoor = door;
    door.add(P_(rbox(.2, 6.6, 2.85, mapMat(woodCanvas('#7a4a2a'), .6), .04, 1), 0, 3.3, 0));
    for (const y of [1.6, 4.6]) { const pn = rbox(.06, 2.2, 2.1, std('#6a3d20', .6), .04, 1); pn.position.set(-.12, y, 0); door.add(pn); }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), std('#d4af37', .25, { metalness: .9 })); knob.position.set(-.2, 3.1, -1.05); door.add(knob);
    // a chair barricade near door + clutter
    const ch = new THREE.Group(); ch.position.set(9.3, 0, 1.4); ch.rotation.y = .5; scene.add(ch); ch.visible = false; props.barricade = ch;
    ch.add(P_(rbox(1.6, .2, 1.6, wd, .03, 1), 0, 1.9, 0)); for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) ch.add(P_(rbox(.15, 1.9, .15, wd, .02, 1), x, .95, z)); ch.add(P_(rbox(1.6, 1.8, .15, wd, .03, 1), 0, 2.9, -.75));
    const up = r.update;
    return { props, update(t) { up?.(t); const k = .82 + .18 * Math.sin(t * 13) * Math.sin(t * 3.1); scr.material.color.setScalar(k); tvL.intensity = (props.tvLight.userData.on ?? 0) * (14 + 8 * Math.sin(t * 9) * Math.sin(t * 2.3)); } };
  },

  bunker(scene) {
    const props = {};
    const conc = (base) => textCanvas(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${.03 + rnd() * .06})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 10 + rnd() * 60, 0, 7); g.fill(); } g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; for (let y = 0; y < h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } addNoise(g, w, h, 26); });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), repMat(conc('#7d7a72'), [5, 4], .95)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const wallM = repMat(conc('#9a958a'), [6, 2], .95);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallM); back.position.set(0, 7, -6); back.receiveShadow = true; scene.add(back);
    const lw = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), wallM); lw.position.set(-11, 7, 6); lw.rotation.y = Math.PI / 2; lw.receiveShadow = true; scene.add(lw);
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), wallM); rw.position.set(14, 7, 6); rw.rotation.y = -Math.PI / 2; rw.receiveShadow = true; scene.add(rw);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), std('#5f5c56', .95)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 10.5; scene.add(ceil);
    // pipes
    for (const [y, r0, col] of [[9.4, .22, '#6e5a46'], [8.8, .14, '#4f5b62']]) { const p = cyl(r0, r0, 40, std(col, .5, { metalness: .6 }), 12); p.rotation.z = Math.PI / 2; p.position.set(0, y, -5.7); scene.add(p); }
    // shelving racks
    const metal = std('#5d6166', .45, { metalness: .7 });
    const canLabel = mapMat(textCanvas(256, 128, (g, w, h) => { g.fillStyle = '#c92a2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1e3c8'; g.fillRect(0, 34, w, 60); g.fillStyle = '#7a1010'; g.font = '900 38px Inter'; g.textAlign = 'center'; g.fillText('ТУШЁНКА', w / 2, 78); }), .4, { metalness: .3 });
    const sackM = mapMat(textCanvas(256, 256, (g, w, h) => { g.fillStyle = '#d8c49a'; g.fillRect(0, 0, w, h); g.globalAlpha = .12; g.fillStyle = '#5a4a2a'; for (let i = 0; i < w; i += 6) g.fillRect(i, 0, 2, h); g.globalAlpha = 1; g.fillStyle = '#5a3a14'; g.font = '900 46px Inter'; g.textAlign = 'center'; g.fillText('ГРЕЧКА', w / 2, 140); g.font = '700 30px Inter'; g.fillText('50 КГ', w / 2, 185); addNoise(g, w, h, 14); }), .95);
    const canTop = std('#c9ccd1', .3, { metalness: .9 });
    const jarM = new THREE.MeshStandardMaterial({ color: '#d9f0e0', roughness: .05, transparent: true, opacity: .45 }); const pickle = std('#6a8f2a', .6); const tomato = std('#d9480f', .5);
    const rack = (x, fill) => {
      const g = new THREE.Group(); g.position.set(x, 0, -5.1); scene.add(g);
      for (const px of [-2.05, 2.05]) for (const pz of [-.6, .6]) { const p = rbox(.12, 7.4, .12, metal, .02, 1); p.position.set(px, 3.7, pz); g.add(p); }
      for (let lv = 0; lv < 4; lv++) { const y = .6 + lv * 1.75; const sh = rbox(4.3, .1, 1.35, metal, .02, 1); sh.position.y = y; g.add(sh); fill(g, y + .05, lv); }
      return g;
    };
    rack(-6.2, (g, y) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { const c = cyl(.22, .22, .42, [canTop, canLabel, canTop], 14); c.position.set(-1.7 + i * .48, y + .21, -.25 + j * .5); g.add(c); if (rnd() > .4) { const c2 = c.clone(); c2.position.y += .43; g.add(c2); } } });
    rack(-1.4, (g, y, lv) => { for (let i = 0; i < 3; i++) { const s = rbox(1.25, .95 + rnd() * .2, .9, sackM, .25, 3); s.position.set(-1.35 + i * 1.35, y + .5, 0); s.rotation.y = (rnd() - .5) * .3; g.add(s); } });
    rack(3.4, (g, y, lv) => {
      if (lv === 3) { for (let i = 0; i < 6; i++) { const b = rbox(.5, .3, .35, std(['#e03131', '#f08c00', '#1c7ed6'][i % 3], .6), .03, 1); b.position.set(-1.6 + i * .62, y + .15, 0); g.add(b); } return; }
      for (let i = 0; i < 6; i++) { const j = new THREE.Group(); j.position.set(-1.65 + i * .66, y + .4, (i % 2) * .3 - .15); const gl = cyl(.25, .25, .75, jarM, 14); j.add(gl); const ct = cyl(.21, .21, .55, lv % 2 ? tomato : pickle, 10); ct.position.y = -.08; j.add(ct); const lid = cyl(.26, .26, .08, std('#c9a227', .3, { metalness: .8 }), 14); lid.position.y = .4; j.add(lid); g.add(j); }
    });
    // gas mask on hook + calendar
    const gm = new THREE.Group(); gm.position.set(8.2, 5.6, -5.85); scene.add(gm); const rub = std('#4b5a3c', .7);
    gm.add(rbox(1.0, 1.2, .35, rub, .3, 3)); for (const x of [-.24, .24]) { const e = cyl(.17, .17, .1, new THREE.MeshStandardMaterial({ color: '#a8c0c8', roughness: .05, metalness: .3 }), 16); e.rotation.x = Math.PI / 2; e.position.set(x, .2, .2); gm.add(e); }
    const fl = cyl(.22, .22, .45, std('#2f3a28', .6), 14); fl.rotation.x = Math.PI / 2; fl.position.set(0, -.45, .35); gm.add(fl);
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), mapMat(textCanvas(256, 340, (g, w, h) => { g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b02020'; g.fillRect(0, 0, w, 80); g.fillStyle = '#fff'; g.font = '900 52px Inter'; g.textAlign = 'center'; g.fillText('1986', w / 2, 60); g.strokeStyle = '#333'; g.lineWidth = 2; for (let i = 0; i < 5; i++) for (let k = 0; k < 7; k++) { g.strokeRect(14 + k * 33, 100 + i * 46, 30, 42); if (rnd() > .3) { g.strokeStyle = '#c00'; g.beginPath(); g.moveTo(18 + k * 33, 104 + i * 46); g.lineTo(40 + k * 33, 138 + i * 46); g.stroke(); g.strokeStyle = '#333'; } } }), .9)); cal.position.set(10.3, 5.2, -5.95); scene.add(cal);
    // stairs down from the right
    const stepM = mapMat(woodCanvas('#7a5634'), .8);
    for (let i = 0; i < 7; i++) { const st = rbox(.85, .62 * (i + 1), 2.6, stepM, .03, 1); st.position.set(6.2 + i * .85, .31 * (i + 1), -1.3); scene.add(st); }
    const land = rbox(3, 4.34, 2.6, stepM, .03, 1); land.position.set(13.1, 2.17, -1.3); scene.add(land);
    const rail = rbox(6.5, .12, .12, std('#3b2a1a', .6), .03, 1); rail.position.set(9.2, 5.7, .05); rail.rotation.z = .63; scene.add(rail);
    for (let i = 0; i < 4; i++) { const pst = rbox(.12, 1.6, .12, std('#3b2a1a', .6), .02, 1); pst.position.set(6.6 + i * 1.7, 1.3 + i * 1.25 + .8, .05); scene.add(pst); }
    // cot + crate + radio + canisters
    const cot = rbox(2.2, .5, 4.6, std('#4b5a3c', .9), .1, 2); cot.position.set(-9.2, 1.0, -.3); scene.add(cot); for (const [x, z] of [[-10.1, -2.4], [-8.3, -2.4], [-10.1, 1.8], [-8.3, 1.8]]) { const l = rbox(.12, .8, .12, metal, .02, 1); l.position.set(x, .4, z); scene.add(l); }
    const crate = rbox(1.8, 1.4, 1.4, mapMat(plankCanvas('#9a7448'), .8), .04, 1); crate.position.set(-6.6, .7, 1.4); crate.rotation.y = .3; scene.add(crate);
    const radio = rbox(1.1, .65, .45, std('#3a3a2a', .5), .06, 2); radio.position.set(-6.6, 1.75, 1.4); radio.rotation.y = .3; scene.add(radio);
    for (let i = 0; i < 2; i++) { const cn = rbox(.8, 1.2, .5, std('#2f6b2f', .4, { metalness: .4 }), .08, 2); cn.position.set(-3.6 + i * .9, .6, -3.6); scene.add(cn); }
    // hanging bulb
    const wire = cyl(.02, .02, 1.6, std('#111', .5), 4); wire.position.set(0, 9.7, -.8); scene.add(wire);
    const bulbM = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcc66', emissiveIntensity: 2 }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), bulbM); bulb.position.set(0, 8.8, -.8); scene.add(bulb);
    const L = new THREE.PointLight('#ffc477', 160, 32, 1.5); L.position.set(0, 8.5, -.8); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); scene.add(L);
    const fill = new THREE.PointLight('#8fa8c8', 30, 30, 1.5); fill.position.set(2, 6, 9); scene.add(fill);
    return { props, update(t) { const f = (Math.sin(t * 37) > .97 || (t % 4.3) < .06) ? .45 : 1; L.intensity = 160 * f * (.96 + .04 * Math.sin(t * 9)); bulbM.emissiveIntensity = 2 * f; } };
  },

  car(scene, light) {
    const props = {}; const night = light === 'carNight'; const drive = light === 'carDrive' || night;
    // street panorama behind the windows
    const panoC = textCanvas(2048, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6f7c86'); gr.addColorStop(.7, '#cfc8b4'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w;) { const bw = 140 + rnd() * 160, bh = 150 + rnd() * 170; const col = ['#a99a85', '#b9b39c', '#9aa4ab', '#b49c94', '#8d8a80'][Math.floor(rnd() * 5)]; g.fillStyle = col; g.fillRect(x, h - 70 - bh, bw, bh); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + bw - 10, h - 70 - bh, 10, bh);
        for (let yy = h - 70 - bh + 22; yy < h - 110; yy += 46) for (let xx = x + 16; xx < x + bw - 30; xx += 38) { g.fillStyle = rnd() > .82 ? '#9a7a50' : '#1d2228'; g.fillRect(xx, yy, 22, 26); }
        if (rnd() > .5) { g.fillStyle = '#6b6a66'; g.beginPath(); g.moveTo(x - 6, h - 70 - bh); g.lineTo(x + bw / 2, h - 70 - bh - 50); g.lineTo(x + bw + 6, h - 70 - bh); g.fill(); }
        x += bw + 10 + rnd() * 60;
        if (rnd() > .45) { const tx = x - 30; g.fillStyle = '#4a3a28'; g.fillRect(tx - 6, h - 160, 12, 90); g.fillStyle = ['#56693a', '#4e5e35', '#6b7040'][Math.floor(rnd() * 3)]; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(tx + (k - 1.5) * 18, h - 175 - (k % 2) * 25, 38, 0, 7); g.fill(); } }
        if (rnd() > .7) { g.fillStyle = '#2c3036'; g.fillRect(x - 12, h - 300, 7, 230); g.fillRect(x - 12, h - 300, 40, 6); } }
      g.fillStyle = '#8f8a80'; g.fillRect(0, h - 70, w, 22); g.fillStyle = '#45474c'; g.fillRect(0, h - 48, w, 48); addNoise(g, w, h, 14);
    });
    if (night) { const g = panoC.getContext('2d'); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#1a2038'; g.fillRect(0, 0, panoC.width, panoC.height); g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 160; i++) { g.fillStyle = rnd() > .5 ? 'rgba(255,190,110,.75)' : 'rgba(160,190,255,.35)'; g.fillRect(rnd() * panoC.width, 60 + rnd() * 300, 14, 18); } for (let x = 100; x < panoC.width; x += 420) { const gr = g.createRadialGradient(x, 180, 4, x, 180, 90); gr.addColorStop(0, 'rgba(255,200,120,.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 90, 90, 180, 180); } }
    const panoT = tex(panoC); panoT.wrapS = THREE.RepeatWrapping; panoT.repeat.set(2, 1);
    const panes = []; const mkPano = (rotY, pos, wd, flip) => { const t2 = panoT.clone(); t2.needsUpdate = true; t2.wrapS = THREE.RepeatWrapping; t2.repeat.set(wd / 30, 1); const m = new THREE.Mesh(new THREE.PlaneGeometry(wd, 11), new THREE.MeshBasicMaterial({ map: t2, fog: false })); m.rotation.y = rotY; m.position.set(...pos); scene.add(m); panes.push({ t: t2, dir: flip }); return m; };
    mkPano(Math.PI / 2, [-13, 4.6, -2], 60, 1); mkPano(-Math.PI / 2, [13, 4.6, -2], 60, -1); mkPano(0, [0, 4.6, -22], 60, 0);
    const groundM = repMat(asphaltCanvas(), [6, 6], .9); const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundM); ground.rotation.x = -Math.PI / 2; ground.position.y = -.6; scene.add(ground);
    // body shell
    const paint = std('#d8c9a0', .45, { metalness: .3 }), trim = std('#5b4d40', .8), plast = std('#2b2b2e', .6), seatM = mapMat(fabricCanvas('#7a4b35', 256, 22), .95, { bumpScale: 1.2 });
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
    add(rbox(10.6, .5, 15, trim, .1, 1), 0, -.25, -1.8);
    for (const sx of [-1, 1]) { add(rbox(.4, 3.7, 14.6, paint, .12, 2), sx * 5.2, 1.6, -1.8); add(rbox(.12, 1.0, 14.4, trim, .04, 1), sx * 4.98, 3.0, -1.8); }
    for (const sx of [-1, 1]) for (const [z, w] of [[3.9, .5], [-2.2, .45], [-7.6, .9]]) { const pl = add(rbox(.4, 4.9, w, paint, .1, 1), sx * 5.1, 5.9, z); if (z > 3) pl.rotation.x = -.3; }
    add(rbox(10.8, .35, 11.8, paint, .15, 2), 0, 8.4, -2.2); add(rbox(10.2, .08, 11.4, std('#cfc6b4', .9), .02, 1), 0, 8.2, -2.2);
    add(rbox(10.6, 3.6, .4, paint, .1, 1), 0, 1.6, -9.3); add(rbox(10.2, .3, 2.2, trim, .05, 1), 0, 3.55, -8.4);
    // hood, bumper, headlights, wheels (seen in the outside shots)
    const hood = add(rbox(10.6, 1.0, 5.4, paint, .3, 3), 0, 2.15, 6.6); hood.rotation.x = .05; add(rbox(10.8, 2.0, 5.4, paint, .2, 2), 0, .9, 6.6);
    add(rbox(11.0, .55, .6, std('#9aa0a6', .3, { metalness: .8 }), .2, 2), 0, .6, 9.4); add(rbox(4.2, .9, .12, std('#1b1d20', .5), .05, 1), 0, 1.45, 9.32);
    for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(.55, 20), new THREE.MeshStandardMaterial({ color: '#fff6d0', emissive: '#fff2c0', emissiveIntensity: .6 })); hl.position.set(sx * 3.7, 1.5, 9.34); scene.add(hl); }
    for (const sx of [-1, 1]) for (const z of [6.4, -6.6]) { const w = cyl(1.25, 1.25, .9, std('#1a1a1a', .9), 20); w.rotation.z = Math.PI / 2; w.position.set(sx * 5.25, .65, z); scene.add(w); const rr = cyl(.6, .6, .95, std('#9aa0a6', .3, { metalness: .8 }), 12); rr.rotation.z = Math.PI / 2; rr.position.copy(w.position); scene.add(rr); }
    // dashboard + wheel
    add(rbox(10.2, 1.5, 2.4, plast, .2, 3), 0, 3.0, 3.6); add(rbox(10.2, 1.8, .3, plast, .1, 1), 0, 1.6, 4.4);
    const gC = textCanvas(256, 96, (g, w, h) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); for (const cx of [64, 192]) { g.strokeStyle = '#ddd'; g.lineWidth = 3; g.beginPath(); g.arc(cx, 52, 38, Math.PI * .8, Math.PI * 2.2); g.stroke(); g.strokeStyle = '#ff6b3d'; g.beginPath(); g.moveTo(cx, 52); g.lineTo(cx - 24, 30); g.stroke(); } });
    const gauge = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .65), new THREE.MeshStandardMaterial({ map: tex(gC), emissive: '#ffffff', emissiveMap: tex(gC), emissiveIntensity: .3 })); gauge.position.set(2.2, 3.45, 2.38); gauge.rotation.y = Math.PI; scene.add(gauge);
    const wheel = new THREE.Group(); wheel.position.set(2.2, 3.85, 1.85); wheel.rotation.x = -.45; scene.add(wheel); props.wheel = wheel;
    const wm = std('#1a1a1a', .5); const rim = new THREE.Mesh(new THREE.TorusGeometry(.85, .1, 10, 28), wm); rim.castShadow = true; wheel.add(rim);
    for (const a of [0, 2.1, 4.2]) { const sp = rbox(.8, .12, .08, wm, .03, 1); sp.position.set(Math.cos(a) * .4, Math.sin(a) * .4, 0); sp.rotation.z = a; wheel.add(sp); }
    const col = cyl(.12, .14, 1.4, wm, 8); col.rotation.x = Math.PI / 2 - .45; col.position.set(2.2, 3.55, 2.5); scene.add(col);
    // mirror + air freshener tree
    add(rbox(1.3, .42, .15, plast, .08, 2), 0, 7.5, 3.4); add(rbox(.1, .5, .1, plast, .02, 1), 0, 7.95, 3.4); const fr = new THREE.Group(); fr.position.set(.3, 7.25, 3.35); scene.add(fr); props.fresh = fr;
    fr.add(P_(cyl(.01, .01, .7, std('#ddd'), 4), 0, -.35, 0)); const treeS = new THREE.Shape(); treeS.moveTo(0, 0); treeS.lineTo(.3, -.35); treeS.lineTo(.12, -.35); treeS.lineTo(.36, -.7); treeS.lineTo(.08, -.7); treeS.lineTo(.08, -.82); treeS.lineTo(-.08, -.82); treeS.lineTo(-.08, -.7); treeS.lineTo(-.36, -.7); treeS.lineTo(-.12, -.35); treeS.lineTo(-.3, -.35); treeS.closePath();
    fr.add(P_(new THREE.Mesh(new THREE.ShapeGeometry(treeS), new THREE.MeshStandardMaterial({ color: '#2f9e44', side: THREE.DoubleSide, roughness: .7 })), 0, -.7, 0));
    // seats
    const seat = (x, z, wdt) => { add(rbox(wdt, .7, 2.8, seatM, .25, 3), x, 1.65, z - .25); const bk = add(rbox(wdt, 3.1, .7, seatM, .3, 3), x, 3.3, z - 1.75); bk.rotation.x = -.1; };
    seat(2.2, 0, 3.4); seat(-2.2, 0, 3.4); add(rbox(1.5, 1.05, .55, seatM, .2, 3), 2.2, 5.15, -2.05); add(rbox(1.5, 1.05, .55, seatM, .2, 3), -2.2, 5.15, -2.05);
    seat(0, -4.6, 9.4); add(rbox(1.0, 1.4, 2.4, trim, .15, 2), 0, 1.0, -.2);
    props.drive = new THREE.Group(); scene.add(props.drive); props.drive.visible = drive;
    let passL = null; if (night) { const dash = new THREE.PointLight('#5ad08a', 6, 8, 1.6); dash.position.set(2.2, 4.4, 2.6); scene.add(dash); passL = new THREE.PointLight('#ffb870', 0, 30, 1.4); scene.add(passL); }
    return { props, update(t) {
      const on = props.drive.visible; const sp = on ? .09 : 0;
      for (const p of panes) { if (p.dir) p.t.offset.x = -p.dir * t * sp * (on ? 1 : 0); }
      fr.rotation.z = S(t * (on ? 3.1 : 1.2)) * (on ? .25 : .06); fr.rotation.x = on ? -.15 + S(t * 2.3) * .08 : 0;
      wheel.rotation.z = on ? S(t * 1.3) * .25 + S(t * 3.7) * .08 : 0;
      ground.position.y = -.6 + (on ? S(t * 17) * .03 : 0);
      if (passL) { const ph = (t * .55) % 1; passL.position.set(13, 12, 26 - ph * 60); passL.intensity = 22 * Math.sin(Math.PI * ph) ** 2; }
    } };
  },

  ruins(scene) {
    const props = {};
    const crackAsphalt = () => textCanvas(512, 512, (g, w, h) => { g.fillStyle = '#3f4146'; g.fillRect(0, 0, w, h); addNoise(g, w, h, 46); g.fillStyle = 'rgba(230,230,220,.55)'; for (let x = 0; x < w; x += 128) g.fillRect(x + 20, h / 2 - 6, 80, 12); g.strokeStyle = 'rgba(15,15,15,.7)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 60; y += (rnd() - .5) * 60; g.lineTo(x, y); } g.stroke(); } for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(20,15,10,.35)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 40, 10 + rnd() * 20, rnd() * 3, 0, 7); g.fill(); } });
    const dirtyPaving = () => { const c = pavingCanvas(); const g = c.getContext('2d'); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(60,50,30,${.08 + rnd() * .12})`; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 20 + rnd() * 50, 10 + rnd() * 30, rnd() * 3, 0, 7); g.fill(); } return c; };
    const side = new THREE.Mesh(new THREE.PlaneGeometry(120, 14), repMat(dirtyPaving(), [24, 3], .9)); side.rotation.x = -Math.PI / 2; side.position.set(0, 0, 1); side.receiveShadow = true; scene.add(side);
    const curb = rbox(120, .3, .4, std('#7f7a72', .8), .05, 1); curb.position.set(0, .15, -6); scene.add(curb);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 12), repMat(crackAsphalt(), [12, 1], .85)); road.rotation.x = -Math.PI / 2; road.position.set(0, -.01, -12); road.receiveShadow = true; scene.add(road);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(120, 5), repMat(dirtyPaving(), [24, 1], .9)); far.rotation.x = -Math.PI / 2; far.position.set(0, 0, -20.5); far.receiveShadow = true; scene.add(far);
    const curb2 = rbox(120, .3, .4, std('#7f7a72', .8), .05, 1); curb2.position.set(0, .15, -18); scene.add(curb2);
    const deadGrass = () => { const c = grassCanvas(); const g = c.getContext('2d'); g.fillStyle = 'rgba(120,100,50,.45)'; g.fillRect(0, 0, 512, 512); return c; };
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), repMat(deadGrass(), [20, 5], .95)); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -.02, -38); lawn.receiveShadow = true; scene.add(lawn);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), repMat(deadGrass(), [20, 5], .95)); front.rotation.x = -Math.PI / 2; front.position.set(0, -.02, 23); front.receiveShadow = true; scene.add(front);
    // houses (dark windows, some boarded)
    const cols = [['#b59a80', '#5a3a2a'], ['#c9bfa0', '#3b4a5f'], ['#a9b4bf', '#5a3b3b'], ['#c4a8a0', '#3a3a40']];
    const plankM = mapMat(plankCanvas('#9a7a50'), .85);
    for (const [i, x] of [[0, -36], [1, -25], [2, -14], [3, 21], [0, 32], [2, 43]]) { const [c, rf] = cols[i]; const hs = house(x, -30, c, rf, scene); for (const wi of hs.userData.windows) { wi.material = new THREE.MeshStandardMaterial({ color: '#1d2228', roughness: .3, metalness: .3 }); if (rnd() > .5) { const b = rbox(1.9, .35, .12, plankM, .03, 1); b.position.copy(wi.position); b.position.z += .1; b.rotation.z = (rnd() - .5) * .6; hs.add(b); const b2 = b.clone(); b2.rotation.z = -b.rotation.z + .3; hs.add(b2); } } }
    // ---- store "ПРОДУКТЫ"
    const store = new THREE.Group(); store.position.set(6, 0, -27); scene.add(store);
    store.add(P_(rbox(17, 8, 9, mapMat(brickCanvas('#b8ae98'), .9), .05, 1), 0, 4, 0));
    const glassC = textCanvas(512, 256, (g, w, h) => { g.fillStyle = '#18222a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(140, 0); g.lineTo(60, h); g.lineTo(0, h); g.fill(); g.strokeStyle = 'rgba(220,230,240,.7)'; g.lineWidth = 2; for (const [cx, cy] of [[120, 90], [390, 150]]) for (let k = 0; k < 9; k++) { const a = k / 9 * 7; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (40 + rnd() * 70), cy + Math.sin(a) * (30 + rnd() * 50)); g.stroke(); } g.fillStyle = 'rgba(200,180,120,.5)'; g.font = '800 26px Inter'; g.fillText('-50%', 360, 60); });
    for (const x of [-5.2, 5.2]) { const gp = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.6), new THREE.MeshStandardMaterial({ map: tex(glassC), roughness: .15, metalness: .4 })); gp.position.set(x, 2.6, 4.52); store.add(gp); const fr = rbox(5.6, .2, .2, std('#555b60', .4, { metalness: .7 }), .03, 1); fr.position.set(x, .75, 4.6); store.add(fr); const fr2 = fr.clone(); fr2.position.y = 4.45; store.add(fr2); }
    const doorDark = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), std('#0c1014', .6)); doorDark.position.set(0, 2.2, 4.52); store.add(doorDark);
    const dl = rbox(1.7, 4.2, .1, new THREE.MeshStandardMaterial({ color: '#33424d', roughness: .1, metalness: .5, transparent: true, opacity: .75 }), .02, 1); dl.position.set(-1.5, 2.1, 4.65); dl.rotation.y = .5; store.add(dl);
    const signC = textCanvas(1024, 160, (g, w, h) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b02020'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); g.font = '900 118px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; const txt = 'ПРОДУКТЫ'; const tw = g.measureText(txt).width; let x = w / 2 - tw / 2; g.textAlign = 'left'; for (let i = 0; i < txt.length; i++) { g.fillStyle = i === 3 || i === 6 ? '#c9a0a0' : '#c41e1e'; g.fillText(txt[i], x, h / 2 + 6); x += g.measureText(txt[i]).width; } addNoise(g, w, h, 20); g.fillStyle = 'rgba(60,40,20,.25)'; g.fillRect(0, h - 30, w, 30); });
    const signM = new THREE.MeshStandardMaterial({ map: tex(signC), roughness: .6, emissive: '#ffffff', emissiveMap: tex(signC), emissiveIntensity: .35 });
    const sign = rbox(12.5, 1.95, .3, [std('#ddd'), std('#ddd'), std('#ddd'), std('#ddd'), signM, std('#ddd')], .05, 1); sign.position.set(0, 6.4, 4.7); store.add(sign); props.storeSign = sign;
    const awn = rbox(17.4, .25, 2.0, std('#7a2a2a', .8), .04, 1); awn.position.set(0, 5.1, 5.4); awn.rotation.x = .12; store.add(awn);
    // pallet of water + promo sign
    const pal = new THREE.Group(); pal.position.set(11.2, 0, -20.6); scene.add(pal);
    pal.add(P_(rbox(3.0, .35, 2.0, mapMat(plankCanvas('#b08a5a'), .85), .03, 1), 0, .18, 0));
    for (let i = 0; i < 6; i++) { const sp = sixPack(); sp.position.set(-.95 + (i % 3) * .95, .75 + Math.floor(i / 3) * .82, 0); pal.add(sp); }
    props.waterPack = pal.children[pal.children.length - 1];
    const promo = new THREE.Group(); promo.position.set(13.4, 0, -20.2); promo.rotation.y = -.35; scene.add(promo);
    promo.add(P_(rbox(.1, 2.2, .1, std('#333', .5), .02, 1), 0, 1.1, 0));
    promo.add(P_(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.3), mapMat(textCanvas(256, 190, (g, w, h) => { g.fillStyle = '#ffe066'; g.fillRect(0, 0, w, h); g.fillStyle = '#c92a2a'; g.font = '900 52px Inter'; g.textAlign = 'center'; g.fillText('АКЦИЯ', w / 2, 70); g.fillStyle = '#1c3d6e'; g.font = '900 40px Inter'; g.fillText('ВОДА', w / 2, 125); g.fillStyle = '#c92a2a'; g.fillText('2+1', w / 2, 172); addNoise(g, w, h, 18); }), .8, { side: THREE.DoubleSide })), 0, 2.6, .06));
    // ---- vehicles
    const car = (o) => {
      const g = new THREE.Group(); g.position.set(...o.pos); g.rotation.y = o.rot || 0; scene.add(g);
      const L = o.len || 5.2, Wd = o.w || 2.4, H = o.h || 1.2;
      const paintC = textCanvas(256, 128, (gg, w, h) => { gg.fillStyle = o.col; gg.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { gg.fillStyle = `rgba(70,50,30,${.1 + rnd() * .2})`; gg.beginPath(); gg.ellipse(rnd() * w, h - rnd() * 50, 10 + rnd() * 30, 6 + rnd() * 14, 0, 0, 7); gg.fill(); } if (o.stripe) { gg.fillStyle = o.stripe; gg.fillRect(0, 50, w, 22); } addNoise(gg, w, h, 14); });
      const paint = mapMat(paintC, .45, { metalness: .3 });
      const body = rbox(L, H, Wd, paint, .25, 3); body.position.y = .55 + H / 2; g.add(body);
      const cabW = o.van ? L * .78 : L * .5, cabH = o.van ? 1.6 : 1.0;
      const cab = rbox(cabW, cabH, Wd * .92, paint, .22, 3); cab.position.set(o.van ? -L * .1 : -L * .05, .55 + H + cabH / 2 - .05, 0); g.add(cab);
      const glassC2 = textCanvas(128, 64, (gg, w, h) => { gg.fillStyle = '#141a20'; gg.fillRect(0, 0, w, h); gg.strokeStyle = 'rgba(220,230,240,.7)'; gg.lineWidth = 1.5; if (o.broken) for (let k = 0; k < 8; k++) { const a = k / 8 * 7; gg.beginPath(); gg.moveTo(60, 30); gg.lineTo(60 + Math.cos(a) * 50, 30 + Math.sin(a) * 30); gg.stroke(); } gg.fillStyle = 'rgba(255,255,255,.08)'; gg.fillRect(10, 0, 20, h); });
      const gm = new THREE.MeshStandardMaterial({ map: tex(glassC2), roughness: .1, metalness: .5 });
      const wf = new THREE.Mesh(new THREE.PlaneGeometry(Wd * .8, cabH * .7), gm); wf.position.set(cab.position.x + cabW / 2 + .01, cab.position.y, 0); wf.rotation.y = Math.PI / 2; g.add(wf);
      for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(cabW * .8, cabH * .6), gm); sw.position.set(cab.position.x, cab.position.y + .05, s * (Wd * .46 + .01)); if (s < 0) sw.rotation.y = Math.PI; g.add(sw); }
      const tireM = std('#1a1a1a', .9); const rimM = std('#9aa0a6', .3, { metalness: .8 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(.55, .55, .4, tireM, 18); w.rotation.x = Math.PI / 2; w.position.set(sx * L * .32, .55, sz * (Wd / 2 - .05)); g.add(w); const rr = cyl(.3, .3, .42, rimM, 12); rr.rotation.x = Math.PI / 2; rr.position.copy(w.position); g.add(rr); }
      for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(.18, 12), std(o.lights ? '#fff6d0' : '#cfcfc0', .2, o.lights ? { emissive: '#fff2c0', emissiveIntensity: 1.2 } : {})); hl.position.set(L / 2 + .01, .55 + H * .55, s * Wd * .33); hl.rotation.y = Math.PI / 2; g.add(hl); }
      if (o.siren) { const bar = new THREE.Group(); bar.position.set(cab.position.x, cab.position.y + cabH / 2 + .1, 0); g.add(bar); const red = new THREE.MeshStandardMaterial({ color: '#ff3030', emissive: '#ff1010', emissiveIntensity: 0 }); const blue = new THREE.MeshStandardMaterial({ color: '#3060ff', emissive: '#1040ff', emissiveIntensity: 0 }); const a = rbox(.4, .22, .7, red, .06, 1); a.position.z = -.4; bar.add(a); const b = rbox(.4, .22, .7, blue, .06, 1); b.position.z = .4; bar.add(b); g.userData.siren = [red, blue]; }
      if (o.door) { const d = rbox(1.3, cabH + H * .8, .1, paint, .05, 1); d.geometry = d.geometry.clone(); d.geometry.translate(-.65, 0, 0); d.position.set(cab.position.x + cabW / 2 - .1, .55 + H * .8, Wd / 2); d.rotation.y = -1.0; g.add(d); }
      return g;
    };
    props.van = car({ pos: [-2, 0, -10.6], col: '#e9e6dc', len: 6.6, w: 2.7, h: 1.5, van: true, stripe: '#3b6fb6' });
    car({ pos: [13.5, 0, -12.5], rot: .55, col: '#b3261e', broken: true, door: true });
    const police = car({ pos: [-16, 0, -14], rot: -.35, col: '#f1f3f5', stripe: '#1c4fa0', siren: true, broken: true });
    car({ pos: [27, 0, -9], rot: 2.6, col: '#3d5a40', broken: true });
    // old Soviet car (drivable prop, front faces -x)
    props.zhiga = car({ pos: [-15, 0, -8.6], rot: Math.PI, col: '#d8c9a0', lights: true, len: 5.0, w: 2.4 });
    { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .3), new THREE.MeshStandardMaterial({ map: tex(textCanvas(220, 60, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#111'; g.font = '800 38px Inter'; g.textAlign = 'center'; g.fillText('В 777 ОВ', w / 2, 44); })), roughness: .5 })); pl.position.set(2.51, .75, 0); pl.rotation.y = Math.PI / 2; props.zhiga.add(pl); const pl2 = pl.clone(); pl2.position.x = -2.51; pl2.rotation.y = -Math.PI / 2; props.zhiga.add(pl2); }
    // bench by the entrance (granny's post)
    { const bg = new THREE.Group(); bg.position.set(-15.5, 0, 3.2); bg.rotation.y = Math.PI + .25; scene.add(bg); const wd = mapMat(plankCanvas('#8a6a3c'), .85);
      for (const z of [-.1, .35, .8]) bg.add(P_(rbox(4.2, .16, .42, wd, .03, 1), 0, 1.9, z));
      for (const x of [-1.8, 1.8]) { bg.add(P_(rbox(.18, 1.85, 1.2, std('#3a3d42', .5, { metalness: .5 }), .03, 1), x, .92, .35)); bg.add(P_(rbox(.16, 1.6, .16, std('#3a3d42', .5, { metalness: .5 }), .03, 1), x, 2.7, -.3)); }
      bg.add(P_(rbox(4.2, .3, .14, wd, .03, 1), 0, 3.25, -.32)); bg.add(P_(rbox(4.2, .3, .14, wd, .03, 1), 0, 2.75, -.32));
      const urn = cyl(.45, .35, 1.2, std('#2f3a33', .6), 12); urn.position.set(2.8, .6, .3); bg.add(urn); }
    // phone on the van roof (distraction prop)
    const ph = new THREE.Group(); ph.position.set(-3.2, 3.82, -9.6); ph.rotation.set(-Math.PI / 2, 0, .4); scene.add(ph); ph.visible = false; props.phoneVan = ph;
    ph.add(rbox(.5, .95, .07, std('#15151a', .25, { metalness: .5 }), .07, 2)); const pscr = new THREE.Mesh(new THREE.PlaneGeometry(.44, .86), new THREE.MeshBasicMaterial({ color: '#9cf5ff' })); pscr.position.z = .04; ph.add(pscr);
    const phL = new THREE.PointLight('#9cf5ff', 6, 6, 2); phL.position.set(0, 0, .5); ph.add(phL);
    // burning barrel
    const bar = new THREE.Group(); bar.position.set(-8.5, 0, -17); scene.add(bar);
    const rustC = textCanvas(256, 256, (g, w, h) => { g.fillStyle = '#6b3a1f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${120 + rnd() * 60 | 0},${50 + rnd() * 30 | 0},20,.4)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 4 + rnd() * 16, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 60, w, 10); g.fillRect(0, 180, w, 10); addNoise(g, w, h, 20); });
    bar.add(P_(cyl(.8, .8, 2.4, mapMat(rustC, .8), 20), 0, 1.2, 0));
    const flames = []; for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.35 + rnd() * .2, 1.4 + rnd() * .6, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffb020' : '#ff6a10', transparent: true, opacity: .85 })); f.position.set(Math.cos(i * 1.3) * .35, 3.0, Math.sin(i * 1.3) * .35); bar.add(f); flames.push(f); }
    const fireL = new THREE.PointLight('#ff8a30', 60, 18, 1.6); fireL.position.set(0, 3.6, 0); bar.add(fireL);
    // trash, tires, papers, broken lamp
    const bagM = std('#18181b', .35); for (const [x, z] of [[4.6, -4.9], [5.6, -5.1], [5.0, -4.2], [-12, -5.2], [-11.2, -4.6], [18, -19.8], [19, -20.4]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.6 + rnd() * .2, 10, 8), bagM); b.scale.set(1, .75, 1); b.position.set(x, .4, z); b.castShadow = true; scene.add(b); }
    for (const [x, z] of [[-6, -8], [8, -15.5], [-14, -19.5]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.55, .25, 8, 16), std('#151515', .9)); t.rotation.x = Math.PI / 2; t.position.set(x, .25, z); t.castShadow = true; scene.add(t); }
    const papM = new THREE.MeshStandardMaterial({ color: '#e8e2d0', roughness: .9, side: THREE.DoubleSide }); for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.5, .7), papM); p.rotation.set(-Math.PI / 2, 0, rnd() * 6); p.position.set(-20 + rnd() * 40, .02, -20 + rnd() * 26); scene.add(p); }
    const can = new THREE.Group(); can.position.set(-4.5, 0, -4.4); can.rotation.z = Math.PI / 2; scene.add(can); can.add(P_(cyl(.6, .55, 1.6, std('#5b6b4a', .6, { metalness: .4 }), 16), .8, 0, 0));
    for (const [x, tilt] of [[-22, 0], [-10, .35], [2, 0], [14, -.2], [26, 0]]) { const Lg = new THREE.Group(); Lg.position.set(x, 0, -5.2); Lg.rotation.z = tilt; scene.add(Lg); const p = cyl(.1, .14, 7, std('#2c3036', .4, { metalness: .7 }), 8); p.position.y = 3.5; Lg.add(p); const arm = rbox(1.2, .12, .12, std('#2c3036', .4, { metalness: .7 }), .03, 1); arm.position.set(.5, 7, 0); Lg.add(arm); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 8), std('#55554a', .4)); bulb.position.set(1.0, 6.8, 0); Lg.add(bulb); }
    // concrete barricade + sandbags near home side
    for (const [x, z, r] of [[-9, -6.8, .1], [-6.6, -6.9, -.05]]) { const jb = rbox(2.3, 1.3, .8, std('#b8b2a6', .9), .1, 2); jb.position.set(x, .65, z); jb.rotation.y = r; scene.add(jb); const st = rbox(2.3, .25, .82, std('#c92a2a', .7), .02, 1); st.position.set(x, 1.0, z); st.rotation.y = r; scene.add(st); }
    // sparse trees (dark)
    for (const [x, s] of [[-30, 1], [-20, .9], [16, 1.1], [36, 1]]) { const t = tree(x, -23, s, scene); t.traverse(o => { if (o.material && o.material.color && o.position.y > 3) { o.material = o.material.clone(); o.material.color.set('#5a6b3a'); } }); }
    for (let i = 0; i < 5; i++) { const c = cloud(-30 + i * 15, 22 + rnd() * 4, -60, 1.8, scene); c.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.color.set('#8a8278'); o.material.emissive.set('#3a342e'); } }); }
    return { props, update(t) {
      flames.forEach((f, i) => { const k = 1 + Math.sin(t * (9 + i * 2.3) + i) * .25 + Math.sin(t * 23 + i) * .08; f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); f.position.y = 2.7 + k * .45; f.rotation.y = t * 2 + i; });
      fireL.intensity = 60 + Math.sin(t * 17) * 14 + Math.sin(t * 7.3) * 10;
      if (police.userData.siren) { const ph2 = Math.floor(t * 4) % 2; police.userData.siren[0].emissiveIntensity = ph2 ? 2.5 : .1; police.userData.siren[1].emissiveIntensity = ph2 ? .1 : 2.5; }
      signM.emissiveIntensity = (Math.sin(t * 31) > .9 || (t % 3.7) < .08) ? .05 : .35;
      pscr.material.color.set(Math.floor(t * 6) % 2 ? '#9cf5ff' : '#ffffff'); phL.intensity = Math.floor(t * 6) % 2 ? 4 : 8;
    } };
  },
};

// ---------------- lighting ----------------
const LIGHTS = {
  toyDay: { sky: ['#9ddfff', '#ffe9b9'], fog: '#fff2d5', hemi: ['#ffffff', '#d4b780', 1.3], sun: ['#fff5d8', 1.8, [10, 18, 15]], exposure: 1.0 },
  day: { sky: ['#5fb3ff', '#d9f0ff'], fog: '#cfe9ff', hemi: ['#ffffff', '#7a8f6a', 1.1], sun: ['#fff1d6', 2.6, [12, 22, 14]], exposure: 1.0 },
  golden: { sky: ['#ff9a5c', '#ffe1a8'], fog: '#ffd5a0', hemi: ['#ffe2c0', '#6a5040', .9], sun: ['#ffb36b', 2.8, [-22, 10, 10]], exposure: 1.0 },
  apoc: { sky: ['#2e3a44', '#c9875a'], fog: '#77705f', fogR: [22, 105], hemi: ['#d6c8a8', '#3b3628', .8], sun: ['#ffb27a', 1.7, [-20, 14, 12]], exposure: 1.0 },
  apocDay: { sky: ['#56636c', '#c7c2ad'], fog: '#9b9a8a', fogR: [25, 110], hemi: ['#e2ddc8', '#4a4a3a', .9], sun: ['#efe6cf', 1.8, [14, 22, 12]], exposure: 1.0 },
  dusk: { sky: ['#1d2340', '#d9875a'], fog: '#3a3040', hemi: ['#ffd8b0', '#3a2a30', .55], sun: ['#ffb070', .9, [-12, 14, 10]], exposure: 1.05, warm: true },
  bunker: { sky: ['#000000', '#000000'], fog: '#000', hemi: ['#ffd9a0', '#2a2620', .28], sun: ['#ffcf90', .0, [5, 20, 10]], exposure: 1.1 },
  zoneNight: { sky: ['#100d12', '#623829'], fog: '#42312c', fogR: [48, 170], hemi: ['#c7b4a7', '#38312c', .66], sun: ['#e3a17c', .72, [-12, 18, 12]], exposure: 1.0 },
  zoneInterior: { sky: ['#101819', '#283a35'], fog: '#1f2928', hemi: ['#a3c3b9', '#303c32', .48], sun: ['#c8dacb', .12, [8, 18, 10]], exposure: 1.08 },
  ruinsNight: { sky: ['#100d12', '#53372d'], fog: '#45352f', fogR: [30, 120], hemi: ['#c0a9a0', '#302c28', .5], sun: ['#e29c72', .5, [-12, 18, 12]], exposure: 1.0 },
  carPark: { sky: ['#56636c', '#c7c2ad'], fog: '#9b9a8a', fogR: [40, 120], hemi: ['#e2ddc8', '#4a4a3a', 1.15], sun: ['#efe6cf', 2.0, [8, 20, 26]], exposure: 1.0 },
  carDrive: { sky: ['#56636c', '#c7c2ad'], fog: '#9b9a8a', fogR: [40, 120], hemi: ['#e2ddc8', '#4a4a3a', 1.15], sun: ['#efe6cf', 2.0, [8, 20, 26]], exposure: 1.0 },
  night: { sky: ['#0b1030', '#26305e'], fog: '#1a2040', hemi: ['#7d8cff', '#2a2030', .45], sun: ['#9fb4ff', .45, [-10, 18, 10]], exposure: 1.05, warm: true },
};

export function buildSet(scene, name, light = 'day') {
  const L = LIGHTS[light] || LIGHTS.day;
  const indoor = ['living', 'flat', 'bunker', 'hospital', 'parking', 'stairs', 'lab', 'sector1', 'zone_hangar', 'zone_shelter', 'toy_kitchen'].includes(name); const horror = ['hospital', 'parking', 'stairs', 'roof', 'heli', 'lab', 'sky', 'area51', 'sector1', 'zone_hangar', 'zone_shelter'].includes(name);
  scene.background = skyTexture(...L.sky);
  scene.fog = indoor ? null : new THREE.Fog(L.fog, ...(L.fogR || [45, 140]));
  const hemi = new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2] * (indoor ? .9 : 1)); scene.add(hemi);
  const sun = new THREE.DirectionalLight(L.sun[0], L.sun[1]); sun.position.set(...L.sun[2]); sun.castShadow = !L.noSunShadow && L.sun[1] > 0;
  sun.shadow.mapSize.set(2048, 2048); const s = sun.shadow.camera; s.left = -22; s.right = 22; s.top = 22; s.bottom = -14; s.near = 1; s.far = 80; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  if (indoor && name !== 'bunker' && !horror) { const fill = new THREE.PointLight('#fff0dd', name === 'toy_kitchen' ? 18 : light === 'night' ? 0 : light === 'dusk' ? 25 : 60, 40, 1.6); fill.position.set(2, 9, 6); scene.add(fill); }
  const built = BUILD[name](scene, light);
  if (light === 'ruinsNight') {
    const fire = new THREE.PointLight('#ff7a2a', 90, 40, 1.5); fire.position.set(-3, 3, -9); scene.add(fire);
    const lamp = new THREE.SpotLight('#cfe0ff', 160, 40, .6, .6, 1.3); lamp.position.set(10, 13, -3); lamp.target.position.set(9, 0, -2); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); scene.add(lamp); scene.add(lamp.target);
    const up0 = built.update; built.update = (t) => { up0?.(t); fire.intensity = 80 + 25 * Math.sin(t * 13) * Math.sin(t * 7.3); lamp.intensity = 160 * flick(t, 4, .15); };
  }
  if (light === 'night' && indoor) {
    const lampL = new THREE.PointLight('#ffb35c', 120, 30, 1.6); lampL.position.set(5.6, 5.3, -4.6); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); scene.add(lampL);
    const key = new THREE.PointLight('#ffd8a8', 50, 30, 1.6); key.position.set(-2, 8, 6); scene.add(key);
    const moon = new THREE.PointLight('#a9b8ff', 45, 30, 1.4); moon.position.set(-5, 6.5, -2.5); scene.add(moon);
    const rim = new THREE.PointLight('#ffcf9a', 35, 25, 1.5); rim.position.set(1, 7, 2); scene.add(rim);
    if (built.props.lampShade) built.props.lampShade.material.emissiveIntensity = 1.4;
    if (built.props.windowGlass) built.props.windowGlass.material.color.set('#1b2a5a');
  }
  if (light === 'dusk' && indoor) {
    const lampL = new THREE.PointLight('#ffb35c', 110, 30, 1.6); lampL.position.set(5.6, 5.3, -4.6); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); scene.add(lampL);
    const key = new THREE.PointLight('#ffd8a8', 45, 30, 1.6); key.position.set(-2, 8, 6); scene.add(key);
    const win = new THREE.PointLight('#ff9a6a', 40, 22, 1.5); win.position.set(-6.5, 5.5, -4.5); scene.add(win);
    if (built.props.lampShade) built.props.lampShade.material.emissiveIntensity = 1.4;
    if (built.props.windowGlass) built.props.windowGlass.material.color.set('#e0885a');
    if (built.props.tvLight) built.props.tvLight.userData.on = 1;
  }
  if (light === 'night' && built.props.tvLight) built.props.tvLight.userData.on = .4;
  if (light === 'golden' && built.props.lamps) for (const b of built.props.lamps) b.material.emissiveIntensity = 1.2;
  return { ...built, exposure: L.exposure, sun };
}
