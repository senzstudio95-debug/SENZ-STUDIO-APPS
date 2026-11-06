from pathlib import Path
import subprocess,json,hashlib,struct
subprocess.run(['makensis','release-tools/v179/installer.nsi'],check=True)
f=Path('SENZ-STUDIO-UPDATE-v2.9.179.exe')
subprocess.run(['7z','t',str(f)],check=True)
subprocess.run(['7z','x','-y',str(f),'-overify'],check=True)
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
r=Path('verify/$PLUGINSDIR/payload');actual={p.relative_to(r).as_posix():digest(p) for p in r.rglob('*') if p.is_file()}
assert actual==json.loads(Path('payload179.json').read_text()),'Installer differs from tested files'
for p in [f]+[p for p in r.rglob('*') if p.suffix.lower() in ('.exe','.dll')]:
 d=p.read_bytes();assert d[:2]==b'MZ';off=struct.unpack_from('<I',d,60)[0];assert d[off:off+4]==b'PE\0\0'
 n=struct.unpack_from('<H',d,off+6)[0];h=struct.unpack_from('<H',d,off+20)[0];assert 1<=n<=96
 for i in range(n):
  size,start=struct.unpack_from('<II',d,off+24+h+40*i+16);assert not size or start+size<=len(d)
Path('SHA256SUMS.txt').write_text(digest(f)+'  '+f.name+'\n')
print('Verified installer files:',len(actual))

