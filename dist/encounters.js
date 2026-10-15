import * as T from './vendor/three.module.js';
import {SPACE_JOBS,deliver,addLog,money,clamp,rng,hash} from './world.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
let serial=1;
export class Encounters {
  constructor(sim){this.sim=sim;this.sessions=new Map();this.sync();}
  get state(){return this.sim.state;}
  sync(){
    for(const [id,session] of this.sessions){if(!this.state.missions.some(m=>m.id===id&&!m.failed))this.remove(session);}
    for(const mission of this.state.missions){
      if(SPACE_JOBS.includes(mission.type)&&mission.dest===this.state.system&&!mission.failed&&!this.sessions.has(mission.id))this.create(mission);
    }
  }
  entity(session,props){
    const object={id:'objective-'+serial++,missionId:session.m.id,objective:true,dead:false,vel:V(),quat:new T.Quaternion(),radius:20,...props};
    session.objects.push(object);this.sim.entities.push(object);return object;
  }
  create(m){
    const s={m,objects:[],enemies:[],active:false,transfer:0,routeProgress:0,announced:false};
    this.sessions.set(m.id,s);const offset=this.sessions.size*180;
    if(m.type==='rescue'){
      s.ship=this.entity(s,{kind:'civilian',name:'Clinic transport · Mayflower',assetId:'frontier-transport',length:90,pos:V(-1100-offset,140,2050),hp:420,maxHp:420,phase:'Distress signal'});
      this.ambush(s,1);s.duration=5;
    }else if(m.type==='escort'){
      s.ship=this.entity(s,{kind:'civilian',name:m.story&&m.id==='story-5'?'Relief convoy · Good Fortune':'Scrubber freight · Old Promise',assetId:m.id==='story-5'?'spirit-of-fire':'five-engine-hauler',length:150,pos:V(-1550-offset,180,2450),hp:680,maxHp:680,phase:'Waiting for escort'});
      s.start=s.ship.pos.clone();s.end=V(-500-offset,270,4100);s.routeLength=s.start.distanceTo(s.end);this.ambush(s,2);
    }else if(m.type==='defense'){
      s.ship=this.entity(s,{kind:'civilian',name:'Relief carrier · Icebound',assetId:'icebound-carrier',length:340,pos:V(-1250-offset,80,-2150),hp:950,maxHp:950,phase:'Blockade'});
      this.ambush(s,Math.max(0,m.count-m.progress));
    }else if(m.type==='survey'){
      const locations=[V(-1700-offset,180,-1900),V(-2450-offset,-90,-2350),V(-2200-offset,260,-3200)];
      const assets=['machine-frigate','leviathan','mothership'];
      s.nodes=locations.map((pos,i)=>this.entity(s,{kind:'beacon',name:['Convoy lead · black box','Broken escort · black box','Relief ship · black box'][i],assetId:assets[i],length:145+i*35,pos,scanned:i<m.progress,hidden:false,objective:i>=m.progress,interactionComplete:i<m.progress,phase:i<m.progress?'Recorder decoded':'Recorder signal'}));
      s.duration=4;
    }else if(m.type==='infiltrate'){
      const locations=[V(1100+offset,-180,1750),V(1850+offset,-260,1150),V(2450+offset,-170,450)];
      s.nodes=locations.map((pos,i)=>this.entity(s,{kind:i===2?'civilian':'beacon',name:['Shadow lane · beacon 01','False manifest · beacon 02','Journalist shuttle · Saltwater'][i],assetId:i===2?'vortex-z3':null,length:22,pos,hidden:i!==m.progress,phase:i===2?'Awaiting evidence':'Navigation waypoint'}));s.duration=4;
      const patrol=this.sim.nearest('patrol');if(patrol){patrol.pos.set(1760+offset,120,750);patrol.patrolCenter=patrol.pos.clone();}
    }
    return s;
  }
  ambush(s,count){
    const random=rng(hash(s.m.id));
    for(let i=0;i<count;i++){
      const enemy=this.sim.spawnPirate(random,i),ship=s.ship;
      enemy.pos.copy(ship.pos).add(V((i%2?1:-1)*(420+i*95),80+i*25,-380-i*70));
      enemy.attackTarget=ship;enemy.missionId=s.m.id;enemy.encounterDormant=true;
      enemy.assetId=i%2?'crimson-vanguard':'scout';s.enemies.push(enemy);s.objects.push(enemy);
    }
  }
  remove(s){for(const object of s.objects)object.dead=true;this.sessions.delete(s.m.id);}
  finishInteraction(object,phase){
    object.interactionComplete=true;object.objective=false;object.phase=phase;
    // A navigation hologram can switch off; a ship or wreck stays in space.
    object.hidden=object.kind==='beacon'&&!object.assetId;
  }
  release(s){
    const phase={rescue:'Supplies received',escort:'Escort complete',survey:'Recorder decoded',infiltrate:'Evidence received',defense:'Carrier secure'}[s.m.type];
    for(const object of s.objects){
      delete object.missionId;
      if(object.dead)continue;
      if(object.kind==='pirate'||object.kind==='patrol'){
        object.attackTarget=null;object.encounterDormant=false;
      }else{
        this.finishInteraction(object,phase);object.vel.set(0,0,0);
      }
    }
    this.sessions.delete(s.m.id);
  }
  retry(m){
    if(!m||m.dest!==this.state.system||!SPACE_JOBS.includes(m.type))return false;
    const old=this.sessions.get(m.id);if(old)this.remove(old);
    m.failed=false;m.progress=0;this.create(m);this.sim.target=this.target(m);return true;
  }
  target(m){
    const s=this.sessions.get(m.id);if(!s)return null;
    if(m.type==='survey'||m.type==='infiltrate')return s.nodes[Math.min(m.progress,s.nodes.length-1)];
    if(m.type==='defense'&&s.active)return s.enemies.find(e=>!e.dead)||s.ship;
    return s.ship;
  }
  focused(){
    const selected=this.state.missions.find(m=>m.id===this.sim.target?.missionId);
    const mission=selected||this.state.missions.find(m=>m.story&&SPACE_JOBS.includes(m.type))||this.state.missions.find(m=>SPACE_JOBS.includes(m.type));
    return mission&&this.sessions.get(mission.id);
  }
  cue(m){
    const s=this.sessions.get(m.id);if(m.failed)return {detail:'Transport lost · restart this encounter in the log.',percent:0,canInteract:false};
    if(!s)return null;const target=this.target(m),d=target?this.sim.distance(target):Infinity;
    if(m.type==='escort')return {detail:s.active?`${Math.round(s.routeProgress*100)}% of route · convoy hull ${Math.ceil(s.ship.hp/s.ship.maxHp*100)}%${d>1000?' · return to the convoy':''}`:'Join the freight ship within 650 m to start the escort.',percent:s.routeProgress*100,canInteract:false};
    if(m.type==='defense')return {detail:`${m.progress}/${m.count} attackers destroyed · carrier hull ${Math.ceil(s.ship.hp/s.ship.maxHp*100)}%`,percent:m.progress/m.count*100,canInteract:false};
    const navigating=m.type==='infiltrate'&&m.progress<2,range=m.type==='survey'?220:180,maxSpeed=m.type==='survey'?55:45;
    const canInteract=!navigating&&d<range&&this.sim.speed<maxSpeed&&this.sim.target===target;
    return {detail:navigating?`Fly through ${target.name} · ${Math.round(d)} m`:d>=range?`Approach ${target.name} within ${range} m`:this.sim.speed>=maxSpeed?`Brake below ${maxSpeed} m/s, then hold ${m.type==='survey'?'Scan':'Transfer'}`:`Hold Q / ${m.type==='survey'?'Scan':'Transfer'} · ${Math.max(0,s.duration-s.transfer).toFixed(1)} s`,percent:navigating?m.progress/m.count*100:s.transfer/s.duration*100,canInteract,action:m.type==='survey'?'Scan':'Transfer'};
  }
  complete(s){
    s.m.progress=s.m.count;const title=s.m.title,result=deliver(this.state,s.m.id);
    if(!result.ok)return;this.release(s);this.sim.autopilot=false;
    if(!this.sim.target||this.sim.target.dead||this.sim.target.hidden)this.sim.target=s.ship||s.nodes?.findLast(node=>!node.hidden)||this.sim.station;
    this.sim.emit({type:'contract-complete',title,...result});
    this.sim.emit({type:'radio',who:s.m.contact||'Outer Reach dispatch',text:`${title} complete. ${money(result.reward)} credits transferred. ${result.finished?'The relief ships are home. Cinder is yours. Keep flying.':'There’s more work on the port board when you’re ready.'}`});
  }
  fail(s){
    s.m.failed=true;s.transfer=0;addLog(this.state,`${s.m.title}: the transport was lost. The encounter can be restarted from the log.`,'event');
    this.sim.emit({type:'explosion',pos:s.ship.pos.clone(),big:true});this.remove(s);
    this.sim.autopilot=false;this.sim.target=this.sim.station;
    this.sim.emit({type:'mission-failed',text:'Transport lost. Open the log and restart the encounter to try again.'});
  }
  destroyed(enemy){
    const s=this.sessions.get(enemy.missionId);if(s?.m.type==='defense'){
      s.m.progress=Math.min(s.m.count,s.m.progress+1);
      if(s.m.progress>=s.m.count&&s.ship.hp>0)this.complete(s);
    }
  }
  step(dt,input){
    this.sync();
    for(const s of [...this.sessions.values()]){
      const m=s.m;if(m.progress>=m.count){this.complete(s);continue;}
      if(s.ship&&s.ship.hp<=0){this.fail(s);continue;}
      const target=this.target(m);if(!target)continue;
      if(!s.announced&&this.sim.distance(target)<1350){s.announced=true;this.sim.emit({type:'radio',who:m.contact||'Local channel',text:m.type==='escort'?'There’s our freight ship. Stay with her. The raiders will go for the cargo first.':m.type==='defense'?'That carrier is carrying families. Take the attackers off her before they break the hull.':m.type==='survey'?'The recorder beacon is still alive. Approach slowly and hold Q or Scan to read it.':m.type==='infiltrate'?'Follow the shadow-lane beacons. Keep below the patrols, then transfer the evidence to Saltwater.':'We have a distress signal. Slow below 45 m/s, get within 180 m, and hold Q or Transfer.'});}
      if(s.ship&&!s.active&&this.sim.distance(s.ship)<650){s.active=true;for(const enemy of s.enemies)enemy.encounterDormant=false;if(m.type==='defense'&&this.sim.target===s.ship)this.sim.target=this.target(m);}
      if(m.type==='escort'&&s.active){
        const enemies=s.enemies.filter(e=>!e.dead);
        const holding=this.sim.distance(s.ship)>1000||(s.routeProgress>.9&&enemies.length>0);
        s.ship.phase=holding?'Holding for escort':enemies.length?'Under attack':'Outbound convoy';
        s.ship.vel.copy(s.end).sub(s.start).normalize().multiplyScalar(holding?0:43);
        s.routeProgress=clamp(s.routeProgress+dt*s.ship.vel.length()/s.routeLength,0,1);
        s.ship.pos.copy(s.start).lerp(s.end,s.routeProgress);
        s.ship.quat.setFromRotationMatrix(new T.Matrix4().lookAt(V(),s.end.clone().sub(s.start),V(0,1,0)));
        if(s.routeProgress>=1&&!enemies.length){this.complete(s);continue;}
      }else if(m.type==='infiltrate'&&m.progress<2){
        if(this.sim.distance(target)<160){this.finishInteraction(target,'Lane confirmed');m.progress++;s.nodes[m.progress].hidden=false;this.sim.target=s.nodes[m.progress];s.transfer=0;this.sim.emit({type:'notice',text:'Shadow lane confirmed. Next contact acquired.',short:true});}
      }else if(m.type==='rescue'||m.type==='survey'||m.type==='infiltrate'){
        const cue=this.cue(m);
        if(input.interact&&cue.canInteract)s.transfer+=dt;else s.transfer=Math.max(0,s.transfer-dt*.5);
        if(s.transfer>=s.duration){
          this.finishInteraction(target,m.type==='survey'?'Recorder decoded':m.type==='rescue'?'Supplies received':'Evidence received');target.scanned=m.type==='survey';m.progress++;s.transfer=0;
          if(m.progress>=m.count){this.complete(s);continue;}
          this.sim.target=this.target(m);this.sim.autopilot=false;
          this.sim.emit({type:'notice',text:`Black box decoded · ${m.progress}/${m.count}. Next recorder acquired.`,short:true});
          if(m.type==='survey'&&m.progress===2&&!s.enemies.length){s.ship=target;this.ambush(s,2);s.ship=null;for(const enemy of s.enemies){enemy.attackTarget=null;enemy.encounterDormant=false;}}
        }
      }
    }
  }
}
