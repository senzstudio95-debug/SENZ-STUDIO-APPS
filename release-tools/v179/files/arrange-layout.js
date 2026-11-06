// Deterministic shelf packing. Never resize or partially apply an overflowing layout.
export function packItems(items,area,{gapX=0,gapY=0,left=0,right=0,top=0,bottom=0,column=false,grid=false,separate=false}={}){
 for(const n of [area.x,area.y,area.w,area.h,gapX,gapY,left,right,top,bottom])if(!Number.isFinite(n))throw Error('Enter valid box dimensions, spacing and margins.');
 if([gapX,gapY,left,right,top,bottom].some(n=>n<0)||area.w<=0||area.h<=0)throw Error('Dimensions must be positive; spacing and margins cannot be negative.');
 const width=area.w-left-right,height=area.h-top-bottom;if(width<=0||height<=0)throw Error('Margins leave no usable space inside the box.');
 if(!items.length)throw Error('No unlocked objects match this selection.');
 const ordered=separate?[...new Set(items.map(x=>x.color))].flatMap(c=>items.filter(x=>x.color===c)):items;
 const maxW=Math.max(...items.map(x=>x.w)),maxH=Math.max(...items.map(x=>x.h));
 const limit=column?height:width,depth=column?width:height,gap=column?gapY:gapX,crossGap=column?gapX:gapY;
 let cursor=0,cross=0,band=0,bands=1,inBand=0,maxInBand=0,previous=null;const positions=[];
 for(const item of ordered){
  if(!(item.w>0&&item.h>0&&Number.isFinite(item.w)&&Number.isFinite(item.h)))throw Error('An object has invalid bounds.');
  const w=grid?maxW:item.w,h=grid?maxH:item.h,along=column?h:w,across=column?w:h;
  if(along>limit+1e-6||across>depth+1e-6)throw Error('An object is larger than the box. Enlarge the box or reduce margins.');
  if(inBand&&(cursor+along>limit+1e-6||(separate&&previous!==item.color))){cross+=band+crossGap;cursor=0;band=0;maxInBand=Math.max(maxInBand,inBand);inBand=0;bands++;}
  if(cross+across>depth+1e-6)throw Error('Not enough space. Enlarge the box or reduce spacing. No objects were moved.');
  positions.push({id:item.id,x:area.x+left+(column?cross:cursor),y:area.y+top+(column?cursor:cross)});
  cursor+=along+gap;band=Math.max(band,across);inBand++;previous=item.color;
 }
 maxInBand=Math.max(maxInBand,inBand);return {positions,rows:column?maxInBand:bands,columns:column?bands:maxInBand};
}
