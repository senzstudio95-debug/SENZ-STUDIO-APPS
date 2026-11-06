def patch(name,old,new,count=1):
 p=dist/name;s=p.read_text();assert s.count(old)==count,(name,old,s.count(old));p.write_text(s.replace(old,new))
patch('auto-arrange.js',"import {packItems}","import {packDense,placeGroup} from './dense-arrange.js';\nimport {packItems}")
patch('auto-arrange.js','<option value="compact">Compact rows</option>','<option value="dense">Force Fill · fill empty spaces</option><option value="compact">Compact rows</option>')
patch('auto-arrange.js','<div class="aa-margins">','<label class="aa-check"><input id="aa-rotate" type="checkbox" checked> Auto rotate 90° to fit (Force Fill)</label><div class="aa-margins">')
patch('auto-arrange.js',"grid:$('layout').value==='grid',", "grid:$('layout').value==='grid',dense:$('layout').value==='dense',rotate:$('rotate').checked,")
patch('auto-arrange.js',"const plan=packItems(groups,box,settings()),copies=[];for(const pos of plan.positions){const g=groups.find(g=>g.id===pos.id);for(const o of g.members)copies.push({...o,x:o.x+pos.x-g.x,y:o.y+pos.y-g.y});}","""const options=settings(),plan=(options.dense?packDense:packItems)(groups,box,options),byId=new Map(groups.map(g=>[g.id,g])),copies=plan.positions.flatMap(pos=>placeGroup(byId.get(pos.id),pos));
 if(!copies.length)throw Error('No objects fit, even with the allowed rotation. Enlarge the box or reduce the gap. Nothing was moved.');
 const remaining=plan.unplaced||[],parked=[];let parkY=box.y;const parkX=Math.max(box.x+box.w,...page.objects.filter(o=>!o.hidden).map(o=>{const b=inkBounds(o);return b.x+b.w;}))+Math.max(options.gapX,MM);
 for(const id of remaining){const g=byId.get(id);parked.push(...placeGroup(g,{x:parkX,y:parkY,rotate:false}));parkY+=g.h+options.gapY;}
""")
patch('auto-arrange.js',"for(const copy of copies){const o=page.objects.find(o=>o.id===copy.id);o.x=copy.x;o.y=copy.y;}","for(const copy of [...copies,...parked]){const o=page.objects.find(o=>o.id===copy.id);o.x=copy.x;o.y=copy.y;o.rotation=copy.rotation;}")
patch('auto-arrange.js',"${$('separate').checked?' · separated by color':''}`);", "${$('separate').checked?' · separated by color':''}${options.dense?` · ${plan.rotated} groups rotated · ${(plan.utilization*100).toFixed(1)}% used${remaining.length?` · ${parked.length} remaining objects ${apply?'placed':'will be placed'} outside box`:''}`:''}`);")
patch('auto-arrange.js',"Original sizes are preserved. Preview before arranging.","Force Fill tries empty spaces and 90° rotation. Original sizes and gaps are preserved. Preview before arranging.")
patch('auto-arrange.js',"x.libraryPairId&&'p:'+x.libraryPairId].filter(Boolean)","x.libraryPairId&&'p:'+x.libraryPairId,x.vectorBoxGroup&&'v:'+x.vectorBoxGroup].filter(Boolean)")
patch('auto-arrange.js',"links.has('p:'+x.libraryPairId))", "links.has('p:'+x.libraryPairId)||links.has('v:'+x.vectorBoxGroup))")
patch('auto-arrange.js',"o.rotation=copy.rotation;", "o.rotation=copy.rotation;if(o.vectorBoxContainer){o.frameGapX=copy.frameGapX;o.frameGapY=copy.frameGapY;}")
