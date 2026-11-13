function scanVisiblePage(product){
 const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\bstiker\b/g,'sticker').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const words=normalize(product).split(/\s+/).filter(Boolean);
 const matches=s=>{const n=normalize(s);return words.length>0&&words.every(w=>n.split(' ').includes(w));};
 const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
 const textCache=new WeakMap();const textOf=el=>{if(!textCache.has(el))textCache.set(el,String(el.innerText||'').trim());return textCache.get(el);};
 const variantPattern=/\b[A-Z]{1,3}\d{1,3}\s*[,;|/]?\s*\d+(?:[.,]\d+)?\s*(?:inch|inches|inci|in|cm|mm)?\s*[x×]\s*\d+/i;
 const idPattern=/(?:order\s*(?:id|number|no\.?|#)|id\s*pesanan|no\.?\s*pesanan)\s*[:：#\-]?\s*\d[\w-]{5,}/gi;
 const selectors='[data-order-id], [data-testid*="order-card"], [data-tid*="order-card"], [class*="order-card"], [class*="orderCard"], tr, [role="row"]';
 let cards=[...document.querySelectorAll(selectors)].filter(visible).filter(el=>matches(textOf(el)));
 cards=cards.filter(el=>!cards.some(other=>other!==el&&other.contains(el)));
 // Generic product anchors for layouts without stable order selectors.
 if(!cards.length){
  const leaves=[...document.querySelectorAll('a,span,p,div,h3,h4')].filter(visible).filter(el=>{const t=textOf(el);return t.length<600&&matches(t)&&![...el.children].some(c=>matches(textOf(c)));});
  for(const leaf of leaves){let node=leaf,best=null;for(let depth=0;node&&node!==document.body&&depth<12;depth++,node=node.parentElement){const t=textOf(node);if(t.length>22000)break;const ids=t.match(idPattern)||[];if(new Set(ids).size>1)break;if(!ids.length&&leaves.filter(l=>node===l||node.contains(l)).length>1)break;if(ids.length||node.hasAttribute('data-order-id'))best=node;else if(!best&&/(?:buyer\s*(?:note|message)|nota|catatan|font|saiz|size|variation|variasi)/i.test(t)&&t.length>textOf(leaf).length)best=node;if(!best&&variantPattern.test(t))best=node;if(best&&!ids.length&&variantPattern.test(t)&&/(?:^|\s)[x×]\s*\d+(?=$|\s)/im.test(t)){best=node;break;}}
   if(best&&!cards.some(c=>c===best))cards.push(best);
  }
  cards=cards.filter(el=>!cards.some(other=>other!==el&&other.contains(el)));
 }
 // Customer message may sit beside the product, inside the surrounding order.
 cards=cards.map(card=>{
  if(/customer\s*(?:message|note)|buyer\s*(?:message|note)/i.test(textOf(card)))return card;
  let parent=card.parentElement;
  for(let depth=0;parent&&parent!==document.body&&depth<6;depth++,parent=parent.parentElement){
   const t=textOf(parent);if(t.length>22000)break;
   const ids=t.match(idPattern)||[];if(new Set(ids).size>1)break;
   const titles=[...parent.querySelectorAll('a,span,p,div,h3,h4')].filter(el=>{const v=textOf(el);return v.length<600&&matches(v)&&![...el.children].some(c=>matches(textOf(c)));});
   if(titles.length>1)break;
   if(/customer\s*(?:message|note)|buyer\s*(?:message|note)/i.test(t))return parent;
  }return card;
 });
 cards=[...new Set(cards)];
 const blocks=cards.map(el=>{let t=textOf(el);const id=el.getAttribute('data-order-id');if(id&&!/(?:order\s*(?:id|number|no|#)|id\s*pesanan)/i.test(t))t='Order ID: '+id+'\n'+t;return t;});
 const text=document.body?.innerText||'';
 return {blocks,text,url:location.href,title:document.title,scanned_at:new Date().toISOString(),diagnostics:{characters:text.length,productOnPage:matches(text),cards:blocks.length}};
}

function highlightMissingNames(orderIds,product){
 const previous=globalThis.__senzHighlight;for(const el of previous?.overlays||[])el.remove();if(previous?.position){globalThis.removeEventListener?.('scroll',previous.position,true);globalThis.removeEventListener?.('resize',previous.position);}previous?.observer?.disconnect();clearTimeout(previous?.timer);for(const [el,value,priority] of [...(previous?.painted||[])].reverse())el.style.setProperty('background-color',value,priority);
 globalThis.CSS?.highlights?.delete('senz-missing-text');const state={painted:[],ranges:[],overlays:[],cards:[]};globalThis.__senzHighlight=state;
 const className='senz-reader-missing-name';
 document.querySelectorAll('.'+className).forEach(el=>el.classList.remove(className));
 let style=document.getElementById('senz-reader-highlight-style');if(!style){style=document.createElement('style');style.id='senz-reader-highlight-style';style.textContent='.'+className+',.'+className+' :is(div,td,section,article,span){background-color:#fff4bf!important}.'+className+'{outline:1px solid #f2df91!important;outline-offset:-1px}';document.head.append(style);}
 const ids=new Set(orderIds.map(id=>String(id).match(/^\d{6,}/)?.[0]).filter(Boolean));
 const cache=new WeakMap();const text=el=>{if(!cache.has(el))cache.set(el,(el.innerText||el.textContent||'').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g,''));return cache.get(el);};
 const pattern=/(?:order\s*(?:id|number|no\.?|#)|id\s*pesanan)\s*[:：#\-]?\s*(\d{6,})/gi;
 const normalize=s=>s.toLowerCase().replace(/\bstiker\b/g,'sticker').replace(/[^\p{L}\p{N}]+/gu,' ').trim();const words=normalize(product).split(/\s+/);
 const nodes=[...document.querySelectorAll('[data-order-id],span,a,div,p,strong,tr,section,article')];const marked=new Set();
 // Highlighting depends ONLY on label presence, never on its value.
 function hasCustomerMessageLabel(value){return /\bcustomer\s*message\b/i.test(String(value||'').normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g,''));}
 const hasLabel=el=>hasCustomerMessageLabel(text(el))||hasCustomerMessageLabel(el.textContent||'');
 const protectedIds=new Set();for(const el of nodes){const value=text(el);if(value.length>30000||!hasLabel(el))continue;const found=new Set([...value.matchAll(pattern)].map(m=>m[1]));const own=el.getAttribute('data-order-id');if(own)found.add(own);if(found.size===1)protectedIds.add([...found][0]);}
 // TikTok's real seller layout: each order occupies sibling TRs in one TBODY.
 // Group from an Order ID header up to (but not including) the next header.
 const groupedRows=new Set();
 const rowParents=new Set(nodes.filter(el=>el.tagName?.toLowerCase()==='tr').map(el=>el.parentElement));
 for(const parent of rowParents){if(!parent)continue;let group=null;const groups=[];
  for(const row of parent.children||[]){if(row.tagName?.toLowerCase()!=='tr')continue;const headers=[...text(row).matchAll(pattern)];
   if(headers.length){if(group)groups.push(group);group=headers.length===1?{id:headers[0][1],rows:[row]}:null;}
   else if(group)group.rows.push(row);
  }if(group)groups.push(group);
  for(const group of groups){group.rows.forEach(row=>groupedRows.add(row));const contents=group.rows.map(text).join('\n');if(!words.every(w=>normalize(contents).includes(w)))continue;
   if(group.rows.some(hasLabel)){protectedIds.add(group.id);continue;}
   for(const row of group.rows){if(!text(row).trim())continue;row.classList.add(className);for(const target of [row,...row.querySelectorAll('div,td,section,article')])if(target.style){state.painted.push([target,target.style.getPropertyValue('background-color'),target.style.getPropertyPriority('background-color')]);target.style.setProperty('background-color','#fff4bf','important');}state.cards.push(row);}
   marked.add(group.id);
  }
 }
 const isGrouped=el=>{for(let node=el;node&&node!==document.body;node=node.parentElement)if(groupedRows.has(node))return true;return false;};
 // Detect cards directly too: highlighting must not depend on a parsed export row.
 for(const el of nodes){const value=text(el);if(value.length>30000||!words.every(w=>normalize(value).includes(w)))continue;const found=[...new Set([...value.matchAll(pattern)].map(m=>m[1]))];if(found.length===1&&!hasCustomerMessageLabel(value))ids.add(found[0]);}

  function paintCard(best,id){if(!best)return;const cardIds=new Set([...text(best).matchAll(pattern)].map(m=>m[1]));const cardId=best.getAttribute?.('data-order-id');if(cardId)cardIds.add(cardId);if(cardIds.size!==1||!cardIds.has(id))return;if(protectedIds.has(id)||[...text(best||{}).matchAll(pattern)].some(m=>protectedIds.has(m[1])))return;let ancestor=best;for(let depth=0;ancestor&&ancestor!==document.body&&depth<14;depth++,ancestor=ancestor.parentElement){const found=new Set([...text(ancestor).matchAll(pattern)].map(m=>m[1]));if(found.size>1)break;if(ancestor!==best&&!found.has(id))break;if(hasLabel(ancestor))return;}if(best&&!hasLabel(best)){best.classList.add(className);for(const target of [best,...(best.querySelectorAll?.('div,td,section,article')||[])])if(target.style){state.painted.push([target,target.style.getPropertyValue('background-color'),target.style.getPropertyPriority('background-color')]);target.style.setProperty('background-color','#fff4bf','important');}state.cards.push(best);marked.add(id);}}

 for(const el of nodes){if(isGrouped(el))continue;const t=text(el);if(t.length>30000)continue;const id=el.getAttribute('data-order-id')||[...t.matchAll(pattern)][0]?.[1]||[...(el.textContent||'').matchAll(pattern)][0]?.[1]||[...ids].find(id=>t.includes(id));if(!ids.has(id)||marked.has(id)||protectedIds.has(id))continue;let node=el,best=null;
  for(let depth=0;node&&node!==document.body&&depth<14;depth++,node=node.parentElement){const value=text(node);if(value.length>30000)break;const found=new Set([...value.matchAll(pattern)].map(m=>m[1]));if(found.size>1)break;const n=normalize(value);if(words.every(w=>n.includes(w)))best=node;}
  paintCard(best,id);
 }
 // Never paint product-only fallback rows: their Customer message footer may be a sibling.
 if(document.createElement&&state.cards.some(card=>card.getBoundingClientRect)){
  const pairs=[];for(const card of state.cards){if(!card.getBoundingClientRect)continue;const overlay=document.createElement('div');overlay.setAttribute('data-senz-overlay','true');overlay.style.cssText='position:fixed;pointer-events:none;z-index:2147483646;background:rgba(255,222,94,.15);outline:1px solid #f2df91;box-sizing:border-box;border-radius:4px;';document.body.append(overlay);state.overlays.push(overlay);pairs.push([card,overlay]);}
  state.position=()=>{for(const [card,overlay] of pairs){const r=card.getBoundingClientRect();overlay.style.left=r.left+'px';overlay.style.top=r.top+'px';overlay.style.width=r.width+'px';overlay.style.height=r.height+'px';overlay.style.display=r.width&&r.height?'block':'none';}};state.position();globalThis.addEventListener?.('scroll',state.position,true);globalThis.addEventListener?.('resize',state.position);
 }
 if(state.ranges.length)CSS.highlights.set('senz-missing-text',new Highlight(...state.ranges));
 if(typeof MutationObserver!=='undefined'){state.observer=new MutationObserver(()=>{if(!state.timer)state.timer=setTimeout(()=>highlightMissingNames(orderIds,product),250);});state.observer.observe(document.body,{childList:true,characterData:true,subtree:true});}
 return {highlighted:marked.size};
}

// Read-only, redacted structural snapshot for diagnosing real seller-page layouts.
function capturePageDebug(product){
 const keep=new Set(('order id number no customer message '+product).normalize('NFKC').toLowerCase().match(/[\p{L}]+/gu)||[]),aliases=new Map();let visited=0,truncated=false;
 const alias=value=>{if(!aliases.has(value))aliases.set(value,String(90000000000000000n+BigInt(aliases.size)));return aliases.get(value);};
 const redact=value=>String(value||'').replace(/\d{6,}/g,alias).replace(/[\p{L}\p{M}]+/gu,word=>keep.has(word.normalize('NFKC').toLowerCase())?word:'x').replace(/\p{Extended_Pictographic}/gu,'x');
 function walk(node){if(++visited>25000){truncated=true;return null;}if(node.nodeType===3)return {text:redact(node.nodeValue)};if(node.nodeType!==1)return null;
  const tag=node.tagName.toLowerCase();if(['script','style','noscript','svg','img','iframe','input','textarea','template'].includes(tag))return {tag,omitted:true};
  if(node.hasAttribute('data-senz-overlay'))return null;
  const css=getComputedStyle(node),rect=node.getBoundingClientRect(),out={tag,display:css.display,visibility:css.visibility,rect:[rect.x,rect.y,rect.width,rect.height].map(Math.round),children:[]};
  const id=node.getAttribute('data-order-id');if(id)out.orderId=alias(id);const role=node.getAttribute('role');if(role)out.role=redact(role);
  for(const child of node.childNodes){const item=walk(child);if(item)out.children.push(item);if(truncated)break;}
  if(node.shadowRoot)out.shadow=Array.from(node.shadowRoot.childNodes).map(walk).filter(Boolean);return out;
 }
 const tree=walk(document.body),rendered=redact(document.body?.innerText||'');
 return {host:location.hostname,path:location.pathname,ready:document.readyState,tree,renderedText:rendered,visited,truncated,activeHighlights:globalThis.__senzHighlight?.cards?.length||0};
}
