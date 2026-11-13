(function(root){
 const norm=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
 const labels='nama(?:\\s+(?:custom|sticker|tempahan))?|custom\\s*name|name|font(?:\\s*(?:type|style))?|jenis\\s*font|saiz|size|warna|colou?r|qty|quantity|kuantiti';
 function field(t,keys){const re=new RegExp('(?:^|[\\n|;,])\\s*(?:'+keys+')\\s*[:：]\\s*([^\\n|;]+)','im');const m=t.match(re);return m?m[1].split(new RegExp('\\s+(?=(?:'+labels+')\\s*[:：])','i'))[0].trim():'';}
 function matchesProduct(text,product){
  const clean=s=>norm(s).replace(/\bstiker\b/g,'sticker').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const words=clean(product).split(/\s+/).filter(Boolean),hay=clean(text).split(' ');
  return words.length>0&&words.every(w=>hay.includes(w));
 }
 function customerName(text){
  const lines=String(text||'').split(/\r?\n/);let value='';
  for(let i=0;i<lines.length;i++){const m=lines[i].match(/customer\s*message\s*[:：][ \t]*(.*)$/i);if(!m)continue;value=m[1].trim();if(!value)value=(lines[i+1]||'').trim();break;}
  if(/^(?:order\s*id|seller|affiliate|arrange|awaiting|shipped|font|size|saiz|warna|qty)\b/i.test(value))return '';
  value=value.split(/\s*[|;]\s*(?=(?:font|size|saiz|warna|colou?r|qty)\s*[:：])/i)[0].replace(/^(?:nama|name)\s*[:：]\s*/i,'').trim();
  if(!/\p{L}/u.test(value)||/^(?:n\/?a|none|null|no\s*(?:message|note)|tiada(?:\s*(?:nama|nota|mesej))?|not provided)$/i.test(value))return '';
  return value;
 }
 function parseBlock(text,product,mapping){
  if(!matchesProduct(text,product))return null;
  const id=(text.match(/(?:order\s*(?:id|number|no\.?|#)|id\s*pesanan|no\.?\s*pesanan)\s*[:：#\-]?\s*(\d{6,})/i)||[])[1]||'';
  let note=field(text,'buyer\\s*(?:note|message)|customer\\s*(?:note|message)|note\\s*to\\s*seller|nota(?:\\s*(?:pelanggan|pembeli))?|note|catatan');
  if(!note){const m=text.match(/(?:buyer\s*(?:note|message)|customer\s*(?:note|message)|note\s*to\s*seller|nota\s*(?:pelanggan|pembeli))\s*[:：]?\s*\n([^\n]+)/i);note=m?.[1]?.trim()||'';}
  const customerMessage=text.match(/customer\s*message\s*[:：]\s*([^\n]+)/i);if(customerMessage)note=customerMessage[1].trim();
  let name=field(note,'nama(?:\\s+(?:custom|sticker|tempahan))?|custom\\s*name|name')||field(text,'nama(?:\\s+(?:custom|sticker|tempahan))?|custom\\s*name');
  if(!name && note){name=note.split(new RegExp('(?:[|;,]|\\s+(?=(?:'+labels+')\\s*[:：]))','i'))[0].replace(/^(?:nama|name)\s*[:：]\s*/i,'').trim();}
  let font=field(text,'jenis\\s*font|font(?:\\s*(?:type|style))?');
  if(!font)for(const m of mapping){const escaped=m.code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(?:^|[^a-z0-9])'+escaped+'(?:$|[^a-z0-9])','i').test(text)){font=m.code;break;}}
  if(!font)font=(text.match(/(?:^|[\s,;|/])((?!x\d)[A-Z]{1,3}\d{1,3})(?=$|[\s,;|/])/i)||[])[1]?.toUpperCase()||'';
  const dimension=/\b\d+(?:[.,]\d+)?\s*(?:inches|inch|inci|in|cm|mm|["″])?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:inches|inch|inci|in|cm|mm|["″])(?:\b|(?<=["″]))/i;
  const singleSize=/\b\d+(?:[.,]\d+)?\s*(?:inches|inch|inci|in|cm|mm)\b/i;
  const size=field(text,'saiz|size')||(text.match(dimension)||text.match(singleSize)||[])[0]||'';
  let color=field(text,'warna|colou?r');
  if(!color)color=(text.match(/\b(?:putih|white|rainbow|pelangi|hitam|black|merah|red|pink|biru|blue|gold|emas|silver|perak|hijau|green|kuning|yellow)\b/i)||[])[0]||'';
  // Remove dimensions before looking for x1: the x2 in a size is not quantity.
  const quantityText=text.replace(new RegExp(dimension.source,'gi'),' ');
  const quantityMatch=quantityText.match(/(?:^|[\s|;,])(?:[x×]\s*(\d+)|(?:qty|quantity|kuantiti)\s*[:：]?\s*(\d+))(?=$|[\s|;,])/im);
  const quantityValue=Number(field(text,'qty|quantity|kuantiti'))||Number(quantityMatch?.[1]||quantityMatch?.[2]);
  const quantity=Number.isInteger(quantityValue)&&quantityValue>0?quantityValue:1;

  return {order_id:id,product_name:product,custom_name:name,font,size,color,quantity,note,raw:text,selected:true,reviewed:false};
 }
 function parse(data,product,mapping){
  if(!norm(product))throw Error('Isi nama produk dahulu.');
  const boundary=/(?=(?:Order\s*(?:ID|Number|No\.?|#)|ID\s*Pesanan|No\.?\s*Pesanan)\s*[:：#\-]?\s*\d[\w-]{5,})/i;
  const header=/^(?:Order\s*(?:ID|Number|No\.?|#)|ID\s*Pesanan|No\.?\s*Pesanan)\s*[:：#\-]?\s*\d[\w-]{5,}/i;
  // Product rows can omit the order header and Customer message footer.
  // Prefer complete page sections, bounded by the next order ID.
  const pageOrders=(data.text||'').split(boundary).filter(t=>header.test(t.trim()));
  const matchedPageOrders=pageOrders.filter(t=>matchesProduct(t,product));
  let blocks=matchedPageOrders.length?matchedPageOrders:(data.blocks?.length?data.blocks:[data.text||'']);
  blocks=blocks.flatMap(t=>t.split(boundary));
  const rows=[],seen=new Set();for(const t of blocks){const r=parseBlock(t,product,mapping);if(!r)continue;const key=r.order_id?r.order_id+'|'+norm(product):norm(t);if(seen.has(key))continue;seen.add(key);rows.push(r);}return rows;
 }
 function colorHex(s){return ({putih:'#969da7',white:'#969da7',rainbow:'#80caff',pelangi:'#80caff',hitam:'#151921',black:'#151921',merah:'#ec4545',red:'#ec4545',pink:'#ed89bd',biru:'#2784ef',blue:'#2784ef',emas:'#bf9b40',gold:'#bf9b40',silver:'#b3b9c3',perak:'#b3b9c3',hijau:'#29a676',green:'#29a676',kuning:'#dfba22',yellow:'#dfba22'})[norm(s)]||'#64748b';}
 root.SenzParser={parse,parseBlock,colorHex,norm,matchesProduct,customerName};if(typeof module!=='undefined')module.exports=root.SenzParser;
})(typeof globalThis!=='undefined'?globalThis:this);
