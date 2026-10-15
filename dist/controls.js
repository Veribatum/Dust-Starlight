import {clamp} from './world.js';

export function steeringCurve(value,deadzone=.08,sensitivity=1){
  const magnitude=clamp((Math.abs(value)-deadzone)/(1-deadzone),0,1);
  return Math.sign(value)*clamp((magnitude*.4+magnitude*magnitude*.6)*sensitivity,0,1);
}
export function mouseSteering(x,y,width,height,sensitivity=1){
  const radius=Math.max(100,Math.min(width,height)*.32);
  return {x:steeringCurve((x-width/2)/radius,.09,sensitivity),y:steeringCurve((height/2-y)/radius,.09,sensitivity)};
}
export function throttleChange(throttle,input,dt){return clamp(throttle-input*dt*.72,0,1);}
export function loadPreferences(storage=globalThis.localStorage){
  try{const p=JSON.parse(storage.getItem('dust-flight-preferences'))||{};return {sensitivity:clamp(Number(p.sensitivity)||1,.4,1.8),mouseMode:p.mouseMode==='drag'?'drag':'cursor',assist:p.assist!==false,invert:!!p.invert};}
  catch{return {sensitivity:1,mouseMode:'cursor',assist:true,invert:false};}
}
export function savePreferences(p,storage=globalThis.localStorage){try{storage.setItem('dust-flight-preferences',JSON.stringify(p));}catch{/* Device preferences are optional. */}}
