import * as THREE from 'three';
import './style.css';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc7cb);
scene.fog = new THREE.FogExp2(0x9bc7cb, 0.0065);
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.1, 260);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
$('#game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc8f1f0, 0x594b32, 2.15));
const sun = new THREE.DirectionalLight(0xffe6bd, 3.2);
sun.position.set(-35, 55, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80; sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
scene.add(sun);

const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });
const groundMat = mat(0x70834c);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240, 70, 70), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
const pos = ground.geometry.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i);
  pos.setZ(i, Math.sin(x * 0.11) * Math.cos(y * 0.13) * 0.7 + Math.sin(x * .045 + y * .04) * 1.1);
}
ground.geometry.computeVertexNormals();
scene.add(ground);
const water = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), mat(0x368a91, .3));
water.rotation.x = -Math.PI / 2; water.position.y = -2.0; scene.add(water);

// A rugged, green island edge, surrounded by bright Bermuda water.
const coastline = new THREE.Mesh(new THREE.RingGeometry(88, 98, 96), new THREE.MeshStandardMaterial({ color: 0xc3b27e, roughness: 1, side: THREE.DoubleSide }));
coastline.rotation.x = -Math.PI / 2; coastline.position.y = -0.75; scene.add(coastline);
const reef = new THREE.Mesh(new THREE.RingGeometry(98, 114, 96), new THREE.MeshStandardMaterial({ color: 0x71b9ad, roughness: .5, transparent: true, opacity: .65, side: THREE.DoubleSide }));
reef.rotation.x = -Math.PI / 2; reef.position.y = -1.7; scene.add(reef);

// Paths & named settlement zones.
const roadMat = mat(0x887e61);
function road(points, width = 4) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x, .12, z)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 100, width / 2, 8, false), roadMat);
  mesh.receiveShadow = true; scene.add(mesh);
}
road([[-73,25],[-52,13],[-33,8],[-14,-3],[8,-13],[28,-20],[53,-26],[73,-35]], 5);
road([[-33,8],[-30,27],[-20,44],[-5,58],[11,69]], 4);
road([[10,-13],[13,3],[8,20],[8,40]], 4);
road([[28,-20],[40,-4],[48,13],[60,21]], 3.5);

const buildingMats = [mat(0xc8ad7b), mat(0xd4c6a1), mat(0xbd8061), mat(0xe0d4ad), mat(0x9d8c6b)];
const roofMats = [mat(0x814b38), mat(0x684d39), mat(0x9b694c), mat(0x48544b)];
const colliders = [];
function house(x, z, w, d, h, colorIndex, style = 0) {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMats[colorIndex % buildingMats.length]);
  wall.position.y = h / 2; wall.castShadow = true; wall.receiveShadow = true; group.add(wall);
  if (style === 0) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.78, h*.48, 4), roofMats[(colorIndex + 1) % roofMats.length]);
    roof.rotation.y = Math.PI / 4; roof.position.y = h + h*.21; roof.castShadow = true; group.add(roof);
  } else {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.35, .35, d+.35), roofMats[(colorIndex + style) % roofMats.length]);
    roof.position.y = h + .14; roof.castShadow = true; group.add(roof);
    if (style === 2) {
      const upper = new THREE.Mesh(new THREE.BoxGeometry(w*.58, h*.62, d*.62), buildingMats[(colorIndex+1)%buildingMats.length]);
      upper.position.y = h + h*.31; upper.castShadow = true; group.add(upper);
    }
  }
  // Bright shutters/windows facing the road.
  const winMat = new THREE.MeshStandardMaterial({ color: 0x31464a, roughness: .42, emissive: 0x1d3435, emissiveIntensity: .28 });
  for (const side of [-1,1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(.8, .9, .06), winMat);
    win.position.set(side*w*.24, h*.57, d/2+.035); group.add(win);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.55, .08), mat(0x67452e));
    door.position.set(0, .78, d/2+.06); group.add(door);
  }
  scene.add(group);
  colliders.push({ x, z, w: w*.58, d: d*.58, h });
}
// Bermuda-inspired settlements: colorful homes, compounds and dense coastal blocks.
const clusters = [
  [-59, 12, 12], [-24, 35, 10], [1, 37, 13], [22, 3, 12], [49, 16, 11], [58, -35, 12], [4, -39, 12], [-40, -34, 11], [34, -56, 10]
];
for (const [cx, cz, n] of clusters) {
  for (let i=0; i<n; i++) {
    const a = rand(0, Math.PI*2), r = rand(5, 15);
    house(cx + Math.cos(a)*r, cz + Math.sin(a)*r, rand(4.5,8), rand(4,7), rand(3.2,5.8), Math.floor(rand(0,5)), Math.floor(rand(0,3)));
  }
}
// Central clocktower / landmark and rooftop watch posts.
function tower(x,z,height=15) {
  const g = new THREE.Group(); g.position.set(x,0,z);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(5, height, 5), mat(0xd3c5a0)); shaft.position.y=height/2; shaft.castShadow=true; g.add(shaft);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(4.2, 3.2, 4), roofMats[0]); cap.rotation.y=Math.PI/4; cap.position.y=height+1.6; cap.castShadow=true; g.add(cap);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(.85,24), mat(0xe8dfc7)); clock.position.set(0,height*.72,2.54); g.add(clock);
  scene.add(g); colliders.push({x,z,w:3.1,d:3.1,h:height});
}
tower(7, 3, 17); tower(-39,-30,10); tower(48,18,9);

// Palm trees and scattered tropical foliage.
const trunkMat = mat(0x79593d), leafMat = mat(0x315e3d), leafLite = mat(0x507547);
function palm(x,z,s=1) {
  const group = new THREE.Group(); group.position.set(x,0,z); group.scale.setScalar(s);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22,.38,6,7),trunkMat); trunk.position.y=3; trunk.rotation.z=-.09; trunk.castShadow=true; group.add(trunk);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const leaf=new THREE.Mesh(new THREE.BoxGeometry(.65,.12,4.7), i%2?leafMat:leafLite);
    leaf.position.set(Math.cos(a)*1.5,5.7+Math.sin(i*2)*.12,Math.sin(a)*1.5);
    leaf.rotation.y=-a; leaf.rotation.z=-.25; leaf.castShadow=true; group.add(leaf);
  }
  scene.add(group);
}
for(let i=0;i<54;i++) {
  const a=rand(0,Math.PI*2), r=rand(30,84);
  const x=Math.cos(a)*r, z=Math.sin(a)*r;
  if(!colliders.some(c=>Math.abs(x-c.x)<c.w+3&&Math.abs(z-c.z)<c.d+3)) palm(x,z,rand(.75,1.3));
}

// A first-person rifle, built from simple meshes so it never needs external assets.
const weapon = new THREE.Group(); camera.add(weapon); scene.add(camera);
const gunMetal = new THREE.MeshStandardMaterial({color:0x26302d,metalness:.65,roughness:.36});
const gunDark = mat(0x151b1a,.6), gunAccent=mat(0x9d7747,.68);
function gunPart(geo, material, x,y,z) { const m=new THREE.Mesh(geo,material); m.position.set(x,y,z); weapon.add(m); return m; }
gunPart(new THREE.BoxGeometry(.22,.24,.8),gunMetal,.36,-.3,-.72);
gunPart(new THREE.BoxGeometry(.12,.12,.58),gunDark,.36,-.29,-1.33);
gunPart(new THREE.CylinderGeometry(.035,.035,.68,10),gunDark,.36,-.22,-1.65).rotation.x=Math.PI/2;
gunPart(new THREE.BoxGeometry(.13,.33,.2),gunDark,.36,-.53,-.68).rotation.x=-.22;
gunPart(new THREE.BoxGeometry(.16,.29,.12),gunAccent,.36,-.55,-.92).rotation.x=-.22;
gunPart(new THREE.BoxGeometry(.16,.06,.24),gunDark,.36,-.15,-.94);
gunPart(new THREE.BoxGeometry(.08,.09,.16),gunDark,.36,-.12,-.75);
weapon.position.set(0,0,0);

// Enemy patrols: stylized opponents with readable silhouettes and simple AI.
const enemies=[];
const enemyBody = mat(0x6a4934), enemyVest = mat(0x343b35), enemyHead=mat(0xc38b68), enemyGear=mat(0x242b28);
function createEnemy(x,z,idx) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,1.15,9),enemyBody); body.position.y=1.25; body.castShadow=true; g.add(body);
  const vest=new THREE.Mesh(new THREE.BoxGeometry(.68,.76,.42),enemyVest); vest.position.y=1.37; vest.castShadow=true; g.add(vest);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,12,10),enemyHead); head.position.y=2.08; head.castShadow=true; g.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.31,12,8,0,Math.PI*2,0,Math.PI*.52),enemyGear); helmet.position.y=2.22; g.add(helmet);
  const legs=[];
  for(const side of [-1,1]) { const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.66,.27),enemyGear); leg.position.set(side*.19,.39,0); leg.castShadow=true; g.add(leg); legs.push(leg); }
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.92),gunDark); arm.position.set(.32,1.55,-.28); arm.rotation.x=-.1; g.add(arm);
  scene.add(g);
  enemies.push({g,legs,hp:100,alive:true,home:new THREE.Vector3(x,0,z),phase:rand(0,7),fire:rand(1,3),idx});
}
const enemySpawns=[[-31,18],[31,8],[-47,-24],[56,-29],[1,-54],[29,43],[-60,20],[65,12],[12,-34],[-12,46],[42,-50],[-53,-45]];
enemySpawns.forEach(([x,z],i)=>createEnemy(x,z,i));

const state={hp:100,ammo:30,reserve:120,kills:0,round:1,score:0,elapsed:0, firing:false, dead:false, aiming:false, reload:false};
const player={pos:new THREE.Vector3(0,1.72,68), yaw:0, pitch:0, speed:0};
camera.position.copy(player.pos);
const keys={};
let pointerLocked=false, lastShot=0, shotKick=0, muzzleUntil=0, damageFlash=0, hurtCooldown=0, reloadTimer=0;
const raycaster=new THREE.Raycaster();
const hitMeshes=[];
for(const e of enemies) hitMeshes.push(...e.g.children);

function showToast(text) { const t=$('#toast'); t.textContent=text; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),1500); }
function updateHUD() {
  $('#hp-value').textContent=Math.ceil(state.hp);
  $('#hp-fill').style.width=`${state.hp}%`;
  $('#ammo-value').textContent=String(state.ammo).padStart(2,'0');
  $('#reserve-value').textContent=String(state.reserve).padStart(3,'0');
  $('#kill-count').textContent=String(state.kills).padStart(2,'0');
  $('#alive-count').textContent=String(Math.max(0,enemies.filter(e=>e.alive).length+1)).padStart(2,'0');
  $('#score').textContent=String(state.score).padStart(5,'0');
  $('#round').textContent=String(state.round).padStart(2,'0');
  $('#health-card').classList.toggle('critical',state.hp<35);
}
function startReload() {
  if(state.reload||state.ammo===30||state.reserve===0||state.dead)return;
  state.reload=true; reloadTimer=1.25; $('#reload-label').classList.add('show');
  setTimeout(()=>{ if(state.dead)return; const n=Math.min(30-state.ammo,state.reserve); state.ammo+=n; state.reserve-=n; state.reload=false; $('#reload-label').classList.remove('show'); updateHUD(); },1250);
}
function shoot() {
  if(state.dead||state.reload||document.body.classList.contains('menu-open'))return;
  if(state.ammo<=0) { showToast('MAGAZINE EMPTY · PRESS R'); return; }
  const now=performance.now(); if(now-lastShot<115)return; lastShot=now; state.ammo--; shotKick=.12; muzzleUntil=now+55;
  $('#muzzle').classList.add('flash'); setTimeout(()=>$('#muzzle').classList.remove('flash'),55);
  camera.updateMatrixWorld();
  raycaster.setFromCamera(new THREE.Vector2((Math.random()-.5)*.014,(Math.random()-.5)*.014),camera);
  const aliveMeshes=enemies.filter(e=>e.alive).flatMap(e=>e.g.children);
  const hits=raycaster.intersectObjects(aliveMeshes,false);
  if(hits.length && hits[0].distance<68) {
    const enemy=enemies.find(e=>e.alive&&e.g.children.includes(hits[0].object));
    if(enemy) {
      enemy.hp-=hits[0].object.geometry.type==='SphereGeometry'?65:38;
      $('#hitmarker').classList.add('hit'); setTimeout(()=>$('#hitmarker').classList.remove('hit'),100);
      if(enemy.hp<=0) {
        enemy.alive=false; scene.remove(enemy.g); state.kills++; state.score+=250;
        $('#kill-feed').innerHTML=`<span>ELIMINATED</span>  OUTLANDER <b>+250</b>`;
        $('#kill-feed').classList.add('show'); setTimeout(()=>$('#kill-feed').classList.remove('show'),1800);
        if(enemies.every(e=>!e.alive)&&!state.wavePending) {
          state.wavePending=true;
          showToast('ISLAND CLEAR · NEXT WAVE INCOMING');
          setTimeout(()=>{
            if(state.dead)return;
            state.round++; state.reserve+=30;
            enemySpawns.forEach(([x,z],i)=>createEnemy(x,z,i));
            state.wavePending=false;
            showToast(`WAVE ${state.round} · AMMO SUPPLY +30`);
            updateHUD();
          },3000);
        }
      }
    }
  }
  updateHUD();
}
function damage(amount) {
  if(performance.now()-hurtCooldown<650||state.dead)return;
  hurtCooldown=performance.now(); state.hp=Math.max(0,state.hp-amount); damageFlash=.45;
  $('#damage-overlay').classList.add('show'); setTimeout(()=>$('#damage-overlay').classList.remove('show'),190);
  if(state.hp<=0) {state.dead=true; $('#end-title').textContent='MISSION FAILED'; $('#end-copy').textContent=`You eliminated ${state.kills} opponents. Drop back in?`; $('#end-screen').classList.add('show');}
  updateHUD();
}

function makeMap() {
  const c=$('#map-canvas'), ctx=c.getContext('2d');
  const draw=()=>{
    const w=c.width=c.clientWidth*2,h=c.height=c.clientHeight*2; ctx.scale(2,2);
    const W=c.clientWidth,H=c.clientHeight;
    ctx.fillStyle='#153e3d';ctx.fillRect(0,0,W,H);
    ctx.beginPath();ctx.ellipse(W*.52,H*.52,W*.4,H*.39,-.15,0,Math.PI*2);ctx.fillStyle='#bdad7b';ctx.fill();
    ctx.beginPath();ctx.ellipse(W*.52,H*.52,W*.37,H*.36,-.15,0,Math.PI*2);ctx.fillStyle='#67794b';ctx.fill();
    ctx.strokeStyle='#c2b382';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.13,H*.52);ctx.bezierCurveTo(W*.35,H*.38,W*.55,H*.65,W*.87,H*.61);ctx.stroke();
    ctx.strokeStyle='#ad9e72';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*.44,H*.75);ctx.quadraticCurveTo(W*.48,H*.55,W*.53,H*.3);ctx.stroke();
    for(const [x,z,name] of [[-59,12,'HANGAR'],[1,37,'BIMASAKTI'],[22,3,'PEAK'],[49,16,'CLOCK TOWER'],[58,-35,'FACTORY'],[-40,-34,'CAPE TOWN']]) {
      const px=W*(.52+x/260), py=H*(.52+z/260);ctx.fillStyle='#e6d9bb';ctx.font='700 7px DM Sans';ctx.textAlign='center';ctx.fillText(name,px,py);
    }
    const px=W*(.52+player.pos.x/260),py=H*(.52+player.pos.z/260);
    ctx.save();ctx.translate(px,py);ctx.rotate(-player.yaw);ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(4,4);ctx.closePath();ctx.fillStyle='#f0c67a';ctx.fill();ctx.restore();
    for(const e of enemies) if(e.alive){const ex=W*(.52+e.g.position.x/260),ey=H*(.52+e.g.position.z/260);ctx.beginPath();ctx.arc(ex,ey,1.7,0,7);ctx.fillStyle='#da755c';ctx.fill();}
  };
  return draw;
}
const drawMap=makeMap();

// Scenic sky with a warm island horizon and distant palms.
const sky=new THREE.Mesh(new THREE.SphereGeometry(240,32,20),new THREE.MeshBasicMaterial({color:0x9bc7cb,side:THREE.BackSide}));scene.add(sky);
const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(5,32),new THREE.MeshBasicMaterial({color:0xffe2ad}));sunDisc.position.set(-75,62,-130);sunDisc.lookAt(camera.position);scene.add(sunDisc);

function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min(.04,(now-(animate.last||now))/1000); animate.last=now; state.elapsed+=dt;
  if(!state.dead&&!document.body.classList.contains('menu-open')) {
    let forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
    let side=(keys.KeyD?1:0)-(keys.KeyA?1:0);
    if(moveVector.lengthSq()) {forward+=moveVector.y;side+=moveVector.x;}
    const mag=Math.hypot(forward,side);if(mag>0){forward/=mag;side/=mag;}
    const sprint=keys.ShiftLeft||keys.ShiftRight;
    const speed=(sprint?8.2:5.1)*(state.aiming?.72:1);
    const dx=(-Math.sin(player.yaw)*forward+Math.cos(player.yaw)*side)*speed*dt;
    const dz=(-Math.cos(player.yaw)*forward-Math.sin(player.yaw)*side)*speed*dt;
    const nx=clamp(player.pos.x+dx,-85,85), nz=clamp(player.pos.z+dz,-85,85);
    // Keep the player on the raised island surface; the terrain mesh is intentionally subtle.
    player.pos.y=1.72+Math.sin(state.elapsed*10)*Math.min(.035,mag*.009);
    const blocked=(x,z)=>colliders.some(c=>Math.abs(x-c.x)<c.w+0.55&&Math.abs(z-c.z)<c.d+0.55);
    if(!blocked(nx,player.pos.z))player.pos.x=nx;
    if(!blocked(player.pos.x,nz))player.pos.z=nz;
    camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;
    camera.position.copy(player.pos);
    const moving=mag>0;
    weapon.position.y=(moving?Math.sin(state.elapsed*10)*.018:0)-shotKick;
    shotKick=Math.max(0,shotKick-dt*.72);
    weapon.rotation.x=state.aiming?-.025:0; weapon.position.x=state.aiming?.02:0;
    weapon.scale.setScalar(state.aiming?.9:1);
    for(const e of enemies)if(e.alive){
      const ep=e.g.position, dist=ep.distanceTo(player.pos);e.phase+=dt;
      const targetDist=15;
      if(dist>targetDist&&dist<47) { const dir=new THREE.Vector3(player.pos.x-ep.x,0,player.pos.z-ep.z).normalize(); ep.addScaledVector(dir,dt*.8); }
      else if(dist>48){ep.x=e.home.x+Math.sin(e.phase*.42)*2;ep.z=e.home.z+Math.cos(e.phase*.42)*2;}
      e.g.lookAt(player.pos.x,0,player.pos.z);
      e.legs.forEach((l,i)=>l.rotation.x=Math.sin(e.phase*5+i*Math.PI)*.45*(dist>targetDist?.4:0));
      e.fire-=dt;
      if(dist<33&&e.fire<=0){e.fire=rand(1.7,3.8); if(Math.random()<.54)damage(rand(5,10));}
    }
    if(keys.Space&&now-lastShot>120)shoot();
  }
  if(state.aiming) camera.fov=THREE.MathUtils.lerp(camera.fov,57,.16); else camera.fov=THREE.MathUtils.lerp(camera.fov,76,.14);
  camera.updateProjectionMatrix();
  if(now%6<1)drawMap();
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);

const moveVector=new THREE.Vector2();
const touchLook={active:false,id:null,x:0,y:0};
$('#start-button').addEventListener('click',()=>{
  document.body.classList.remove('menu-open');$('#start-screen').classList.add('hidden');
  if(innerWidth>760)renderer.domElement.requestPointerLock?.();
});
$('#resume-button').addEventListener('click',()=>{document.body.classList.remove('menu-open');$('#pause-screen').classList.remove('show');});
$('#settings-button').addEventListener('click',()=>$('#settings-panel').classList.toggle('show'));
$('#settings-close').addEventListener('click',()=>$('#settings-panel').classList.remove('show'));
$('#sound-toggle').addEventListener('click',(e)=>{e.currentTarget.classList.toggle('active');e.currentTarget.textContent=e.currentTarget.classList.contains('active')?'ON':'OFF';});
$('#sensitivity').addEventListener('input',e=>$('#sensitivity-value').textContent=`${Number(e.target.value).toFixed(1)}×`);
$('#restart-button').addEventListener('click',()=>location.reload());
$('#menu-settings').addEventListener('click',()=>$('#settings-panel').classList.add('show'));
document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===renderer.domElement;});
document.addEventListener('mousemove',e=>{if(pointerLocked){const sens=Number($('#sensitivity').value)*.0018;player.yaw-=e.movementX*sens;player.pitch=clamp(player.pitch-e.movementY*sens,-1.35,1.35);}});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR')startReload();if(e.code==='Escape'&&!document.body.classList.contains('menu-open')){document.body.classList.add('menu-open');$('#pause-screen').classList.add('show');document.exitPointerLock?.();}if(e.code==='KeyM')$('#map-panel').classList.toggle('map-large');});
document.addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0)shoot();if(e.button===2){state.aiming=true;}});
document.addEventListener('mouseup',e=>{if(e.button===2)state.aiming=false;});
document.addEventListener('contextmenu',e=>e.preventDefault());
$('#fire-button').addEventListener('pointerdown',e=>{e.preventDefault();shoot();});
$('#aim-button').addEventListener('pointerdown',e=>{e.preventDefault();state.aiming=true;});
$('#aim-button').addEventListener('pointerup',()=>state.aiming=false);
$('#reload-button').addEventListener('pointerdown',e=>{e.preventDefault();startReload();});
$('#sprint-button').addEventListener('pointerdown',e=>{e.preventDefault();keys.ShiftLeft=true;});
$('#sprint-button').addEventListener('pointerup',()=>keys.ShiftLeft=false);
$('#sprint-button').addEventListener('pointercancel',()=>keys.ShiftLeft=false);
$('#map-toggle').addEventListener('click',()=>$('#map-panel').classList.toggle('map-large'));
for(const [id,x,y] of [['up','0', '-1'],['down','0','1'],['left','-1','0'],['right','1','0']]){
  const el=$(`#move-${id}`);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);moveVector.set(Number(x),Number(y));});
  const release=()=>moveVector.set(0,0);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
}
renderer.domElement.addEventListener('touchstart',e=>{
  const t=[...e.changedTouches].find(v=>v.clientX>innerWidth*.42);if(t){touchLook.active=true;touchLook.id=t.identifier;touchLook.x=t.clientX;touchLook.y=t.clientY;}
},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{if(!touchLook.active)return;const t=[...e.changedTouches].find(v=>v.identifier===touchLook.id);if(t){const s=Number($('#sensitivity').value)*.004;player.yaw-=(t.clientX-touchLook.x)*s;player.pitch=clamp(player.pitch-(t.clientY-touchLook.y)*s,-1.35,1.35);touchLook.x=t.clientX;touchLook.y=t.clientY;}},{passive:true});
renderer.domElement.addEventListener('touchend',e=>{if([...e.changedTouches].some(v=>v.identifier===touchLook.id))touchLook.active=false;},{passive:true});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));});
updateHUD();
