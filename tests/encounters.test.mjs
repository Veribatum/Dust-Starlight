import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as W from '../dist/world.js';
import * as T from '../dist/vendor/three.module.js';
import {Flight,segmentDistanceSquared} from '../dist/flight.js';
import {Game} from '../dist/game.js';
import {SpaceView} from '../dist/space.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {ASSET_IDS,HULL_ASSETS,STATION_ASSETS,normalizeAsset,assetInstance,FleetAssets} from '../dist/assets.js';
import {steeringCurve,mouseSteering,throttleChange,loadPreferences,savePreferences} from '../dist/controls.js';

const idle={x:0,y:0,roll:0,fire:false,boost:false,assist:true};
function chapter(index){
  const state=W.freshState();state.storyStage=index;state.credits=10000;
  const job=W.contracts(state).find(m=>m.story);assert.equal(W.accept(state,job.id).ok,true);
  if(job.dest!==state.system)assert.equal(W.jump(state,job.dest).ok,true);
  const events=[],sim=new Flight(state,event=>events.push(event));sim.arrive();
  // Isolate the contract's combatants from unrelated random jobs.
  sim.entities=sim.entities.filter(e=>e.objective||e.missionId===job.id);
  return {state,job:state.missions[0],sim,events,session:sim.encounters.sessions.get(job.id)};
}
function approach(sim,target,limit=180){
  sim.target=target;sim.autopilot=true;
  for(let i=0;i<2400&&!(sim.distance(target)<limit&&sim.speed<40);i++)sim.step(1/60,idle);
  assert.ok(sim.distance(target)<limit,'autopilot should reach the objective');assert.ok(sim.speed<40);
}
function transfer(sim,seconds=6){for(let i=0;i<seconds*60;i++)sim.step(1/60,{...idle,interact:true,brake:true});}

test('the campaign and local boards offer five distinct in-space job types',()=>{
  assert.deepEqual(new Set(W.STORY.map(m=>m.type)),new Set(W.SPACE_JOBS));
  for(const system of W.SYSTEMS){const state=W.freshState();state.system=system.id;const local=W.contracts(state).filter(m=>!m.story&&W.SPACE_JOBS.includes(m.type));assert.equal(local.length,2);assert.equal(new Set(local.map(m=>m.type)).size,2);}
});

test('new arrivals acquire the mission instead of being deposited at the station',()=>{
  for(let index=0;index<6;index++){const {sim,job}=chapter(index);assert.equal(sim.target.missionId,job.id);assert.ok(sim.distance(sim.target)>1100);assert.ok(sim.distance(sim.station)>1000);assert.equal(W.ready(sim.state,job),false);}
});

test('rescue requires range, low speed and a sustained transfer; it pays once in space',()=>{
  const {state,sim,job,session,events}=chapter(0),before=state.credits;
  for(let i=0;i<120;i++)sim.encounters.step(1/60,{interact:true});assert.equal(job.progress,0);assert.equal(session.transfer,0);
  approach(sim,session.ship,170);sim.speed=80;sim.encounters.step(.05,{interact:true});assert.equal(session.transfer,0);
  transfer(sim);assert.equal(state.missions.length,0);assert.ok(state.credits>=before+job.reward);assert.ok(state.completed.includes(job.id));assert.equal(W.cargoUsed(state),0);
  assert.equal(session.ship.dead,false);assert.equal(session.ship.hidden,false);assert.equal(session.ship.objective,false);assert.equal(session.ship.phase,'Supplies received');assert.equal(sim.target,session.ship);assert.ok(sim.targets().includes(session.ship));
  assert.ok(session.enemies.every(enemy=>!enemy.dead&&enemy.attackTarget===null&&!enemy.encounterDormant));
  assert.equal(events.filter(e=>e.type==='contract-complete').length,1);transfer(sim);assert.equal(events.filter(e=>e.type==='contract-complete').length,1);assert.equal(W.deliver(state,job.id).ok,false);
  assert.ok(sim.entities.includes(session.ship));assert.ok(!sim.encounters.sessions.has(job.id));assert.equal(session.ship.missionId,undefined);
});

test('escort holds for a distant captain and will not finish until attackers and route are cleared',()=>{
  const {state,sim,job,session}=chapter(1),before=state.credits;
  sim.pos.copy(session.ship.pos).add(new T.Vector3(0,0,500));sim.throttle=0;sim.encounters.step(.05,idle);assert.equal(session.active,true);
  sim.pos.copy(session.ship.pos).add(new T.Vector3(0,0,1500));const progress=session.routeProgress;
  for(let i=0;i<100;i++)sim.encounters.step(.05,idle);assert.equal(session.routeProgress,progress);assert.equal(W.ready(state,job),false);
  for(const enemy of session.enemies)sim.destroy(enemy);assert.ok(state.missions.includes(job));
  for(let i=0;i<3600&&state.missions.includes(job);i++){sim.pos.copy(session.ship.pos).add(new T.Vector3(100,80,100));sim.throttle=0;sim.step(1/60,idle);}
  assert.ok(!state.missions.includes(job));assert.ok(state.credits>=before+job.reward);assert.ok(state.completed.includes(job.id));
  for(let i=0;i<120;i++)sim.step(1/60,idle);assert.ok(sim.targets().includes(session.ship));assert.equal(session.ship.phase,'Escort complete');assert.equal(session.ship.vel.length(),0);
});

test('survey records three separate scans, preserves partial progress, and triggers an ambush',()=>{
  const {state,sim,job,session}=chapter(2);
  approach(sim,session.nodes[0],210);transfer(sim,4.5);assert.equal(job.progress,1);assert.equal(session.nodes[0].hidden,false);assert.equal(session.nodes[0].scanned,true);assert.equal(session.nodes[0].objective,false);assert.equal(session.nodes[0].phase,'Recorder decoded');assert.equal(sim.target,session.nodes[1]);
  sim.target=session.nodes[0];assert.equal(sim.encounters.cue(job).canInteract,false);transfer(sim,.5);assert.equal(job.progress,1);
  const saved=W.validateSave(structuredClone(state));assert.ok(saved);const restored=new Flight(saved),decoded=restored.encounters.sessions.get(job.id).nodes[0];assert.equal(decoded.hidden,false);assert.equal(decoded.scanned,true);assert.equal(decoded.objective,false);assert.equal(decoded.phase,'Recorder decoded');assert.ok(restored.targets().includes(decoded));
  approach(sim,session.nodes[1],210);transfer(sim,4.5);assert.equal(job.progress,2);assert.equal(session.enemies.length,2);assert.ok(session.enemies.every(e=>!e.encounterDormant));
  approach(sim,session.nodes[2],210);transfer(sim,4.5);assert.ok(state.completed.includes(job.id));assert.equal(state.missions.length,0);
  for(const wreck of session.nodes){assert.ok(sim.targets().includes(wreck));assert.equal(wreck.dead,false);assert.equal(wreck.hidden,false);assert.equal(wreck.interactionComplete,true);assert.equal(wreck.missionId,undefined);}
  const credits=state.credits;transfer(sim,5);assert.equal(state.credits,credits);
});

test('covert handoff requires both navigation beacons and a final transfer',()=>{
  const {state,sim,job,session}=chapter(3);
  assert.equal(session.nodes[1].hidden,true);assert.equal(session.nodes[2].hidden,true);
  sim.pos.copy(session.nodes[2].pos);sim.speed=0;transfer(sim,5);assert.equal(job.progress,0);
  for(let i=0;i<2;i++){sim.pos.copy(session.nodes[i].pos);sim.throttle=0;sim.speed=0;sim.vel.set(0,0,0);sim.step(1/60,idle);assert.equal(job.progress,i+1);assert.equal(sim.target,session.nodes[i+1]);}
  sim.pos.copy(session.nodes[2].pos).add(new T.Vector3(0,0,140));sim.throttle=0;sim.speed=0;sim.vel.set(0,0,0);transfer(sim,5);
  assert.ok(state.completed.includes(job.id));assert.equal(state.missions.length,0);assert.equal(W.cargoUsed(state),0);
  assert.ok(sim.targets().includes(session.nodes[2]));assert.equal(session.nodes[2].phase,'Evidence received');assert.ok(session.nodes.slice(0,2).every(node=>node.hidden));
});

test('raiders attack the protected carrier, and defense pays only when all attackers are gone',()=>{
  const {state,sim,job,session}=chapter(4),initial=session.ship.hp;
  sim.pos.set(10000,1000,10000);sim.throttle=0;for(let i=0;i<300;i++)sim.step(1/60,idle);assert.equal(session.ship.hp,initial);assert.equal(session.active,false);
  sim.pos.copy(session.ship.pos).add(new T.Vector3(0,400,100));sim.target=session.ship;sim.step(1/60,idle);assert.equal(session.active,true);assert.equal(sim.target.kind,'pirate');
  for(let i=0;i<900;i++)sim.step(1/60,idle);assert.ok(session.ship.hp<initial);assert.ok(session.ship.hp>0);
  sim.destroy(session.enemies[0]);sim.destroy(session.enemies[1]);assert.equal(job.progress,2);assert.ok(state.missions.includes(job));
  sim.destroy(session.enemies[2]);assert.ok(state.completed.includes(job.id));assert.equal(state.storyStage,5);
  const credits=state.credits;sim.destroy(session.enemies[2]);assert.equal(state.credits,credits);
  for(let i=0;i<120;i++)sim.step(1/60,idle);assert.ok(sim.targets().includes(session.ship));assert.equal(session.ship.phase,'Carrier secure');assert.equal(session.ship.objective,false);
});

test('a lost transport cannot pay; failure survives saves and retry creates a fresh encounter',()=>{
  const {state,sim,job,session}=chapter(1),before=state.credits;session.ship.hp=0;sim.encounters.step(.05,idle);
  assert.equal(job.failed,true);assert.equal(W.ready(state,job),false);assert.equal(W.deliver(state,job.id).ok,false);assert.equal(state.credits,before);
  const saved=W.validateSave(structuredClone(state));assert.ok(saved);assert.equal(saved.missions[0].failed,true);
  assert.equal(sim.encounters.retry(job),true);const next=sim.encounters.sessions.get(job.id);assert.notEqual(next.ship.id,session.ship.id);assert.equal(next.ship.hp,next.ship.maxHp);assert.equal(job.failed,false);assert.equal(job.progress,0);
});

test('final convoy completion ends the story without making the captain dock for pay',()=>{
  const {state,sim,job,session,events}=chapter(5);for(const enemy of session.enemies)sim.destroy(enemy);
  for(let i=0;i<3600&&!state.storyDone;i++){sim.pos.copy(session.ship.pos).add(new T.Vector3(100,0,100));sim.throttle=0;sim.step(1/60,idle);}
  assert.equal(state.storyDone,true);assert.equal(state.storyStage,6);assert.ok(events.some(e=>e.type==='contract-complete'&&e.finished));assert.ok(state.completed.includes(job.id));assert.ok(W.validateSave(structuredClone(state)));
  assert.ok(sim.targets().includes(session.ship));assert.equal(session.ship.phase,'Escort complete');
});

test('a completed interaction retains the rendered hull and switches off its objective glow',()=>{
  const {sim,session}=chapter(0),ship=session.ship,view=Object.create(SpaceView.prototype),mesh=new T.Group(),body=new T.Mesh(new T.BoxGeometry(10,5,30),new T.MeshBasicMaterial()),beacon=new T.Object3D();
  mesh.add(body,beacon);mesh.userData.objectiveBeacon=beacon;view.local=new T.Group();view.local.add(mesh);view.entities=new Map([[ship.id,mesh]]);
  view.syncEntities([ship],1/60);assert.equal(beacon.visible,true);
  approach(sim,ship,170);transfer(sim);view.syncEntities([ship],1/60);
  assert.equal(view.entities.get(ship.id),mesh);assert.equal(mesh.parent,view.local);assert.equal(body.visible,true);assert.equal(beacon.visible,false);
  sim.pos.copy(ship.pos).add(new T.Vector3(0,0,700));sim.throttle=0;sim.speed=0;sim.vel.set(0,0,0);sim.autopilot=true;
  for(let i=0;i<1200;i++)sim.step(1/60,idle);assert.ok(sim.distance(ship)>=120);assert.ok(sim.distance(ship)<140);
  body.geometry.dispose();body.material.dispose();
});

test('legacy accepted delivery contracts remain playable after the mission revision',()=>{
  const state=W.freshState();state.missions=[{...W.STORY[0],type:'courier',progress:0,id:'story-0',story:true}];
  const restored=W.validateSave(structuredClone(state));assert.ok(restored);assert.equal(W.jump(restored,'bellwether').ok,true);assert.equal(W.deliver(restored,'story-0').ok,true);assert.equal(restored.storyStage,1);assert.equal(W.contracts(restored).find(m=>m.story).type,'escort');
});

test('all stations launch outward and require a clear, aligned departure before warping',()=>{
  for(const system of W.SYSTEMS){
    const state=W.freshState();state.system=system.id;const sim=new Flight(state);sim.launch();
    const outward=sim.pos.clone().normalize(),forward=new T.Vector3(0,0,-1).applyQuaternion(sim.quat);assert.ok(forward.dot(outward)>.99);
    assert.equal(sim.clearForWarp(),false);sim.beginDeparture();let steps=0,minRadius=Infinity;
    while(!sim.clearForWarp()&&steps++<1800){const previous=sim.pos.clone();sim.step(1/60,idle);minRadius=Math.min(minRadius,Math.sqrt(segmentDistanceSquared(new T.Vector3(),previous,sim.pos)));}
    assert.ok(steps<1800,system.name+' clearance timed out');assert.ok(minRadius>W.PORTS[system.id].span*.24);assert.equal(state.hull,W.stats(state).hull);
    const before=sim.pos.clone(),after=before.clone().addScaledVector(new T.Vector3(0,0,-1).applyQuaternion(sim.quat),380*3.7);assert.ok(segmentDistanceSquared(new T.Vector3(),before,after)>sim.jumpClearance()**2);
  }
});

test('requesting a jump from a dock goes through departure, with fuel charged at arrival',()=>{
  const state=W.freshState(),sim=new Flight(state),game=Object.create(Game.prototype);game.state=state;game.sim=sim;game.mode='docked';game.audio={start(){},event(){}};game.clearInput=()=>{};game.setMode=mode=>{game.mode=mode;};game.ui={closePanel(){},radio(){},el:{jumpName:{},jumpProgress:{style:{}},radio:{}}};
  game.startJump('bellwether');assert.equal(game.mode,'departure');assert.equal(state.fuel,100);game.engageWarp();assert.equal(game.mode,'departure');
  for(let i=0;i<900&&game.mode==='departure';i++){sim.step(1/60,idle);game.engageWarp();}assert.equal(game.mode,'jump');assert.equal(state.fuel,100);assert.equal(game.jumpDestination,'bellwether');assert.equal(sim.departure,false);
});

test('autopilot takes a safe detour when the direct route crosses the station core',()=>{
  const state=W.freshState(),sim=new Flight(state);sim.entities=[];sim.pos.set(0,0,-1400);sim.speed=0;sim.throttle=0;sim.target=sim.station;sim.autopilot=true;let docked=false;sim.emit=event=>{if(event.type==='dock')docked=true;};
  let nearest=Infinity;for(let i=0;i<4500&&!docked;i++){sim.step(1/60,idle);nearest=Math.min(nearest,sim.pos.length());}
  assert.equal(docked,true);assert.ok(nearest>W.PORTS.juniper.span*.24);assert.equal(state.hull,110);
});

test('mouse steering has a central deadzone, symmetric response and bounded sensitivity',()=>{
  assert.deepEqual(mouseSteering(500,300,1000,600),{x:0,y:0});assert.equal(steeringCurve(.05),0);
  assert.equal(steeringCurve(.4),-steeringCurve(-.4));assert.ok(steeringCurve(.2)>0&&steeringCurve(.2)<.2);assert.equal(steeringCurve(9,.08,1.8),1);
  const up=mouseSteering(500,80,1000,600);assert.ok(up.y>0);assert.equal(up.x,0);
});

test('controller thrust produces the same result at 30 and 120 frames per second',()=>{
  const run=fps=>{let throttle=.15;for(let i=0;i<fps*.8;i++)throttle=throttleChange(throttle,-.4,1/fps);return throttle;};assert.ok(Math.abs(run(30)-run(120))<1e-12);
});

test('keyboard thrust cancels autopilot and steering takes precedence over a displaced mouse',()=>{
  const game=Object.create(Game.prototype);game.keys=new Set(['KeyR','KeyD']);game.pointer={active:true,x:-1,y:0,fire:false};game.touch={x:0,y:0};game.preferences={assist:true};game.gamepad=()=>({x:0,y:0});game.sim=new Flight(W.freshState());game.sim.autopilot=true;game.sim.throttle=.2;
  const input=game.input(.1);assert.equal(game.sim.autopilot,false);assert.equal(input.x,1);assert.ok(game.sim.throttle>.2);
});

test('braking stops the ship promptly and angular smoothing behaves consistently across frame rates',()=>{
  const sim=new Flight(W.freshState());sim.pos.set(3000,200,5000);sim.speed=110;sim.vel.set(0,0,-110);sim.throttle=1;sim.autopilot=true;
  for(let i=0;i<60;i++)sim.step(1/60,{...idle,brake:true});assert.ok(sim.speed<1);assert.equal(sim.autopilot,false);assert.equal(sim.throttle,0);
  const turn=fps=>{const flight=new Flight(W.freshState());flight.pos.set(8000,0,8000);flight.throttle=0;for(let i=0;i<fps*2;i++)flight.step(1/fps,{...idle,x:.6,assist:false});return flight.quat;};assert.ok(turn(30).angleTo(turn(120))<.02);
});

test('an exhausted boost stays off until power recovers instead of fluttering every frame',()=>{
  const sim=new Flight(W.freshState());sim.pos.set(9000,0,9000);sim.energy=8;for(let i=0;i<60;i++){sim.step(1/60,{...idle,boost:true});assert.equal(sim.boosting,false);}for(let i=0;i<45;i++)sim.step(1/60,{...idle,boost:true});assert.equal(sim.boosting,true);
});

test('flight preferences survive reloads and corrupt values cannot break steering',()=>{
  const storage={data:null,getItem(){return this.data;},setItem(k,v){this.data=v;}};
  savePreferences({sensitivity:1.3,assist:false,mouseMode:'drag',invert:true},storage);assert.deepEqual(loadPreferences(storage),{sensitivity:1.3,assist:false,mouseMode:'drag',invert:true});storage.data='broken';assert.equal(loadPreferences(storage).sensitivity,1);storage.data='{"sensitivity":99}';assert.equal(loadPreferences(storage).sensitivity,1.8);
});

test('all fourteen streamed models parse with PBR maps, intact UVs and bounded geometry',async()=>{
  const manifest=JSON.parse(readFileSync(new URL('../dist/models/fleet-manifest.json',import.meta.url)));
  assert.equal(manifest.length,14);assert.ok(manifest.reduce((a,v)=>a+v.bytes,0)<24000000);
  for(const id of ASSET_IDS){
    const raw=readFileSync(new URL('../dist/models/'+id+'.glb',import.meta.url)),buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),loader=new GLTFLoader();
    loader.register(()=>({name:'TEST_EMBEDDED_TEXTURES',loadTexture(index){const texture=new T.Texture();texture.flipY=false;return Promise.resolve(texture);}}));
    const parsed=await loader.parseAsync(buffer,''),entry=manifest.find(a=>a.id===id);assert.equal(raw.length,entry.bytes);let triangles=0;
    parsed.scene.traverse(object=>{if(!object.isMesh)return;const geometry=object.geometry,positions=geometry.getAttribute('position');triangles+=geometry.index.count/3;assert.ok(Array.from(positions.array).every(Number.isFinite));assert.equal(geometry.getAttribute('normal').count,positions.count);assert.equal(geometry.getAttribute('uv').count,positions.count);assert.ok(object.material.map);assert.ok(object.material.normalMap);assert.ok(object.material.metalnessMap);
      geometry.computeBoundingBox();const bounds=geometry.boundingBox,tolerance=Math.max(...entry.source_bounds.max.map((v,i)=>v-entry.source_bounds.min[i]))*.0006;
      for(let axis=0;axis<3;axis++){assert.ok(bounds.min.getComponent(axis)>=entry.source_bounds.min[axis]-tolerance,id+' developed a negative solver spike');assert.ok(bounds.max.getComponent(axis)<=entry.source_bounds.max[axis]+tolerance,id+' developed a positive solver spike');}
    });
    assert.equal(triangles,entry.triangles);assert.ok(triangles<=30000);const template=normalizeAsset(parsed.scene,id),size=new T.Box3().setFromObject(template).getSize(new T.Vector3());assert.ok(Math.abs(id.endsWith('station')?Math.max(size.x,size.y,size.z)-1:size.z-1)<.0001);
    const actor=assetInstance(template,100),bounds=new T.Box3().setFromObject(actor);assert.ok(Number.isFinite(bounds.max.z));assert.equal(actor.userData.length,100);
    if(id==='five-engine-hauler')assert.equal(actor.userData.engines.length,5);
  }
  assert.equal(new Set(Object.keys(HULL_ASSETS)).size,W.SHIPS.length);assert.equal(Object.keys(STATION_ASSETS).length,2);
});

test('model streaming deduplicates requests and never loads more than two hulls at once',async()=>{
  const assets=new FleetAssets(),release=[];let active=0,max=0;
  assets.load=id=>new Promise(resolve=>{active++;max=Math.max(max,active);release.push(()=>{active--;resolve(new T.Group());});});
  const first=assets.request('scout');assert.equal(assets.request('scout'),first);const second=assets.request('leviathan'),third=assets.request('mothership');assert.equal(release.length,2);release[0]();await first;await Promise.resolve();await Promise.resolve();assert.equal(release.length,3);release[1]();release[2]();await Promise.all([second,third]);assert.equal(max,2);assert.equal(assets.status.get('scout'),'ready');assert.equal(assets.templates.size,3);
});
