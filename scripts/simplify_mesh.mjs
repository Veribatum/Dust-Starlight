// Offline preparation only. meshoptimizer 1.2.0 is vendored with its MIT license.
import fs from 'node:fs';
import {MeshoptSimplifier} from './vendor/meshoptimizer/meshopt_simplifier.js';

const request=JSON.parse(fs.readFileSync(0,'utf8'));
const floats=path=>{const bytes=fs.readFileSync(path);return new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
const positions=floats(request.positions),normals=floats(request.normals),uv=floats(request.uv),indexBytes=fs.readFileSync(request.indices);
const indices=new Uint32Array(indexBytes.buffer.slice(indexBytes.byteOffset,indexBytes.byteOffset+indexBytes.byteLength));
const attributes=new Float32Array(positions.length/3*5);
for(let i=0;i<positions.length/3;i++){
  attributes.set(normals.subarray(i*3,i*3+3),i*5);
  attributes.set(uv.subarray(i*2,i*2+2),i*5+3);
}
await MeshoptSimplifier.ready;
// Shared-position seams collapse together. Border locks preserve actual holes;
// attribute weights protect the supplied normal field and texture coordinates.
// Reusing source vertices also rules out spikes and fabricated shell surfaces.
let [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attributes,5,[.2,.2,.2,1,1],null,request.triangles*3,.01,['LockBorder']);
let mode='strict-seams';
if(reduced.length>request.triangles*3){
  // Meshy can have many UV wedges meeting at a single point. Allowing a seam
  // collapse with the same weighted attribute-error cap avoids forcing those
  // junctions into holes. Texture/normal values still come from source vertices.
  [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attributes,5,[.2,.2,.2,1,1],null,request.triangles*3,.01,['LockBorder','Permissive']);
  mode='bounded-seam-relaxation';
}
fs.writeFileSync(request.output,new Uint8Array(reduced.buffer,reduced.byteOffset,reduced.byteLength));
process.stdout.write(JSON.stringify({error,triangles:reduced.length/3,mode}));
