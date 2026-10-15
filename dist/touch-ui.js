import {clamp,systemById,ready} from './world.js';

const rect=(x,y,width,height)=>({x,y,width,height});
export function touchLayout(width,height,insets={}){
  const left=insets.left||0,right=insets.right||0,top=insets.top||0,bottom=insets.bottom||0;
  const usable=width-left-right,landscape=width>height,small=usable<370||height<350,pad=small?10:14;
  const stick=small?90:104,fire=small?64:72,edge=height-bottom-pad;
  const joystick=rect(left+pad,edge-stick,stick,stick),thrust=rect(joystick.x+stick+12,edge-142,44,142);
  const fireButton=rect(width-right-pad-fire,edge-fire,fire,fire);
  const boost=rect(fireButton.x-12-48,edge-123,48,48),missile=rect(boost.x+2,edge-44,44,44);
  const target=rect(fireButton.x+(fire-44)/2,edge-fire-14-44,44,44);
  const gap=boost.x-(thrust.x+thrust.width),wideContext=landscape&&gap>=148;
  const contextWidth=wideContext?Math.min(224,gap-24):Math.min(224,usable-40);
  const context=rect(wideContext?(thrust.x+thrust.width+boost.x-contextWidth)/2:(width-contextWidth+left-right)/2,wideContext?edge-48:edge-142-12-44,contextWidth,44);
  const inlineVitals=landscape&&(usable>=680||(height<350&&usable>=440));
  const vitalsWidth=height<350?Math.min(280,usable-232):280;
  const header=rect(left+8,top+4,usable-16,44),vitals=inlineVitals?rect(height<350?left+68:(width+left-right-vitalsWidth)/2,top+11,vitalsWidth,28):rect(left+20,top+51,usable-40,28);
  const objective=rect(left+14,top+(inlineVitals?52:86),usable-28,44);
  const targetInfo=rect(context.x-10,context.y-26,contextWidth+20,22);
  const radio=rect(left+14,objective.y+objective.height+6,usable-28,44);
  return {landscape,inlineVitals,compact:height<350,header,vitals,objective,joystick,thrust,fire:fireButton,boost,missile,target,context,targetInfo,radio,
    playArea:rect(thrust.x+thrust.width+10,objective.y+objective.height+8,Math.max(1,boost.x-thrust.x-thrust.width-20),Math.max(1,context.y-objective.y-objective.height-18))};
}

export function touchContext(sim,mission,cue,mode){
  if(mode==='departure')return {action:'cancel-jump',label:'Cancel departure',icon:'close'};
  if(mode==='docked')return {action:'launch',label:'Launch ship',icon:'arrow'};
  if(mode!=='flight')return {action:null,label:'Drive engaged',icon:'arrow',disabled:true};
  if(['ore','cache','wreck'].includes(sim.target?.kind))return {action:'autopilot',label:sim.autopilot?'Take control':sim.target.kind==='ore'?'Approach ore vein':sim.target.interactionComplete?'Approach wreck':'Recover salvage',icon:sim.autopilot?'ship':'arrow'};
  if(mission?.failed&&mission.dest===sim.state.system)return {action:'retry-current',label:'Retry encounter',icon:'arrow'};
  if(mission&&mission.dest!==sim.state.system)return {action:'track-current',label:'Plot next jump',icon:'map'};
  if(cue?.canInteract)return {action:'interact',label:'Hold '+cue.action.toLowerCase(),icon:'log',ready:true};
  if(mission&&ready(sim.state,mission)&&sim.target?.kind!=='station')return {action:'track-current',label:'Return to port',icon:'dock'};
  const objective=mission&&sim.encounters?.target(mission);
  if(cue?.action&&objective===sim.target&&sim.distance(objective)<240&&sim.speed>=45)return {action:'brake',label:'Brake to '+cue.action.toLowerCase(),icon:'dock'};
  if(sim.target?.kind==='station'&&sim.canDock())return {action:'dock',label:'Dock at port',icon:'dock',ready:true};
  if(sim.autopilot)return {action:'autopilot',label:'Take control',icon:'ship'};
  if(mission&&(sim.target?.interactionComplete||!sim.target?.missionId||sim.target.missionId!==mission.id)&&!ready(sim.state,mission))return {action:'track-current',label:'Approach objective',icon:'arrow'};
  return {action:'autopilot',label:sim.target?.kind==='pirate'?'Assist pursuit':'Autopilot approach',icon:'arrow'};
}

export function touchObjective(sim,mission,cue,mode){
  if(mode==='departure')return {title:'Leaving port',hint:'Clearing the departure lane',percent:Math.min(100,sim.pos.length()/sim.jumpClearance()*100)};
  if(!mission)return {title:'Free flight',hint:sim.target?.kind==='station'?'Find work at the port':'Choose your next horizon',percent:0};
  if(mission.dest!==sim.state.system)return {title:mission.title,hint:'Jump to '+systemById(mission.dest).name,percent:0};
  if(mission.failed)return {title:mission.title,hint:'Transport lost · retry available',percent:0};
  const session=sim.encounters?.sessions.get(mission.id),object=sim.encounters?.target(mission),d=object?sim.distance(object):sim.distance(sim.target),range=d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m';
  const title={rescue:'Rescue · '+(object?.name.split('·').pop().trim()||'transport'),escort:'Escort convoy',survey:'Scan convoy recorders',infiltrate:'Covert handoff',defense:'Protect the relief carrier'}[mission.type]||mission.title;
  let hint=cue?.canInteract?'Hold '+cue.action.toLowerCase():range+' · approach';
  if(mission.type==='escort'&&session)hint=Math.round(session.routeProgress*100)+'% route · hull '+Math.ceil(session.ship.hp/session.ship.maxHp*100)+'%';
  else if(mission.type==='defense'&&session)hint=mission.progress+'/'+mission.count+' raiders · carrier '+Math.ceil(session.ship.hp/session.ship.maxHp*100)+'%';
  else if(mission.type==='survey')hint=mission.progress+'/'+mission.count+' scanned · '+(cue?.canInteract?'hold scan':range);
  else if(mission.type==='infiltrate')hint=mission.progress+'/3 · '+(cue?.canInteract?'hold transfer':range);
  else if(mission.type==='courier')hint='Deliver at '+systemById(mission.dest).port;
  else if(mission.type==='salvage'||mission.type==='bounty')hint=mission.progress+'/'+mission.count+' complete';
  return {title,hint,percent:clamp(cue?.percent||0,0,100)};
}
