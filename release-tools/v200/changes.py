def patch(app):
 names=[]
 def edit(name,fn):
  p=app/name;s=p.read_text(encoding='utf-8');out=fn(s);assert out!=s,name
  p.write_bytes(out.encode('utf-8'));names.append(name)
 def sub(s,a,b):
  assert s.count(a)==1,(a,s.count(a))
  return s.replace(a,b)
 def studio(s):
  s=sub(s,'caseBar.append(addName);nameWrap.append(caseBar);',"""const deleteName=document.createElement('button');deleteName.type='button';deleteName.className='delete-name';deleteName.textContent='Delete Name';deleteName.title='Remove only this pending name';deleteName.onclick=async()=>{if(adding)return;const index=pending.indexOf(r);if(index<0)return;pending.splice(index,1);flushSave();render();$('status').textContent='Name deleted from the pending list.';try{await finishJobs([r],'Name removed from Studio review.');}catch(e){$('status').textContent='Name deleted. Receiver update failed: '+e.message;}};caseBar.append(addName,deleteName);nameWrap.append(caseBar);""")
  return sub(s,'<small>2.9.9</small>','<small>2.9.10</small>').replace('</style>', '.delete-name{color:#bd2536!important;background:#fff2f3!important;border-color:#edb7bd!important}</style>',1)
 edit('dist/studio-orders.js',studio)
 def extension(s):
  return sub(s,"td.append(add);}if(key==='font')", """const remove=document.createElement('button');remove.type='button';remove.className='delete-name';remove.textContent='Delete Name';remove.title='Remove only this name from the list';remove.onclick=e=>{e.stopPropagation();const index=rows.indexOf(r);if(index<0)return;rows.splice(index,1);focused=Math.max(0,Math.min(index,rows.length-1));render();persist();status('Name deleted from the list.');};const actions=document.createElement('div');actions.className='name-actions';actions.append(add,remove);td.append(actions);}if(key==='font')""")
 edit('reader-extension/reader.js',extension)
 edit('reader-extension/style.css',lambda s:s+'\n.name-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.name-actions .add-name{margin-top:0}.delete-name{padding:4px 7px;font-size:10px;color:#bd2536;background:#fff2f3;border:1px solid #edb7bd;border-radius:4px;cursor:pointer}\n')
 edit('reader-extension/manifest.json',lambda s:s.replace('"version": "2.9.9"','"version": "2.9.10"'))
 edit('reader-extension/reader.html',lambda s:s.replace('v2.9.9</small>','v2.9.10</small>'))
 for name in ['package.json','dist/app.js','dist/index.html']:
  edit(name,lambda s:s.replace('2.9.199','2.9.200'))
 return names
