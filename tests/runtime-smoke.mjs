// Integration test; requires the Chrome installed by npm and its OS libraries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const ep of ['test_pult', 'demo_zone', 'demo_fx', 'demo_media', 'demo_toy']) {
  execFileSync(process.execPath, ['studio.js', 'build', ep], { cwd: root, stdio: 'pipe' });
  console.log('build OK:', ep);
}
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const f = path.resolve(root, relative);
  if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404).end(); return; }
  const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.ttf': 'font/ttf' };
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/engine/page.html`);
  await page.waitForFunction('window.studioReady && window.initStudio');
  const C = JSON.parse(fs.readFileSync(path.join(root, 'work/demo_zone/compiled.json')));
  await page.evaluate(c => window.initStudio(c, { w: 180, h: 320, ow: 180, oh: 320, bloom: false, noShadow: true, aa: false }), C);
  const sceneStart = C.scenes[2].t0;
  const q = await page.evaluate(t => {
    const sample = time => {
      window.renderFrame(time); let sk = null;
      window._scene.traverse(x => { if (x.userData.skinned) sk = x.userData.skinned; });
      if (!sk || !sk.bones.LeftArm) return null;
      return { q: sk.bones.LeftArm.quaternion.toArray(), clips: sk.clips.map(c => c.name), root: sk.root.position.toArray() };
    };
    return [sample(t + .4), sample(t + 1.25)];
  }, sceneStart);
  assert.ok(q[0] && q[1], 'skinned actor / arm bone missing');
  assert.ok(q[0].clips.includes('Walk'), 'walk animation missing');
  assert.ok(q[0].q.some((x, i) => Math.abs(x - q[1].q[i]) > .005), `animation did not move arm: ${JSON.stringify(q)}`);
  console.log('GLB skeleton, Walk animation and scene transitions OK');
  assert.deepEqual(errors, [], `browser errors: ${errors.join('; ')}`);
  await page.close();
  const extra = structuredClone(C);
  for (const sc of extra.scenes) for (const actor of Object.values(sc.actors)) if (actor.app.skinned) actor.app.skinned.mocapFile = 'assets/models/skinned/soldier_male.glb';
  const p2 = await browser.newPage(); const errors2 = []; p2.on('pageerror', e => errors2.push(e.message));
  await p2.goto(`http://127.0.0.1:${server.address().port}/engine/page.html`); await p2.waitForFunction('window.studioReady && window.initStudio');
  await p2.evaluate(c => window.initStudio(c, { w: 180, h: 320, ow: 180, oh: 320, bloom: false, noShadow: true, aa: false }), extra);
  const count = await p2.evaluate(t => { window.renderFrame(t); let n = 0; window._scene.traverse(o => { if (o.userData.skinned) n = o.userData.skinned.clips.length; }); return n; }, sceneStart + .4);
  assert.ok(count >= 34, `external animation clips not loaded: ${count}`); assert.deepEqual(errors2, []);
  await p2.close(); console.log('external GLB animation clip file OK');

  // The optional toy rig, voice envelope, movable kitchen and random access.
  const toy = JSON.parse(fs.readFileSync(path.join(root, 'work/demo_toy/compiled.json')));
  assert.equal(toy.speech.length, 3);
  for (const line of toy.speech) {
    assert.ok(line.env.filter(x => x > .05).length > line.env.length * .25, `mouth envelope lost samples: ${line.spk}`);
  }
  const p3 = await browser.newPage(), e3 = []; p3.on('pageerror', e => e3.push(e.message));
  await p3.goto(`http://127.0.0.1:${server.address().port}/engine/page.html`); await p3.waitForFunction('window.studioReady && window.initStudio');
  await p3.evaluate(c => window.initStudio(c, { w: 180, h: 320, ow: 180, oh: 320, bloom: false, noShadow: true, aa: false }), toy);
  const states = await p3.evaluate(() => {
    const sample = t => {
      window.renderFrame(t);
      const door = window._scene.getObjectByName('toyFridgeDoor'), stack = window._scene.getObjectByName('toyPlateStack');
      let faces = 0; window._scene.traverse(o => { if (o.name === 'toyFace') faces++; });
      return { open: door.userData.open, rotation: door.rotation.y, height: stack.userData.height, plates: stack.children.filter(p => p.visible).length, faces,
        apron: !!window._scene.getObjectByName('toyApron')?.visible, remote: !!window._scene.getObjectByName('toyRemote'), cookie: !!window._scene.getObjectByName('toyCookie') };
    };
    const early = sample(.02), opened = sample(.9), late = sample(12.95), back = sample(.02), again = sample(12.95);
    const a = window.grabFrame(12.95); window.grabFrame(.02); const b = window.grabFrame(12.95);
    return { early, opened, late, back, again, sameFrame: a === b };
  });
  assert.equal(states.early.faces, 3); assert.ok(states.early.apron && states.early.remote && states.early.cookie);
  assert.equal(states.late.cookie, false, 'cookie was not released');
  assert.equal(states.early.open, 0); assert.equal(states.early.plates, 0);
  assert.ok(states.opened.open > .95 && states.opened.rotation < -1);
  assert.ok(states.late.height > 11.5 && states.late.plates >= 12);
  assert.equal(states.back.open, 0); assert.equal(states.back.plates, 0);
  assert.deepEqual(states.late, states.again); assert.ok(states.sameFrame, 'toy scene changed after backward seek');
  const food = await p3.evaluate(async () => {
    const { TOY_HAND_PROPS } = await import('/engine/toy-kitchen.js');
    return Object.entries(TOY_HAND_PROPS).map(([name, make]) => { const p = make(); return [name, p.name, p.children.length, p.position.z]; });
  });
  assert.equal(food.length, 6); for (const [key, name, n, z] of food) { assert.equal(key, name); assert.ok(n > 0 && z > .4); }
  assert.deepEqual(e3, []); await p3.close();

  const silent = structuredClone(toy); silent.speech[0].env = [];
  const p4 = await browser.newPage(), e4 = []; p4.on('pageerror', e => e4.push(e.message));
  await p4.goto(`http://127.0.0.1:${server.address().port}/engine/page.html`); await p4.waitForFunction('window.studioReady && window.initStudio');
  await p4.evaluate(c => window.initStudio(c, { w: 180, h: 320, ow: 180, oh: 320, bloom: false, noShadow: true, aa: false }), silent);
  const silentMotion = await p4.evaluate(() => {
    const face = t => { window.renderFrame(t); return window._scene.getObjectByName('toyFace').material.map.image.toDataURL(); };
    return face(2.3) !== face(2.5);
  });
  assert.ok(silentMotion, 'caption-only toy speech did not animate'); assert.deepEqual(e4, []); await p4.close();

  const mixed = structuredClone(toy); delete mixed.scenes[0].actors.papa.app.style;
  const p5 = await browser.newPage(), e5 = []; p5.on('pageerror', e => e5.push(e.message));
  await p5.goto(`http://127.0.0.1:${server.address().port}/engine/page.html`); await p5.waitForFunction('window.studioReady && window.initStudio');
  await p5.evaluate(c => window.initStudio(c, { w: 180, h: 320, ow: 180, oh: 320, bloom: false, noShadow: true, aa: false }), mixed);
  const faceCount = await p5.evaluate(() => { window.renderFrame(7.2); let n = 0; window._scene.traverse(o => { if (o.name === 'toyFace') n++; }); return n; });
  assert.equal(faceCount, 2); assert.deepEqual(e5, []); await p5.close();
  console.log('toy faces, speech envelope, hand props, kitchen, backwards seek and mixed legacy rigs OK');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}

// A fresh random-access request and a seek back must give the same frame.
execFileSync(process.execPath, ['studio.js', 'preview', 'demo_fx', '3.0,0.1,3.0', '--res', '180x320', '--out', '180x320', '--noaa', '--noshadow'], { cwd: root, stdio: 'pipe' });
const a = fs.readFileSync(path.join(root, 'work/demo_fx/preview/p00_3.00.jpg'));
const b = fs.readFileSync(path.join(root, 'work/demo_fx/preview/p02_3.00.jpg'));
assert.deepEqual(a, b, 'frames changed after seeking backwards');
console.log('effects and deterministic backward seek OK');
execFileSync(process.execPath, ['studio.js', 'preview', 'demo_media', '1.0', '--res', '180x320', '--out', '180x320', '--noaa', '--noshadow'], { cwd: root, stdio: 'pipe' });
assert.ok(fs.statSync(path.join(root, 'work/demo_media/preview/p00_1.00.jpg')).size > 1000);
console.log('local GLB prop and procedural CRT OK');
execFileSync(process.execPath, ['studio.js', 'audio', 'demo_zone'], { cwd: root, stdio: 'pipe' });
assert.match(fs.readFileSync(path.join(root, 'work/demo_zone/fx.wav.txt'), 'utf8'), /aeval=exprs=/);
assert.ok(fs.statSync(path.join(root, 'work/demo_zone/audio.wav')).size > 10000);
console.log('camera-relative stereo audio OK');
// Verify that retained chunks are reused, but invalidated even by a same-length script edit.
const ep = `_smoke_resume_${process.pid}`, epDir = path.join(root, 'episodes', ep);
const scenario = name => `export default { title:'${name}', transition:'cut', fps:2, cast:{}, scenes:[{set:'zone_shelter',light:'zoneInterior',cast:{},beats:[{dur:1,cam:'wide'}]}] };\n`;
const args = ['studio.js', 'render', ep, '--res', '120x216', '--out', '120x216', '--fps', '2', '--noaa', '--noshadow', '--chunk', '2', '--preset', 'ultrafast', '--keep'];
try {
  fs.mkdirSync(epDir, { recursive: true }); fs.writeFileSync(path.join(epDir, 'episode.mjs'), scenario('AAAA'));
  execFileSync(process.execPath, args, { cwd: root, stdio: 'pipe' });
  const same = execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8' }); assert.match(same, /0 to render/);
  fs.writeFileSync(path.join(epDir, 'episode.mjs'), scenario('BBBB'));
  const changed = execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8' }); assert.match(changed, /clearing old chunks/); assert.match(changed, /2 to render/);
  console.log('resumable render invalidates changed scripts OK');
} finally {
  fs.rmSync(epDir, { recursive: true, force: true }); fs.rmSync(path.join(root, 'work', ep), { recursive: true, force: true }); fs.rmSync(path.join(root, 'renders', ep + '.mp4'), { force: true });
}
console.log('Runtime smoke tests passed.');
