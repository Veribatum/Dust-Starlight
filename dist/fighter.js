import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

export function normalizeFighter(scene,length=13.5){
  scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene),center=bounds.getCenter(new T.Vector3());scene.position.sub(center);
  const aligned=new T.Group();aligned.add(scene);aligned.rotation.y=-Math.PI/2;aligned.updateMatrixWorld(true);const size=new T.Box3().setFromObject(aligned).getSize(new T.Vector3());aligned.scale.setScalar(length/size.z);
  const root=new T.Group();root.add(aligned);root.userData.asset='nova-fighter';root.updateMatrixWorld(true);
  root.traverse(o=>{if(o.isMesh){o.geometry.userData.sharedAsset=true;for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value?.isTexture)value.userData.sharedAsset=true;}});
  return root;
}
export async function loadFighter(){
  const gltf=await new GLTFLoader().loadAsync(new URL('./models/nova-fighter.glb',import.meta.url).href);return normalizeFighter(gltf.scene);
}
export function fighterInstance(template,enemy=false,glowTexture=null){
  const root=template.clone(true);root.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
  const color=enemy?'#ef8a65':'#8ee4f2',engines=[];
  for(const [x,z]of [[-1.9,6.05],[0,6.6],[1.9,6.05]]){
    const exhaust=new T.Mesh(new T.ConeGeometry(.48,4.0,10,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending}));exhaust.rotation.x=Math.PI/2;exhaust.position.set(x,-.95,z+2);root.add(exhaust);
    const flare=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));flare.position.set(x,-.95,z+.08);flare.scale.setScalar(2.1);root.add(flare);engines.push({exhaust,flare});
  }
  root.userData.engines=engines;root.userData.baseScale=root.scale.clone();root.userData.assetRole='fighter';root.userData.enemy=enemy;return root;
}
