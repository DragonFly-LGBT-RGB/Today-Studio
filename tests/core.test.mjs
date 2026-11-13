import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { SETS } from '../engine/setdata.mjs';
import { EXPR, clipPose } from '../engine/anim.js';
import toyEpisode from '../episodes/demo_toy/episode.mjs';
import { gains, sourceAt, ffmpegPan } from '../tools/spatial.mjs';

test('reference-inspired sets expose anchors and cameras', () => {
  for (const id of ['zone_airfield', 'zone_hangar', 'zone_shelter']) {
    assert.ok(SETS[id].anchors.hero); assert.ok(SETS[id].cams.wide);
  }
});

test('toy mode exposes a kitchen, expressions, gestures and a mixed-voice example', () => {
  const set = SETS.toy_kitchen;
  for (const id of ['kid', 'parent', 'grandma', 'fridge', 'table']) assert.ok(set.anchors[id]);
  for (const id of ['fridgeDoor', 'plateStack', 'tableFood']) assert.ok(set.props.includes(id));
  assert.ok(set.cams.wide); assert.ok(set.lights.includes('toyDay'));
  for (const name of ['toyTalk', 'toyReach', 'taste', 'guard', 'excited', 'dizzy']) {
    assert.ok(clipPose(name, .6, 1.0).aR, name);
    assert.deepEqual(clipPose(name, .6, 1.0), clipPose(name, .6, 1.0), `${name} must be deterministic`);
  }
  assert.equal(EXPR.delighted.cheeks, true); assert.equal(EXPR.dizzy.eyes, 'spiral');
  assert.equal(toyEpisode.cast.grandma.style, 'toy');
  assert.equal(toyEpisode.scenes[0].set, 'toy_kitchen');
});

test('camera-right source is louder in the right channel and loses volume with distance', () => {
  const l = { p: [0, 0, 0], f: [0, 0, -1] };
  const right = gains(l, [4, 0, -2], { pan: 1 });
  const left = gains(l, [-4, 0, -2], { pan: 1 });
  assert.ok(right[1] > right[0]); assert.ok(left[0] > left[1]);
  const far = gains(l, [80, 0, -40]);
  assert.ok(Math.hypot(...far) < Math.hypot(...right));
});

test('spatial sources can follow actors or use named anchors', () => {
  const track = { set: 'zone_airfield', A: { actor: [1, 2, 3, 1] } };
  assert.deepEqual(sourceAt('actor', track, SETS), [1, 2, 3]);
  assert.deepEqual(sourceAt({ actor: 'actor', off: [2, 0, 1] }, track, SETS), [3, 2, 4]);
  assert.deepEqual(sourceAt('wreck', track, SETS), SETS.zone_airfield.anchors.wreck);
  assert.equal(sourceAt('not-an-actor', track, SETS), null);
});

test('ffmpeg actually applies dynamic stereo gains', () => {
  const pan = ffmpegPan([{ t: 0, g: [.9, .15] }, { t: .3, g: [.9, .15] }]);
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.3', '-af', `aformat=channel_layouts=mono,${pan.slice(0, -1)}`, '-f', 'f32le', '-'], { maxBuffer: 2e6 });
  assert.equal(r.status, 0, String(r.stderr));
  const b = r.stdout; let l = 0, rr = 0;
  for (let i = 0; i + 7 < b.length; i += 8) { l += b.readFloatLE(i) ** 2; rr += b.readFloatLE(i + 4) ** 2; }
  assert.ok(l > rr * 20, `left=${l} right=${rr}`);
});

function glbJson(file) {
  const buf = fs.readFileSync(new URL(file, import.meta.url));
  assert.equal(buf.toString('ascii', 0, 4), 'glTF');
  return JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString());
}
test('bundled local models contain a skeleton and reusable animations', () => {
  for (const file of ['../assets/models/skinned/zombie_male.glb', '../assets/models/skinned/soldier_male.glb']) {
    const g = glbJson(file); assert.ok(g.skins?.length > 0);
    const names = g.animations.map(a => a.name);
    for (const name of ['Idle', 'Walk', 'Punch']) assert.ok(names.includes(name), `${file}: ${name}`);
  }
});
