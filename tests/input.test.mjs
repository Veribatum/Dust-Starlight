import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/game.js';
import {Flight} from '../dist/flight.js';
import {freshState} from '../dist/world.js';

function harness(){
  const saved={document:globalThis.document,window:globalThis.window,navigator:globalThis.navigator};
  const elements=new Map(),windowEvents=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{id,style:{},dataset:{},attributes:new Map(),tagName:'DIV',type:'',events:new Map(),addEventListener(name,callback){this.events.set(name,callback);},setAttribute(name,value){this.attributes.set(name,value);},setPointerCapture(){},getBoundingClientRect(){return this.rect||{left:0,top:0,width:1000,height:600};},querySelector(){return element('joystick-ring');}});return elements.get(id);};
  globalThis.document={activeElement:null,getElementById:element,addEventListener(){}};
  globalThis.window={addEventListener(name,callback){windowEvents.set(name,callback);}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});
  const game=Object.create(Game.prototype);game.mode='flight';game.keys=new Set();game.preferences={mouseMode:'cursor',sensitivity:1,assist:true};game.invert=false;game.pointer={x:0,y:0,fire:false,active:false};game.touch={x:0,y:0,fire:false,boost:false,interact:false};game.padPrevious=[];game.sim=new Flight(freshState());game.audio={start(){},event(){}};
  game.state=game.sim.state;game.ui={panel:null,toast(){},hud(){},openPanel(kind){this.panel=kind;game.clearInput();},closePanel(){this.panel=null;game.clearInput();}};game.bindInputs();
  return {game,element,windowEvents,restore(){for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}}};
}
function pointer(x,y,id=1){return {clientX:x,clientY:y,pointerId:id,pointerType:'mouse',button:0,preventDefault(){}};}
function key(code){return {code,repeat:false,preventDefault(){this.prevented=true;}};}

test('real pointer handlers engage cursor steering, fire while held, and release fire on pointer up',()=>{
  const h=harness();try{
    const canvas=h.element('space'),down=canvas.events.get('pointerdown'),move=canvas.events.get('pointermove');
    h.game.sim.autopilot=true;down(pointer(500,300));assert.equal(h.game.pointer.active,true);assert.equal(h.game.pointer.fire,true);assert.equal(h.game.sim.autopilot,false);assert.equal(h.game.input(1/60).fire,true);
    move(pointer(800,100));assert.ok(h.game.pointer.x>.9);assert.ok(h.game.pointer.y>.9);
    canvas.events.get('pointerup')(pointer(800,100));assert.equal(h.game.pointer.fire,false);assert.equal(h.game.pointer.active,true);
    h.windowEvents.get('keydown')(key('Escape'));assert.equal(h.game.ui.panel,'settings');assert.equal(h.game.pointer.active,false);assert.equal(h.game.input(1/60).fire,false);
  }finally{h.restore();}
});

test('a focused thrust slider no longer swallows keyboard flight controls',()=>{
  const h=harness();try{
    const throttle=h.element('throttle');throttle.tagName='INPUT';throttle.type='range';document.activeElement=throttle;
    const up=key('ArrowUp');h.windowEvents.get('keydown')(up);assert.equal(up.prevented,true);assert.equal(h.game.input(1/60).y,1);
    h.game.clearInput();const text=h.element('text');text.tagName='INPUT';text.type='text';document.activeElement=text;h.windowEvents.get('keydown')(key('KeyW'));assert.equal(h.game.keys.size,0);
  }finally{h.restore();}
});

test('real controller input changes thrust by elapsed time and pause discards held triggers',()=>{
  const h=harness();try{
    const buttons=Array.from({length:16},()=>({pressed:false})),pad={axes:[0,0,0,-.4],buttons};navigator.getGamepads=()=>[pad];
    const run=fps=>{h.game.sim.throttle=.15;h.game.padPrevious=[];for(let i=0;i<fps;i++)h.game.gamepad(1/fps);return h.game.sim.throttle;};assert.ok(Math.abs(run(30)-run(120))<1e-12);
    buttons[7].pressed=true;buttons[9].pressed=true;h.game.padPrevious=[];const input=h.game.input(1/60);assert.equal(h.game.ui.panel,'settings');assert.equal(input.fire,false);
  }finally{h.restore();}
});

test('departure can be cancelled before the drive engages without consuming jump fuel',()=>{
  const h=harness();try{
    h.game.mode='departure';h.game.jumpDestination='cinder';h.game.sim.beginDeparture();h.game.setMode=mode=>{h.game.mode=mode;};
    h.windowEvents.get('keydown')(key('Escape'));assert.equal(h.game.mode,'flight');assert.equal(h.game.sim.departure,false);assert.equal(h.game.jumpDestination,null);assert.equal(h.game.sim.state.fuel,100);
  }finally{h.restore();}
});

test('two thumbs can steer and fire independently, with release and lost capture clearing only their control',()=>{
  const h=harness();try{
    h.element('joystick-ring').rect={left:10,top:200,width:104,height:104};
    const joystick=h.element('joystick'),fire=h.element('mobileFire');joystick.events.get('pointerdown')(pointer(90,252,1));fire.events.get('pointerdown')(pointer(740,280,2));
    let input=h.game.input(1/60);assert.ok(input.x>.8);assert.equal(input.fire,true);
    fire.events.get('pointerup')(pointer(740,280,2));input=h.game.input(1/60);assert.ok(input.x>.8);assert.equal(input.fire,false);
    joystick.events.get('lostpointercapture')(pointer(90,252,1));assert.equal(h.game.input(1/60).x,0);
  }finally{h.restore();}
});

test('vertical touch thrust has the correct direction, clamps at both ends and cancels autopilot',()=>{
  const h=harness();try{
    const slider=h.element('touchThrottle');slider.rect={left:130,top:210,width:44,height:74};h.game.sim.autopilot=true;
    slider.events.get('pointerdown')(pointer(145,210,2));assert.equal(h.game.sim.throttle,1);assert.equal(h.game.sim.autopilot,false);
    slider.events.get('pointermove')(pointer(145,247,2));assert.equal(h.game.sim.throttle,.5);assert.equal(slider.attributes.get('aria-valuenow'),'50');
    slider.events.get('pointermove')(pointer(145,305,2));assert.equal(h.game.sim.throttle,0);
    slider.events.get('pointerup')(pointer(145,305,2));slider.events.get('pointermove')(pointer(145,210,2));assert.equal(h.game.sim.throttle,0);
  }finally{h.restore();}
});

test('pausing clears held mobile controls and prevents a stale finger from steering after resume',()=>{
  const h=harness();try{
    h.element('joystick-ring').rect={left:10,top:200,width:104,height:104};const joystick=h.element('joystick');
    joystick.events.get('pointerdown')(pointer(90,252,1));h.element('mobileFire').events.get('pointerdown')(pointer(740,280,2));h.game.action('flight-menu');assert.equal(h.game.ui.panel,'flight-menu');
    h.game.ui.closePanel();joystick.events.get('pointermove')(pointer(95,252,1));const input=h.game.input(1/60);assert.equal(input.x,0);assert.equal(input.fire,false);
  }finally{h.restore();}
});

test('holding the context button transfers without firing a different action when the objective completes',()=>{
  const h=harness();try{
    const button=h.element('mobileContext');h.game.ui.touchIntent={action:'interact'};button.events.get('pointerdown')(pointer(300,280,3));assert.equal(h.game.input(1/60).interact,true);
    h.game.ui.touchIntent={action:'autopilot'};button.events.get('pointerup')(pointer(300,280,3));h.game.action('touch-context');assert.equal(h.game.sim.autopilot,false);assert.equal(h.game.input(1/60).interact,false);
  }finally{h.restore();}
});

test('mobile boost takes manual control and the stop button cancels a held boost',()=>{
  const h=harness();try{
    h.game.sim.autopilot=true;h.game.sim.throttle=0;h.element('mobileBoost').events.get('pointerdown')(pointer(660,240,4));assert.equal(h.game.sim.autopilot,false);assert.ok(h.game.sim.throttle>=.65);assert.equal(h.game.input(1/60).boost,true);
    h.game.action('brake');assert.equal(h.game.sim.throttle,0);assert.equal(h.game.input(1/60).boost,false);
  }finally{h.restore();}
});
