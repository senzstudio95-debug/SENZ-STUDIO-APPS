from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,s):p.write_bytes(s.encode('utf-8'))
base=Path('SENZ-STUDIO-UPDATE-v2.9.192.exe')
assert digest(base)=='b09348b03196f89b351ace1508ab1406699356f61002de61016bde2ed1ed2de0'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
names=[]
def patch(name,old,new):
 p=app/name;s=p.read_text(encoding='utf-8');assert s.count(old)==1,(name,old);write(p,s.replace(old,new));names.append(name)
shutil.copy2('release-tools/v193/reader-symbol-layout.js',app/'dist/reader-symbol-layout.js');names.append('dist/reader-symbol-layout.js')
patch('dist/studio-orders.js',"sizedText(makeText(displayName(item),20,20,", "sizedText(Object.assign(makeText(displayName(item),20,20,")
patch('dist/studio-orders.js',"emojiVector:true}),item.widthIn", "emojiVector:true}),{readerSymbolLayout:true}),item.widthIn")
patch('dist/emoji-vector.js',"import {LOGOS}","import {readerSymbolLayout} from './reader-symbol-layout.js';\nimport {LOGOS}")
patch('dist/emoji-vector.js','JSON.stringify([o.emojiResolved','JSON.stringify([!!o.readerSymbolLayout,o.emojiResolved')
patch('dist/emoji-vector.js',' const pad=Math.max',' if(o.readerSymbolLayout)maxWidth=readerSymbolLayout(lines,ctx,o);\n const pad=Math.max')
patch('dist/emoji-vector.js',' const result={lines,w:', ' if(o.readerSymbolLayout)for(const l of lines)for(const p of l.parts)if(p.logo){p.logoScale=p.px/Math.max(p.logo.width,p.logo.height);p.logoX=p.x+(p.px-p.logo.width*p.logoScale)/2;p.logoY=p.y+p.symbolTop+(p.px-p.logo.height*p.logoScale)/2;}\n const result={lines,w:')
patch('dist/vector-cache.js','JSON.stringify([!!o.emojiVector','JSON.stringify([!!o.readerSymbolLayout,!!o.emojiVector')
patch('dist/editor.js',"if(o.type!=='text'||!!o.emojiVector===!!this.project.emojiVectorMode)continue;", "if(o.type!=='text'||o.readerSymbolLayout||!!o.emojiVector===!!this.project.emojiVectorMode)continue;")
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.192' in s;write(p,s.replace('2.9.192','2.9.193'));names.append(name)
p=app/'SOURCE-SHA256.json';d=json.loads(p.read_text());d['version']='2.9.193'
for name in names:d['files'][name]=digest(app/name)
write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)<=set(after)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload193.json').write_text(json.dumps(after));print('SENZREADER integrated; all unrelated files unchanged')
