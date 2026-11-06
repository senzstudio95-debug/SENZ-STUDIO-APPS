const EPS=1e-6;
function splitFree(free,p){
 const next=[];
 for(const f of free){if(p.x>=f.x+f.w-EPS||p.x+p.w<=f.x+EPS||p.y>=f.y+f.h-EPS||p.y+p.h<=f.y+EPS){next.push(f);continue;}
 if(p.x>f.x+EPS)next.push({...f,w:p.x-f.x});if(p.x+p.w<f.x+f.w-EPS)next.push({...f,x:p.x+p.w,w:f.x+f.w-p.x-p.w});
 if(p.y>f.y+EPS)next.push({...f,h:p.y-f.y});if(p.y+p.h<f.y+f.h-EPS)next.push({...f,y:p.y+p.h,h:f.y+f.h-p.y-p.h});}
 return next.filter((a,i)=>!next.some((b,j)=>i!==j&&a.x>=b.x-EPS&&a.y>=b.y-EPS&&a.x+a.w<=b.x+b.w+EPS&&a.y+a.h<=b.y+b.h+EPS&&(j<i||a.x!==b.x||a.y!==b.y||a.w!==b.w||a.h!==b.h)));
}
function trial(items,W,H,gx,gy,rotate,scoreMode){
 let free=[{x:0,y:0,w:W+gx,h:H+gy}],positions=[],unplaced=[];
 for(const o of items){let best=null;
  for(const f of free)for(const turn of rotate?[false,true]:[false]){
   const w=(turn?o.h:o.w)+gx,h=(turn?o.w:o.h)+gy;if(w>f.w+EPS||h>f.h+EPS)continue;
   const short=Math.min(f.w-w,f.h-h),long=Math.max(f.w-w,f.h-h),score=scoreMode?[f.w*f.h-w*h,short,f.y,f.x,+turn]:[short,long,f.y,f.x,+turn];
   if(!best||score.some((v,i)=>v<best.score[i]-EPS&&score.slice(0,i).every((x,j)=>Math.abs(x-best.score[j])<=EPS)))best={x:f.x,y:f.y,w,h,rotate:turn,score};
  }
  if(!best){unplaced.push(o.id);continue;}positions.push({id:o.id,x:best.x,y:best.y,rotate:best.rotate,w:best.w-gx,h:best.h-gy});free=splitFree(free,best);
 }
 return {positions,unplaced,area:positions.reduce((s,p)=>s+p.w*p.h,0)};
}
function bestPack(items,W,H,gx,gy,rotate){
 const orders=[(a,b)=>b.w*b.h-a.w*a.h,(a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h),(a,b)=>b.h-a.h,(a,b)=>b.w-a.w,(a,b)=>a.w*a.h-b.w*b.h];let best=null;
 for(const order of orders.slice(0,items.length>500?2:5))for(const mode of items.length>500?[0]:[0,1]){
  const r=trial([...items].sort(order),W,H,gx,gy,rotate,mode);
  if(!best||r.positions.length===items.length||r.area>best.area+EPS||(Math.abs(r.area-best.area)<=EPS&&r.positions.length>best.positions.length))best=r;
  if(r.positions.length===items.length)return r;
 }return best;
}
export function packDense(items,area,{gapX=0,gapY=0,left=0,right=0,top=0,bottom=0,rotate=true,separate=false,column=false}={}){
 for(const n of [area.x,area.y,area.w,area.h,gapX,gapY,left,right,top,bottom])if(!Number.isFinite(n))throw Error('Enter valid dimensions, gaps and margins.');
 if([gapX,gapY,left,right,top,bottom].some(n=>n<0)||area.w<=0||area.h<=0)throw Error('Dimensions must be positive; gaps and margins cannot be negative.');
 const W=area.w-left-right,H=area.h-top-bottom;if(W<=0||H<=0)throw Error('Margins leave no usable space inside the box.');if(!items.length)throw Error('No unlocked objects match this selection.');
 for(const o of items)if(!(o.w>0&&o.h>0&&Number.isFinite(o.w)&&Number.isFinite(o.h)))throw Error('An object has invalid bounds.');
 const bands=separate?[...new Set(items.map(o=>o.color))].map(c=>items.filter(o=>o.color===c)):[items];let offset=0,positions=[],unplaced=[];
 for(const band of bands){const w=column?W-offset:W,h=column?H:H-offset;if(w<=0||h<=0){unplaced.push(...band.map(o=>o.id));continue;}const r=bestPack(band,w,h,gapX,gapY,rotate);
 positions.push(...r.positions.map(p=>({...p,x:p.x+area.x+left+(column?offset:0),y:p.y+area.y+top+(column?0:offset)})));unplaced.push(...r.unplaced);
 if(r.positions.length)offset+=Math.max(...r.positions.map(p=>column?p.x+p.w:p.y+p.h))+(column?gapX:gapY);
 }
 return {positions,unplaced,rotated:positions.filter(p=>p.rotate).length,utilization:positions.reduce((s,p)=>s+p.w*p.h,0)/(W*H),rows:new Set(positions.map(p=>p.y.toFixed(5))).size,columns:new Set(positions.map(p=>p.x.toFixed(5))).size};
}
export function placeGroup(group,pos){
 const cx=group.x+group.w/2,cy=group.y+group.h/2,nx=pos.x+(pos.rotate?group.h:group.w)/2,ny=pos.y+(pos.rotate?group.w:group.h)/2;
 return group.members.map(o=>{const dx=o.x+o.w/2-cx,dy=o.y+o.h/2-cy;return {...o,...(pos.rotate&&o.vectorBoxContainer?{frameGapX:o.frameGapY??.5,frameGapY:o.frameGapX??.5}:{}),x:nx+(pos.rotate?-dy:dx)-o.w/2,y:ny+(pos.rotate?dx:dy)-o.h/2,rotation:pos.rotate?((o.rotation||0)+90)%360:o.rotation};});
}
