// Optional stylised horror effects. Nothing here requires external assets.
import * as THREE from 'three';

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const random = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const meat = () => new THREE.MeshPhysicalMaterial({ color: '#752019', roughness: .45, metalness: .03, clearcoat: .6, clearcoatRoughness: .32 });
const bone = () => new THREE.MeshStandardMaterial({ color: '#c7b49a', roughness: .65 });
export function setGoreTime() {} // all effect updates receive explicit time
export function fleshTex() { return null; }
export function fleshMat() { return meat(); }

// A compact procedural stylised organ cluster. Attach to the front of a torso.
export function makeOrgans(seed = 1, options = {}) {
  const rng = random(Math.floor(seed * 1000) || 1), grp = new THREE.Group(), tissue = meat(), pale = bone();
  const opening = new THREE.Mesh(new THREE.SphereGeometry(.56, 20, 12), new THREE.MeshStandardMaterial({ color: '#280909', roughness: .65 }));
  opening.scale.set(1.05, 1.2, .18); opening.position.z = .53; grp.add(opening);
  const pieces = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.15 + rng() * .12, 12, 8), tissue);
    m.scale.set(.8 + rng() * .5, 1 + rng() * .65, .45); m.position.set((i % 2 ? -.22 : .22), .22 - i * .17, .62 + rng() * .07);
    m.rotation.z = (rng() - .5) * .8; m.castShadow = true; grp.add(m); pieces.push(m);
  }
  for (let i = 0; i < 4; i++) {
    const pts = []; const start = i * .6;
    for (let j = 0; j <= 24; j++) { const u = j / 24; pts.push(new THREE.Vector3(Math.sin(start + u * Math.PI * 2) * (.16 + i * .055), .03 - u * (.45 + i * .1), .68 + Math.cos(start + u * 5) * .055)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, .045 + i * .005, 7, false), tissue);
    m.castShadow = true; grp.add(m); pieces.push(m);
  }
  if (options.ribs !== false) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .28, 3, 6), pale);
    rib.position.set(side * (.42 + i * .025), .36 - i * .22, .61); rib.rotation.z = side * -.9; grp.add(rib);
  }
  grp.visible = false;
  return { grp, update(k, t = 0) { k = clamp(k); grp.visible = k > 0; const base = grp.userData.fitScale || 1; grp.scale.set(base, base * Math.max(.001, k), base); for (let i = 0; i < pieces.length; i++) pieces[i].rotation.y = Math.sin(t * 2 + i) * .04 * k; } };
}

export function makeStumpX(radius = .3, o = {}) {
  const r = clamp(radius, .08, 2), group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .8, r * .24, 14), meat()); group.add(outer);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r * .27, r * .27, r * .28, 9), bone()); core.position.y = r * .14; group.add(core);
  return group;
}

// Detach a triangle subset weighted to a bone and its descendants. Vertices are
// baked at the current pose; the piece then moves independently. This is an
// approximate visual effect, not a watertight surgical mesh cut.
export function bakeLimb(sk, canonicalBone) {
  const target = sk.bones[canonicalBone]; if (!target) return null;
  sk.root.updateMatrixWorld(true);
  const joint = target.getWorldPosition(new THREE.Vector3()), group = new THREE.Group();
  const isDesc = b => { while (b) { if (b === target) return true; b = b.parent; } return false; };
  for (const mesh of sk.meshes || []) {
    const geo = mesh.geometry, p = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
    if (!p || !si || !sw || !mesh.skeleton) continue;
    mesh.skeleton.update();
    const affected = new Set(mesh.skeleton.bones.map((b, i) => isDesc(b) ? i : -1).filter(i => i >= 0));
    if (!affected.size) continue;
    const weight = idx => { let w = 0; for (let j = 0; j < 4; j++) if (affected.has(si.getComponent(idx, j))) w += sw.getComponent(idx, j); return w; };
    const index = geo.index, count = index ? index.count : p.count, uv = geo.attributes.uv;
    const pos = [], uvs = [], temp = new THREE.Vector3();
    for (let i = 0; i + 2 < count; i += 3) {
      const ids = [0, 1, 2].map(j => index ? index.getX(i + j) : i + j);
      if ((weight(ids[0]) + weight(ids[1]) + weight(ids[2])) / 3 < .5) continue;
      for (const id of ids) {
        temp.fromBufferAttribute(p, id); mesh.applyBoneTransform(id, temp); temp.applyMatrix4(mesh.matrixWorld).sub(joint);
        pos.push(temp.x, temp.y, temp.z); if (uv) uvs.push(uv.getX(id), uv.getY(id));
      }
    }
    if (!pos.length) continue;
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uvs.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    out.computeVertexNormals(); out.computeBoundingBox();
    const m = new THREE.Mesh(out, Array.isArray(mesh.material) ? mesh.material[0] : mesh.material); m.castShadow = m.receiveShadow = true; group.add(m);
  }
  if (!group.children.length) return null;
  group.position.copy(joint); group.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  const child = target.children.find(x => x.isBone), dir = child ? child.getWorldPosition(new THREE.Vector3()).sub(joint).normalize() : new THREE.Vector3(0, -1, 0);
  if (dir.lengthSq() < .01) dir.set(0, -1, 0);
  return { mesh: group, joint, dir, rad: clamp(Math.min(size.x || .2, size.z || .2) * .42, .1, .8), q0: new THREE.Quaternion() };
}

export function placeOnBody(sk, object, { y = .5, side = 0 } = {}) {
  const host = sk.bones.Chest || sk.bones.Spine || sk.bones.Hips;
  if (!host) { sk.model.add(object); return; }
  host.add(object);
  // Effect geometry is expressed in studio units; bones are in model units.
  object.userData.fitScale = 1 / sk.k;
  object.scale.setScalar(object.userData.fitScale);
  object.position.set(side * .06, (y - .5) * .3, .11);
}

export function makeCut(sk, options = {}) {
  const mesh = new THREE.Group();
  const cut = new THREE.Mesh(new THREE.SphereGeometry(.25, 14, 8), meat());
  cut.scale.set(1, .3, .10); mesh.add(cut);
  placeOnBody(sk, mesh, options);
  return { mesh, update(dt) { mesh.visible = dt >= 0; cut.scale.x = .3 + .7 * clamp(dt / (options.dur || .2)); } };
}

// Sources consumed by gore.js's deterministic particle renderer.
export function arterial(t0, dur, origin, dir, ground, seed = 1, flow = 1) {
  const out = [], n = Math.min(32, Math.max(0, Math.ceil(dur / .55)));
  for (let i = 0; i < n; i++) out.push({ t0: t0 + i * .55, dur: .28, n: Math.max(1, Math.round(12 * flow)), seed: seed + i * 13, speed: 3.2, spread: .28, ground, dir, origin, size: .65 });
  return out;
}
