"""Create a web copy of an embedded GLB, preserving meshes and 2K textures."""
import argparse,json,struct,hashlib
from pathlib import Path
from io import BytesIO
from PIL import Image

parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('destination');args=parser.parse_args()
original=Path(args.source).read_bytes();magic,version,total=struct.unpack_from('<4sII',original)
assert magic==b'glTF' and version==2 and total==len(original)
json_length=struct.unpack_from('<I',original,12)[0];doc=json.loads(original[20:20+json_length]);binary=original[28+json_length:]
images={v['bufferView']:i for i,v in enumerate(doc['images'])};out=bytearray()
for i,view in enumerate(doc['bufferViews']):
    raw=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
    if i in images:
        image=Image.open(BytesIO(raw)).convert('RGB');buf=BytesIO();image.save(buf,format='JPEG',quality=94 if images[i]==2 else 91,optimize=True);raw=buf.getvalue()
    out.extend(b'\x00'*((-len(out))%4));view['byteOffset']=len(out);view['byteLength']=len(raw);out.extend(raw)
doc['buffers'][0]['byteLength']=len(out);doc.setdefault('extras',{})['source_sha256']=hashlib.sha256(original).hexdigest()
text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*((-len(text))%4);out.extend(b'\x00'*((-len(out))%4))
result=struct.pack('<4sII',b'glTF',2,12+8+len(text)+8+len(out))+struct.pack('<II',len(text),0x4E4F534A)+text+struct.pack('<II',len(out),0x004E4942)+out
destination=Path(args.destination);destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(result)
print(f'Web copy: {len(original):,} -> {len(result):,} bytes. Mesh/accessor data unchanged. Original upload unchanged.')
