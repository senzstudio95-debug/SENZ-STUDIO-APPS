from pathlib import Path
import re,json

def patch(app):
 names=[]
 def edit(name,fn):
  p=app/name;s=p.read_text(encoding='utf-8');out=fn(s);assert out!=s,name
  p.write_bytes(out.encode('utf-8'));names.append(name)
 def sub(s,a,b):
  assert s.count(a)==1,(a,s.count(a))
  return s.replace(a,b)
 edit('dist/index.html',lambda s:re.sub(r'^.*<button class="tool" data-vector-pen.*\n','',s,flags=re.M))
 edit('dist/app.js',lambda s:sub(sub(s,"import {installVectorWorkbench} from './vector-workbench.js';\n",''),'installVectorWorkbench({editor,fonts:()=>fonts,toast,actions});',''))
 edit('dist/toolbar-customize.js',lambda s:sub(sub(s,"button.hasAttribute('data-vector-pen')?8:",''),"'Pen Tool'",'null'))
 def studio(s):
  anchor="nameWrap.append(caseBar);"
  added="""const addName=document.createElement('button');addName.type='button';addName.className='add-name';addName.textContent='+ Add Name';addName.title='Copy this row for another name with the same font, size and color';addName.onclick=()=>{if(adding)return;const index=pending.indexOf(r);if(index<0)return;const copy=structuredClone(r);copy.id='name-'+crypto.randomUUID();copy.selected=true;copy.quantity=1;copy.reviewed=false;const split=Number.isInteger(r.quantity)&&r.quantity>1;if(split)r.quantity--;pending.splice(index+1,0,copy);pageIndex=Math.floor((index+1)/pageSize);flushSave();render();const field=$('rows').querySelector('tr:nth-child('+((index+1)%pageSize+1)+') .order-name');field?.focus();field?.select();$('status').textContent=split?'Name row copied. One copy moved to the new name; total quantity is unchanged. Edit the new name.':'Name row copied with quantity 1. Edit the new name and check the total quantity.';};caseBar.append(addName);nameWrap.append(caseBar);"""
  s=sub(s,anchor,added);s=sub(s,"name.value=displayName(r);name.placeholder", "name.className='order-name';name.value=displayName(r);name.placeholder")
  return s.replace('<small>2.9.8</small>','<small>2.9.9</small>')
 edit('dist/studio-orders.js',studio)
 def extension(s):
  s=sub(s,"tr.addEventListener('click',()=>preview(i));","tr.dataset.nameId=r.manual_line_id||'';tr.addEventListener('click',()=>preview(i));")
  anchor="td.append(s);}if(key==='font')"
  added="""td.append(s);const add=document.createElement('button');add.type='button';add.className='add-name';add.textContent='+ Add Name';add.title='Copy this row for another name with the same font, size and color';add.onclick=e=>{e.stopPropagation();const index=rows.indexOf(r);if(index<0)return;const copy=structuredClone(r);copy.manual_line_id=crypto.randomUUID();copy.quantity=1;copy.selected=true;copy.reviewed=false;const split=Number.isInteger(r.quantity)&&r.quantity>1;if(split)r.quantity--;r.reviewed=false;rows.splice(index+1,0,copy);focused=index+1;$('search').value='';render();persist();const field=$('rows').querySelector('tr[data-name-id="'+copy.manual_line_id+'"] input[aria-label="custom_name"]');field?.focus();field?.select();status(split?'Name row copied. One copy moved to the new name; total quantity is unchanged. Edit the new name.':'Name row copied with quantity 1. Edit the new name and check the total quantity.');};td.append(add);}if(key==='font')"""
  s=sub(s,anchor,added)
  return sub(s,"order_id:r.order_id||'',product_name:","order_id:r.order_id||'',manual_line_id:r.manual_line_id||'',product_name:")
 edit('reader-extension/reader.js',extension)
 edit('reader-extension/studio-bridge.js',lambda s:sub(s,"+'|'+r.product_name;const hash", "+'|'+r.product_name+(r.manual_line_id?'|name:'+r.manual_line_id:'');const hash"))
 edit('reader-extension/style.css',lambda s:s+'\n.add-name{display:block;margin-top:5px;padding:4px 7px;font-size:10px;color:#087afa;background:#edf5ff;border:1px solid #bcd8ff;border-radius:4px;cursor:pointer}\n')
 edit('reader-extension/manifest.json',lambda s:s.replace('2.9.8','2.9.9'))
 edit('reader-extension/reader.html',lambda s:s.replace('v2.9.8</small>','v2.9.9</small>'))
 for name in ['package.json','dist/app.js','dist/index.html']:
  p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.198' in s;p.write_bytes(s.replace('2.9.198','2.9.199').encode());names.append(name)
 return sorted(set(names))
