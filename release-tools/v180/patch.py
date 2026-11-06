def patch(name,old,new,count=1):
 p=dist/name;s=p.read_text();assert s.count(old)==count,(name,old,s.count(old));p.write_text(s.replace(old,new))
# Keep the source artwork editable and store the frame paint separately.
patch('editor.js',"export function textMarkup(o,interactive=false){",'''export function vectorBoxMarkup(o){
 if(!o.frameEnabled)return '';
 const f=frameBounds(o);
 return `<rect data-vector-box="true" x="${f.x+f.t/2}" y="${f.y+f.t/2}" width="${f.w-f.t}" height="${f.h-f.t}" fill="none" stroke="${esc(o.frameColor||o.color||'#000000')}" stroke-width="${f.t}"/>`;
}
export function textMarkup(o,interactive=false){''')
p=dist/'editor.js';s=p.read_text();start=s.index('f=frameBounds(o);const box=');end=s.index(";\n",start)
s=s[:start]+"box=vectorBoxMarkup(o)"+s[end:];p.write_text(s)
patch('editor.js'," if(o.flipX||o.flipY)inner=", " if(o.type!=='text')inner=vectorBoxMarkup(o)+inner;\n if(o.flipX||o.flipY)inner=")
patch('editor.js',"if(o.locked)continue;has=true;", "if(o.locked)continue;if((o.frameEnabled||properties.frameEnabled)&&!o.frameColor)o.frameColor=o.color||'#000000';has=true;")
patch('editor.js'," render(){\n  this.syncEmojiMode(this.page);", " render(){\n  for(const o of this.page.objects)if(o.frameEnabled&&!o.frameColor)o.frameColor=o.color||'#000000';\n  this.syncEmojiMode(this.page);")
patch('core.js',"  o.locked=!!o.locked;", "  if(o.frameEnabled){o.frameColor=typeof o.frameColor==='string'?o.frameColor:(o.color||'#000000');}\n  for(const [k,d,max] of [['frameGapX',.5,50],['frameGapY',.5,50],['frameThickness',.25,10]])o[k]=Number.isFinite(o[k])?clamp(o[k],k==='frameThickness'?.05:0,max):d;\n  o.locked=!!o.locked;")
patch('vector-cache.js',"const b=getVector(o)?.bounds||", "const b=(o.type==='text'?getVector(o)?.bounds:null)||")
patch('object-transform.js',"const b=o.type==='text'?(o.frameEnabled?frameBounds(o):getVector(o)?.bounds)||{x:0,y:0,w:o.w,h:o.h}:{x:0,y:0,w:o.w,h:o.h};", "const b=(o.frameEnabled?frameBounds(o):o.type==='text'?getVector(o)?.bounds:null)||{x:0,y:0,w:o.w,h:o.h};")
patch('object-transform.js',"if(o.type==='text'&&o.frameEnabled&&d.vector)","if(o.frameEnabled)")
patch('vector-box.js',"o.type==='text'&&o.frameEnabled", "o.frameEnabled")
patch('vector-box.js',"color:o.color", "color:o.frameColor||o.color||'#000000'")
patch('vector-box.js',"dx=f.x+f.w/2-o.w/2,dy=f.y+f.h/2-o.h/2", "dx=(f.x+f.w/2-o.w/2)*(o.flipX?-1:1),dy=(f.y+f.h/2-o.h/2)*(o.flipY?-1:1)")
patch('quick-text-controls.js',"rotation:o.rotation||0,color:o.color,outline:true", "rotation:o.rotation||0,color:o.frameColor||o.color||'#000000',outline:true")
patch('focus-mode.js',"boxToggle.disabled=!o||o.type!=='text'||o.locked", "boxToggle.disabled=!o||o.locked")
patch('app.js',"toInches(style[k]??d);$('#'+id).disabled=!!o&&o.type!=='text';}$('#frame-settings').hidden=!style.frameEnabled;", "toInches((k==='textWeight'?style:o||style)[k]??d);$('#'+id).disabled=!!o&&(o.locked||(k==='textWeight'&&o.type!=='text'));}$('#frame-settings').hidden=!(o||style).frameEnabled;")
patch('app.js',"$('#text-frame').checked=!!style.frameEnabled;$('#text-frame').disabled=!!o&&o.type!=='text';", "$('#text-frame').checked=!!(o||style).frameEnabled;$('#text-frame').disabled=!!o?.locked;")
# Image rendering normally skips size in its cache and stretches immediate rects.
# Framed images must regenerate both dimensions and exclude the frame from stretching.
patch('render-cache.js',"o.type==='image'&&(key==='w'||key==='h')", "o.type==='image'&&!o.frameEnabled&&(key==='w'||key==='h')")
patch('render-cache.js',"child.setAttribute('width',o.w);", "if(child.hasAttribute('data-vector-box'))continue;child.setAttribute('width',o.w);")
