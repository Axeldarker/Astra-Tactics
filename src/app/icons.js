// Astra Editor · imágenes: iconos pixel-art propios (casas, cofres, puertas…), iconos del proyecto
// (IconSet de MZ e iconos del paquete de gráficos), sprites de mapa recoloreados por equipo y retratos.
"use strict";
(function(){
const Astra=window.Astra,T=window.Tactics;
// 16×16. Cada letra es un color de PAL; "." es transparente.
const PAL={k:"#1b1420",r:"#b8433a",R:"#e5735f",w:"#efdcb0",W:"#c9a878",b:"#6b3f22",B:"#a86b3a",n:"#d9995a",y:"#ffe27a",
 g:"#f6cf4a",G:"#b5862c",s:"#a9b0b8",S:"#6c727c",u:"#3f7fd6",U:"#8cc0ff",e:"#d6474f",E:"#ff8a8a",v:"#4fae5b",p:"#d6474f",P:"#ff8a8a",o:"#f4f4f4",O:"#9fb0a8",V:"#86d46a"};
const HOUSE=["................",".......kk.......","......kRRk......",".....kRrrRk.....","....kRrrrrRk....","...kRrrrrrrRk...","..kRrrrrrrrrRk..",".kRrrrrrrrrrrRk.",
 "kkkkkkkkkkkkkkkk",".kwwwwwwwwwwwwk.",".kwkkkwwwwkkkwk.",".kwkykwwwwkbkwk.",".kwkkkwwwwkbkwk.",".kWWWWWWWWkbkWk.",".kkkkkkkkkkkkkk.","................"];
const swap=(rows,map)=>rows.map(r=>r.replace(/./g,c=>map[c]||c));
const paint=(rows,points,ch)=>rows.map((r,y)=>r.split("").map((c,x)=>points.some(p=>p[0]===x&&p[1]===y)?ch:c).join(""));
const FLAG=["..kk............","..kykkkkkkkk....","..kbkeeeeeeek...","..kbkeeggeeek...","..kbkeggggeek...","..kbkeeggeeek...","..kbkeeeeeeek...","..kbkeeekeeek...",
 "..kbkkkk.kkkk...","..kbk...........","..kbk...........","..kbk...........",".kSSSSSk........","kSsssssSk.......","kkkkkkkkk.......","................"];
const HELMET=[".......pp.......","......ppPp......",".....kkkkkk.....","....kssssssk....","...ksUssssssk...","...ksUssssssk...","...kssssssssk...","...kkkkkkkkkk...",
 "...ksk.kk.ksk...","...kssskksssk...","...kSSSkkSSSk...","....kSSkkSSk....",".....kkkkkk.....","................","................","................"];
Astra.PIXEL={
 village:HOUSE,
 shop:paint(swap(HOUSE,{r:"u",R:"U"}),[[3,11],[4,11],[3,10],[4,10],[5,10],[3,12],[5,11],[5,12],[4,12]],"g"),
 chest:["................","................","................","..kkkkkkkkkkkk..",".kBnnnnnnnnnnBk.",".kBBBBBBBBBBBBk.",".kggggggggggggk.",".kGGGGkkkkGGGGk.",
  ".kbbbbkggkbbbbk.",".kBBBBBkkBBBBBk.",".kBBBBBBBBBBBBk.",".kbbbbbbbbbbbbk.",".kGGGGGGGGGGGGk.",".kkkkkkkkkkkkkk.","................","................"],
 door:["................",".....kkkkkk.....","...kkSssssSkk...","..kSskkkkkksSk..","..kskbBBBBbksk..",".kSskbBnnBbksSk.",".kSskbBnnBbksSk.",".kSskbBnnBbksSk.",
  ".kSskbBnngbksSk.",".kSskbBnnBbksSk.",".kSskbBnnBbksSk.",".kSskbBnnBbksSk.",".kSskbBnnBbksSk.",".kSSkbbbbbbkSSk.","kkkkkkkkkkkkkkkk","................"],
 goal:FLAG,
 deploy:swap(FLAG,{e:"u",g:"U"}),
 enemy:HELMET,
 ally:swap(HELMET,{p:"u",P:"U"}),
 // paleta: elegir, terreno y borrar
 select:["................","..kk............","..kyk...........","..kyyk..........","..kyyyk.........","..kyyyyk........","..kyyyyyk.......","..kyyyyyyk......","..kyyyyyyyk.....","..kyyyyykkkk....","..kyykyyk.......","..kyk.kyyk......","..kk..kyyk......",".......kyyk.....",".......kkk......","................"],
 terrain:["................","................","..kkkkkkkkkkkk..",".kVVvVVVvVVvVVk.",".kvVVVvVVVVvVvk.",".kVvVVVVvVVVVVk.",".kvvvvvvvvvvvvk.",".kBBnBBBnBBBnBk.",".kBbBBnBBbBBBBk.",".kBBBbBBBBnBbBk.",".kbBBBBbBBBBBbk.",".kkkkkkkkkkkkkk.","................","................","................","................"],
 erase:["................","..kk........kk..",".kRrk......kRrk.",".krrrk....krrrk.","..krrrk..krrrk..","...krrrkkrrrk...","....krrrrrrk....",".....krrrrk.....",".....krrrrk.....","....krrrrrrk....","...krrrkkrrrk...","..krrrk..krrrk..",".krrrk....krrrk.",".krrk......krrk.","..kk........kk..","................"],
 // tipos de arma (galería), blancos para ir sobre un cuadro verde como en FE Essentials
 wsword:["................", "..............oo", ".............ooO", "............ooO.", "...........ooO..", "..........ooO...", ".........ooO....", "........ooO.....", ".......ooO......", "..o...ooO.......", "..oo.ooO........", "...ooOO.........", "....oo..........", "...O.oo.........", "..O...o.........", "................"],
 wlance:["...........oooo.", "............ooo.", "...........o.oo.", "..........O...o.", ".........O......", "........O.......", ".......O........", "......O.........", ".....O..........", "....O...........", "...O............", "..O.............", ".O..............", "O...............", "................", "................"],
 waxe:["................", "........oooo....", ".......oooooo...", "......oooOoooo..", "......ooO.oooo..", ".......O...oo...", "......O.........", ".....O..........", "....O...........", "...O............", "..O.............", ".O..............", "................", "................", "................", "................"],
 whandaxe:["................", "................", ".........ooo....", "........ooooo...", "........ooOooo..", ".........O.oo...", "........O.......", ".......O........", "......O.........", "................", "..o.o...........", ".o.o............", "o.o.............", "................", "................", "................"],
 wbow:["................", "....oo..........", "......oo........", ".......oO.......", "........oO......", "........o.O.....", ".........o.O....", ".........o.O....", ".........o.O....", ".........o.O....", "........o.O.....", "........oO......", ".......oO.......", "......oo........", "....oo..........", "................"],
 wknife:["................", "................", "................", "................", "..........oo....", ".........ooO....", "........ooO.....", ".......ooO......", "......ooO.......", "...o.ooO........", "....ooO.........", "....oo..........", "...O.o..........", "..O.............", "................", "................"],
 wtome:["................", "................", "..ooooooooooo...", "..oOOOOOOOOOOo..", "..oOooooooOOOo..", "..oOOOOOOOOOOo..", "..oOooooooOOOo..", "..oOOOOOOOOOOo..", "..oOOOOOOOOOOo..", "..oOOOOOOOOOOo..", "..oOOOOOOOOOOo..", "..oooooooooooo..", "...o........o...", "................", "................", "................"],
 wstaff:["............ooo.", "...........ooOoo", "...........oOOo.", "..........O.oo..", ".........O......", "........O.......", ".......O........", "......O.........", ".....O..........", "....O...........", "...O............", "..O.............", ".O..............", "................", "................", "................"],
 wbag:["................", "......oooo......", ".......oo.......", "......oOOo......", ".....oOOOOo.....", "....oOOOOOOo....", "...oOOoooOOOo...", "...oOOOOOOOOo...", "...oOOOOOOOOo...", "...oOOOOOOOOo...", "....oOOOOOOo....", ".....oooooo.....", "................", "................", "................", "................"],
 wstone:["................", "................", "......oooo......", ".....oOOOOo.....", "....oOoOOOOo....", "...oOoOOOOOOo...", "...oOOOOOOOOo...", "....oOOOOOOo....", ".....oOOOOo.....", "......oOOo......", ".......oo.......", "................", "................", "................", "................", "................"],
 wmisc:["................", ".......o........", ".......o........", "......ooo.......", "..ooooooooooo...", "....ooOOOoo.....", ".....oOOOo......", ".....oo.oo......", "....oo...oo.....", "....o.....o.....", "................", "................", "................", "................", "................", "................"]
};
const pixelCache={};
Astra.pixel=function(name){
 if(pixelCache[name])return pixelCache[name];const rows=Astra.PIXEL[name];if(!rows)return null;
 const c=document.createElement("canvas");c.width=16;c.height=16;const x=c.getContext("2d");
 rows.forEach((r,y)=>r.split("").forEach((ch,i)=>{if(PAL[ch]){x.fillStyle=PAL[ch];x.fillRect(i,y,1,1);}}));
 return pixelCache[name]=c;
};
Astra.pixelUrl=(name,size)=>{const src=Astra.pixel(name);if(!src)return "";const c=document.createElement("canvas");c.width=c.height=size||32;const x=c.getContext("2d");x.imageSmoothingEnabled=false;x.drawImage(src,0,0,c.width,c.height);return c.toDataURL();};

// Recorta un fotograma a sus píxeles y, si hay paleta por equipos, lo recolorea como en la batalla.
Astra.crop=function(s,palette,team){
 try{const c=document.createElement("canvas");c.width=s.w;c.height=s.h;const x=c.getContext("2d");x.drawImage(s.im,s.sx,s.sy,s.w,s.h,0,0,s.w,s.h);const d=x.getImageData(0,0,s.w,s.h).data;
  let x0=s.w,y0=s.h,x1=-1,y1=-1;for(let y=0;y<s.h;y++)for(let i=0;i<s.w;i++)if(d[(y*s.w+i)*4+3]>8){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return s;
  const map=palette&&palette.source&&palette.teams&&palette.teams[team]?new Map(palette.source.map((c,i)=>[c.join(","),palette.teams[team][i]])):null;
  if(map){const img=x.getImageData(0,0,s.w,s.h),p=img.data;for(let i=0;i<p.length;i+=4){if(!p[i+3])continue;const to=map.get(p[i]+","+p[i+1]+","+p[i+2]);if(to){p[i]=to[0];p[i+1]=to[1];p[i+2]=to[2];}}x.putImageData(img,0,0);}
  return {im:c,sx:x0,sy:y0,w:x1-x0+1,h:y1-y0+1};}catch(e){return s;}
};
// Sprite de mapa de un "arte" del paquete (pack.units[art]).
const artCache={};
Astra.clearArtCache=()=>Object.keys(artCache).forEach(k=>delete artCache[k]);
Astra.artSprite=async function(p,art,team){
 const key=art+":"+team;if(key in artCache)return artCache[key];
 const unit=p.pack&&p.pack.units&&p.pack.units[art];let out=null;
 if(unit&&unit.map){const im=await Astra.image(p,unit.map.path);if(im)out=Astra.crop({im,sx:0,sy:0,w:unit.map.width,h:unit.map.height},p.pack.palette,team);}
 return artCache[key]=out;
};
// Gráfico de personaje de MZ (img/characters), recortado.
Astra.characterSprite=async function(p,name,index,direction,pattern){
 if(!name)return null;const im=await Astra.image(p,"img/characters/"+name+".png");if(!im)return null;
 const big=/^[!]?\$/.test(name),cw=im.width/(big?3:12),ch=im.height/(big?4:8),i=big?0:index||0,row=Math.max(0,((direction||2)-2)/2);
 return Astra.crop({im,sx:((i%4)*3+(pattern===undefined?1:pattern))*cw,sy:(Math.floor(i/4)*4+row)*ch,w:cw,h:ch});
};
// Icono de arma/objeto: el del paquete de gráficos si existe (como en el juego), si no el IconSet de MZ.
Astra.itemIcon=function(p,kind,id){
 const icons=p.pack&&p.pack.itemIcons,d=(kind==="weapon"?p.db.weapons:p.db.items)[id];if(!d)return null;
 if(icons){const group=kind==="weapon"?"weapons":"items",exact=icons[group]&&icons[group][id],
  a=exact||(kind==="weapon"?icons.categories&&icons.categories[d.staff?"staff":d.category]:icons.effects&&icons.effects[d.effect]);
  if(a&&Array.isArray(a.rect))return {path:a.path,rect:a.rect,key:a.key};}
 return d.iconIndex?{iconIndex:d.iconIndex}:null;
};
const keyed={};
async function iconImage(p,asset){
 const im=await Astra.image(p,asset.path);if(!im||!Array.isArray(asset.key))return im;const k=asset.path+":"+asset.key;if(keyed[k])return keyed[k];
 const c=document.createElement("canvas");c.width=im.width;c.height=im.height;const x=c.getContext("2d");x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height);
 for(let i=0;i<d.data.length;i+=4)if(d.data[i]===asset.key[0]&&d.data[i+1]===asset.key[1]&&d.data[i+2]===asset.key[2])d.data[i+3]=0;x.putImageData(d,0,0);return keyed[k]=c;
}
// Dibuja en un <canvas> según sus atributos data-*. Así las listas se pintan después de crear el HTML.
//   data-pix="chest"  data-iconset="12"  data-item="weapon:3"  data-art="Myrmidon" (+data-team)
//   data-actor="1" (retrato)  data-class="2" (sprite de la clase)  data-char="Actor1:0"
Astra.paintIcons=function(root){
 const p=Astra.state.project;if(!p)return;
 root.querySelectorAll("canvas[data-pix],canvas[data-iconset],canvas[data-item],canvas[data-art],canvas[data-actor],canvas[data-class],canvas[data-char]").forEach(async c=>{
  const x=c.getContext("2d"),W=c.width,H=c.height;x.imageSmoothingEnabled=false;
  const fit=(im,sx,sy,w,h,pad)=>{x.clearRect(0,0,W,H);const s=Math.min((W-(pad||0))/w,(H-(pad||0))/h),dw=w*s,dh=h*s;x.drawImage(im,sx,sy,w,h,(W-dw)/2,(H-dh)/2,dw,dh);};
  // Sprites de unidades: misma escala entera para todos, así un jinete se ve más grande que un soldado, como en el juego.
  const sprite=s=>{if(!s)return;x.clearRect(0,0,W,H);const k=Math.min(Math.max(1,Math.floor(W/24)),(W-2)/s.w,(H-2)/s.h),dw=s.w*k,dh=s.h*k;x.drawImage(s.im,s.sx,s.sy,s.w,s.h,(W-dw)/2,H-1-dh,dw,dh);};
  try{
   if(c.dataset.pix){const im=Astra.pixel(c.dataset.pix);if(im)fit(im,0,0,16,16);return;}
   if(c.dataset.item){const [kind,id]=c.dataset.item.split(":"),a=Astra.itemIcon(p,kind,Number(id));if(!a)return;
    if(a.iconIndex!==undefined)return drawIconSet(p,x,a.iconIndex,W,H);const im=await iconImage(p,a);if(im)fit(im,a.rect[0],a.rect[1],a.rect[2],a.rect[3]);return;}
   if(c.dataset.iconset!==undefined)return drawIconSet(p,x,Number(c.dataset.iconset),W,H);
   if(c.dataset.art!==undefined)return sprite(await Astra.artSprite(p,c.dataset.art,Number(c.dataset.team||1)));
   if(c.dataset.class!==undefined){const cls=p.db.classes[Number(c.dataset.class)]||{};return sprite(cls.art?await Astra.artSprite(p,cls.art,Number(c.dataset.team||1)):null);}
   if(c.dataset.char!==undefined){const [n,i]=c.dataset.char.split(":");return sprite(await Astra.characterSprite(p,n,Number(i)));}
   if(c.dataset.actor!==undefined)return drawPortrait(p,x,Number(c.dataset.actor),W,H);
  }catch(e){}
 });
};
async function drawIconSet(p,x,index,W,H){
 if(!index)return;const im=await Astra.image(p,"img/system/IconSet.png");if(!im)return;const size=im.width/16;
 x.clearRect(0,0,W,H);x.imageSmoothingEnabled=false;x.drawImage(im,(index%16)*size,Math.floor(index/16)*size,size,size,0,0,W,H);
}
// Retrato: el del paquete (pack.faces[id]) o la cara de MZ (img/faces, 4×2 caras por hoja).
async function drawPortrait(p,x,actorId,W,H){
 const a=(p.actors||[])[actorId],face=p.pack&&p.pack.faces&&p.pack.faces[actorId];x.clearRect(0,0,W,H);x.imageSmoothingEnabled=false;
 if(face){const im=await Astra.image(p,face.path);if(im){const r=face.rect||{x:0,y:0,w:face.width,h:face.height},c=document.createElement("canvas");c.width=r.w;c.height=r.h;const cx=c.getContext("2d");cx.drawImage(im,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
  (face.features||[]).forEach(f=>{const fr=f.frames?Object.assign({},f,f.frames[0]):f;cx.drawImage(im,fr.sx,fr.sy,fr.w,fr.h,fr.x,fr.y,fr.w,fr.h);});
  const s=Math.min(W/r.w,H/r.h);x.drawImage(c,0,0,r.w,r.h,(W-r.w*s)/2,H-r.h*s,r.w*s,r.h*s);return;}}
 if(a&&a.faceName){const im=await Astra.image(p,"img/faces/"+a.faceName+".png");if(im){const fw=im.width/4,fh=im.height/2,i=a.faceIndex||0;x.drawImage(im,(i%4)*fw,Math.floor(i/4)*fh,fw,fh,0,0,W,H);return;}}
 const cls=a&&p.db.classes[a.classId];const s=cls&&cls.art?await Astra.artSprite(p,cls.art,1):a&&a.characterName?await Astra.characterSprite(p,a.characterName,a.characterIndex):null;
 if(s){const k=Math.min((W-8)/s.w,(H-8)/s.h);x.drawImage(s.im,s.sx,s.sy,s.w,s.h,(W-s.w*k)/2,(H-s.h*k)/2,s.w*k,s.h*k);}
}
})();
