/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
// Astra Editor · importador de hacks de Fire Emblem: The Sacred Stones (FE8, versión USA).
// Lógica sin interfaz (se prueba en Node). El usuario aporta SU ROM limpia y el parche del hack
// (.ups o .bps) o la ROM ya parcheada. Astra compara las dos y solo trae lo que el hack cambió:
// capítulos (mapa, terreno y unidades) y los personajes, clases y objetos que cambian o que usan.
// Las direcciones de FE8U se comprueban contra la ROM limpia; si un hack movió una tabla, se busca
// la nueva dirección en los mismos sitios donde el juego la lee.
(function(root){
"use strict";
const T=root.Tactics,M=T.Editor,D=M.Db,R=M.Rom={};
const BASE=0x08000000;
R.FE8U={code:"BE8E",crc:0xA47246AE,
 characters:{addr:0x08803D30,size:0x34,count:255,numberAt:4},
 classes:{addr:0x08807110,size:0x54,count:255,numberAt:4},
 items:{addr:0x08809B10,size:0x24,count:256,numberAt:6},
 chapters:{addr:0x088B0890,size:0x94,count:128},
 assets:0x088B363C,text:0x0815D48C,textPointer:0xA2A0,huffman:[0x6DC,0x6E0]};

// ---------- bytes ----------
const u16=(b,o)=>b[o]|b[o+1]<<8;
const u32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
R.u16=u16;R.u32=u32;
const isPtr=(b,v)=>v>=BASE&&v<BASE+b.length;
const off=(b,v)=>isPtr(b,v)?v-BASE:-1;
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
R.crc32=function(b,start,end){let c=0xFFFFFFFF;for(let i=start||0,e=end===undefined?b.length:end;i<e;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
const hex=v=>"0x"+(v>>>0).toString(16).toUpperCase();
R.hex=hex;

// ---------- parches ----------
function varint(b,pos){let v=0,s=1;for(;;){T.assert(pos.i<b.length,"Parche cortado");const x=b[pos.i++];v+=(x&0x7f)*s;if(x&0x80)break;s*=128;v+=s;}return v;}
R.applyUPS=function(src,patch){
 T.assert(String.fromCharCode(patch[0],patch[1],patch[2],patch[3])==="UPS1","No es un parche UPS");
 const end=patch.length-12,pos={i:4},inSize=varint(patch,pos),outSize=varint(patch,pos);
 T.assert(R.crc32(patch,0,patch.length-4)===u32(patch,patch.length-4),"El parche .ups está dañado (su CRC no cuadra).");
 T.assert(src.length===inSize&&R.crc32(src)===u32(patch,end),"Este parche se hizo sobre otra ROM. Usa la ROM limpia de FE8 (USA) sin modificar.");
 const out=new Uint8Array(outSize);out.set(src.subarray(0,Math.min(src.length,outSize)));
 let o=0;
 while(pos.i<end){o+=varint(patch,pos);for(;;){const x=patch[pos.i++];if(o<outSize)out[o]=(o<src.length?src[o]:0)^x;o++;if(!x)break;}}
 T.assert(R.crc32(out)===u32(patch,end+4),"El resultado del parche no cuadra con su CRC.");
 return out;
};
R.applyBPS=function(src,patch){
 T.assert(String.fromCharCode(patch[0],patch[1],patch[2],patch[3])==="BPS1","No es un parche BPS");
 T.assert(R.crc32(patch,0,patch.length-4)===u32(patch,patch.length-4),"El parche .bps está dañado (su CRC no cuadra).");
 const end=patch.length-12,pos={i:4},inSize=varint(patch,pos),outSize=varint(patch,pos),meta=varint(patch,pos);pos.i+=meta;
 T.assert(src.length===inSize&&R.crc32(src)===u32(patch,end),"Este parche se hizo sobre otra ROM. Usa la ROM limpia de FE8 (USA) sin modificar.");
 const out=new Uint8Array(outSize);let o=0,sr=0,tr=0;
 while(pos.i<end){const data=varint(patch,pos),cmd=data%4,len=Math.floor(data/4)+1;
  if(cmd===0){for(let n=0;n<len;n++,o++)out[o]=src[o];}
  else if(cmd===1){for(let n=0;n<len;n++)out[o++]=patch[pos.i++];}
  else{const d=varint(patch,pos),delta=(d&1?-1:1)*Math.floor(d/2);
   if(cmd===2){sr+=delta;for(let n=0;n<len;n++)out[o++]=src[sr++];}else{tr+=delta;for(let n=0;n<len;n++)out[o++]=out[tr++];}}}
 T.assert(R.crc32(out)===u32(patch,end+4),"El resultado del parche no cuadra con su CRC.");
 return out;
};
// Segundo archivo: parche .ups/.bps o la ROM del hack ya parcheada.
R.applyPatch=function(clean,second){
 const magic=String.fromCharCode(second[0],second[1],second[2],second[3]);
 if(magic==="UPS1")return R.applyUPS(clean,second);
 if(magic==="BPS1")return R.applyBPS(clean,second);
 T.assert(second.length>=0x200000&&R.gameCode(second)===R.FE8U.code,"El segundo archivo no es un parche .ups/.bps ni una ROM de FE8.");
 return second;
};
R.gameCode=b=>String.fromCharCode(b[0xAC],b[0xAD],b[0xAE],b[0xAF]);

// ---------- LZ77 de GBA (tipo 0x10) ----------
R.lz77=function(b,at,max){
 if(at<0||at+4>b.length||b[at]!==0x10)return null;const size=b[at+1]|b[at+2]<<8|b[at+3]<<16;if(!size||size>(max||0x40000))return null;
 const out=new Uint8Array(size);let i=at+4,o=0;
 while(o<size){if(i>=b.length)return null;const flags=b[i++];
  for(let k=0;k<8&&o<size;k++){
   if(flags&(0x80>>k)){if(i+1>=b.length)return null;const b0=b[i++],b1=b[i++],len=(b0>>4)+3,disp=((b0&0xF)<<8|b1)+1;if(disp>o)return null;for(let n=0;n<len&&o<size;n++,o++)out[o]=out[o-disp];}
   else{if(i>=b.length)return null;out[o++]=b[i++];}}}
 return out;
};

// ---------- textos (Huffman o sin comprimir) ----------
const printable=bytes=>{let s="";for(let i=0;i<bytes.length;i++){const c=bytes[i];if(c===0)break;if(c===0x80){i++;continue;}if(c===1||c===2)s+=" ";else if(c>=0x20&&c<0x7F)s+=String.fromCharCode(c);else if(c>=0xA0)s+=String.fromCharCode(c);}return s.replace(/\s+/g," ").trim();};
function huffman(rom,tree,rootNode,at,limit){
 const out=[];let node=rootNode,bits=0,cur=0,steps=0;
 for(;;){
  if(++steps>40000||node<0||node+4>rom.length||at>rom.length)return null;
  const l=u16(rom,node),r=u16(rom,node+2);
  if(r&0x8000){const lo=l&0xFF,hi=l>>8;if(!lo)break;out.push(lo);if(hi)out.push(hi);if(out.length>=limit)break;node=rootNode;continue;}
  if(!bits){cur=rom[at++];bits=8;}
  const bit=cur&1;cur>>=1;bits--;node=tree+(bit?r:l)*4;
 }
 return out;
}
function rawText(rom,at,limit){const out=[];while(at<rom.length&&rom[at]&&out.length<limit)out.push(rom[at++]);return out;}
function textReader(rom,table,tree,rootNode){
 const cache={};
 return function(id){
  if(cache[id]!==undefined)return cache[id];
  const p=u32(rom,table+id*4);let bytes=null;
  if(p&0x80000000){const o=off(rom,(p&0x7FFFFFFF)>>>0);if(o>=0)bytes=rawText(rom,o,4000);}
  else{const o=off(rom,p);if(o>=0&&tree>=0)bytes=huffman(rom,tree,rootNode,o,4000);}
  return cache[id]=bytes?printable(bytes):"";
 };
}

// ---------- tablas ----------
// Sitios de la ROM limpia donde aparece una dirección (las "literal pools" desde las que el juego lee la tabla).
R.refs=function(rom,addr,limit){const out=[];for(let i=0,e=Math.min(rom.length,limit||rom.length)-3;i<e;i+=4)if(rom[i]===(addr&0xFF)&&u32(rom,i)===addr)out.push(i);return out;};
// En el hack: dirección más votada entre esos mismos sitios (si el hack la movió, el juego lee la nueva).
function relocate(rom,refs,fallback){
 const votes={};refs.forEach(i=>{const v=u32(rom,i);if(isPtr(rom,v))votes[v]=(votes[v]||0)+1;});
 const best=Object.keys(votes).sort((a,b)=>votes[b]-votes[a])[0];return best?Number(best):fallback;
}
// Primer índice de la tabla: algunas empiezan por una fila vacía. Se elige el desfase que cuadra con el campo "número".
function tableShift(rom,base,def){
 let best=0,score=-1;
 [0,1].forEach(shift=>{let s=0;for(let k=0;k<12;k++){const o=base+k*def.size;if(o+def.size<=rom.length&&rom[o+def.numberAt]===k+shift&&k+shift>0)s++;}if(s>score){score=s;best=shift;}});
 return {shift:best,score};
}
function readTable(rom,base,def,shift,parse){
 const out={};
 for(let k=0;k<def.count;k++){const o=base+k*def.size,id=k+shift;if(!id||id>255||o+def.size>rom.length)continue;
  if(rom[o+def.numberAt]!==id)continue;const row=parse(o,id);if(row){row.offset=o;row.bytes=Array.from(rom.subarray(o,o+def.size));out[id]=row;}}
 return out;
}

// ---------- apertura ----------
// Abre una ROM. clean=true: ROM limpia (comprueba direcciones y textos). Con base=contexto limpio: hack.
R.open=function(rom,base){
 const F=R.FE8U,ctx={rom,notes:[],errors:[],clean:!base};
 if(R.gameCode(rom)!==F.code){ctx.errors.push("No es Fire Emblem: The Sacred Stones (USA). Código de juego: "+JSON.stringify(R.gameCode(rom))+", se esperaba BE8E.");return ctx;}
 if(!base){ctx.crc=R.crc32(rom);if(ctx.crc!==F.crc)ctx.notes.push("La ROM limpia no tiene el CRC de la versión USA sin tocar ("+hex(ctx.crc)+"). Puede salir mal: usa tu copia original.");}
 ctx.refs=base?base.refs:{};
 const place=key=>{const addr=typeof F[key]==="number"?F[key]:F[key].addr;
  if(!base){ctx.refs[key]=R.refs(rom,addr,0x1000000);return off(rom,addr);}
  return off(rom,relocate(rom,ctx.refs[key]||[],addr));};
 ["characters","classes","items","chapters","assets","text"].forEach(k=>{ctx[k+"At"]=place(k);});
 // La tabla de textos también se lee en 0xA2A0.
 if(base){const t=u32(rom,F.textPointer);if(isPtr(rom,t))ctx.textAt=off(rom,t);}
 ["characters","classes","items"].forEach(k=>{const s=tableShift(rom,ctx[k+"At"],F[k]);ctx[k+"Shift"]=s.shift;if(s.score<6)ctx.errors.push("No encuentro la tabla de "+({characters:"personajes",classes:"clases",items:"objetos"})[k]+" en "+hex(ctx[k+"At"]+BASE)+".");});
 if(ctx.errors.length)return ctx;
 setupText(ctx,base);
 return ctx;
};
// Árbol de Huffman: se prueba la dirección conocida y se valida descodificando el nombre del personaje 1 ("Eirika").
function setupText(ctx,base){
 const rom=ctx.rom,F=R.FE8U,nameOf=reader=>{const c=charRow(ctx,1);return c?reader(c.nameId):"";};
 const candidates=[];
 if(base&&base.huffman)candidates.push(base.huffman);
 const a=u32(rom,F.huffman[0]),b=u32(rom,F.huffman[1]);
 [[a,b],[off(rom,a)>=0?u32(rom,off(rom,a)):0,b]].forEach(([t,r])=>{if(!isPtr(rom,t)||!isPtr(rom,r))return;const rp=u32(rom,off(rom,r));
  candidates.push({tree:off(rom,t),root:off(rom,r)});if(isPtr(rom,rp))candidates.push({tree:off(rom,t),root:off(rom,rp)});});
 for(const c of candidates){const read=textReader(rom,ctx.textAt,c.tree,c.root);const n=nameOf(read);if(base?n.length>0:/^Eirika/.test(n)){ctx.huffman=c;ctx.text=read;return;}}
 // Sin árbol válido: solo se leerán los textos sin comprimir (parche anti-Huffman).
 ctx.text=textReader(rom,ctx.textAt,-1,-1);
 if(!base)ctx.notes.push("No pude descifrar los textos comprimidos: los nombres que no estén en texto plano saldrán como «Personaje N».");
}
function charRow(ctx,id){const F=R.FE8U.characters,o=ctx.charactersAt+(id-ctx.charactersShift)*F.size;return o>=0&&ctx.rom[o+4]===id?{nameId:u16(ctx.rom,o)}:null;}

// ---------- lectura de datos ----------
const WEAPON_TYPES=["blade","pole","axe","bow","staff","arcane","arcane","arcane"];
R.WEAPON_TYPES=WEAPON_TYPES;
R.read=function(ctx){
 const rom=ctx.rom,F=R.FE8U,name=(id,fallback)=>ctx.text(id)||fallback;
 const ranks=o=>{const r={};for(let k=0;k<8;k++)if(rom[o+k]){const c=WEAPON_TYPES[k];r[c]=Math.max(r[c]||0,rom[o+k]);}return r;};
 const data={};
 data.characters=readTable(rom,ctx.charactersAt,F.characters,ctx.charactersShift,(o,id)=>({id,nameId:u16(rom,o),name:name(u16(rom,o),"Personaje "+id),classId:rom[o+5],
  level:rom[o+0xB],bases:{health:s8(rom[o+0xC]),power:s8(rom[o+0xD]),skill:s8(rom[o+0xE]),speed:s8(rom[o+0xF]),defense:s8(rom[o+0x10]),resistance:s8(rom[o+0x11]),luck:s8(rom[o+0x12]),build:s8(rom[o+0x13])},
  ranks:ranks(o+0x14),growth:{health:rom[o+0x1C],power:rom[o+0x1D],skill:rom[o+0x1E],speed:rom[o+0x1F],defense:rom[o+0x20],resistance:rom[o+0x21],luck:rom[o+0x22]},
  attributes:u32(rom,o+0x28),compare:[0,0x28]}));
 data.classes=readTable(rom,ctx.classesAt,F.classes,ctx.classesShift,(o,id)=>({id,nameId:u16(rom,o),name:name(u16(rom,o),"Clase "+id),promotion:rom[o+5],
  bases:{health:rom[o+0xB],power:rom[o+0xC],skill:rom[o+0xD],speed:rom[o+0xE],defense:rom[o+0xF],resistance:rom[o+0x10],build:rom[o+0x11],move:rom[o+0x12]},
  growth:{health:rom[o+0x1B],power:rom[o+0x1C],skill:rom[o+0x1D],speed:rom[o+0x1E],defense:rom[o+0x1F],resistance:rom[o+0x20],luck:rom[o+0x21]},
  attributes:u32(rom,o+0x28),ranks:ranks(o+0x2C),compare:[0,0x34]}));
 data.items=readTable(rom,ctx.itemsAt,F.items,ctx.itemsShift,(o,id)=>{const type=rom[o+7],range=rom[o+0x19];
  return {id,nameId:u16(rom,o),name:name(u16(rom,o),"Objeto "+id),type,attributes:u32(rom,o+8),uses:rom[o+0x14],might:rom[o+0x15],hit:rom[o+0x16],weight:rom[o+0x17],crit:rom[o+0x18],
   minRange:range>>4,maxRange:range&0xF,cost:u16(rom,o+0x1A),rank:rom[o+0x1C],weapon:type<8&&!!(u32(rom,o+8)&5),compare:[0,0x0C,0x14,0x24]};});
 data.chapters=readChapters(ctx);
 return data;
};
const s8=v=>v>127?v-256:v;

// ---------- capítulos ----------
const asset=(ctx,i)=>{const o=ctx.assetsAt+i*4;return i>0&&o+4<=ctx.rom.length?off(ctx.rom,u32(ctx.rom,o)):-1;};
function mapAt(ctx,i){const o=asset(ctx,i);if(o<0)return null;const d=R.lz77(ctx.rom,o,0x4000);if(!d||d.length<2)return null;const w=d[0],h=d[1];if(w<1||h<1||w>80||h>80||d.length<2+w*h*2)return null;
 const tiles=[];for(let k=0;k<w*h;k++)tiles.push(u16(d,2+k*2));return {width:w,height:h,tiles};}
function configAt(ctx,i){const o=asset(ctx,i);if(o<0)return null;const d=R.lz77(ctx.rom,o,0x4000);return d&&d.length>=0x2400?d:null;}
// Campos del capítulo: se comprueba la disposición conocida (mapa en +8, configuración en +7) y si no cuadra se busca.
function chapterLayout(ctx){
 const rom=ctx.rom,F=R.FE8U.chapters,score=(fieldOf,test)=>{let s=0;for(let c=0;c<Math.min(F.count,40);c++){const o=ctx.chaptersAt+c*F.size;if(o+F.size>rom.length)break;if(test(rom[o+fieldOf]))s++;}return s;};
 const pick=(pref,test)=>{const best={at:pref,s:score(pref,test)};if(best.s>=8)return best.at;for(let f=0;f<F.size;f++){const s=score(f,test);if(s>best.s){best.at=f;best.s=s;}}return best.s>=1?best.at:-1;};
 const map=pick(8,i=>!!mapAt(ctx,i)),config=pick(7,i=>!!configAt(ctx,i));
 const events=pick(0x74,i=>{const o=asset(ctx,i);return o>=0&&eventGroup(ctx,o).loads.length>0;});
 return {map,config,obj1:config-3,obj2:config-2,palette:config-1,events};
}
// Grupo de eventos del capítulo: punteros a listas y escenas. Se recorren las escenas buscando LOAD (cargar unidades).
function eventGroup(ctx,o){
 const rom=ctx.rom,loads=[];let scene=-1;
 // +0x48: escena inicial en FE8. Si no hay LOAD ahí, se prueba cualquier puntero del grupo.
 const fields=[0x48].concat([...Array(0x14)].map((_,k)=>k*4).filter(f=>f!==0x48));
 for(const f of fields){const p=off(rom,u32(rom,o+f));if(p<0)continue;const w=walkScript(rom,p,0);if(w.ok&&w.loads.length){scene=f;w.loads.forEach(l=>loads.push(l));break;}}
 return {scene,loads};
}
// Códigos de evento de FE8: 2 bytes; byte alto = código, nibble alto del bajo = tamaño en medias palabras.
function walkScript(rom,at,depth){
 const loads=[];let i=at;
 for(let steps=0;steps<3000;steps++){
  if(i+2>rom.length)return {ok:false,loads};
  const lo=rom[i],id=rom[i+1],size=(lo>>4)*2;
  if(!size)return {ok:false,loads};
  if(id===0x2C&&size>=8){const p=off(rom,u32(rom,i+4));if(p>=0)loads.push(p);}
  if(id===0x0A&&size>=8&&depth<3){const p=off(rom,u32(rom,i+4));if(p>=0){const w=walkScript(rom,p,depth+1);if(w.ok)w.loads.forEach(l=>loads.push(l));}}
  if(id===0x01)return {ok:true,loads};
  i+=size;
 }
 return {ok:false,loads};
}
// Definición de unidad de FE8: 20 bytes.
R.units=function(rom,at){
 const out=[];
 for(let k=0;k<64;k++){const o=at+k*20;if(o+20>rom.length||!rom[o])break;
  const b3=rom[o+3],pos=u16(rom,o+4);
  const u={character:rom[o],classId:rom[o+1],leader:rom[o+2],autolevel:b3&1,team:(b3>>1)&3,level:b3>>3,x:pos&63,y:(pos>>6)&63,
   items:Array.from(rom.subarray(o+12,o+16)).filter(Boolean),ai:Array.from(rom.subarray(o+16,o+20))};
  // Si entra caminando (REDA), su sitio es la última parada.
  const n=rom[o+6],rp=off(rom,u32(rom,o+8));if(n&&n<16&&rp>=0){const last=rp+(n-1)*8,packed=u16(rom,last);u.redaX=packed&63;u.redaY=(packed>>6)&63;u.redaBytes=[rom[last],rom[last+1]];}
  out.push(u);}
 return out;
};
function readChapters(ctx){
 const rom=ctx.rom,F=R.FE8U.chapters,L=ctx.layout=ctx.layout||chapterLayout(ctx),out=[];
 if(L.map<0){ctx.errors.push("No encuentro los mapas de los capítulos.");return out;}
 for(let c=0;c<F.count;c++){const o=ctx.chaptersAt+c*F.size;if(o+F.size>rom.length)break;
  const map=mapAt(ctx,rom[o+L.map]);if(!map)continue;
  const ch={index:c,offset:o,bytes:Array.from(rom.subarray(o,o+F.size)),map,assets:{map:rom[o+L.map],config:L.config>=0?rom[o+L.config]:0,obj1:L.config>=0?rom[o+L.obj1]:0,obj2:L.config>=0?rom[o+L.obj2]:0,palette:L.config>=0?rom[o+L.palette]:0}};
  const np=off(rom,u32(rom,o));ch.name=np>=0?printable(rawText(rom,np,40)):"";
  if(!/^[\x20-\x7E]{2,40}$/.test(ch.name))ch.name="";
  ch.name=ch.name||"Capítulo "+c;
  const cfg=ch.assets.config?configAt(ctx,ch.assets.config):null;
  ch.terrain=map.tiles.map(t=>cfg?cfg[0x2000+(t>>2)]||0:0);
  ch.units=[];
  if(L.events>=0){const eo=asset(ctx,rom[o+L.events]);if(eo>=0){const g=eventGroup(ctx,eo);g.loads.forEach(l=>R.units(rom,l).forEach(u=>{
   if(u.redaX!==undefined){if(u.redaX<map.width&&u.redaY<map.height){u.x=u.redaX;u.y=u.redaY;}else if(u.redaBytes[0]<map.width&&u.redaBytes[1]<map.height){u.x=u.redaBytes[0];u.y=u.redaBytes[1];}}
   delete u.redaX;delete u.redaY;delete u.redaBytes;
   if(u.x<map.width&&u.y<map.height&&!ch.units.some(v=>v.x===u.x&&v.y===u.y))ch.units.push(u);}));}}
  out.push(ch);}
 return out;
}

// ---------- imagen del mapa (RGBA) ----------
R.renderMap=function(ctx,ch){
 const rom=ctx.rom,cfg=configAt(ctx,ch.assets.config);if(!cfg)return null;
 const gfx=new Uint8Array(0x400*32);[[ch.assets.obj1,0],[ch.assets.obj2,0x200*32]].forEach(([i,at])=>{if(!i)return;const d=R.lz77(rom,asset(ctx,i),0x8000);if(d)gfx.set(d.subarray(0,Math.min(d.length,gfx.length-at)),at);});
 const po=asset(ctx,ch.assets.palette);if(po<0)return null;
 const packed=R.lz77(rom,po,0x400),pal=[];
 for(let k=0;k<256;k++){const c=packed?(packed.length>=k*2+2?u16(packed,k*2):0):(po+k*2+2<=rom.length?u16(rom,po+k*2):0);pal.push([(c&31)*255/31|0,(c>>5&31)*255/31|0,(c>>10&31)*255/31|0]);}
 const W=ch.map.width*16,H=ch.map.height*16,px=new Uint8ClampedArray(W*H*4);
 ch.map.tiles.forEach((t,k)=>{const mx=(k%ch.map.width)*16,my=Math.floor(k/ch.map.width)*16,meta=(t>>2)&0x3FF;
  for(let q=0;q<4;q++){const e=u16(cfg,meta*8+q*2),tile=e&0x3FF,hf=e&0x400,vf=e&0x800,p=(e>>12)*16,ox=mx+(q&1)*8,oy=my+(q>>1)*8;
   for(let y=0;y<8;y++)for(let x=0;x<8;x++){const sx=hf?7-x:x,sy=vf?7-y:y,byte=gfx[tile*32+sy*4+(sx>>1)],n=sx&1?byte>>4:byte&15,c=pal[n?p+n:0],i=((oy+y)*W+ox+x)*4;
    px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];px[i+3]=255;}}});
 return {width:W,height:H,data:px};
};

// ---------- qué cambió el hack ----------
const sameBytes=(a,b,ranges)=>{for(let r=0;r<ranges.length;r+=2)for(let i=ranges[r];i<ranges[r+1];i++)if(a[i]!==b[i])return false;return true;};
R.diff=function(clean,hack){
 ["characters","classes","items"].forEach(k=>Object.values(hack[k]).forEach(row=>{const old=clean[k][row.id];row.changed=!old?"new":!sameBytes(old.bytes,row.bytes,row.compare)||old.name!==row.name?"changed":"";}));
 hack.chapters.forEach(ch=>{const old=clean.chapters.find(c=>c.index===ch.index);
  ch.changed=!old?"new":JSON.stringify([ch.map,ch.terrain,ch.units])!==JSON.stringify([old.map,old.terrain,old.units])||ch.bytes.join()!==old.bytes.join()?"changed":"";});
 return hack;
};

// ---------- plan de importación ----------
// Qué se importa: los capítulos elegidos y los personajes, clases y objetos cambiados o que esos capítulos usan.
R.plan=function(data,chapterIds,opts){
 opts=opts||{};const chapters=data.chapters.filter(c=>chapterIds.indexOf(c.index)>=0),need={characters:new Set(),classes:new Set(),items:new Set()};
 ["characters","classes","items"].forEach(k=>{if(opts.changedData!==false)Object.values(data[k]).forEach(r=>{if(r.changed)need[k].add(r.id);});});
 chapters.forEach(ch=>ch.units.forEach(u=>{if(u.team!==2||isBoss(data,u))need.characters.add(u.character);need.classes.add(u.classId);u.items.forEach(i=>need.items.add(i));}));
 [...need.characters].forEach(id=>{const c=data.characters[id];if(c&&c.classId)need.classes.add(c.classId);});
 [...need.classes].forEach(id=>{const c=data.classes[id];if(c&&c.promotion&&data.classes[c.promotion]&&need.classes.size<255)need.classes.add(c.promotion);});
 const pick=k=>[...need[k]].filter(id=>data[k][id]).sort((a,b)=>a-b).map(id=>data[k][id]);
 return {chapters,characters:pick("characters"),classes:pick("classes"),items:pick("items")};
};
const isBoss=(data,u)=>{const c=data.characters[u.character];return !!(c&&c.attributes&0x8000);};

// ---------- conversión a TacticsMZ ----------
// Terrenos de FE (el número es el ID de región). Solo se añaden los que falten en el proyecto.
R.TERRAIN={1:["Llanura",1],2:["Camino",1],3:["Aldea",1,{avoid:10}],4:["Aldea cerrada",0],5:["Casa",1,{avoid:10}],6:["Armería",1,{avoid:10}],7:["Tienda",1,{avoid:10}],8:["Arena",1,{avoid:10}],
 10:["Fuerte",2,{defense:2,avoid:20,heal:4}],11:["Puerta",1,{defense:3,avoid:20,heal:4}],12:["Bosque",2,{defense:1,avoid:20,costs:{mounted:3,flying:1}}],13:["Matorral",0,{avoid:30}],
 14:["Arena",2,{avoid:5}],15:["Desierto",2,{avoid:5,costs:{mounted:4,flying:1}}],16:["Río",0,{costs:{flying:1}}],17:["Montaña",4,{defense:1,avoid:30,costs:{mounted:0,flying:1}}],18:["Cumbre",0,{defense:2,avoid:40,costs:{flying:1}}],
 19:["Puente",1],20:["Puente",1],21:["Mar",0,{avoid:10,costs:{flying:1}}],22:["Lago",0,{avoid:10,costs:{flying:1}}],23:["Suelo",1],24:["Suelo",1],25:["Valla",0],26:["Muro",0,{costs:{flying:0}}],27:["Muro",0,{costs:{flying:0}}],
 28:["Escombros",1],29:["Pilar",2,{defense:1,avoid:20}],30:["Puerta",0,{costs:{flying:0}}],31:["Trono",1,{defense:3,avoid:30,heal:4}],32:["Cofre",1],33:["Cofre",1],34:["Tejado",0],35:["Puerta",1,{defense:3,avoid:20}],
 36:["Iglesia",1,{avoid:10}],37:["Ruinas",1,{avoid:10}],38:["Acantilado",0,{costs:{flying:1}}],39:["Balista",1,{avoid:5}],44:["Baldosa",1],45:["Escaleras",1],47:["Glaciar",0],49:["Valle",0],53:["Cielo",1],54:["Abismo",0]};
R.terrainRows=function(existing){const out={};Object.keys(R.TERRAIN).forEach(id=>{if(existing&&existing[id])return;const [name,cost,extra]=R.TERRAIN[id];out[id]=Object.assign({name,cost,color:"#667f60"},extra||{});});return out;};
const MARKERS={32:"chest",33:"chest",30:"door",3:"village",6:"shop",7:"shop",31:"goal"};
const stat=(o,k)=>Math.max(0,o[k]||0);
// Escribe el plan en el proyecto (listas de MZ en memoria). Devuelve los mapas nuevos para guardarlos.
R.apply=function(p,plan,opts){
 opts=opts||{};const ids={characters:{},classes:{},items:{}},report={classes:0,actors:0,weapons:0,items:0,maps:0,units:0,reused:0};
 const reuse=(list,name)=>{const r=(list||[]).find(x=>x&&x.name===name);if(r)report.reused++;return r;};
 // objetos y armas
 plan.items.forEach(it=>{const table=it.weapon?"weapons":"items",list=p[table];let row=reuse(list,it.name);
  if(!row){row=D.create(list,table,it.name);
   if(it.weapon){const cat=WEAPON_TYPES[it.type];D.set(table,row,"category",cat);["might","hit","crit","weight","minRange","maxRange","uses","rank"].forEach(k=>D.set(table,row,k,it[k]));
    if(cat==="arcane")D.set(table,row,"magic",true);if(cat==="staff"){D.set(table,row,"staff",true);D.set(table,row,"effect","heal");}}
   else D.set(table,row,"uses",it.uses||1);
   D.set(table,row,"price",it.cost*(it.uses||1));report[table]++;}
  ids.items[it.id]={kind:it.weapon?"weapon":"item",id:row.id};});
 // clases
 plan.classes.forEach(c=>{let row=reuse(p.classes,c.name);
  if(!row){row=D.create(p.classes,"classes",c.name);const b=c.bases,types=Object.keys(c.ranks);
   D.set("classes",row,"stats",{health:stat(b,"health"),power:stat(b,"power"),magic:stat(b,"power"),skill:stat(b,"skill"),speed:stat(b,"speed"),luck:0,defense:stat(b,"defense"),resistance:stat(b,"resistance"),move:stat(b,"move"),build:stat(b,"build")});
   const g=c.growth;D.set("classes",row,"growth",{health:g.health,power:g.power,magic:g.power,skill:g.skill,speed:g.speed,luck:g.luck,defense:g.defense,resistance:g.resistance,move:0,build:0});
   if(types.length){D.set("classes",row,"weaponTypes",types);D.set("classes",row,"ranks",c.ranks);}
   D.set("classes",row,"moveType",c.attributes&0x1800?"flying":c.attributes&0x400?"mounted":"foot");
   report.classes++;}
  ids.classes[c.id]=row.id;});
 plan.classes.forEach(c=>{const row=p.classes[ids.classes[c.id]],to=ids.classes[c.promotion];if(row&&to&&to!==row.id&&!D.fields(row,"classes").promotions)D.set("classes",row,"promotions",[to]);});
 // personajes (se suman las bases de la clase, como en FE)
 const firstUnit={};plan.chapters.forEach(ch=>ch.units.forEach(u=>{if(!firstUnit[u.character])firstUnit[u.character]=u;}));
 plan.characters.forEach(c=>{let row=reuse(p.actors,c.name);
  if(!row){row=D.create(p.actors,"actors",c.name);const cls=plan.classes.find(x=>x.id===c.classId),cb=cls?cls.bases:{},b=c.bases;
   if(ids.classes[c.classId])D.set("actors",row,"classId",ids.classes[c.classId]);D.set("actors",row,"initialLevel",Math.max(1,c.level||1));
   const sum=k=>Math.max(0,(cb[k]||0)+(b[k]||0));
   D.set("actors",row,"stats",{health:sum("health"),power:sum("power"),magic:sum("power"),skill:sum("skill"),speed:sum("speed"),luck:sum("luck"),defense:sum("defense"),resistance:sum("resistance"),move:cb.move||5,build:sum("build")});
   const g=c.growth;D.set("actors",row,"growth",{health:g.health,power:g.power,magic:g.power,skill:g.skill,speed:g.speed,luck:g.luck,defense:g.defense,resistance:g.resistance,move:0,build:0});
   if(Object.keys(c.ranks).length)D.set("actors",row,"ranks",c.ranks);
   const u=firstUnit[c.id];if(u&&u.items.length)D.set("actors",row,"inventory",u.items.map(i=>ids.items[i]).filter(Boolean));
   report.actors++;}
  ids.characters[c.id]=row.id;});
 // capítulos → mapas
 const maps=[],infos=p.mapInfos=p.mapInfos||[null];let nextId=Math.max(0,...infos.filter(Boolean).map(m=>m.id))+1,order=Math.max(0,...infos.filter(Boolean).map(m=>m.order||0))+1;
 const template=opts.template||{};
 plan.chapters.forEach(ch=>{
  const id=nextId++,w=ch.map.width,h=ch.map.height,data=new Array(w*h*6).fill(0),ground=(template.data||[])[0]||0;
  for(let k=0;k<w*h;k++){data[k]=ground;data[5*w*h+k]=ch.terrain[k]||0;}
  const map={autoplayBgm:false,autoplayBgs:false,battleback1Name:"",battleback2Name:"",bgm:{name:"",pan:0,pitch:100,volume:90},bgs:{name:"",pan:0,pitch:100,volume:90},disableDashing:false,
   displayName:ch.name,encounterList:[],encounterStep:30,height:h,note:"",parallaxLoopX:false,parallaxLoopY:false,parallaxName:"",parallaxShow:true,parallaxSx:0,parallaxSy:0,
   scrollType:0,specifyBattleback:false,tilesetId:template.tilesetId||1,width:w,data,events:[null]};
  let throne=false;
  ch.terrain.forEach((t,k)=>{const kind=MARKERS[t];if(!kind)return;if(kind==="goal"){if(throne)return;throne=true;}M.create(map,kind,k%w,Math.floor(k/w),{});});
  ch.units.forEach(u=>{const cls=ids.classes[u.classId]||0,inv=u.items.map(i=>ids.items[i]).filter(Boolean),weapon=inv.find(i=>i.kind==="weapon"),item=inv.find(i=>i.kind==="item"),actor=ids.characters[u.character];
   const named=plan.characters.find(x=>x.id===u.character),boss=u.team===2&&isBossIn(plan,u);
   if(u.team===0&&actor)M.create(map,"ally",u.x,u.y,{actorId:actor,level:u.level});
   else if(u.team===2&&!boss)M.create(map,"enemy",u.x,u.y,{classId:cls,level:u.level,role:u.ai[1]===3?"hold":"auto",weaponId:weapon?weapon.id:0,itemId:item?item.id:0});
   else{// jefes y unidades verdes: ★ Unidad con su personaje (sus estadísticas propias)
    const e=M.create(map,"enemy",u.x,u.y,{});M.removeCommand(e,"Enemy");
    M.setCommand(e,"Unit",{actorId:actor||0,classId:cls,name:named?named.name:"",team:u.team===2?"2":u.team===0?"1":"3",level:u.level,weaponId:weapon?weapon.id:0,itemId:item?item.id:0,ai:boss||u.ai[1]===3?"hold":"approach",boss});}
   report.units++;});
  M.setCommand(M.missionEvent(map,true),"Mission",{title:ch.name,objective:throne?"seize":"eliminate",mapGraphics:"resource"});
  infos[id]={id,expanded:false,name:ch.name,order:order++,parentId:0,scrollX:0,scrollY:0};
  maps.push({id,chapter:ch,json:map,image:"img/astra/maps/Map"+String(id).padStart(3,"0")+".png"});report.maps++;});
 return {maps,report,ids};
};
const isBossIn=(plan,u)=>{const c=plan.characters.find(x=>x.id===u.character);return !!(c&&c.attributes&0x8000);};
})(typeof globalThis!=="undefined"?globalThis:this);
