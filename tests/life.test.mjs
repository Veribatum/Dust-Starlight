import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as W from '../dist/world.js';
import {INTRO_DURATION,introFrame,BRIEFINGS,dutyChange,lawStatus,stationService,crewConversation,talkToCrew,reliefChoice} from '../dist/life.js';
import {Flight} from '../dist/flight.js';
import {UI} from '../dist/ui.js';
import {updateIntro,frameHangar} from '../dist/scenes.js';
import * as T from '../dist/vendor/three.module.js';
const idle={x:0,y:0,roll:0,fire:false,boost:false,interact:false,brake:true};
const captain=()=>({...W.freshState(),credits:100000,rep:10});
function local(type,id='juniper'){const s=captain();s.system=id;s.visits[id]=1;const job=W.contracts(s).find(m=>m.type===type&&!m.story);assert.ok(job);assert.equal(W.accept(s,job.id).ok,true);const sim=new Flight(s);sim.entities=sim.entities.filter(e=>e.kind!=='pirate'||e.missionId===job.id);return {s,sim,m:s.missions[0],session:sim.encounters.sessions.get(job.id)};}
function transfer(sim,node,seconds=5.3){sim.target=node;sim.pos.copy(node.pos).add(new T.Vector3(0,0,170));sim.speed=0;sim.throttle=0;sim.vel.set(0,0,0);for(let i=0;i<seconds*60;i++)sim.encounters.step(1/60,{interact:true});}

test('opening cameras stay finite across screen shapes and the narrative explains all relief chapters',()=>{
 assert.equal(BRIEFINGS.length,W.STORY.length);assert.ok(INTRO_DURATION>=25&&INTRO_DURATION<=45);assert.equal(introFrame(0).index,0);assert.equal(introFrame(INTRO_DURATION).index,3);
 const stage={carrier:new T.Group(),clinic:new T.Group(),patrol:new T.Group()},player=new T.Group();player.userData.baseScale=new T.Vector3(1,1,1);
 for(const [w,h]of [[1440,900],[390,844],[844,390],[667,375]])for(let t=0;t<=INTRO_DURATION;t+=.5){const c=new T.PerspectiveCamera(60,w/h,.15,40000);updateIntro(stage,player,c,t,w,h);assert.ok([...c.position,...c.quaternion,...c.projectionMatrix.elements].every(Number.isFinite));assert.ok(c.position.length()>20);}
 assert.equal(W.lienRemaining(W.freshState()),14800);assert.equal(W.lienRemaining({...W.freshState(),storyStage:6}),0);
});
test('changing hulls trades crew berths for speed and retains the permanent roster',()=>{
 const s=captain();for(const id of ['iona','len','doc'])assert.equal(W.hire(s,id).ok,true);s.system='deadlight';assert.equal(W.hire(s,'mara').ok,true);assert.equal(W.activeCrew(s).length,3);assert.equal(s.crew.length,4);assert.equal(dutyChange(s,'mara',true).ok,false);
 assert.equal(W.buyShip(s,'longhaul').ok,true);assert.equal(W.crewCapacity(s),6);assert.equal(dutyChange(s,'mara',true).ok,true);assert.ok(W.stats(s).damage>12);assert.equal(W.buyShip(s,'vortex').ok,true);assert.equal(W.activeCrew(s).length,1);assert.equal(s.crew.length,4);assert.equal(W.stats(s).damage,12);const saved=W.validateSave(structuredClone(s));assert.deepEqual(saved.crew,s.crew);assert.deepEqual(saved.crewDuty,s.crewDuty);
});
test('recruitment requires port and standing and quartermaster cargo cannot be dropped by reassignment',()=>{
 const s=captain();assert.equal(W.hire(s,'tess').ok,false);s.system='saffron';s.rep=0;assert.equal(W.hire(s,'tess').ok,false);s.rep=2;assert.equal(W.hire(s,'tess').ok,true);assert.equal(W.stats(s).hold,40);s.cargo.grain=35;const before=structuredClone(s);assert.equal(dutyChange(s,'tess',false).ok,false);assert.deepEqual(s,before);assert.equal(W.buyShip(s,'vortex').ok,false);assert.deepEqual(s,before);s.cargo.grain=20;assert.equal(dutyChange(s,'tess',false).ok,true);assert.equal(W.stats(s).hold,30);
});
test('old version-one saves retain existing crew assignments, cargo and story',()=>{
 const old=W.freshState();old.crew=['iona','len','doc'];delete old.crewDuty;delete old.narrative;delete old.relationships;delete old.law;delete old.factions;old.storyStage=3;old.cargo.parts=4;const s=W.validateSave(old);assert.deepEqual(W.activeCrew(s),old.crew);assert.equal(s.storyStage,3);assert.equal(s.cargo.parts,4);assert.equal(s.narrative.introSeen,true);assert.ok(W.jumpCost(s,'bellwether')<W.jumpCost({...s,crewDuty:[]},'bellwether'));
});
test('conversations follow the story and grant trust only once per topic per chapter',()=>{
 const s=captain();W.hire(s,'iona');const first=crewConversation(s,'iona','past').text;assert.equal(talkToCrew(s,'mara','past').ok,false);assert.equal(talkToCrew(s,'iona','bad').ok,false);talkToCrew(s,'iona','past');const bond=s.relationships.iona;for(let i=0;i<20;i++)talkToCrew(s,'iona','past');assert.equal(s.relationships.iona,bond);talkToCrew(s,'iona','ship');talkToCrew(s,'iona','voyage');assert.equal(W.bondTier(s,'iona'),1);assert.notEqual(crewConversation(s,'iona','past').text,first);s.storyStage=3;assert.match(crewConversation(s,'iona','voyage').text,/journalist/);s.heat=3;assert.match(crewConversation(s,'iona','voyage').text,/warrant/);assert.ok(W.validateSave(structuredClone(s)));
});
test('station meals affect assigned crew once per visit and local information persists',()=>{
 const s=captain();W.hire(s,'iona');s.crew.push('mara');s.relationships.mara=0;const cr=s.credits;assert.equal(stationService(s,'meal').ok,true);assert.equal(s.credits,cr-80);assert.equal(s.relationships.iona,1);assert.equal(s.relationships.mara,0);assert.equal(stationService(s,'meal').ok,false);assert.equal(stationService(s,'rumor').ok,true);assert.ok(s.log.some(l=>l.kind==='rumor'));assert.equal(stationService(s,'rumor').ok,false);s.visits.juniper++;assert.equal(stationService(s,'meal').ok,true);
});
test('registry offences increase pursuit and settlement requires a clean hold in a staffed port',()=>{
 const s=captain();s.system='crown';W.addHeat(s,3,'Test transponder warrant');assert.equal(lawStatus(s).title,'Warrant active');assert.match(lawStatus(s).description,/pursue/);assert.ok(new Flight(s).entities.filter(e=>e.kind==='patrol').length>1);s.cargo.relics=1;assert.equal(stationService(s,'registry').ok,false);delete s.cargo.relics;s.system='hush';assert.equal(stationService(s,'registry').ok,false);s.system='crown';const cr=s.credits;assert.equal(stationService(s,'registry').ok,true);assert.equal(s.heat,0);assert.ok(s.credits<cr);assert.match(s.law.reason,/settled/);assert.equal(new Flight(s).entities.filter(e=>e.kind==='patrol').length,1);
});
test('clean unregulated flight cools pressure while controlled cargo prevents cooling',()=>{
 const s=captain();s.system='hush';s.heat=2;s.law.cooling=179.99;const sim=new Flight(s);sim.entities=[];sim.pos.set(9000,0,9000);sim.step(.05,idle);assert.equal(s.heat,1.5);s.heat=2;s.law.cooling=179.99;s.cargo.relics=1;sim.step(.05,idle);assert.equal(s.heat,2);
});
test('signals specialist extends a real patrol scan and inspection records survive saves',()=>{
 const s=captain();s.system='hush';W.hire(s,'rook');s.system='crown';s.cargo.relics=1;const sim=new Flight(s);sim.pos.copy(sim.nearest('patrol').pos);sim.updateScan(.1);assert.ok(sim.scan>12);for(let i=0;i<140;i++)sim.updateScan(.1);assert.equal(s.cargo.relics,0);assert.equal(s.law.inspections,1);assert.match(W.validateSave(structuredClone(s)).law.reason,/confiscated/);
});
test('local choices persist and cannot pay or accept twice, while faction standing affects pay',()=>{
 const s=captain();s.system='saffron';const cr=s.credits;assert.equal(reliefChoice(s,'profit').ok,true);assert.equal(s.credits,cr+500);assert.equal(reliefChoice(s,'profit').ok,false);assert.equal(reliefChoice(s,'aid').ok,false);s.completed=[];assert.equal(reliefChoice(s,'profit').ok,false);s.system='vesper';assert.equal(reliefChoice(s,'aid').ok,true);assert.equal(reliefChoice(s,'aid').ok,false);const m=s.missions[0],rate=W.payoutRate(s,m);s.factions.settlements=5;assert.ok(W.payoutRate(s,m)>rate);assert.ok(W.validateSave(structuredClone(s)));
});
test('relay repairs require three separate transfers, retain partial progress and leave equipment visible',()=>{
 const {s,sim,m,session}=local('repair'),before=s.credits;sim.target=session.nodes[0];sim.pos.copy(session.nodes[0].pos).add(new T.Vector3(0,0,500));for(let i=0;i<400;i++)sim.encounters.step(1/60,{interact:true});assert.equal(m.progress,0);transfer(sim,session.nodes[0]);assert.equal(m.progress,1);assert.ok(session.enemies.length);assert.equal(session.nodes[0].hidden,false);const resumed=new Flight(W.validateSave(structuredClone(s)));assert.equal(resumed.encounters.sessions.get(m.id).nodes[0].phase,'Power restored');transfer(sim,session.nodes[1]);transfer(sim,session.nodes[2]);assert.ok(s.completed.includes(m.id));assert.ok(s.credits>before);const paid=s.credits;for(const node of session.nodes){assert.equal(node.hidden,false);assert.equal(node.interactionComplete,true);assert.ok(sim.targets().includes(node));}transfer(sim,session.nodes[2]);assert.equal(s.credits,paid);
});
test('interception begins on approach, flees, pays once on destruction and fails at the jump window',()=>{
 const a=local('intercept','cinder');a.sim.pos.set(-10000,0,0);a.sim.encounters.step(10,idle);assert.equal(a.session.remaining,90);a.sim.pos.copy(a.session.ship.pos).add(new T.Vector3(0,0,1000));a.sim.encounters.step(.05,idle);assert.equal(a.session.active,true);assert.ok(a.session.ship.escapeTarget);const start=a.session.ship.pos.clone();for(let i=0;i<60;i++)a.sim.step(1/60,idle);assert.ok(a.session.ship.pos.distanceTo(start)>20);const cr=a.s.credits;a.sim.destroy(a.session.ship);assert.ok(a.s.completed.includes(a.m.id));assert.ok(a.s.credits>cr+a.m.reward);const b=local('intercept','cinder');b.sim.pos.copy(b.session.ship.pos).add(new T.Vector3(0,0,1000));const credits=b.s.credits;for(let i=0;i<1900;i++)b.sim.encounters.step(.05,idle);assert.equal(b.m.failed,true);assert.equal(b.s.credits,credits);assert.equal(b.session.ship.hidden,true);assert.equal(b.sim.encounters.retry(b.m),true);
});
test('capital ship scale uses slow external terminal routes with enough station clearance',()=>{
 for(const sys of W.SYSTEMS){const s=W.freshState();s.system=sys.id;const ships=new Flight(s).entities.filter(e=>e.capital);assert.ok(ships.length>0,sys.name);for(const e of ships){assert.ok(e.length>=500);assert.ok(e.radius>=e.length*.5);assert.ok(Math.abs(e.route.dock.x)>W.PORTS[sys.id].span*.7+e.length*.5);assert.ok(e.route.inbound>=100);}}
});
test('new station, crew, story and registry UI escapes imported text and exposes its actions',()=>{
 const s=captain();W.hire(s,'iona');s.shipName='<img src=x onerror=bad>';s.law.reason='<script>bad</script>';const ui=Object.create(UI.prototype);ui.game={state:s,mode:'docked',sim:new Flight(s)};ui.dialogue=null;const html=[ui.hangarPage(),ui.concoursePage(),ui.briefingPage(),ui.messPage(),ui.registryPage(),ui.crewPage()].join('');assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('data-action="crew-topic"'));assert.ok(html.includes('data-action="briefing-accept"'));assert.ok(html.includes('data-action="station-activity"'));
});
test('Pages root entry and linked game assets resolve within the repository',()=>{
 assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/url=\.\/dist\//);const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))assert.ok(readFileSync(new URL('../dist/'+match[1].slice(2),import.meta.url)).length>0,match[1]);
});
test('hangar camera keeps all player hulls clear of phone and desktop station panels',()=>{
 for(const [w,h]of [[1440,900],[1024,768],[390,844],[844,390],[667,375],[320,568]])for(const length of [13,20,26]){const c=new T.PerspectiveCamera(54,w/h,.15,40000);for(let i=0;i<180;i++)frameHangar(c,length,w,h,true,1/60);c.updateMatrixWorld();const pts=[];for(const x of [-length*.5,length*.5])for(const y of [-length*.15,length*.15])for(const z of [-length*.5,length*.5])pts.push(new T.Vector3(x,y,z).project(c));const xs=pts.map(v=>(v.x+1)/2),ys=pts.map(v=>(1-v.y)/2);assert.ok(Math.min(...xs)>.02&&Math.max(...xs)<.98);assert.ok(Math.min(...ys)>0);if(w<h)assert.ok(Math.max(...ys)<.43);else assert.ok(Math.max(...xs)<.51);}
});
