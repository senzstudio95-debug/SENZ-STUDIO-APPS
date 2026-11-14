// Reader-only symbols: compact ink-relative size and spacing, matching name stickers.
export function readerSymbolLayout(lines,ctx,o){
 let widest=0;
 for(const line of lines){
  let ascent=0,descent=0;
  const measure=p=>{ctx.font=`${o.italic?'italic ':''}${o.bold?'700':'400'} ${p.px}px "${p.font}", "Noto Sans JP", sans-serif`;return ctx.measureText(p.text);};
  for(const p of line.parts)if(!p.logo&&p.text.trim()){const m=measure(p);ascent=Math.max(ascent,m.actualBoundingBoxAscent||p.px*.75);descent=Math.max(descent,m.actualBoundingBoxDescent||0);}
  const inkHeight=ascent+descent||o.size*4/3,gap=inkHeight*.08;
  let x=0;
  for(let i=0;i<line.parts.length;i++){
   const p=line.parts[i],previous=line.parts[i-1],next=line.parts[i+1];
   if(p.logo){if(i)x+=gap;const symbol=p.text.replace(/[\ufe0e\ufe0f]/g,''),ratio=symbol==='🎀'?.72:symbol==='🦋'?.86:.80,top=symbol==='🎀'||symbol==='🦋'?.18:.14;p.symbolScale=inkHeight*ratio/p.logo.height;p.width=p.logo.width*p.symbolScale;p.px=Math.max(p.width,inkHeight*ratio);p.x=x;p.symbolTop=-ascent+inkHeight*top;x+=p.width;continue;}
   if(previous?.logo){p.text=p.text.trimStart();if(p.text)x+=inkHeight*.02;}
   if(next?.logo)p.text=p.text.trimEnd();
   const m=measure(p);if(previous?.logo)x+=Math.max(0,m.actualBoundingBoxLeft||0);
   p.x=x;p.width=next?.logo?Math.max(0,m.actualBoundingBoxRight??m.width):m.width;x+=p.width;
  }
  line.width=x;widest=Math.max(widest,x);
 }
 return widest;
}

