import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as W from '../dist/world.js';
import {VoyageSaves,SAVE_SLOTS,voyageSummary} from '../dist/saves.js';
import {Game} from '../dist/game.js';
import {Flight} from '../dist/flight.js';
import {UI} from '../dist/ui.js';

function storage(){
  return {values:new Map(),getItem(key){return this.values.get(key)??null;},setItem(key,value){this.values.set(key,String(value));},removeItem(key){this.values.delete(key);}};
}
function laterVoyage(){
  const state=W.freshState();state.storyStage=2;state.system='hush';state.credits=8700;state.time=4500;state.cargo.parts=3;
  W.accept(state,'story-2');state.missions[0].progress=1;return state;
}
function harness(initial){
  const oldDocument=globalThis.document;globalThis.document={getElementById(){return {style:{}};}};
  const memory=storage(),game=Object.create(Game.prototype),messages=[];if(initial)W.saveState(initial,memory);
  game.saves=new VoyageSaves(memory);game.saved=game.saves.load('auto');game.state=game.saved||W.freshState();game.mode='menu';game.started=false;
  game.keys=new Set();game.pointer={fire:true,active:true};game.touch={x:.6,y:.7,fire:true,boost:true,interact:true};game.sim=new Flight(game.state);
  game.audio={start(){},event(){}};game.view={setSystem(id){this.system=id;},setShip(id){this.ship=id;}};
  game.ui={panel:null,saveMode:'load',saveDecision:null,el:{radio:{hidden:false}},toast(...args){messages.push(args);},setMode(){},closePanel(){this.panel=null;game.clearInput();},openPanel(kind){this.panel=kind;game.clearInput();},renderPanel(){},renderTitle(){this.titleRendered=true;}};
  return {game,memory,messages,restore(){if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}};
}

test('the existing version-1 autosave loads without a migration or loss of partial story progress',()=>{
  const memory=storage(),state=laterVoyage();W.saveState(state,memory);const before=memory.getItem(W.SAVE_KEY),saves=new VoyageSaves(memory),loaded=saves.load('auto');
  assert.equal(loaded.storyStage,2);assert.equal(loaded.missions[0].progress,1);assert.equal(loaded.cargo.parts,3);assert.equal(memory.getItem(W.SAVE_KEY),before);assert.equal(saves.read('auto').savedAt,0);
});

test('three manual slots hold independent snapshots while autosave and backup remain separate',()=>{
  const memory=storage(),saves=new VoyageSaves(memory),state=W.freshState();
  for(let i=0;i<SAVE_SLOTS.length;i++){state.credits=2000+i*1000;assert.equal(saves.saveSlot(SAVE_SLOTS[i],state),true);}
  state.credits=9900;assert.equal(saves.autosave(state),true);assert.equal(saves.backup(state),true);
  const restored=new VoyageSaves(memory);assert.deepEqual(SAVE_SLOTS.map(id=>restored.load(id).credits),[2000,3000,4000]);assert.equal(restored.load('auto').credits,9900);assert.equal(restored.load('previous').credits,9900);
  const copy=restored.load('slot-1');copy.credits=0;assert.equal(restored.load('slot-1').credits,2000);assert.equal(restored.saveSlot('auto',state),false);assert.equal(restored.remove('auto'),false);
});

test('one corrupt manual slot does not invalidate other slots or the legacy autosave',()=>{
  const memory=storage(),saves=new VoyageSaves(memory);saves.autosave(laterVoyage());saves.saveSlot('slot-1',W.freshState());saves.saveSlot('slot-2',laterVoyage());
  memory.setItem('dust-and-starlight-voyage-v1:slot-1','broken');assert.equal(saves.read('slot-1').invalid,true);assert.equal(saves.load('slot-1'),null);assert.equal(saves.load('slot-2').storyStage,2);assert.equal(saves.load('auto').storyStage,2);
  assert.equal(saves.saveSlot('slot-2',{version:999}),false);assert.equal(saves.load('slot-2').credits,8700);
});

test('New Game restarts the opening chapter, backs up the old voyage, and preserves manual slots',()=>{
  const h=harness(laterVoyage());try{
    const early=W.freshState();early.credits=2500;h.game.saves.saveSlot('slot-1',early);
    h.game.action('new-game');assert.equal(h.game.ui.panel,'reset');assert.equal(h.game.state.storyStage,2);
    h.game.action('confirm-new');assert.equal(h.game.mode,'docked');assert.equal(h.game.ui.panel,'port');assert.equal(h.game.state.storyStage,0);assert.equal(h.game.state.credits,1400);assert.equal(h.game.state.missions.length,0);assert.equal(h.game.state.system,'juniper');
    assert.equal(h.game.saves.load('previous').storyStage,2);assert.equal(h.game.saves.load('previous').missions[0].progress,1);assert.equal(h.game.saves.load('slot-1').credits,2500);assert.equal(h.game.saves.load('auto').storyStage,0);
    assert.ok(W.contracts(h.game.state).some(job=>job.id==='story-0'));
  }finally{h.restore();}
});

test('Continue restores an existing autosave at port with its cargo, ship, and active job',()=>{
  const h=harness(laterVoyage());try{
    h.game.action('continue');assert.equal(h.game.started,true);assert.equal(h.game.mode,'docked');assert.equal(h.game.view.system,'hush');assert.equal(h.game.state.credits,8700);assert.equal(h.game.state.cargo.parts,3);assert.equal(h.game.state.missions[0].progress,1);assert.equal(h.game.pointer.fire,false);assert.equal(h.game.touch.interact,false);
  }finally{h.restore();}
});

test('overwriting a manual slot needs confirmation and Cancel leaves the earlier chapter intact',()=>{
  const h=harness();try{
    h.game.begin(true);h.game.openSaves('save');h.game.action('save-slot',{dataset:{id:'slot-1'}});assert.equal(h.game.saves.load('slot-1').credits,1400);
    h.game.state.credits=5000;h.game.action('save-slot',{dataset:{id:'slot-1'}});assert.equal(h.game.ui.saveDecision.kind,'overwrite');assert.equal(h.game.saves.load('slot-1').credits,1400);
    h.game.action('cancel-save-decision');assert.equal(h.game.saves.load('slot-1').credits,1400);
    h.game.action('save-slot',{dataset:{id:'slot-1'}});h.game.action('confirm-save-decision');assert.equal(h.game.saves.load('slot-1').credits,5000);
  }finally{h.restore();}
});

test('loading an early slot during play waits for confirmation and preserves the current voyage',()=>{
  const h=harness(laterVoyage());try{
    h.game.begin(false);h.game.saves.saveSlot('slot-2',W.freshState());h.game.mode='flight';h.game.openSaves('load');
    h.game.action('load-save',{dataset:{id:'slot-2'}});assert.equal(h.game.ui.saveDecision.kind,'load');assert.equal(h.game.state.storyStage,2);
    h.game.keys.add('Space');h.game.touch.fire=true;h.game.action('confirm-save-decision');
    assert.equal(h.game.state.storyStage,0);assert.equal(h.game.mode,'docked');assert.equal(h.game.saves.load('previous').credits,8700);assert.equal(h.game.saves.load('auto').storyStage,0);assert.equal(h.game.keys.size,0);assert.equal(h.game.touch.fire,false);assert.equal(h.game.saves.load('slot-2').storyStage,0);
    h.game.action('delete-save',{dataset:{id:'slot-2'}});assert.ok(h.game.saves.load('slot-2'));h.game.action('confirm-save-decision');assert.equal(h.game.saves.load('slot-2'),null);assert.equal(h.game.saves.load('auto').storyStage,0);
  }finally{h.restore();}
});

test('returning to the main menu can resume the same in-memory flight without rebuilding the encounter',()=>{
  const h=harness(laterVoyage());try{
    h.game.begin(false);h.game.mode='flight';h.game.sim.pos.set(-2000,200,-2700);const sim=h.game.sim,position=sim.pos.clone();h.game.touch.fire=true;
    h.game.action('title-menu');assert.equal(h.game.mode,'menu');assert.equal(h.game.ui.titleRendered,true);assert.equal(h.game.touch.fire,false);assert.equal(h.game.saves.load('auto').storyStage,2);
    h.game.action('continue');assert.equal(h.game.mode,'flight');assert.equal(h.game.sim,sim);assert.deepEqual(h.game.sim.pos,position);assert.equal(h.game.ui.panel,null);
  }finally{h.restore();}
});

test('valid imports preserve the previous voyage, while a malformed import does not change the game',async()=>{
  const h=harness(laterVoyage());try{
    const before=h.game.state;await h.game.importSave({size:10,text:async()=>'{broken'});assert.equal(h.game.state,before);
    const early=W.freshState();early.credits=2600;await h.game.importSave({size:4000,text:async()=>JSON.stringify(early)});
    assert.equal(h.game.state.credits,2600);assert.equal(h.game.saves.load('previous').credits,8700);assert.equal(h.game.mode,'docked');
  }finally{h.restore();}
});

test('a failed backup cannot replace the existing voyage with a new game',()=>{
  const h=harness(laterVoyage());try{
    const before=h.game.state,raw=h.memory.getItem(W.SAVE_KEY);h.memory.setItem=()=>{throw new Error('quota');};assert.equal(h.game.begin(true),false);assert.equal(h.game.state,before);assert.equal(h.game.mode,'menu');assert.equal(h.memory.getItem(W.SAVE_KEY),raw);assert.ok(h.messages.some(([message])=>message.includes('Could not preserve')));
    assert.equal(h.game.saves.saveSlot('slot-1',W.freshState()),false);
  }finally{h.restore();}
});

test('save previews are escaped, show useful progress, and expose New Game and Load Game directly',()=>{
  const h=harness(laterVoyage());try{
    h.game.state.shipName='<img src=x>';h.game.state.missions[0].title='<script>bad</script>';h.game.saves.autosave(h.game.state);
    const ui=Object.create(UI.prototype);ui.game=h.game;ui.saveMode='load';ui.saveDecision=null;ui.el={continueBtn:{},newBtn:{},resumeInfo:{}};
    ui.renderTitle();const html=ui.savesPage();assert.equal(ui.el.continueBtn.hidden,false);assert.ok(ui.el.resumeInfo.innerHTML.includes('Chapter 3 / 6'));assert.ok(!ui.el.resumeInfo.innerHTML.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('1 h 15 min'));assert.ok(html.includes('Load voyage'));
    const page=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.match(page,/id="newBtn"[^>]*data-action="new-game"/);assert.match(page,/id="loadBtn"[^>]*data-action="load-game"/);
    h.game.started=true;h.game.mode='docked';ui.saveMode='save';const saving=ui.savesPage();assert.equal((saving.match(/data-action="save-slot"/g)||[]).length,3);assert.ok(!saving.includes('<h3>Autosave</h3>'));
    assert.equal(voyageSummary({state:{...W.freshState(),storyDone:true}}).chapter,'Story complete');
  }finally{h.restore();}
});
