import * as T from './vendor/three.module.js';
import {PORTS,rng,hash} from './world.js';
const metal=(color,roughness=.62)=>new T.MeshStandardMaterial({color,roughness,metalness:.65});
const glow=color=>new T.MeshBasicMaterial({color});
function mesh(g,geo,mat,p=[0,0,0],r=[0,0,0],s=[1,1,1]){const m=new T.Mesh(geo,mat);m.position.set(...p);m.rotation.set(...r);m.scale.set(...s);g.add(m);return m;}
const box=(g,s,m,p,r)=>mesh(g,new T.BoxGeometry(...s),m,p,r);
const tube=(g,r,l,m,p,rot=[Math.PI/2,0,0])=>mesh(g,new T.CylinderGeometry(r,r,l,12),m,p,rot);
const ring=(g,r,w,m,p,rot)=>mesh(g,new T.TorusGeometry(r,w,8,64),m,p,rot);
function bake(g){
  const batches=new Map();for(const o of [...g.children]){if(!o.isMesh||o.material.transparent)continue;o.updateMatrix();const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);let b=batches.get(o.material);if(!b){b={position:[],normal:[],uv:[]};batches.set(o.material,b);}for(const name of ['position','normal','uv']){const a=geo.getAttribute(name);if(a)for(const n of a.array)b[name].push(n);else if(name==='uv')for(let i=0;i<geo.getAttribute('position').count*2;i++)b.uv.push(0);}geo.dispose();o.geometry.dispose();g.remove(o);}
  for(const [mat,b]of batches){const geo=new T.BufferGeometry();for(const [name,values]of Object.entries(b))geo.setAttribute(name,new T.Float32BufferAttribute(values,name==='uv'?2:3));geo.computeBoundingSphere();g.add(new T.Mesh(geo,mat));}
}
export function makeStation(sys){
  const g=new T.Group(),steel=metal(sys.id==='crown'?'#c0c4c5':'#636c6c'),dark=metal('#26343d'),rust=metal('#927355'),trim=metal('#b9aa84'),solar=metal('#284555',.32),light=glow(sys.id==='deadlight'?'#e5a66d':sys.color),white=glow('#efd5a2');
  const rotating=[];
  function windows(p,columns=6,rows=2,spacing=12){for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)box(g,[3.5,2,1],(x+y)%4?light:white,[p[0]+x*spacing,p[1]+y*spacing,p[2]]);}
  function panels(x,y,z,w=120){box(g,[w,3,140],dark,[x,y,z]);for(let i=0;i<7;i++)box(g,[w-4,1,16],solar,[x,y+2,z-60+i*20]);}
  if(sys.id==='juniper'){
    const wheel=new T.Group();ring(wheel,285,19,steel);ring(wheel,283,2,light,[0,0,20]);ring(wheel,263,1,trim,[0,0,19]);
    for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a),y=Math.sin(a);box(wheel,[28,84,65],rust,[x*285,y*285,-8],[0,0,a-Math.PI/2]);box(wheel,[6,190,16],dark,[x*175,y*175,-25],[0,0,a-Math.PI/2]);box(wheel,[8,28,3],light,[x*285,y*285,27],[0,0,a-Math.PI/2]);box(wheel,[17,46,45],trim,[x*327,y*327,-10],[0,0,a-Math.PI/2]);}
    bake(wheel);g.add(wheel);rotating.push({object:wheel,speed:.008});tube(g,60,210,dark,[0,0,-20]);
    for(const side of [-1,1]){box(g,[300,12,25],steel,[side*235,70,-115]);panels(side*410,78,-115);box(g,[60,80,150],rust,[side*100,-75,-30]);windows([side*115,-47,47],4,3);}
  }else if(sys.id==='bellwether'){
    box(g,[670,34,55],steel,[0,0,-70]);
    for(const side of [-1,1]){const wheel=new T.Group();wheel.position.set(side*285,20,-70);ring(wheel,220,27,steel);ring(wheel,218,2,light,[0,0,28]);ring(wheel,192,3,dark,[0,0,29]);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;box(wheel,[35,53,68],trim,[Math.cos(a)*220,Math.sin(a)*220,-1],[0,0,a-Math.PI/2]);box(wheel,[5,130,14],dark,[Math.cos(a)*130,Math.sin(a)*130,-15],[0,0,a-Math.PI/2]);box(wheel,[12,8,2],light,[Math.cos(a)*220,Math.sin(a)*220,35],[0,0,a-Math.PI/2]);}bake(wheel);g.add(wheel);rotating.push({object:wheel,speed:side*.005});tube(g,55,140,dark,[side*285,20,-20]);panels(side*480,-180,-230,180);}
    box(g,[90,185,95],steel,[0,100,-60]);windows([-37,50,-10],7,8,12);
  }else if(sys.id==='cinder'){
    box(g,[510,62,150],rust,[0,-60,-90]);box(g,[140,120,270],steel,[0,20,-140]);
    for(const side of [-1,1]){box(g,[25,225,540],dark,[side*330,0,-160]);box(g,[310,17,29],steel,[side*195,112,-120]);box(g,[330,18,60],steel,[side*195,-112,-100]);
      for(let i=0;i<5;i++){box(g,[170,9,50],steel,[side*420,-40,-330+i*95]);box(g,[65,52,48],rust,[side*430,-9,-330+i*95]);box(g,[68,6,49],trim,[side*430,13,-330+i*95]);box(g,[26,90,22],dark,[side*310,110,-320+i*95]);box(g,[12,5,13],light,[side*310,155,-320+i*95]);}
      tube(g,40,180,dark,[side*170,65,-230]);for(let i=0;i<4;i++)ring(g,42,3,trim,[side*170,65,-305+i*50]);}
    windows([-47,55,8],8,4,13);box(g,[230,15,8],light,[0,-98,10]);
  }else if(sys.id==='hush'){
    box(g,[48,1040,45],dark,[0,20,-80]);box(g,[98,230,94],steel,[0,-70,-100]);
    for(let i=0;i<7;i++){const y=-420+i*135;box(g,[220,8,14],steel,[0,y,-85]);tube(g,6,140,rust,[0,y+70,-85],[0,0,.62]);box(g,[8,9,3],light,[29,y,-54]);}
    for(const side of [-1,1]){for(const y of [-220,190]){const dish=mesh(g,new T.ConeGeometry(125,34,32,1,true),new T.MeshStandardMaterial({color:'#829099',side:T.DoubleSide,metalness:.7,roughness:.5}),[side*160,y,-30],[Math.PI/2,0,side*.16]);tube(g,4,85,trim,[side*160,y,4]);mesh(g,new T.SphereGeometry(9,8,6),light,[side*160,y,49]);}panels(side*310,-20,-130,330);}
    tube(g,5,190,trim,[0,635,-80],[0,0,0]);ring(g,135,4,steel,[0,-250,-80],[Math.PI/2,0,0]);windows([-39,-130,-50],7,4);
  }else if(sys.id==='crown'){
    tube(g,70,860,steel,[0,240,-95],[0,0,0]);tube(g,115,110,dark,[0,-145,-95],[0,0,0]);
    for(const y of [-80,155,365]){ring(g,y===155?430:315,18,steel,[0,y,-95],[Math.PI/2,0,0]);ring(g,y===155?430:315,2,light,[0,y+17,-95],[Math.PI/2,0,0]);box(g,[810,12,23],dark,[0,y,-95]);box(g,[24,12,810],dark,[0,y,-95]);}
    const random=rng(900);for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=270+random()*130,h=150+random()*330;const x=Math.cos(a)*r,z=Math.sin(a)*r-95;box(g,[32,h,45],steel,[x,155+h/2,z]);box(g,[34,4,47],light,[x,155+h,z]);for(let j=0;j<7;j++)box(g,[17,3,2],light,[x,175+j*(h/8),z+24]);}
    box(g,[75,200,90],trim,[0,570,-95]);tube(g,5,190,light,[0,765,-95],[0,0,0]);
  }else if(sys.id==='meridian'){
    for(const side of [-1,1]){box(g,[75,950,140],steel,[side*570,70,-120]);box(g,[120,50,190],trim,[side*570,550,-120]);box(g,[1100,40,45],dark,[0,side*400,-150]);panels(side*720,80,-200,160);for(let i=0;i<14;i++)box(g,[45,5,3],light,[side*570,-320+i*60,-48]);}
    for(const y of [-360,360]){box(g,[1040,20,90],steel,[0,y,-120]);for(let i=0;i<16;i++)box(g,[30,4,4],light,[-470+i*62,y+12,-73]);}box(g,[150,190,120],trim,[0,-30,-170]);windows([-65,-80,-108],11,10,12);
  }else if(sys.id==='saffron'){
    tube(g,95,650,dark,[0,0,-110],[0,0,0]);for(const y of [-200,100,350]){ring(g,470,23,steel,[0,y,-110],[Math.PI/2,0,0]);ring(g,465,2,light,[0,y+20,-110],[Math.PI/2,0,0]);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,[100,70,75],rust,[Math.cos(a)*470,y,Math.sin(a)*470-110],[0,-a,0]);}}
    for(const side of [-1,1]){panels(side*580,-300,-140,230);box(g,[1100,15,30],steel,[0,-300,-140]);tube(g,36,240,trim,[side*180,300,-100],[0,0,0]);}windows([-70,-90,-12],12,5,12);
  }else if(sys.id==='vesper'){
    tube(g,58,550,steel,[0,0,-100],[0,0,0]);for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*430,y=Math.sin(a)*430;box(g,[9,400,12],dark,[x*.53,y*.53,-105],[0,0,a-Math.PI/2]);mesh(g,new T.ConeGeometry(125,50,24,1,true),new T.MeshStandardMaterial({color:'#7c829e',side:T.DoubleSide,metalness:.6,roughness:.4}),[x,y,-85],[Math.PI/2,0,a]);ring(g,128,3,trim,[x,y,-62]);tube(g,3,100,light,[x,y,-30]);}ring(g,170,9,steel,[0,0,-110]);box(g,[100,150,90],dark,[0,-20,-45]);windows([-36,-75,1],7,8,12);panels(0,-590,-130,180);
  }else{
    const random=rng(hash('deadlight-station'));mesh(g,new T.IcosahedronGeometry(170,2),metal('#645d57'),[0,0,-60],[.2,.1,.4],[1.3,.9,.8]);
    for(let i=0;i<30;i++){const a=random()*Math.PI*2,r=180+random()*140,x=Math.cos(a)*r,y=Math.sin(a)*r,z=-30-random()*100;box(g,[30+random()*55,35+random()*75,50+random()*120],i%3?rust:steel,[x,y,z],[random()*.4,random()*.5,a]);box(g,[4,100,9],dark,[x*.58,y*.58,z],[0,0,a-Math.PI/2]);box(g,[13,6,4],i%2?light:white,[x,y,z+75],[0,0,a]);}
    for(const side of [-1,1]){panels(side*360,70,-100,140);box(g,[230,8,12],dark,[side*250,70,-100],[0,0,side*.2]);tube(g,30,160,rust,[side*120,-150,-160]);}
    box(g,[180,25,40],trim,[0,185,60]);windows([-60,187,81],8,1,16);
  }
  // The small-ship throat stays separate from the rotating/industrial structures.
  tube(g,66,190,dark,[0,0,235]);tube(g,61,40,steel,[0,0,348]);
  const dockRing=ring(g,64,2,light,[0,0,370]);ring(g,59,1,white,[0,0,371]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,[6,16,9],white,[Math.cos(a)*65,Math.sin(a)*65,374],[0,0,a]);}
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#15232c';ctx.fillRect(0,0,1024,256);ctx.strokeStyle=sys.color;ctx.lineWidth=6;ctx.strokeRect(5,5,1014,246);ctx.textAlign='center';ctx.fillStyle='#e7e7d6';ctx.font='600 61px monospace';ctx.fillText(sys.port.toUpperCase(),512,115);ctx.fillStyle=sys.color;ctx.font='28px monospace';ctx.fillText(PORTS[sys.id].design.toUpperCase()+' / APPROACH 04',512,184);
  mesh(g,new T.PlaneGeometry(168,42),new T.MeshBasicMaterial({map:new T.CanvasTexture(c)}),[0,98,322]);
  g.userData.dockRing=dockRing;g.userData.rotating=rotating;g.userData.design=PORTS[sys.id].design;bake(g);return g;
}

export function makeCommercialShip(kind='bulk'){
  const g=new T.Group(),steel=metal(kind==='liner'?'#b1bcc4':'#7b8279'),dark=metal('#28383e'),paint=metal(kind==='liner'?'#385c7a':'#966c49'),cargo=metal('#806d50'),lights=glow('#cde4d9'),engineMat=glow('#83cee0');
  if(kind==='shuttle'){box(g,[7,4,17],steel,[0,0,0]);mesh(g,new T.ConeGeometry(5,9,4),paint,[0,0,-11],[-Math.PI/2,0,Math.PI/4]);box(g,[21,.7,5],paint,[0,-1,4]);box(g,[4,2,6],dark,[0,3,-5]);box(g,[3,.4,4],lights,[0,4.1,-5]);}
  else if(kind==='bulk'){
    box(g,[14,12,145],dark,[0,0,0]);box(g,[22,17,25],steel,[0,4,-79]);box(g,[15,3,4],lights,[0,11,-93]);
    for(const side of [-1,1])for(let i=0;i<6;i++)for(let level=0;level<2;level++){box(g,[20,12,18],i%3?cargo:paint,[side*18,-3+level*15,-51+i*21]);for(let rail=0;rail<3;rail++)box(g,[20.5,.9,1],steel,[side*18,-3+level*15-3+rail*3,-51+i*21]);}
    box(g,[67,9,18],steel,[0,3,66]);box(g,[12,26,10],paint,[0,16,43]);
  }else if(kind==='tanker'){
    box(g,[13,10,122],dark);for(const side of [-1,1]){tube(g,13,110,steel,[side*18,0,0]);for(const z of [-55,55])mesh(g,new T.SphereGeometry(13,16,10),steel,[side*18,0,z],[0,0,0],[1,1,.6]);for(let j=0;j<6;j++)ring(g,13.3,1.2,paint,[side*18,0,-48+j*19]);}box(g,[24,17,22],paint,[0,3,-72]);box(g,[12,3,2],lights,[0,9,-84]);box(g,[66,12,14],dark,[0,0,70]);
  }else{
    tube(g,15,170,steel,[0,0,0]);box(g,[37,10,140],steel,[0,12,-3]);box(g,[13,11,150],paint,[0,23,-6]);
    for(const side of [-1,1]){box(g,[9,12,110],paint,[side*24,-1,25]);for(let i=0;i<18;i++)box(g,[1,2,3],lights,[side*18,12,-65+i*8]);box(g,[65,1.2,13],dark,[side*20,-9,54],[0,side*.23,0]);}box(g,[16,6,23],dark,[0,19,-75]);box(g,[12,2,2],lights,[0,21,-88]);
  }
  const scale=kind==='shuttle'?1:kind==='liner'?1.22:1,engineX=kind==='shuttle'?8:25,engineZ=kind==='shuttle'?10:kind==='liner'?88:79,radius=kind==='shuttle'?1.6:6;
  const engines=[];for(const side of [-1,1]){tube(g,radius,radius*2.8,dark,[side*engineX,0,engineZ-8]);tube(g,radius*.8,1,engineMat,[side*engineX,0,engineZ+radius]);const exhaust=mesh(g,new T.ConeGeometry(radius*.7,radius*6,10,1,true),new T.MeshBasicMaterial({color:'#6ec7e0',transparent:true,opacity:.38,blending:T.AdditiveBlending,depthWrite:false}),[side*engineX,0,engineZ+radius*3.8],[Math.PI/2,0,0]);engines.push({exhaust});box(g,[1.5,1.5,1.5],glow(side===1?'#90d9a6':'#e5a49a'),[side*(engineX+radius),2,engineZ-15]);}
  g.userData.engines=engines;g.scale.setScalar(scale);bake(g);return g;
}
