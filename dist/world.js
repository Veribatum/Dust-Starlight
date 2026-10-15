export const SAVE_KEY = 'dust-and-starlight-v1';
export const PORTS = {
  juniper:{design:'Freight wheel',span:920,berths:14,traffic:14,dock:[0,0,480]},
  bellwether:{design:'Cristal habitat',span:1240,berths:22,traffic:18,dock:[0,0,760]},
  cinder:{design:'Industrial drydock',span:1080,berths:18,traffic:16,dock:[0,0,500]},
  hush:{design:'Deep-space relay',span:1160,berths:6,traffic:8,dock:[0,0,480]},
  crown:{design:'Interstellar spire',span:1420,berths:32,traffic:20,dock:[0,0,580]},
  deadlight:{design:'Salvage-built anchorage',span:840,berths:10,traffic:10,dock:[0,0,460]},
  meridian:{design:'Interstellar customs gate',span:1640,berths:38,traffic:20,dock:[0,0,680]},
  saffron:{design:'Refinery crown',span:1320,berths:20,traffic:16,dock:[0,0,580]},
  vesper:{design:'Listening array',span:1180,berths:8,traffic:8,dock:[0,0,520]}
};
export const SYSTEMS = [
  { id:'juniper', name:'Juniper', port:'Mercy Anchorage', x:18, y:47, color:'#dd9970', sky:'#1a1117', planet:['#925343','#d9a177','#583e42'], security:1, danger:.15, faction:'Free settlements', kind:'Agricultural frontier', tagline:'Good soil. Bad debts. Better people.', prices:[.65,1.35,1.15,1.45,.9,1.1], description:'An old orbital freight depot above a rust-colored farming world. A place to find honest work, if you know who to ask.' },
  { id:'bellwether', name:'Bellwether', port:'Reedwater Exchange', x:38, y:22, color:'#6ebbae', sky:'#091a24', planet:['#266d73','#9fbca8','#34587a'], security:2, danger:.2, faction:'Free settlements', kind:'Ocean colonies', tagline:'Everything washes ashore eventually.', prices:[1.3,.72,1.4,1.15,.8,1.2], description:'A blue-green world of floating towns and stubborn colonists. The clinics need medicine; the farms need machinery.' },
  { id:'cinder', name:'Cinder', port:'Kiln Nine', x:57, y:55, color:'#efaf56', sky:'#20110c', planet:['#5d3932','#e2934d','#392c32'], security:1, danger:.4, faction:'Independent miners', kind:'Mining outposts', tagline:'Nobody gets rich digging someone else’s hole.', prices:[1.4,1.2,.55,.75,1.3,.95], description:'Mining rigs hang above a scarred volcanic world. Ore is cheap, food is dear, and the workers are getting restless.' },
  { id:'hush', name:'Hush', port:'Hush Relay', x:72, y:16, color:'#b498db', sky:'#160e29', planet:['#605179','#b59aaa','#302c55'], security:0, danger:.55, faction:'The unclaimed', kind:'Derelict fields', tagline:'Out here, the silence has teeth.', prices:[1.5,1.35,.85,1.6,1.25,.55], description:'A forgotten relay on the edge of a vast graveyard of ships. Valuable salvage. Unreliable company. No law.' },
  { id:'crown', name:'Crown', port:'Directorate Spire', x:85, y:68, color:'#88b9ed', sky:'#091529', planet:['#29446b','#a5c4d8','#54748a'], security:3, danger:.25, faction:'The Directorate', kind:'Inner-system industry', tagline:'Order has a price. So does looking away.', prices:[1.2,.9,1.2,.7,1.7,1.3], description:'Polished stations and well-paid patrols. Luxury goods sell high. Unlicensed cargo attracts unwanted attention.' },
  { id:'deadlight', name:'Deadlight', port:'Last Lantern', x:33, y:86, color:'#d07986', sky:'#240d19', planet:['#763d54','#cd796f','#35243c'], security:0, danger:.75, faction:'Outlaw clans', kind:'Border badlands', tagline:'If the beacon’s lit, somebody’s still alive.', prices:[1.1,1.7,.9,1.3,.65,1.5], description:'A station built from wrecks, old promises, and stolen fuel. Outlaws rule the approaches, but the market pays well.' },
  {id:'meridian',name:'Meridian',port:'Crossing House',x:60,y:85,color:'#82c4da',sky:'#10212b',planet:['#376b84','#b2d1d0','#24344d'],security:3,danger:.28,faction:'The Directorate',kind:'Interstellar trade junction',tagline:'Every ship passes. Every name is recorded.',prices:[1.25,.85,1.35,.7,1.45,1.7],description:'A customs gate beneath the rings of a gas giant. Vast passenger liners cross the lanes while inspectors audit the smaller ships.'},
  {id:'saffron',name:'Saffron',port:'Sunspoke Refinery',x:13,y:13,color:'#e2bd6f',sky:'#26180e',planet:['#a5783c','#ebd49b','#644140'],security:1,danger:.38,faction:'Free settlements',kind:'Fuel harvesters',tagline:'The sun gives. The company takes.',prices:[1.6,1.5,.75,.65,1.2,.95],description:'Collectors skim fuel from a golden giant. Refinery crews need replacement parts, relief supplies and someone willing to protect the night shift.'},
  {id:'vesper',name:'Vesper',port:'Quiet Observatory',x:90,y:39,color:'#a4aadf',sky:'#0f1129',planet:['#414979','#b3accb','#232f4b'],security:0,danger:.5,faction:'The unclaimed',kind:'Deep-field observatories',tagline:'Someone is still listening.',prices:[1.45,1.3,.95,1.55,.85,.6],description:'An abandoned listening array beyond the shipping lanes. Its scientists are recovering a signal from the lost relief convoy. Others would rather it stayed lost.'}
];
export const GOODS = [
  {id:'grain',name:'Hydroponic grain',base:45,icon:'◈',desc:'Food for worlds that cannot grow their own.'},
  {id:'medicine',name:'Medical supplies',base:125,icon:'✚',desc:'Sterile packs and antibiotics. Always needed somewhere.'},
  {id:'ore',name:'Raw titanium',base:65,icon:'⬡',desc:'Industrial ore from the outer belts.'},
  {id:'parts',name:'Machine parts',base:100,icon:'⚙',desc:'The difference between an old ship and a dead ship.'},
  {id:'luxury',name:'Distilled amber',base:175,icon:'◇',desc:'Expensive spirits for inexpensive morals.'},
  {id:'relics',name:'Unlicensed relics',base:240,icon:'✦',illegal:true,desc:'Pre-war tech. Directorate-controlled. Border-world favorite.'}
];
export const SHIPS = [
  {id:'rustwren',berths:3,name:'Rustwren',class:'Utility freighter',price:0,hold:30,hull:110,shield:90,speed:110,agility:1,desc:'She rattles. She leaks. She always brings you home.',color:'#bd9071'},
  {id:'kestrel',berths:2,name:'Nova',class:'Frontier fighter',price:6800,hold:22,hull:125,shield:115,speed:155,agility:1.45,desc:'Three engines, precise handling, and enough teeth for the frontier.',color:'#91b8bf'},
  {id:'longhaul',berths:6,name:'Mule',class:'Heavy hauler',price:9800,hold:75,hull:200,shield:135,speed:92,agility:.75,desc:'A flying warehouse with an attitude problem.',color:'#b1ac8a'},
  {id:'peregrine',berths:5,name:'Peregrine',class:'Independent corvette',price:18500,hold:50,hull:185,shield:185,speed:145,agility:1.2,desc:'Enough teeth to survive. Enough room to make a living.',color:'#a8b6c3'},
  {id:'vortex',berths:1,name:'Vortex Z3',class:'Courier scout',price:4200,hold:16,hull:85,shield:70,speed:185,agility:1.7,desc:'Small hold, light armor, and a drive that makes patrols work for it.',color:'#b9c9d1'},
  {id:'vanguard',berths:3,name:'Crimson Vanguard',class:'Heavy fighter',price:12500,hold:24,hull:155,shield:155,speed:160,agility:1.3,desc:'A reinforced gunship for captains who stay when everyone else runs.',color:'#bd776e'}
];
export const UPGRADES = [
  {id:'weapons',name:'Pulse cannons',desc:'+6 damage per shot per tier.',base:650,max:4,icon:'⌖'},
  {id:'shield',name:'Shield lattice',desc:'+30 shield capacity per tier.',base:550,max:4,icon:'⬡'},
  {id:'engine',name:'Drive tuning',desc:'+15 cruise speed per tier.',base:500,max:4,icon:'↗'},
  {id:'hold',name:'Cargo racks',desc:'+8 tonnes of space per tier.',base:450,max:4,icon:'▤'}
];
export const CREW = [
  {id:'iona',name:'Iona Reed',role:'Navigator',color:'#90c8c0',initial:'IR',cost:650,bonus:'Jump fuel −25%',quote:'“The shortest way is rarely the safest. I know both.”',bio:'Raised on the relay stations. Reads jump lanes like other people read weather.'},
  {id:'len',name:'Len Price',role:'Engineer',color:'#d6ad6f',initial:'LP',cost:900,bonus:'Hull repair in flight',quote:'“She’s not broken. She’s making a suggestion.”',bio:'A shipyard mechanic with an unpaid tab and a talent for coaxing dead engines back to life.'},
  {id:'doc',name:'Silas Finch',role:'Medic',color:'#a5a5cb',initial:'SF',cost:750,bonus:'Contract payouts +15%',quote:'“Try to bring the patient and the ship back in one piece.”',bio:'A former inner-world surgeon who walked away from a comfortable life. He does not discuss why.'},
  {id:'mara',name:'Mara Voss',role:'Gunner',color:'#cb8b7d',initial:'MV',home:'deadlight',rep:2,cost:1700,bonus:'Cannons +18% damage',quote:'“Pick the fight. Then finish it.”',bio:'A convoy gunner who remembers every ship she could not save.'},
  {id:'ves',name:'Ves Calder',role:'Broker',color:'#d7bf8e',initial:'VC',home:'meridian',rep:3,cost:1500,bonus:'Buy −8% / sell +8%',quote:'“A price is just the start of a conversation.”',bio:'A former customs negotiator with good contacts on both sides of the gate.'},
  {id:'rook',name:'Rook',role:'Signals specialist',color:'#a6a0d6',initial:'RK',home:'hush',rep:1,cost:1250,bonus:'Scan evasion +4 seconds',quote:'“Their sensors have a rhythm. So do their lies.”',bio:'An array technician who knows how to make a small ship sound like empty space.'},
  {id:'tess',name:'Tess Okoro',role:'Quartermaster',color:'#a5bd86',initial:'TO',home:'saffron',rep:2,cost:1400,bonus:'Cargo +10 tonnes',quote:'“There is room. You just packed it wrong.”',bio:'She ran supply lines through the embargo. Nothing aboard is ever misplaced twice.'},
  {id:'boone',name:'Boone Hale',role:'Pilot',color:'#8eb7ce',initial:'BH',home:'cinder',rep:4,cost:1900,bonus:'Agility +15% / boost fuel −20%',quote:'“The gap is bigger than the ship. Mostly.”',bio:'A former gate racer who lost a ship, a sponsor and his appetite for easy money.'},
  {id:'nia',name:'Nia Sol',role:'Liaison',color:'#cfa9b0',initial:'NS',home:'vesper',rep:5,cost:2200,bonus:'Legal payouts +10% / fines −25%',quote:'“We can get through this without leaving somebody behind.”',bio:'A relief organizer keeping a list of missing colonists. The convoy is personal to her.'}
];
export const STORY = [
  {title:'Something worth carrying',subtitle:'01 / A favor for Mercy',type:'rescue',dest:'bellwether',tons:4,count:1,reward:1100,contact:'Ada Mercer',text:'A clinic transport has lost its drive above Reedwater. Take four crates of antibiotics to the drifting ship. Hold close and transfer supplies before the raiders finish the job. The clinic pays over the radio.',cargo:'Clinic supplies'},
  {title:'A debt in iron',subtitle:'02 / Run the mining lanes',type:'escort',dest:'cinder',count:1,reward:1750,contact:'Iona Reed',text:'The scrubber parts are aboard a slow freight ship. Escort it through Kiln Nine’s mining belt to its jump beacon. Stay within 1 km, protect its hull, and clear the ambush. Payment when it gets away.'},
  {title:'Ghosts in the quiet',subtitle:'03 / Read the wrecks',type:'survey',dest:'hush',count:3,reward:2400,contact:'Len Price',text:'Three wrecks from a lost relief convoy still have working black boxes. Fly close, slow down, and scan each recorder. Raiders are listening for anyone who disturbs the graveyard.'},
  {title:'Paper shields',subtitle:'04 / Under their noses',type:'infiltrate',dest:'crown',tons:5,count:3,reward:3200,illegal:true,contact:'Silas Finch',text:'Follow two shadow-lane beacons around the patrol zone, then transfer the convoy evidence to a journalist’s shuttle. Avoid cargo scans. This handoff happens in open space.',cargo:'Sealed evidence'},
  {title:'The toll collector',subtitle:'05 / Hold the line',type:'defense',dest:'deadlight',count:3,reward:4200,contact:'Ada Mercer',text:'A relief carrier is trapped beyond Last Lantern. Destroy its three attackers while keeping the carrier alive. The colony pays when the blockade is broken.'},
  {title:'A ship of your own',subtitle:'06 / Bring them home',type:'escort',dest:'juniper',count:1,reward:5000,contact:'Your crew',text:'The survivors have one last leg to fly. Escort their relief ship through Juniper’s outer approach and deal with the waiting raiders. Get them home, clear your debt, and keep your ship.'}
];
export const SPACE_JOBS = ['rescue','escort','survey','infiltrate','defense','repair','intercept'];
export const JOB_LABELS = {courier:'FREIGHT',salvage:'SALVAGE',bounty:'BOUNTY',rescue:'RESCUE',escort:'ESCORT',survey:'BLACK BOX SURVEY',infiltrate:'COVERT HANDOFF',defense:'CARRIER DEFENSE',repair:'RELAY REPAIR',intercept:'TIMED INTERCEPT'};
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const systemById = id => SYSTEMS.find(s=>s.id===id) || SYSTEMS[0];
export const money = n => Math.floor(n).toLocaleString('en-US');
export function rng(seed) { let s=seed>>>0; return ()=> { s+=0x6D2B79F5; let t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
export function hash(text) { let h=2166136261; for(const c of text) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
export function freshState() {
  return {version:1,system:'juniper',credits:1400,ship:'rustwren',shipName:'Cinder',fuel:100,hull:110,shield:90,missiles:8,cargo:{},upgrades:{weapons:0,shield:0,engine:0,hold:0},crew:[],crewDuty:[],relationships:{},conversations:[],stationActions:[],factions:{settlements:0,directorate:0,freebooters:0},law:{reason:'Registry clean',inspections:0,cooling:0},narrative:{introSeen:false,briefed:[],choices:{}},missions:[],storyStage:0,storyDone:false,rep:0,heat:0,kills:0,salvaged:0,jumps:0,visits:{juniper:1},markets:{},completed:[],log:[{text:'Ada kept Cinder out of impound. The cooperative will clear her 14,800 cr repair lien if we bring the missing relief convoy home.',kind:'story'}],tutorial:true,time:0};
}
export const crewCapacity = s => (SHIPS.find(v=>v.id===s.ship)||SHIPS[0]).berths;
export const activeCrew = s => (Array.isArray(s.crewDuty)?s.crewDuty:s.crew).filter(id=>s.crew.includes(id)).slice(0,crewCapacity(s));
export const onDuty = (s,id) => activeCrew(s).includes(id);
export const bondTier = (s,id) => Math.min(2,Math.floor((s.relationships?.[id]||0)/3));
export const payoutRate = (s,m) => (onDuty(s,'doc')?1.15+bondTier(s,'doc')*.025:1)*(onDuty(s,'nia')&&!m.illegal?1.1:1)*(1+Math.min(.1,(s.factions?.[m.illegal?'freebooters':['bounty','intercept'].includes(m.type)?'directorate':'settlements']||0)*.01));
export const lienRemaining = s => Math.max(0,14800-Math.floor(14800*Math.min(STORY.length,s.storyStage)/STORY.length));
export function addHeat(s,amount,reason){s.heat=clamp(s.heat+amount,0,5);s.law??={inspections:0,cooling:0};s.law.reason=reason;s.law.cooling=0;addLog(s,reason,'law');}
export function stats(s) {
  const ship=SHIPS.find(v=>v.id===s.ship)||SHIPS[0];
  return {...ship,hold:ship.hold+s.upgrades.hold*8+(onDuty(s,'tess')?10:0),hull:ship.hull,shield:ship.shield+s.upgrades.shield*30,speed:ship.speed+s.upgrades.engine*15,agility:ship.agility*(onDuty(s,'boone')?1.15:1),damage:(12+s.upgrades.weapons*6)*(onDuty(s,'mara')?1.18+bondTier(s,'mara')*.02:1)};
}
export function cargoUsed(s) { return Object.values(s.cargo).reduce((a,b)=>a+b,0)+s.missions.reduce((a,m)=>a+(m.tons||0),0); }
export function freeHold(s) { return stats(s).hold-cargoUsed(s); }
export function market(s,id=s.system) {
  if(!s.markets[id]) {
    const sys=systemById(id), random=rng(hash(id+'-market'));
    s.markets[id]=GOODS.map((g,i)=>({id:g.id,buy:Math.round(g.base*sys.prices[i]*(.95+random()*.12)),stock:Math.floor(25+random()*50)}));
  }
  return s.markets[id];
}
export function prices(s,id=s.system) { return market(s,id).map(g=>({...g,buy:Math.round(g.buy*(onDuty(s,'ves')?.92:1)),sell:Math.max(1,Math.floor(g.buy*.88*(onDuty(s,'ves')?1.08:1)))})); }
export function trade(s,id,quantity,side) {
  if(!Number.isInteger(quantity)||quantity<=0||!['buy','sell'].includes(side)) return {ok:false,error:'Choose a valid amount.'};
  const item=prices(s).find(g=>g.id===id), stock=market(s).find(g=>g.id===id);
  if(!item||!stock) return {ok:false,error:'Unknown cargo.'};
  if(side==='buy') {
    if(stock.stock<quantity) return {ok:false,error:'The port does not have that much stock.'};
    if(freeHold(s)<quantity) return {ok:false,error:'Your cargo hold is full.'};
    if(s.credits<quantity*item.buy) return {ok:false,error:'Not enough credits.'};
    s.credits-=quantity*item.buy; s.cargo[id]=(s.cargo[id]||0)+quantity; stock.stock-=quantity;
  } else {
    if((s.cargo[id]||0)<quantity) return {ok:false,error:'You do not have that cargo.'};
    s.cargo[id]-=quantity; s.credits+=quantity*item.sell; stock.stock+=quantity;
    if(id==='relics') addHeat(s,.5,'Sale of controlled relics reported by a port informant.');
  }
  return {ok:true,total:quantity*(side==='buy'?item.buy:item.sell)};
}
export function jumpCost(s,destination) {
  const a=systemById(s.system),b=systemById(destination),distance=Math.hypot(a.x-b.x,a.y-b.y);
  return Math.ceil((7+distance*.1)*(onDuty(s,'iona')?.75-bondTier(s,'iona')*.025:1));
}
export function jump(s,destination) {
  if(!SYSTEMS.some(v=>v.id===destination)||destination===s.system) return {ok:false,error:'Choose another system.'};
  const cost=jumpCost(s,destination);
  if(s.fuel<cost) return {ok:false,error:'Not enough jump fuel. Refuel at a port.'};
  s.fuel-=cost;s.system=destination;s.jumps++;s.visits[destination]=(s.visits[destination]||0)+1;market(s,destination);
  return {ok:true,cost};
}
export function contracts(s) {
  const index=SYSTEMS.findIndex(v=>v.id===s.system), random=rng(hash(s.system+'-'+(s.visits[s.system]||1)));
  const destinations=SYSTEMS.filter(v=>v.id!==s.system);
  const activeIds=s.missions.map(m=>m.id), done=s.completed;
  const list=destinations.slice(0,3).map((d,i)=>({id:`job-${s.system}-${s.visits[s.system]||1}-${i}`,title:['The essentials','A quiet run','Keeping the lights on'][i],type:'courier',dest:d.id,tons:3+Math.floor(random()*5),reward:Math.round(550+jumpCost(s,d.id)*35+random()*350),contact:['Port dispatcher','Freight cooperative','Local broker'][i],cargo:['Colony supplies','Freight containers','Replacement parts'][i],text:`Deliver a sealed shipment to ${d.port} in ${d.name}. Payment on delivery.`,illegal:false}));
  list.push({id:`hunt-${s.system}-${s.visits[s.system]||1}`,title:'Clear the approach',type:'bounty',dest:s.system,count:2,reward:1100+index*180,contact:'Station watch',text:'Raiders are harassing incoming freighters. Destroy two pirate ships in this system, then return for payment.'});
  list.push({id:`scrap-${s.system}-${s.visits[s.system]||1}`,title:'One captain’s wreck',type:'salvage',dest:s.system,count:2,reward:750+index*90,contact:'Salvage union',text:'Recover two salvage caches in this system and return to the port. Make room in your hold first.'});
  const localTypes=[['rescue','repair'],['escort','rescue'],['repair','intercept'],['survey','repair'],['infiltrate','intercept'],['defense','rescue'],['intercept','escort'],['repair','defense'],['survey','infiltrate']][index];
  const briefs={repair:['Keep the beacon burning','Restart two power couplings and the relay core. Brake within 200 m and hold Repair. Raiders will notice when power comes back.'],intercept:['Before the gate closes','Intercept a raider courier before it escapes. Close within 1.2 km to start the 90-second pursuit, then destroy it before the jump.'],rescue:['A light still blinking','A disabled transport needs supplies. Approach within 180 m at less than 45 m/s and hold Transfer. Protect it from the raider.'],escort:['A promise to keep','Stay with a commercial transport through the outer lanes. Destroy its attackers and keep within 1 km until it reaches its beacon.'],survey:['What the dead remember','Scan three black boxes in the wreck field. Approach within 220 m at less than 55 m/s and hold Scan.'],infiltrate:['The quiet side of the law','Fly through two shadow-lane beacons, then transfer a sealed packet to a shuttle. Evade patrol scans.'],defense:['The last relief ship','A colony carrier is under attack. Destroy three raiders before they break its hull.']};
  for(const type of localTypes){const [title,text]=briefs[type];list.push({id:`${type}-${s.system}-${s.visits[s.system]||1}`,title,type,dest:s.system,count:['survey','infiltrate','defense','repair'].includes(type)?3:1,reward:1300+index*220,variant:Math.floor(random()*3),contact:'Outer Reach dispatch',text,illegal:type==='infiltrate'});}
  if(s.rep>=2||(s.factions?.freebooters||0)>=2) list.push({id:`illegal-${s.system}-${s.visits[s.system]||1}`,title:'No questions asked',type:'courier',dest:destinations[(index+2)%destinations.length].id,tons:5,reward:2200,choice:'discreet',illegal:true,contact:'A discreet client',cargo:'Unregistered tech',text:'Five unregistered crates. Good money. Bad paperwork. Patrol scans will find the false manifest.'});
  if(!s.storyDone&&!s.missions.some(m=>m.story)) list.unshift({...STORY[s.storyStage],id:'story-'+s.storyStage,story:true});
  return list.filter(m=>!activeIds.includes(m.id)&&!done.includes(m.id));
}
export function accept(s,id) {
  const m=contracts(s).find(c=>c.id===id);
  if(!m) return {ok:false,error:'This contract is no longer available.'};
  if(s.missions.length>=3) return {ok:false,error:'You can carry three active contracts.'};
  if((m.tons||0)>freeHold(s)) return {ok:false,error:'Make room for the contract cargo.'};
  s.missions.push({...m,progress:0});
  return {ok:true,mission:m};
}
export function progress(s,type,amount=1) {
  for(const m of s.missions) if(m.type===type&&m.dest===s.system) m.progress=Math.min(m.count||1,m.progress+amount);
}
export function ready(s,m) { return !m.failed&&s.system===m.dest&&(m.type==='courier'||m.progress>=m.count); }
export function deliver(s,id) {
  const i=s.missions.findIndex(m=>m.id===id),m=s.missions[i];
  if(!m||!ready(s,m)) return {ok:false,error:'The contract is not ready to settle at this port.'};
  const reward=Math.round(m.reward*payoutRate(s,m));
  s.credits+=reward;s.rep+=m.story?2:1;if(m.illegal)addHeat(s,1,'Unlicensed contract completed; Directorate registry flagged your transponder.');
  s.factions??={settlements:0,directorate:0,freebooters:0};const faction=m.illegal?'freebooters':m.type==='bounty'||m.type==='intercept'?'directorate':'settlements';s.factions[faction]=clamp((s.factions[faction]||0)+1,0,100);if(m.story)for(const id of activeCrew(s)){s.relationships??={};s.relationships[id]=Math.min(9,(s.relationships[id]||0)+1);}
  if(m.localRelief){s.narrative??={introSeen:true,briefed:[]};s.narrative.choices??={};s.narrative.choices[s.system]='aid';}
  s.completed.push(m.id);s.completed=s.completed.slice(-100);s.missions.splice(i,1);
  if(m.story){s.storyStage++;if(s.storyStage>=STORY.length){s.storyDone=true;s.rep+=5;}}
  addLog(s,`${m.title}: completed. ${money(reward)} credits earned.`,m.story?'story':'job');
  return {ok:true,reward,story:m.story,finished:s.storyDone};
}
export function abandon(s,id) {
  const i=s.missions.findIndex(m=>m.id===id);if(i<0)return {ok:false,error:'Contract not found.'};
  const m=s.missions[i];s.missions.splice(i,1);s.rep=Math.max(0,s.rep-1);
  // Story contracts remain available, so a full cargo hold can never lock the campaign.
  return {ok:true,story:!!m.story};
}
export function upgrade(s,id) {
  const spec=UPGRADES.find(v=>v.id===id);if(!spec)return {ok:false,error:'Unknown upgrade.'};
  const tier=s.upgrades[id],cost=spec.base*(tier+1);
  if(tier>=spec.max)return {ok:false,error:'Already at the highest tier.'};
  if(s.credits<cost)return {ok:false,error:'Not enough credits.'};
  s.credits-=cost;s.upgrades[id]++;if(id==='shield')s.shield+=30;
  return {ok:true,cost};
}
export function shipOffer(s,id){
  const ship=SHIPS.find(v=>v.id===id);if(!ship)return null;
  const old=SHIPS.find(v=>v.id===s.ship),cost=Math.max(0,ship.price-Math.floor((old?.price||0)*.55)),duty=activeCrew(s).slice(0,ship.berths),next={...s,ship:id,crewDuty:duty};
  return {ship,cost,duty,hold:stats(next).hold,standby:activeCrew(s).filter(id=>!duty.includes(id)),canCarry:stats(next).hold>=cargoUsed(s)};
}
export function buyShip(s,id) {
  const offer=shipOffer(s,id);if(!offer||s.ship===id)return {ok:false,error:'Choose a different ship.'};
  const {ship,cost,duty,canCarry}=offer;
  if(s.credits<cost)return {ok:false,error:'Not enough credits after trade-in.'};
  if(!canCarry)return {ok:false,error:'Unload cargo before switching to a smaller ship.'};
  s.credits-=cost;s.ship=id;s.crewDuty=duty;s.hull=ship.hull;s.shield=stats(s).shield;
  return {ok:true,cost,standby:offer.standby};
}
export function hire(s,id) {
  const crew=CREW.find(c=>c.id===id);if(!crew||s.crew.includes(id))return {ok:false,error:'Already aboard.'};
  if(crew.home&&crew.home!==s.system)return {ok:false,error:'Meet this crew member at '+systemById(crew.home).port+'.'};
  if(s.rep<(crew.rep||0))return {ok:false,error:'This specialist needs a more established captain.'};
  if(s.credits<crew.cost)return {ok:false,error:'Not enough credits.'};const duty=activeCrew(s);s.credits-=crew.cost;s.crew.push(id);if(duty.length<crewCapacity(s))duty.push(id);s.crewDuty=duty;s.relationships??={};s.relationships[id]=0;
  addLog(s,`${crew.name} joined your crew. ${crew.bonus}.`,'crew');return {ok:true};
}
export function service(s,type) {
  const ship=stats(s);let cost=0;
  if(type==='fuel'){cost=Math.ceil((100-s.fuel)*2);if(!cost)return {ok:false,error:'Fuel tank is full.'};}
  else if(type==='repair'){cost=Math.ceil((ship.hull-s.hull)*3);if(!cost)return {ok:false,error:'Hull is sound.'};}
  else if(type==='missiles'){cost=300;if(s.missiles>=30)return {ok:false,error:'Missile rack is full.'};}
  else return {ok:false,error:'Unknown service.'};
  if(s.credits<cost)return {ok:false,error:'Not enough credits.'};
  s.credits-=cost;if(type==='fuel')s.fuel=100;if(type==='repair'){s.hull=ship.hull;s.shield=ship.shield;}if(type==='missiles')s.missiles=Math.min(30,s.missiles+5);
  return {ok:true,cost};
}
export function hasIllegal(s) { return (s.cargo.relics||0)>0||s.missions.some(m=>m.illegal); }
export function fine(s) {
  const amount=Math.min(s.credits,Math.round((350+Math.round(s.heat*100))*(onDuty(s,'nia')?.75:1)));s.credits-=amount;s.cargo.relics=0;s.heat=Math.max(0,s.heat-1);
  s.law??={inspections:0,cooling:0};s.law.inspections=(s.law.inspections||0)+1;s.law.reason='Customs fine paid; controlled cargo confiscated.';
  const failed=s.missions.filter(m=>m.illegal);s.missions=s.missions.filter(m=>!m.illegal);
  return {amount,failed};
}
export function rescue(s) {
  const penalty=Math.min(800,Math.floor(s.credits*.15));s.credits-=penalty;
  for(const id of Object.keys(s.cargo))s.cargo[id]=Math.floor(s.cargo[id]/2);
  s.hull=Math.round(stats(s).hull*.7);s.shield=stats(s).shield;s.fuel=Math.max(30,s.fuel);s.heat=Math.max(0,s.heat-1);
  addLog(s,`A rescue tug brought Cinder in. Tow bill: ${money(penalty)} credits. Half of loose cargo lost.`,'event');
  return penalty;
}
export function addLog(s,text,kind='event') { s.log.unshift({text,kind});s.log=s.log.slice(0,40); }
export function saveState(s,storage=globalThis.localStorage) { try { storage.setItem(SAVE_KEY,JSON.stringify(s));return true; }catch{return false;} }
export function validateSave(input) {
  if(!input||input.version!==1||!SYSTEMS.some(s=>s.id===input.system)||!SHIPS.some(s=>s.id===input.ship))return null;
  const s={...freshState(),...input};
  const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
  for(const key of ['credits','fuel','hull','shield','missiles','rep','heat','kills','salvaged','jumps','storyStage','time'])if(!finite(s[key])||s[key]<0)return null;
  if(s.storyStage>STORY.length||!Number.isInteger(s.storyStage))return null;
  if(!s.cargo||typeof s.cargo!=='object'||Array.isArray(s.cargo))return null;
  for(const [key,value] of Object.entries(s.cargo))if(!GOODS.some(g=>g.id===key)||!Number.isInteger(value)||value<0)return null;
  if(!s.upgrades||UPGRADES.some(u=>!Number.isInteger(s.upgrades[u.id])||s.upgrades[u.id]<0||s.upgrades[u.id]>u.max))return null;
  if(!Array.isArray(s.crew)||s.crew.some(id=>!CREW.some(c=>c.id===id)))return null;
  if(!Array.isArray(s.missions)||s.missions.length>3)return null;
  for(const m of s.missions){if(!m||typeof m.id!=='string'||typeof m.title!=='string'||!['courier','salvage','bounty',...SPACE_JOBS].includes(m.type)||!SYSTEMS.some(sys=>sys.id===m.dest)||!finite(m.reward)||m.reward<0||!finite(m.progress)||m.progress<0)return null;if(m.tons!==undefined&&(!Number.isInteger(m.tons)||m.tons<0))return null;if(m.type==='courier'&&!Number.isInteger(m.tons))return null;if(m.type!=='courier'&&(!Number.isInteger(m.count)||m.count<1))return null;if(m.failed!==undefined&&typeof m.failed!=='boolean')return null;}
  s.crew=[...new Set(s.crew)];
  s.crewDuty=Array.isArray(input.crewDuty)?[...new Set(input.crewDuty)].filter(id=>s.crew.includes(id)).slice(0,crewCapacity(s)):s.crew.slice(0,crewCapacity(s));
  s.relationships=Object.fromEntries(s.crew.map(id=>[id,clamp(Math.floor(Number(input.relationships?.[id])||0),0,9)]));
  s.conversations=Array.isArray(input.conversations)?input.conversations.filter(v=>typeof v==='string').slice(-100):[];
  s.stationActions=Array.isArray(input.stationActions)?input.stationActions.filter(v=>typeof v==='string').slice(-100):[];
  s.factions=Object.fromEntries(['settlements','directorate','freebooters'].map(id=>[id,clamp(Math.floor(Number(input.factions?.[id])||0),0,100)]));
  s.law={reason:typeof input.law?.reason==='string'?input.law.reason.slice(0,160):s.heat?'Existing registry flag':'Registry clean',inspections:clamp(Math.floor(Number(input.law?.inspections)||0),0,10000),cooling:clamp(Number(input.law?.cooling)||0,0,180)};
  s.narrative={choices:Object.fromEntries(['saffron','meridian','vesper'].filter(id=>['aid','profit'].includes(input.narrative?.choices?.[id])).map(id=>[id,input.narrative.choices[id]])),introSeen:input.narrative?.introSeen!==false,briefed:Array.isArray(input.narrative?.briefed)?input.narrative.briefed.filter(v=>Number.isInteger(v)&&v>=0&&v<STORY.length):[]};
  s.fuel=clamp(s.fuel,0,100);s.hull=clamp(s.hull,0,stats(s).hull);s.shield=clamp(s.shield,0,stats(s).shield);s.missiles=clamp(Math.floor(s.missiles),0,30);s.heat=clamp(s.heat,0,5);
  s.visits=Object.fromEntries(SYSTEMS.map(sys=>[sys.id,Math.max(0,Math.floor(Number(s.visits?.[sys.id])||0))]));
  s.markets={}; // Prices come from the world; validated stock persists across reloads.
  for(const sys of SYSTEMS){const savedMarket=input.markets?.[sys.id];if(savedMarket!==undefined){if(!Array.isArray(savedMarket))return null;const canonical=market(s,sys.id);for(const item of canonical){const saved=savedMarket.find(v=>v?.id===item.id);if(saved){if(!Number.isInteger(saved.stock)||saved.stock<0||saved.stock>10000)return null;item.stock=saved.stock;}}}}
  s.completed=Array.isArray(s.completed)?s.completed.filter(v=>typeof v==='string').slice(-100):[];
  s.log=Array.isArray(s.log)?s.log.filter(v=>v&&typeof v.text==='string'&&typeof v.kind==='string').slice(0,40):[];
  s.shipName=String(s.shipName||'Cinder').slice(0,24);s.storyDone=s.storyStage>=STORY.length;
  if(cargoUsed(s)>stats(s).hold)return null;
  return s;
}
export function loadState(storage=globalThis.localStorage) { try{return validateSave(JSON.parse(storage.getItem(SAVE_KEY)));}catch{return null;} }
