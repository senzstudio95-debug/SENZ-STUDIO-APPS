import {createHmac} from 'node:crypto';
export function sign(path,params,body,secret){
 const query=Object.keys(params).filter(k=>!['sign','access_token'].includes(k)).sort().map(k=>k+String(params[k])).join('');
 return createHmac('sha256',secret).update(secret+path+query+(body||'')+secret).digest('hex');
}
export function normalize(orders){
 return orders.flatMap(o=>(o.line_items||[]).map(i=>({id:String(o.id)+':'+String(i.id),orderId:String(o.id),lineId:String(i.id),status:o.status,sku:String(i.seller_sku||i.sku_id||''),product:String(i.product_name||''),variant:String(i.sku_name||''),quantity:Number.isInteger(i.quantity)&&i.quantity>0?i.quantity:1,buyerMessage:String(o.buyer_message||''),createdAt:o.create_time||0}))).filter(i=>i.lineId!=='undefined');
}
export class TikTok {
 constructor(config,fetcher=fetch){this.c=config;this.fetch=fetcher;}
 async json(url,options={}){const r=await this.fetch(url,{...options,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('TikTok HTTP '+r.status);const j=await r.json();if(j.code!==0)throw Error('TikTok API '+j.code);return j.data;}
 async token(code,refresh=false){const u=new URL('https://auth.tiktok-shops.com/api/v2/token/'+(refresh?'refresh':'get'));u.search=new URLSearchParams({app_key:this.c.key,app_secret:this.c.secret,grant_type:refresh?'refresh_token':'authorized_code',[refresh?'refresh_token':'auth_code']:code});return this.json(u);}
 async api(path,token,params={},body){const q={...params,app_key:this.c.key,timestamp:Math.floor(Date.now()/1000)},raw=body===undefined?'':JSON.stringify(body);q.sign=sign(path,q,raw,this.c.secret);return this.json('https://open-api.tiktokglobalshop.com'+path+'?'+new URLSearchParams(q),{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-tts-access-token':token},...(raw?{body:raw}:{})});}
 async orders(token,cipher,since){let cursor='',items=[];const seen=new Set();do{const data=await this.api('/order/202309/orders/search',token,{shop_cipher:cipher,page_size:100,sort_field:'create_time',sort_order:'DESC',...(cursor?{page_token:cursor}:{})},{create_time_ge:since});items.push(...normalize(data.orders||[]));cursor=data.next_page_token||'';if(cursor&&seen.has(cursor))throw Error('TikTok returned repeated page token');seen.add(cursor);if(seen.size>100)throw Error('Too many pages; narrow the order date range');}while(cursor);return [...new Map(items.map(i=>[i.id,i])).values()];}
}
