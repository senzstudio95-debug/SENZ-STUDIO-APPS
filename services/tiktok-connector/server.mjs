import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {TikTok} from './tiktok.mjs';
const hash=s=>createHash('sha256').update(s).digest();
export function createApp(env=process.env,fetcher=fetch){
 const dir=env.DATA_DIR||'./data';mkdirSync(dir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(dir+'/connector.sqlite');db.exec('CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT); CREATE TABLE IF NOT EXISTS states(k TEXT PRIMARY KEY,expires INTEGER);');
 const key=Buffer.from(env.ENCRYPTION_KEY||'','hex');
 const ready=()=>key.length===32&&(env.CONNECTOR_TOKEN||'').length>=32;
 const configured=()=>ready()&&env.TIKTOK_APP_KEY&&env.TIKTOK_APP_SECRET&&env.TIKTOK_AUTH_URL&&env.TIKTOK_SHOP_ID;
 const api=new TikTok({key:env.TIKTOK_APP_KEY,secret:env.TIKTOK_APP_SECRET},fetcher);
 function save(k,v){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([c.update(JSON.stringify(v)),c.final()]);db.prepare('INSERT OR REPLACE INTO kv VALUES (?,?)').run(k,Buffer.concat([iv,c.getAuthTag(),data]).toString('base64'));}
 function get(k){const row=db.prepare('SELECT v FROM kv WHERE k=?').get(k);if(!row)return null;const b=Buffer.from(row.v,'base64'),c=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([c.update(b.subarray(28)),c.final()]));}
 let busy=false,lastSync=0;
 const send=(r,status,data,type='application/json')=>{r.writeHead(status,{'content-type':type+'; charset=utf-8'});r.end(type==='application/json'?JSON.stringify(data):data);};
 async function handler(req,res){
  res.setHeader('cache-control','no-store');res.setHeader('referrer-policy','no-referrer');res.setHeader('x-content-type-options','nosniff');res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  const origin=req.headers.origin;const allowed=[env.PUBLIC_URL,'senz://app',...(env.ALLOWED_ORIGINS||'').split(',')].filter(Boolean);
  if(origin&&allowed.includes(origin)){res.setHeader('access-control-allow-origin',origin);res.setHeader('vary','Origin');res.setHeader('access-control-allow-headers','Authorization, Content-Type');res.setHeader('access-control-allow-methods','GET, POST, DELETE, OPTIONS');}
  if(req.method==='OPTIONS')return send(res,204,'');
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/health')return send(res,200,{ok:true});
  if(req.method==='GET'&&['/','/portal.js','/style.css'].includes(u.pathname)){const name=u.pathname==='/'?'index.html':u.pathname.slice(1);return send(res,200,readFileSync(new URL('./public/'+name,import.meta.url),'utf8'),name.endsWith('js')?'text/javascript':name.endsWith('css')?'text/css':'text/html');}
  if(u.pathname==='/tiktok/callback'){
   if(!configured())return send(res,503,'SENZ TikTok connector belum dikonfigurasi. Sila lengkapkan tetapan Partner Center dan server.','text/plain');
   if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
   const state=u.searchParams.get('state')||'',s=db.prepare('DELETE FROM states WHERE k=? AND expires>? RETURNING k').get(hash(state).toString('hex'),Date.now());
   if(!s)return send(res,400,'Authorization expired or invalid. Start Connect TikTok again.','text/plain');
   const code=u.searchParams.get('code');if(!code)return send(res,400,'Authorization cancelled.','text/plain');
   const token=await api.token(code),shops=await api.api('/authorization/202309/shops',token.access_token),shop=shops.shops?.find(s=>String(s.id)===env.TIKTOK_SHOP_ID);
   if(!shop)return send(res,403,'This shop is not allowed for this SENZ connector.','text/plain');
   save('connection',{...token,shop});return send(res,200,'TikTok Shop disambungkan. Anda boleh tutup tab ini dan kembali ke SENZ STUDIO.','text/plain');
  }
  if(!u.pathname.startsWith('/api/'))return send(res,404,{error:'Not found'});
  const supplied=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!ready()||!timingSafeEqual(hash(supplied),hash(env.CONNECTOR_TOKEN)))return send(res,401,{error:'Masukkan Connector Token daripada tetapan server.'});
  if(req.method==='GET'&&u.pathname==='/api/status'){const c=get('connection');return send(res,200,{configured:!!configured(),connected:!!c,shop:c?.shop?.name||null,callback:env.PUBLIC_URL?env.PUBLIC_URL+'/tiktok/callback':null,lastSync});}
  if(req.method==='POST'&&u.pathname==='/api/connect'){
   if(!configured())return send(res,503,{error:'Tetapkan TIKTOK_APP_KEY, TIKTOK_APP_SECRET, TIKTOK_AUTH_URL dan TIKTOK_SHOP_ID di server.'});
   const auth=new URL(env.TIKTOK_AUTH_URL);if(auth.protocol!=='https:'||!['services.tiktokshop.com','services.us.tiktokshop.com'].includes(auth.hostname))return send(res,503,{error:'Gunakan seller authorization URL rasmi daripada Partner Center.'});
   db.prepare('DELETE FROM states WHERE expires<?').run(Date.now());const state=randomBytes(32).toString('hex');db.prepare('INSERT INTO states VALUES (?,?)').run(hash(state).toString('hex'),Date.now()+600000);auth.searchParams.set('state',state);return send(res,200,{url:auth.href});
  }
  if(req.method==='DELETE'&&u.pathname==='/api/connection'){if(busy)return send(res,409,{error:'Sync sedang berjalan.'});db.exec('DELETE FROM kv; DELETE FROM states;');return send(res,200,{disconnected:true});}
  if(req.method==='GET'&&u.pathname==='/api/orders')return send(res,200,{items:get('orders')||[],lastSync});
  if(req.method==='POST'&&u.pathname==='/api/sync'){
   if(busy||Date.now()-lastSync<60000)return send(res,429,{error:'Tunggu 60 saat sebelum sync semula.'});
   let c=get('connection');if(!c)return send(res,409,{error:'Connect TikTok dahulu.'});busy=true;
   try{if(Number(c.access_token_expire_in)*1000<Date.now()+120000){c={...c,...await api.token(c.refresh_token,true)};save('connection',c);}
    const items=await api.orders(c.access_token,c.shop.cipher,Math.floor(Date.now()/1000)-7*86400);save('orders',items);lastSync=Date.now();return send(res,200,{items,lastSync});
   }finally{busy=false;}
  }
  return send(res,404,{error:'Not found'});
 }
 const server=http.createServer((req,res)=>handler(req,res).catch(e=>{console.error('Connector request failed:',/^TikTok (HTTP|API) \d+$/.test(e.message)?e.message:'internal error');if(!res.headersSent)send(res,502,{error:'Sambungan gagal. Semak kelayakan, permission dan status API TikTok di Partner Center.'});else res.end();}));
 server.on('close',()=>db.close());return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url))createApp().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('SENZ TikTok connector ready'));
