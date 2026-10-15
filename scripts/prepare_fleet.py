"""Make streamed, texture-preserving game copies of the supplied Meshy fleet.

Requires numpy, Pillow and Node.js. Source uploads are never modified. The
vendored meshoptimizer 1.2 simplifier respects shell boundaries and keeps source
positions, normals and UVs. Complex seam junctions use bounded attribute-aware
relaxation only if strict seams cannot meet the budget. It never invents surfaces.
"""
import argparse, hashlib, json, struct, subprocess, tempfile
from concurrent.futures import ProcessPoolExecutor
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

FILES = {
    'relay-station': 'Meshy_AI_interstellar_space_st_1013233859_texture.glb',
    'cristal-station': 'Meshy_AI_Space_Station_Cristal_1013233654_texture.glb',
    'icebound-carrier': 'Icebound_Carrier.glb',
    'five-engine-hauler': 'long_hulled_5_engine.glb',
    'spire-cruiser': 'Meshy_AI__0928010253_texture.glb',
    'scout': 'Meshy_AI_A_standalone_sleek_sc_0928010608_texture.glb',
    'azure-voyager': 'Meshy_AI_Azure_Voyager_0928010427_texture.glb',
    'crimson-vanguard': 'Meshy_AI_Crimson_Vanguard_0928004443_texture.glb',
    'leviathan': 'Meshy_AI_Leviathan_of_the_Void_0928004611_texture.glb',
    'machine-frigate': 'Meshy_AI_machine_frigate_0928011610_texture.glb',
    'spirit-of-fire': 'Meshy_AI_Spirit_of_Fire_0928003231_texture.glb',
    'mothership': 'Meshy_AI_Ultra_realistic_mothe_0928005956_texture.glb',
    'frontier-transport': 'Meshy_AI_Using_the_supplied_im_0927155333_texture.glb',
    'vortex-z3': 'Meshy_AI_Vortex_Z3_0928011344_texture.glb',
}
DTYPES = {5126:'<f4', 5125:'<u4', 5123:'<u2', 5121:'u1'}
WIDTHS = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}
TRIANGLE_BUDGETS = {'icebound-carrier':40000,'leviathan':40000,'mothership':40000,
                    'spire-cruiser':40000,'five-engine-hauler':30000,
                    'scout':22000,'azure-voyager':25000,'crimson-vanguard':25000,
                    'machine-frigate':24000,'spirit-of-fire':26000,
                    'frontier-transport':25000,'vortex-z3':25000}

def read_glb(path):
    raw = Path(path).read_bytes()
    magic, version, total = struct.unpack_from('<4sII', raw)
    assert magic == b'glTF' and version == 2 and total == len(raw)
    n = struct.unpack_from('<I', raw, 12)[0]
    return raw, json.loads(raw[20:20+n]), raw[28+n:]

def attribute(doc, binary, index):
    a = doc['accessors'][index]; v = doc['bufferViews'][a['bufferView']]
    dtype = np.dtype(DTYPES[a['componentType']]); width = WIDTHS[a['type']]
    stride = v.get('byteStride', dtype.itemsize*width)
    return np.ndarray((a['count'],width), dtype=dtype, buffer=binary,
                      offset=v.get('byteOffset',0)+a.get('byteOffset',0),
                      strides=(stride,dtype.itemsize)).copy()

def geometry_audit(points, faces, span=None):
    span = float(np.ptp(points,axis=0).max()) if span is None else span
    # Merge coincident UV-seam positions for measurement only, never for output.
    positions, remap = np.unique(np.rint(points/(span*1e-6)).astype(np.int64),axis=0,return_inverse=True)
    welded = remap[faces]
    edges = np.concatenate([welded[:,[0,1]],welded[:,[1,2]],welded[:,[2,0]]]); edges.sort(axis=1)
    edges, counts = np.unique(edges,axis=0,return_counts=True)
    boundary = edges[counts==1]
    length = float(np.linalg.norm((positions[boundary[:,0]]-positions[boundary[:,1]])*1e-6,axis=1).sum())
    return {'boundary_edges':int(len(boundary)), 'boundary_length_normalized':length,
            'nonmanifold_edges':int((counts>2).sum())}

def reduce_mesh(points, normals, uv, faces, limit):
    if len(faces) <= limit: return points, normals, uv, faces, 0, 'unchanged'
    with tempfile.TemporaryDirectory(prefix='dust-fleet-') as temporary:
        directory = Path(temporary)
        request = {'triangles':limit,'output':str(directory/'reduced.bin')}
        for key, data in [('positions',points),('normals',normals),('uv',uv),('indices',faces.astype('<u4'))]:
            target = directory/(key+'.bin'); target.write_bytes(data.tobytes()); request[key]=str(target)
        result = subprocess.run(['node',str(Path(__file__).with_name('simplify_mesh.mjs'))],
                                input=json.dumps(request),capture_output=True,text=True,check=True)
        details = json.loads(result.stdout)
        reduced = np.fromfile(request['output'],dtype='<u4').reshape(-1,3)
    # All output attributes come verbatim from the same source vertex. Compact
    # storage without independently welding or distorting texture seams.
    vertices, remap = np.unique(reduced,return_inverse=True)
    return points[vertices],normals[vertices],uv[vertices],remap.reshape(-1,3).astype('<u4'),details['error'],details['mode']

def prepare(task):
    key, name, source, destination = task
    path = Path(source)/name; raw, doc, binary = read_glb(path)
    assert len(doc['meshes']) == 1 and len(doc['meshes'][0]['primitives']) == 1
    primitive = doc['meshes'][0]['primitives'][0]
    p = attribute(doc,binary,primitive['attributes']['POSITION'])
    n = attribute(doc,binary,primitive['attributes']['NORMAL'])
    uv = attribute(doc,binary,primitive['attributes']['TEXCOORD_0'])
    f = attribute(doc,binary,primitive['indices']).reshape(-1,3)
    original_triangles = len(f)
    original_bounds = {'min':p.min(axis=0).tolist(),'max':p.max(axis=0).tolist()}
    span = float(np.ptp(p,axis=0).max()); original_geometry = geometry_audit(p,f,span)
    limit = TRIANGLE_BUDGETS.get(key,20000)
    p,n,uv,f,error,mode = reduce_mesh(p,n,uv,f,limit)
    game_geometry = geometry_audit(p,f,span)
    assert game_geometry['boundary_length_normalized'] <= original_geometry['boundary_length_normalized']*1.05+.002, key+' developed new shell cracks'
    assert len(f)<=limit, key+' cannot meet its safe geometry budget; review this asset instead of forcing reduction'
    assert np.isfinite(p).all() and np.isfinite(n).all() and np.isfinite(uv).all()
    tolerance=(np.array(original_bounds['max'])-np.array(original_bounds['min'])).max()*.0005
    assert (p>=np.array(original_bounds['min'])-tolerance).all() and (p<=np.array(original_bounds['max'])+tolerance).all(), key+' shape exceeded source bounds'
    blob = bytearray(); views = []; accessors = []
    def put(data, target=None):
        blob.extend(b'\0'*((-len(blob))%4)); view={'buffer':0,'byteOffset':len(blob),'byteLength':len(data)}
        if target: view['target']=target
        views.append(view); blob.extend(data); return len(views)-1
    for array,kind,component in [(p,'VEC3',5126),(uv,'VEC2',5126),(n,'VEC3',5126),(f.reshape(-1,1),'SCALAR',5125)]:
        a={'bufferView':put(array.tobytes(),34963 if kind=='SCALAR' else 34962),'componentType':component,
           'count':len(array),'type':kind}
        if array is p: a.update(min=p.min(axis=0).tolist(),max=p.max(axis=0).tolist())
        accessors.append(a)
    dimensions=[]
    for i,im in enumerate(doc.get('images',[])):
        view=doc['bufferViews'][im['bufferView']]
        image=Image.open(BytesIO(binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']])).convert('RGB')
        image.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        encoded=BytesIO(); image.save(encoded,format='JPEG',quality=90 if i==2 else 86,optimize=True)
        im['bufferView']=put(encoded.getvalue()); im['mimeType']='image/jpeg'; dimensions.append(list(image.size))
    doc['bufferViews']=views; doc['accessors']=accessors; doc['buffers']=[{'byteLength':len(blob)}]
    primitive['attributes']={'POSITION':0,'TEXCOORD_0':1,'NORMAL':2}; primitive['indices']=3
    doc['extras']={'source_name':name,'source_sha256':hashlib.sha256(raw).hexdigest(),
                   'original_triangles':original_triangles,'game_triangles':len(f),'source_bounds':original_bounds,
                   'preparation':'meshoptimizer-1.2-attribute-aware','simplification_mode':mode,'triangle_budget':limit,
                   'appearance_error':error,'geometry_weld_span':span,
                   'source_geometry':original_geometry,'game_geometry':game_geometry}
    encoded=json.dumps(doc,separators=(',',':')).encode(); encoded+=b' '*((-len(encoded))%4)
    blob.extend(b'\0'*((-len(blob))%4))
    out=struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(blob))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(blob),0x004E4942)+blob
    target=Path(destination)/(key+'.glb'); target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(out)
    result={'id':key,'source':name,'source_sha256':doc['extras']['source_sha256'],'source_bytes':len(raw),'bytes':len(out),
            'original_triangles':original_triangles,'triangles':len(f),'textures':dimensions,'source_bounds':original_bounds,
            'triangle_budget':limit,'appearance_error':error,'preparation':doc['extras']['preparation'],'simplification_mode':mode,
            'geometry_weld_span':span,
            'source_geometry':original_geometry,'game_geometry':game_geometry}
    print(f'{key}: {original_triangles:,} → {len(f):,} triangles; {len(raw)/1e6:.1f} → {len(out)/1e6:.2f} MB; shell boundary {original_geometry["boundary_edges"]:,} → {game_geometry["boundary_edges"]:,}',flush=True)
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('source'); parser.add_argument('destination'); parser.add_argument('--workers',type=int,default=2)
    args=parser.parse_args()
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        results=list(pool.map(prepare,[(k,n,args.source,args.destination) for k,n in FILES.items()]))
    (Path(args.destination)/'fleet-manifest.json').write_text(json.dumps(results,indent=2)+'\n')
    print(f'Total: {sum(x["source_bytes"] for x in results)/1e6:.1f} → {sum(x["bytes"] for x in results)/1e6:.1f} MB',flush=True)
