// Deterministic rigid-body physics (cannon-es) for a frame-by-frame renderer.
// Every simulation starts at its event time t0 with fixed inputs and steps at 1/120 s, so any frame can be reproduced
// (sequential frames continue from a cache; a jump backwards re-simulates from t0).
// Features: ragdolls (blocky proxy rig, also drives skinned zombies), shatter debris (glass / wood / metal / gore / concrete),
// breakable doors (wood planks splinter, metal leaf torn off), dropped props (bounce + settle).
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { pbr } from './fx.js';

const G = -32, DT = 1 / 120;
const R32 = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const GROUP_STATIC = 1, GROUP_DYN = 2, GROUP_RAG = 4;

function newWorld(statics) {
  const w = new CANNON.World({ gravity: new CANNON.Vec3(0, G, 0) });
  w.broadphase = new CANNON.NaiveBroadphase(); w.allowSleep = true; w.solver.iterations = globalThis._opts?.physIter ?? 12;
  w.defaultContactMaterial.friction = .55; w.defaultContactMaterial.restitution = .18;
  const floor = new CANNON.Body({ mass: 0, collisionFilterGroup: GROUP_STATIC });
  floor.addShape(new CANNON.Plane()); floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0); floor.position.y = statics.floorY ?? 0; w.addBody(floor);
  for (const c of statics.boxes || []) {
    const [x, y, z, sx, sy, sz, ry = 0] = c;
    const b = new CANNON.Body({ mass: 0, collisionFilterGroup: GROUP_STATIC }); b.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)));
    b.position.set(x, y, z); b.quaternion.setFromEuler(0, ry, 0); w.addBody(b);
  }
  return w;
}
// generic cached stepper
class Sim {
  constructor(t0, build) { this.t0 = t0; this.build = build; this.reset(); }
  reset() { this.st = this.build(); this.t = this.t0; }
  at(t) {
    if (t < this.t - 1e-6) this.reset();
    let n = Math.floor((t - this.t) / DT + 1e-6);
    while (n-- > 0) { this.st.world.step(DT); this.st.after?.(); this.t += DT; }
    return this.st;
  }
}

// ---------------- ragdoll ----------------
// part geometry of the blocky rig (lib.makeChar): body-centre offsets from the joint pivots
const PARTS = {
  torso: { half: [1, 1, .5], mass: 6 },
  head: { half: [.65, .63, .6], mass: 1.4, pivot: [0, -.7, 0], parent: [0, 1, 0] },
  armL: { half: [.45, 1, .45], mass: 1.1, pivot: [0, .85, 0], parent: [1.5, .85, 0] },
  armR: { half: [.45, 1, .45], mass: 1.1, pivot: [0, .85, 0], parent: [-1.5, .85, 0] },
  legL: { half: [.47, 1, .47], mass: 2, pivot: [0, 1, 0], parent: [.5, -1, 0] },
  legR: { half: [.47, 1, .47], mass: 2, pivot: [0, 1, 0], parent: [-.5, -1, 0] },
};
const LIM = { head: [.55, .4], armL: [1.5, .8], armR: [1.5, .8], legL: [.9, .3], legR: [.9, .3] };
// meshes of the proxy rig that carry each part's body transform
export function partMeshes(ch) { return { torso: ch.torso, head: ch.hm, armL: ch.armL.children[0], armR: ch.armR.children[0], legL: ch.legL.children[0], legR: ch.legR.children[0] }; }
export function makeRagdoll(statics, init, o = {}) {
  // init: { part: { p:[x,y,z], q:[x,y,z,w] } } world transforms of the part meshes at t0 ; o: { v, spin, seed, limp, pin }
  return () => {
    const w = newWorld(statics), B = {};
    const rnd = R32(o.seed || 7);
    for (const [k, P] of Object.entries(PARTS)) {
      const b = new CANNON.Body({ mass: P.mass * (o.massK || 1), collisionFilterGroup: GROUP_RAG, collisionFilterMask: GROUP_STATIC | GROUP_DYN, linearDamping: .08, angularDamping: .35 });
      b.addShape(new CANNON.Box(new CANNON.Vec3(...P.half.map(x => x * (o.scale || 1)))));
      const I = init[k]; b.position.set(...I.p); b.quaternion.set(...I.q);
      const v = o.v || [0, 0, 0], kv = k === 'torso' ? 1 : k === 'head' ? (o.headK ?? 1.25) : .85;
      b.velocity.set(v[0] * kv + (rnd() - .5) * .8, v[1] * kv, v[2] * kv + (rnd() - .5) * .8);
      const sp = typeof o.spin === 'number' ? [o.spin * .5, o.spin * .3, o.spin] : (o.spin || [0, 0, 0]); b.angularVelocity.set(sp[0] + (rnd() - .5) * 1.5, sp[1] + (rnd() - .5), sp[2] + (rnd() - .5) * 1.5);
      b.sleepSpeedLimit = .25; b.sleepTimeLimit = .6;
      w.addBody(b); B[k] = b;
    }
    for (const [k, P] of Object.entries(PARTS)) {
      if (!P.parent) continue;
      const [sw, tw] = LIM[k];
      const c = new CANNON.ConeTwistConstraint(B.torso, B[k], {
        pivotA: new CANNON.Vec3(...P.parent), pivotB: new CANNON.Vec3(...P.pivot),
        axisA: new CANNON.Vec3(0, k === 'head' ? 1 : -1, 0), axisB: new CANNON.Vec3(0, k === 'head' ? 1 : -1, 0),
        angle: sw * (o.limp ?? 1), twistAngle: tw, collideConnected: false,
      });
      w.addConstraint(c);
    }
    // optional: a part held in place for a while (e.g. grabbed by a zombie) -> o.pin = { part, until, p:[..] }
    return { world: w, B };
  };
}
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
// write ragdoll body transforms back into the proxy rig
export function poseFromRagdoll(ch, B) {
  const M = partMeshes(ch);
  ch.root.position.set(0, 0, 0); ch.root.rotation.set(0, 0, 0); ch.root.updateMatrixWorld(true);
  _mi.copy(ch.root.matrixWorld).invert();
  for (const [k, mesh] of Object.entries(M)) {
    const b = B[k]; if (!b || !mesh) continue;
    _m.compose(_p.set(b.position.x, b.position.y, b.position.z), _q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w), _s);
    const host = k === 'torso' ? mesh : mesh.parent; // limbs/head: move the pivot group so that the mesh lands on the body
    if (k === 'torso') { const L = _mi.clone().multiply(_m); L.decompose(mesh.position, mesh.quaternion, new THREE.Vector3()); mesh.scale.set(1, 1, 1); continue; }
    const meshLocal = new THREE.Matrix4().compose(mesh.position, mesh.quaternion, new THREE.Vector3(1, 1, 1));
    const W = _m.clone().multiply(meshLocal.invert());
    const parentInv = new THREE.Matrix4().copy(host.parent.matrixWorld).invert();
    parentInv.multiply(W).decompose(host.position, host.quaternion, new THREE.Vector3());
  }
  ch.root.updateMatrixWorld(true);
}
export function captureInit(ch) {
  ch.root.updateMatrixWorld(true); const M = partMeshes(ch), I = {};
  for (const [k, m] of Object.entries(M)) { const p = m.getWorldPosition(new THREE.Vector3()), q = m.getWorldQuaternion(new THREE.Quaternion()); I[k] = { p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w] }; }
  return I;
}
export { Sim };

// ---------------- shatter debris ----------------
const MATS = {};
function debrisMat(kind) {
  if (MATS[kind]) return MATS[kind];
  let m;
  if (kind === 'glass') m = new THREE.MeshPhysicalMaterial({ color: '#cfe6ea', roughness: .04, metalness: 0, transparent: true, opacity: .42, side: THREE.DoubleSide, clearcoat: 1, depthWrite: false });
  else if (kind === 'wood') m = pbr('planks', [.25, .25], { color: '#b89a7a' });
  else if (kind === 'metal') m = pbr('rmetal', [.3, .3], { metal: .7, rough: .5 });
  else if (kind === 'gore') m = new THREE.MeshPhysicalMaterial({ color: '#5a0a08', roughness: .25, clearcoat: .8, clearcoatRoughness: .2, sheen: .4, sheenColor: new THREE.Color('#ff6a5a') });
  else m = pbr('concrete', [.2, .2], { color: '#9a958c' });
  return (MATS[kind] = m);
}
const SIZE = { glass: [.32, .025, .26], wood: [.09, .07, .62], metal: [.22, .04, .18], gore: [.2, .14, .17], concrete: [.22, .18, .2] };
// e: { t, at:[x,y,z], n, kind, v:[x,y,z] (mean velocity), spread, size (scale), seed, up }
export function makeShatter(scene, e, statics) {
  const n = Math.max(4, Math.round((e.n || 24) * (globalThis._opts?.physK ?? 1))), kind = e.mat || 'glass', sz = SIZE[kind] || SIZE.concrete, k = e.size || 1;
  const geo = kind === 'gore' ? new THREE.IcosahedronGeometry(.5, 1) : new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(geo, debrisMat(kind), n); inst.castShadow = kind !== 'glass'; inst.receiveShadow = true; inst.visible = false; inst.frustumCulled = false;
  scene.add(inst);
  const rnd = R32(e.seed || Math.round(e.t * 997));
  const dims = Array.from({ length: n }, () => sz.map(d => d * k * (.55 + rnd() * .9)));
  const build = () => {
    const w = newWorld(statics); const bodies = []; const r = R32(e.seed || Math.round(e.t * 997)); for (let i = 0; i < n * 3; i++) r();
    for (let i = 0; i < n; i++) {
      const d = dims[i]; const b = new CANNON.Body({ mass: .05 + d[0] * d[1] * d[2] * 20, collisionFilterGroup: GROUP_DYN, collisionFilterMask: GROUP_STATIC | GROUP_DYN, linearDamping: .05, angularDamping: .1 });
      b.addShape(new CANNON.Box(new CANNON.Vec3(d[0] / 2, d[1] / 2, d[2] / 2)));
      const sp = e.spread ?? 1.2, area = e.area || [.6, .6, .6];
      b.position.set(e.at[0] + (r() - .5) * area[0], e.at[1] + (r() - .5) * area[1], e.at[2] + (r() - .5) * area[2]);
      b.quaternion.setFromEuler(r() * 6.28, r() * 6.28, r() * 6.28);
      const v = e.v || [0, 4, 0];
      b.velocity.set(v[0] + (r() - .5) * 8 * sp, v[1] + r() * 6 * sp * (e.up ?? 1), v[2] + (r() - .5) * 8 * sp);
      b.angularVelocity.set((r() - .5) * 30, (r() - .5) * 30, (r() - .5) * 30);
      b.sleepSpeedLimit = .3; b.sleepTimeLimit = .4;
      w.addBody(b); bodies.push(b);
    }
    return { world: w, bodies };
  };
  const sim = new Sim(e.t, build);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sx = new THREE.Vector3();
  return {
    update(t) {
      if (t < e.t) { inst.visible = false; return; }
      inst.visible = true; const st = sim.at(Math.min(t, e.t + (e.life || 12)));
      st.bodies.forEach((b, i) => { P.set(b.position.x, b.position.y, b.position.z); Q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); Sx.set(...dims[i]); if (kind === 'gore') Sx.multiplyScalar(1.6); M.compose(P, Q, Sx); inst.setMatrixAt(i, M); });
      inst.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------------- breakable door ----------------
// d: { id, at:[x,y,z] (bottom centre of the opening), rot, w, h, mat:'wood'|'metal', hits:[t..], breakT, dir:+1|-1 (push direction along local +z), frame:true, window }
export function makeDoor(scene, d, statics) {
  const grp = new THREE.Group(); grp.position.set(...d.at); grp.rotation.y = d.rot || 0; scene.add(grp);
  const W = d.w || 3.4, H = d.h || 7.2, T = .22, metal = d.mat === 'metal';
  const frameMat = metal ? pbr('rmetal', [1, 2], { metal: .6, rough: .55, color: '#8a8f94' }) : pbr('planks', [.5, 2], { color: '#7a6450' });
  if (d.frame !== false) {
    const fb = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .5), frameMat); m.position.set(x, y, 0); m.castShadow = m.receiveShadow = true; grp.add(m); };
    fb(.32, H + .3, -W / 2 - .16, (H + .3) / 2); fb(.32, H + .3, W / 2 + .16, (H + .3) / 2); fb(W + .64, .32, 0, H + .16);
  }
  // leaf pieces (local coords relative to the opening's bottom centre)
  const pieces = [];
  const leafMat = metal ? pbr('rmetal', [1, 2], { metal: .75, rough: .45, color: '#9aa0a6' }) : pbr('planks', [1, 2.2], { color: '#c8ab8c' });
  if (metal) {
    pieces.push({ size: [W - .06, H - .06, T], pos: [0, H / 2, 0], mat: leafMat });
  } else {
    const n = 5, pw = (W - .06) / n;
    for (let i = 0; i < n; i++) pieces.push({ size: [pw - .03, H - .06, T], pos: [-W / 2 + .03 + pw * (i + .5), H / 2, 0], mat: leafMat, crack: i });
    for (const y of [H * .22, H * .72]) pieces.push({ size: [W - .2, .5, T * .8], pos: [0, y, -T * .9 * (d.dir || 1)], mat: leafMat, brace: true });
  }
  for (const p of pieces) { const m = new THREE.Mesh(new THREE.BoxGeometry(...p.size), p.mat); m.castShadow = m.receiveShadow = true; m.position.set(...p.pos); grp.add(m); p.mesh = m; }
  if (metal && d.window !== false) { const g = new THREE.Mesh(new THREE.BoxGeometry(W * .34, H * .16, T * 1.2), new THREE.MeshStandardMaterial({ color: '#0b0d0e', roughness: .2, metalness: .3 })); g.position.set(0, H * .72, 0); pieces[0].mesh.add(g); g.position.set(0, H * .22, 0); }
  grp.updateMatrixWorld(true);
  const dir = d.dir || 1, hits = d.hits || [], bt = d.breakT ?? 1e9;
  // physics after the break: every piece becomes a rigid body thrown along local +z*dir
  const build = () => {
    const w = newWorld(statics); const r = R32(d.seed || 5); const bodies = [];
    for (const p of pieces) {
      const b = new CANNON.Body({ mass: metal ? 14 : 1.2, collisionFilterGroup: GROUP_DYN, collisionFilterMask: GROUP_STATIC | GROUP_DYN, angularDamping: .2, linearDamping: .05 });
      b.addShape(new CANNON.Box(new CANNON.Vec3(...p.size.map(x => x / 2))));
      const wp = new THREE.Vector3(...p.pos).applyMatrix4(grp.matrixWorld); b.position.set(wp.x, wp.y, wp.z);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, d.rot || 0, 0)); b.quaternion.set(q.x, q.y, q.z, q.w);
      const fwd = new THREE.Vector3(0, 0, dir).applyQuaternion(q);
      const sp = (d.force || 1) * (metal ? 9 : 13) * (.7 + r() * .6), up = metal ? 1.5 : 2 + r() * 3;
      const hgt = (p.pos[1] / H);
      b.velocity.set(fwd.x * sp * (metal ? .6 + hgt * .7 : 1), up, fwd.z * sp * (metal ? .6 + hgt * .7 : 1));
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      const av = metal ? 4.5 : 8 + r() * 8; b.angularVelocity.set(side.x * av * dir + (r() - .5) * 3, (r() - .5) * 6, side.z * av * dir + (r() - .5) * 3);
      b.sleepSpeedLimit = .3; w.addBody(b); bodies.push(b);
    }
    return { world: w, bodies };
  };
  const sim = new Sim(bt, build);
  const inv = new THREE.Matrix4();
  // splinters spawned at every hit (wood) / sparks for metal handled by the runtime via d.hits
  return {
    grp, pieces,
    update(t) {
      if (t < bt) {
        // impacts: damped wobble + accumulating damage
        let off = 0, dmg = 0;
        for (const th of hits) { if (t < th) break; const x = t - th; off += Math.exp(-x * 9) * Math.sin(x * 38) * .16; dmg++; }
        const k = dmg / Math.max(1, hits.length);
        pieces.forEach((p, i) => {
          const m = p.mesh; m.position.set(...p.pos); m.rotation.set(0, 0, 0);
          if (metal) { m.position.z += off * dir * 1.2 + k * .25 * dir; m.rotation.x = -off * .05 * dir - k * .06 * dir; m.scale.set(1, 1, 1 + k * .6); }
          else {
            const jit = Math.sin(i * 12.9 + 3) * .5 + .5;
            m.position.z += (off * (1 + jit) + k * k * .35 * jit) * dir; m.rotation.y = (k * k * .18 * (jit - .5)) * dir; m.rotation.x = k * .05 * (jit - .5);
            if (p.brace && k > .6) m.rotation.z = (i % 2 ? 1 : -1) * k * .12;
          }
        });
        return;
      }
      const st = sim.at(Math.min(t, bt + 10));
      grp.updateMatrixWorld(true); inv.copy(grp.matrixWorld).invert();
      st.bodies.forEach((b, i) => {
        const m = pieces[i].mesh; const M = new THREE.Matrix4().compose(new THREE.Vector3(b.position.x, b.position.y, b.position.z), new THREE.Quaternion(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w), new THREE.Vector3(1, 1, 1));
        inv.clone().multiply(M).decompose(m.position, m.quaternion, new THREE.Vector3());
      });
    },
  };
}

// ---------------- dropped prop ----------------
// e: { t, mesh (THREE.Object3D already in scene), p0:[..], q0:[..], v:[..], spin:[..], half:[..], mass }
export function makeDrop(e, statics) {
  const build = () => {
    const w = newWorld(statics);
    const b = new CANNON.Body({ mass: e.mass || .6, collisionFilterGroup: GROUP_DYN, collisionFilterMask: GROUP_STATIC, angularDamping: .3 });
    b.addShape(new CANNON.Box(new CANNON.Vec3(...(e.half || [.25, .1, .4])))); b.position.set(...e.p0); if (e.q0) b.quaternion.set(...e.q0);
    const v = e.v || [0, 0, 0]; b.velocity.set(...v); const s = e.spin || [3, 1, 5]; b.angularVelocity.set(...s);
 w.defaultContactMaterial.restitution = e.bounce ?? .35;
    w.addBody(b); return { world: w, b, contacts: [] };
  };
  const sim = new Sim(e.t, build);
  return { at(t) { const st = sim.at(t); return st.b; } };
}
