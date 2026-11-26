(function(root){
"use strict";
const T=root.Tactics,G=T.Graphics={};
G.pack=view=>view.engine.db.graphics;
G.spellEffect=function(view,spell,stage,progress,x,y,scale,facing,opacity,critical,ground,bounds){
 const p=G.pack(view),part=spell&&spell[stage],atlas=part&&p&&p.spells&&p.spells.atlases&&p.spells.atlases[part.atlas];if(!atlas||!Array.isArray(part.frames)||!part.frames.length||!Number.isFinite(progress)||!Number.isFinite(scale)||scale<=0)return false;
 const index=part.frames[Math.min(part.frames.length-1,Math.floor(T.clamp(progress,0,1)*part.frames.length))],r=atlas.rects&&atlas.rects[index],original=view.image(atlas.path);if(!r||!original||![r.x,r.y,r.w,r.h].every(Number.isFinite)||r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>original.width||r.y+r.h>original.height)return false;
 if((r.ox!==undefined&&!Number.isFinite(r.ox))||(r.oy!==undefined&&!Number.isFinite(r.oy)))return false;
 const key=atlas.path+':'+index+':'+(spell.tint||'')+':'+JSON.stringify(atlas.key||null),cache=view.spellImages||(view.spellImages={});let bitmap=cache[key];
 if(!bitmap){bitmap=document.createElement('canvas');bitmap.width=r.w;bitmap.height=r.h;const ctx=bitmap.getContext('2d');ctx.drawImage(original,r.x,r.y,r.w,r.h,0,0,r.w,r.h);const pixels=ctx.getImageData(0,0,bitmap.width,bitmap.height),data=pixels.data,tint=/^#[0-9a-f]{6}$/i.test(spell.tint||'')?parseInt(spell.tint.slice(1),16):null,keyColor=atlas.key==='corner'?Array.from(data.slice(data.length-4,data.length-1)):Array.isArray(atlas.key)?atlas.key:[0,128,255];
  for(let i=0;i<data.length;i+=4){if(data[i]===keyColor[0]&&data[i+1]===keyColor[1]&&data[i+2]===keyColor[2]){data[i+3]=0;continue;}if(tint!==null&&data[i+3]){const light=Math.max(data[i],data[i+1],data[i+2])/255;data[i]=(tint>>16&255)*light;data[i+1]=(tint>>8&255)*light;data[i+2]=(tint&255)*light;}}
  ctx.putImageData(pixels,0,0);cache[key]=bitmap;
 }
 const c=view.ctx,s=scale*(part.scale||1),ox=r.ox===undefined?r.w/2:r.ox,oy=r.oy===undefined?(part.anchor==='ground'?r.h:r.h/2):r.oy;c.save();c.globalAlpha=T.clamp(opacity,0,1);c.imageSmoothingEnabled=false;c.translate(x+(bounds&&facing<0?bounds.w:0),y);c.scale(part.mirror===false?1:facing,1);if(bounds)c.drawImage(bitmap,0,0,r.w,r.h,0,0,bounds.w,bounds.h);else c.drawImage(bitmap,0,0,r.w,r.h,-ox*s,-oy*s,r.w*s,r.h*s);c.restore();return true;
};
G.itemIconAsset=function(view,item){
 const pack=G.pack(view),icons=pack&&pack.itemIcons,d=item&&view.engine.itemData(item);if(!icons||!d)return null;
 const group=item.kind==='weapon'?'weapons':'items',exact=icons[group]&&icons[group][item.id];
 return exact||(item.kind==='weapon'?icons.categories&&icons.categories[d.staff?'staff':d.category]:icons.effects&&icons.effects[d.effect])||null;
};
G.itemIcon=function(view,item,x,y,size){
 const asset=G.itemIconAsset(view,item),image=asset&&view.image(asset.path),r=asset&&asset.rect;if(!image||!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>image.width||r[1]+r[3]>image.height||!Number.isFinite(size)||size<=0)return false;
 let bitmap=image;
 if(Array.isArray(asset.key)&&asset.key.length===3&&asset.key.every(Number.isFinite)){
  const key=asset.path+':'+asset.key.join(','),cache=view.iconImages||(view.iconImages={});bitmap=cache[key];
  if(!bitmap){bitmap=document.createElement('canvas');bitmap.width=image.width;bitmap.height=image.height;const ctx=bitmap.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height),data=pixels.data;
   for(let i=0;i<data.length;i+=4)if(data[i]===asset.key[0]&&data[i+1]===asset.key[1]&&data[i+2]===asset.key[2])data[i+3]=0;
   ctx.putImageData(pixels,0,0);cache[key]=bitmap;
  }
 }
 const c=view.ctx;c.save();c.imageSmoothingEnabled=false;c.drawImage(bitmap,r[0],r[1],r[2],r[3],Math.round(x),Math.round(y),size,size);c.restore();return true;
};
G.uiReady=function(view,names){const p=G.pack(view),ui=p&&p.ui;if(!ui)return false;let ready=true;names.forEach(name=>{const asset=ui[name];if(!asset||!view.image(asset.path))ready=false;});return ready;};
G.ui=function(view,name,x,y,w,h,flip){
 const p=G.pack(view),asset=p&&p.ui&&p.ui[name],image=asset&&view.image(asset.path);if(!image||!(w>0&&h>0))return false;
 const r=asset.rect||[0,0,image.width,image.height],c=view.ctx;c.save();c.imageSmoothingEnabled=true;c.translate(flip?x+w:x,y);if(flip)c.scale(-1,1);
 if(asset.border){
  const b=asset.border,scale=Math.min(1,w/r[2],h/r[3]),left=b[0]*scale,right=b[1]*scale,top=b[2]*scale,bottom=b[3]*scale;
  const sx=[r[0],r[0]+b[0],r[0]+r[2]-b[1]],sy=[r[1],r[1]+b[2],r[1]+r[3]-b[3]],sw=[b[0],r[2]-b[0]-b[1],b[1]],sh=[b[2],r[3]-b[2]-b[3],b[3]],dx=[0,left,w-right],dy=[0,top,h-bottom],dw=[left,w-left-right,right],dh=[top,h-top-bottom,bottom];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(sw[col]>0&&sh[row]>0&&dw[col]>0&&dh[row]>0)c.drawImage(image,sx[col],sy[row],sw[col],sh[row],dx[col],dy[row],dw[col],dh[row]);
 }else c.drawImage(image,r[0],r[1],r[2],r[3],0,0,w,h);
 c.restore();return true;
};
G.art=(view,u)=>{const p=G.pack(view),c=view.engine.db.classes[u.classId]||{};return p&&p.units&&p.units[c.art];};
G.clip=(view,u,mode)=>{const art=G.art(view,u),p=G.pack(view);return art&&p.clips&&p.clips[(art.clips||{})[mode||"normal"]||(art.clips||{}).normal];};
G.bitmap=function(view,path,u,flash,paletteMode){
 const original=view.image(path);if(!original)return null;const pack=G.pack(view),colors=u&&u.customColors?u.colors:null,team=paletteMode==="map"&&u?(u.acted?0:u.team):1;
 const id=path+":"+team+":"+JSON.stringify(colors)+":"+!!flash;view.resourceImages=view.resourceImages||{};if(view.resourceImages[id])return view.resourceImages[id];
 const canvas=document.createElement("canvas");canvas.width=original.width;canvas.height=original.height;const c=canvas.getContext("2d");c.drawImage(original,0,0);
 const im=c.getImageData(0,0,canvas.width,canvas.height),d=im.data;const key=!path.startsWith("img/astra/fe8/")&&d[3]>0&&d[0]<24&&d[1]<150&&d[2]>200?[d[0],d[1],d[2]]:null;
 const replacements={};if(pack.palette&&paletteMode==="map")pack.palette.source.forEach((rgb,i)=>{const to=(pack.palette.teams[team]||pack.palette.source)[i]||rgb;replacements[(rgb[0]<<16)|(rgb[1]<<8)|rgb[2]]=to;});
 for(let i=0;i<d.length;i+=4){if(key&&d[i]===key[0]&&d[i+1]===key[1]&&d[i+2]===key[2]){d[i+3]=0;continue;}if(!d[i+3])continue;
  if(flash){d[i]=255;d[i+1]=248;d[i+2]=230;continue;}
  const replacement=replacements[(d[i]<<16)|(d[i+1]<<8)|d[i+2]];if(replacement){d[i]=replacement[0];d[i+1]=replacement[1];d[i+2]=replacement[2];}
  if(colors){const blue=d[i+2]>d[i]*1.25&&d[i+2]>d[i+1]*1.1;if(blue&&colors.cloth){const value=parseInt(colors.cloth.slice(1),16),light=Math.max(d[i],d[i+1],d[i+2])/240;d[i]=Math.min(255,(value>>16&255)*light);d[i+1]=Math.min(255,(value>>8&255)*light);d[i+2]=Math.min(255,(value&255)*light);}}
 }
 c.putImageData(im,0,0);if(Object.keys(view.resourceImages).length>160)view.resourceImages={};view.resourceImages[id]=canvas;return canvas;
};
G.layer=function(view,image,rect,transform,x,y,scale,facing){
 if(!image||!rect)return;const c=view.ctx,s=scale*(transform.zoom===undefined?1:transform.zoom);
 c.save();c.translate(x+(transform.x||0)*scale*facing,y+(transform.y||0)*scale);c.scale(facing*(transform.mirror?-1:1)*s,s);c.rotate(-(transform.angle||0)*Math.PI/180);c.globalAlpha=transform.opacity===undefined?1:transform.opacity;c.globalCompositeOperation=transform.blend===1?"lighter":"source-over";
 c.imageSmoothingEnabled=false;c.drawImage(image,rect.x,rect.y,rect.w,rect.h,-rect.ox,-rect.oy,rect.w,rect.h);c.restore();
};
G.battle=function(view,u,x,y,scale,facing,pose,flash){
 if((view.engine.db.classes[u.classId]||{}).sprite)return false;
 const art=G.art(view,u);if(!art)return false;const pack=G.pack(view),chosen=view.resourceClip;
 const clip=chosen&&chosen.unit===u?chosen.clip:art.idleClip?pack.clips[art.idleClip]:null;
 if(clip){const frame=clip.frames[Math.max(0,Math.min(clip.frames.length-1,Math.floor(pose||0)))];
  (frame||[]).forEach(layer=>{const atlas=pack.atlases[layer.atlas];if(!atlas)return;const img=G.bitmap(view,atlas.path,u,flash,"battle");G.layer(view,img,atlas.rects[layer.rect],layer,x,y-24*scale,scale,facing);});
 }else{
  const idle=art.idle;if(!idle){if(art.map)G.map(view,u,x,y,16*scale,0,flash);return true;}const image=G.bitmap(view,idle.path,u,flash,"battle");if(!image)return true;
  const frame=Math.floor(view.frame/30)%Math.max(1,(idle.frames||[0]).length),index=(idle.frames||[0])[frame],columns=idle.columns||3;
  G.layer(view,image,{x:index%columns*192,y:Math.floor(index/columns)*192+4,w:192,h:188,ox:96,oy:116},{},x,y,scale,facing);
 }
 return true;
};
G.map=function(view,u,x,y,size,pose,flash){
 if(u.graphic)return false;
 const art=G.art(view,u);if(!art)return false;const moving=pose>0,entry=moving&&art.walk?art.walk:art.map;if(!entry)return true;
 const path=entry.teamPaths&&(entry.teamPaths[u.acted?0:u.team]||entry.teamPaths[1])||entry.path;
 const image=G.bitmap(view,path,u,flash,entry.teamPaths?"fe8map":"map");if(!image)return true;
 const scale=size/16,pattern=moving&&art.walk?Math.floor(pose)%4:[0,1,2,1][Math.floor(view.frame/16)%4],width=entry.width,height=entry.height;
 const direction=u.direction||2,row=moving&&art.walk?Math.max(0,Math.min(3,(direction-2)/2)):view.selected()===u?2:0;
 view.ctx.save();view.ctx.imageSmoothingEnabled=false;view.ctx.drawImage(image,pattern*width,row*height,width,height,x-width*scale/2,y-(entry.anchorY||height)*scale,width*scale,height*scale);view.ctx.restore();return true;
};
// Fit the visible bust, not the transparent margins of its sheet. Compose facial
// features before measuring so eyes and mouth keep their original alignment.
G.alphaBounds=function(data,w,h){
 if(!data||!Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0||data.length<w*h*4)return null;
 let left=w,top=h,right=-1,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 return right<0?null:{x:left,y:top,w:right-left+1,h:bottom-top+1};
};
G.portraitFit=function(rect,x,y,w,h){
 if(!rect||![rect.w,rect.h,w,h].every(n=>Number.isFinite(n)&&n>0)||![x,y].every(Number.isFinite))return null;
 const scale=Math.min(w/rect.w,h/rect.h);return {x:x+(w-rect.w*scale)/2,y:y+h-rect.h*scale,w:rect.w*scale,h:rect.h*scale};
};
G.portraitFrame=function(view,image,rect,features){
 view.portraitFrames=view.portraitFrames||new WeakMap();let entries=view.portraitFrames.get(image);
 if(!entries){entries={};view.portraitFrames.set(image,entries);}const key=JSON.stringify([rect,features||[]]);if(entries[key])return entries[key];
 const canvas=document.createElement('canvas');canvas.width=rect.w;canvas.height=rect.h;const c=canvas.getContext('2d');c.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);
 (features||[]).forEach(f=>c.drawImage(image,f.sx,f.sy,f.w,f.h,f.x,f.y,f.w,f.h));
 return entries[key]={image:canvas,bounds:G.alphaBounds(c.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)};
};
G.drawPortrait=function(view,frame,x,y,w,h){
 const r=frame.bounds,d=G.portraitFit(r,x,y,w,h);if(!d)return;
 const c=view.ctx;c.save();c.imageSmoothingEnabled=false;c.drawImage(frame.image,r.x,r.y,r.w,r.h,d.x,d.y,d.w,d.h);c.restore();
};
G.face=function(view,u,x,y,w,h){
 const p=G.pack(view),a=p&&p.faces&&(p.faces[u.faceKey||u.actorId]||p.faces.default);if(!a||u.face&&!a.fe8Source)return false;const img=G.bitmap(view,a.path,u,false,"face");if(!img)return true;
 G.drawPortrait(view,G.portraitFrame(view,img,{x:0,y:0,w:a.width,h:a.height},a.features),x,y,w,h);return true;
};
G.background=function(view,m){
 const pack=G.pack(view),back=pack&&pack.maps[view.engine.s.map.id];if(!back)return false;const img=view.image(back.path);if(!img)return true;const c=view.ctx;c.imageSmoothingEnabled=false;
 c.drawImage(img,view.offset.x*back.cell,view.offset.y*back.cell,m.cols*back.cell,m.rows*back.cell,m.x,m.y,m.cols*m.tile,m.rows*m.tile);return true;
};
// Native MZ event images: the editor owns their appearance, the commands own their behavior.
G.eventFrame=function(image,sheet,phase,tileWidth,tileHeight){
 if(!image||!sheet||!(sheet.width>0&&sheet.height>0))return null;
 if(image.tileId>0){const id=image.tileId,tw=tileWidth||48,th=tileHeight||48;if(!Number.isInteger(id)||id>=1024)return null;return {sx:(Math.floor(id/128)%2*8+id%8)*tw,sy:Math.floor(id%128/8)*th,sw:tw,sh:th,base:tw,object:true};}
 if(!image.characterName)return null;
 const name=image.characterName,big=/^[!$]*\$/.test(name),sw=sheet.width/(big?3:12),sh=sheet.height/(big?4:8),index=big?0:T.clamp(Number(image.characterIndex)||0,0,7),pattern=T.clamp(Number.isFinite(phase)?phase:Number(image.pattern)||0,0,2),row=[2,4,6,8].indexOf(image.direction);
 return {sx:(index%4*3+pattern)*sw,sy:(Math.floor(index/4)*4+Math.max(0,row))*sh,sw,sh,base:tileWidth||48,object:name.indexOf('!')===0};
};
G.events=function(view,m,above){
 const e=view.engine,t=m.tile,map=e.s.map;
 (map.events||[]).filter(event=>!e.unit(event.id)&&!(map.templates||{})[event.id]&&e.inside(event.x,event.y)&&e.visible(event.x,event.y)).sort((a,b)=>a.y-b.y||a.id-b.id).forEach(event=>{
  const page=e.eventPage(event),img=page&&page.image;if(!img||!!(page.priorityType===2)!==above)return;
  let path;if(img.tileId){const set=(e.db.tilesets||[])[map.tilesetId],name=set&&set.tilesetNames[5+Math.floor(img.tileId/256)];if(name)path='img/tilesets/'+name+'.png';}else if(img.characterName)path='img/characters/'+img.characterName+'.png';
  if(!path)return;const bitmap=view.image(path),frame=G.eventFrame(img,bitmap,page.stepAnime?[0,1,2,1][Math.floor(view.frame/16)%4]:undefined,map.tileWidth,map.tileHeight);if(!frame)return;
  const scale=t/frame.base,w=frame.sw*scale,h=frame.sh*scale,x=m.x+(event.x-view.offset.x+.5)*t-w/2,y=m.y+(event.y-view.offset.y+1)*t-h-(frame.object?0:6*scale);
  view.ctx.save();view.ctx.imageSmoothingEnabled=false;view.ctx.drawImage(bitmap,frame.sx,frame.sy,frame.sw,frame.sh,x,y,w,h);view.ctx.restore();
 });
};
G.battleBackground=function(view,x,y,w,h){const p=G.pack(view),src=p&&p.battleBackground;if(!src)return false;const image=view.image(src);if(image){view.ctx.imageSmoothingEnabled=false;view.ctx.drawImage(image,0,0,image.width,Math.min(image.height,160),x,y,w,h);}return true;};
G.platform=function(view,x,y,scale,right){const p=G.pack(view),src=p&&p.platform;if(!src)return;const image=G.bitmap(view,src,null,false,"platform");if(!image)return;const c=view.ctx;c.save();c.translate(x,y);c.scale(right?-scale:scale,scale);c.imageSmoothingEnabled=false;c.drawImage(image,-image.width/2,-15);c.restore();};
})(typeof globalThis!=="undefined"?globalThis:this);
