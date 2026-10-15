import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../dist/world.js';
import {Flight,segmentDistanceSquared} from '../dist/flight.js';
import * as THREE from '../dist/vendor/three.module.js';
import {UI,escapeHTML} from '../dist/ui.js';
import {makeShip} from '../dist/space.js';
import {makeStation,makeCommercialShip} from '../dist/models.js';
import {ShipAudio,MUSIC} from '../dist/audio.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {normalizeFighter,fighterInstance} from '../dist/fighter.js';
import {readFileSync} from 'node:fs';

test('a captain can finish all six story chapters and continue taking independent jobs',()=>{
  const s=W.freshState();
  for(let chapter=0;chapter<W.STORY.length;chapter++){
    const story=W.contracts(s).find(c=>c.story);assert.ok(story);assert.equal(story.id,'story-'+chapter);
    const before=s.credits;assert.equal(W.accept(s,story.id).ok,true);assert.ok(W.cargoUsed(s)<=W.stats(s).hold);
    if(s.system!==story.dest){if(s.fuel<W.jumpCost(s,story.dest))assert.equal(W.service(s,'fuel').ok,true);assert.equal(W.jump(s,story.dest).ok,true);}
    if(story.type!=='courier')W.progress(s,story.type,story.count);
    assert.equal(W.ready(s,s.missions[0]),true);const settled=W.deliver(s,story.id);assert.equal(settled.ok,true);assert.ok(s.credits>=before+story.reward-200);assert.equal(W.deliver(s,story.id).ok,false);
    assert.ok(W.validateSave(JSON.parse(JSON.stringify(s))));
  }
  assert.equal(s.storyDone,true);assert.equal(s.system,'juniper');assert.ok(W.contracts(s).every(c=>!c.story));assert.ok(W.contracts(s).length>=5);assert.equal(s.missions.length,0);
});

test('cargo trading has real profitable routes, transaction limits, and no same-port arbitrage',()=>{
  const s=W.freshState(),start=s.credits,local=W.prices(s).find(g=>g.id==='grain');
  assert.ok(local.sell<local.buy);assert.equal(W.trade(s,'grain',10,'buy').ok,true);
  const snapshot=JSON.stringify(s);assert.equal(W.trade(s,'grain',31,'buy').ok,false);assert.equal(JSON.stringify(s),snapshot);
  assert.equal(W.trade(s,'grain',-1,'sell').ok,false);assert.equal(W.trade(s,'grain',11,'sell').ok,false);assert.equal(W.trade(s,'grain',.5,'buy').ok,false);
  assert.equal(W.jump(s,'bellwether').ok,true);const away=W.prices(s).find(g=>g.id==='grain');assert.ok(away.sell>local.buy);assert.equal(W.trade(s,'grain',10,'sell').ok,true);assert.ok(s.credits>start);assert.equal(W.cargoUsed(s),0);
});

test('sealed freight consumes hold space, settles only at its port, and cannot be paid twice',()=>{
  const s=W.freshState(),job=W.contracts(s).find(c=>c.type==='courier');assert.equal(W.accept(s,job.id).ok,true);assert.equal(W.cargoUsed(s),job.tons);assert.equal(W.deliver(s,job.id).ok,false);
  const loaded=W.stats(s).hold-job.tons;W.trade(s,'grain',loaded,'buy');assert.equal(W.freeHold(s),0);assert.equal(W.trade(s,'grain',1,'buy').ok,false);
  W.jump(s,job.dest);assert.equal(W.deliver(s,job.id).ok,true);assert.equal(W.deliver(s,job.id).ok,false);assert.equal(W.cargoUsed(s),loaded);
});

test('crew and ship upgrades change fuel, repairs, capacity, and payouts without destroying cargo',()=>{
  const s=W.freshState();s.credits=30000;const original=W.jumpCost(s,'deadlight');W.hire(s,'iona');assert.ok(W.jumpCost(s,'deadlight')<original);assert.equal(W.hire(s,'iona').ok,false);
  W.hire(s,'doc');W.upgrade(s,'hold');assert.equal(W.stats(s).hold,38);W.trade(s,'grain',31,'buy');const copy=JSON.stringify(s);assert.equal(W.buyShip(s,'kestrel').ok,false);assert.equal(JSON.stringify(s),copy);
  assert.equal(W.buyShip(s,'longhaul').ok,true);assert.equal(W.stats(s).hold,83);assert.equal(s.cargo.grain,31);W.upgrade(s,'shield');assert.equal(W.stats(s).shield,165);
  const m=W.contracts(s).find(c=>c.story);W.accept(s,m.id);W.jump(s,m.dest);W.progress(s,m.type,m.count);assert.equal(W.deliver(s,m.id).reward,Math.round(m.reward*1.15));
});

test('corrupt saves are rejected and market prices cannot be replaced by imported fields',()=>{
  const s=W.freshState();W.trade(s,'grain',2,'buy');const stock=W.market(s)[0].stock;s.markets.juniper[0].buy=1;
  const restored=W.validateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.equal(W.market(restored)[0].stock,stock);assert.notEqual(W.market(restored)[0].buy,1);
  for(const change of [v=>v.credits=-1,v=>v.fuel='100',v=>v.upgrades.hold=9,v=>v.cargo.ore=-1,v=>v.storyStage=7,v=>v.system='unknown']){const altered=structuredClone(s);change(altered);assert.equal(W.validateSave(altered),null);}
  const store={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};assert.equal(W.saveState(restored,store),true);assert.ok(W.loadState(store));assert.equal(W.saveState(restored,{setItem(){throw new Error('quota');}}),false);
});

test('rescue preserves mission cargo, takes a bounded tow fee, and restores a flyable ship',()=>{
  const s=W.freshState();W.accept(s,'story-0');s.cargo.grain=12;s.credits=300;s.fuel=0;s.hull=0;
  assert.equal(W.rescue(s),45);assert.equal(s.cargo.grain,6);assert.equal(s.missions.length,1);assert.equal(s.missions[0].tons,4);assert.ok(s.hull>0);assert.ok(s.fuel>=W.jumpCost(s,'bellwether'));
});

test('projectiles use swept collision, so high-speed shots do not tunnel through a target',()=>{
  const a=new THREE.Vector3(0,0,0),b=new THREE.Vector3(0,0,-100);
  assert.equal(segmentDistanceSquared(new THREE.Vector3(0,0,-50),a,b),0);
  assert.equal(segmentDistanceSquared(new THREE.Vector3(9,0,-50),a,b),81);
  assert.equal(segmentDistanceSquared(new THREE.Vector3(0,0,10),a,b),100);
});

test('autopilot brings a new arrival into docking range without colliding with the port',()=>{
  const s=W.freshState();W.jump(s,'bellwether');let docked=false;const sim=new Flight(s,event=>{if(event.type==='dock')docked=true;});sim.arrive();sim.autopilot=true;
  for(let i=0;i<1800&&!docked;i++)sim.step(1/60,{x:0,y:0,roll:0,fire:false,boost:false});
  assert.equal(docked,true);assert.ok(sim.canDock());assert.ok(sim.pos.z>270);assert.ok(s.hull>0);
});

test('actual pulse-cannon fire can destroy a raider and advance a bounty contract',()=>{
  const s=W.freshState();const hunt=W.contracts(s).find(m=>m.type==='bounty');W.accept(s,hunt.id);const sim=new Flight(s);
  const pirate=sim.entities.find(e=>e.kind==='pirate');sim.entities=[pirate];pirate.pos.set(0,20,400);sim.pos.set(0,20,650);sim.target=pirate;sim.throttle=0;sim.quat.identity();
  for(let i=0;i<600&&!pirate.dead;i++)sim.step(1/60,{x:0,y:0,roll:0,fire:true,boost:false});
  assert.equal(pirate.dead,true);assert.equal(s.kills,1);assert.equal(s.missions[0].progress,1);assert.ok(sim.entities.some(e=>e.kind==='cache'));
});

test('salvage recovery updates cargo and progress; a full hold leaves the cache intact',()=>{
  const s=W.freshState();const job=W.contracts(s).find(m=>m.type==='salvage');W.accept(s,job.id);const sim=new Flight(s),cache=sim.entities.find(e=>e.kind==='wreck');
  s.cargo.grain=30;assert.equal(sim.pickup(cache),false);assert.equal(cache.dead,false);assert.equal(s.missions[0].progress,0);
  s.cargo.grain=0;assert.equal(sim.pickup(cache),true);assert.equal(s.cargo.parts,2);assert.equal(s.missions[0].progress,1);assert.equal(cache.dead,false);assert.equal(cache.phase,'Salvage recovered');assert.equal(sim.pickup({...cache,dead:false,interactionComplete:false,quantity:40}),false);
  const credits=s.credits;sim.entities=[cache];sim.target=cache;sim.pos.copy(cache.pos);sim.throttle=0;
  for(let i=0;i<120;i++)sim.step(1/60,{x:0,y:0,fire:false,boost:false});assert.ok(sim.targets().includes(cache));assert.equal(sim.pickup(cache),false);assert.equal(s.cargo.parts,2);assert.equal(s.credits,credits);assert.equal(s.missions[0].progress,1);
});

test('patrol scans impose a fine, remove illegal cargo, and keep story retry possible',()=>{
  const s=W.freshState();s.system='crown';s.cargo.relics=3;s.storyStage=3;W.accept(s,'story-3');const sim=new Flight(s),patrol=sim.entities.find(e=>e.kind==='patrol');patrol.pos.copy(sim.pos).add(new THREE.Vector3(80,0,0));const before=s.credits;
  for(let i=0;i<550;i++)sim.updateScan(1/60);
  assert.equal(s.cargo.relics,0);assert.ok(s.credits<before);assert.equal(s.missions.length,0);assert.ok(W.contracts(s).some(c=>c.id==='story-3'));
});

test('every UI panel generates content with safe imported text and complete action wiring',()=>{
  const s=W.freshState(),sim=new Flight(s),ui=Object.create(UI.prototype);ui.game={state:s,mode:'docked',sim,audio:{enabled:true},view:{quality:'auto'},invert:false};ui.qty=1;ui.chartSystem='bellwether';
  W.accept(s,'story-0');s.missions[0].title='<img src=x onerror=alert(1)>';s.shipName='<script>bad</script>';
  const generated=[ui.contractPage(),ui.portAside(),ui.marketPage(),ui.shipyardPage(),ui.crewPage(),ui.chartPage(),ui.journalPage(),ui.settingsPage()].join('\n');assert.ok(!generated.includes('<script>bad'));assert.ok(!generated.includes('<img src=x'));assert.ok(generated.includes('&lt;img'));assert.equal(escapeHTML('<>&"'),'&lt;&gt;&amp;&quot;');
  const code=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8'),html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');const actions=new Set([...generated.matchAll(/data-action="([a-z-]+)"/g),...html.matchAll(/data-action="([a-z-]+)"/g)].map(m=>m[1]));for(const action of actions)assert.ok(code.includes("action==='"+action+"'")||code.includes("action!=='"+action+"'"),`unwired action: ${action}`);
});

test('page element references and local module assets all resolve',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  const files=['game.js','ui.js','space.js','flight.js','audio.js'];for(const file of files){const code=readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');for(const match of code.matchAll(/getElementById\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),`missing element: ${match[1]}`);for(const match of code.matchAll(/from '\.\/([^']+)'/g))assert.ok(readFileSync(new URL('../dist/'+match[1],import.meta.url)).length>0);}
  const uiCode=readFileSync(new URL('../dist/ui.js',import.meta.url),'utf8'),listed=uiCode.match(/for\(const id of \[([^\]]+)\]/)[1];for(const match of listed.matchAll(/'([^']+)'/g))assert.ok(ids.includes(match[1]),`missing UI element: ${match[1]}`);
});

test('all ship classes keep valid geometry after the mobile draw-call optimization',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){return {width:64,height:64,getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){},strokeRect(){},fillText(){}};}};}};
  try{
    for(const spec of W.SHIPS){
      const ship=makeShip(spec.id);assert.ok(ship.children.filter(v=>v.isMesh&&!v.material.transparent).length<=7);
      ship.traverse(obj=>{if(!obj.geometry)return;const positions=obj.geometry.getAttribute('position');assert.ok(Array.from(positions.array).every(Number.isFinite));const normal=obj.geometry.getAttribute('normal');if(normal)assert.equal(normal.count,positions.count);});
      const bounds=new THREE.Box3().setFromObject(ship);assert.ok(bounds.min.z< -5);assert.ok(bounds.max.z>8);assert.equal(ship.userData.engines.length,2);
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('six larger station designs and four commercial hulls have finite renderable geometry',()=>{
  const previous=globalThis.document;globalThis.document={createElement(){return {getContext(){return {fillRect(){},strokeRect(){},fillText(){}};}};}};
  try{
    const spans=[];for(const system of W.SYSTEMS){const model=makeStation(system),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());spans.push(size.toArray().map(v=>Math.round(v)).join(','));assert.ok(Math.max(size.x,size.y,size.z)>700);assert.equal(model.userData.design,W.PORTS[system.id].design);model.traverse(obj=>{if(obj.isMesh)assert.ok(Array.from(obj.geometry.getAttribute('position').array).every(Number.isFinite));});}assert.equal(new Set(spans).size,W.SYSTEMS.length);
    for(const kind of ['bulk','tanker','liner','shuttle']){const model=makeCommercialShip(kind),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert.ok(size.z>(kind==='shuttle'?25:140));assert.equal(model.userData.engines.length,2);}
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('commercial traffic has large and small ships that arrive, berth, depart, and reappear',()=>{
  const sim=new Flight(W.freshState()),fleet=sim.entities.filter(e=>e.kind==='trader');assert.equal(fleet.length,14);assert.ok(new Set(fleet.map(s=>s.classId)).size>=4);
  const ship=fleet.find(s=>s.classId==='bulk'),route=ship.route;
  ship.age=0;sim.tickTraffic(0);assert.equal(ship.phase,'Inbound');assert.ok(ship.pos.distanceTo(route.start)<.01);assert.equal(ship.hidden,false);
  ship.age=route.inbound+1;sim.tickTraffic(0);assert.equal(ship.phase,'Berthing');assert.ok(ship.pos.distanceTo(route.dock)<.01);
  ship.age=route.inbound+route.hold+5;sim.tickTraffic(0);assert.equal(ship.phase,'Outbound');assert.ok(ship.pos.distanceTo(route.dock)>30);
  ship.age=route.inbound+route.hold+route.outbound+1;sim.tickTraffic(0);assert.equal(ship.hidden,true);
  ship.age=route.inbound+route.hold+route.outbound+route.cooldown-.1;sim.tickTraffic(.2);assert.equal(ship.hidden,false);assert.equal(ship.phase,'Inbound');assert.ok(ship.pos.toArray().every(Number.isFinite));
});

test('navigation approaches remain safe at every enlarged station',()=>{
  for(const system of W.SYSTEMS){const s=W.freshState();s.system=system.id;let docked=false;const sim=new Flight(s,event=>{if(event.type==='dock')docked=true;});sim.arrive();sim.autopilot=true;for(let i=0;i<1800&&!docked;i++)sim.step(1/60,{x:0,y:0,fire:false,boost:false});assert.equal(docked,true,system.name);assert.ok(sim.canDock());assert.ok(sim.pos.z>W.PORTS[system.id].dock[2]+150);}
});

test('music starts at audible volume, crossfades by location, and obeys independent controls',async()=>{
  const old=globalThis.window;class FakeAudio{constructor(src){this.src=src;this.paused=true;this.volume=0;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
  globalThis.window={Audio:FakeAudio};
  try{const sound=new ShipAudio();sound.start();assert.equal(sound.musicKey,'frontier');assert.ok(sound.music.volume>.4);assert.equal(sound.music.loop,true);const original=sound.music;
    const state=W.freshState();state.system='hush';const sim=new Flight(state);sound.update(sim,'docked');assert.equal(sound.musicKey,'industrial');assert.ok(sound.fade);sound.fade.start-=1600;sound.update(sim,'docked');assert.equal(original.paused,true);assert.equal(sound.fade,null);
    sound.setVolume('music',.25);assert.equal(sound.music.volume,.25);sound.toggleMusic();assert.equal(sound.music.paused,true);sound.toggleMusic();assert.equal(sound.music.paused,false);sound.toggle();assert.equal(sound.enabled,false);assert.equal(sound.musicEnabled,true);sound.suspend();assert.equal(sound.music.paused,true);sound.resume();assert.equal(sound.music.paused,false);await Promise.resolve();
    for(const track of Object.values(MUSIC))assert.ok(readFileSync(new URL('../dist/music/'+track.file,import.meta.url)).length>100000);
  }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;}
});

test('the real uploaded fighter parses with its geometry, UVs, PBR material, and correct flight axes',async()=>{
  const raw=readFileSync(new URL('../dist/models/nova-fighter.glb',import.meta.url));const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const loader=new GLTFLoader();loader.register(()=>({name:'TEST_EMBEDDED_TEXTURES',loadTexture(index){const texture=new THREE.Texture();texture.flipY=false;texture.userData.textureIndex=index;return Promise.resolve(texture);}}));
  const parsed=await loader.parseAsync(buffer,'');const original=[];parsed.scene.traverse(o=>{if(o.isMesh)original.push(o);});assert.equal(original.length,1);const mesh=original[0];assert.equal(mesh.geometry.getAttribute('position').count,13152);assert.equal(mesh.geometry.index.count,37938);assert.equal(mesh.geometry.getAttribute('uv').count,13152);assert.ok(mesh.material.map);assert.ok(mesh.material.normalMap);assert.ok(mesh.material.roughnessMap);assert.ok(mesh.material.metalnessMap);
  const template=normalizeFighter(parsed.scene),bounds=new THREE.Box3().setFromObject(template),size=bounds.getSize(new THREE.Vector3());assert.ok(Math.abs(size.z-13.5)<.001);assert.ok(bounds.getCenter(new THREE.Vector3()).length()<.01);assert.ok(size.x>13&&size.x<16);assert.ok(size.y<5);
  const actor=fighterInstance(template);assert.equal(actor.userData.engines.length,3);assert.ok(actor.userData.baseScale.isVector3);const clones=[];actor.traverse(o=>{if(o.isMesh&&o.geometry.userData.sharedAsset)clones.push(o);});assert.equal(clones[0].geometry,mesh.geometry);assert.notEqual(clones[0].material,mesh.material);assert.equal(clones[0].material.map,mesh.material.map);assert.equal(mesh.material.map.userData.sharedAsset,true);
});

test('shipyard inspection is free and exposes the new Nova hull without changing the save',()=>{
  const s=W.freshState(),ui=Object.create(UI.prototype);ui.game={state:s,mode:'docked',sim:new Flight(s),audio:{enabled:true},view:{quality:'auto'}};const before=JSON.stringify(s),nova=W.SHIPS.find(v=>v.id==='kestrel');assert.equal(nova.name,'Nova');const html=ui.inspectPage(nova);assert.ok(html.includes('FREE HULL INSPECTION'));assert.ok(html.includes('data-action="buy-ship"'));assert.ok(html.includes('disabled'));assert.equal(JSON.stringify(s),before);
});
