import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const folder=new URL('../dist/models/',import.meta.url);
function readModel(name){
  const bytes=readFileSync(new URL(name,folder));
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const size=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+size)),binary=bytes.subarray(28+size);
  const attribute=index=>{
    const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],componentBytes={5126:4,5125:4,5123:2,5121:1}[a.componentType];
    const data=new DataView(binary.buffer,binary.byteOffset,binary.byteLength),values=new Float64Array(a.count*width),get={5126:'getFloat32',5125:'getUint32',5123:'getUint16',5121:'getUint8'}[a.componentType];
    for(let i=0;i<a.count;i++)for(let c=0;c<width;c++)values[i*width+c]=data[get]((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||componentBytes*width)+c*componentBytes,true);
    return values;
  };
  return {doc,attribute,bytes:bytes.length};
}
const roundEven=value=>{const lower=Math.floor(value);return value-lower===.5?(lower%2?lower+1:lower):Math.round(value);};
function shellBoundary(positions,indices,span){
  const ids=new Map(),coordinates=[],remap=[],quantum=Math.fround(span*1e-6);
  for(let i=0;i<positions.length;i+=3){
    // Match NumPy float32 measurement, while keeping the shipped geometry intact.
    const xyz=[0,1,2].map(c=>roundEven(Math.fround(positions[i+c]/quantum))),key=xyz.join(',');
    if(!ids.has(key)){ids.set(key,coordinates.length);coordinates.push(xyz);}remap.push(ids.get(key));
  }
  const edges=new Map();
  for(let i=0;i<indices.length;i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){
    const x=remap[indices[i+a]],y=remap[indices[i+b]],key=x<y?x+','+y:y+','+x;
    edges.set(key,(edges.get(key)||0)+1);
  }
  let count=0,length=0;
  for(const [key,uses]of edges)if(uses===1){const [a,b]=key.split(',').map(Number);count++;length+=Math.hypot(...coordinates[a].map((n,c)=>(n-coordinates[b][c])*1e-6));}
  return {count,length};
}

test('all supplied hulls retain opaque double-sided materials and valid complete triangle data',()=>{
  const files=readdirSync(folder).filter(name=>name.endsWith('.glb'));assert.equal(files.length,15);
  for(const name of files){
    const {doc,attribute}=readModel(name);
    for(const material of doc.materials){assert.equal(material.doubleSided,true,name+' must draw thin shell surfaces from both sides');assert.equal(material.alphaMode||'OPAQUE','OPAQUE',name+' must not accidentally become transparent');}
    for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
      const positions=attribute(primitive.attributes.POSITION),normals=attribute(primitive.attributes.NORMAL),uv=attribute(primitive.attributes.TEXCOORD_0),indices=attribute(primitive.indices);
      assert.equal(indices.length%3,0);assert.ok(indices.length>0);assert.equal(normals.length,positions.length);assert.equal(uv.length/2,positions.length/3);
      assert.ok(positions.every(Number.isFinite));assert.ok(normals.every(Number.isFinite));assert.ok(uv.every(Number.isFinite));
      assert.ok(indices.every(index=>Number.isInteger(index)&&index>=0&&index<positions.length/3),name+' contains an out-of-range triangle');
    }
  }
});

test('reduced fleet does not gain the shell cracks introduced by independent seam decimation',()=>{
  const manifest=JSON.parse(readFileSync(new URL('fleet-manifest.json',folder))),repaired=manifest.filter(entry=>entry.preparation==='meshoptimizer-1.2-attribute-aware');
  assert.equal(repaired.length,12);assert.ok(manifest.reduce((sum,entry)=>sum+entry.bytes,0)<40000000);
  for(const entry of repaired){
    const {doc,attribute,bytes}=readModel(entry.id+'.glb'),primitive=doc.meshes[0].primitives[0];
    assert.equal(bytes,entry.bytes);assert.equal(doc.extras.source_sha256,entry.source_sha256);assert.equal(entry.triangles,attribute(primitive.indices).length/3);
    assert.ok(entry.triangle_budget<=40000);assert.ok(entry.triangles<=entry.triangle_budget);assert.ok(entry.appearance_error>=0&&entry.appearance_error<=.01);
    const actual=shellBoundary(attribute(primitive.attributes.POSITION),attribute(primitive.indices),entry.geometry_weld_span);
    assert.equal(actual.count,entry.game_geometry.boundary_edges,entry.id+' topology no longer matches its audited output');
    assert.ok(Math.abs(actual.length-entry.game_geometry.boundary_length_normalized)<1e-8,entry.id+' changed open-boundary length');
    assert.ok(actual.length<=entry.source_geometry.boundary_length_normalized*1.05+.002,entry.id+' developed new gaps during reduction');
    if(entry.source_geometry.boundary_edges===0)assert.equal(actual.count,0,entry.id+' was closed in the supplied source');
  }
});
