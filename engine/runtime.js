// Browser runtime: loads compiled episode JSON and renders any time t deterministically (window.renderFrame).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { glowSprite } from './fx.js';
import { preloadTex, FilmShader, makeDecal, updateDecal, woundMesh, bandageMesh, updateBandage, dropMesh } from './fx.js';
import { makeChar, drawFace, reseed, clamp, lerp, smooth, easeInOut, easeOut, easeOutBack } from './lib.js';
import { initMaterials, HAND_PROPS } from './props.js';
import { TOY_HAND_PROPS } from './toy-kitchen.js';
import { preloadModels } from './models.js';
import { buildSet } from './sets.js';
import { SETS } from './setdata.mjs';
import { EXPR, blendPose, clipPose } from './anim.js';
import { drawOverlay } from './overlay.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { preloadSkinned, preloadMocap, makeSkinned, driveSkinned, hideProxy, bonePos, findEyes } from './skinned.js';
import { Sim, makeRagdoll, poseFromRagdoll, captureInit, partMeshes, makeShatter, makeDoor, makeDrop } from './physics.js';
import { preloadPH, PH_LIST, ph, makeGuts, makeCRT, makeTelevision, loadFeed, reachArm, makeStump } from './s3.js';
import { makeOrgans, makeStumpX, bakeLimb, makeCut, arterial, setGoreTime, placeOnBody } from './gore2.js';
import { makeFire, fireK, makeBloodPool, drawSprays, drawSparks, JOINT, SPRAY_DIR, localToWorld, dirToWorld, stumpMesh, limbFlight } from './gore.js';
const DECAL_KINDS = ['blood', 'pool', 'splat', 'drip', 'trail'];

const trap = (k, a = .14) => { const v = 1 / (1 - a); return k < a ? v * k * k / (2 * a) : k > 1 - a ? 1 - v * (1 - k) * (1 - k) / (2 * a) : v * (a / 2 + k - a); };
const S = Math.sin, V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
let C, renderer, composer, aoPass, camera, overlayG, filmPass, bloomPass, renderPass;
let cur = { idx: -1 };

window.initStudio = async (compiled, opts = {}) => { window._dbg = opts.dbg;
  C = compiled;
  const w = opts.w || 810, h = opts.h || 1440;
  await document.fonts.load('900 40px Inter'); await document.fonts.load('800 40px Inter'); await document.fonts.load('700 40px Inter'); await document.fonts.load('600 40px Inter');
  window._opts = opts;
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: opts.aa ?? true, preserveDrawingBuffer: opts.pdb ?? true, powerPreference: 'high-performance' });
  window._renderer = renderer; window._THREE = THREE; window._camera = () => camera; if (opts.texMax) renderer.capabilities.maxTextureSize = opts.texMax; // weak PCs: textures are downscaled on upload
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.enabled = !opts.noShadow; renderer.shadowMap.autoUpdate = false; // shadows are refreshed once per frame in renderFrame (the AO normal pass would otherwise redo them)
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  camera = new THREE.PerspectiveCamera(40, w / h, .1, 400);
  await preloadTex([...new Set(C.scenes.flatMap(sc => SETS[sc.set]?.tex || []))]);
  await preloadModels();
  window._ph = ph;
  const skinConfigs = C.scenes.flatMap(sc => Object.values(sc.actors || {}).map(a => a.app?.skinned).filter(Boolean));
  await preloadSkinned([...new Set(skinConfigs.map(o => o.src).filter(Boolean))]);
  await preloadMocap([...new Set(skinConfigs.map(o => o.mocapFile).filter(Boolean))]);
  await preloadPH([...new Set([...C.scenes.flatMap(sc => [...(SETS[sc.set]?.ph || PH_LIST.slice(0, 27)), ...(sc.models || []).map(m => m.src), ...(sc.tvs || []).map(tv => tv.model)]), ...(C.extraPH || [])].filter(Boolean))]);
  C.feedData = {}; for (const f of C.feeds || []) { C.feedData[f.id] = await loadFeed(f.dir, f.fps || 12); if (f.bright != null) C.feedData[f.id].bright = f.bright; if (f.glow != null) C.feedData[f.id].glow = f.glow; }
  Object.assign(HAND_PROPS, TOY_HAND_PROPS);
  HAND_PROPS.multitool ||= multitoolProp;
  HAND_PROPS.vhs ||= () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.62, .14, 1.05), new THREE.MeshStandardMaterial({ color: '#111', roughness: .5 })); g.add(b);
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#e8e0c8'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#8a1010'; x.font = '900 40px Inter'; x.textAlign = 'center'; x.fillText('ОБЪЕКТ 4', 128, 56); x.fillText('· 86 ·', 128, 104);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const l = new THREE.Mesh(new THREE.PlaneGeometry(.5, .8), new THREE.MeshStandardMaterial({ map: tx, roughness: .8 })); l.rotation.x = -Math.PI / 2; l.rotation.z = Math.PI / 2; l.position.y = .075; g.add(l);
    g.rotation.x = -Math.PI / 2; const w = new THREE.Group(); w.add(g); w.position.y = -.12; return w; };
  composer = new EffectComposer(renderer); composer.setSize(w, h);
  renderPass = new RenderPass(new THREE.Scene(), camera); composer.addPass(renderPass);
  if (opts.ao) {
    aoPass = new GTAOPass(new THREE.Scene(), camera, w, h); aoPass.output = GTAOPass.OUTPUT.Default; aoPass.blendIntensity = .9;
    aoPass.updateGtaoMaterial({ radius: .9, distanceExponent: 1.5, thickness: 1.5, scale: 1, samples: 12 });
    composer.addPass(aoPass);
    const k = opts.aoScale ?? .5; if (k !== 1) aoPass.setSize(Math.round(w * k), Math.round(h * k));
    if (opts.aoSamples) aoPass.updateGtaoMaterial({ samples: opts.aoSamples });
    aoPass.updatePdMaterial({ samples: opts.pdSamples ?? 6, rings: 2 });
  }
  if (opts.bloom !== false) { const bk = opts.bloomScale ?? .5; bloomPass = new UnrealBloomPass(new THREE.Vector2(Math.round(w * bk), Math.round(h * bk)), .55, .5, .82); composer.addPass(bloomPass); }
  composer.addPass(new OutputPass());
  if (opts.aa === false && opts.fxaa !== false) { const fx = new ShaderPass(FXAAShader); fx.material.uniforms.resolution.value.set(1 / w, 1 / h); composer.addPass(fx); }
  filmPass = new ShaderPass(FilmShader); filmPass.uniforms.res.value.set(w, h); composer.addPass(filmPass);
  { const ov = document.getElementById('ov'), k = opts.ovScale || 1; if (k !== 1) { ov.width = Math.round(1080 * k); ov.height = Math.round(1920 * k); } overlayG = ov.getContext('2d'); if (k !== 1) overlayG.setTransform(k, 0, 0, k, 0, 0); }
  initMaterials();
  return true;
};

// ---------------- scene management ----------------
function sceneAt(t) { let i = 0; while (i < C.scenes.length - 1 && t >= C.scenes[i + 1].t0) i++; return i; }
function loadScene(i) {
  const sc = C.scenes[i];
  reseed(1000 + i * 17);
  const scene = new THREE.Scene();
  const set = buildSet(scene, sc.set, sc.light);
  // Additional local, static GLB props; registered names work with set show/hide/move.
  for (const spec of sc.models || []) {
    const m = ph(spec.src, { scale: spec.scale ?? 1, tint: spec.tint, dark: spec.dark, rough: spec.rough });
    m.position.set(...spec.at); m.rotation.y = spec.rot || 0; m.visible = spec.visible !== false;
    scene.add(m); if (spec.id) set.props[spec.id] = m;
  }
  renderer.toneMappingExposure = set.exposure || 1;
  camera.far = set.far || 400; camera.near = set.near || .1; camera.updateProjectionMatrix(); // big outdoor maps need a longer far plane
  for (const [col, inten, pos] of sc.fills || []) { const L = new THREE.PointLight(col, inten, 30, 1.6); L.position.set(...pos); scene.add(L); } // extra soft fills per scene
  { const T = new THREE.SpotLight('#fff0d8', 0, 70, .5, .6, 1.4); const tg = new THREE.Object3D(); scene.add(tg); T.target = tg; scene.add(T); scene.userData.torch = T; } // cam-mounted torch (cam.torch)
  const sk = window._opts?.shadowK ?? 1; if (sk !== 1) scene.traverse(o => { if (o.isLight && o.castShadow) o.shadow.mapSize.multiplyScalar(sk); });
  const actors = {};
  for (const [id, A] of Object.entries(sc.actors)) {
    const ch = makeChar(scene, A.app);
    actors[id] = { id, A, ch, held: { L: null, R: null }, propCache: {}, faceKey: '', seed: (id.charCodeAt(0) * 7 + id.length * 13) % 10 };
    if (A.app.skinned) { const sk = makeSkinned(scene, { seed: id.length * 1.7, ...A.app.skinned }); if (sk) { hideProxy(ch); actors[id].sk = sk; } else console.warn('skinned FAIL', id, A.app.skinned.src); }
  }
  const statics = { floorY: sc.floorY ?? 0, boxes: [...(set.colliders || []), ...(sc.colliders || [])] };
  const s3 = { statics, doors: (sc.doors || []).map(d => makeDoor(scene, d, statics)), shatters: (sc.world || []).filter(e => e.kind === 'shatter').map(e => makeShatter(scene, e, statics)), tvs: [], drops: [] };
  for (const tv of sc.tvs || []) {
    const m = tv.model ? ph(tv.model, { scale: tv.scale || 1 }) : makeTelevision(); if (!tv.model) m.scale.setScalar(tv.scale || 1);
    m.position.set(...tv.at); m.rotation.y = tv.rot || 0; scene.add(m); if (tv.id) set.props[tv.id] = m;
    const crt = makeCRT(tv.screen?.w || 1.2, tv.screen?.h || .9); crt.mesh.position.set(...(tv.screen?.pos || [0, 1.5, .44])); m.add(crt.mesh);
    const L = new THREE.PointLight('#bcd4ff', 0, 16, 1.6); L.position.set(...(tv.screen?.pos || [0, 1.5, .6])); L.position.z += 1.2; m.add(L);
    s3.tvs.push({ tv, crt, L });
  }
  for (const e of (sc.world || []).filter(e => e.kind === 'drop')) { const mesh = HAND_PROPS[e.prop] ? HAND_PROPS[e.prop]() : new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .8)); mesh.traverse(o => { if (o.isMesh) o.castShadow = true; }); mesh.visible = false; scene.add(mesh); s3.drops.push({ e, mesh, sim: makeDrop({ ...e, p0: e.at, q0: e.q0 }, statics) }); }
  // cart parts bookkeeping
  for (const cart of Object.values(set.props)) if (cart && cart.userData && cart.userData.parts) { for (const p of Object.values(cart.userData.parts)) { p.userData.base = p.position.clone(); p.userData.baseScale = p.scale.clone(); } }
  // inspection light (viewer «рабочий свет» / my map checks): flat ambient + a lamp riding on the camera; 0 = off
  { const amb = new THREE.HemisphereLight('#ffffff', '#8a8a8a', 0), head = new THREE.PointLight('#fff4e8', 0, 40, 1.2); amb.userData.inspect = head.userData.inspect = true; scene.add(amb, head); scene.userData.inspect = { amb, head }; }
  renderPass.scene = scene; window._scene = scene; if (aoPass) aoPass.scene = scene;
  const goreDecals = [];
  // severed parts: precompute landing spots for blood splats
  for (const a of Object.values(actors)) for (const e of a.A.ev) if (e.cmd === 'dismember') { const L = limbPlan(a, e); goreDecals.push({ kind: 'splat', at: [L.land[0], L.ground0, L.land[2]], r: .75, rot: e.t * 3, t: e.t + L.tl, grow: .15 }); if (e.arg.pool !== false) goreDecals.push({ kind: 'pool', at: [L.body[0], L.ground0, L.body[2]], r: e.arg.pool ?? 1.5, rot: e.t, t: e.t + .3, grow: 4 }); }
  const decals = [...(sc.world || []).filter(e => DECAL_KINDS.includes(e.kind)).map(e => e.kind === 'blood' ? { ...e, kind: 'pool' } : e), ...goreDecals].map((e, i) => { const m = makeDecal(e, i); scene.add(m); return m; });
  const fires = (sc.world || []).filter(e => e.kind === 'fire').map((e, i) => { const f = makeFire(e.scale || 1, { smoke: e.smoke, light: e.light, intensity: e.intensity, tall: e.tall, wind: e.wind, n: e.n, tint: e.tint, nSmoke: e.nSmoke, color: e.color }); f.position.set(...(e.at || [0, 0, 0])); const host = e.prop ? set.props[e.prop] : null; (host || scene).add(f); return { f, e }; });
  const bloodPool = makeBloodPool(scene, 1800); const acidPool = makeBloodPool(scene, 400, '#8cff2a'); const waterPool = makeBloodPool(scene, 400, '#a8bcb4'); { const m = waterPool.im.material; m.emissiveIntensity = .12; m.roughness = .05; m.transparent = true; m.opacity = .55; m.depthWrite = false; }
  const drops = Array.from({ length: 10 }, () => { const m = dropMesh(); m.visible = false; scene.add(m); return m; });
  const dropSplats = Array.from({ length: 60 }, (_, i) => { const m = makeDecal({ kind: 'splat', at: [0, 0, 0], r: .22 + (i % 3) * .06, rot: i * 1.7, t: 0, grow: .08 }, 500 + i); m.visible = false; scene.add(m); return m; });
  if (cur.scene) cur.scene.traverse(o => { if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.(); });
  cur = { idx: i, sc, scene, set, actors, shotCache: new Map(), decals, drops, dropSplats, fires, bloodPool, acidPool, waterPool, s3 };
  { const all = buildSprays(sc, actors); cur.sprays = all.filter(x => !x.acid && !x.water); cur.acid = all.filter(x => x.acid); cur.water = all.filter(x => x.water); }
}

// ---------------- season 3: ragdoll / IK / skinned / guts wrapper ----------------
// put the proxy rig parts back where they were before a ragdoll took them over (actor gets up / jump back in time)
function restoreRig(a) { for (const [h, p, q, sc] of a.rigSave || []) { h.position.copy(p); h.quaternion.copy(q); h.scale.copy(sc); } a.ch.root.updateMatrixWorld(true); }
function applyActor(a, t) {
  const s = evalActor(a, t), ch = a.ch;
  if (s.rag && t >= s.rag.t0) {
    if (!a.rag || a.rag.t0 !== s.rag.t0) { if (a.rag) restoreRig(a); applyActorBase(a, s.rag.t0);
      { const M = partMeshes(ch); a.rigSave = Object.entries(M).filter(([, m]) => m).map(([k, m]) => { const h = k === 'torso' ? m : m.parent; return [h, h.position.clone(), h.quaternion.clone(), h.scale.clone()]; }); }
      const init = captureInit(ch); a.rag = { t0: s.rag.t0, sim: new Sim(s.rag.t0, makeRagdoll(cur.s3.statics, init, { seed: a.seed + 3, ...s.rag })) }; a._t = undefined; evalActor(a, t); }
    applyActorBase(a, t);
    const st = a.rag.sim.at(Math.min(t, s.rag.t0 + (s.rag.life || 14)));
    poseFromRagdoll(ch, st.B);
  } else { if (a.rag) { restoreRig(a); a.rag = null; } applyActorBase(a, t); }
  if (s.reach && s.visible) {
    const r = s.reach, k = smooth(clamp((t - r.t0) / (r.ease || .25))) * (r.until != null ? 1 - smooth(clamp((t - r.until) / .25)) : 1);
    const tgt = (spec) => { if (Array.isArray(spec)) return V(spec); const [id, part = 'torso'] = String(spec).split('.'); const b = cur.actors[id]; if (!b) return null; const m = part === 'head' ? b.ch.hm : part === 'torso' ? b.ch.torso : b.ch[part]; return m ? m.getWorldPosition(new THREE.Vector3()) : null; };
    ch.root.updateMatrixWorld(true);
    for (const side of ['L', 'R']) { const spec = r[side] ?? r.both; if (spec == null) continue; const p = tgt(spec); if (p) reachArm(side === 'L' ? ch.armL : ch.armR, p, k); }
  }
  // glowing eyes (possession): two additive sprites on the head
  if (s.eyeGlow && s.visible) {
    // skinned actors: sprites live on the real Head bone at ray-cast eye positions (old code glued them to the hidden proxy head -> cheeks)
    const EL = a.sk ? findEyes(a.sk) : null;
    if (!a.eyes) { a.eyes = [0, 1].map(i => { const sp = glowSprite('#ffffff', .5, .95); if (EL) { a.sk.bones.Head.add(sp); sp.position.copy(EL[i]); } else ch.hm.add(sp); return sp; }); }
    const g = s.eyeGlow, k = smooth(clamp((t - g.t0) / (g.dur ?? .6))), off = g.off || (ch.o?.model && !ch.o.model.keepHead ? [.095, .0, .63] : [.131, .02, .62]), sc = EL ? 1 / a.sk.eyeScale : 1, sz = (g.size ?? .5) * (EL ? .55 : .6);
    a.eyes.forEach((sp, i) => { sp.visible = true; sp.material.color.set(g.color); sp.material.opacity = k * (.85 + .15 * Math.sin(t * 9 + i)); if (!EL) sp.position.set((i ? -1 : 1) * off[0], off[1], off[2]); sp.scale.setScalar(sz * sc * (.9 + .1 * Math.sin(t * 13))); });
  } else if (a.eyes) a.eyes.forEach(sp => sp.visible = false);
  if (s.gut && t >= s.gut.t0) {
    if (!a.guts) { a.guts = s.gut.old ? makeGuts(a.seed + 1, s.gut) : makeOrgans(a.seed + 1, s.gut); if (a.sk && !s.gut.old) placeOnBody(a.sk, a.guts.grp, { y: s.gut.y ?? .5, side: s.gut.side ?? 0 }); else ch.torso.add(a.guts.grp); }
    a.guts.grp.visible = s.visible; a.guts.update(smooth(clamp((t - s.gut.t0) / (s.gut.dur || .8))), t);
  } else if (a.guts) a.guts.grp.visible = false;
  if (a.sk) { const DO = { full: !!(s.rag && t >= s.rag.t0), boneScale: s.boneScale, armW: a.A.app.skinned.armW, elbow: a.A.app.skinned.elbow };
    const sev = a.A.ev.filter(e => e.cmd === 'dismember' && SKP[e.arg.part || 'armL']);
    if (sev.length) skinGore(a, s, t, sev, DO); else driveSkinned(a.sk, ch, s, t, DO); }
  if (a.sk && a.sk.bones.Neck && s.boneScale && s.boneScale.Head !== undefined && s.boneScale.Head < .2) {
    if (!a.stump) { a.stump = makeStump(.5); ch.torso.parent && cur.scene.add(a.stump); }
    const hp = bonePos(a.sk, 'Neck'), hq = a.sk.bones.Neck.getWorldQuaternion(new THREE.Quaternion());
    if (hp) { const up = new THREE.Vector3(0, 1, 0).applyQuaternion(hq); a.stump.position.copy(hp).addScaledVector(up, .35 * (a.sk.k / 3)); a.stump.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up); a.stump.scale.setScalar(a.sk.k / 3); a.stump.visible = s.visible !== false; }
  } else if (a.stump) a.stump.visible = false;
}
function multitoolProp() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.32, .16, .62), new THREE.MeshStandardMaterial({ color: '#2a2d31', roughness: .4, metalness: .6 })); g.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(.34, .18, .3), new THREE.MeshStandardMaterial({ color: '#d4661c', roughness: .6 })); grip.position.z = -.2; g.add(grip);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.22, .18), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#3aff9a', emissiveIntensity: 1.6 })); scr.rotation.x = -Math.PI / 2; scr.position.set(0, .085, .1); g.add(scr);
  for (const x of [-.07, .07]) { const pr = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .22, 6), new THREE.MeshStandardMaterial({ color: '#c8c8c8', metalness: 1, roughness: .25 })); pr.rotation.x = Math.PI / 2; pr.position.set(x, 0, .41); g.add(pr); }
  g.rotation.x = -Math.PI / 2; const w = new THREE.Group(); w.add(g); w.position.y = -.1; return w;
}
function applyS3(t) {
  const S3 = cur.s3; if (!S3) return;
  for (const D of S3.doors) D.update(t);
  for (const sh of S3.shatters) sh.update(t);
  for (const d of S3.drops) { if (t < d.e.t || (d.e.until && t > d.e.until)) { d.mesh.visible = false; continue; } d.mesh.visible = true; const b = d.sim.at(Math.min(t, d.e.t + 8)); d.mesh.position.set(b.position.x, b.position.y, b.position.z); d.mesh.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w); }
  for (const T of S3.tvs) {
    const tv = T.tv, feed = C.feedData?.[tv.feed]; let mode = 'off', tt = 0;
    if (tv.on != null && t >= tv.on) mode = 'static';
    if (tv.tape != null && t >= tv.tape && feed) { tt = (t - tv.tape) * (tv.speed || 1); mode = tt < feed.imgs.length / feed.fps ? 'tape' : 'static'; }
    if (tv.off != null && t >= tv.off) mode = 'off';
    T.crt.draw(mode, feed, tt, t, 3);
    const lum = mode === 'tape' ? feed.lum[Math.min(feed.lum.length - 1, Math.floor(tt * feed.fps))] : mode === 'static' ? .5 : 0;
    T.L.intensity = (tv.light ?? 14) * (mode === 'off' ? 0 : .35 + lum * 1.4) * (1 + Math.sin(t * 60) * .04);
  }
}

// ---------------- actor evaluation (pure function of t) ----------------
function evalActor(a, t) {
  if (a._t === t) return a._s;
  const A = a.A, I = A.init;
  const s = { visible: I.visible !== false, pos: [...I.pos], shades: !!I.shades, shadesT: -99, apron: !!I.apron, pack: I.pack !== false, hold: { L: null, R: null, ...(I.hold || {}) }, walk: null };
  let rotFrom = I.rot || 0, rotTo = rotFrom, rotT0 = -99, rotDur = .3;
  const rotAt = tt => rotFrom + (rotTo - rotFrom) * smooth(clamp((tt - rotT0) / rotDur));
  const setRot = (tt, to, dur) => { const r0 = rotAt(tt); rotFrom = r0; rotTo = r0 + wrapA(to - r0); rotT0 = tt; rotDur = dur; };
  let pose = { name: I.pose || 'idle', t0: -99 }, prevPose = { name: I.pose || 'idle', t0: -99 }, expr = I.expr || 'neutral';
  for (const e of A.ev) {
    if (e.t > t) break;
    const g = e.arg;
    switch (e.cmd) {
      case 'show': s.visible = true; break;
      case 'hide': s.visible = false; break;
      case 'place': s.pos = [...g.pos]; if (g.rot != null) { rotFrom = rotTo = g.rot; rotT0 = -99; } break;
      case 'turn': setRot(e.t, g, .35); break;
      case 'walk': {
        const k = clamp((t - e.t) / g.dur), dx = g.to[0] - g.from[0], dz = g.to[2] - g.from[2];
        const ke = g.ease === 'lin' ? k : g.ease === 'smooth' ? smooth(k) : g.glide ? easeInOut(k) : trap(k);
        s.pos = [lerp(g.from[0], g.to[0], ke), lerp(g.from[1], g.to[1], ke), lerp(g.from[2], g.to[2], ke)]; if (g.arc) s.pos[1] += g.arc * 4 * k * (1 - k);
        if (!g.glide && Math.hypot(dx, dz) > .05) setRot(e.t, g.face ?? Math.atan2(dx, dz), .2);
        if (k < 1) { const sp = Math.hypot(dx, dz) / Math.max(.01, g.dur); s.walk = { phase: (t - e.t) * (g.cadence || (sp > 5.2 ? 13 : 9)), glide: g.glide, run: sp > 5.2, dist: Math.hypot(dx, dz) * ke }; }
        else if (g.rot != null) setRot(e.t + g.dur, g.rot, .3);
        break;
      }
      case 'pose': prevPose = pose; pose = { name: g, t0: e.t }; break;
      case 'mocap': s.mocap = g ? { t0: e.t, ...(typeof g === 'string' ? { clip: g } : g) } : null; break;
      case 'expr': expr = g; break;
      case 'hold': Object.assign(s.hold, g); break;
      case 'shades': if (g && !s.shades) s.shadesT = e.t; s.shades = !!g; break;
      case 'apron': s.apron = !!g; break;
      case 'pack': s.pack = !!g; break;
      case 'badge': s.noBadge = !g; break;
      case 'ragdoll': s.rag = { t0: e.t, ...(g || {}) }; break;
      case 'ride': s.ride = { t0: e.t, ...g }; break;
      case 'getup': s.rag = null; break;
      case 'stop': s.stopT = g === false ? null : e.t; break;
      case 'eyes': s.eyeGlow = g ? { t0: e.t, color: '#7dff5a', size: .5, ...(typeof g === 'object' ? g : {}) } : null; break;
      case 'bone': (s.boneScale ||= {})[g.b] = g.s; break;
      case 'reach': s.reach = g ? { t0: e.t, ...g } : null; break;
      case 'gut': s.gut = { t0: e.t, ...(g || {}) }; break;
      case 'infect': s.infectT = e.t; s.infectFrom = g.from ?? 0; s.infectTo = g.to ?? 1; s.infectDur = g.dur ?? 2; break;
    }
  }
  s.rot = rotAt(t);
  if (s.ride) { const k = clamp((t - s.ride.t0) / (s.ride.dur || 1)); s.rideY = (s.ride.y0 || 0) + ((s.ride.y1 || 0) - (s.ride.y0 || 0)) * (s.ride.ease === 'smooth' ? smooth(k) : k); s.pos[1] += s.rideY; }
  if (s.infectT != null) s.infected = +((s.infectFrom||0) + clamp((t - s.infectT) / s.infectDur) * (s.infectTo - (s.infectFrom||0))).toFixed(2);
  const kb = smooth(clamp((t - pose.t0) / .25));
  { const tp = s.stopT != null ? Math.min(t, s.stopT) : t; s.pose = blendPose(clipPose(prevPose.name, tp - prevPose.t0, tp), clipPose(pose.name, tp - pose.t0, tp), kb); }
  s.poseName = pose.name; s.poseT0 = pose.t0; s.prevPoseName = prevPose.name; s.prevPoseT0 = prevPose.t0; s.expr = expr;
  a._t = t; a._s = s; return s;
}
const headPos = (a, t) => { const s = evalActor(a, t); const k = a.ch.o.scale?.[1] || 1; return V([s.pos[0], s.pos[1] + 4.7 * k + (s.pose.y || 0), s.pos[2]]); };

function lookTargetPos(target, a, t, noCam) {
  if (target == null) return null;
  if (target === 'cam') return noCam ? null : camera.position.clone();
  if (Array.isArray(target)) return V(target);
  const b = cur.actors[target]; if (!b || b === a) return null;
  if (!evalActor(b, t).visible) return null;
  return headPos(b, t);
}
function lookYaw(a, s, t, noCam) {
  const L = a.A.look || []; let i = -1; for (let k = 0; k < L.length; k++) if (L[k].t <= t) i = k;
  const ang = target => { const p = lookTargetPos(target, a, t, noCam); if (!p) return [0, 0]; const h = headPos(a, t); const dx = p.x - h.x, dz = p.z - h.z, dy = p.y - h.y; return [clamp(wrapA(Math.atan2(dx, dz) - s.rot), -1, 1), clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -.35, .35) * .6]; };
  if (i < 0) return ang(a.A.lookInit ?? null);
  const curA = ang(L[i].target), prevA = ang(i > 0 ? L[i - 1].target : (a.A.lookInit ?? null));
  const k = smooth(clamp((t - L[i].t) / .35));
  return [lerp(prevA[0], curA[0], k), lerp(prevA[1], curA[1], k)];
}
function speechOf(id, t) { for (const l of C.speech) if (l.spk === id && t >= l.t0 - .05 && t <= l.t1 + .1) return l; return null; }
function mouthAt(l, t) { if (!l) return 0; const i = Math.floor((t - l.t0) * l.envRate); return i >= 0 && i < l.env.length ? l.env[i] : 0; }

function applyActorBase(a, t) {
  const s = evalActor(a, t), ch = a.ch, P = s.pose;
  ch.root.visible = s.visible; if (!s.visible) return;
  ch.root.position.set(s.pos[0], s.pos[1] + (P.y || 0), s.pos[2]); ch.root.rotation.set(0, s.rot, 0);
  const aL = [...P.aL], aR = [...P.aR], lL = [...P.lL], lR = [...P.lR], hd = [...P.hd];
  let lean = P.lean || 0, roll = 0; const Z = !!a.A.app.zombie;
  if (s.walk) {
    const ph = s.walk.phase, run = s.walk.run, sw = s.walk.glide ? .25 : run ? 1.05 : .7;
    if (Z && !run && !s.walk.glide) { lL[0] += S(ph) * .42; lR[0] -= S(ph) * .78; roll += .07 + S(ph) * .07; lean += .05; ch.root.position.y += Math.max(0, S(ph)) * .16; }
    else { lL[0] += S(ph) * sw; lR[0] -= S(ph) * sw; roll += S(ph) * (run ? .03 : .045); ch.root.position.y += Math.abs(S(ph)) * (run ? .26 : .12); }
    if (/idle|stand|run|pant/.test(s.poseName) && P.talk !== false || run && /idle|stand/.test(s.poseName)) { aL[0] -= S(ph) * sw * .85; aR[0] += S(ph) * sw * .85; }
    if (run) { lean += .14; if (/idle|stand/.test(s.poseName)) { aL[0] -= .55; aR[0] -= .55; } }
  } else if (!/sit|sleep|crawl|lie|drive/.test(s.poseName)) roll += S(t * .55 + a.seed) * .012; // weight shift
  if (Z) { const ph2 = (t * .41 + a.seed * .173) % 1; if (ph2 < .07) { const k = S(ph2 / .07 * Math.PI); hd[2] += .38 * k; hd[1] += .22 * k; hd[0] -= .12 * k; } }
  const line = speechOf(a.id, t);
  let env = mouthAt(line, t);
  if (a.A.app.style === 'toy') {
    // Follow the recorded voice's volume; for caption-only lines animate an
    // approximate speaking motion without inventing or synthesising audio.
    env = line?.env?.length ? clamp(env * 1.35) : line ? .18 + .32 * Math.abs(S((t - line.t0) * 9.1)) : 0;
  }
  if (line) {
    const gate = clamp((t - line.t0) / .2) * clamp((line.t1 - t) / .3);
    const liveSk = a.sk && !Z && !s.walk && /idle|stand|neutral/.test(s.poseName || 'idle');
    if (P.talk) { aR[0] -= (.25 + .2 * S(t * 3.3 + a.seed)) * gate; aR[2] -= .1 * gate * (1 + S(t * 2.1)); aL[0] -= (.1 + .1 * S(t * 2.7 + 1)) * gate; }
    else if (liveSk) { // realistic humans have no face rig: speech is carried by hands + head. Beats of gesture switch hands every ~2.6 s
      const sw = S(t * 1.2 + a.seed) > 0, g1 = (.35 + .18 * S(t * 2.9 + a.seed) + env * .25) * gate, g2 = (.12 + .08 * S(t * 2.3 + 1)) * gate;
      if (sw) { aR[0] -= g1; aR[2] -= .12 * gate; aL[0] -= g2; } else { aL[0] -= g1; aL[2] += .12 * gate; aR[0] -= g2; } }
    const hk = a.sk ? 1.8 : 1;
    hd[0] += (S(t * 5.5 + a.seed) * .045 + env * .05 * (a.sk ? 1 : 0)) * gate * hk; hd[2] += S(t * 2.3) * .04 * gate * hk; if (a.sk) hd[1] += S(t * 1.1 + a.seed) * .07 * gate;
  }
  // breathing
  const heavy = /scared|terrified|tired|pain|infected/.test(s.expr) || /pant|tired|limp/.test(s.poseName);
  const br = S(t * (heavy ? 5.2 : 2.2) + a.seed) * (heavy ? .028 : .008); ch.torso.scale.set(1 + br * .4, 1 + br, 1 + br * .6);
  if (heavy) { aL[2] += br * 1.2; aR[2] -= br * 1.2; hd[0] -= br * 1.5; }
  const [ly, lp] = lookYaw(a, s, t);
  ch.head.rotation.set(hd[0] + lp, hd[1] + ly, hd[2]);
  ch.armL.rotation.set(...aL); ch.armR.rotation.set(...aR); ch.legL.rotation.set(...lL); ch.legR.rotation.set(...lR);
  ch.root.rotation.x = lean; ch.root.rotation.z = roll;
  // accessories
  ch.acc.shades.visible = s.shades;
  if (s.shades) { const k = easeOutBack(clamp((t - s.shadesT) / .35)); ch.acc.shades.position.y = lerp(1.6, .78, k); ch.acc.shades.rotation.x = (1 - k) * -.6; }
  if (ch.acc.apron) ch.acc.apron.visible = s.apron;
  if (ch.acc.pack) ch.acc.pack.visible = s.pack;
  for (const side of ['L', 'R']) {
    const want = s.hold[side] || null;
    if (a.held[side] !== want) {
      const hand = (side === 'L' ? ch.armL : ch.armR).userData.hand;
      if (a.held[side]) hand.remove(a.propCache[side + a.held[side]]);
      if (want && HAND_PROPS[want]) { const key = side + want; if (!a.propCache[key]) { a.propCache[key] = HAND_PROPS[want](); a.propCache[key].traverse(o => { if (o.isMesh) o.castShadow = true; }); } hand.add(a.propCache[key]); }
      a.held[side] = want;
    }
  }
  // face
  const blink = ((t + a.seed * .37) % 3.4) < .11;
  const e = { ...(EXPR[s.expr] || {}), blink };
  if (env > .05) { e.mouthOpen = env; if (e.mouth === 'jaw') e.mouth = 'o'; }
  const [lx] = [ly];
  e.lookX = clamp(ly * .6, -.8, .8);
  if (s.infected) e.infected = s.infected;
  const key = JSON.stringify(e);
  if (key !== a.faceKey) { drawFace(ch.F, e); a.faceKey = key; }
  if (ch.badge) ch.badge.visible = !s.noBadge;
  for (const side of ['L', 'R']) for (const pn of ['rifle', 'plasma']) { const pr = a.propCache[side + pn]; if (pr && pr.userData.flash) { const per = pn === 'plasma' ? 2.6 : 9; const on = s.poseName === 'shoot' && a.held[side] === pn && ((t - s.poseT0) * per) % 1 < (pn === 'plasma' ? .3 : .38) && t - s.poseT0 > .05; pr.userData.flash.visible = on; pr.userData.flash.rotation.z = t * 40; } }
  applyActorFx(a, t);
  applyGore(a, t);
}
// ---------------- dismemberment ----------------
// skinned (realistic) characters: part -> severed bone
const SKP = { armL: 'LeftArm', armR: 'RightArm', forearmL: 'LeftForeArm', forearmR: 'RightForeArm', handL: 'LeftHand', handR: 'RightHand', legL: 'LeftUpLeg', legR: 'RightUpLeg', shinL: 'LeftLeg', shinR: 'RightLeg', head: 'Head' };
const SKBASE = { forearmL: 'armL', forearmR: 'armR', handL: 'armL', handR: 'armR', shinL: 'legL', shinR: 'legR' };
function s_vis(a, t) { return evalActor(a, t).visible !== false; }
function skinGore(a, s, t, sev, DO) {
  const sk = a.sk; a.skg ||= {}; a.gtrack ||= {};
  // Bake at the event timestamp, not at the first requested frame: random seeks
  // and independently rendered chunks must produce the same severed limb.
  const due = sev.filter(e => t >= e.t && !a.skg[e.t + (e.arg.part || 'armL')]);
  if (due.length) {
    for (const e of due) { const ss = evalActor(a, e.t); applyActorBase(a, e.t); driveSkinned(sk, a.ch, ss, e.t, { ...DO, boneScale: ss.boneScale });
      const part = e.arg.part || 'armL', bn = SKP[part], L = bakeLimb(sk, bn); if (!L) continue; cur.scene.add(L.mesh);
      const bq = sk.bones[bn].getWorldQuaternion(new THREE.Quaternion()); const dirLocal = L.dir.clone().applyQuaternion(bq.clone().invert());
      const stump = makeStumpX(L.rad, { seed: Math.round(e.t * 7), skin: '#7a7a6a' }); cur.scene.add(stump);
      const s0 = evalActor(a, e.t), base = SKBASE[part] || part, dl = e.arg.vel || e.arg.v || SPRAY_DIR[base].map((v, i) => v * (i === 1 ? 5 : 4));
      const v = Array.isArray(e.arg.vel || e.arg.v) ? dirToWorld(s0, dl) : dirToWorld(s0, dl);
      const axis = new THREE.Vector3(v[0], 0, v[2]).cross(new THREE.Vector3(0, 1, 0)); if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0); axis.normalize();
      const gd = a.gdir?.[e.t + part]; if (gd) { gd[0] = L.dir.x * .8; gd[1] = Math.max(.25, L.dir.y * .8 + .3); gd[2] = L.dir.z * .8; }
      a.skg[e.t + part] = { L, stump, dirLocal, bn, v, axis, ground: s0.pos[1], e }; a.gtrack[e.t + part] = []; }
    a._t = undefined; applyActorBase(a, t);
  }
  const bs = { ...(DO.boneScale || {}) }; for (const e of sev) if (t >= e.t) bs[SKP[e.arg.part || 'armL']] = .001;
  driveSkinned(sk, a.ch, s, t, { ...DO, boneScale: bs });
  for (const [key, G] of Object.entries(a.skg)) {
    const on = t >= G.e.t && s.visible !== false; G.L.mesh.visible = t >= G.e.t; G.stump.visible = on; if (t < G.e.t) continue;
    const dt = t - G.e.t, f = limbFlight(G.L.joint.toArray(), G.v, G.ground + .05, G.e.arg.spin ?? 7, dt);
    G.L.mesh.position.set(...f.pos); G.L.mesh.quaternion.setFromAxisAngle(G.axis, f.rot).multiply(G.L.q0);
    G.L.mesh.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(G.L.mesh); if (bx.min.y < G.ground + .02) G.L.mesh.position.y += G.ground + .02 - bx.min.y;
    const b = sk.bones[G.bn]; const jp = b.getWorldPosition(new THREE.Vector3()), dir = G.dirLocal.clone().applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion())).normalize();
    G.stump.position.copy(jp).addScaledVector(dir, -G.L.rad * .08); G.stump.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const tr = a.gtrack[key]; if (!tr.length || t > tr[tr.length - 1][0]) tr.push([t, jp.x + dir.x * .1, jp.y + dir.y * .1, jp.z + dir.z * .1]);
  }
}
function limbPlan(a, e) {
  if (e._plan) return e._plan;
  const g = e.arg, part = g.part || 'armL', s0 = evalActor(a, e.t), sc = a.ch.o.scale || [1, 1, 1];
  const j = [...JOINT[part]]; if (a.ch.o.bulk && part.startsWith('arm')) j[0] *= 1.75 / 1.5;
  const p0 = localToWorld(s0, sc, j); const dl = g.vel || [...SPRAY_DIR[part]].map((v, i) => v * (i === 1 ? 6 : 4));
  const v = dirToWorld(s0, dl); const ground0 = s0.pos[1] - (s0.pose?.y || 0) * 0; const ground = ground0 + (part === 'head' ? .62 : .5) * sc[0];
  const fl = limbFlight(p0, v, ground, g.spin ?? 9, 99);
  a._t = undefined;
  return (e._plan = { part, p0, v, ground, ground0, tl: fl.tl, land: fl.pos, body: s0.pos, rot0: s0.rot, sc });
}
function applyGore(a, t) {
  const ch = a.ch; a.gore ||= {};
  // A frame can be requested out of order, e.g. when revising a shot.
  for (const part of ['head', 'armL', 'armR', 'legL', 'legR']) if (ch[part]) ch[part].visible = true;
  for (const e of a.A.ev) {
    if (e.cmd !== 'dismember') continue;
    if (a.sk && SKP[e.arg.part || 'armL']) continue;
    const P = limbPlan(a, e), part = P.part, limb = part === 'head' ? ch.head : ch[part]; evalActor(a, t);
    let G = a.gore[e.t + part];
    if (t < e.t) { if (G) { G.copy.visible = false; G.stump.visible = false; } continue; }
    limb.visible = false;
    if (!G) { limb.visible = true; const copy = limb.clone(true); limb.visible = false; copy.rotation.order = 'YXZ'; copy.scale.set(...P.sc); copy.traverse(o => { if (o.isMesh) o.castShadow = true; }); cur.scene.add(copy); const stump = stumpMesh(part); ch.root.add(stump); G = a.gore[e.t + part] = { copy, stump }; }
    G.stump.visible = true; G.copy.visible = true;
    const dt = t - e.t, f = limbFlight(P.p0, P.v, P.ground, e.arg.spin ?? 9, dt);
    G.copy.position.set(...f.pos);
    const rest = part === 'head' ? -Math.PI / 2 : Math.PI / 2, yaw = P.rot0 + (e.arg.yaw ?? 0.6);
    if (!f.landed) G.copy.rotation.set(f.rot, P.rot0 + f.rot * .4, f.rot * .3);
    else { const k = Math.min(1, (dt - f.tl) / .12), r0 = f.rot; G.copy.rotation.set(lerp(r0, rest, k), lerp(P.rot0 + r0 * .4, yaw, k), lerp(r0 * .3, 0, k)); }
  }
}
function buildSprays(sc, actors) {
  const out = [], sparks = [];
  for (const [ai, a] of Object.entries(actors)) for (const e of a.A.ev) if (e.cmd === 'dismember' && e.arg.spray !== false && a.sk && SKP[e.arg.part || 'armL']) {
    // realistic (skinned) dismemberment: initial burst + arterial pulses + steady flow from the tracked stump
    const part = e.arg.part || 'armL', key = e.t + part, P = limbPlan(a, e), base = SKBASE[part] || part;
    const dir = SPRAY_DIR[base].map(v => v * .7); (a.gdir ||= {})[key] = dir;
    // Approximate the moving stump from the deterministic proxy track. This
    // avoids a history-dependent spray when a render starts in the middle.
    const origin = ti => localToWorld(evalActor(a, ti), P.sc, JOINT[part] || JOINT[base]);
    out.push({ t0: e.t, dur: .5, n: e.arg.n ?? 110, seed: Math.round(e.t * 10) + ai.length, speed: 6.5, spread: .35, ground: P.ground0, dir, origin, size: 1.1 });
    out.push(...arterial(e.t + .3, e.arg.bleed ?? 6, origin, dir, P.ground0, Math.round(e.t * 10) + 3, e.arg.flow ?? 1));
  }
  for (const [ai, a] of Object.entries(actors)) for (const e of a.A.ev) if (e.cmd === 'cut' && e.arg.spray !== false) {
    const idx = a.A.ev.filter(x => x.cmd === 'cut').indexOf(e), s0 = evalActor(a, e.t), fb = localToWorld(s0, a.ch.o.scale || [1, 1, 1], [0, 5.6 * (e.arg.y ?? .6), .5]);
    const origin = () => a.fx?.cutP?.[idx] || fb, dir = dirToWorld(s0, [Math.sin(e.arg.side ?? 0) * .8, .35, Math.cos(e.arg.side ?? 0) * .8]);
    out.push({ t0: e.t, dur: .3, n: e.arg.n ?? 45, seed: Math.round(e.t * 10) + 11, speed: 4.5, spread: .4, ground: s0.pos[1], dir, origin, size: .8 });
    if (e.arg.bleed) out.push(...arterial(e.t + .2, e.arg.bleed, origin, dir, s0.pos[1], Math.round(e.t * 10) + 13, e.arg.flow ?? .6));
  }
  for (const [ai, a] of Object.entries(actors)) for (const e of a.A.ev) if (e.cmd === 'dismember' && e.arg.spray !== false && !(a.sk && SKP[e.arg.part || 'armL'])) {
    const part = e.arg.part || 'armL', P = limbPlan(a, e);
    out.push({ t0: e.t, dur: e.arg.sprayDur ?? 1.4, n: e.arg.n ?? 90, seed: Math.round(e.t * 10) + ai.length, speed: 6, spread: .45, ground: P.ground0, dir: SPRAY_DIR[part].map(v => v * .7),
      origin: ti => { const s = evalActor(a, ti); const o = localToWorld(s, P.sc, part === 'head' ? [0, 4.1, 0] : JOINT[part]); const d = dirToWorld(s, [0, 0, 0]); return o; } });
    // the flying part trails blood too
    out.push({ t0: e.t, dur: Math.min(P.tl, .8), n: 24, seed: Math.round(e.t * 10) + 7, speed: 1.5, spread: .6, ground: P.ground0, dir: [0, .3, 0], origin: ti => limbFlight(P.p0, P.v, P.ground, 9, ti - e.t).pos });
  }
  for (const e of sc.world || []) {
    if (e.kind === 'spray') { const A = e.actor ? actors[e.actor] : null; out.push({ t0: e.t, dur: e.dur ?? .35, n: e.n ?? 40, seed: Math.round(e.t * 10), speed: e.speed ?? 7, spread: e.spread ?? .5, ground: e.ground ?? 0, size: e.size, dir: e.dir || [0, 1, 0], acid: !!e.acid, water: !!(e.water || e.color),
      origin: A ? (ti => { const s = evalActor(A, ti); return localToWorld(s, A.ch.o.scale || [1, 1, 1], e.local || [0, 4.6, 0]); }) : (() => e.at) }); }
    if (e.kind === 'sparks') sparks.push({ t0: e.t, at: e.at, n: e.n, color: e.color, size: e.size });
  }
  cur.sparkList = sparks;
  return out;
}

// ---------------- wounds, bandages, drips, skin tint ----------------
const PART_SIZE = { armL: [.98, 2, .98], armR: [.98, 2, .98], legL: [.98, 2, .98], legR: [.98, 2, .98], torso: [2, 2, 1] };
function partHost(ch, part) { if (part === 'torso') return { grp: ch.root, base: ch.torso.position }; const g = ch[part]; return { grp: g, base: g.children[0].position }; }
function applyActorFx(a, t) {
  const ch = a.ch, evs = a.A.ev; a.fx ||= { wounds: [], bands: [] };
  let wi = 0, bi = 0, ci = 0;
  for (const e of evs) {
    if (e.cmd === 'cut') { if (a.sk) { a.fx.cuts ||= []; a.fx.cutP ||= []; let c = a.fx.cuts[ci]; if (!c && t >= e.t) c = a.fx.cuts[ci] = makeCut(a.sk, { seed: 5 + ci * 3 + a.seed, ...e.arg });
        if (c) { c.update(t - e.t); c.mesh.visible = t >= e.t && s_vis(a, t); a.fx.cutP[ci] = c.mesh.getWorldPosition(new THREE.Vector3()).toArray(); } } ci++; continue; }
    if (e.cmd === 'wound') {
      let w = a.fx.wounds[wi]; if (!w) { const g = e.arg, host = partHost(ch, g.part || 'armL'); const m = woundMesh(g.part, g.y ?? .5, 7 + wi * 13 + a.seed, PART_SIZE[g.part || 'armL']); m.position.copy(host.base); host.grp.add(m); w = a.fx.wounds[wi] = { m, e }; }
      const g = e.arg, k = clamp((t - e.t) / (g.dur ?? 6)); w.m.visible = t >= e.t;
      w.m.material.alphaTest = Math.max(.03, .985 - Math.sqrt(k) * (.985 - (1 - (g.amt ?? .6))));
      w.m.material.color.set('#8a0606').lerp(new THREE.Color('#3e0505'), clamp((t - e.t) / 50));
      wi++;
    } else if (e.cmd === 'bandage') {
      let b = a.fx.bands[bi]; if (!b) { const g = e.arg, host = partHost(ch, g.part || 'armL'); const m = bandageMesh(PART_SIZE[g.part || 'armL'][0], 31 + bi * 7 + a.seed); m.position.copy(host.base); m.position.y += 1 - (g.y ?? .5) * 2; host.grp.add(m); b = a.fx.bands[bi] = { m, e }; }
      updateBandage(b.m, t, { t: e.t, ...e.arg }); bi++;
    }
  }
  // skin tint (infection)
  let sk = null; for (const e of evs) if (e.cmd === 'skin' && e.t <= t) sk = e;
  if (ch.skinMat && ch.skinMat.color) { ch.skinBase ||= ch.skinMat.color.clone(); if (sk) { const k = smooth(clamp((t - sk.t) / (sk.arg.dur ?? 3))); ch.skinMat.color.copy(ch.skinBase).lerp(new THREE.Color(sk.arg.to), k * (sk.arg.amt ?? 1)); } else ch.skinMat.color.copy(ch.skinBase); }
  if (ch.modelMat) { const mm = ch.modelMat; mm.userData.e0 ||= { e: mm.emissive.clone(), i: mm.emissiveIntensity }; if (sk) { const k = smooth(clamp((t - sk.t) / (sk.arg.dur ?? 3))) * (sk.arg.amt ?? 1); mm.color.set('#ffffff').lerp(new THREE.Color(sk.arg.to), k * (sk.arg.tint ?? .6)); if (sk.arg.frost) { mm.emissiveMap = mm.map; mm.emissive.copy(mm.userData.e0.e).lerp(new THREE.Color(sk.arg.glow || '#bfe2ff'), k); mm.emissiveIntensity = mm.userData.e0.i + (sk.arg.frost - mm.userData.e0.i) * k; } else { mm.emissive.copy(mm.userData.e0.e); mm.emissiveIntensity = mm.userData.e0.i; } } else { mm.color.set('#ffffff'); mm.emissive.copy(mm.userData.e0.e); mm.emissiveIntensity = mm.userData.e0.i; } }
}
function applyDrips(t) {
  let di = 0, si = 0; const fall = .42;
  for (const d of cur.drops) d.visible = false; for (const m of cur.dropSplats) m.visible = false;
  for (const a of Object.values(cur.actors)) {
    for (const e of a.A.ev) {
      if (e.cmd !== 'wound' || !e.arg.drip || t < e.t) continue;
      const g = e.arg, rate = g.drip.rate || .55, t0 = e.t + (g.drip.delay ?? 1), until = Math.min(t, g.drip.until ?? 1e9), side = g.drip.side || (g.part === 'armR' || g.part === 'legR' ? 'R' : 'L');
      if (until < t0) continue;
      const n1 = Math.floor((until - t0) / rate), n0 = Math.max(0, n1 - 59);
      for (let i = n0; i <= n1; i++) {
        const ti = t0 + i * rate + Math.sin(i * 12.9898) * rate * .25; if (ti > t) continue;
        const sv = evalActor(a, ti); if (!sv.visible) continue;
        const k = a.ch.o.scale?.[0] || 1, lx = (side === 'L' ? 1.5 : -1.5) * k, lz = .15, c = Math.cos(sv.rot), sn = Math.sin(sv.rot);
        const px = sv.pos[0] + lx * c + lz * sn, pz = sv.pos[2] - lx * sn + lz * c;
        if (t - ti < fall && di < cur.drops.length) { evalActor(a, t); const h = a.ch.hand(side); const d = cur.drops[di++]; const ff = (t - ti) / fall; d.position.set(h.x, h.y - 1.9 * k - ff * ff * (h.y - 1.9 * k - sv.pos[1]), h.z); d.visible = true; }
        else if (t - ti >= fall && si < cur.dropSplats.length) { const m = cur.dropSplats[si++]; m.position.set(px, sv.pos[1] + .03 + (si % 5) * .002, pz); m.userData.ev.t = ti + fall; updateDecal(m, t); }
      }
      evalActor(a, t);
    }
  }
}

// ---------------- world props ----------------
function applyWorld(t) {
  const W = cur.sc.world || [], P = cur.set.props;
  const vis = { ...(cur.sc.props || {}) };
  for (const e of W) if (e.kind === 'prop' && e.t <= t) vis[e.name] = e.visible;
  for (const [n, o] of Object.entries(P)) if (o && o.isObject3D && n in vis && typeof vis[n] === 'boolean') o.visible = vis[n];
  // prop moves (cars driving off) + prop shakes (engine idle)
  for (const [n, o] of Object.entries(P)) {
    if (!o || !o.isObject3D) continue; const ev = W.filter(e => (e.kind === 'move' || e.kind === 'pshake') && e.name === n); if (!ev.length) continue;
    const ud = o.userData; if (!ud.home) ud.home = { p: o.position.clone(), r: o.rotation.y, rx: o.rotation.x, rz: o.rotation.z };
    const p = ud.home.p.clone(); let r = ud.home.r, rz = ud.home.rz, rx = ud.home.rx, ry2 = 0;
    for (const e of ev) { if (t < e.t) continue; const k = clamp((t - e.t) / e.dur);
      if (e.kind === 'move') { const kk = e.ease === 'in' ? k * k : e.ease === 'out' ? 1 - (1 - k) * (1 - k) : e.ease === 'lin' ? k : smooth(k); if (e.to) p.lerp(V(e.to), kk); if (e.rot != null) r = lerp(r, e.rot, smooth(k)); if (e.rx != null) rx = lerp(rx, e.rx, kk); if (e.rz != null) rz = lerp(rz, e.rz, kk); if (k < 1 && k > 0) { p.y += Math.abs(S(t * 19)) * .05; rz += S(t * 23) * .015; } }
      else if (k < 1) { const a = e.amt * (1 - k * .5); p.y += Math.abs(S(t * 41)) * a; rz += S(t * 37) * a * .3; ry2 += S(t * 29) * a * .2; } }
    o.position.copy(p); o.rotation.set(rx, r + ry2, rz);
  }
  // prop fades: lights -> intensity, meshes/sprites -> material opacity
  for (const [n, o] of Object.entries(P)) {
    if (!o) continue; const ev = W.filter(e => e.kind === 'pfade' && e.name === n); if (!ev.length) continue;
    const ud = o.userData || (o.userData = {}); const mats = [];
    if (!o.isLight) o.traverse?.(q => { if (q.material) mats.push(q.material); });
    if (ud.fade0 == null) ud.fade0 = o.isLight ? o.intensity : (mats[0]?.opacity ?? 1);
    let v = ud.fade0; for (const e of ev) { if (t < e.t) continue; const k = e.dur > 0 ? clamp((t - e.t) / e.dur) : 1; v = lerp(v, e.to, k); }
    if (o.isLight) o.intensity = v; else for (const m of mats) { m.opacity = v; m.transparent = true; }
  }
  // prop values (hive.k, heli.spin): lerp a numeric key over dur
  { const PV = W.filter(e => e.kind === 'pval'); const base = cur.pval0 || (cur.pval0 = {});
    for (const e of PV) { const o = P[e.name]; if (!o) continue; const tgt = o.isObject3D ? o.userData : o; const id = e.name + '.' + e.key;
      if (!(id in base)) base[id] = tgt[e.key] ?? 0; }
    const vals = {}; for (const e of PV) { const id = e.name + '.' + e.key; if (!(id in vals)) vals[id] = base[id]; if (t < e.t) continue; const k = e.dur > 0 ? clamp((t - e.t) / e.dur) : 1; vals[id] = lerp(vals[id], e.to, smooth(k)); }
    for (const [id, v] of Object.entries(vals)) { const [n, key] = id.split('.'); const o = P[n]; (o.isObject3D ? o.userData : o)[key] = v; } }
  for (const [cname, cart] of Object.entries(P)) {
    if (!cart || !cart.userData || !cart.userData.parts) continue;
    const ud = cart.userData, hidden = cur.sc.props?.[cname] === 'hidden';
    const CW = W.filter(e => (e.cart || 'cart') === cname);
    if (cname !== 'cart' && cur.sc.props?.[cname]) cart.visible = true;
    const rev = {}; for (const e of CW) if (e.kind === 'reveal') rev[e.part] = e.t;
    for (const name of ud.order) {
      const p = ud.parts[name]; const rt = rev[name];
      if (!hidden) { p.visible = true; continue; }
      if (rt == null || t < rt) { p.visible = false; continue; }
      const k = clamp((t - rt) / .35); p.visible = true;
      p.scale.copy(p.userData.baseScale).multiplyScalar(Math.max(.01, easeOutBack(k)));
      p.position.copy(p.userData.base); p.position.y += (1 - easeOut(k)) * 1.2;
    }
    let price = ud.initPrice ?? (ud.initPrice = ud.priceText);
    for (const e of CW) if (e.kind === 'price' && e.t <= t) price = e.text;
    if (price !== ud.priceText) ud.setPrice(price);
    ud.parts.price.scale.setScalar(1); for (const e of CW) if (e.kind === 'price' && t >= e.t && t < e.t + .4) ud.parts.price.scale.setScalar(1 + S((t - e.t) / .4 * Math.PI) * .45);
    ud.stream.visible = false; ud.pourCup.visible = false; ud.flyCup.visible = false; ud.pitcher.rotation.z = 0;
    for (const e of CW) {
      if (e.kind === 'pour' && t >= e.t) {
        const k = clamp((t - e.t) / e.dur), on = t < e.t + e.dur;
        const tilt = on ? Math.min(1, (t - e.t) / .25, (e.t + e.dur - t) / .25) : 0;
        ud.pitcher.rotation.z = -tilt * .9; ud.stream.visible = on && tilt > .6;
        const cupLive = e.until == null || t < e.until; ud.pourCup.visible = cupLive;
        ud.pourCup.userData.liquid.scale.y = Math.max(.05, k); ud.pourCup.userData.liquid.position.y = -.2 + .15 * k;
      }
      if (e.kind === 'fly' && t >= e.t && t < e.t + e.dur) {
        const a = cur.actors[e.to]; if (!a) continue;
        const k = clamp((t - e.t) / e.dur), from = cart.localToWorld(e.from ? V(e.from) : ud.pourCup.position.clone());
        const to = new THREE.Vector3(); (e.side === 'L' ? a.ch.armL : a.ch.armR).userData.hand.getWorldPosition(to);
        const p = from.clone().lerp(to, easeInOut(k)); p.y += S(k * Math.PI) * 1.2;
        ud.flyCup.visible = true; ud.flyCup.position.copy(cart.worldToLocal(p)); ud.flyCup.rotation.set(0, k * 6, S(k * Math.PI) * .4);
      }
    }
  }
  cur.set.update?.(t);
  for (const { f, e } of cur.fires) { const k = fireK(e, t); f.visible = k > 0; if (k > 0) { if (e.actor && cur.actors[e.actor]) { const s = evalActor(cur.actors[e.actor], t), o = e.off || [0, 0, 0]; f.position.set(s.pos[0] + o[0], s.pos[1] + o[1], s.pos[2] + o[2]); } f.userData.update(t, k); } }
  drawSprays(cur.bloodPool, cur.sprays, t); drawSprays(cur.acidPool, cur.acid, t); drawSprays(cur.waterPool, cur.water, t); for (const a of Object.values(cur.actors)) a._t = undefined;
  drawSparks(cur.bloodPool, cur.sparkList || [], t);
}

// ---------------- camera ----------------
function resolvePoint(p, t) {
  if (Array.isArray(p)) return V(p);
  if (typeof p === 'string') { if (cur.actors[p]) return headPos(cur.actors[p], t); const an = SETS[cur.sc.set].anchors[p]; if (an) return V(an).add(V([0, 3, 0])); }
  return V([0, 3, 0]);
}
function shotCam(sh, t) {
  const c = sh.cam, dur = Math.max(.01, sh.t1 - sh.t0), k = clamp((t - sh.t0) / dur);
  const ease = c.ease === 'inOut' ? easeInOut(k) : c.ease === 'linear' ? k : easeOut(k) * .35 + k * .65;
  let pos, target, fov = c.fov || 40;
  if (c.type === 'set' || c.type === 'explicit') {
    const base = c.type === 'set' ? { ...SETS[cur.sc.set].cams[c.name], ...c } : c;
    pos = V(base.pos); target = V(base.target); fov = base.fov || fov;
    if (base.to) { pos.lerp(V(base.to.pos || base.pos), ease); target.lerp(V(base.to.target || base.target), ease); }
  } else if (c.type === 'prop') {
    // camera riding a moving prop (helicopter cockpit / chase cam): off & look in the prop's local frame (lerp to c.to over the shot)
    const o = cur.set.props?.[c.prop]; o?.updateMatrixWorld(true);
    let off = V(c.off || [0, 3, -8]), look = V(c.look || [0, 2, 10]); if (c.to) { off.lerp(V(c.to.off || c.off), ease); look.lerp(V(c.to.look || c.look), ease); }
    pos = o ? o.localToWorld(off.clone()) : off; target = o ? o.localToWorld(look.clone()) : look; fov = c.fov || 60;
    if (o && c.bank !== false) { const up = V([0, 1, 0]).transformDirection(o.matrixWorld); sh._propUp = V([0, 1, 0]).lerp(up, c.bank ?? 1).normalize(); }
  } else if (c.type === 'orbit') {
    const ctr = resolvePoint(c.center, t), a = lerp(c.a0 ?? -.6, c.a1 ?? .6, ease), r = c.r || 11;
    pos = ctr.clone().add(V([S(a) * r, c.height ?? 2, Math.cos(a) * r])); target = ctr.clone().add(V([0, c.ty ?? 0, 0])); fov = c.fov || 42;
  } else if (c.type === 'pov') {
    const a = cur.actors[c.from], tf = c.follow ? t : sh.frameT; const s = evalActor(a, tf);
    pos = headPos(a, tf).add(V([S(s.rot) * .7, .05, Math.cos(s.rot) * .7])); target = resolvePoint(c.at, tf); fov = c.fov || 50;
  } else if (c.type === 'ots') {
    // cinematic over-the-shoulder / follow camera: behind and beside an actor, framing what he looks at ('at') or the way he walks
    const a = cur.actors[c.who]; const s = evalActor(a, t); const h = headPos(a, t);
    let yaw = s.rot + (c.yaw || 0), p = null;
    if (c.at != null) { p = resolvePoint(c.at, t); yaw = Math.atan2(p.x - h.x, p.z - h.z); }
    const fwd = V([S(yaw), 0, Math.cos(yaw)]), right = V([Math.cos(yaw), 0, -S(yaw)]);
    const back = c.back ?? (p ? 6.2 : 8.5), side = c.side ?? (p ? 2.4 : 1.2);
    pos = h.clone().addScaledVector(fwd, -back).addScaledVector(right, side); pos.y += c.up ?? (p ? .5 : 1.4);
    if (p) target = p.clone().lerp(h, c.mix ?? .18); else { target = h.clone().addScaledVector(fwd, 9); target.y -= .8; }
    fov = c.fov || (p ? 46 : 52);
    if (C.camBounds) { // keep the camera inside the room the actor stands in (walls would block an over-the-shoulder view)
      const inR = (r, q, m = 0) => q.x > r[0] + m && q.x < r[1] - m && q.z > r[2] + m && q.z < r[3] - m;
      const r = C.camBounds.find(r => inR(r, h)) ; if (r && !C.camBounds.some(rr => inR(rr, pos, .4))) { pos.x = clamp(pos.x, r[0] + .6, r[1] - .6); pos.z = clamp(pos.z, r[2] + .6, r[3] - .6); }
    }
  } else if (c.type === 'body') {
    // chest-mounted body camera of an actor: rides the torso, bobs with the gait, aims along the body (optionally toward 'at')
    const a = cur.actors[c.who]; const s = evalActor(a, t); const h = headPos(a, t);
    let yaw = s.rot + (c.yaw || 0), pitch = c.pitch ?? -.06;
    if (c.at != null) { const p = resolvePoint(c.at, t).clone(); if (c.rel && Array.isArray(c.at)) p.y += s.rideY || 0; const dx = p.x - h.x, dz = p.z - h.z; const ya = Math.atan2(dx, dz); const k = c.aim ?? 1; yaw = yaw + wrapA(ya - yaw) * k; pitch = lerp(pitch, Math.atan2(p.y - (h.y - 1.2), Math.hypot(dx, dz)), k); }
    const ph = s.walk ? s.walk.phase : 0, run = s.walk?.run, amp = s.walk ? (run ? 1 : .55) : 0;
    const fwd = V([S(yaw) * Math.cos(pitch), S(pitch), Math.cos(yaw) * Math.cos(pitch)]);
    const right = V([Math.cos(yaw), 0, -S(yaw)]);
    pos = h.clone().add(V([S(yaw) * (c.fwd ?? .55), -(c.drop ?? 1.25), Math.cos(yaw) * (c.fwd ?? .55)])).add(right.clone().multiplyScalar(c.side ?? -.35));
    pos.y += Math.abs(S(ph)) * .14 * amp; pos.add(right.clone().multiplyScalar(S(ph * .5) * .1 * amp));
    target = pos.clone().add(fwd.multiplyScalar(10)); target.y += S(ph) * .25 * amp; target.add(right.clone().multiplyScalar(S(ph * .5 + .6) * .35 * amp));
    fov = c.fov || 92; sh._bodyRoll = S(ph * .5) * .045 * amp + S(t * 1.3) * .012;
  } else {
    const tf = c.follow ? t : sh.frameT;
    const D = { close: [6.2, 4.65, 34, .25], medium: [8.8, 4.0, 38, .5], full: [13.5, 2.9, 40, 1.2], two: [0, 4.0, 38, .7] }[c.type];
    let ctr, face;
    if (c.type === 'two') {
      const ids = c.who, hs = ids.map(id => headPos(cur.actors[id], tf)); ctr = hs[0].clone().lerp(hs[1], .5);
      const sep = hs[0].distanceTo(hs[1]); D[0] = Math.max(8.5, sep * 1.35 + 5);
      const dx = hs[1].x - hs[0].x, dz = hs[1].z - hs[0].z; let perp = Math.atan2(-dz, dx) + Math.PI / 2; // facing side guess
      const wc = SETS[cur.sc.set].cams[Object.keys(SETS[cur.sc.set].cams)[0]].pos; const ax = wc[0] - ctr.x, az = wc[2] - ctr.z; // stay on the audience side
      if (Math.cos(perp - Math.atan2(ax, az)) < 0) perp += Math.PI;
      face = perp; ctr.y = (hs[0].y + hs[1].y) / 2 - .6;
    } else {
      const a = cur.actors[c.who], s = evalActor(a, tf); ctr = headPos(a, tf); ctr.y += D[1] - 4.65 + (c.type !== 'close' ? -(s.pose.y || 0) * .5 : 0); face = s.rot + (c.useLook === false ? 0 : lookYaw(a, s, tf, true)[0] * .85);
    }
    const dist = (c.dist || D[0]) * (1 - (c.push ?? .08) * ease), ang = face + (c.angle ?? 0);
    target = ctr.clone().add(V(c.offset || [0, 0, 0]));
    pos = target.clone().add(V([S(ang) * dist, (c.height ?? D[3]), Math.cos(ang) * dist]));
    fov = c.fov || D[2];
  }
  if (c.type === 'set' || c.type === 'explicit' || c.type === 'orbit') { /* push via 'to' */ } 
  const hh = c.handheld ?? (c.nv ? 2.6 : (C.handheld ?? 1)); pos.add(V([S(t * .7 + sh.t0) * .05 * hh + S(t * 3.7) * .008 * hh * hh, S(t * .93 + 1) * .04 * hh + S(t * 4.3 + 2) * .007 * hh * hh, 0])); target.add(V([S(t * .5 + 2) * .03 * hh, S(t * .61) * .025 * hh, 0]));
  let roll = (c.roll || 0) + (c.type === 'body' ? sh._bodyRoll || 0 : 0); if (c.to && c.to.roll != null) roll = lerp(roll, c.to.roll, ease);
  return { pos, target, fov, roll };
}
function applyCamera(t) {
  if (window._camOverride) { window._camOverride(camera, t); return; } // interactive player: free camera
  const shots = cur.sc.shots; let sh = shots[0]; for (const s of shots) if (t >= s.t0) sh = s;
  const r = shotCam(sh, t);
  let fov = r.fov;
  for (const p of C.punches) { const k = t - p.t; if (k >= 0 && k < 1) fov *= 1 - (p.amt || .16) * (k < .07 ? k / .07 : Math.exp(-(k - .07) * 6)); }
  for (const p of C.shakes) { const k = t - p.t; if (k >= 0 && k < (p.dur || .5)) { const a = (p.amt || .15) * (1 - k / (p.dur || .5)); r.pos.add(V([S(k * 61) * a, S(k * 47 + 1) * a, 0])); } }
  camera.up.set(0, 1, 0); if (sh.cam.type === 'prop' && sh._propUp) camera.up.copy(sh._propUp);
  camera.position.copy(r.pos); camera.lookAt(r.target); if (r.roll) camera.rotateZ(r.roll); camera.fov = fov; camera.updateProjectionMatrix();
  { const T = cur.scene?.userData.torch; if (T) { const tc = sh.cam.torch; if (!tc) T.intensity = 0; else { const o = typeof tc === 'object' ? tc : {};
    const fl = o.flicker ? (Math.sin(t * 23.7) > .96 || Math.sin(t * 7.3 + 1) > .985 ? .25 : 1) : 1; T.intensity = (o.i ?? 260) * fl; T.angle = o.angle ?? .5; T.color.set(o.color || '#fff0d8');
    camera.updateMatrixWorld(); const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    T.position.copy(camera.position).addScaledVector(right, o.side ?? .5).addScaledVector(up, o.up ?? -.4); const fw = r.target.clone().sub(r.pos).normalize(); T.target.position.copy(camera.position).addScaledVector(fw, 20); T.target.updateMatrixWorld(); } } }
}

// ---------------- film look ----------------
function applyLook(t) {
  const L = { grain: .075, vig: .6, ca: .012, sat: .78, contrast: 1.08, lift: -.012, tint: [.96, 1.0, 1.04], red: 0, bloom: .55, ...(C.look || {}), ...(cur.sc.look || {}) };
  const shots = cur.sc.shots; let sh = shots[0]; for (const x of shots) if (t >= x.t0) sh = x;
  const U = filmPass.uniforms; let nv = sh.cam.nv ? 1 : 0;
  for (const e of C.looks || []) if (t >= e.t && t < e.t + e.dur) { if (e.nv != null) nv = e.nv; }
  U.time.value = t; U.nv.value = nv; U.grain.value = L.grain + nv * .05; U.vig.value = L.vig; U.ca.value = L.ca; U.sat.value = L.sat; U.contrast.value = L.contrast; U.lift.value = L.lift; U.tint.value.set(...L.tint);
  let red = L.red; for (const e of C.looks || []) if (e.red && t >= e.t && t < e.t + e.dur) red = Math.max(red, e.red * Math.sin(clamp((t - e.t) / e.dur) * Math.PI));
  U.red.value = red;
  { let uw = 0; for (const e of C.looks || []) if (e.uw && t >= e.t && t < e.t + e.dur) uw = Math.max(uw, e.uw * Math.min(1, (t - e.t) / .15, (e.t + e.dur - t) / .2)); if (U.uw) U.uw.value = uw; }
  const bc = sh.cam.type === 'body' || sh.cam.bodycam; U.fish.value = sh.cam.fish ?? (bc ? (L.fish ?? .3) : (L.fishAll ?? 0)); if (window._camOverride) U.fish.value = 0; U.sharp.value = L.sharp ?? 0; U.dirt.value = L.dirt ?? 0;
  const tm = L.tone === 'agx' ? THREE.AgXToneMapping : L.tone === 'neutral' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping; if (renderer.toneMapping !== tm) { renderer.toneMapping = tm; cur.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); }
  // light flicker on the whole frame (old camcorder / dying power)
  let fl = 1; if (L.flicker) { const ph = Math.floor(t * 24); const r = Math.abs(Math.sin(ph * 91.7)); fl = r > .985 ? .55 : r > .96 ? .85 : 1; } U.flick.value = fl;
  if (bloomPass) { bloomPass.strength = L.bloom + nv * .25; bloomPass.threshold = nv ? .55 : (L.bloomT ?? .82); }
  renderer.toneMappingExposure = (cur.set.exposure || 1) * (L.exposure || 1) * (nv ? 1.6 : 1);
}

// ---------------- frame ----------------
// exact light culling: a point/spot light with a finite range whose influence sphere misses the view frustum contributes
// nothing to the image, so it is switched off for this frame (fewer per-pixel lights + no cube shadow passes)
const _cull = { list: [], fr: new THREE.Frustum(), m: new THREE.Matrix4(), sp: new THREE.Sphere(), counts: new Set() };
function cullLights() {
  if (window._opts?.nocull) return;
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  _cull.fr.setFromProjectionMatrix(_cull.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  let n = 0;
  cur.scene.traverseVisible(o => {
    if (!(o.isPointLight || o.isSpotLight) || !(o.distance > 0)) { if (o.isPointLight || o.isSpotLight) n++; return; }
    o.getWorldPosition(_cull.sp.center); _cull.sp.radius = o.distance * 1.02;
    if (o.userData.pad) return;
    if (window._opts?.lightCap && o.castShadow && !window._opts?.noShadow) { n++; return; } // player: never toggle shadow casters (would recompile shaders)
    if (!_cull.fr.intersectsSphere(_cull.sp) || o.intensity <= 0) { o.visible = false; _cull.list.push(o); } else n++;
  });
  if (window._opts?.lightCap) stableLights(cur.scene);
}
// player only: a constant number of point/spot lights every frame -> three never recompiles shaders mid-playback
// (each new light count = recompile of every material = multi-second freezes on weak PCs). Keeps the K most
// influential lights near the camera and pads the rest with zero-intensity dummies.
function stableLights(scene) {
  const o = window._opts, KP = o.lightCap, KS = o.spotCap ?? 2, cam = camera.position, P = [], S = [];
  scene.traverseVisible(L => {
    if (L.userData.pad || !(L.isPointLight || L.isSpotLight)) return;
    if (o.noShadow) L.castShadow = false; else if (L.castShadow) return;
    const d = L.getWorldPosition(_cull.sp.center).distanceTo(cam), r = L.distance > 0 ? L.distance : 60;
    L.userData._score = L.intensity * Math.max(.02, 1 - d / (r * 1.5)) ** 2; (L.isSpotLight ? S : P).push(L);
  });
  const cap = (arr, K) => { arr.sort((a, b) => b.userData._score - a.userData._score); for (let i = K; i < arr.length; i++) { arr[i].visible = false; _cull.list.push(arr[i]); } return Math.min(K, arr.length); };
  const nP = cap(P, KP), nS = cap(S, KS);
  const pool = scene.userData.pads ||= { P: [], S: [] };
  const pad = (list, need, mk) => { while (list.length < need) { const L = mk(); L.userData.pad = true; L.castShadow = false; scene.add(L); list.push(L); } list.forEach((L, i) => L.visible = i < need); };
  pad(pool.P, KP - nP, () => new THREE.PointLight(0, 0, .01)); pad(pool.S, KS - nS, () => { const L = new THREE.SpotLight(0, 0, .01); L.position.y = -500; return L; });
}
// player only: compile every material of a freshly built scene up front (hidden props, shatter debris, later-shown actors)
function warmScene(scene) {
  const hid = []; scene.traverse(x => { if (!x.visible && !x.userData.pad && !x.isLight) { hid.push(x); x.visible = true; } });
  const fc = []; scene.traverse(x => { if (x.frustumCulled) { fc.push(x); x.frustumCulled = false; } });
  cullLights(); try { renderer.compile(scene, camera); renderer.render(scene, camera); } catch (e) {} // a real draw forces every program to finish linking now (compile() alone defers it to first use)
  for (const x of fc) x.frustumCulled = true; for (const x of hid) x.visible = false; uncullLights();
}
// exact static/dynamic shadow split: depth of non-moving shadow casters is rendered once per light into a cached
// depth cube; every frame that depth is blitted back and only moving casters (actors, physics, moved props) are drawn
// on top with the normal depth test -> bit-identical shadow maps for a fraction of the cost.
const SH = { installed: false, ver: 0, LS: 5, LD: 6 };
function rtFBs(rt) { const p = renderer.properties.get(rt); return p.__webglFramebuffer; }
function blitDepth(srcRT, dstRT, face, w, h) {
  const gl = renderer.getContext(); const s = rtFBs(srcRT), d = rtFBs(dstRT);
  const sf = Array.isArray(s) ? s[face] : s, df = Array.isArray(d) ? d[face] : d; if (!sf || !df) return false;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sf); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, df);
  gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
  return true;
}
function ensureStaticRT(L) {
  const m = L.shadow.map; let r = L.userData._srt;
  if (r && r.width === m.width && r.height === m.height) return r;
  r?.dispose();
  if (m.isWebGLCubeRenderTarget) { r = new THREE.WebGLCubeRenderTarget(m.width); r.depthTexture = new THREE.CubeDepthTexture(m.width, THREE.UnsignedIntType); }
  else { r = new THREE.WebGLRenderTarget(m.width, m.height); r.depthTexture = new THREE.DepthTexture(m.width, m.height, THREE.UnsignedIntType); }
  r.depthTexture.format = THREE.DepthFormat;
  const prev = renderer.getRenderTarget(), pf = renderer.getActiveCubeFace();
  for (let f = 0; f < (m.isWebGLCubeRenderTarget ? 6 : 1); f++) renderer.setRenderTarget(r, f);
  renderer.setRenderTarget(prev, pf); L.userData._srt = r; L.userData._sv = -1; return r;
}
const _mh = new THREE.Matrix4();
function classifyCasters() {
  // mark actors' meshes dynamic; detect any "static" caster that moved / changed visibility -> dynamic for good
  const vis = new Set(); cur.scene.traverseVisible(o => { if (o.isMesh && o.castShadow) vis.add(o); });
  if (!cur._actSet) { cur._actSet = 1; for (const a of Object.values(cur.actors)) { a.ch?.root?.traverse?.(o => o.userData.dyn = true); a.sk?.root?.traverse?.(o => o.userData.dyn = true); } }
  let changed = false;
  cur.scene.traverse(o => {
    if (!o.isMesh || !o.castShadow) return;
    if (!o.userData.dyn && (o.isSkinnedMesh || o.isInstancedMesh)) o.userData.dyn = true;
    if (!o.userData.dyn) {
      const e = o.matrixWorld.elements; let h = vis.has(o) ? 1 : 0; for (let i = 0; i < 16; i++) h += e[i] * (i + 1.37);
      const pa = o.geometry?.attributes?.position; if (pa) h += pa.version * 7.1 + (o.geometry.drawRange.count === Infinity ? 0 : o.geometry.drawRange.count);
      if (o.userData._h === undefined) { o.userData._h = h; changed = true; }
      else if (o.userData._h !== h) { o.userData.dyn = true; changed = true; }
    }
    o.layers.mask = 1 | (1 << (o.userData.dyn ? SH.LD : SH.LS));
  });
  if (changed) SH.ver++;
}
function installShadowSplit() {
  if (SH.installed || window._opts?.noshsplit) return; SH.installed = true;
  const sm = renderer.shadowMap, orig = sm.render.bind(sm);
  sm.render = (lights, scene, cam) => {
    if (!sm.enabled || !lights.length) return;
    const mask0 = cam.layers.mask, clear0 = renderer.clear;
    classifyCasters();
    for (const L of lights) {
      if (!L.castShadow || !L.shadow) continue;
      L.shadow.autoUpdate = true;
      const lm = L.matrixWorld.elements.join(',');
      const cacheable = L.isPointLight && L.userData._lm === lm;   // static lights only (hand-held lights re-render fully)
      L.userData._lm = lm;
      if (!cacheable || !L.shadow.map) { cam.layers.mask = 1; sm.needsUpdate = true; orig([L], scene, cam); continue; }
      const srt = ensureStaticRT(L), w = L.shadow.map.width, h = L.shadow.map.height;
      if (L.userData._sv !== SH.ver) {
        cam.layers.mask = 1 << SH.LS; sm.needsUpdate = true; orig([L], scene, cam);      // static-only depth
        for (let f = 0; f < 6; f++) blitDepth(L.shadow.map, srt, f, w, h);
        { const gl = renderer.getContext(), rt = renderer.getRenderTarget(); let fb = null; if (rt) { const x = rtFBs(rt); fb = Array.isArray(x) ? x[renderer.getActiveCubeFace()] : x; } gl.bindFramebuffer(gl.FRAMEBUFFER, fb); }
        L.userData._sv = SH.ver;
      }
      // restore static depth instead of clearing, then draw only dynamic casters
      renderer.clear = function () { const gl = renderer.getContext(); const f = renderer.getActiveCubeFace(); blitDepth(srt, L.shadow.map, f, w, h); const d = rtFBs(L.shadow.map); gl.bindFramebuffer(gl.FRAMEBUFFER, Array.isArray(d) ? d[f] : d); };
      cam.layers.mask = 1 << SH.LD; sm.needsUpdate = true;
      try { orig([L], scene, cam); } finally { renderer.clear = clear0; }
    }
    cam.layers.mask = mask0; sm.needsUpdate = false;
  };
}
function uncullLights() { for (const o of _cull.list) o.visible = true; _cull.list.length = 0; }
window.renderFrame = (t) => {
  uncullLights();
  const i = sceneAt(t); if (i !== cur.idx) { _cull.list.length = 0; loadScene(i); SH.ver++; if (window._opts?.lightCap) warmScene(cur.scene); }
  for (const a of Object.values(cur.actors)) { a._t = undefined; }
  applyCamera(t);
  for (const a of Object.values(cur.actors)) applyActor(a, t);
  { // body camera: the wearer is not in his own picture (chest mount sits inside the blocky arms/props)
    const shots = cur.sc.shots; let sh = shots[0]; for (const x of shots) if (t >= x.t0) sh = x;
    for (const q of Object.values(cur.actors)) if (q._propsHidden) { for (const k in q.propCache) q.propCache[k].visible = true; q._propsHidden = false; }
    if (sh.cam.type === 'body' && !sh.cam.showSelf && !window._freeCam) { const a = cur.actors[sh.cam.who]; if (a) { a.ch.root.visible = false; if (a.sk) a.sk.root.visible = false; if (a.eyes) a.eyes.forEach(e => e.visible = false); for (const k in a.propCache) a.propCache[k].visible = false; a._propsHidden = true; } } }
  cur.scene.updateMatrixWorld();
  applyWorld(t);
  { const shots = cur.sc.shots; let sh = shots[0]; for (const x of shots) if (t >= x.t0) sh = x; if (sh.cam.type === 'prop') { applyCamera(t); camera.updateMatrixWorld(); } }
  applyS3(t);
  for (const m of cur.decals) updateDecal(m, t);
  applyDrips(t);
  applyLook(t);
  { const I = cur.scene.userData.inspect, k = window._inspect ?? C.inspect ?? 0; if (I) { I.amb.intensity = 1.4 * k; I.head.intensity = 45 * k; I.head.position.copy(camera.position); } }
  cullLights();
  installShadowSplit();
  renderer.shadowMap.needsUpdate = true;
  composer.render();
  const project = p => {
    const v = (typeof p === 'string' && cur.actors[p]) ? headPos(cur.actors[p], t) : resolvePoint(p, t);
    v.project(camera); if (v.z > 1) return null; return [(v.x + 1) / 2 * 1080, (1 - v.y) / 2 * 1920];
  };
  window._project = project;
  window._actorsDump = () => Object.entries(cur.actors).map(([k, a]) => `${k}: pos=${a.ch.root.position.toArray().map(v => v.toFixed(2))} vis=${a.ch.root.visible} sk=${a.sk ? a.sk.root.visible + '@' + a.sk.root.position.toArray().map(v => v.toFixed(2)) : '-'}`).join('\n');
  if (!window._grab) drawOverlay(overlayG, t, C, project);
  return true;
};
// composite GL + overlay into one canvas in-page (guaranteed in sync), return JPEG data URL
let fin;
window.grabFrame = (t, q = .93) => {
  window._grab = true; window.renderFrame(t); window._grab = false;
  const OW = window._opts?.ow || 1080, OH = window._opts?.oh || 1920;
  if (!fin) { fin = document.createElement('canvas'); fin.width = OW; fin.height = OH; }
  const g = fin.getContext('2d', { willReadFrequently: true }); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.imageSmoothingQuality = 'high';
  g.drawImage(renderer.domElement, 0, 0, OW, OH); g.setTransform(OW / 1080, 0, 0, OH / 1920, 0, 0);
  drawOverlay(g, t, C, window._project, true);
  return fin.toDataURL('image/jpeg', q);
};
// camera + actor positions for the spatial audio mixer (no rendering)
window.trackAt = (t) => {
  const i = sceneAt(t); if (i !== cur.idx) { _cull.list.length = 0; loadScene(i); SH.ver++; if (window._opts?.lightCap) warmScene(cur.scene); }
  for (const a of Object.values(cur.actors)) a._t = undefined;
  applyCamera(t); camera.updateMatrixWorld();
  const f = new THREE.Vector3(); camera.getWorldDirection(f);
  const shots = cur.sc.shots; let sh = shots[0]; for (const x of shots) if (t >= x.t0) sh = x;
  const A = {}; for (const [id, a] of Object.entries(cur.actors)) { const s = evalActor(a, t); const h = headPos(a, t); A[id] = [+h.x.toFixed(2), +h.y.toFixed(2), +h.z.toFixed(2), s.visible && !(s.rag && t >= s.rag.t0 + 1.5) ? 1 : 0, s.walk ? +s.walk.phase.toFixed(3) : -1, s.walk?.run ? 1 : 0, +(s.rag && t >= s.rag.t0 ? 1 : 0)]; }
  return { sc: i, set: cur.sc.set, p: camera.position.toArray().map(v => +v.toFixed(2)), f: f.toArray().map(v => +v.toFixed(3)), body: sh.cam.type === 'body' ? sh.cam.who : null, A };
};
window.studioInfo = () => ({ duration: C.duration, fps: C.fps });
