from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,s):p.write_bytes(s.encode('utf-8'))
base=Path('SENZ-STUDIO-UPDATE-v2.9.193.exe')
assert digest(base)=='c21bc0da6e7856efbad70b39ad55b03112115b543557a6dad7e2f2805a8414e2'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
names=['dist/emoji-pdf-logos.js']
p=app/names[0];s=p.read_text(encoding='utf-8');prefix,body=s.split('export const PDF_EMOJI_LOGOS=',1)
logos,end=json.JSONDecoder().raw_decode(body);before_logos=json.loads(json.dumps(logos));matches=[x for x in logos if x['id']=='pdf151-revolving-hearts'];assert len(matches)==1
replacement=json.loads(Path('release-tools/v195/two-hearts.json').read_text());assert len(replacement['parts'])==2
matches[0].update(replacement)
assert [x for x in logos if x['id']!='pdf151-revolving-hearts']==[x for x in before_logos if x['id']!='pdf151-revolving-hearts']
write(p,prefix+'export const PDF_EMOJI_LOGOS='+json.dumps(logos,ensure_ascii=False,separators=(',',':'))+body[end:])
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.193' in s;write(p,s.replace('2.9.193','2.9.195'));names.append(name)
p=app/'SOURCE-SHA256.json';d=json.loads(p.read_text());d['version']='2.9.195'
for name in names:d['files'][name]=digest(app/name)
write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)<=set(after)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload195.json').write_text(json.dumps(after));print('SENZREADER integrated; all unrelated files unchanged')
