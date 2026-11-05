from pathlib import Path
import hashlib,json,subprocess,struct,os,shutil
V='2.9.173'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def run(*args):subprocess.run(args,check=True)
def hashes(root):return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
def pe(p):
 d=p.read_bytes();assert d[:2]==b'MZ',str(p)
 off=struct.unpack_from('<I',d,60)[0];assert d[off:off+4]==b'PE\0\0',str(p)
 count=struct.unpack_from('<H',d,off+6)[0];size=struct.unpack_from('<H',d,off+20)[0];assert 1<=count<=96
 for i in range(count):
  n,start=struct.unpack_from('<II',d,off+24+size+i*40+16);assert not n or start+n<=len(d),str(p)
base=Path('SENZ-STUDIO-UPDATE-v2.9.172.exe')
assert digest(base)=='f825e7b7350bb80da453bc026c023a75278af11d8aa88d935d29f690cc15a478'
run('7z','x','-y',str(base),'-obase')
shutil.move('base/$PLUGINSDIR/payload','payload')
root=Path('payload');app=root/'resources/app'
expected={'license-core.cjs':'f0c9e3b692c33e5946f8d32029500e92c7259e91f32d57697b9042cdded2e0c9','dist/license-ui.js':'05e712db74462d368d8b487fe5a3c9a18f1252176b009befc2cd5d26b177888a','package.json':'4efb72eab85c6d07173fd87adaceac72c10c255f45f4704da39b9f04d8569680','dist/index.html':'8bd56596e4e9e393c3d9431b809521d64d25e5d4607d58b3cdfdf1b4c94bd50f','dist/app.js':'562add637da6c2727c2a02dc76cce02552f6976e3fb58a8a30daff04987030a7'}
for name,sha in expected.items():assert digest(app/name)==sha,name
before=hashes(root)
for name in expected:
 p=app/name;s=p.read_text()
 if name=='license-core.cjs':
  assert s.count('const TRIAL_MS=48*60*60*1000')==1
  s=s.replace('const TRIAL_MS=48*60*60*1000','const TRIAL_MS=7*24*60*60*1000')
 elif name=='dist/license-ui.js':
  assert '172800000' in s and '48 hours from the first installation' in s
  s=s.replace('172800000','604800000').replace('48 hours from the first installation','7 days (168 hours) from the first installation').replace('The demo lasts ${duration/3600000} hours','The demo lasts ${duration/86400000} days (${duration/3600000} hours)')
 else:
  assert '2.9.172' in s;s=s.replace('2.9.172',V)
 p.write_text(s)
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']=V
 for name in expected:d['files'][name]=digest(app/name)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
os.environ['SENZ_APP']=str(app.resolve())
run('node','--test','release-tools/demo.test.cjs')
run('node','--check',str(app/'license-core.cjs'));run('node','--check',str(app/'dist/license-ui.js'))
after=hashes(root)
assert before.keys()==after.keys()
allowed={'resources/app/'+n for n in expected}|{'resources/app/SOURCE-SHA256.json'}
assert {n for n in before if before[n]!=after[n]}<=allowed
for p in root.rglob('*'):
 if p.suffix.lower() in ('.exe','.dll'):pe(p)
Path('payload-sha256.json').write_text(json.dumps(after,indent=2))
run('makensis','release-tools/installer.nsi')
installer=Path('SENZ-STUDIO-UPDATE-v'+V+'.exe');pe(installer)
run('7z','t',str(installer));run('7z','x','-y',str(installer),'-overify')
assert hashes(Path('verify/$PLUGINSDIR/payload'))==after,'Installer payload mismatch'
assert json.loads((Path('verify/$PLUGINSDIR/payload/resources/app/package.json')).read_text())['version']==V
Path('SHA256SUMS.txt').write_text(digest(installer)+'  '+installer.name+'\n')
print('All installer payload files verified:',len(after))
