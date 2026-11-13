// Reader-only symbols: compact ink-relative size and spacing, matching name stickers.
export function readerSymbolLayout(lines,ctx,o){
 let widest=0;
 for(const line of lines){
  let ascent=0,descent=0;
  const measure=p=>{ctx.font=`${o.italic?'italic ':''}${o.bold?'700':'400'} ${p.px}px "${p.font}", "Noto Sans JP", sans-serif`;return ctx.measureText(p.text);};
  for(const p of line.parts)if(!p.logo&&p.text.trim()){const m=measure(p);ascent=Math.max(ascent,m.actualBoundingBoxAscent||p.px*.75);descent=Math.max(descent,m.actualBoundingBoxDescent||0);}
  const inkHeight=ascent+descent||o.size*4/3,gap=inkHeight*.14;
  let x=0;
  for(let i=0;i<line.parts.length;i++){
   const p=line.parts[i],previous=line.parts[i-1],next=line.parts[i+1];
   if(p.logo){if(i)x+=gap;p.x=x;p.symbolScale=inkHeight*.80/p.logo.height;p.width=p.logo.width*p.symbolScale;p.px=Math.max(p.width,inkHeight*.80);p.symbolTop=-ascent+inkHeight*.15;x+=p.width;continue;}
   if(previous?.logo){p.text=p.text.trimStart();if(p.text)x+=gap;}
   if(next?.logo)p.text=p.text.trimEnd();
   const m=measure(p);if(previous?.logo)x+=Math.max(0,m.actualBoundingBoxLeft||0);
   p.x=x;p.width=next?.logo?Math.max(0,m.actualBoundingBoxRight??m.width):m.width;x+=p.width;
  }
  line.width=x;widest=Math.max(widest,x);
 }
 return widest;
}
