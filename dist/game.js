import {freshState,validateSave,stats,prices,trade,accept,deliver,abandon,upgrade,buyShip,hire,service,rescue,jump,jumpCost,systemById,addLog,money,freeHold,clamp,rng,SPACE_JOBS} from './world.js';
import {SpaceView,THREE} from './space.js';
import {Flight} from './flight.js';
import {ShipAudio} from './audio.js';
import {UI} from './ui.js';
import {mouseSteering,steeringCurve,throttleChange,loadPreferences,savePreferences} from './controls.js';
import {VoyageSaves,SAVE_SLOTS} from './saves.js';

export class Game {
  constructor(){
    this.saves=new VoyageSaves();this.saved=this.saves.load('auto');this.state=this.saved||freshState();this.mode='menu';this.saveFailed=false;this.preferences=loadPreferences();this.invert=this.preferences.invert;this.audio=new ShipAudio();this.keys=new Set();this.pointer={x:0,y:0,fire:false,active:false};this.touch={x:0,y:0,fire:false,boost:false,interact:false};this.padPrevious=[];this.jumpT=0;this.jumpDestination=null;this.lastTime=performance.now();this.elapsed=0;this.hudTimer=0;this.saveTimer=0;this.started=false;
    this.view=new SpaceView(document.getElementById('space'));if(this.state.system!=='juniper')this.view.setSystem(this.state.system);this.view.setShip(this.state.ship);
    this.sim=new Flight(this.state,event=>this.event(event));this.ui=new UI(this);this.bindInputs();this.ui.init();this.makeWarp();requestAnimationFrame(t=>this.frame(t));
  }
  setMode(mode){this.mode=mode;this.ui.setMode(mode);}
  clearInput(){this.keys.clear();this.pointer={x:0,y:0,fire:false,active:false};this.touch.x=this.touch.y=0;this.touch.fire=this.touch.boost=this.touch.interact=false;this.joystickPointer=null;this.thrustPointer=null;this.contextPressAction=null;if(this.sim)this.sim.input={x:0,y:0,roll:0,fire:false,boost:false,interact:false};document.getElementById('stick').style.transform='';}
  currentMission(){return this.state.missions.find(m=>m.id===this.sim.target?.missionId)||this.state.missions.find(m=>m.id===this.ui.touchMissionId)||this.state.missions.find(m=>m.story)||this.state.missions[0];}
  cancelDeparture(){if(this.mode!=='departure')return;this.sim.departure=false;this.sim.boosting=false;this.jumpDestination=null;this.setMode('flight');this.clearInput();this.ui.toast('Departure cancelled.',false,true);}
  save(){const ok=this.saves.autosave(this.state);if(!ok&&!this.saveFailed)this.ui.toast('Automatic saving is unavailable in this browser. Export your save to keep your voyage.',true);this.saveFailed=!ok;if(ok)this.saved=this.state;return ok;}
  begin(fresh=false){
    if(!fresh){
      if(this.started&&this.mode==='menu'&&this.titleReturnMode){
        this.audio.start();this.ui.closePanel();this.clearInput();this.setMode(this.titleReturnMode);this.titleReturnMode=null;
        if(this.mode==='docked'){this.ui.tab='contracts';this.ui.openPanel('port');}return true;
      }
      return this.loadVoyage('auto');
    }
    const previous=this.started?this.state:this.saves.load('auto');
    if(previous&&!this.saves.backup(previous)){this.ui.toast('Could not preserve your previous voyage. Export it before starting over; your current game is unchanged.',true);return false;}
    this.restoreVoyage(freshState());this.ui.toast('Welcome aboard Cinder. Ada’s rescue job is waiting on the contract board.');return true;
  }
  restoreVoyage(state){
    this.audio.start();this.ui.closePanel();this.clearInput();
    this.state=state;if(this.state.hull<=0)rescue(this.state);this.state.shield=stats(this.state).shield;
    this.sim=new Flight(this.state,event=>this.event(event));this.view.setSystem(this.state.system);this.view.setShip(this.state.ship);
    this.started=true;this.titleReturnMode=null;this.jumpDestination=null;this.jumpT=0;this.saveTimer=0;
    this.ui.touchMissionId=null;this.ui.lastMission='';this.ui.lastRadio=null;this.ui.saveDecision=null;this.ui.tab='contracts';
    this.setMode('docked');this.ui.openPanel('port');this.save();
  }
  loadVoyage(id){
    const state=this.saves.load(id);if(!state){this.ui.toast('That save is empty or unreadable. Your current voyage is unchanged.',true);return false;}
    const previous=this.started?this.state:this.saves.load('auto');
    if(previous&&(id!=='auto'||this.started&&this.mode!=='menu')&&!this.saves.backup(previous)){this.ui.toast('Could not preserve the current voyage. Export it before loading another save.',true);return false;}
    this.restoreVoyage(state);this.ui.toast('Voyage loaded · docked at '+systemById(state.system).port+'.');return true;
  }
  titleMenu(){
    if(this.mode==='jump'||this.mode==='departure')return;
    if(this.started)this.save();this.titleReturnMode=['flight','docked'].includes(this.mode)?this.mode:null;
    this.ui.closePanel();this.clearInput();this.ui.el.radio.hidden=true;this.setMode('menu');this.ui.renderTitle();
  }
  openSaves(mode='load'){
    if(this.mode==='dead')this.titleMenu();this.ui.saveMode=mode;this.ui.saveDecision=null;this.ui.openPanel('saves');
  }
  saveSlot(id){
    if(!SAVE_SLOTS.includes(id)||!this.started||!['flight','docked'].includes(this.mode))return false;
    const ok=this.saves.saveSlot(id,this.state);this.ui.saveDecision=null;
    this.ui.toast(ok?'Voyage saved to slot '+id.slice(-1)+'.':'Could not write that slot. Export your voyage to keep a copy.',!ok);
    this.ui.renderPanel(true);return ok;
  }
  launch(){
    if(this.mode!=='docked')return;
    if(this.state.hull<=0){this.ui.toast('Repair the hull before departure.',true);return;}
    this.audio.start();this.ui.closePanel();this.clearInput();this.sim.launch();this.setMode('flight');this.save();
    const story=this.state.missions.find(m=>m.story);
    if(story&&story.dest!==this.state.system)this.ui.radio('Iona Reed / local channel',`We’re clear of the berth. Plot a jump to ${systemById(story.dest).name}. ${SPACE_JOBS.includes(story.type)?'Your objective will be the first contact on arrival.':'The freight is secure.'}`);
    else if(!this.state.missions.length&&this.state.tutorial)this.ui.radio('Ada Mercer / Mercy Anchorage','There’s work on the board, Captain. Or fly your own way: recover salvage, mine titanium, and sell it where it pays.');
  }
  dock(){
    if(this.mode!=='flight')return;
    if(!this.sim.canDock()){this.ui.toast('Fly within 235 m of the port. Select the port and use Autopilot for an assisted approach.',true);return;}
    this.sim.speed=0;this.sim.vel.set(0,0,0);this.sim.autopilot=false;this.state.shield=stats(this.state).shield;this.clearInput();this.setMode('docked');this.ui.tab='contracts';this.ui.openPanel('port');this.audio.event('success');this.save();
    this.ui.toast(`Docking complete · ${systemById(this.state.system).port}`);
  }
  startJump(id){
    if(!['flight','docked'].includes(this.mode))return;
    if(this.state.system===id)return;
    const cost=jumpCost(this.state,id);
    if(this.state.fuel<cost){this.ui.toast('Not enough fuel. Refill the tank at a port.',true);return;}
    if(!this.sim.canJump()){this.ui.toast('Hostiles are too close. Boost away and break contact before jumping.',true);return;}
    if(this.mode==='docked')this.sim.launch();
    this.audio.start();this.ui.closePanel();this.clearInput();this.jumpDestination=id;this.jumpT=0;this.sim.beginDeparture();this.setMode('departure');
    this.ui.el.jumpName.textContent=systemById(id).name;this.ui.el.jumpProgress.style.width='0';
    this.ui.radio('Flight computer',`Jump to ${systemById(id).name} queued. Clearing the station and aligning the departure lane. Escape cancels departure.`);
  }
  engageWarp(){
    if(this.mode!=='departure'||!this.sim.clearForWarp())return;
    this.sim.departure=false;this.sim.boosting=true;this.jumpT=0;this.setMode('jump');this.ui.el.radio.hidden=true;this.audio.event('jump');
  }
  finishJump(){
    const result=jump(this.state,this.jumpDestination);this.ui.el.warp.classList.remove('flash');
    if(!result.ok){this.setMode('flight');this.ui.toast(result.error,true);return;}
    addLog(this.state,`Jumped to ${systemById(this.state.system).name}. ${result.cost}% fuel consumed.`,'flight');this.view.setSystem(this.state.system);this.sim.arrive();this.sim.boosting=false;this.setMode('flight');this.jumpDestination=null;this.save();
    const sys=systemById(this.state.system),objective=this.sim.encounters.focused();this.ui.radio(this.state.crew.includes('iona')?'Iona Reed / navigation':'Ship computer',`${sys.name} orbit. ${objective?'Objective acquired: '+this.sim.target.name+'. Track the job for an assisted approach.':sys.port+' is on the scope. Autopilot can bring us into a berth.'}${sys.security===3?' Directorate patrols are active. Watch your manifest.':sys.security===0?' This is unregulated space. Keep an eye on the contacts.':''}`);
  }
  commit(result,message){
    if(!result.ok){this.ui.toast(result.error,true);return false;}
    this.audio.event('success');this.save();this.ui.hud(this.elapsed);if(this.ui.panel)this.ui.renderPanel(true);if(message)this.ui.toast(typeof message==='function'?message(result):message);return true;
  }
  ensureTargets(m){
    if(m.dest!==this.state.system)return;
    if(SPACE_JOBS.includes(m.type)){this.sim.encounters.sync();return;}
    if(m.type==='bounty'){
      const living=this.sim.entities.filter(e=>!e.dead&&e.kind==='pirate').length;const random=rng(Date.now());for(let i=living;i<m.count-m.progress;i++)this.sim.spawnPirate(random,i);
    }else if(m.type==='salvage'){
      const available=this.sim.entities.filter(e=>!e.dead&&!e.ore&&['cache','wreck'].includes(e.kind)).length;
      for(let i=available;i<m.count-m.progress;i++)this.sim.entities.push({id:'recovery-'+Date.now()+'-'+i,kind:'cache',name:'Salvage cache',pos:new THREE.Vector3(180+i*90,30,-450-i*100),radius:7,dead:false,goods:'parts',quantity:2});
    }
  }
  trackMission(id){
    const m=this.state.missions.find(m=>m.id===id);if(!m)return;
    if(m.dest!==this.state.system){this.ui.openPanel('map',m.dest);return;}
    if(this.mode==='docked'&&m.type==='courier'){this.ui.tab='contracts';this.ui.openPanel('port');return;}
    if(this.mode==='docked')this.launch();
    this.ui.closePanel();
    if(SPACE_JOBS.includes(m.type)){this.ensureTargets(m);this.sim.target=this.sim.encounters.target(m)||this.sim.station;}
    else if(m.type==='courier'||m.progress>=m.count)this.sim.target=this.sim.station;
    else if(m.type==='bounty'){this.ensureTargets(m);this.sim.target=this.sim.nearest('pirate')||this.sim.station;}
    else{this.ensureTargets(m);this.sim.target=this.sim.nearest('wreck')||this.sim.nearest('cache')||this.sim.station;}
    this.sim.autopilot=true;this.ui.toast('Assisted approach to '+this.sim.target.name+'. Steer to take manual control.');
  }
  event(event){
    if(!this.ui)return;
    this.audio.event(event.type);
    if(event.type==='notice')this.ui.toast(event.text,false,event.short);
    else if(event.type==='radio')this.ui.radio(event.who,event.text);
    else if(event.type==='dock')this.dock();
    else if(event.type==='damage')document.getElementById('app').animate([{filter:'brightness(1.15)'},{filter:'brightness(1)'}],{duration:160});
    else if(event.type==='explosion')this.view.burst(event.pos,'#ffc087',event.big);
    else if(event.type==='impact')this.view.burst(event.pos,event.ore?'#f3cd91':'#9cd3c7',false);
    else if(event.type==='salvage'){this.view.burst(event.pos,'#91e3c0',false);this.ui.toast(event.text,false,true);this.save();}
    else if(event.type==='contract-complete'){this.audio.event('success');this.ui.toast(`${event.title} complete · ${money(event.reward)} cr transferred`);this.save();if(event.finished)this.ui.openPanel('ending');}
    else if(event.type==='mission-failed'){this.ui.toast(event.text,true);this.save();}
    else if(event.type==='death'){this.clearInput();this.ui.closePanel();this.setMode('dead');this.view.burst(this.sim.pos,'#ffc087',true);this.save();}
  }
  action(action,button){
    if(action!=='sound')this.audio.event('click');const id=button?.dataset.id;
    if(action==='close-panel')this.ui.closePanel();
    else if(action==='continue')this.begin(false);
    else if(action==='title-menu')this.titleMenu();
    else if(action==='save-game')this.openSaves('save');
    else if(action==='load-game')this.openSaves('load');
    else if(action==='save-tab'){this.ui.saveMode=button.dataset.tab==='save'?'save':'load';this.ui.saveDecision=null;this.ui.renderPanel();}
    else if(action==='save-slot'){
      if(!SAVE_SLOTS.includes(id)||!this.started||!['flight','docked'].includes(this.mode))return;
      if(this.saves.read(id)){this.ui.saveDecision={kind:'overwrite',id};this.ui.renderPanel(true);}else this.saveSlot(id);
    }
    else if(action==='load-save'){
      if(!this.saves.read(id)?.state)return;
      if(this.started&&this.mode!=='menu'){this.ui.saveDecision={kind:'load',id};this.ui.renderPanel(true);}else this.loadVoyage(id);
    }
    else if(action==='delete-save'){if(SAVE_SLOTS.includes(id)&&this.saves.read(id)){this.ui.saveDecision={kind:'delete',id};this.ui.renderPanel(true);}}
    else if(action==='cancel-save-decision'){this.ui.saveDecision=null;this.ui.renderPanel(true);}
    else if(action==='confirm-save-decision'){
      const decision=this.ui.saveDecision;if(!decision)return;this.ui.saveDecision=null;
      if(decision.kind==='overwrite')this.saveSlot(decision.id);
      else if(decision.kind==='load')this.loadVoyage(decision.id);
      else if(decision.kind==='delete'){const ok=this.saves.remove(decision.id);this.ui.toast(ok?'Save slot cleared.':'Could not clear that save slot.',!ok);this.ui.renderPanel(true);}
    }
    else if(action==='flight-menu')this.ui.openPanel('flight-menu');
    else if(action==='radio-message')this.ui.openPanel('radio-message');
    else if(action==='contacts')this.ui.openPanel('contacts');
    else if(action==='contact-select'){if(this.sim.select(id)){this.ui.closePanel();this.sim.autopilot=false;this.ui.toast('Tracking '+this.sim.target.name,false,true);}}
    else if(action==='track-current'){const m=this.currentMission();if(m?.failed&&m.dest===this.state.system)this.action('retry-mission',{dataset:{id:m.id}});else if(m)this.trackMission(m.id);else this.ui.openPanel('contacts');}
    else if(action==='retry-current'){const m=this.currentMission();if(m)this.action('retry-mission',{dataset:{id:m.id}});}
    else if(action==='cancel-jump')this.cancelDeparture();
    else if(action==='touch-context'){const intent=this.contextPressAction||this.ui.touchIntent?.action;this.contextPressAction=null;if(intent&&intent!=='interact')this.action(intent);}
    else if(action==='map')this.ui.openPanel('map');
    else if(action==='crew')this.ui.openPanel('crew');
    else if(action==='journal')this.ui.openPanel('journal');
    else if(action==='settings')this.ui.openPanel('settings');
    else if(action==='port'){if(this.mode==='docked')this.ui.openPanel('port');}
    else if(action==='port-tab'){this.ui.tab=button.dataset.tab;this.ui.renderPanel();}
    else if(action==='launch')this.launch();
    else if(action==='dock')this.dock();
    else if(action==='target'){this.sim.cycle();this.ui.hud(this.elapsed);}
    else if(action==='select-target'){this.sim.select(id);if(this.sim.autopilot)this.ui.toast('Autopilot following '+this.sim.target.name+'.',false,true);}
    else if(action==='autopilot'){if(this.mode==='flight'){const on=this.sim.toggleAutopilot();if(on)this.pointer={x:0,y:0,fire:false,active:false};this.ui.toast(on?'Autopilot following '+this.sim.target.name+'. Steer to take control.':'Manual flight control.',false,true);}}
    else if(action==='missile'){if(this.mode==='flight'&&!this.sim.shoot(true)&&this.state.missiles<1)this.ui.toast('Missile rack empty. Re-arm at a port.',true);}
    else if(action==='brake'){if(this.mode==='flight'){this.sim.throttle=0;this.sim.autopilot=false;this.touch.boost=false;this.sim.speed*=.35;this.sim.vel.multiplyScalar(.35);this.ui.toast('Braking · thrust zero',false,true);}}
    else if(action==='mouse-flight'){if(this.mode==='flight'){this.pointer.active=!this.pointer.active;this.pointer.x=this.pointer.y=0;this.sim.autopilot=false;this.ui.toast(this.pointer.active?'Mouse flight engaged. Center the cursor to fly straight. Left click fires.':'Mouse flight released. Keyboard and touch steering remain active.',false,true);}}
    else if(action==='select-system'){this.ui.chartSystem=id;this.ui.renderPanel(true);}
    else if(action==='jump')this.startJump(id);
    else if(action==='accept'){
      if(this.mode!=='docked')return;const result=accept(this.state,id);
      if(this.commit(result,r=>`Contract accepted · ${r.mission.title}`)){this.state.tutorial=false;this.ensureTargets(this.state.missions.find(m=>m.id===id));addLog(this.state,`Accepted ${result.mission.title}. Destination: ${systemById(result.mission.dest).name}.`,'job');this.save();}
    }else if(action==='deliver'){
      if(this.mode!=='docked')return;const result=deliver(this.state,id);if(this.commit(result,r=>`${money(r.reward)} cr paid. Your crew earned it.`)){
        if(result.finished&&result.story)this.ui.openPanel('ending');
        else if(result.story)this.ui.toast('A new chapter is waiting on the contract board.');
      }
    }else if(action==='abandon'){if(this.commit(abandon(this.state,id),'Contract dropped. Story jobs can be accepted again.'))this.sim.encounters.sync();}
    else if(action==='retry-mission'){const m=this.state.missions.find(v=>v.id===id);if(m?.dest!==this.state.system)return;if(this.mode==='docked')this.launch();if(this.sim.encounters.retry(m)){this.ui.closePanel();this.sim.autopilot=true;this.save();this.ui.toast('Encounter restarted. Approaching the objective.');}}
    else if(action==='track-mission')this.trackMission(id);
    else if(action==='set-qty'){this.ui.qty=button.dataset.qty==='max'?'max':Number(button.dataset.qty);this.ui.renderPanel(true);}
    else if(action==='trade'){
      if(this.mode!=='docked')return;const item=prices(this.state).find(item=>item.id===id);if(!item)return;const side=button.dataset.side,q=this.ui.quantity(item,side);this.commit(trade(this.state,id,q,side),r=>`${side==='buy'?'Loaded':'Sold'} ${q} t · ${money(r.total)} cr`);
    }else if(action==='upgrade'){if(this.mode==='docked')this.commit(upgrade(this.state,id),'Upgrade installed. She’s getting better.');}
    else if(action==='inspect-ship'){if(this.mode==='docked'){this.ui.closePanel();this.inspectShip=id;this.view.inspection=true;this.view.setShip(id);this.ui.tab='shipyard';this.ui.openPanel('inspect');}}
    else if(action==='buy-ship'){
      if(this.mode!=='docked')return;const result=buyShip(this.state,id);if(this.commit(result,'New ship registered. Your upgrades and cargo are aboard.'))this.view.setShip(id);
    }else if(action==='hire'){if(this.mode==='docked')this.commit(hire(this.state,id),'Crew member aboard. Welcome to Cinder.');}
    else if(action==='service'){if(this.mode==='docked')this.commit(service(this.state,button.dataset.service),r=>'Dock service complete · '+money(r.cost)+' cr');}
    else if(action==='relief-fuel'){
      if(this.mode==='docked'&&this.state.fuel<20&&this.state.credits<60){this.state.fuel=30;addLog(this.state,'The freight cooperative covered emergency jump fuel. Pay it forward.','event');this.commit({ok:true},'Emergency fuel aboard. Nobody gets stranded at Mercy’s ports.');}
    }else if(action==='music'){if(!this.audio.started)this.audio.start();else if(this.audio.blocked){this.audio.musicEnabled=true;this.audio.playMusic();}else this.audio.toggleMusic();if(this.ui.panel)this.ui.renderPanel(true);}
    else if(action==='sound'){this.audio.start();this.audio.toggle();this.ui.renderPanel(true);}
    else if(action==='invert'){this.invert=!this.invert;this.preferences.invert=this.invert;savePreferences(this.preferences);this.ui.renderPanel(true);}
    else if(action==='flight-assist'){this.preferences.assist=!this.preferences.assist;savePreferences(this.preferences);this.ui.renderPanel(true);}
    else if(action==='fullscreen'){
      if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else document.getElementById('app').requestFullscreen?.().catch(()=>this.ui.toast('Fullscreen isn’t supported here. Rotate your phone for more flight space.',true));
    }else if(action==='dismiss-radio')this.ui.el.radio.hidden=true;
    else if(action==='export-save')this.exportSave();
    else if(action==='import-save')document.getElementById('saveInput').click();
    else if(action==='new-game'){if(this.started||this.saves.load('auto'))this.ui.openPanel('reset');else this.begin(true);}
    else if(action==='confirm-new')this.begin(true);
    else if(action==='rescue'){
      const penalty=rescue(this.state);this.sim.buildWorld();this.sim.dead=false;this.sim.target=this.sim.station;this.setMode('docked');this.ui.tab='contracts';this.ui.openPanel('port');this.save();this.ui.toast(`Back in a berth · ${money(penalty)} cr tow bill. Contract freight recovered.`);
    }
  }
  exportSave(){
    const blob=new Blob([JSON.stringify(this.state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dust-and-starlight-save.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);this.ui.toast('Voyage exported. Keep that save somewhere safe.');
  }
  async importSave(file){
    if(!file)return;if(file.size>500000){this.ui.toast('That file is too large to be a voyage save.',true);return;}
    try{
      const state=validateSave(JSON.parse(await file.text()));if(!state)throw new Error('invalid');
      const previous=this.started?this.state:this.saves.load('auto');
      if(previous&&!this.saves.backup(previous)){this.ui.toast('Could not preserve your current voyage. Export it before importing another save.',true);return;}
      this.restoreVoyage(state);this.ui.toast('Voyage imported · docked at '+systemById(state.system).port+'.');
    }catch{this.ui.toast('That file is not a valid Dust & Starlight save. Your current voyage is unchanged.',true);}
  }
  bindInputs(){
    document.getElementById('menuHelp').addEventListener('click',()=>this.ui.openPanel('settings'));document.getElementById('panelClose').addEventListener('click',()=>this.ui.closePanel());
    document.getElementById('app').addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button&&!button.disabled)this.action(button.dataset.action,button);});
    document.getElementById('app').addEventListener('input',event=>{const channel=event.target.dataset.volume;if(channel){this.audio.setVolume(channel,Number(event.target.value)/100);const out=event.target.parentElement.querySelector('output');if(out)out.textContent=event.target.value+'%';}else if(event.target.dataset.sensitivity){this.preferences.sensitivity=clamp(Number(event.target.value)/100,.4,1.8);savePreferences(this.preferences);const out=event.target.parentElement.querySelector('output');if(out)out.textContent=this.preferences.sensitivity.toFixed(1)+'×';}});
    document.getElementById('app').addEventListener('change',event=>{if(event.target.id==='qualitySelect'){this.view.setQuality(event.target.value);this.ui.toast('Graphics quality updated.',false,true);}else if(event.target.id==='mouseMode'){this.preferences.mouseMode=event.target.value==='drag'?'drag':'cursor';savePreferences(this.preferences);}});
    document.getElementById('throttle').addEventListener('input',event=>{this.sim.throttle=Number(event.target.value)/100;this.sim.autopilot=false;});
    document.getElementById('saveInput').addEventListener('change',event=>{this.importSave(event.target.files[0]);event.target.value='';});
    window.addEventListener('keydown',event=>{
      const key=event.code,focused=document.activeElement,typing=['SELECT','TEXTAREA'].includes(focused?.tagName)||focused?.tagName==='INPUT'&&!['range','button','checkbox'].includes(focused.type);
      if(key==='Escape'){event.preventDefault();if(this.mode==='jump'||this.mode==='dead')return;if(this.mode==='departure'){this.cancelDeparture();return;}if(this.ui.panel)this.ui.closePanel();else if(this.mode!=='menu')this.ui.openPanel('flight-menu');return;}
      if(this.ui.panel){
        if(key==='Tab'){const buttons=[...this.ui.el.panelOverlay.querySelectorAll('button:not(:disabled):not([hidden]),select,input:not([hidden])')].filter(el=>el.offsetParent!==null);if(!buttons.length)return;const index=buttons.indexOf(document.activeElement),next=event.shiftKey?(index<=0?buttons.length-1:index-1):(index+1)%buttons.length;buttons[next].focus();event.preventDefault();}return;
      }
      if(typing||this.mode!=='flight')return;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(key))event.preventDefault();this.keys.add(key);if(event.repeat)return;
      const shortcut={KeyG:'map',KeyC:'crew',KeyL:'journal',KeyV:'autopilot',KeyE:'dock',KeyM:'missile',KeyB:'brake',KeyT:'mouse-flight',Tab:'target'}[key];if(shortcut)this.action(shortcut);
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.code));window.addEventListener('blur',()=>this.clearInput());
    document.addEventListener('visibilitychange',()=>{this.clearInput();if(document.hidden){if(this.started)this.save();this.audio.suspend();}else{this.lastTime=performance.now();this.audio.resume();}});
    window.addEventListener('pagehide',()=>{if(this.started)this.save();});
    const canvas=document.getElementById('space');let pointerStart=null;
    const steerPointer=event=>{if(this.preferences.mouseMode==='cursor'&&event.pointerType!=='touch'){const rect=canvas.getBoundingClientRect(),steer=mouseSteering(event.clientX-rect.left,event.clientY-rect.top,rect.width,rect.height,this.preferences.sensitivity);this.pointer.x=steer.x;this.pointer.y=steer.y;this.pointer.clientX=event.clientX-rect.left;this.pointer.clientY=event.clientY-rect.top;}else if(pointerStart){this.pointer.x=steeringCurve((event.clientX-pointerStart.x)/140,.05,this.preferences.sensitivity);this.pointer.y=steeringCurve((pointerStart.y-event.clientY)/140,.05,this.preferences.sensitivity);}};
    canvas.addEventListener('pointerdown',event=>{if(this.mode!=='flight'||this.ui.panel)return;this.audio.start();pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId,touch:event.pointerType==='touch'};this.pointer.active=true;this.pointer.fire=event.button===0&&event.pointerType!=='touch';this.sim.autopilot=false;steerPointer(event);canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',event=>{if(this.mode!=='flight'||!this.pointer.active||this.ui.panel||this.sim.autopilot)return;steerPointer(event);});
    const release=()=>{this.pointer.fire=false;if(this.preferences.mouseMode==='drag'||pointerStart?.touch)this.pointer={x:0,y:0,fire:false,active:false};pointerStart=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',()=>{this.pointer.fire=false;});canvas.addEventListener('contextmenu',event=>event.preventDefault());
    canvas.addEventListener('wheel',event=>{if(this.mode==='flight'&&!this.ui.panel){event.preventDefault();this.sim.throttle=clamp(this.sim.throttle-event.deltaY*.001,0,1);this.sim.autopilot=false;}},{passive:false});
    const joystick=document.getElementById('joystick'),stick=document.getElementById('stick');this.joystickPointer=null;
    const updateJoystick=event=>{const rect=joystick.querySelector('.joystick-ring').getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,max=rect.width*.3;let x=(event.clientX-cx)/max,y=(event.clientY-cy)/max;const mag=Math.hypot(x,y);if(mag>1){x/=mag;y/=mag;}this.touch.x=steeringCurve(x,.05,this.preferences.sensitivity);this.touch.y=-steeringCurve(y,.05,this.preferences.sensitivity);stick.style.transform=`translate(${x*max}px,${y*max}px)`;};
    joystick.addEventListener('pointerdown',event=>{if(this.mode!=='flight'||this.ui.panel)return;event.preventDefault();this.joystickPointer=event.pointerId;joystick.setPointerCapture(event.pointerId);updateJoystick(event);this.audio.start();});joystick.addEventListener('pointermove',event=>{if(this.mode==='flight'&&!this.ui.panel&&event.pointerId===this.joystickPointer)updateJoystick(event);});
    const releaseStick=event=>{if(event.pointerId===this.joystickPointer){this.joystickPointer=null;this.touch.x=this.touch.y=0;stick.style.transform='';}};for(const name of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,releaseStick);
    for(const [id,key]of [['fireBtn','fire'],['boostBtn','boost'],['interactBtn','interact'],['mobileFire','fire'],['mobileBoost','boost']]){const button=document.getElementById(id);button.addEventListener('pointerdown',event=>{if(this.mode!=='flight'||this.ui.panel)return;event.preventDefault();button.setPointerCapture(event.pointerId);this.touch[key]=true;if(id==='mobileBoost'){this.sim.autopilot=false;this.sim.throttle=Math.max(.65,this.sim.throttle);}this.audio.start();});for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,()=>{this.touch[key]=false;});}
    const context=document.getElementById('mobileContext');
    context.addEventListener('pointerdown',event=>{if(this.ui.panel)return;this.contextPressAction=this.ui.touchIntent?.action;if(this.mode==='flight'&&this.contextPressAction==='interact'){event.preventDefault();context.setPointerCapture(event.pointerId);this.touch.interact=true;this.audio.start();}});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])context.addEventListener(name,()=>{this.touch.interact=false;});
    const slider=document.getElementById('touchThrottle');this.thrustPointer=null;
    const setThrust=value=>{this.sim.throttle=clamp(value,0,1);this.sim.autopilot=false;const percent=this.sim.throttle*100;slider.setAttribute('aria-valuenow',String(Math.round(percent)));document.getElementById('touchThrottleFill').style.height=percent+'%';document.getElementById('touchThrottleHandle').style.bottom=percent+'%';};
    const slide=event=>{const rect=slider.getBoundingClientRect();setThrust(1-(event.clientY-rect.top)/Math.max(1,rect.height));};
    slider.addEventListener('pointerdown',event=>{if(this.mode!=='flight'||this.ui.panel)return;event.preventDefault();this.thrustPointer=event.pointerId;slider.setPointerCapture(event.pointerId);slide(event);});
    slider.addEventListener('pointermove',event=>{if(this.mode==='flight'&&!this.ui.panel&&event.pointerId===this.thrustPointer)slide(event);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])slider.addEventListener(name,event=>{if(event.pointerId===this.thrustPointer)this.thrustPointer=null;});
    slider.addEventListener('keydown',event=>{if(this.mode!=='flight'||this.ui.panel)return;const delta={ArrowUp:.1,ArrowRight:.1,ArrowDown:-.1,ArrowLeft:-.1}[event.code];if(delta!==undefined){event.preventDefault();event.stopPropagation();setThrust(this.sim.throttle+delta);}});
  }
  gamepad(dt){
    const pads=navigator.getGamepads?.();const pad=pads&&Array.from(pads).find(Boolean);if(!pad)return {x:0,y:0,fire:false,boost:false};
    const deadzone=n=>steeringCurve(n,.15,this.preferences.sensitivity);const x=deadzone(pad.axes[0]||0),y=-deadzone(pad.axes[1]||0);
    if(this.mode==='flight'&&!this.ui.panel){const throttle=deadzone(pad.axes[3]||0);if(throttle){this.sim.throttle=throttleChange(this.sim.throttle,throttle,dt);this.sim.autopilot=false;}for(const [index,action]of [[0,'target'],[1,'missile'],[3,'autopilot'],[9,'flight-menu']]){if(pad.buttons[index]?.pressed&&!this.padPrevious[index])this.action(action);}this.padPrevious=pad.buttons.map(b=>b.pressed);}
    return {x,y,fire:!!pad.buttons[7]?.pressed,boost:!!pad.buttons[6]?.pressed,interact:!!pad.buttons[2]?.pressed,brake:!!pad.buttons[4]?.pressed,roll:(pad.buttons[5]?.pressed?1:0)};
  }
  input(dt){
    const key=k=>this.keys.has(k)?1:0,pad=this.gamepad(dt);
    if(this.ui?.panel)return {x:0,y:0,roll:0,fire:false,boost:false,interact:false,brake:false};
    if(key('KeyR')||key('KeyF')){this.sim.throttle=clamp(this.sim.throttle+dt*.5*(key('KeyR')-key('KeyF')),0,1);this.sim.autopilot=false;}
    const keyboardX=key('KeyD')+key('ArrowRight')-key('KeyA')-key('ArrowLeft'),keyboardY=key('KeyW')+key('ArrowUp')-key('KeyS')-key('ArrowDown');
    const mouse=this.pointer.active&&!this.sim.autopilot;
    const x=clamp(keyboardX||this.touch.x||pad.x||(mouse?this.pointer.x:0),-1,1),y=clamp(keyboardY||this.touch.y||pad.y||(mouse?this.pointer.y:0),-1,1),interact=!!(key('KeyQ')||this.touch.interact||pad.interact);
    return {x,y:y*(this.invert?-1:1),roll:key('KeyX')-key('KeyZ')+(pad.roll||0),fire:!!key('Space')||this.pointer.fire||this.touch.fire||pad.fire,boost:!!key('ShiftLeft')||!!key('ShiftRight')||this.touch.boost||pad.boost,interact,brake:!!key('KeyB')||pad.brake||(interact&&this.sim.target?.objective&&this.sim.target.kind!=='pirate'&&this.sim.distance()<240),assist:this.preferences.assist};
  }
  makeWarp(){const root=document.getElementById('warpLines');for(let i=0;i<50;i++){const line=document.createElement('i');line.className='warp-line';line.style.setProperty('--angle',(i*7.2)+'deg');line.style.setProperty('--delay',(-Math.random()*1.1)+'s');root.append(line);}}
  frame(now){
    requestAnimationFrame(t=>this.frame(t));let dt=Math.min(.12,Math.max(0,(now-this.lastTime)/1000));this.lastTime=now;if(document.hidden)return;this.elapsed+=dt;
    if((this.mode==='flight'||this.mode==='departure')&&!this.ui.panel){this.sim.input=this.mode==='flight'?this.input(dt):{x:0,y:0,fire:false,boost:false};for(let remaining=dt;remaining>0&&!this.ui.panel&&['flight','departure'].includes(this.mode);){const slice=Math.min(1/60,remaining);this.sim.step(slice,this.sim.input);remaining-=slice;}if(this.mode==='departure')this.engageWarp();}
    else if(this.mode==='jump'){
      this.jumpT+=dt;this.sim.speed=380;this.sim.pos.addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(this.sim.quat),dt*380);const p=this.jumpT/3.7;this.ui.el.jumpProgress.style.width=Math.min(100,p*100)+'%';this.ui.el.jumpTime.textContent=p<.35?'ALIGNING THE DRIVE':p<.8?'CROSSING THE DARK':'A NEW HORIZON';this.ui.el.warp.classList.toggle('flash',p>.91&&p<.95);if(this.jumpT>=3.7)this.finishJump();
    }
    if(!['flight','departure'].includes(this.mode)||this.ui.panel)this.sim.tickTraffic(dt);
    this.view.render(this.sim,this.mode,dt,this.elapsed);this.audio.update(this.sim,this.mode,this.elapsed);
    this.hudTimer+=dt;if(this.hudTimer>.1){this.hudTimer=0;this.ui.hud(this.elapsed);}this.ui.markers();
    if(this.started&&this.mode!=='menu'){this.saveTimer+=dt;if(this.saveTimer>8){this.saveTimer=0;this.save();}}
  }
}

if(typeof document!=='undefined')try {new Game();} catch(error){
  document.getElementById('loading').hidden=true;const el=document.getElementById('graphicsError');el.hidden=false;const p=document.createElement('p');p.textContent='The flight renderer couldn’t start. Dust & Starlight needs WebGL 2. Try opening the game in a recent Safari, Chrome, or Firefox browser with graphics acceleration enabled.';el.append(p);console.error('Dust & Starlight startup error:',error);
}
