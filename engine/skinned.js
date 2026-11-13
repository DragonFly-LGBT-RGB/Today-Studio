// Local glTF/GLB skeletal characters and their animation clips.
// Assets are loaded from the project, never downloaded by the renderer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

export const SKIN_LIST = ['zombie_male', 'soldier_male'];
const MODELS = new Map(), MOTIONS = new Map();
const loader = new GLTFLoader();

function assetURL(name, folder) {
  // A local relative path, including subfolders, but no remote URLs or '..'.
  let s = String(name || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!s || /(^|\/)\.\.?(\/|$)/.test(s) || /[:?#]/.test(s)) throw new Error(`Bad ${folder} path: ${name}`);
  if (s.startsWith('assets/')) return '/' + s;
  if (!/\.gl(?:b|tf)$/i.test(s)) s += '.glb';
  return `/assets/${folder}/${s}`;
}

export async function preloadSkinned(list = SKIN_LIST) {
  await Promise.all([...new Set(list.filter(Boolean))].map(async key => {
    if (MODELS.has(key)) return;
    try {
      const g = await loader.loadAsync(assetURL(key, 'models/skinned'));
      g.scene.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      MODELS.set(key, g);
    } catch (e) { console.warn(`Не загружена GLB-модель ${key}: ${e.message}`); }
  }));
}

// Optional additional clips exported with exactly the same bone names as the model.
// General-purpose retargeting between arbitrary skeletons is intentionally not assumed.
export async function preloadMocap(list = []) {
  await Promise.all([...new Set(list.filter(Boolean))].map(async key => {
    if (MOTIONS.has(key)) return;
    try { MOTIONS.set(key, (await loader.loadAsync(assetURL(key, 'mocap'))).animations); }
    catch (e) { console.warn(`Не загружена анимация ${key}: ${e.message}`); }
  }));
}
export const hasSkinned = key => MODELS.has(key);

const ALIASES = {
  Hips: ['Hips', 'Pelvis', 'hip'],
  Spine: ['Spine', 'Abdomen', 'Spine1'],
  Chest: ['Chest', 'Torso', 'Spine2', 'UpperChest'],
  Neck: ['Neck'], Head: ['Head'],
  LeftArm: ['LeftArm', 'UpperArmL', 'LeftUpperArm', 'upper_arm_l'],
  RightArm: ['RightArm', 'UpperArmR', 'RightUpperArm', 'upper_arm_r'],
  LeftForeArm: ['LeftForeArm', 'LowerArmL', 'LeftLowerArm', 'lower_arm_l'],
  RightForeArm: ['RightForeArm', 'LowerArmR', 'RightLowerArm', 'lower_arm_r'],
  LeftHand: ['LeftHand', 'FistL', 'HandL', 'hand_l'], RightHand: ['RightHand', 'FistR', 'HandR', 'hand_r'],
  LeftUpLeg: ['LeftUpLeg', 'UpperLegL', 'LeftUpperLeg', 'thigh_l'],
  RightUpLeg: ['RightUpLeg', 'UpperLegR', 'RightUpperLeg', 'thigh_r'],
  LeftLeg: ['LeftLeg', 'LowerLegL', 'LeftLowerLeg', 'calf_l'],
  RightLeg: ['RightLeg', 'LowerLegR', 'RightLowerLeg', 'calf_r'],
};
const norm = s => String(s || '').replace(/mixamorig/ig, '').replace(/[^a-z0-9]/ig, '').toLowerCase();
function findBones(model, overrides = {}) {
  const nodes = []; model.traverse(o => { if (o.isBone) nodes.push(o); });
  const out = {};
  for (const [key, aliases] of Object.entries(ALIASES)) {
    const candidates = overrides[key] ? [overrides[key], ...aliases] : aliases;
    out[key] = candidates.map(n => nodes.find(b => norm(b.name) === norm(n))).find(Boolean) || null;
  }
  for (const b of nodes) if (!out[b.name]) out[b.name] = b;
  return out;
}

export function makeSkinned(scene, o = {}) {
  const template = MODELS.get(o.src); if (!template) return null;
  const model = cloneSkeleton(template.scene);
  model.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(model), size = bbox.getSize(new THREE.Vector3());
  if (!size.y || !Number.isFinite(size.y)) { console.warn(`Пустая модель: ${o.src}`); return null; }
  const k = (o.height ?? 5.3) / size.y * (o.scale ?? 1);
  const root = new THREE.Group(), fitting = new THREE.Group();
  scene.add(root); root.add(fitting); fitting.add(model);
  fitting.scale.setScalar(k);
  const center = bbox.getCenter(new THREE.Vector3());
  model.position.x -= center.x; model.position.y -= bbox.min.y; model.position.z -= center.z;
  fitting.rotation.y = o.yaw ?? 0;
  model.updateMatrixWorld(true);
  const meshes = []; model.traverse(x => { if (x.isSkinnedMesh) meshes.push(x); if (x.isMesh) x.castShadow = x.receiveShadow = true; });
  // When names collide, the explicitly supplied animation file wins.
  const clips = [...(MOTIONS.get(o.mocapFile) || []), ...template.animations];
  const bones = findBones(model, o.bones);
  const restScales = new Map([...new Set(Object.values(bones).filter(Boolean))].map(b => [b, b.scale.clone()]));
  const sk = { root, fitting, model, meshes, bones, restScales, mixer: new THREE.AnimationMixer(model), clips, options: o, k, eyeScale: k };
  root.userData.skinned = sk;
  return sk;
}

function findClip(sk, name) {
  if (!name) return null;
  return sk.clips.find(c => c.name === name) || sk.clips.find(c => c.name.toLowerCase() === String(name).toLowerCase()) || null;
}
function autoClip(sk, s) {
  const map = sk.options.clipMap || {};
  const pose = String(s.poseName || 'idle').split('@')[0];
  let key = s.walk ? (s.walk.run ? 'run' : 'walk') : pose;
  const defaults = { idle: 'Idle', stand: 'Idle', zombie: 'Idle', zombieRoar: 'Idle', walk: 'Walk', run: 'Run',
    dead: 'Death', fall: 'Death', hit: 'RecieveHit', shoot: 'Shoot_OneHanded', sit: 'SitDown',
    clap: 'Victory', cheer: 'Victory', punch: 'Punch', attack: 'Punch',
    // storytime: narration rides on Idle (the speech gestures carry it), reactions get their own clip
    stTell: 'Idle', stChop: 'Idle', stFrame: 'Idle', stQuotes: 'Idle', stWhisper: 'Idle', stNoNo: 'Idle',
    stNod: 'Idle', stRoll: 'Idle', stCount: 'Idle', stLeanBack: 'Idle', stStare: 'Idle', stAwkward: 'Idle',
    stWipe: 'Idle', stCringe: 'Idle', stPointCam: 'Punch', stRage: 'SwordSlash', stDoubleTake: 'RecieveHit',
    stGasp: 'RecieveHit', stShimmy: 'Victory', stDespair: 'Defeat' };
  return map[key] || defaults[key] || sk.options.defaultAnimation || 'Idle';
}

// The mixer is evaluated at an absolute timestamp so previews can seek backwards.
export function driveSkinned(sk, ch, s, t, o = {}) {
  sk.root.visible = s.visible !== false;
  sk.root.position.copy(ch.root.position);
  sk.root.quaternion.copy(ch.root.quaternion);
  sk.root.scale.copy(ch.root.scale);
  for (const [bone, scale] of sk.restScales) bone.scale.copy(scale);
  const m = s.mocap;
  const requested = m?.clip || autoClip(sk, s);
  const clip = findClip(sk, requested) || findClip(sk, 'Idle') || sk.clips[0];
  if (clip) {
    if (sk.active !== clip || sk.loop !== (m?.loop !== false)) {
      sk.mixer.stopAllAction();
      sk.action = sk.mixer.clipAction(clip).reset().play();
      sk.loop = m?.loop !== false;
      sk.action.setLoop(sk.loop ? THREE.LoopRepeat : THREE.LoopOnce, sk.loop ? Infinity : 1);
      sk.action.clampWhenFinished = !sk.loop;
      sk.active = clip;
    }
    const start = m ? m.t0 : (s.walk ? t - s.walk.phase / (s.walk.run ? 13 : 9) : (s.poseT0 > -90 ? s.poseT0 : 0));
    let elapsed = Math.max(0, (t - start) * (m?.speed ?? 1) + (m?.start ?? 0));
    if (sk.loop && clip.duration > 0) elapsed %= clip.duration;
    else elapsed = Math.min(elapsed, Math.max(0, clip.duration - .00001));
    // Reset action loop state on every seek; avoids stale clamped/finished actions.
    sk.action.reset().play();
    sk.mixer.setTime(elapsed);
  }
  for (const [name, scale] of Object.entries(o.boneScale || {})) {
    const b = sk.bones[name]; if (b && Number.isFinite(+scale)) b.scale.multiplyScalar(Math.max(.001, +scale));
  }
  sk.root.updateMatrixWorld(true);
  return sk;
}

export function findEyes(sk) {
  if (!sk.bones.Head || sk.options.eyes === false) return null;
  const e = sk.options.eyes || { x: .11, y: .07, z: .12 };
  return [new THREE.Vector3(e.x, e.y, e.z), new THREE.Vector3(-e.x, e.y, e.z)];
}
export function bonePos(sk, name) { const b = sk.bones[name]; return b ? b.getWorldPosition(new THREE.Vector3()) : null; }
export function hideProxy(ch) { ch.root.traverse(o => { if (o.isMesh) o.visible = false; }); }
