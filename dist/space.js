import * as THREE from './vendor/three.module.js';
import { rng, hash, systemById, SHIPS, PORTS } from './world.js';
import {makeStation,makeCommercialShip} from './models.js';
import {loadFighter,fighterInstance} from './fighter.js';
import {FleetAssets,HULL_ASSETS,STATION_ASSETS,assetInstance} from './assets.js';

const hullMaterial = (color,roughness=.68) => new THREE.MeshStandardMaterial({color,roughness,metalness:.48});
const glowMaterial = color => new THREE.MeshBasicMaterial({color});
const V = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function part(group,geometry,material,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]) {
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...pos);mesh.rotation.set(...rot);mesh.scale.set(...scale);group.add(mesh);return mesh;
}
function box(group,size,mat,pos,rot) { return part(group,new THREE.BoxGeometry(...size),mat,pos,rot); }
function cylinder(group,radius,length,mat,pos,rot=[Math.PI/2,0,0]) { return part(group,new THREE.CylinderGeometry(radius,radius*.95,length,10),mat,pos,rot); }
function bevelBox(group,size,mat,pos,rot){
  const [w,h,d]=size,shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelThickness:.09,bevelSize:.09,bevelSegments:1,steps:1});geo.translate(0,0,-d/2);return part(group,geo,mat,pos,rot);
}
function wornSkin(seed){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),random=rng(hash(seed));ctx.fillStyle='#e0e2dc';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#bac0bb';ctx.lineWidth=1;
  for(let i=0;i<4;i++)ctx.strokeRect(i*64+3,3,58,250);
  for(let i=0;i<450;i++){ctx.fillStyle=i%4?'#c5ccc5':'#939d98';ctx.fillRect(random()*256,random()*256,1+random()*5,1);}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

// Bake fixed pieces by material: the detailed ships need only a handful of draw calls.
function mergeStatic(group){
  const batches=new Map(),source=group.children.filter(o=>o.isMesh&&!o.material.transparent);
  for(const mesh of source){
    mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);
    let batch=batches.get(mesh.material);if(!batch){batch={position:[],normal:[],uv:[]};batches.set(mesh.material,batch);}
    for(const name of ['position','normal','uv']){const attribute=geometry.getAttribute(name);if(attribute)for(let i=0;i<attribute.array.length;i++)batch[name].push(attribute.array[i]);else if(name==='uv')for(let i=0;i<geometry.getAttribute('position').count*2;i++)batch.uv.push(0);}
    geometry.dispose();group.remove(mesh);mesh.geometry.dispose();
  }
  for(const [material,batch]of batches){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.position,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normal,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));geometry.computeBoundingSphere();group.add(new THREE.Mesh(geometry,material));}
}

let glowTexture;
function getGlow() {
  if(glowTexture)return glowTexture;
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(150,229,255,.9)');g.addColorStop(.4,'rgba(75,190,255,.3)');g.addColorStop(1,'rgba(0,100,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  glowTexture=new THREE.CanvasTexture(c);return glowTexture;
}
function sprite(color,size,opacity=1) {
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:getGlow(),color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.set(size,size,size);return s;
}
export function makeShip(id='rustwren',enemy=false) {
  const spec=SHIPS.find(s=>s.id===id)||SHIPS[0],group=new THREE.Group();
  const tan=hullMaterial(enemy?'#5a4647':spec.color),dark=hullMaterial('#27353d'),brass=hullMaterial('#806c50'),panel=hullMaterial('#594c42');
  tan.map=wornSkin(id+(enemy?'raider':''));
  const cockpit=new THREE.MeshStandardMaterial({color:'#163d48',emissive:'#3b7580',emissiveIntensity:.7,metalness:.8,roughness:.2});
  const luminous=glowMaterial(enemy?'#f27553':'#83dbe7');
  const fighter=id==='kestrel'||enemy,heavy=id==='longhaul';
  const body=bevelBox(group,[fighter?2:3.2,1.5,6.2],tan,[0,0,.3]);body.rotation.x=.025;
  const nose=part(group,new THREE.ConeGeometry(fighter?1.5:1.9,3.1,4),tan,[0,0,-4.1],[-Math.PI/2,0,Math.PI/4]);nose.scale.y=.9;
  bevelBox(group,[1.8,.7,2.5],cockpit,[0,1.02,-2.4],[-.12,0,0]);
  box(group,[2.1,.12,.18],brass,[0,1.45,-1.1]);
  box(group,[.2,.16,2.65],tan,[0,1.43,-2.3]);
  const engines=[];
  for(const side of [-1,1]) {
    const wing=box(group,[fighter?4:4.9,.25,2.1],tan,[side*(fighter?2.3:3.1),-.15,1.1],[0,side*-.17,side*.08]);
    box(group,[fighter?.8:1.4,.75,3.8],dark,[side*(fighter?3.8:4.65),-.12,1.2]);
    cylinder(group,.8,3.8,tan,[side*(fighter?3.9:4.65),.1,2.0]);
    cylinder(group,.65,.8,dark,[side*(fighter?3.9:4.65),.1,4.25]);
    cylinder(group,.5,.15,luminous,[side*(fighter?3.9:4.65),.1,4.7]);
    const exhaust=part(group,new THREE.ConeGeometry(.52,4.8,10,1,true),new THREE.MeshBasicMaterial({color:enemy?'#e96545':'#61cce8',transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending}),[side*(fighter?3.9:4.65),.1,6.9],[Math.PI/2,0,0]);
    const flare=sprite(enemy?'#ff8064':'#7cdbfa',4.2,.7);flare.position.set(side*(fighter?3.9:4.65),.1,4.8);group.add(flare);engines.push({exhaust,flare});
    if(!fighter) {
      bevelBox(group,[1.75,1.6,4.0],panel,[side*2.1,-1.0,.45]);
      for(let i=0;i<3;i++)box(group,[1.82,.12,.12],brass,[side*2.1,-.2,-.8+i*1.1]);
    }
    box(group,[.18,.18,2.1],dark,[side*(fighter?1.15:1.65),-.4,-2.55]);
    cylinder(group,.1,.9,luminous,[side*(fighter?1.15:1.65),-.4,-3.9]);
    const fin=box(group,[.2,1.6,1.8],tan,[side*(fighter?3.9:4.65),1.1,2.55],[0,0,side*-.2]);
    for(let i=0;i<7;i++)box(group,[1.4,.08,.15],dark,[side*(fighter?3.9:4.65),.93,.3+i*.38]);
    for(let i=0;i<4;i++)cylinder(group,.065,2.4,brass,[side*(fighter?3.3:4.05),.2+i*.12,2.0]);
    part(group,new THREE.TorusGeometry(.69,.1,6,20),brass,[side*(fighter?3.9:4.65),.1,4.73]);
    box(group,[.45,.25,2.7],brass,[side*2.7,.17,1.1],[0,side*.17,0]);
    if(!fighter)for(let i=0;i<5;i++)box(group,[.12,.84,.35],dark,[side*3.01,-1,-.9+i*.7]);
    cylinder(group,.19,1.9,dark,[side*(fighter?1.15:1.65),-.42,-3.6]);
    part(group,new THREE.TorusGeometry(.22,.04,5,12),brass,[side*(fighter?1.15:1.65),-.42,-4.55]);
  }
  box(group,[1.8,.55,2.5],dark,[0,1.05,1.35]);
  for(let i=0;i<4;i++)box(group,[2.7,.09,.17],brass,[0,.81,.5+i*.6]);
  for(let i=0;i<8;i++)box(group,[.16,.25,1.8],brass,[-.7+i*.2,1.49,1.6]);
  cylinder(group,.07,2.1,dark,[.6,2.1,2],[0,0,.12]);part(group,new THREE.SphereGeometry(.15,8,6),luminous,[.73,3.15,2]);
  box(group,[.16,.85,2.3],tan,[-.5,1.98,1.8]);
  if(!enemy){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#d6c99a';ctx.fillRect(0,0,256,64);ctx.fillStyle='#283b41';ctx.font='bold 36px monospace';ctx.textAlign='center';ctx.fillText('CINDER / 04',128,45);const decal=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)});part(group,new THREE.PlaneGeometry(2.5,.63),decal,[3,.18,1.3],[-Math.PI/2,0,0]);}
  if(heavy){group.scale.set(1.35,1.25,1.55);box(group,[6,2.4,6],panel,[0,-1.8,.8]);}
  if(id==='peregrine'){box(group,[1,1.6,3.6],tan,[0,1.8,1]);group.scale.set(1.13,1.12,1.18);}
  group.userData.engines=engines;mergeStatic(group);group.userData.baseScale=group.scale.clone();return group;
}

const noiseGLSL=`
float h(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float r=0.;float a=.5;for(int i=0;i<5;i++){r+=n(p)*a;p=p*2.03+vec3(1.1,3.2,1.7);a*=.5;}return r;}
`;
function makePlanet(sys) {
  const p=new THREE.Group();
  const material=new THREE.ShaderMaterial({uniforms:{a:{value:new THREE.Color(sys.planet[0])},b:{value:new THREE.Color(sys.planet[1])},c:{value:new THREE.Color(sys.planet[2])},t:{value:0},seed:{value:hash(sys.id)%27},volcanic:{value:sys.id==='cinder'?1:0}},vertexShader:`varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=normalize(position);vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`,fragmentShader:`precision highp float;varying vec3 vP;varying vec3 vN;varying vec3 vV;uniform vec3 a;uniform vec3 b;uniform vec3 c;uniform float t;uniform float seed;uniform float volcanic;${noiseGLSL}void main(){float terrain=fbm(vP*6.+seed);float detail=fbm(vP*30.+seed);vec3 col=mix(a,b,smoothstep(.32,.66,terrain));col=mix(col,c,smoothstep(.56,.73,terrain)*.7);col*=.8+detail*.45;float clouds=smoothstep(.59,.76,fbm(vP*9.+vec3(seed,t*.002,0.)));col=mix(col,vec3(.78,.78,.74),clouds*.45);float sun=max(dot(vP,normalize(vec3(-.65,.5,.9))),0.);col*=.13+pow(sun,.6)*1.15;float edge=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),3.);col+=b*edge*.45;float crack=smoothstep(.67,.74,detail)*volcanic;col+=vec3(1.,.22,.035)*crack*.3;gl_FragColor=vec4(col,1.);}`});
  const planet=new THREE.Mesh(new THREE.SphereGeometry(2450,64,40),material);planet.rotation.z=.12;p.add(planet);
  const atmosphere=new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color(sys.color)}},vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vV=-p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 vN;varying vec3 vV;uniform vec3 color;void main(){float r=pow(1.-abs(dot(normalize(vN),normalize(vV))),4.);gl_FragColor=vec4(color,r*.32);}'});
  part(p,new THREE.SphereGeometry(2500,48,32),atmosphere);
  if(sys.id==='juniper'||sys.id==='crown'||sys.id==='deadlight') {
    const ringMat=new THREE.MeshBasicMaterial({color:sys.color,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false});
    const rings=new THREE.Group();rings.rotation.set(1.05,.15,-.23);
    for(let i=0;i<6;i++)part(rings,new THREE.RingGeometry(2850+i*80,2900+i*80,100),ringMat);
    p.add(rings);
  }
  p.position.set(2850,-1150,-6900);p.userData.surface=planet;p.userData.material=material;return p;
}

function disposeObject(object) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  object.traverse(o=>{if(o.geometry)geometries.add(o.geometry);const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(!m)continue;materials.add(m);if(m.map&&m.map!==glowTexture)textures.add(m.map);}});
  for(const g of geometries)if(!g.userData.sharedAsset)g.dispose();for(const m of materials)m.dispose();for(const t of textures)if(!t.userData.sharedAsset)t.dispose();
}

export class SpaceView {
  constructor(canvas,{quality='auto'}={}) {
    this.canvas=canvas;this.mobile=matchMedia('(pointer:coarse)').matches;this.quality=quality;this.width=1;this.height=1;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,this.mobile?1.3:1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#060b15');this.scene.fog=new THREE.FogExp2('#0a101d',.000014);
    const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const envCtx=envCanvas.getContext('2d');
    const envGradient=envCtx.createLinearGradient(0,0,0,256);envGradient.addColorStop(0,'#76929e');envGradient.addColorStop(.46,'#314d61');envGradient.addColorStop(1,'#06101c');envCtx.fillStyle=envGradient;envCtx.fillRect(0,0,512,256);
    const sunlight=envCtx.createRadialGradient(108,55,0,108,55,105);sunlight.addColorStop(0,'#fff0c7');sunlight.addColorStop(.3,'#bdb08f');sunlight.addColorStop(1,'#314d6100');envCtx.fillStyle=sunlight;envCtx.fillRect(0,0,512,256);
    const envTexture=new THREE.CanvasTexture(envCanvas);envTexture.mapping=THREE.EquirectangularReflectionMapping;envTexture.colorSpace=THREE.SRGBColorSpace;const envGenerator=new THREE.PMREMGenerator(this.renderer);this.environmentTarget=envGenerator.fromEquirectangular(envTexture);this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=.8;envTexture.dispose();envGenerator.dispose();
    this.camera=new THREE.PerspectiveCamera(66,1,.15,40000);this.camera.position.set(0,50,400);
    this.scene.add(new THREE.HemisphereLight('#a7cbd4','#3b2423',2.0));
    const sun=new THREE.DirectionalLight('#ffe0b5',3.0);sun.position.set(-500,900,600);this.scene.add(sun);
    const rim=new THREE.DirectionalLight('#6caabc',1.6);rim.position.set(800,200,-800);this.scene.add(rim);
    this.local=new THREE.Group();this.scene.add(this.local);this.entities=new Map();this.bulletMeshes=new Map();this.effects=[];this.player=makeShip();this.scene.add(this.player);this.assets=new FleetAssets({mobile:this.mobile});
    this.makeStars();this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);
    this.camTarget=V();this.desiredCamera=V();this.lookTarget=V();this.cameraUp=V(0,1,0);this.screen=V();
    this.setSystem('juniper');
    this.playerShipId='rustwren';this.inspection=false;this.fighterTemplate=null;this.fighterStatus='loading';this.fighterPromise=this.loadFighterAsset();
  }
  makeStars() {
    const random=rng(54896),coords=[],colors=[];
    for(let i=0;i<(this.mobile?1800:3400);i++){
      const theta=random()*Math.PI*2,z=random()*2-1,r=Math.sqrt(1-z*z),dist=13000+random()*7000;
      coords.push(r*Math.cos(theta)*dist,z*dist,r*Math.sin(theta)*dist);const c=new THREE.Color().setHSL(.08+random()*.58,.12,.55+random()*.4);colors.push(c.r,c.g,c.b);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    this.stars=new THREE.Points(geometry,new THREE.PointsMaterial({size:14,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.95,depthWrite:false,map:getGlow(),blending:THREE.AdditiveBlending}));this.scene.add(this.stars);
    this.nebula=new THREE.Mesh(new THREE.SphereGeometry(22000,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{a:{value:new THREE.Color('#12383e')},b:{value:new THREE.Color('#6a3635')}},vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`precision highp float;varying vec3 vP;uniform vec3 a;uniform vec3 b;${noiseGLSL}void main(){float clouds=fbm(vP*3.1+vec3(7.,2.,4.));float band=exp(-abs(vP.y+.27*vP.x+.15)*5.);vec3 col=mix(a,b,smoothstep(-.4,.6,vP.x));col*=pow(clouds,3.)*band*.6;gl_FragColor=vec4(vec3(.013,.018,.031)+col,1.);}`}));this.nebula.renderOrder=-2;this.scene.add(this.nebula);
  }
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.renderer.setSize(this.width,this.height,false);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();}
  setQuality(value){this.quality=value;this.renderer.setPixelRatio(value==='low'?1:value==='high'?Math.min(devicePixelRatio,2):Math.min(devicePixelRatio,this.mobile?1.3:1.75));this.resize();}
  setShip(id){
    this.scene.remove(this.player);disposeObject(this.player);this.playerShipId=id;const hull=HULL_ASSETS[id],template=hull&&this.assets.get(hull.id);
    this.player=id==='kestrel'&&this.fighterTemplate?fighterInstance(this.fighterTemplate,false,getGlow()):template?assetInstance(template,hull.length,false,getGlow()):makeShip(id);this.player.userData.length=hull?.length||14;this.scene.add(this.player);
    if(hull&&hull.id!=='nova-fighter'&&!template)this.assets.request(hull.id).then(asset=>{if(asset&&this.playerShipId===id)this.setShip(id);});
  }
  async loadFighterAsset(){
    try{
      this.fighterTemplate=await loadFighter();this.fighterStatus='ready';
      if(this.playerShipId==='kestrel')this.setShip('kestrel');
      for(const [id,old]of this.entities){if(old.userData.assetRole!=='fighter'||old.userData.assetId&&old.userData.assetId!=='nova-fighter')continue;const next=fighterInstance(this.fighterTemplate,old.userData.enemy,getGlow());next.position.copy(old.position);next.quaternion.copy(old.quaternion);next.scale.multiplyScalar(1.5);next.userData.assetId='nova-fighter';this.local.remove(old);disposeObject(old);this.local.add(next);this.entities.set(id,next);}
      return this.fighterTemplate;
    }catch(error){this.fighterStatus='error';console.warn('Nova fighter could not load:',error);return null;}
  }
  setSystem(id){
    disposeObject(this.local);this.local.clear();this.entities.clear();for(const m of this.bulletMeshes.values()){this.scene.remove(m);disposeObject(m);}this.bulletMeshes.clear();for(const e of this.effects){this.scene.remove(e.object);disposeObject(e.object);}this.effects=[];
    this.sys=systemById(id);this.planet=makePlanet(this.sys);this.local.add(this.planet);this.station=makeStation(this.sys);this.local.add(this.station);
    const stationAsset=STATION_ASSETS[id];if(stationAsset){const ready=this.assets.get(stationAsset);if(ready)this.installStation(ready);else this.assets.request(stationAsset).then(template=>{if(template&&this.sys.id===id)this.installStation(template);});}
    this.nebula.material.uniforms.b.value.set(this.sys.color).multiplyScalar(.55);
    const random=rng(hash(id)),rockGeometry=new THREE.IcosahedronGeometry(1,1),rockMat=hullMaterial('#62594f');
    const count=this.mobile?45:75,rocks=new THREE.InstancedMesh(rockGeometry,rockMat,count),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){
      const angle=random()*Math.PI*2,radius=1000+random()*2800,size=10+random()*45;
      dummy.position.set(Math.cos(angle)*radius,(random()-.5)*700,Math.sin(angle)*radius-900);dummy.scale.set(size*(.7+random()*.4),size*(.6+random()*.5),size);dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    }
    this.local.add(rocks);this.rocks=rocks;
    this.camera.position.set(-820,230,1350);this.cameraUp.set(0,1,0);
  }
  installStation(template){
    this.local.remove(this.station);disposeObject(this.station);
    const g=assetInstance(template,PORTS[this.sys.id].span),color=this.sys.color,front=PORTS[this.sys.id].dock[2];
    // Guidance hardware is outside the imported hull, along the safe approach.
    const ring=part(g,new THREE.TorusGeometry(66,2,8,48),glowMaterial(color),[0,0,0]);
    ring.scale.setScalar(1/PORTS[this.sys.id].span);ring.position.z=front/PORTS[this.sys.id].span;
    for(const z of [front+130,front+280])for(const x of [-85,85]){const beacon=sprite(color,16,.8);beacon.scale.divideScalar(PORTS[this.sys.id].span);beacon.position.set(x/PORTS[this.sys.id].span,-65/PORTS[this.sys.id].span,z/PORTS[this.sys.id].span);g.add(beacon);}
    g.userData.dockRing=ring;g.userData.rotating=[];g.userData.design=PORTS[this.sys.id].design;this.station=g;this.local.add(g);
  }
  entityMesh(e){
    let mesh;
    const asset=e.assetId&&this.assets.get(e.assetId);
    if(asset){mesh=assetInstance(asset,e.length||22,e.kind==='pirate',getGlow(),e.kind!=='beacon'&&e.phase!=='Distress signal');}
    else if(e.kind==='pirate'||e.kind==='patrol'||e.kind==='trader'||e.kind==='civilian'){
      mesh=e.kind==='trader'?makeCommercialShip(e.classId):this.fighterTemplate?fighterInstance(this.fighterTemplate,e.kind==='pirate',getGlow()):makeShip('kestrel',e.kind==='pirate');if(e.kind!=='trader'){mesh.scale.multiplyScalar(1.5);mesh.userData.assetRole='fighter';mesh.userData.enemy=e.kind==='pirate';}
      if(e.kind==='civilian'){disposeObject(mesh);mesh=makeCommercialShip('bulk');mesh.scale.multiplyScalar((e.length||100)/160);}
    }else if(e.kind==='beacon'&&!e.assetId){
      mesh=new THREE.Group();part(mesh,new THREE.TorusGeometry(35,1.5,6,36),glowMaterial('#b49fe5'));const beacon=sprite('#d0baff',12,.8);mesh.add(beacon);
    } else if(e.kind==='ore'){
      const geometry=new THREE.IcosahedronGeometry(e.radius,1),positions=geometry.attributes.position,random=rng(hash(e.id));
      for(let i=0;i<positions.count;i++){const scale=.82+random()*.32;positions.setXYZ(i,positions.getX(i)*scale,positions.getY(i)*scale,positions.getZ(i)*scale);}geometry.computeVertexNormals();
      mesh=new THREE.Group();part(mesh,geometry,hullMaterial('#716755'));const stripe=new THREE.MeshBasicMaterial({color:'#b5b8a2',wireframe:true,transparent:true,opacity:.06});part(mesh,geometry,stripe);
    }else{
      mesh=new THREE.Group();const mat=hullMaterial('#74726a'),dark=hullMaterial('#273f43');box(mesh,[6,4,7],mat);box(mesh,[6.1,.65,7.1],dark,[0,.7,0]);box(mesh,[6.1,.4,7.1],dark,[0,-1,0]);
      const beacon=sprite('#9fe1c5',12,.75);beacon.position.y=3;mesh.add(beacon);if(e.kind==='wreck')mesh.userData.salvageBeacon=beacon;box(mesh,[.7,.7,7.2],glowMaterial('#8dccb4'),[0,1.7,0]);
      if(e.kind==='wreck'){box(mesh,[12,1,3],dark,[5,-1,0],[.3,.2,.2]);cylinder(mesh,2,5,mat,[-5,0,-1],[.2,.3,Math.PI/3]);}
    }
    if(e.objective){const beacon=sprite('#e6c48d',e.assetId?20:10,.7);beacon.position.y=(e.length||30)*.16+8;mesh.add(beacon);mesh.userData.objectiveBeacon=beacon;}
    mesh.userData.assetId=e.assetId;this.local.add(mesh);this.entities.set(e.id,mesh);
    if(e.assetId&&e.assetId!=='nova-fighter'&&!asset)this.assets.request(e.assetId).then(template=>{const current=this.entities.get(e.id);if(!template||!current)return;this.local.remove(current);disposeObject(current);this.entities.delete(e.id);});
    return mesh;
  }
  syncEntities(entities,dt){
    const live=new Set();for(const e of entities){if(e.dead||e.hidden)continue;live.add(e.id);const mesh=this.entities.get(e.id)||this.entityMesh(e);mesh.position.copy(e.pos);if(e.quat)mesh.quaternion.copy(e.quat);else{mesh.rotation.y+=dt*.13;mesh.rotation.z+=dt*.03;}if(mesh.userData.objectiveBeacon)mesh.userData.objectiveBeacon.visible=!!e.objective&&!e.interactionComplete;if(mesh.userData.salvageBeacon)mesh.userData.salvageBeacon.visible=!e.interactionComplete;if(mesh.userData.engines)for(const en of mesh.userData.engines){en.exhaust.visible=en.powered!==false&&e.phase!=='Berthing';en.exhaust.scale.y=.75+Math.sin(performance.now()*.017)*.09;}}
    for(const [id,mesh] of this.entities)if(!live.has(id)){this.local.remove(mesh);disposeObject(mesh);this.entities.delete(id);}
  }
  syncBullets(bullets){
    const live=new Set();for(const b of bullets){if(b.dead)continue;live.add(b.id);let mesh=this.bulletMeshes.get(b.id);if(!mesh){const color=b.owner==='player'?'#b2f2df':'#fa8c65';mesh=new THREE.Group();const streak=part(mesh,new THREE.CylinderGeometry(b.missile?.24:.11,b.missile?.34:.11,b.missile?4:7,4),glowMaterial(color),[0,0,0],[Math.PI/2,0,0]);if(b.missile){const g=sprite('#ffbc79',3,.9);g.position.z=2.5;mesh.add(g);}this.scene.add(mesh);this.bulletMeshes.set(b.id,mesh);}mesh.position.copy(b.pos);mesh.quaternion.setFromUnitVectors(V(0,0,-1),b.vel.clone().normalize());}
    for(const [id,mesh] of this.bulletMeshes)if(!live.has(id)){this.scene.remove(mesh);disposeObject(mesh);this.bulletMeshes.delete(id);}
  }
  burst(pos,color='#f6b966',big=false){
    const object=new THREE.Group(),random=rng(Math.floor(performance.now()*100));
    for(let i=0;i<(big?24:7);i++){const p=sprite(color,big?12:3,.95);p.position.copy(pos);p.userData.velocity=V((random()-.5)*70,(random()-.5)*70,(random()-.5)*70);object.add(p);}
    this.scene.add(object);this.effects.push({object,life:big?1.4:.45,total:big?1.4:.45});
  }
  render(sim,mode,dt,time){
    this.planet.userData.material.uniforms.t.value=time;this.planet.userData.surface.rotation.y+=dt*.009;
    for(const rotor of this.station.userData.rotating||[])rotor.object.rotation.z+=dt*rotor.speed;
    this.station.userData.dockRing.material.color.set(this.sys.id==='crown'?'#95bded':'#76c6bf').multiplyScalar(.9+Math.sin(time)*.1);
    this.stars.position.copy(sim.pos);this.nebula.position.copy(sim.pos);
    if(mode==='flight'||mode==='departure'||mode==='jump'||mode==='dead'){
      this.player.scale.copy(this.player.userData.baseScale);this.player.position.copy(sim.pos);this.player.quaternion.copy(sim.quat);this.player.visible=mode!=='dead';
      const length=this.player.userData.length||14,back=V(0,length*.42,Math.max(21,length*1.8)+(sim.boosting?6:0)).applyQuaternion(sim.quat);this.desiredCamera.copy(sim.pos).add(back);
      this.camera.position.lerp(this.desiredCamera,1-Math.exp(-dt*7));const up=V(0,1,0).applyQuaternion(sim.quat);this.cameraUp.lerp(up,1-Math.exp(-dt*5));this.camera.up.copy(this.cameraUp);
      this.lookTarget.copy(sim.pos).add(V(0,2,-65).applyQuaternion(sim.quat));this.camera.lookAt(this.lookTarget);
      const desiredFov=sim.boosting?78:66;this.camera.fov+=(desiredFov-this.camera.fov)*Math.min(1,dt*3);this.camera.updateProjectionMatrix();
    }else{
      const portrait=this.width<this.height;
      this.player.visible=true;this.player.position.set(this.inspection?(portrait?-330:200):270,this.inspection?(portrait?430:80):95,this.inspection?(portrait?900:1140):900);this.player.scale.copy(this.player.userData.baseScale).multiplyScalar(this.inspection?(portrait?13:18):7);this.player.rotation.set(.08,this.inspection?time*.16:-.5+Math.sin(time*.07)*.12,-.04);
      this.desiredCamera.set(portrait?-740:-820,portrait?340:230,portrait?1850:1350);this.desiredCamera.x+=Math.sin(time*.05)*28;
      this.camera.position.lerp(this.desiredCamera,1-Math.exp(-dt*2));this.camera.up.set(0,1,0);this.camera.lookAt(portrait?V(0,90,60):V(90,70,150));this.camera.fov=61;this.camera.updateProjectionMatrix();
    }
    for(const e of this.player.userData.engines){e.exhaust.visible=mode==='flight'||mode==='departure'||mode==='jump';e.exhaust.scale.y=(sim.boosting?2.0:.5+sim.throttle*.6)+(Math.random()-.5)*.1;e.flare.material.opacity=mode==='flight'?.6+sim.throttle*.3:.35;e.flare.scale.setScalar(e.baseFlare?(sim.boosting?1.5:1)*e.baseFlare:sim.boosting?6:3.5);}
    this.syncEntities(sim.entities,dt);this.syncBullets(sim.bullets);
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;for(const particle of e.object.children){particle.position.addScaledVector(particle.userData.velocity,dt);particle.material.opacity=Math.max(0,e.life/e.total);}if(e.life<=0){this.scene.remove(e.object);disposeObject(e.object);this.effects.splice(i,1);}}
    if(sim.shake>0&&(mode==='flight'||mode==='jump')){this.camera.position.x+=(Math.random()-.5)*sim.shake;this.camera.position.y+=(Math.random()-.5)*sim.shake;}
    this.renderer.render(this.scene,this.camera);
  }
  project(pos){this.screen.copy(pos).project(this.camera);return {x:(this.screen.x*.5+.5)*this.width,y:(-this.screen.y*.5+.5)*this.height,z:this.screen.z};}
}
export { THREE, V };
