import * as T from './vendor/three.module.js';
import {introFrame} from './life.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const metal=(color)=>new T.MeshStandardMaterial({color,metalness:.55,roughness:.62});
const glow=color=>new T.MeshBasicMaterial({color});
function box(g,size,mat,p){const m=new T.Mesh(new T.BoxGeometry(...size),mat);m.position.set(...p);g.add(m);return m;}
function sign(g,text,p,size=[28,4]){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#14242a';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#e7bf7d';ctx.font='bold 54px monospace';ctx.textAlign='center';ctx.fillText(text,512,84);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(...size),new T.MeshBasicMaterial({map:tex}));m.position.set(...p);g.add(m);return m;}
export function createHangar(){
 const g=new T.Group(),deck=metal('#263740'),wall=metal('#31414a'),beam=metal('#5a5e59'),rust=metal('#806447'),dark=metal('#14222c'),warm=glow('#f1c584'),cool=glow('#86d4dc');
 box(g,[150,2,190],deck,[0,-11,0]);box(g,[3,70,190],wall,[-75,22,0]);box(g,[3,70,190],wall,[75,22,0]);box(g,[150,3,190],dark,[0,57,0]);box(g,[150,68,3],wall,[0,22,95]);
 for(let i=0;i<8;i++){const z=-78+i*23;for(const x of [-72,72]){box(g,[3,65,3],beam,[x,22,z]);box(g,[1,30,2],warm,[x,24,z+1]);}box(g,[146,3,3],beam,[0,54,z]);box(g,[30,.4,2],cool,[0,51,z]);for(const x of [-26,26])box(g,[.6,.08,17],warm,[x,-9.94,z]);}
 for(let i=0;i<12;i++)box(g,[136,.06,.22],beam,[0,-9.94,-85+i*15]);for(let i=0;i<10;i++){box(g,[2.1,.1,8],warm,[-32+i*7,-9.9,-38]);box(g,[2.1,.1,8],warm,[-32+i*7,-9.9,39]);}
 const gantry=new T.Group();box(gantry,[135,4,8],rust,[0,43,0]);box(gantry,[9,6,12],dark,[12,38,0]);box(gantry,[.2,15,.2],beam,[12,27,0]);box(gantry,[4,1,3],rust,[12,19,0]);g.add(gantry);
 for(let i=0;i<12;i++){const x=i%2?56:-58,z=-52+Math.floor(i/2)*24,w=5+i%3;box(g,[w,4+i%2*3,7],i%3?rust:beam,[x,-7,z]);box(g,[w+.1,.35,7.1],warm,[x,-5+i%2*1.5,z]);}
 box(g,[29,12,8],dark,[-44,-4,83]);for(let i=0;i<4;i++)box(g,[4,3,.2],cool,[-53+i*6,-1,78.8]);
 for(const x of [-53,53]){const rail=new T.Mesh(new T.CylinderGeometry(1,1,130,8),rust);rail.rotation.x=Math.PI/2;rail.position.set(x,2,0);g.add(rail);for(let i=0;i<5;i++)box(g,[2,10,2],beam,[x,-4,-55+i*27]);}
 const cart=new T.Group();box(cart,[5,2.4,8],rust,[0,0,0]);box(cart,[4,2,3],dark,[0,2,2]);box(cart,[4,.3,.3],warm,[0,.3,-4.1]);for(const x of [-2.6,2.6])for(const z of [-2.5,2.5])box(cart,[1,1.6,1.8],dark,[x,-1,z]);g.add(cart);
 const amber=new T.PointLight('#ffc284',420,110,2);amber.position.set(-30,25,15);g.add(amber);const blue=new T.PointLight('#7dcada',320,120,2);blue.position.set(36,24,-25);g.add(blue);
 sign(g,'INDEPENDENT / BERTH 04',[0,25,93.3],[60,7]);sign(g,'MIND THE GANTRY',[-47,12,93.2],[24,3]);sign(g,'04',[-72,32,-80],[8,8]).rotation.y=Math.PI/2;
 g.userData.cart=cart;g.userData.gantry=gantry;return g;
}
export function updateHangar(g,time){g.userData.cart.position.set(-44,-7,-34+Math.sin(time*.07)*28);g.userData.cart.rotation.y=Math.cos(time*.07)>0?0:Math.PI;g.userData.gantry.position.z=Math.sin(time*.045)*25;}
export function updateIntro(stage,player,camera,time,width,height,reduced=false){
 const f=introFrame(time),t=reduced?.5:f.progress,portrait=width<height;
 stage.carrier.position.set(-70+t*25,0,-90);stage.carrier.rotation.y=-.22;stage.clinic.position.set(120,25,80);stage.clinic.rotation.set(.14,.3,-.18);stage.patrol.position.set(-35+t*190,50,120-t*60);stage.patrol.rotation.y=1.8;
 stage.carrier.visible=f.index<3;stage.clinic.visible=f.index<3;stage.patrol.visible=f.index===1||f.index===2;
 if(f.index===0){camera.position.set(-490+t*70,150,540);camera.lookAt(-50,0,-90);player.visible=false;}
 else if(f.index===1){camera.position.set(290-t*65,110,380);camera.lookAt(-45,5,-90);player.visible=false;}
 else if(f.index===2){camera.position.set(155+t*28,60,portrait?300:220);camera.lookAt(112,24,75);player.visible=false;}
 else{player.visible=true;player.position.set(0,0,0);player.rotation.set(0,-.35,0);player.scale.copy(player.userData.baseScale);camera.position.set(45-t*10,20,portrait?72:53);camera.lookAt(0,-2,0);}
 camera.up.set(0,1,0);camera.fov=portrait?62:52;camera.updateProjectionMatrix();return f;
}
export function frameHangar(camera,length,width,height,home,dt){const portrait=width<height,desired=V(length*2,length*.85,portrait?length*3.8:length*2.8);camera.position.lerp(desired,1-Math.exp(-dt*3));camera.up.set(0,1,0);camera.lookAt(home?(portrait?V(0,-length*1.25,0):V(length*.95,-2,0)):V(0,-1,0));camera.fov=54;camera.updateProjectionMatrix();}
