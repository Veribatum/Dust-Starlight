"""Make streamed, texture-preserving game copies of the supplied Meshy fleet.

Requires numpy, Pillow and VTK. Source uploads are never modified. Geometry
reduction interpolates point data, keeping UVs and normals attached. A bounded
vertex-collapse fallback handles ill-conditioned source meshes.
"""
import argparse, hashlib, json, struct
from concurrent.futures import ProcessPoolExecutor
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
import vtk
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray, vtk_to_numpy

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

def reduce_mesh(points, normals, uv, faces, limit):
    if len(faces) <= limit: return points, normals, uv, faces
    poly = vtk.vtkPolyData(); vp = vtk.vtkPoints()
    vp.SetData(numpy_to_vtk(points, deep=True)); poly.SetPoints(vp)
    cells = vtk.vtkCellArray()
    cells.SetData(numpy_to_vtkIdTypeArray(np.arange(0,len(faces)*3+1,3,dtype=np.int64),deep=True),
                  numpy_to_vtkIdTypeArray(faces.reshape(-1).astype(np.int64),deep=True))
    poly.SetPolys(cells)
    n = numpy_to_vtk(normals,deep=True); n.SetName('Normals'); poly.GetPointData().SetNormals(n)
    t = numpy_to_vtk(uv,deep=True); t.SetName('UV'); poly.GetPointData().SetTCoords(t)
    dec = vtk.vtkQuadricDecimation(); dec.SetInputData(poly)
    dec.SetTargetReduction(1-limit/len(faces)); dec.AttributeErrorMetricOff()
    dec.MapPointDataOn(); dec.VolumePreservationOff(); dec.Update(); out = dec.GetOutput()
    candidate = vtk_to_numpy(out.GetPoints().GetData())
    lower,upper = points.min(axis=0),points.max(axis=0)
    tolerance = np.ptp(points,axis=0).max()*.0005
    if not np.isfinite(candidate).all() or (candidate < lower-tolerance).any() or (candidate > upper+tolerance).any():
        # DecimatePro retains source positions, which rules out solver spikes.
        fallback=vtk.vtkDecimatePro(); fallback.SetInputData(poly)
        fallback.SetTargetReduction(1-limit/len(faces)); fallback.PreserveTopologyOff()
        fallback.SplittingOn(); fallback.SetFeatureAngle(45); fallback.BoundaryVertexDeletionOn()
        fallback.Update(); out=fallback.GetOutput()
    p = vtk_to_numpy(out.GetPoints().GetData()).astype('<f4')
    n = vtk_to_numpy(out.GetPointData().GetNormals()).astype('<f4')
    n /= np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-8)
    t = vtk_to_numpy(out.GetPointData().GetTCoords()).astype('<f4')
    f = vtk_to_numpy(out.GetPolys().GetConnectivityArray()).reshape(-1,3).astype('<u4')
    return p,n,t,f

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
    limit = 30000 if key in ['icebound-carrier','leviathan','mothership','spire-cruiser'] else 20000
    p,n,uv,f = reduce_mesh(p,n,uv,f,limit)
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
                   'original_triangles':original_triangles,'game_triangles':len(f),'source_bounds':original_bounds}
    encoded=json.dumps(doc,separators=(',',':')).encode(); encoded+=b' '*((-len(encoded))%4)
    blob.extend(b'\0'*((-len(blob))%4))
    out=struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(blob))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(blob),0x004E4942)+blob
    target=Path(destination)/(key+'.glb'); target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(out)
    result={'id':key,'source':name,'source_sha256':doc['extras']['source_sha256'],'source_bytes':len(raw),'bytes':len(out),
            'original_triangles':original_triangles,'triangles':len(f),'textures':dimensions,'source_bounds':original_bounds}
    print(f'{key}: {original_triangles:,} → {len(f):,} triangles; {len(raw)/1e6:.1f} → {len(out)/1e6:.2f} MB',flush=True)
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('source'); parser.add_argument('destination'); parser.add_argument('--workers',type=int,default=2)
    args=parser.parse_args()
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        results=list(pool.map(prepare,[(k,n,args.source,args.destination) for k,n in FILES.items()]))
    (Path(args.destination)/'fleet-manifest.json').write_text(json.dumps(results,indent=2)+'\n')
    print(f'Total: {sum(x["source_bytes"] for x in results)/1e6:.1f} → {sum(x["bytes"] for x in results)/1e6:.1f} MB',flush=True)
