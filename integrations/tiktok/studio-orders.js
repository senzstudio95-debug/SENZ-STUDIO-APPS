import {makeText} from './core.js';
import {sizedText} from './size-tool.js';
import {installPortal} from './tiktok-portal.js';
export function installTikTokOrders({editor,fonts,ensureFont,toast}){
 const trigger=document.createElement('button');trigger.className='soft';trigger.textContent='TikTok Orders';trigger.id='tiktok-orders-open';document.querySelector('[data-action="library-arrange"]').after(trigger);
 const dialog=document.createElement('dialog');dialog.id='tiktok-orders-window';Object.assign(dialog.style,{padding:'0',border:'1px solid #46506b',borderRadius:'16px',background:'#0c101b',width:'min(900px,95vw)',height:'min(720px,90vh)',maxWidth:'95vw',maxHeight:'90vh',resize:'both',overflow:'auto'});document.body.append(dialog);const host=document.createElement('div');dialog.append(host);const shadow=host.attachShadow({mode:'open'});for(const event of ['keydown','keyup'])shadow.addEventListener(event,e=>e.stopPropagation());let loaded=false,portal;
 async function importItems(items){
  const page=editor.page,project=editor.project,objects=[];let y=20;
  if(items.length>500)throw Error('Import maksimum 500 item sekali.');
  for(const item of items){
   if(!item.name?.trim()||item.name.length>250)throw Error('Nama wajib diisi (maksimum 250 aksara).');
   if(!fonts().some(f=>f.family===item.font))throw Error('Font tidak tersedia: '+item.font);
   if(!Number.isFinite(item.widthIn)||item.widthIn<.01||item.widthIn>100||!/^#[0-9a-f]{6}$/i.test(item.color))throw Error('Saiz atau warna tidak sah.');
   if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>200)throw Error('Kuantiti tidak sah.');
   const already=project.pages.some(p=>p.objects.some(o=>o.tiktokLineId===item.id));if(already)continue;
   await ensureFont(item.font);
   for(let n=0;n<item.quantity;n++){if(objects.length>=500)throw Error('Import maksimum 500 nama sekali.');const original=makeText(item.name,20,y,{font:item.font,size:36,color:item.color});const o=await sizedText(original,item.widthIn,'w',fonts());o.tiktokLineId=item.id;o.tiktokOrderId=item.orderId;o.tiktokCopy=n+1;objects.push(o);y+=o.h+16;}
  }
  if(page!==editor.page||project!==editor.project)throw Error('Canvas berubah. Buka semula order dan cuba lagi.');
  if(!objects.length)throw Error('Semua item ini sudah berada dalam projek ini.');
  editor.applyChange(()=>page.objects.push(...objects));editor.select(objects.map(o=>o.id));editor.fit();toast(objects.length+' nama ditambah. Gunakan Auto Arrange untuk susun.');return objects.length;
 }
 trigger.onclick=async()=>{try{if(!loaded){const [html,css]=await Promise.all([fetch('tiktok-portal.html').then(r=>r.text()),fetch('tiktok-portal.css').then(r=>r.text())]);const style=document.createElement('style');style.textContent=css.replace(':root',':host')+' :host{display:block;color:#ecf1fc}main{padding:20px}';const content=document.createElement('div');content.innerHTML=html;const close=document.createElement('button');close.textContent='× Tutup';close.style.cssText='position:sticky;top:8px;float:right;z-index:2;margin:8px';close.onclick=()=>dialog.close();shadow.append(style,close,content);shadow.querySelector('#export').textContent='Masukkan nama disemak ke canvas';portal=installPortal(shadow,{getFonts:fonts,base:'https://senz-tiktok-production.up.railway.app',onImport:importItems,openExternal:url=>window.senzDesktop?.tiktokOpen(url)});loaded=true;}else portal.refreshFonts();dialog.showModal();}catch(e){toast(e.message,true)}};
 return {importItems};
}
