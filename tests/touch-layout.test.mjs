import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {touchLayout,touchContext,touchObjective} from '../dist/touch-ui.js';
import {UI} from '../dist/ui.js';
import {Flight} from '../dist/flight.js';
import * as W from '../dist/world.js';

const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
test('touch controls stay separate and inside safe areas across phone and tablet orientations',()=>{
  const screens=[[320,568,{}],[375,667,{}],[390,844,{top:47,bottom:34}],[430,932,{top:59,bottom:34}],[568,320,{left:44,right:44,bottom:21}],[844,390,{left:47,right:47,bottom:21}],[852,393,{left:59,right:59,bottom:21}],[915,412,{left:36,right:36,bottom:18}],[1024,768,{top:24,bottom:20}],[768,1024,{top:24,bottom:20}]];
  const controls=['joystick','thrust','fire','boost','missile','target','context'];
  for(const [width,height,safe] of screens){
    const layout=touchLayout(width,height,safe);
    for(const key of controls){const box=layout[key];assert.ok(box.width>=44&&box.height>=44,`${width}x${height} ${key} is too small`);assert.ok(box.x>=(safe.left||0)&&box.y>=(safe.top||0),key+' outside top/left safe area');assert.ok(box.x+box.width<=width-(safe.right||0),key+' outside right safe area');assert.ok(box.y+box.height<=height-(safe.bottom||0),key+' outside bottom safe area');assert.ok(!overlap(box,layout.objective),key+' overlaps objective');}
    for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)assert.ok(!overlap(layout[controls[i]],layout[controls[j]]),`${width}x${height}: ${controls[i]} overlaps ${controls[j]}`);
    assert.ok(layout.vitals.width>=248&&layout.vitals.height>=28);assert.ok(!overlap(layout.vitals,layout.objective));
    for(const key of controls)assert.ok(!overlap(layout.vitals,layout[key]),key+' overlaps integrity readouts');
    if(layout.inlineVitals){assert.ok(layout.vitals.x>=layout.header.x+44+8+(layout.compact?0:116));assert.ok(layout.vitals.x+layout.vitals.width<=layout.header.x+layout.header.width-44-11-90);}
    assert.ok(layout.playArea.width>0&&layout.playArea.height>0);
  }
});

test('the narrow landscape layout keeps status bars in the header and avoids a second crowded row',()=>{
  const layout=touchLayout(568,320,{left:44,right:44,bottom:21});assert.equal(layout.inlineVitals,true);assert.equal(layout.compact,true);assert.equal(layout.objective.y,52);assert.ok(layout.context.y>layout.objective.y+layout.objective.height);
});

test('context controls progress from approach to brake to held transfer, then offer docking',()=>{
  const state=W.freshState();W.accept(state,'story-0');W.jump(state,'bellwether');const sim=new Flight(state);sim.arrive();const job=state.missions[0],target=sim.encounters.target(job);sim.target=target;
  let cue=sim.encounters.cue(job);assert.equal(touchContext(sim,job,cue,'flight').action,'autopilot');
  sim.pos.copy(target.pos);sim.pos.z+=140;sim.speed=70;cue=sim.encounters.cue(job);assert.equal(touchContext(sim,job,cue,'flight').action,'brake');
  sim.speed=0;cue=sim.encounters.cue(job);assert.equal(touchContext(sim,job,cue,'flight').action,'interact');assert.equal(touchContext(sim,job,cue,'flight').label,'Hold transfer');
  sim.target=sim.station;sim.pos.copy(sim.station.pos);assert.equal(touchContext(sim,null,null,'flight').action,'dock');assert.equal(touchContext(sim,null,null,'departure').action,'cancel-jump');
});

test('selected resources remain usable while a story job points to another system',()=>{
  const state=W.freshState();W.accept(state,'story-0');const sim=new Flight(state),job=state.missions[0];sim.target=sim.entities.find(e=>e.kind==='ore');
  assert.equal(touchContext(sim,job,null,'flight').label,'Approach ore vein');sim.target=sim.entities.find(e=>e.kind==='cache');assert.equal(touchContext(sim,job,null,'flight').label,'Recover salvage');
});

test('the compact objective reports the actual rescue target and progress without a paragraph',()=>{
  const state=W.freshState();W.accept(state,'story-0');W.jump(state,'bellwether');const sim=new Flight(state);sim.arrive();const mission=state.missions[0],cue=sim.encounters.cue(mission),summary=touchObjective(sim,mission,cue,'flight');assert.equal(summary.title,'Rescue · Mayflower');assert.ok(summary.hint.length<35);assert.equal(summary.percent,0);
});

test('the live layout assigns computed positions and restores shared desktop widgets on resize',()=>{
  const previous={document:globalThis.document,getComputedStyle:globalThis.getComputedStyle},nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},getBoundingClientRect(){return {width:844,height:390};},querySelector(){return node('chart');}});return nodes.get(id);};
  globalThis.document={getElementById:node};globalThis.getComputedStyle=()=>({paddingLeft:'47px',paddingRight:'47px',paddingTop:'0px',paddingBottom:'21px'});
  try{
    const ui=Object.create(UI.prototype);ui.el={};for(const id of ['app','mobileHeader','mobileVitals','mobileObjective','mobileThrust','mobileFire','mobileBoost','mobileMissile','mobileTargetCycle','mobileContext','mobileTargetInfo','safeAreaProbe','radio','scanWarning'])ui.el[id]=node(id);
    ui.touchQuery={matches:true};ui.touchMode=false;ui.layoutTouch();const expected=touchLayout(844,390,{left:47,right:47,bottom:21});assert.equal(ui.el.mobileThrust.style.left,expected.thrust.x+'px');assert.equal(ui.el.mobileFire.style.top,expected.fire.y+'px');assert.equal(node('joystick').style.width,'104px');assert.equal(ui.el.app.dataset.touch,'true');
    ui.touchQuery.matches=false;ui.layoutTouch();assert.equal(ui.el.app.dataset.touch,'false');assert.equal(ui.el.radio.style.top,'');assert.equal(ui.el.scanWarning.style.width,'');assert.equal(node('joystick').style.width,'');
  }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('mobile menus retain access to contacts, crew, audio and safe escaped transmissions',()=>{
  const state=W.freshState(),ui=Object.create(UI.prototype);ui.game={state,mode:'flight',sim:new Flight(state),audio:{musicEnabled:true}};ui.lastRadio={who:'<img src=x>',text:'<script>alert(1)</script>'};
  const html=[ui.flightMenuPage(),ui.contactsPage(),ui.radioPage()].join('');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('data-action="contacts"'));assert.ok(html.includes('data-action="crew"'));assert.ok(html.includes('data-action="settings"'));
  const game=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');for(const [,action] of html.matchAll(/data-action="([a-z-]+)"/g))assert.ok(game.includes("action==='"+action+"'"));
});

test('the mobile HUD follows a selected side job and keeps hostile integrity visible',()=>{
  const state=W.freshState();W.accept(state,'story-0');const side=W.contracts(state).find(m=>!m.story&&m.type==='rescue');W.accept(state,side.id);const sim=new Flight(state),mission=state.missions.find(m=>m.id===side.id),session=sim.encounters.sessions.get(side.id),ui=Object.create(UI.prototype);
  const node=()=>({style:{},classList:{toggle(){}},setAttribute(){},querySelector(){return node();}});ui.el={};
  for(const id of ['mobileSystem','mobileCredits','mobileHullBar','mobileShieldBar','mobilePowerBar','mobileHullValue','mobileShieldValue','mobilePowerValue','mobileVitals','mobileSpeed','touchThrottle','touchThrottleFill','touchThrottleHandle','mobileFire','mobileBoost','mobileMissile','mobileMissileCount','mobileObjectiveTitle','mobileObjectiveHint','mobileProgress','mobileObjective','mobileContext','mobileTargetInfo'])ui.el[id]=node();
  ui.game={state,sim,mode:'flight'};sim.target=session.ship;ui.touchHud(state.missions[0],null,W.stats(state),W.systemById(state.system));assert.equal(ui.touchMissionId,mission.id);assert.equal(ui.el.mobileTargetInfo.hidden,true);
  sim.target=session.enemies[0];ui.touchHud(state.missions[0],null,W.stats(state),W.systemById(state.system));assert.equal(ui.el.mobileTargetInfo.hidden,false);assert.ok(ui.el.mobileTargetInfo.textContent.includes('%'));
  sim.target=sim.station;ui.touchHud(state.missions[0],null,W.stats(state),W.systemById(state.system));assert.equal(ui.touchMissionId,mission.id);
  state.hull=W.stats(state).hull*.5;state.shield=0;sim.energy=25;session.ship.interactionComplete=true;session.ship.phase='Supplies received';sim.target=session.ship;ui.touchHud(state.missions[0],null,W.stats(state),W.systemById(state.system));
  assert.equal(ui.el.mobileHullValue.textContent,'50%');assert.equal(ui.el.mobileShieldValue.textContent,'0%');assert.equal(ui.el.mobilePowerValue.textContent,'25%');assert.equal(ui.el.mobileHullBar.style.width,'50%');assert.equal(ui.el.mobileTargetInfo.hidden,false);assert.ok(ui.el.mobileTargetInfo.textContent.includes('Supplies received'));assert.equal(ui.touchIntent.action,'track-current');assert.ok(ui.contactsPage().includes('Supplies received'));
});
