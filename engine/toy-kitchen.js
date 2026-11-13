// An original procedural kitchen and toy food props. All dimensions are in the
// same units as the original Studio sets; no assets from a reference video used.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const mat = (color, opts={}) => new THREE.MeshStandardMaterial({ color, roughness:.54, ...opts });
const rndbox = (w,h,d,m,r=.08) => { const g=new RoundedBoxGeometry(w,h,d,3,Math.min(r,w*.49,h*.49,d*.49)); const o=new THREE.Mesh(g,m); o.castShadow=o.receiveShadow=true; return o; };
const at=(o,x,y,z)=>{o.position.set(x,y,z);return o;};
const cyl=(rt,rb,h,m,seg=28)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);o.castShadow=o.receiveShadow=true;return o;};
const ball=(r,m)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,18,12),m);o.castShadow=o.receiveShadow=true;return o;};
function canvasTexture(fn,w=512,h=512) {const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function makePlate(radius=.57) {
  const g=new THREE.Group(), cream=mat('#fffef7',{roughness:.25}), rim=mat('#75cddd',{roughness:.3});
  g.add(cyl(radius*.72,radius*.67,.10,cream,32)); const edge=new THREE.Mesh(new THREE.TorusGeometry(radius*.78,.075,8,32),rim);edge.rotation.x=Math.PI/2;edge.position.y=.07;g.add(edge);
  g.add(at(cyl(radius*.77,radius*.7,.04,cream,32),0,.055,0));return g;
}
function pie() {
  const g=new THREE.Group(), crust=mat('#d99543'), filling=mat('#eab765');
  g.add(cyl(.70,.66,.24,crust,32));g.add(at(cyl(.65,.64,.10,filling,32),0,.16,0));
  // A simple baked lattice, rather than a texture from an outside source.
  const light=mat('#f2cb82'); for(const angle of [-.7,.7])for(const x of [-.28,0,.28]){const b=rndbox(.10,.06,1.02,light,.03);b.position.set(x,.235,0);b.rotation.y=angle;g.add(b);}return g;
}
function cookie() {const g=new THREE.Group();g.add(cyl(.37,.37,.13,mat('#e2aa5d'),24));for(const [x,z] of [[-.17,-.09],[.1,-.15],[.17,.12],[-.08,.17]])g.add(at(ball(.055,mat('#75472c')),x,.095,z));return g;}
function spoon() { const g=new THREE.Group(), metal=mat('#d8dce2',{metalness:.55,roughness:.24}); const h=rndbox(.10,.7,.10,metal,.04);h.position.y=-.22;g.add(h);const b=ball(.22,metal);b.scale.set(.8,1,.36);b.position.y=.23;g.add(b);return g; }
function saladBowl() {const g=new THREE.Group();g.add(cyl(.52,.31,.3,mat('#f5f8fc'),32)); for(const [x,y,z] of [[-.24,.19,-.1],[.08,.18,-.18],[.22,.2,.10],[-.12,.18,.20],[.02,.23,.04]]){const b=ball(.17,mat(x>0?'#f36d4a':'#7cc853'));b.scale.set(1,.55,1);g.add(at(b,x,y,z));}return g;}
// Existing actor 'hold' command can mount these on either hand. Put them just
// outside the rounded palm, not inside it; arm poses rotate the entire group.
const mount = (o, name) => { o.position.set(0,-.08,.58); o.name = name; return o; };
function remote() {
  const g=new THREE.Group(), body=rndbox(.34,.82,.15,mat('#262933'),.07);g.add(body);
  for(let i=0;i<4;i++){const b=ball(.045,mat(i===0?'#fa6767':'#c5d0db'));b.scale.z=.35;b.position.set(0,.25-i*.15,.09);g.add(b);}
  return g;
}
export const TOY_HAND_PROPS = {
  toyPlate:()=>mount(makePlate(.52), 'toyPlate'),
  toyPie:()=>{const g=pie();g.scale.setScalar(.65);return mount(g, 'toyPie');},
  toyCookie:()=>mount(cookie(), 'toyCookie'), toySpoon:()=>mount(spoon(), 'toySpoon'),
  toySalad:()=>{const g=saladBowl();g.scale.setScalar(.72);return mount(g, 'toySalad');},
  toyRemote:()=>mount(remote(), 'toyRemote'),
};

export function toyKitchen(scene) {
  const props={}, wall=mat('#f8d66b'), coral=mat('#f48970'), trim=mat('#fff4df'), wood=mat('#c38957'), darkWood=mat('#a7643e'), white=mat('#fffdf4'), teal=mat('#85ced5'), pink=mat('#ef93b7'), glass=mat('#8dd8ed',{emissive:'#56b5de',emissiveIntensity:.16}), dark=mat('#66524b'), red=mat('#e95d61');
  // Room: front is open for the camera.
  scene.add(at(rndbox(24,.2,22,wood,.02),0,-.11,1.5));
  for(let i=-11;i<=11;i+=2) scene.add(at(rndbox(.045,.025,22,darkWood,.01),i,.012,1.5));
  scene.add(at(rndbox(24,16,.24,wall,.02),0,8,-7));
  scene.add(at(rndbox(24,2.1,.1,coral,.02),0,1.05,-6.83));
  scene.add(at(rndbox(24,.15,.14,trim,.03),0,2.13,-6.77));
  scene.add(at(rndbox(.24,10,15,wall,.02),-11.85,5,.5));
  scene.add(at(rndbox(.10,2.1,15,coral,.02),-11.7,1.05,.5));
  // Round blue rug.
  const rug=cyl(3.55,3.55,.045,mat('#8bd9e9'),56);rug.position.set(-.9,.04,.8);scene.add(rug);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.27,.065,8,48),mat('#d2f4f7'));ring.rotation.x=Math.PI/2;ring.position.set(-.9,.075,.8);scene.add(ring);
  // Window with a blue sky and rounded pink frame.
  const win=new THREE.Group();win.position.set(3.5,5.55,-6.72);scene.add(win);
  win.add(at(rndbox(4.1,3.55,.17,pink,.11),0,0,0));win.add(at(rndbox(3.68,3.12,.18,glass,.04),0,0,.11));
  win.add(at(rndbox(.17,3.25,.22,pink,.04),0,0,.23));win.add(at(rndbox(3.76,.17,.22,pink,.04),0,0,.23));
  win.add(at(rndbox(4.4,.22,.42,trim,.06),0,-1.8,.18));
  // A few simplified cloud shapes visible through the window.
  const cloud=mat('#f8ffff',{emissive:'#ffffff',emissiveIntensity:.18});for(const [x,y,s] of [[-.9,.9,.33],[-.6,.98,.24],[1.08,-.43,.27],[1.33,-.39,.19]]){const c=ball(s,cloud);c.scale.set(1.5,.58,.15);win.add(at(c,x,y,.215));}
  // Fridge: separately controlled door on a real hinge, shelf food inside.
  const fridge=new THREE.Group();fridge.position.set(-7.55,0,-5.65);scene.add(fridge);props.fridge=fridge;
  const shell=mat('#fff8e7'), inside=mat('#d8eefa');
  fridge.add(at(rndbox(3.1,5.9,.20,shell,.15),0,3,-1.08));fridge.add(at(rndbox(.19,5.9,2.25,shell,.08),-1.46,3,0));fridge.add(at(rndbox(.19,5.9,2.25,shell,.08),1.46,3,0));
  fridge.add(at(rndbox(3.1,.20,2.2,shell,.08),0,.12,0));fridge.add(at(rndbox(3.1,.20,2.2,shell,.08),0,5.90,0));
  for(const y of [1.4,2.9,4.35])fridge.add(at(rndbox(2.9,.09,2,inside,.03),0,y,0));
  for(let i=0;i<7;i++){const m=mat(['#f0a254','#8dc965','#ec6b61','#ffe477'][i%4]);const jar=cyl(.25,.25,.45,m,16);jar.position.set(-1.0+(i%3)*.7,1.65+Math.floor(i/3)*1.45,.05);fridge.add(jar);fridge.add(at(cyl(.26,.26,.06,white,16),jar.position.x,jar.position.y+.25,jar.position.z));}
  const door=new THREE.Group();door.name='toyFridgeDoor';door.position.set(-1.53,0,1.13);door.userData.open=0;fridge.add(door);props.fridgeDoor=door;
  door.add(at(rndbox(3.05,5.82,.26,white,.16),1.53,3,0));door.add(at(rndbox(.13,1.1,.18,pink,.05),2.72,4.05,.22));
  // Colourful fridge magnets, original abstract shapes.
  for(const [x,y,col] of [[.65,4.9,'#f68d84'],[1.22,4.5,'#95d4cc'],[1.95,5.05,'#f3bf50'],[.95,3.75,'#d2adf0']]){const s=ball(.15,mat(col));s.scale.z=.35;door.add(at(s,x,y,.19));}
  door.add(at(rndbox(3.02,.07,.04,mat('#d8cfc0'),.01),1.53,2.2,.17));
  // Counter and cabinets.
  const cabinet=new THREE.Group();cabinet.position.set(8.25,0,-5.78);scene.add(cabinet);props.cabinet=cabinet;
  cabinet.add(at(rndbox(6.2,2.7,2.25,teal,.10),0,1.35,0));cabinet.add(at(rndbox(6.45,.25,2.50,trim,.08),0,2.78,0));
  for(const x of [-2.0,0,2.0]){cabinet.add(at(rndbox(1.8,2.35,.09,mat('#a9e0df'),.08),x,1.38,1.14));cabinet.add(at(rndbox(.13,.46,.12,white,.04),x+.65,1.5,1.23));}
  // Cooker and faucet above the counter.
  cabinet.add(at(rndbox(2.0,.12,1.55,white,.05),-1.6,2.95,.04));for(const [x,z] of [[-2,-.35],[-1.15,-.35],[-2,.4],[-1.15,.4]]){const b=new THREE.Mesh(new THREE.TorusGeometry(.28,.04,6,24),dark);b.rotation.x=Math.PI/2;cabinet.add(at(b,x,3.04,z));}
  cabinet.add(at(rndbox(1.5,.06,1.3,mat('#bfd4d4'),.05),1.55,2.96,0));const tap=cyl(.06,.06,.75,mat('#b1b9bb',{metalness:.55,roughness:.3}),12);tap.position.set(1.55,3.32,-.65);cabinet.add(tap);
  // Wall shelves with pastel jars.
  const shelf=new THREE.Group();shelf.position.set(-2.0,0,-6.63);scene.add(shelf);shelf.add(at(rndbox(3.4,.18,.55,white,.05),0,5.9,.16));
  for(let i=0;i<5;i++){const col=['#f1a886','#8dced2','#e6b963','#b7a4d7','#9dcc85'][i];const j=cyl(.22,.22,.62,mat(col),16);shelf.add(at(j,-1.32+i*.65,6.29,.25));shelf.add(at(cyl(.24,.24,.08,white,16),-1.32+i*.65,6.64,.25));}
  // Clock, pot and plant make the environment read as a cosy kitchen.
  const clock=new THREE.Group();clock.position.set(7.3,7,-6.72);scene.add(clock);const disc=cyl(.73,.73,.12,white,32);disc.rotation.x=Math.PI/2;clock.add(disc);const outline=new THREE.Mesh(new THREE.TorusGeometry(.73,.07,8,32),pink);clock.add(at(outline,0,0,.10));clock.add(at(rndbox(.07,.48,.05,dark,.02),0,.16,.16));const hand=rndbox(.36,.07,.05,dark,.02);clock.add(at(hand,.15,0,.16));
  const pot=new THREE.Group();pot.position.set(9.3,3.12,-5.55);scene.add(pot);pot.add(cyl(.36,.28,.45,mat('#ef927c'),20));for(const [x,y,z] of [[0,.5,0],[-.2,.55,0],[.22,.6,.05],[.1,.74,-.1]]){const leaf=ball(.20,mat('#83c765'));leaf.scale.set(.8,1.4,.55);pot.add(at(leaf,x,y,z));}
  // Checked tablecloth: canvas is generated here and travels with the project.
  const check=canvasTexture((g,w,h)=>{g.fillStyle='#fff6ef';g.fillRect(0,0,w,h);g.fillStyle='rgba(228,82,90,.55)';for(let i=0;i<w;i+=128){g.fillRect(i,0,64,h);g.fillRect(0,i,w,64);}g.strokeStyle='rgba(180,60,68,.22)';g.lineWidth=4;for(let i=0;i<w;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.moveTo(0,i);g.lineTo(w,i);g.stroke();}});
  const table=new THREE.Group();table.position.set(.75,0,-2.9);scene.add(table);props.table=table;
  for(const [x,z] of [[-2.15,-1.15],[2.15,-1.15],[-2.15,1.15],[2.15,1.15]])table.add(at(rndbox(.23,2.36,.23,darkWood,.05),x,1.18,z));
  const cloth=new THREE.MeshStandardMaterial({map:check,roughness:.8});table.add(at(rndbox(5.15,.33,3.12,cloth,.10),0,2.42,0));
  const foods=new THREE.Group();foods.name='toyTableFood';table.add(foods);props.tableFood=foods;
  const plate=makePlate(.83);foods.add(at(plate,-1.1,2.64,0));const wholePie=pie();foods.add(at(wholePie,-1.1,2.86,0));
  const bowl=saladBowl();foods.add(at(bowl,.90,2.85,-.15));
  const fruit=ball(.26,mat('#f1a035'));foods.add(at(fruit,1.85,2.9,.35));
  // Independent plate stack: set val height from 0 to 12. Fractions smoothly
  // scale the top plate so it can grow with animated numeric keyframes.
  const stack=new THREE.Group();stack.name='toyPlateStack';stack.position.set(2.5,2.66,-2.75);stack.userData.height=0;scene.add(stack);props.plateStack=stack;
  const plates=[];for(let i=0;i<12;i++){const p=makePlate(.60);p.name='toyStackPlate';p.position.y=i*.30;p.visible=false;stack.add(p);plates.push(p);}
  // Ceiling pendant, a subtle fill independent of the normal preset.
  scene.add(at(cyl(.025,.025,1.6,dark,8),.25,9.2,-2.4));
  const shade=cyl(.24,.85,.55,mat('#f59383'),24);scene.add(at(shade,.25,8.35,-2.4));
  const bulb=ball(.20,mat('#fff7d2',{emissive:'#ffe4a8',emissiveIntensity:.8}));scene.add(at(bulb,.25,8.00,-2.4));
  const fill=new THREE.PointLight('#fff0d9',45,26,1.6);fill.position.set(0,7,5);scene.add(fill);
  return { props, update() {
    door.rotation.y=-Math.PI*.56*Math.max(0,Math.min(1,door.userData.open||0));
    const h=Math.max(0,Math.min(12,stack.userData.height||0));
    plates.forEach((p,i)=>{const k=Math.max(0,Math.min(1,h-i));p.visible=k>.001;p.scale.setScalar(Math.max(.01,k));});
  } };
}
