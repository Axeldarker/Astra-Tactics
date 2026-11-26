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
 chapters:{addr:0x088B0890,size:0x94,count:79},
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
  if(!bits){if(at>=rom.length)return null;cur=rom[at++];bits=8;}
  const bit=cur&1;cur>>=1;bits--;node=tree+(bit?r:l)*4;
 }
 return out;
}
function rawText(rom,at,limit){const out=[];while(at<rom.length&&rom[at]&&out.length<limit)out.push(rom[at++]);return out;}
function textReader(rom,table,tree,rootNode){
 const cache={};
 return function(id){
  if(cache[id]!==undefined)return cache[id];
  if(!Number.isInteger(id)||id<0||table<0||table+id*4+4>rom.length)return "";
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
 if(base<0)return {shift:0,score:0};
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
 {const t=u32(rom,F.textPointer);if(isPtr(rom,t))ctx.textAt=off(rom,t);}
 ["characters","classes","items"].forEach(k=>{const s=tableShift(rom,ctx[k+"At"],F[k]);ctx[k+"Shift"]=s.shift;if(s.score<6)ctx.errors.push("No encuentro la tabla de "+({characters:"personajes",classes:"clases",items:"objetos"})[k]+" en "+hex(ctx[k+"At"]+BASE)+".");});
 if(ctx.errors.length)return ctx;
 setupText(ctx,base);
 return ctx;
};
// Árbol de Huffman: se prueba la dirección conocida y se valida descodificando el nombre del personaje 1 ("Eirika").
function setupText(ctx,base){
 const rom=ctx.rom,F=R.FE8U,nameOf=reader=>{const c=charRow(ctx,1);return c?reader(c.nameId):"";};
 const candidates=[];
 // FE8U: 0x6E0 -> base del árbol; 0x6DC -> puntero al puntero del nodo raíz.
 const tree=off(rom,u32(rom,F.huffman[1])),holder=off(rom,u32(rom,F.huffman[0]));
 const root=holder>=0?off(rom,u32(rom,holder)):-1;
 if(tree>=0&&root>=tree&&root+4<=rom.length)candidates.push({tree,root});
 if(base&&base.huffman)candidates.push(base.huffman);
 for(const c of candidates){const read=textReader(rom,ctx.textAt,c.tree,c.root);const n=nameOf(read);if((base||ctx.crc!==F.crc)?/^[A-Za-z][\x20-\x7E]{1,39}$/.test(n):n==="Eirika"){ctx.huffman=c;ctx.text=read;return;}}
 // Sin árbol válido: solo se leerán los textos sin comprimir (parche anti-Huffman).
 ctx.text=textReader(rom,ctx.textAt,-1,-1);
 ctx.notes.push("No pude descifrar los textos comprimidos: los nombres que no estén en texto plano saldrán como «Personaje N».");
}
R.setupText=setupText;
function charRow(ctx,id){const F=R.FE8U.characters,o=ctx.charactersAt+(id-ctx.charactersShift)*F.size;return o>=0&&ctx.rom[o+4]===id?{nameId:u16(ctx.rom,o)}:null;}

// ---------- lectura de datos ----------
const WEAPON_TYPES=["blade","pole","axe","bow","staff","arcane","arcane","arcane"];
R.WEAPON_TYPES=WEAPON_TYPES;
R.read=function(ctx){
 const rom=ctx.rom,F=R.FE8U,name=(id,fallback)=>ctx.text(id)||fallback;
 const ranks=o=>{const r={};for(let k=0;k<8;k++)if(rom[o+k]){const c=WEAPON_TYPES[k];r[c]=Math.max(r[c]||0,rom[o+k]);}return r;};
 const data={},classDef=ctx.clean&&ctx.crc===F.crc?Object.assign({},F.classes,{count:(F.items.addr-F.classes.addr)/F.classes.size}):F.classes;
 data.characters=readTable(rom,ctx.charactersAt,F.characters,ctx.charactersShift,(o,id)=>({id,nameId:u16(rom,o),name:name(u16(rom,o),"Personaje "+id),classId:rom[o+5],portraitId:u16(rom,o+6),
  level:rom[o+0xB],bases:{health:s8(rom[o+0xC]),power:s8(rom[o+0xD]),skill:s8(rom[o+0xE]),speed:s8(rom[o+0xF]),defense:s8(rom[o+0x10]),resistance:s8(rom[o+0x11]),luck:s8(rom[o+0x12]),build:s8(rom[o+0x13])},
  ranks:ranks(o+0x14),growth:{health:rom[o+0x1C],power:rom[o+0x1D],skill:rom[o+0x1E],speed:rom[o+0x1F],defense:rom[o+0x20],resistance:rom[o+0x21],luck:rom[o+0x22]},
  attributes:u32(rom,o+0x28),compare:[0,0x28]}));
 data.classes=readTable(rom,ctx.classesAt,classDef,ctx.classesShift,(o,id)=>({id,nameId:u16(rom,o),name:name(u16(rom,o),"Clase "+id),promotion:rom[o+5],smsId:rom[o+6],portraitId:u16(rom,o+8),
  bases:{health:rom[o+0xB],power:rom[o+0xC],skill:rom[o+0xD],speed:rom[o+0xE],defense:rom[o+0xF],resistance:rom[o+0x10],build:rom[o+0x11],move:rom[o+0x12]},
  growth:{health:rom[o+0x1B],power:rom[o+0x1C],skill:rom[o+0x1D],speed:rom[o+0x1E],defense:rom[o+0x1F],resistance:rom[o+0x20],luck:rom[o+0x21]},
  attributes:u32(rom,o+0x28),ranks:ranks(o+0x2C),compare:[0,0x34]}));
 data.items=readTable(rom,ctx.itemsAt,F.items,ctx.itemsShift,(o,id)=>{const type=rom[o+7],range=rom[o+0x19];
  return {id,nameId:u16(rom,o),name:name(u16(rom,o),"Objeto "+id),iconId:rom[o+0x1D],type,attributes:u32(rom,o+8),uses:rom[o+0x14],might:rom[o+0x15],hit:rom[o+0x16],weight:rom[o+0x17],crit:rom[o+0x18],
   minRange:range>>4,maxRange:range&0xF,cost:u16(rom,o+0x1A),rank:rom[o+0x1C],weapon:type<8&&!!(u32(rom,o+8)&5),compare:[0,0x0C,0x14,0x24]};});
 if(ctx.clean&&ctx.crc===F.crc&&(!data.characters[1]||data.characters[1].name!=="Eirika"))ctx.errors.push("La ROM original se reconoció por CRC, pero no se pudo leer el nombre de Eirika. No se guardarán datos incorrectos.");
 data.chapters=readChapters(ctx);
 data.chapters.forEach(ch=>{ch.units=ch.units.filter(u=>{const c=data.characters[u.character];u.classId=u.classId||(c&&c.classId)||0;return u.team<=2&&!!data.classes[u.classId];});});
 return data;
};
const s8=v=>v>127?v-256:v;

// ---------- capítulos ----------
const asset=(ctx,i)=>{const o=ctx.assetsAt+i*4;return ctx.assetsAt>=0&&i>0&&o+4<=ctx.rom.length?off(ctx.rom,u32(ctx.rom,o)):-1;};
function mapAt(ctx,i){const o=asset(ctx,i);if(o<0)return null;const d=R.lz77(ctx.rom,o,0x4000);if(!d||d.length<2)return null;const w=d[0],h=d[1];if(w<1||h<1||w>80||h>80||d.length<2+w*h*2)return null;
 const tiles=[];for(let k=0;k<w*h;k++)tiles.push(u16(d,2+k*2));return {width:w,height:h,tiles};}
function configAt(ctx,i){const o=asset(ctx,i);if(o<0)return null;const d=R.lz77(ctx.rom,o,0x4000);return d&&d.length>=0x2400?d:null;}
// Campos del capítulo: se comprueba la disposición conocida (mapa en +8, configuración en +7) y si no cuadra se busca.
function chapterLayout(ctx){return {map:8,config:7,obj1:4,obj2:5,palette:6,events:0x74};}
// Interpret the subset of introductory events relevant to map and unit loading.
// Follow direct CALLs; ignore units loaded on cutscene maps; apply CLEAR operations.
// Conditional control flow is deliberately not emulated. It is a best-effort initial placement.
R.initialUnitLoads=function(rom,group,chapter){
 const start=off(rom,u32(rom,group+0x48)),player=off(rom,u32(rom,group+0x28));
 const state={map:chapter,loads:[],steps:0},active=new Set();
 function walk(at,depth){
  if(at<0||depth>8||active.has(at))return;active.add(at);
  for(let i=at;i>=0&&i+4<=rom.length&&state.steps++<30000;){
   const lo=rom[i],op=rom[i+1],len=(lo>>4)*2,sub=lo&15;
   if(len<4||i+len>rom.length)break;
   if(op===0x01)break;
   if(op===0x25){const map=u16(rom,i+2);if(map!==state.map){state.map=map;state.loads=[];}}
   if(op===0x34&&[0xA,0xB,0xC].includes(sub)){
    const team={10:0,11:1,12:2}[sub];state.loads=state.loads.filter(l=>l.team!==team);
   }
   if(op===0x2C&&len>=8&&state.map===chapter){const p=off(rom,u32(rom,i+4));if(p>=0){for(const u of R.units(rom,p))state.loads.push(u);}}
   if(op===0x0A&&len>=8)walk(off(rom,u32(rom,i+4)),depth+1);
   i+=len;
  }
  active.delete(at);
 }
 walk(start,0);
 // The chapter header provides the normal-mode player unit list. Prefer it over
 // cutscene duplicates; use it if the intro uses dynamic LOAD pointers.
 const allies=player>=0?R.units(rom,player).filter(u=>u.team===0):[];
 if(allies.length)state.loads=allies.concat(state.loads.filter(u=>u.team!==0||!allies.some(a=>a.character===u.character)));
 return state.loads;
};
// Definición de unidad de FE8: 20 bytes.
R.units=function(rom,at){
 const out=[];
 for(let k=0;k<64;k++){const o=at+k*20;if(o+20>rom.length||!rom[o])break;
  const b3=rom[o+3],pos=u16(rom,o+4);
  const u={character:rom[o],classId:rom[o+1],leader:rom[o+2],autolevel:b3&1,team:(b3>>1)&3,level:b3>>3,x:pos&63,y:(pos>>6)&63,
   items:Array.from(rom.subarray(o+12,o+16)).filter(Boolean),ai:Array.from(rom.subarray(o+16,o+20))};
  // Si entra caminando (REDA), su sitio es la última parada.
  const n=rom[o+7],rp=off(rom,u32(rom,o+8));if(n&&n<=64&&rp>=0&&rp+n*8<=rom.length){const last=rp+(n-1)*8;u.redaX=rom[last];u.redaY=rom[last+1];}
  out.push(u);}
 return out;
};
function readChapters(ctx){
 const rom=ctx.rom,F=R.FE8U.chapters,L=ctx.layout=ctx.layout||chapterLayout(ctx),out=[];
 if(L.map<0){ctx.errors.push("No encuentro los mapas de los capítulos.");return out;}
 for(let c=0;c<F.count;c++){const o=ctx.chaptersAt+c*F.size;if(o+F.size>rom.length)break;
  const map=mapAt(ctx,rom[o+L.map]);if(!map)continue;
  const np=off(rom,u32(rom,o));if(np<0)continue;
  const ch={index:c,offset:o,bytes:Array.from(rom.subarray(o,o+F.size)),map,assets:{map:rom[o+L.map],config:L.config>=0?rom[o+L.config]:0,obj1:L.config>=0?rom[o+L.obj1]:0,obj2:L.config>=0?rom[o+L.obj2]:0,palette:L.config>=0?rom[o+L.palette]:0}};
  ch.name=printable(rawText(rom,np,40));
  if(!/^[\x20-\x7E]{2,40}$/.test(ch.name))continue;
  const title=ctx.text(u16(rom,o+0x70));ch.internalName=ch.name;ch.name=title&&title.length>=2&&title.length<=80?title:ch.name||"Capítulo "+c;
  const cfg=ch.assets.config?configAt(ctx,ch.assets.config):null;
  ch.terrain=map.tiles.map(t=>cfg?cfg[0x2000+(t>>2)]||0:0);
  ch.units=[];
  if(L.events>=0){const eo=asset(ctx,rom[o+L.events]);if(eo>=0&&eo+0x50<=rom.length){
   for(const u of R.initialUnitLoads(rom,eo,c)){
    if(u.redaX!==undefined&&u.redaX<map.width&&u.redaY<map.height){u.x=u.redaX;u.y=u.redaY;}
    delete u.redaX;delete u.redaY;
    if(u.x>=map.width||u.y>=map.height||u.team>2)continue;
    if(u.team===0&&ch.units.some(v=>v.team===0&&v.character===u.character))continue;
    if(ch.units.some(v=>v.x===u.x&&v.y===u.y))continue;
    ch.units.push(u);
   }
  }}
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
 ["characters","classes","items"].forEach(k=>{if(opts.allData||opts.changedData!==false)Object.values(data[k]).forEach(r=>{if(opts.allData||r.changed)need[k].add(r.id);});});
 chapters.forEach(ch=>ch.units.forEach(u=>{if(u.team!==2||isBoss(data,u)||(data.characters[u.character]&&data.characters[u.character].portraitId))need.characters.add(u.character);need.classes.add(u.classId);u.items.forEach(i=>need.items.add(i));}));
 [...need.characters].forEach(id=>{const c=data.characters[id];if(c&&c.classId)need.classes.add(c.classId);});
 for(const id of need.classes){const c=data.classes[id];if(c&&c.promotion&&data.classes[c.promotion]&&need.classes.size<255)need.classes.add(c.promotion);}
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
 // Stable FE IDs prevent merging separate classes or characters with the same display name.
 const placeholder=(table,id)=>(table==="actors"?"Personaje ":table==="classes"?"Clase ":"Objeto ")+id;
 const used=new Set(),legacyPlaceholders=new Set(),reuse=(list,table,source)=>{const rows=(list||[]).filter(Boolean),matches=rows.filter(x=>D.fields(x,table).fe8Source===opts.source&&D.fields(x,table).fe8Id===source.id),legacy=rows.filter(x=>x.name===source.name&&!D.fields(x,table).fe8Source&&!used.has(x)),fallback=rows.filter(x=>x.name===placeholder(table,source.id)&&!D.fields(x,table).fe8Source&&!used.has(x));const r=matches[0]||(opts.reuseNames!==false?(legacy.length===1?legacy[0]:legacy.length===0&&fallback.length===1?fallback[0]:null):null);if(r){report.reused++;used.add(r);if(r.name===placeholder(table,source.id)){legacyPlaceholders.add(r);if(source.name!==r.name){D.set(table,r,"name",source.name);report.renamed=(report.renamed||0)+1;}}}return r;};
 const identify=(table,row,source)=>{if(opts.source){D.set(table,row,"fe8Source",opts.source);D.set(table,row,"fe8Id",source.id);}used.add(row);};
 // objetos y armas
 plan.items.forEach(it=>{const table=it.weapon?"weapons":"items",list=p[table];let row=reuse(list,table,it);
  if(!row){row=D.create(list,table,it.name);
   if(it.weapon){const cat=WEAPON_TYPES[it.type];D.set(table,row,"category",cat);["might","hit","crit","weight","minRange","maxRange","uses","rank"].forEach(k=>D.set(table,row,k,it[k]));
    if(cat==="arcane")D.set(table,row,"magic",true);if(cat==="staff"){D.set(table,row,"staff",true);D.set(table,row,"effect","heal");}}
   else D.set(table,row,"uses",it.uses||1);
   D.set(table,row,"price",it.cost*(it.uses||1));report[table]++;}
  identify(table,row,it);ids.items[it.id]={kind:it.weapon?"weapon":"item",id:row.id};});
 // clases
 plan.classes.forEach(c=>{let row=reuse(p.classes,"classes",c);
  if(!row){row=D.create(p.classes,"classes",c.name);const b=c.bases,types=Object.keys(c.ranks);
   D.set("classes",row,"stats",{health:stat(b,"health"),power:stat(b,"power"),magic:stat(b,"power"),skill:stat(b,"skill"),speed:stat(b,"speed"),luck:0,defense:stat(b,"defense"),resistance:stat(b,"resistance"),move:stat(b,"move"),build:stat(b,"build")});
   const g=c.growth;D.set("classes",row,"growth",{health:g.health,power:g.power,magic:g.power,skill:g.skill,speed:g.speed,luck:g.luck,defense:g.defense,resistance:g.resistance,move:0,build:0});
   if(types.length){D.set("classes",row,"weaponTypes",types);D.set("classes",row,"ranks",c.ranks);}
   D.set("classes",row,"moveType",c.attributes&0x1800?"flying":c.attributes&0x400?"mounted":"foot");
   report.classes++;}
  identify("classes",row,c);ids.classes[c.id]=row.id;});
 plan.classes.forEach(c=>{const row=p.classes[ids.classes[c.id]],to=ids.classes[c.promotion];if(row&&to&&to!==row.id&&!D.fields(row,"classes").promotions)D.set("classes",row,"promotions",[to]);});
 // personajes (se suman las bases de la clase, como en FE)
 const firstUnit={};plan.chapters.forEach(ch=>ch.units.forEach(u=>{if(!firstUnit[u.character])firstUnit[u.character]=u;}));
 plan.characters.forEach(c=>{let row=reuse(p.actors,"actors",c);
  if(!row){row=D.create(p.actors,"actors",c.name);const cls=plan.classes.find(x=>x.id===c.classId),cb=cls?cls.bases:{},b=c.bases;
   if(ids.classes[c.classId])D.set("actors",row,"classId",ids.classes[c.classId]);D.set("actors",row,"initialLevel",Math.max(1,c.level||1));
   const sum=k=>Math.max(0,(cb[k]||0)+(b[k]||0));
   D.set("actors",row,"stats",{health:sum("health"),power:sum("power"),magic:sum("power"),skill:sum("skill"),speed:sum("speed"),luck:sum("luck"),defense:sum("defense"),resistance:sum("resistance"),move:cb.move||5,build:sum("build")});
   const g=c.growth;D.set("actors",row,"growth",{health:g.health,power:g.power,magic:g.power,skill:g.skill,speed:g.speed,luck:g.luck,defense:g.defense,resistance:g.resistance,move:0,build:0});
   if(Object.keys(c.ranks).length)D.set("actors",row,"ranks",c.ranks);
   const u=firstUnit[c.id];if(u&&u.items.length)D.set("actors",row,"inventory",u.items.map(i=>ids.items[i]).filter(Boolean));
   report.actors++;}
  // Repair legacy imported actors which still point at an invalid/default class.
  if(ids.classes[c.classId]&&((opts.source&&D.fields(row,"actors").fe8Source===opts.source)||legacyPlaceholders.has(row)&&opts.repairActors||!p.classes[row.classId]&&opts.repairActors))D.set("actors",row,"classId",ids.classes[c.classId]);
  identify("actors",row,c);ids.characters[c.id]=row.id;});
 // capítulos → mapas
 const maps=[],infos=p.mapInfos=p.mapInfos||[null];let nextId=Math.max(0,...infos.filter(Boolean).map(m=>m.id))+1,order=Math.max(0,...infos.filter(Boolean).map(m=>m.order||0))+1;
 const template=opts.template||{};
 plan.chapters.forEach(ch=>{
  const id=opts.replaceMapId&&plan.chapters.length===1?opts.replaceMapId:nextId++,w=ch.map.width,h=ch.map.height,data=new Array(w*h*6).fill(0),ground=0;
  for(let k=0;k<w*h;k++){data[k]=ground;data[5*w*h+k]=opts.terrainIds?(opts.terrainIds[ch.terrain[k]]||0):(ch.terrain[k]||0);}
  const map={autoplayBgm:false,autoplayBgs:false,battleback1Name:"",battleback2Name:"",bgm:{name:"",pan:0,pitch:100,volume:90},bgs:{name:"",pan:0,pitch:100,volume:90},disableDashing:false,
   displayName:ch.name,encounterList:[],encounterStep:30,height:h,note:"<FE8Import:"+(opts.source||"unknown")+":"+ch.index+">",parallaxLoopX:false,parallaxLoopY:false,parallaxName:"",parallaxShow:true,parallaxSx:0,parallaxSy:0,
   scrollType:0,specifyBattleback:false,tilesetId:template.tilesetId||1,width:w,data,events:[null]};
  let throne=false;
  ch.terrain.forEach((t,k)=>{const kind=MARKERS[t];if(!kind)return;if(kind==="goal"){if(throne)return;throne=true;}const e=M.create(map,kind,k%w,Math.floor(k/w),{});if(kind==="shop"){M.removeCommand(e,"Shop");M.setCommand(e,"Interaction",{type:"shop",name:"Tienda (sin inventario importado)",stock:[]});}});
  ch.units.forEach(u=>{const cls=ids.classes[u.classId]||0,inv=u.items.map(i=>ids.items[i]).filter(Boolean),weapon=inv.find(i=>i.kind==="weapon"),item=inv.find(i=>i.kind==="item"),actor=ids.characters[u.character];
   const named=plan.characters.find(x=>x.id===u.character),boss=u.team===2&&isBossIn(plan,u);
   if(!cls){report.skippedUnits=(report.skippedUnits||0)+1;return;}
   if(u.team===0&&actor&&Number(p.actors[actor].classId)===cls)M.create(map,"ally",u.x,u.y,{actorId:actor,level:u.level,lord:!!(named&&named.attributes&0x2000)});
   else if(u.team===2&&!boss&&!(named&&named.portraitId))M.create(map,"enemy",u.x,u.y,{classId:cls,level:u.level,role:u.ai[1]===3?"hold":"auto",weaponId:weapon?weapon.id:0,itemId:item?item.id:0});
   else{// jefes y unidades verdes: ★ Unidad con su personaje (sus estadísticas propias)
    const e=M.create(map,"enemy",u.x,u.y,{});M.removeCommand(e,"Enemy");
    M.setCommand(e,"Unit",{actorId:actor||0,classId:cls,name:named?named.name:"",team:u.team===2?"2":u.team===0?"1":"3",level:u.level,weaponId:weapon?weapon.id:0,itemId:item?item.id:0,ai:boss||u.ai[1]===3?"hold":"approach",boss});}
   report.units++;});
  M.setCommand(M.missionEvent(map,true),"Mission",{title:ch.name,objective:throne?"seize":"eliminate",mapGraphics:"resource"});
  infos[id]=Object.assign({id,expanded:false,order:order++,parentId:0,scrollX:0,scrollY:0},infos[id]||{},{name:ch.name});
  maps.push({id,chapter:ch,json:map,image:"img/astra/maps/Map"+String(id).padStart(3,"0")+".png"});report.maps++;});
 return {maps,report,ids};
};
// Allocate FE regions without overwriting the existing project's terrain definitions.
R.terrainMapping=function(existing,chapters){const terrain=Object.assign({},existing),ids={};const all=[...new Set(chapters.flatMap(c=>c.terrain))].filter(n=>n>0).sort((a,b)=>a-b);for(const n of all){const def=R.TERRAIN[n];if(!def){ids[n]=0;continue;}const [name,cost,extra]=def;const row=Object.assign({name,cost,color:"#667f60",fe8TerrainId:n},extra||{});let id=Number(Object.keys(terrain).find(k=>terrain[k]&&terrain[k].fe8TerrainId===n))||0;if(!id){id=!terrain[n]?n:Array.from({length:255},(_,i)=>i+1).find(i=>!terrain[i]);T.assert(id,"No quedan regiones libres para terreno FE8");terrain[id]=row;}ids[n]=id;}return {terrain,ids};};
const isBossIn=(plan,u)=>{const c=plan.characters.find(x=>x.id===u.character);return !!(c&&c.attributes&0x8000);};
// ---------- Gráficos FE8U: decodificación local, sin descargar recursos ----------
// Referencias de formato: FEBuilderGBA ROMFE8U / ImagePortraitForm / ImageUtilOAM,
// fireemblem8u include/bmunit.h, include/banim_data.h, src/data_banimconf.c.
// Las tablas se resuelven desde referencias del programa y se comprueban por estructura.
const RGB5=v=>[(v&31)*255/31|0,((v>>5)&31)*255/31|0,((v>>10)&31)*255/31|0];
const rgba=(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)});
const inRange=(b,o,n)=>Number.isInteger(o)&&o>=0&&n>=0&&o+n<=b.length;
const ptrAt=(b,o)=>inRange(b,o,4)?off(b,u32(b,o)):-1;
const palAt=(b,o,n=16)=>inRange(b,o,n*2)?Array.from({length:n},(_,i)=>RGB5(u16(b,o+i*2))):null;
const lzAt=(b,o,max)=>inRange(b,o,4)?R.lz77(b,o,max):null;
function pixel(dst,x,y,c){if(x<0||y<0||x>=dst.width||y>=dst.height||!c)return;const k=(y*dst.width+x)*4;dst.data.set([c[0],c[1],c[2],255],k);}
// GBA 4bpp: mosaicos 8x8, nibble bajo primero. El índice 0 es transparente.
R.decode4bpp=function(bytes,w,h,pal){
 if(!bytes||!pal||w%8||h%8||w<8||h<8||w*h/2>bytes.length)return null;
 const im=rgba(w,h),stride=w/8;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=((y>>3)*stride+(x>>3))*32+(y&7)*4+((x&7)>>1),v=bytes[k],n=x&1?v>>4:v&15;if(n)pixel(im,x,y,pal[n]);}
 return im;
};
function blit(dst,src,sx,sy,w,h,dx,dy,flip=false){
 if(!src)return;for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const X=dx+x,Y=dy+y,A=sx+(flip?w-1-x:x),B=sy+y;if(X<0||Y<0||X>=dst.width||Y>=dst.height||A<0||B<0||A>=src.width||B>=src.height)continue;
  const a=(B*src.width+A)*4,b=(Y*dst.width+X)*4;if(src.data[a+3])dst.data.set(src.data.subarray(a,a+4),b);
 }
}
function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let j=0;j<im.height;j++)for(let i=0;i<im.width;i++)if(im.data[(j*im.width+i)*4+3]){x=Math.min(x,i);y=Math.min(y,j);r=Math.max(r,i);b=Math.max(b,j);}return r<0?null:{x,y,w:r-x+1,h:b-y+1};}
const GFX_REFS={faces:[0x5524],standing:[0x26730,0x267B0,0x26838,0x26C88,0x28064,0x27F74],moving:[0x79584,0x79598,0xBAC2C,0xBAC40],battle:[0x59BD8,0x5A600,0x5A694,0x5A82C,0x6F6A8,0x70A60],icons:[0x36B4],iconPal:[0x35D0]};
function tableCandidates(rom,refs,score){const candidates=[...new Set(refs.map(x=>ptrAt(rom,x)).filter(x=>x>=0))];const ranked=candidates.map(at=>({at,score:score(at)})).sort((a,b)=>b.score-a.score);return ranked.length&&ranked[0].score>0?ranked[0].at:-1;}
R.graphicTables=function(ctx){
 if(ctx.graphicTables)return ctx.graphicTables;const b=ctx.rom;
 const count=(start,step,test)=>{let n=0;for(let i=0;i<12;i++){const at=start+i*step;if(inRange(b,at,step)&&test(at))n++;}return n>=3?n:0;};
 const compressed=o=>o>=0&&b[o]===0x10;
 const faces=tableCandidates(b,GFX_REFS.faces,a=>count(a,28,o=>compressed(ptrAt(b,o))&&inRange(b,ptrAt(b,o+8),32)));
 const standing=tableCandidates(b,GFX_REFS.standing,a=>count(a,8,o=>b[o+2]<=2&&compressed(ptrAt(b,o+4))));
 const moving=tableCandidates(b,GFX_REFS.moving,a=>count(a,8,o=>compressed(ptrAt(b,o))&&ptrAt(b,o+4)>=0));
 const battle=tableCandidates(b,GFX_REFS.battle,a=>count(a,32,o=>inRange(b,ptrAt(b,o+12),48)&&compressed(ptrAt(b,o+16))&&compressed(ptrAt(b,o+20))&&compressed(ptrAt(b,o+28))));
 const iconPal=ptrAt(b,GFX_REFS.iconPal[0]),icons=ptrAt(b,GFX_REFS.icons[0]);
 return ctx.graphicTables={faces,standing,moving,battle,icons,iconPal};
};
R.portrait=function(ctx,id){
 const b=ctx.rom,t=R.graphicTables(ctx).faces;if(t<0||!Number.isInteger(id)||id<=0||id>511)return null;const a=t+id*28;if(!inRange(b,a,28))return null;
 const p=palAt(b,ptrAt(b,a+8)),gfx=lzAt(b,ptrAt(b,a),0x10000);
 if(!p||!gfx){const other=lzAt(b,ptrAt(b,a+16),0x10000);if(!p||!other||other.length%320)return null;const h=other.length/40;if(h>160||h%8)return null;return R.decode4bpp(other,80,h,p);}
 // Main portrait is stored in a 32-tile-wide strip, not a linear 96x80 image.
 const sheet=R.decode4bpp(gfx,256,32,p);if(!sheet)return null;
 const im=rgba(96,80);
 // The centre consists of two 64x32 blocks, with four shoulder/edge strips.
 for(const [sx,sy,w,h,dx,dy] of [[0,0,64,32,16,0],[64,0,64,32,16,32],[128,0,32,16,16,64],[160,0,16,32,0,48],[128,16,32,16,48,64],[176,0,16,32,80,48]])blit(im,sheet,sx,sy,w,h,dx,dy);
 return bounds(im)?im:null;
};
R.mapPalettes=function(ctx){const b=ctx.rom,a=0x59EE20;return [4,0,1,2].map(i=>palAt(b,a+i*32));};
R.standingSprite=function(ctx,id,team=1){
 const b=ctx.rom,t=R.graphicTables(ctx).standing;if(t<0||!Number.isInteger(id)||id<0||id>255)return null;const a=t+id*8;
 if(!inRange(b,a,8))return null;const dims=[[16,16],[16,32],[32,32]][b[a+2]],p=R.mapPalettes(ctx)[team],gfx=lzAt(b,ptrAt(b,a+4),0x4000);
 if(!dims||!p||!gfx)return null;const [w,h]=dims;if(gfx.length!==w*h*3/2)return null;
 const src=R.decode4bpp(gfx,w,h*3,p);if(!src||!bounds(src))return null;const im=rgba(w*4,h*3);
 for(let row=0;row<3;row++)for(let i=0;i<4;i++)blit(im,src,0,[0,1,2,1][i]*h,w,h,i*w,row*h);
 return {image:im,width:w,height:h,anchorY:h};
};
// Preserve the complete source moving sheet. Direction assignment assumes the standard vanilla sheet
// convention: 4 down, 4 up, 4 side, 3 selected; custom AP scripts may use a different layout.
R.movingSprite=function(ctx,classId,team=1){
 const b=ctx.rom,t=R.graphicTables(ctx).moving;if(t<0||classId<1||classId>255)return null;
 const a=t+(classId-1)*8,gfx=lzAt(b,ptrAt(b,a),0x10000),p=R.mapPalettes(ctx)[team];
 if(!gfx||!p||gfx.length!==32*32*15/2)return null;const src=R.decode4bpp(gfx,32,32*15,p);if(!src||!bounds(src))return null;
 const im=rgba(128,128),seq=[0,8,8,4];for(let row=0;row<4;row++)for(let f=0;f<4;f++)blit(im,src,0,(seq[row]+f)*32,32,32,f*32,row*32,row===2);
 return {image:im,source:src,width:32,height:32,anchorY:32};
};
// Native RPG Maker MZ sheets B-E. B: tile 0 is reserved for transparency.
// Slots 1..1023 use the same addressing as Tilemap._drawNormalTile.
R.nativeTiles=function(ch,im){
 const w=ch.map.width,h=ch.map.height,n=w*h;
 T.assert(im&&im.width===w*16&&im.height===h*16&&ch.map.tiles.length===n,"Mapa FE8 inválido para tiles MZ");
 const slots=new Map(),sheets=[],ids=[],flags=new Array(8192).fill(0);flags[0]=0x10;
 for(let k=0;k<n;k++){
  const key=ch.map.tiles[k],terrain=ch.terrain[k]||0;let id=slots.get(key);
  if(id===undefined){id=slots.size+1;T.assert(id<=1023,"El capítulo supera los 1023 tiles B–E de MZ");slots.set(key,id);
   const page=id>>8,local=id&255;if(!sheets[page])sheets[page]=rgba(256,256);
   const x=((local>>7)*8+local%8)*16,y=(Math.floor(local/8)%16)*16;
   blit(sheets[page],im,k%w*16,Math.floor(k/w)*16,16,16,x,y);
   const t=R.TERRAIN[terrain];flags[id]=t&&t[1]===0?15:0;
  }ids.push(id);
 }
 return {sheets,ids,flags,unique:slots.size};
};
// RPG Maker's single-character sheet: 3 columns x 4 directions, nearest-neighbour scaled by caller.
R.nativeCharacter=function(sprite,moving){
 const src=moving||sprite;if(!src)return null;const w=src.width,h=src.height,im=rgba(w*3,h*4);
 for(let row=0;row<4;row++)for(let f=0;f<3;f++)blit(im,src.image,f*w,(moving?row:0)*h,w,h,f*w,row*h);
 return im;
};
R.itemIcon=function(ctx,id){const b=ctx.rom,t=R.graphicTables(ctx),p=palAt(b,t.iconPal),a=t.icons+id*128;if(t.icons<0||!p||id<0||id>255||!inRange(b,a,128))return null;return R.decode4bpp(b.subarray(a,a+128),16,16,p);};
R.classAnimationDefs=function(ctx,cls){
 const b=ctx.rom,a=ptrAt(b,cls.offset+0x34),out=[];if(a<0)return out;
 for(let i=0;i<64;i++){const o=a+i*4;if(!inRange(b,o,4))break;const type=u16(b,o),id=u16(b,o+2);if(!type&&!id)break;if(!id||id>1024||type>0x1FF)break;out.push({id,type:type&255,byType:!!(type&256)});}
 return out;
};
const s16=v=>v&0x8000?v-0x10000:v;
const SIZES=[[[8,8],[16,16],[32,32],[64,64]],[[16,8],[32,8],[32,16],[64,32]],[[8,16],[8,32],[16,32],[32,64]]];
// Render the non-affine OAM objects with 2D tile addressing and the GBA draw order.
// Affine frames are not silently approximated: reject them and report the affected animation.
R.battleFrame=function(gfx,oam,start,pal){
 if(!gfx||gfx.length<8192||!oam||!pal||!Number.isInteger(start)||start<0)return null;
 const objects=[];let end=false;for(let i=start,n=0;n<256&&inRange(oam,i,12);i+=12,n++){
  if(oam[i]===1||u32(oam,i)===0xFFFFFF00){end=true;break;}
  if(oam[i+2]===255&&oam[i+3]===255)throw new Error("OAM afín no soportado");
  if(oam[i]!==0)throw new Error("OAM inválido");
  const a=oam[i+1],s=oam[i+3];if(a&3)throw new Error("OAM afín no soportado");
  const dim=SIZES[a>>6]&&SIZES[a>>6][s>>6];if(!dim)throw new Error("Forma OAM inválida");
  const tile=u16(oam,i+4)&255,bank=oam[i+5]>>4;if(bank*16+15>=pal.length)throw new Error("Paleta OAM fuera de rango");
  const x=s16(u16(oam,i+6)),y=s16(u16(oam,i+8));if(Math.abs(x)>240||Math.abs(y)>160)throw new Error("Posición OAM fuera de rango");
  objects.push({w:dim[0],h:dim[1],tile,bank,x,y,hf:!!(s&0x10),vf:!!(s&0x20)});
 }
 if(!end||!objects.length)return null;
 // Coordinates remain relative to the unit; use a stable origin for every frame.
 const im=rgba(512,352);for(const o of objects.reverse())for(let y=0;y<o.h;y++)for(let x=0;x<o.w;x++){
  const sx=o.hf?o.w-1-x:x,sy=o.vf?o.h-1-y:y,tile=o.tile+(sy>>3)*32+(sx>>3),k=tile*32+(sy&7)*4+((sx&7)>>1);
  if(k>=gfx.length)continue;const v=gfx[k],n=sx&1?v>>4:v&15;if(n)pixel(im,256+o.x+x,176+o.y+y,pal[o.bank*16+n]);
 }
 return bounds(im)?im:null;
};
R.battleAnimation=function(ctx,id){
 const rom=ctx.rom,t=R.graphicTables(ctx).battle;if(t<0||id<1||id>1024)return null;const a=t+(id-1)*32;if(!inRange(rom,a,32))return null;
 const header=ptrAt(rom,a+12),script=lzAt(rom,ptrAt(rom,a+16),0x40000),oam=lzAt(rom,ptrAt(rom,a+24),0x40000),palRaw=lzAt(rom,ptrAt(rom,a+28),0x4000);
 if(!inRange(rom,header,48)||!script||!oam||!palRaw||palRaw.length<32)return null;
 const pal=palAt(palRaw,0,Math.min(64,palRaw.length/2)),modes={},frames=[],cache=new Map(),sheets=new Map(),errors=[];
 const atMode=m=>u32(rom,header+(m-1)*4);
 function track(m){
  const start=atMode(m);if(start>=script.length||start%4)return null;let end=script.length;
  for(let j=1;j<=12;j++){const p=atMode(j);if(p>start&&p<end)end=p;}
  const steps=[];let impact=-1,ticks=0;
  for(let p=start;p+4<=end;){const cmd=script[p+3];if(cmd===0x80)break;
   if(cmd===0x85){if(impact<0&&[0x05,0x09,0x1A].includes(script[p]))impact=steps.length;p+=4;continue;}
   if(cmd!==0x86){p+=4;continue;}
   if(p+12>end)throw new Error("Fotograma truncado");// absolute ROM address, not script-relative
   const addr=off(rom,u32(script,p+4)),oa=u32(script,p+8),key=addr+":"+oa,wait=Math.max(1,u16(script,p));
   if(wait>1200||ticks+wait>1200)throw new Error("Duración fuera de rango");
   let fi=cache.get(key);if(fi===undefined){if(frames.length>=256)throw new Error("Demasiados fotogramas");let gfx=sheets.get(addr);if(!gfx){gfx=lzAt(rom,addr,0x10000);sheets.set(addr,gfx);}const img=R.battleFrame(gfx,oam,oa,pal);if(!img)throw new Error("Fotograma vacío o ilegible");const b=bounds(img),trim=rgba(b.w,b.h);blit(trim,img,b.x,b.y,b.w,b.h,0,0);fi=frames.length;frames.push({image:trim,ox:256-b.x,oy:176-24-b.y});cache.set(key,fi);}
   steps.push({frame:fi,ticks:wait});ticks+=wait;p+=12;
  }
  return steps.length?{steps,impact:impact<0?Math.floor(steps.length/2):Math.min(impact,steps.length-1),estimatedImpact:impact<0}:null;
 }
 // Keep normal/critical/ranged/idle/dodge/miss separate, with actual source frame durations.
 for(const [key,m] of Object.entries({normal:1,critical:3,farNormal:5,farCritical:6,dodge:7,idle:9,farIdle:10,miss:12}))try{const tr=track(m);if(tr)modes[key]=tr;}catch(e){errors.push(key+": "+e.message);}
 if(!Object.keys(modes).length)return null;
 return {id,name:"FE8_Anim_"+id,frames,modes,errors};
};
// Build one atlas with fixed per-frame anchors. Do not duplicate missing animation modes.
R.animationPack=function(anim,name,path){
 const sizes=anim.frames.map(f=>({w:f.image.width,h:f.image.height})),shelf=D.shelf(sizes,2048);
 if(shelf.height>8192||shelf.width*shelf.height>16000000)throw new Error("Atlas demasiado grande");
 const im=rgba(shelf.width,shelf.height),rects=[];anim.frames.forEach((f,i)=>{const p=shelf.pos[i],w=f.image.width,h=f.image.height;blit(im,f.image,0,0,w,h,p.x,p.y);rects.push({x:p.x,y:p.y,w,h,ox:f.ox,oy:f.oy});});
 const clips={},modeKeys={};for(const [mode,t] of Object.entries(anim.modes)){const frames=[];let impact=0;t.steps.forEach((s,i)=>{if(i===t.impact)impact=frames.length;for(let n=0;n<s.ticks;n++)frames.push([{atlas:name,rect:s.frame,x:0,y:0,zoom:1,angle:0,mirror:false,opacity:1,blend:0}]);});const key=({farNormal:name+"_far:normal",farCritical:name+"_far:critical",idle:name+"_idle:normal",farIdle:name+"_far_idle:normal",dodge:name+"_dodge:normal"})[mode]||name+":"+mode;modeKeys[mode]=key;clips[key]={fps:60,impact,frames};}
 return {image:im,atlas:{path,rects},clips,modeKeys};
};

})(typeof globalThis!=="undefined"?globalThis:this);
