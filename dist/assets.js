import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

export const HULL_ASSETS={rustwren:{id:'five-engine-hauler',length:20},kestrel:{id:'nova-fighter',length:13.5},longhaul:{id:'azure-voyager',length:26},peregrine:{id:'machine-frigate',length:23},vortex:{id:'vortex-z3',length:13},vanguard:{id:'crimson-vanguard',length:17}};
export const STATION_ASSETS={bellwether:'cristal-station',crown:'relay-station'};
export const ASSET_IDS=['relay-station','cristal-station','icebound-carrier','five-engine-hauler','spire-cruiser','scout','azure-voyager','crimson-vanguard','leviathan','machine-frigate','spirit-of-fire','mothership','frontier-transport','vortex-z3'];

export function normalizeAsset(scene,id){
  scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(scene),center=box.getCenter(new T.Vector3());scene.position.sub(center);
  const aligned=new T.Group();aligned.add(scene);
  const station=id.endsWith('station');aligned.rotation.y=station?0:id==='spire-cruiser'?Math.PI:-Math.PI/2;
  aligned.updateMatrixWorld(true);const size=new T.Box3().setFromObject(aligned).getSize(new T.Vector3());
  aligned.scale.setScalar(1/(station?Math.max(size.x,size.y,size.z):size.z));
  const root=new T.Group();root.add(aligned);root.userData.asset=id;root.updateMatrixWorld(true);
  root.userData.size=new T.Box3().setFromObject(root).getSize(new T.Vector3()).toArray();
  root.traverse(o=>{if(o.isMesh){o.geometry.userData.sharedAsset=true;for(const material of Array.isArray(o.material)?o.material:[o.material]){material.emissiveIntensity=.55;for(const value of Object.values(material))if(value?.isTexture)value.userData.sharedAsset=true;}}});
  return root;
}
export function assetInstance(template,length=1,enemy=false,glowTexture=null,powered=true){
  const root=template.clone(true);root.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
  const [width,height]=template.userData.size,engines=[],id=template.userData.asset;
  if(!id.endsWith('station')){
    const mounts=id==='five-engine-hauler'?[-.31,-.15,0,.15,.31]:[-.25,.25];
    for(const x of mounts){
      const radius=Math.max(.014,Math.min(.04,width*.05)),color=enemy?'#ff8c65':'#9beafa';
      const exhaust=new T.Mesh(new T.ConeGeometry(radius,.27,8,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.36,depthWrite:false,blending:T.AdditiveBlending}));exhaust.rotation.x=Math.PI/2;exhaust.position.set(x*width,-height*.08,.56);exhaust.visible=powered;root.add(exhaust);
      const flare=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color,transparent:true,opacity:powered?.7:0,depthWrite:false,blending:T.AdditiveBlending}));flare.position.set(x*width,-height*.08,.46);flare.scale.setScalar(radius*6);root.add(flare);engines.push({exhaust,flare,baseFlare:radius*6,powered});
    }
  }
  root.scale.setScalar(length);root.userData.engines=engines;root.userData.baseScale=root.scale.clone();root.userData.length=length;root.userData.assetId=id;root.userData.powered=powered;return root;
}

export class FleetAssets {
  constructor({mobile=false}={}){this.mobile=mobile;this.templates=new Map();this.status=new Map();this.pending=new Map();this.queue=[];this.active=0;}
  get(id){return this.templates.get(id);}
  request(id){
    if(this.templates.has(id))return Promise.resolve(this.templates.get(id));
    if(this.pending.has(id))return this.pending.get(id);
    if(!ASSET_IDS.includes(id))return Promise.resolve(null);
    const promise=new Promise(resolve=>this.queue.push({id,resolve}));this.pending.set(id,promise);this.status.set(id,'loading');this.pump();return promise;
  }
  pump(){
    while(this.active<2&&this.queue.length){const job=this.queue.shift();this.active++;this.load(job.id).then(template=>{if(template)this.templates.set(job.id,template);this.status.set(job.id,template?'ready':'error');job.resolve(template);}).finally(()=>{this.active--;this.pump();});}
  }
  async load(id){
    try{
      const gltf=await new GLTFLoader().loadAsync(new URL('./models/'+id+'.glb',import.meta.url).href);
      if(this.mobile){const seen=new Set();gltf.scene.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material])for(const texture of Object.values(material)){if(!texture?.isTexture||seen.has(texture)||!texture.image)continue;seen.add(texture);const image=texture.image;if(image.width>512||image.height>512){const c=document.createElement('canvas'),scale=512/Math.max(image.width,image.height);c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);c.getContext('2d').drawImage(image,0,0,c.width,c.height);texture.image=c;texture.needsUpdate=true;}}});}
      return normalizeAsset(gltf.scene,id);
    }catch(error){console.warn('Fleet asset unavailable:',id,error);return null;}
  }
}
