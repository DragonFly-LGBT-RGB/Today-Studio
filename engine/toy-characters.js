// Stylised toy-like characters for family/comedy shorts. The rig implements the
// same interface as makeChar, so existing poses, cameras, holds and speech work.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const cache = new Map();
function box(w, h, d, color, radius = .18) {
  const r = Math.min(radius, w * .49, h * .49, d * .49), key = [w,h,d,r].join(':');
  if (!cache.has(key)) { const g = new RoundedBoxGeometry(w,h,d,4,r); g.userData.shared = true; cache.set(key, g); }
  const mesh = new THREE.Mesh(cache.get(key), color); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
function sphere(r, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.castShadow = true; return m; }
const material = color => new THREE.MeshPhysicalMaterial({ color, roughness: .36, metalness: 0, clearcoat: .22, clearcoatRoughness: .5 });

export function makeToyChar(scene, o = {}) {
  const root = new THREE.Group(); root.rotation.order = 'YXZ'; scene.add(root);
  const skinMat = material(o.skin || '#ffd72a'), shirtMat = material(o.shirt || '#458ddd'), pantsMat = material(o.pants || '#83c836');
  const hairMat = material(o.hair || '#53362a');
  const torso = box(2, 2, 1.05, shirtMat, .22); torso.position.y = 3; root.add(torso);
  const mkLeg = x => { const p = new THREE.Group(); p.position.set(x, 2, 0); root.add(p); const b = box(.98, 2, 1.02, pantsMat, .18); b.position.y = -1; p.add(b); return p; };
  const mkArm = x => {
    const p = new THREE.Group(); p.position.set(x, 3.86, 0); root.add(p);
    const sleeve = box(1, 1.46, 1.02, shirtMat, .26); sleeve.position.y = -.67; p.add(sleeve);
    const hand = new THREE.Group(); hand.position.set(0, -1.68, .03); p.add(hand); p.userData.hand = hand;
    const palm = sphere(.48, skinMat); palm.scale.set(1, .82, .9); palm.position.y = .08; hand.add(palm);
    return p;
  };
  const legR = mkLeg(-.5), legL = mkLeg(.5), armR = mkArm(-1.49), armL = mkArm(1.49);
  const head = new THREE.Group(); head.position.y = 4; root.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.31, .34, .24, 16), skinMat); neck.position.y = .10; head.add(neck);
  const hm = box(1.78, 1.64, 1.3, skinMat, .30); hm.position.y = .88; head.add(hm);
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.61, 1.49), new THREE.MeshBasicMaterial({ map:t, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 }));
  face.position.set(0,.89,.653); head.add(face);
  const F = { c, g:c.getContext('2d'), t, style:'toy', ...(o.face || {}) };

  // Hair is procedural, so the user can recolour/change it without external files.
  const add = (w,h,d,x,y,z,rz=0,r=.16) => { const m=box(w,h,d,hairMat,r); m.position.set(x,y,z); m.rotation.z=rz; head.add(m); return m; };
  const style = o.hairStyle || 'short';
  if (!['none','bald'].includes(style)) {
    if (['bun','toyBun','grandma'].includes(style)) {
      add(1.8,.38,1.38,0,1.72,0,0,.18);
      add(.38,.78,1.22,-.79,1.32,-.05,0,.16); add(.38,.78,1.22,.79,1.32,-.05,0,.16);
      add(.95,.32,.25,-.4,1.59,.61,.12,.15); add(.95,.32,.25,.4,1.59,.61,-.12,.15);
      const bun = sphere(.43,hairMat); bun.position.set(0,2.03,-.18); bun.scale.set(1,1.05,.95); head.add(bun);
    } else if (style === 'long' || style === 'ponytail') {
      add(1.84,.32,1.4,0,1.71,0); add(1.7,1.27,.4,0,1.08,-.52); add(.35,1.03,1.15,-.78,1.22,-.03); add(.35,1.03,1.15,.78,1.22,-.03);
      add(.7,.31,.3,-.53,1.58,.61,.15); add(.7,.31,.3,.53,1.58,.61,-.15);
      if (style === 'ponytail') { const p=sphere(.34,hairMat); p.position.set(0,1.4,-.95); p.scale.y=1.6; head.add(p); }
    } else {
      add(1.84,.34,1.38,0,1.70,-.01,0,.16); add(1.75,.65,.3,0,1.37,-.54,0,.12);
      add(.28,.48,1.12,-.79,1.43,-.02,0,.12); add(.28,.48,1.12,.79,1.43,-.02,0,.12);
      for (let i=0;i<4;i++) add(.53,.30,.30,-.61+i*.40,1.58,.64,(i-1.5)*-.09,.13);
    }
  }
  const cheeks=[];
  for (const x of [-.55,.55]) { const cheek=sphere(.26,skinMat); cheek.position.set(x,.56,.67); cheek.scale.set(1,.72,.34); cheek.visible=false; head.add(cheek); cheeks.push(cheek); }
  F.cheeks=cheeks; face.name = 'toyFace';
  const acc = {};
  acc.shades = new THREE.Group(); acc.shades.position.set(0,.96,.73); acc.shades.visible=false; head.add(acc.shades);
  const dark=material('#22212b'); for(const x of [-.36,.36]) {const m=box(.62,.32,.07,dark,.08);m.position.x=x;acc.shades.add(m);}
  if (o.apron || o.apronText !== undefined) {
    acc.apron = new THREE.Group(); acc.apron.name = 'toyApron'; root.add(acc.apron);
    const cloth = material(o.apronColor || '#fffdf3');
    const bib=box(1.35,1.62,.08,cloth,.04); bib.position.set(0,3.02,.57); acc.apron.add(bib);
    const skirt=box(1.65,.65,.09,cloth,.06); skirt.position.set(0,2.01,.57); acc.apron.add(skirt);
    const pocket=box(.58,.40,.04,material('#ffe8e9'),.08); pocket.position.set(.34,2.75,.635); acc.apron.add(pocket);
    acc.apron.visible=false;
  }
  if(o.scale) root.scale.set(...o.scale);
  const ch = { root, torso, head, armL, armR, legL, legR, F, acc, o, skinMat, hm, neck, faceMesh: face, badge:null };
  ch.reset = () => { for (const p of [armL,armR,legL,legR,head]) p.rotation.set(0,0,0); root.rotation.set(0,0,0); root.visible=true; acc.shades.visible=false; if(acc.apron) acc.apron.visible=false; };
  ch.hand = side => (side==='L'?armL:armR).userData.hand.getWorldPosition(new THREE.Vector3());
  return ch;
}

// All facial art is redrawn on a transparent canvas, controlled by the same
// expression presets/lip envelope as the original character factory.
export function drawToyFace(F, e) {
  const g=F.g; g.clearRect(0,0,512,512); const ex=[160,352], eyeY=216+(e.lookY||0)*8, dx=(e.lookX||0)*10;
  g.lineCap='round'; g.lineJoin='round'; g.strokeStyle='#282329'; g.fillStyle='#282329';
  for(let i=0;i<2;i++) {
    const x=ex[i]+dx, y=eyeY;
    if(e.eyes==='spiral' && !e.blink) {
      g.lineWidth=8; g.beginPath(); for(let j=0;j<60;j++) {const a=j*.33,r=j*.46;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r; if(j===0)g.moveTo(px,py);else g.lineTo(px,py);} g.stroke();
    } else if(e.eyes==='star' && !e.blink) {
      g.beginPath(); for(let j=0;j<10;j++){const a=-Math.PI/2+j*Math.PI/5,r=j%2?15:36; if(!j)g.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);else g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.closePath();g.fill();
    } else if(e.eyes==='happy'||e.eyes==='closed'||e.blink) {
      g.lineWidth=11;g.beginPath(); if(e.eyes==='happy') {g.moveTo(x-34,y+6);g.quadraticCurveTo(x,y-27,x+34,y+6);} else {g.moveTo(x-32,y);g.quadraticCurveTo(x,y+18,x+32,y);}g.stroke();
    } else {
      const ry=Math.max(6,40*(e.eyeOpen??(e.eyes === 'lid' ? .58 : 1))); g.beginPath();g.ellipse(x,y,26*(e.eyeW||1),ry,0,0,Math.PI*2);g.fill();
      g.fillStyle='#fff';g.beginPath();g.arc(x-8,y-ry*.42,8,0,Math.PI*2);g.fill();g.fillStyle='#282329';
      if(F.lashes){g.lineWidth=5;const s=i?1:-1;for(let j=0;j<2;j++){g.beginPath();g.moveTo(x+s*18,y-ry+12+j*10);g.lineTo(x+s*(32+j*3),y-ry+4+j*13);g.stroke();}}
    }
  }
  if(F.glasses) {
    g.strokeStyle=F.glassesColor||'#22212a'; g.lineWidth=13;
    for(const x of ex){g.beginPath();g.arc(x+dx,eyeY+1,65,0,Math.PI*2);g.stroke();}
    g.beginPath();g.moveTo(ex[0]+65+dx,eyeY-4);g.quadraticCurveTo(256+dx,eyeY-19,ex[1]-65+dx,eyeY-4);g.stroke();
  }
  g.strokeStyle='#282329';g.lineWidth=11;
  for(let i=0;i<2;i++){const s=i?1:-1,x=ex[i]+dx,y=eyeY-70-(e.browY||0)*16-(F.glasses?12:0),ang=e.browAng||0;g.beginPath();g.moveTo(x-32,y+ang*s*10);g.quadraticCurveTo(x,y-8,x+32,y-ang*s*10);g.stroke();}
  const mx=256+dx*.5,my=344,open=e.mouthOpen||0;
  g.fillStyle='#282329';g.strokeStyle='#282329';g.lineWidth=10;
  if(open>.08||e.mouth==='jaw'||e.mouth==='o') {
    const ry=e.mouth==='jaw'?44:e.mouth==='o'?24:17+open*35,rx=e.mouth==='o'?23:33+open*16;
    g.beginPath();g.ellipse(mx,my,rx,ry,0,0,Math.PI*2);g.fill();g.fillStyle='#ff8c9b';g.beginPath();g.ellipse(mx,my+ry*.45,rx*.58,ry*.24,0,0,Math.PI*2);g.fill();
  } else {g.beginPath(); if(e.mouth==='smile'||e.mouth==='grin'||e.mouth==='smirk'){g.moveTo(mx-40,my-4);g.quadraticCurveTo(mx,my+34,mx+40,my-4);} else if(e.mouth==='frown'){g.moveTo(mx-36,my+13);g.quadraticCurveTo(mx,my-19,mx+36,my+13);} else if(e.mouth==='wavy'){g.moveTo(mx-36,my+4);g.quadraticCurveTo(mx-18,my-8,mx,my+4);g.quadraticCurveTo(mx+18,my+16,mx+36,my+4);} else {g.moveTo(mx-24,my);g.lineTo(mx+24,my);} g.stroke();}
  if(e.blush||F.blush){g.fillStyle='rgba(255,115,120,.38)'; for(const x of [105,407]){g.beginPath();g.ellipse(x,302,30,16,0,0,Math.PI*2);g.fill();}}
  if(e.sweat){g.fillStyle='#69c8ff';g.beginPath();g.moveTo(445,125);g.quadraticCurveTo(470,171,445,180);g.quadraticCurveTo(420,171,445,125);g.fill();}
  if(e.tears){g.fillStyle='rgba(100,185,255,.8)';for(const x of ex)g.fillRect(x-9,eyeY+35,18,105);}
  for(const cheek of F.cheeks||[]) cheek.visible=!!e.cheeks;
  F.t.needsUpdate=true;
}
