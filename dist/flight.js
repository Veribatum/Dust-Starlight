import * as THREE from './vendor/three.module.js';
import {stats, rng, hash, clamp, systemById, freeHold, progress, addLog, fine, hasIllegal, PORTS, onDuty, bondTier, addHeat} from './world.js';
import {Encounters} from './encounters.js';

export function segmentDistanceSquared(point,start,end) {
  const delta=end.clone().sub(start),denom=delta.lengthSq();
  const t=denom?clamp(point.clone().sub(start).dot(delta)/denom,0,1):0;
  return start.clone().addScaledVector(delta,t).distanceToSquared(point);
}
const vector=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
let uid=1;
export class Flight {
  constructor(state,emit=()=>{}){
    this.state=state;this.emit=emit;this.pos=vector(0,20,700);this.quat=new THREE.Quaternion();this.vel=vector();this.turn=vector();this.throttle=.35;this.speed=0;this.energy=100;this.lastHit=100;this.shake=0;this.hitTimer=0;this.fireCooldown=0;this.missileCooldown=0;this.boosting=false;this.boostLocked=false;this.autopilot=false;this.departure=false;this.dead=false;this.entities=[];this.bullets=[];this.collisionCooldown=0;this.scan=0;this.scanActive=false;this.time=0;this.arrivalGrace=0;this.input={x:0,y:0,roll:0,fire:false,boost:false};this.target=null;this.buildWorld();
  }
  buildWorld(){
    const random=rng(hash(this.state.system+'-'+(this.state.visits[this.state.system]||1))),sys=systemById(this.state.system);
    this.entities=[];this.bullets=[];this.station={id:'station',kind:'station',name:sys.port,pos:vector(...PORTS[sys.id].dock),radius:65};this.target=this.station;this.autopilot=false;
    for(let i=0;i<7;i++){
      const a=random()*Math.PI*2,r=450+random()*1050;
      this.entities.push({id:'cache-'+uid++,kind:i%3===0?'wreck':'cache',name:i%3===0?'Convoy wreck':'Salvage cache',pos:i===0?vector(180,45,-430):vector(Math.cos(a)*r,(random()-.5)*240,Math.sin(a)*r-450),radius:7,dead:false,goods:'parts',quantity:2});
    }
    for(let i=0;i<9;i++){
      const a=random()*Math.PI*2,r=600+random()*1300;
      this.entities.push({id:'ore-'+uid++,kind:'ore',name:'Titanium vein',pos:vector(Math.cos(a)*r,(random()-.5)*300,Math.sin(a)*r-550),radius:12+random()*16,hp:65,maxHp:65,dead:false});
    }
    const hunt=this.state.missions.find(m=>m.type==='bounty'&&m.dest===this.state.system);
    const count=Math.max(sys.danger>.6?4:sys.danger>.3?3:2,hunt?.count||0);
    for(let i=0;i<count;i++)this.spawnPirate(random,i);
    if(sys.security>=2){this.entities.push({id:'patrol-'+uid++,kind:'patrol',name:'Directorate patrol',pos:vector(-280,70,this.station.pos.z+560),vel:vector(),quat:new THREE.Quaternion(),radius:9,hp:155,maxHp:155,cooldown:2,phase:random()*6,dead:false});}
    if(sys.security>=2&&this.state.heat>=3)for(let i=0;i<Math.min(2,Math.floor(this.state.heat)-2);i++)this.entities.push({id:'patrol-'+uid++,kind:'patrol',name:'Directorate interdiction wing',assetId:'crimson-vanguard',length:28,pos:vector(650+i*260,160,this.station.pos.z+1400),vel:vector(),quat:new THREE.Quaternion(),radius:12,hp:190,maxHp:190,cooldown:2,phase:i*2,dead:false});
    const callsigns=['Old Promise','Resolute','Golden Road','Long Winter','Blue Meridian','Far Country','Estuary','Pioneer','Brass Lantern','Good Fortune','Wayward Son','Daybreak','Northbound','Saltwater','Hearthfire','Whisper','Dust Runner','Paladin','Slow Sunday','Windward'];
    const fleet=['bulk','shuttle','tanker','shuttle','liner','bulk','shuttle','tanker'];
    for(let i=0;i<PORTS[sys.id].traffic;i++){
      const classId=fleet[i%fleet.length],heavy=classId!=='shuttle',lane=i%5,side=lane%2?1:-1;
      const dock=vector(side*(heavy?300+lane*105:135+lane*75),(lane-2)*125,this.station.pos.z+100+lane*55);
      const start=vector(side*(1100+lane*260),450-lane*190,2400+lane*330),exit=vector(-side*(1800+lane*280),-250+lane*190,1800+lane*500);
      const route={start,dock,exit,inbound:heavy?42:24,hold:heavy?16:7,outbound:heavy?52:28,cooldown:18};
      const commercial={bulk:['five-engine-hauler','frontier-transport'],shuttle:['vortex-z3','scout'],tanker:['leviathan','azure-voyager'],liner:['spirit-of-fire','mothership','spire-cruiser']};
      const models=commercial[classId];
      const assetId=models[(i+SYSTEM_INDEX(sys.id))%models.length],length=({leviathan:780,mothership:980,'spirit-of-fire':650,'spire-cruiser':520,'five-engine-hauler':220,'frontier-transport':180,'azure-voyager':300,'vortex-z3':28,scout:30})[assetId],capital=length>=500;
      if(capital){const berth=Math.max(PORTS[sys.id].span*.75+length*.6,1300)+lane*240;route.dock.set(side*berth,150+lane*150,900+lane*180);route.start.set(side*(berth+1400),650,4600+lane*420);route.exit.set(side*(berth+1800),-180,4100+lane*450);route.inbound=110;route.hold=30;route.outbound=125;}
      this.entities.push({id:'trader-'+uid++,kind:'trader',classId,assetId,length,capital,name:callsigns[i],operator:['Mercy Freight Co.','Reedwater Commercial','Outer Reach Logistics','Independent Transport'][i%4],pos:vector(),vel:vector(),quat:new THREE.Quaternion(),radius:length*.56,route,age:random()*(route.inbound+route.hold+route.outbound+route.cooldown),phase:'Inbound',dead:false});
    }
    this.tickTraffic(0);
    this.dead=false;this.scan=0;this.scanActive=false;this.departure=false;this.encounters=new Encounters(this);
  }
  spawnPirate(random=rng(Date.now()),i=0){
    const entity={id:'pirate-'+uid++,kind:'pirate',assetId:i%2?'crimson-vanguard':'nova-fighter',length:19,name:['Raider Jackal','Raider Gallows','Raider Vulture','Raider Blackthorn'][i%4],pos:vector((random()-.5)*1300,(random()-.5)*300,-1400-random()*500),vel:vector(),quat:new THREE.Quaternion(),radius:8,hp:68+systemById(this.state.system).danger*24,maxHp:68+systemById(this.state.system).danger*24,cooldown:1+random()*2,phase:random()*Math.PI*2,dead:false};
    this.entities.push(entity);return entity;
  }
  launch(){this.encounters.sync();this.pos.copy(this.station.pos).add(vector(0,55,330));this.quat.setFromAxisAngle(vector(0,1,0),Math.PI);this.vel.set(0,0,0);this.turn.set(0,0,0);this.speed=0;this.throttle=.35;this.energy=100;this.boostLocked=false;this.lastHit=10;this.dead=false;this.target=this.encounters.focused()?this.encounters.target(this.encounters.focused().m):this.station;this.autopilot=false;this.departure=false;this.state.shield=stats(this.state).shield;}
  arrive(){
    this.buildWorld();const focused=this.encounters.focused(),objective=focused&&this.encounters.target(focused.m);
    this.pos.copy(objective?objective.pos:this.station.pos).add(vector(objective?0:750,90,objective?1200:2400));
    const facing=(objective||this.station).pos;this.quat.setFromRotationMatrix(new THREE.Matrix4().lookAt(this.pos,facing,vector(0,1,0)));
    this.vel.set(0,0,0);this.turn.set(0,0,0);this.speed=0;this.throttle=.35;this.energy=100;this.boostLocked=false;this.arrivalGrace=5;this.target=objective||this.station;
  }
  beginDeparture(){this.autopilot=false;this.departure=true;this.speed=0;this.vel.set(0,0,0);this.turn.set(0,0,0);}
  jumpClearance(){return Math.max(1400,PORTS[this.state.system].span*.8+550);}
  clearForWarp(){const outward=this.pos.clone().normalize();return this.pos.length()>this.jumpClearance()&&vector(0,0,-1).applyQuaternion(this.quat).dot(outward)>.98&&this.canJump();}
  navigationGoal(target){
    const radius=PORTS[this.state.system].span*.24+90;
    if(segmentDistanceSquared(vector(),this.pos,target.pos)<radius*radius)return vector((this.pos.x<0?-1:1)*PORTS[this.state.system].span*.85,160,this.station.pos.z+850);
    return target.pos;
  }
  targets(){return [this.station,...this.entities.filter(e=>!e.dead&&!e.hidden)];}
  select(id){const entity=this.targets().find(e=>e.id===id);if(entity){this.target=entity;return true;}return false;}
  cycle(){
    const candidates=this.targets().filter(e=>e.kind!=='ore'&&e.kind!=='trader').sort((a,b)=>{
      const weight=e=>e.kind==='pirate'?0:e.kind==='cache'||e.kind==='wreck'?1:2;
      return weight(a)-weight(b)||a.pos.distanceToSquared(this.pos)-b.pos.distanceToSquared(this.pos);
    });
    const index=candidates.findIndex(e=>e.id===this.target?.id);this.target=candidates[(index+1)%candidates.length];return this.target;
  }
  nearest(kind){return this.entities.filter(e=>!e.dead&&!e.interactionComplete&&(!kind||e.kind===kind)).sort((a,b)=>a.pos.distanceToSquared(this.pos)-b.pos.distanceToSquared(this.pos))[0];}
  tickTraffic(dt){
    for(const ship of this.entities){if(ship.kind!=='trader')continue;const r=ship.route;if(!r)continue;const total=r.inbound+r.hold+r.outbound+r.cooldown;ship.age=(ship.age+dt)%total;const old=ship.pos.clone();let direction;
      if(ship.age<r.inbound){ship.phase='Inbound';ship.hidden=false;ship.pos.copy(r.start).lerp(r.dock,ship.age/r.inbound);direction=r.dock.clone().sub(r.start);}
      else if(ship.age<r.inbound+r.hold){ship.phase='Berthing';ship.hidden=false;ship.pos.copy(r.dock);direction=r.exit.clone().sub(r.dock);}
      else if(ship.age<r.inbound+r.hold+r.outbound){ship.phase='Outbound';ship.hidden=false;ship.pos.copy(r.dock).lerp(r.exit,(ship.age-r.inbound-r.hold)/r.outbound);direction=r.exit.clone().sub(r.dock);}
      else{ship.phase='Jump departure';ship.hidden=true;ship.pos.copy(r.exit);direction=r.exit.clone().sub(r.dock);}
      ship.vel.copy(ship.pos).sub(old).divideScalar(Math.max(dt,.016));if(direction.lengthSq()>0)ship.quat.setFromRotationMatrix(new THREE.Matrix4().lookAt(vector(),direction,vector(0,1,0)));
    }
  }
  distance(e=this.target){return e?this.pos.distanceTo(e.pos):0;}
  canDock(){return this.distance(this.station)<235;}
  canJump(){return !this.entities.some(e=>!e.dead&&!e.encounterDormant&&e.kind==='pirate'&&this.distance(e)<900);}
  toggleAutopilot(){this.autopilot=!this.autopilot;if(!this.target)this.target=this.station;return this.autopilot;}
  shoot(missile=false){
    if(this.dead)return false;
    if(missile&&(this.state.missiles<1||this.missileCooldown>0))return false;
    if(!missile&&(this.energy<4||this.fireCooldown>0))return false;
    const forward=vector(0,0,-1).applyQuaternion(this.quat);let target=this.target;
    if(!target||target.dead||!['pirate','patrol','ore'].includes(target.kind))target=null;
    if(missile&&!target){this.emit({type:'notice',text:'Select a hostile ship or ore vein first.'});return false;}
    let direction=forward.clone();const speed=missile?300:570;
    if(target){const diff=target.pos.clone().sub(this.pos);if(missile||diff.clone().normalize().dot(forward)>.975){const lead=target.vel?target.vel.clone().multiplyScalar(diff.length()/speed*.65):vector();direction=target.pos.clone().add(lead).sub(this.pos).normalize();}}
    const start=vector(uid%2?1.5:-1.5,-.35,-4.8).applyQuaternion(this.quat).add(this.pos);
    this.bullets.push({id:'shot-'+uid++,owner:'player',pos:start,prev:start.clone(),vel:direction.multiplyScalar(speed).addScaledVector(this.vel,.3),life:missile?9:2.4,damage:missile?75:stats(this.state).damage,missile,target:missile?target:null,dead:false});
    if(missile){this.state.missiles--;this.missileCooldown=.85;}else{this.energy-=4;this.fireCooldown=.15;}
    this.emit({type:missile?'missile':'shot'});return true;
  }
  damage(amount){
    const shield=Math.min(this.state.shield,amount);this.state.shield-=shield;this.state.hull=Math.max(0,this.state.hull-(amount-shield));this.lastHit=0;this.shake=Math.min(2.5,amount*.08);this.emit({type:'damage',amount});
    if(this.state.hull<=0&&!this.dead){this.dead=true;this.emit({type:'death'});}
  }
  destroy(e){
    if(e.dead)return;
    e.dead=true;this.emit({type:'explosion',pos:e.pos.clone(),big:e.kind!=='ore'});this.hitTimer=.2;
    if(e.kind==='pirate'){
      const bounty=Math.round(150+systemById(this.state.system).danger*130);this.state.credits+=bounty;this.state.kills++;progress(this.state,'bounty');
      this.emit({type:'notice',text:`Raider destroyed · +${bounty} cr`,short:true});
      this.entities.push({id:'loot-'+uid++,kind:'cache',name:'Raider salvage',pos:e.pos.clone(),radius:7,dead:false,goods:'parts',quantity:2});
    }else if(e.kind==='ore')this.entities.push({id:'oreloot-'+uid++,kind:'cache',name:'Titanium fragments',pos:e.pos.clone(),radius:7,dead:false,goods:'ore',quantity:3,ore:true});
    else if(e.kind==='patrol'){addHeat(this.state,2,'Destroyed a Directorate patrol vessel. Armed interdiction authorized.');this.emit({type:'notice',text:'Patrol destroyed. Directorate heat increased.'});}
    if(this.target===e){this.autopilot=false;this.target=e.kind==='ore'?this.entities[this.entities.length-1]:this.nearest('pirate')||this.station;}
    this.encounters.destroyed(e);
  }
  pickup(e){
    if(e.dead||e.interactionComplete)return false;
    if(freeHold(this.state)<e.quantity){if(!e.warned){this.emit({type:'notice',text:'Cargo hold full. Unload at a port to recover salvage.'});e.warned=true;}return false;}
    this.state.cargo[e.goods]=(this.state.cargo[e.goods]||0)+e.quantity;
    if(e.kind==='wreck'){e.interactionComplete=true;e.phase='Salvage recovered';}else e.dead=true;
    this.state.credits+=30;this.state.salvaged++;
    if(!e.ore)progress(this.state,'salvage');
    this.emit({type:'salvage',text:`Recovered ${e.quantity} t of ${e.goods==='ore'?'titanium':'machine parts'} · +30 cr`,pos:e.pos.clone()});
    if(this.target===e){this.autopilot=false;if(e.dead)this.target=this.nearest('wreck')||this.nearest('cache')||this.station;}
    return true;
  }
  step(dt,input=this.input){
    if(this.dead)return;dt=clamp(dt,0,.05);this.time+=dt;this.state.time+=dt;this.lastHit+=dt;this.fireCooldown=Math.max(0,this.fireCooldown-dt);this.missileCooldown=Math.max(0,this.missileCooldown-dt);this.hitTimer=Math.max(0,this.hitTimer-dt);this.shake*=Math.exp(-dt*7);this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);
    this.tickTraffic(dt);this.arrivalGrace=Math.max(0,this.arrivalGrace-dt);const spec=stats(this.state);this.energy=Math.min(100,this.energy+dt*22);
    if(!input.boost||this.energy>35)this.boostLocked=false;if(this.energy<9)this.boostLocked=true;
    this.boosting=!!input.boost&&!this.boostLocked&&this.energy>8&&this.state.fuel>0&&!input.brake;
    if(this.boosting){this.energy=Math.max(0,this.energy-dt*42);this.state.fuel=Math.max(0,this.state.fuel-dt*.12*(onDuty(this.state,'boone')?.8:1));}
    if(this.lastHit>6)this.state.shield=Math.min(spec.shield,this.state.shield+dt*10);
    if(this.lastHit>12&&onDuty(this.state,'len'))this.state.hull=Math.min(spec.hull,this.state.hull+dt*(.65+bondTier(this.state,'len')*.15));
    if(systemById(this.state.system).security===0&&this.state.heat>0&&!hasIllegal(this.state)){this.state.law??={reason:'Registry flagged',inspections:0,cooling:0};this.state.law.cooling+=dt;if(this.state.law.cooling>=180){this.state.heat=Math.max(0,this.state.heat-.5);this.state.law.cooling=0;this.state.law.reason='Search intensity eased after time outside controlled space.';}}
    if(this.target?.dead){this.target=this.station;this.autopilot=false;}
    if(this.autopilot&&(Math.abs(input.x)>.22||Math.abs(input.y)>.22||Math.abs(input.roll)>.2||input.brake)){this.autopilot=false;this.emit({type:'notice',text:'Manual flight control.'});}
    if(input.brake)this.throttle=0;
    let desiredSpeed=this.throttle*spec.speed*(this.boosting?2.7:1);
    if(this.departure){
      const outward=this.pos.lengthSq()>1?this.pos.clone().normalize():vector(0,0,1),facing=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(vector(),outward,vector(0,1,0)));
      this.quat.slerp(facing,1-Math.exp(-dt*3));desiredSpeed=vector(0,0,-1).applyQuaternion(this.quat).dot(outward)>.985?spec.speed*2:0;this.boosting=desiredSpeed>0;
    }else if(this.autopilot&&this.target){
      const goal=this.navigationGoal(this.target),detour=goal!==this.target.pos,distance=detour?this.pos.distanceTo(goal):this.distance(),stop=detour?0:this.target.kind==='station'?165:this.target.kind==='pirate'||this.target.kind==='patrol'?210:this.target.kind==='ore'?150:this.target.objective||this.target.kind==='civilian'||this.target.kind==='beacon'?125:15;
      const facing=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(this.pos,goal,vector(0,1,0)));this.quat.slerp(facing,1-Math.exp(-dt*2.3));
      desiredSpeed=clamp((distance-stop)*.7,0,spec.speed*.85);
      if(!detour&&this.target.kind==='station'&&distance<195&&this.speed<65){this.autopilot=false;this.emit({type:'dock'});return;}
    }else{
      this.turn.lerp(vector(clamp(input.y||0,-1,1),-clamp(input.x||0,-1,1),-clamp(input.roll||0,-1,1)),1-Math.exp(-dt*8));
      const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(this.turn.x*dt*.94*spec.agility,this.turn.y*dt*1.04*spec.agility,this.turn.z*dt*.95));this.quat.multiply(rotation).normalize();
      if(input.assist!==false&&Math.abs(input.roll||0)<.03){const forward=vector(0,0,-1).applyQuaternion(this.quat);if(Math.abs(forward.y)<.94){const level=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(vector(),forward,vector(0,1,0)));this.quat.slerp(level,1-Math.exp(-dt*.65));}}
    }
    this.speed+=(desiredSpeed-this.speed)*(1-Math.exp(-dt*(input.brake?6:2.1)));const forward=vector(0,0,-1).applyQuaternion(this.quat);this.vel.lerp(forward.multiplyScalar(this.speed),1-Math.exp(-dt*9));this.pos.addScaledVector(this.vel,dt);
    if(input.fire)this.shoot();
    for(const e of this.entities){
      if(e.dead)continue;
      if(e.kind==='pirate'||e.kind==='patrol'){
        if(e.encounterDormant)continue;
        const victim=e.attackTarget&&!e.attackTarget.dead?e.attackTarget:null,victimPos=victim?victim.pos:this.pos,victimVel=victim?victim.vel:this.vel;
        const hostile=e.kind==='pirate'||this.state.heat>=3,distance=e.pos.distanceTo(victimPos),safe=victimPos.distanceTo(this.station.pos)<340;
        let goal;
        if(e.escapeTarget){goal=e.escapeTarget;}else if(hostile&&!safe&&distance<2200){
          const orbit=vector(Math.sin(this.time*.65+e.phase)*160,Math.sin(this.time*.38+e.phase)*70,Math.cos(this.time*.65+e.phase)*160);goal=victimPos.clone().add(orbit);
        }else if(e.patrolCenter){goal=e.patrolCenter.clone().add(vector(Math.sin(this.time*.18)*260,Math.cos(this.time*.13)*90,Math.cos(this.time*.18)*200));}
        else{goal=vector(Math.sin(this.time*.04+e.phase)*1100,Math.sin(this.time*.03+e.phase)*150,-1200+Math.cos(this.time*.04+e.phase)*250);}
        const turn=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(e.pos,goal,vector(0,1,0)));e.quat.slerp(turn,1-Math.exp(-dt*.95));
        const speed=e.escapeTarget?82:hostile&&!safe?(distance>330?80:45):33;e.vel.copy(vector(0,0,-1).applyQuaternion(e.quat)).multiplyScalar(speed);e.pos.addScaledVector(e.vel,dt);e.cooldown-=dt;
        if(!e.escapeTarget&&hostile&&!safe&&distance<850&&e.cooldown<=0&&(victim||this.arrivalGrace<=0)){
          const aim=victimPos.clone().addScaledVector(victimVel,distance/420*.65).sub(e.pos).normalize();
          if(aim.dot(vector(0,0,-1).applyQuaternion(e.quat))>.75){this.bullets.push({id:'shot-'+uid++,owner:e.id,victim,pos:e.pos.clone(),prev:e.pos.clone(),vel:aim.multiplyScalar(420),life:3,damage:9+systemById(this.state.system).danger*5,dead:false});e.cooldown=1.1+Math.random()*.6;}
        }
      }else if(e.kind==='trader'){
        continue;
      }else if((e.kind==='cache'||e.kind==='wreck')&&!e.interactionComplete&&this.distance(e)<38)this.pickup(e);
      else if(e.kind==='ore'&&this.distance(e)<e.radius+5&&this.collisionCooldown<=0){
        this.damage(Math.max(5,Math.min(28,this.speed*.22)));this.pos.copy(e.pos).addScaledVector(this.pos.clone().sub(e.pos).normalize(),e.radius+9);this.speed*=.25;this.collisionCooldown=1.5;this.emit({type:'notice',text:'Hull contact. Give the rocks some room.',short:true});
      }
    }
    this.updateScan(dt);
    for(const b of this.bullets){
      if(b.dead)continue;b.prev.copy(b.pos);b.life-=dt;
      if(b.missile&&b.target&&!b.target.dead){const direction=b.target.pos.clone().sub(b.pos).normalize(),current=b.vel.clone().normalize();current.lerp(direction,Math.min(1,dt*5)).normalize();b.vel.copy(current).multiplyScalar(300);}
      b.pos.addScaledVector(b.vel,dt);
      if(b.owner==='player'){
        for(const e of this.entities){if(e.dead||!['pirate','patrol','ore'].includes(e.kind))continue;if(segmentDistanceSquared(e.pos,b.prev,b.pos)<(e.radius+1.2)**2){e.hp-=b.damage;if(e.kind==='patrol'&&!e.attacked){e.attacked=true;addHeat(this.state,1,'Weapons fire on a Directorate patrol recorded.');}b.dead=true;this.hitTimer=.18;this.emit({type:'impact',pos:b.pos.clone(),ore:e.kind==='ore'});if(e.hp<=0)this.destroy(e);break;}}
      }else if(b.victim&&!b.victim.dead&&segmentDistanceSquared(b.victim.pos,b.prev,b.pos)<(b.victim.radius+3)**2){b.dead=true;b.victim.hp=Math.max(0,b.victim.hp-b.damage);this.emit({type:'impact',pos:b.pos.clone()});}
      else if(segmentDistanceSquared(this.pos,b.prev,b.pos)<6**2){b.dead=true;this.damage(b.damage);}
      if(b.life<=0)b.dead=true;
    }
    this.bullets=this.bullets.filter(b=>!b.dead);this.entities=this.entities.filter(e=>!e.dead);
    this.encounters.step(dt,input);
    const coreRadius=PORTS[this.state.system].span*.24;
    if(this.pos.length()<coreRadius&&this.collisionCooldown<=0){this.damage(Math.max(5,Math.min(25,this.speed*.2)));this.pos.normalize().multiplyScalar(coreRadius+18);this.speed=0;this.vel.set(0,0,0);this.collisionCooldown=1.5;this.emit({type:'notice',text:'Station hull contact. Use the marked docking approach.',short:true});}
    // The play space is orbital: atmosphere is a hazard, while free-flight needs no fuel.
    const planet=vector(2850,-1150,-6900),pd=this.pos.distanceTo(planet);
    if(pd<2540&&this.collisionCooldown<=0){this.damage(18);this.pos.copy(planet).addScaledVector(this.pos.clone().sub(planet).normalize(),2555);this.speed*=.3;this.collisionCooldown=2;this.emit({type:'notice',text:'Atmospheric shear! Turn back toward the orbital lanes.'});}
  }
  updateScan(dt){
    const patrol=this.nearest('patrol');
    if(!patrol||(!hasIllegal(this.state)&&this.state.heat<=0)){this.scan=0;this.scanActive=false;return;}
    const distance=this.distance(patrol);
    if(distance<560){
      if(!this.scanActive){this.scanActive=true;this.scan=9+(onDuty(this.state,'rook')?4:0);this.emit({type:'radio',who:'Directorate patrol',text:'Unregistered freighter, hold position for a cargo scan. Boost out of range if you want to keep your secrets.'});}
      this.scan-=dt;
      if(this.scan<=0){const result=fine(this.state);addLog(this.state,`Patrol scan: ${result.amount} cr fine. Unlicensed cargo seized.`,'event');this.emit({type:'notice',text:`Scan complete · ${result.amount} cr fine. Unlicensed cargo seized.${result.failed.length?' Confiscated contracts can be accepted again at a port.':''}`});this.scanActive=false;this.scan=0;}
    }else if(distance>760&&this.scanActive){this.scanActive=false;this.scan=0;addHeat(this.state,.4,'Refused a Directorate cargo scan; transponder under scrutiny.');this.emit({type:'notice',text:'Patrol scan evaded · registry scrutiny increased.'});}
  }
}
function SYSTEM_INDEX(id){return ['juniper','bellwether','cinder','hush','crown','deadlight','meridian','saffron','vesper'].indexOf(id);}
