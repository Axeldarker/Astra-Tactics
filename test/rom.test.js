"use strict";
// Importador de hacks de FE8: se fabrica una ROM mínima con las mismas estructuras (tablas, textos,
// mapas LZ77, configuración de tiles, eventos con LOAD) y un hack que cambia datos y mueve una tabla.
const test=require("node:test"),assert=require("node:assert"),fs=require("fs"),path=require("path");
const {loadEngine,mzDatabase}=require("./helpers");
const T=loadEngine();["01_Model.js","02_Database.js","03_Rom.js"].forEach(f=>new Function("globalThis","module",fs.readFileSync(path.join(__dirname,"..","src","editor",f),"utf8"))({Tactics:T},undefined));
const R=T.Editor.Rom,B=0x08000000;
const w16=(b,o,v)=>{b[o]=v&255;b[o+1]=v>>8&255;},w32=(b,o,v)=>{b[o]=v&255;b[o+1]=v>>>8&255;b[o+2]=v>>>16&255;b[o+3]=v>>>24&255;};
// LZ77 solo con literales (válido para el descompresor de GBA).
const lz=data=>{const out=[0x10,data.length&255,data.length>>8&255,data.length>>16&255];for(let i=0;i<data.length;i+=8){out.push(0);for(let k=i;k<Math.min(i+8,data.length);k++)out.push(data[k]);}return Uint8Array.from(out);};
// Huffman mínimo para "Eirika", "Seth", "Soldier", "Boss"…: árbol completo sobre los caracteres usados.
function huffman(strings){
 const chars=[...new Set(strings.join("")+"\0")];const nodes=[],codes={};
 chars.forEach(c=>{nodes.push([c.charCodeAt(0),0xFFFF]);});
 let level=chars.map((c,i)=>({i,cs:[c]}));
 while(level.length>1){const next=[];for(let k=0;k<level.length;k+=2){if(k+1>=level.length){next.push(level[k]);continue;}const a=level[k],b=level[k+1];nodes.push([a.i,b.i]);
   a.cs.forEach(c=>codes[c]="0"+(codes[c]||""));b.cs.forEach(c=>codes[c]="1"+(codes[c]||""));next.push({i:nodes.length-1,cs:a.cs.concat(b.cs)});}level=next;}
 const encode=s=>{const bits=[...(s+"\0")].map(c=>codes[c]).join(""),bytes=[];for(let i=0;i<bits.length;i+=8){let v=0;for(let k=0;k<8&&i+k<bits.length;k++)if(bits[i+k]==="1")v|=1<<k;bytes.push(v);}return bytes;};
 return {nodes,root:nodes.length-1,encode};
}
const F=R.FE8U;
function makeRom(){
 const rom=new Uint8Array(0xA00000);"BE8E".split("").forEach((c,i)=>rom[0xAC+i]=c.charCodeAt(0));
 const at=a=>a-B;
 // referencias desde "código"
 [["characters",0x1000],["classes",0x1004],["items",0x1008],["chapters",0x100C],["assets",0x1010],["text",0x1014]].forEach(([k,o])=>w32(rom,o,typeof F[k]==="number"?F[k]:F[k].addr));
 w32(rom,F.textPointer,F.text);
 // textos: 1..N
 const names=["","Eirika","Seth","Lord","Paladin","Soldier","Iron Sword","Vulnerary","Boss","Knight","Prologue map"];
 const h=huffman(names.filter(Boolean)),tree=0x150000;h.nodes.forEach((n,i)=>{w16(rom,tree+i*4,n[0]);w16(rom,tree+i*4+2,n[1]);});
 const rootPtr=0x151000;w32(rom,rootPtr,B+tree+h.root*4);w32(rom,F.huffman[0],B+tree);w32(rom,F.huffman[1],B+rootPtr);
 let strAt=0x152000;const textTable=at(F.text);
 names.forEach((s,id)=>{if(!s)return;const bytes=h.encode(s);rom.set(bytes,strAt);w32(rom,textTable+id*4,B+strAt);strAt+=bytes.length+4;});
 // personajes (fila 0 = personaje 1)
 const ch=at(F.characters.addr);
 for(let k=0;k<12;k++){const o=ch+k*0x34;rom[o+4]=k+1;w16(rom,o,0);}
 const setChar=(id,name,cls,lvl,attr)=>{const o=ch+(id-1)*0x34;w16(rom,o,name);rom[o+4]=id;rom[o+5]=cls;rom[o+0xB]=lvl;rom[o+0xC]=3;rom[o+0xD]=2;rom[o+0x14]=31;rom[o+0x1C]=70;rom[o+0x1D]=40;w32(rom,o+0x28,attr||0);};
 setChar(1,1,1,1);setChar(2,2,2,1);setChar(8,8,3,5,0x8000);setChar(9,5,3,1);
 // clases (fila 0 vacía)
 const cl=at(F.classes.addr);
 for(let k=1;k<13;k++){const o=cl+k*0x54;rom[o+4]=k;}
 const setClass=(id,name,hp,mov,rank,attr,promo)=>{const o=cl+id*0x54;w16(rom,o,name);rom[o+4]=id;rom[o+5]=promo||0;rom[o+0xB]=hp;rom[o+0xC]=5;rom[o+0x12]=mov;rom[o+0x1B]=60;w32(rom,o+0x28,attr||0);rom[o+0x2C+rank]=1;};
 setClass(1,3,16,5,0,0,4);setClass(2,4,22,8,1,0x400);setClass(3,5,18,5,1);setClass(4,9,25,6,0);
 // objetos
 const it=at(F.items.addr);
 for(let k=1;k<13;k++){const o=it+k*0x24;rom[o+6]=k;}
 const setItem=(id,name,type,attr,mt,range,uses,cost)=>{const o=it+id*0x24;w16(rom,o,name);rom[o+6]=id;rom[o+7]=type;w32(rom,o+8,attr);rom[o+0x14]=uses;rom[o+0x15]=mt;rom[o+0x16]=90;rom[o+0x17]=5;rom[o+0x19]=range;w16(rom,o+0x1A,cost);};
 setItem(1,6,0,1,5,0x11,46,10);setItem(2,7,9,0,0,0,3,100);
 // mapa 4×3, configuración, gráficos y paleta
 const assets=at(F.assets);let blob=0x700000;const put=(idx,bytes)=>{rom.set(bytes,blob);w32(rom,assets+idx*4,B+blob);blob+=(bytes.length+3)&~3;};
 const mapBytes=[4,3];const tiles=[0,4,4,8, 0,0,12,0, 0,0,0,16];tiles.forEach(t=>{mapBytes.push(t&255,t>>8);});put(1,lz(mapBytes));
 const cfg=new Uint8Array(0x2400);for(let m=0;m<8;m++)for(let q=0;q<4;q++)w16(cfg,m*8+q*2,m|(1<<12));cfg[0x2000+0]=1;cfg[0x2000+1]=12;cfg[0x2000+2]=0x20;cfg[0x2000+3]=0x1F;cfg[0x2000+4]=3;put(2,lz(cfg));
 const gfx=new Uint8Array(8*32);for(let t=0;t<8;t++)gfx.fill(t*0x11,t*32,t*32+32);put(3,lz(gfx));
 const pal=new Uint8Array(0x40);for(let k=0;k<32;k++)w16(pal,k*2,k*1057&0x7FFF);put(4,pal);
 // eventos: grupo con escena inicial en +0x48 → LOAD1 unidades; ENDA
 const units=blob+0x400,script=blob,group=blob+0x200;blob+=0x800;
 const unit=(o,char,cls,lvl,team,x,y,items,ai)=>{rom[o]=char;rom[o+1]=cls;rom[o+3]=(lvl<<3)|(team<<1);w16(rom,o+4,x|(y<<6));(items||[]).forEach((v,i)=>rom[o+12+i]=v);(ai||[]).forEach((v,i)=>rom[o+16+i]=v);};
 unit(units,1,1,1,0,0,0,[1,2]);unit(units+20,9,3,2,2,3,1,[1],[0,3,0,0]);unit(units+40,8,3,5,2,3,2,[1]);
 rom.set([0x40,0x2C,1,0],script);w32(rom,script+4,B+units);rom.set([0x20,0x01,0,0],script+8);
 w32(rom,group+0x48,B+script);w32(rom,assets+5*4,B+group);
 // capítulos: 0 (prólogo) y 1 (sin eventos)
 const chap=at(F.chapters.addr);[0,1].forEach(c=>{const o=chap+c*0x94;rom[o+4]=3;rom[o+5]=0;rom[o+6]=4;rom[o+7]=2;rom[o+8]=1;rom[o+0x74]=c===0?5:0;});
 w32(rom,chap,B+0x153000);rom.set([..."Prologue"].map(c=>c.charCodeAt(0)),0x153000);
 return rom;
}
// Codificador UPS (para la prueba).
const venc=v=>{const o=[];for(;;){const x=v&0x7f;v=Math.floor(v/128);if(v===0){o.push(0x80|x);break;}o.push(x);v--;}return o;};
function ups(a,b){const out=[..."UPS1"].map(c=>c.charCodeAt(0)).concat(venc(a.length),venc(b.length));let last=0;const n=Math.max(a.length,b.length);
 for(let i=0;i<n;i++){const x=(a[i]||0)^(b[i]||0);if(!x)continue;out.push(...venc(i-last));while(i<n&&((a[i]||0)^(b[i]||0))){out.push((a[i]||0)^(b[i]||0));i++;}out.push(0);last=i+1;}
 const tail=[],w=v=>tail.push(v&255,v>>>8&255,v>>>16&255,v>>>24&255);w(R.crc32(a));w(R.crc32(b));const body=Uint8Array.from(out.concat(tail));const p=new Uint8Array(body.length+4);p.set(body);const c=R.crc32(body);p[body.length]=c&255;p[body.length+1]=c>>>8&255;p[body.length+2]=c>>>16&255;p[body.length+3]=c>>>24&255;return p;}
function makeHack(clean){
 const hack=clean.slice();
 // el hack sube los crecimientos de Seth y mueve la tabla de personajes
 const old=F.characters.addr-B,moved=0x900000;hack.set(clean.subarray(old,old+12*0x34),moved);hack.fill(0,old,old+12*0x34);w32(hack,0x1000,B+moved);
 hack[moved+0x34+0x1C]=90;
 // y recoloca al soldado del prólogo
 const units=R.u32(clean,R.u32(clean,(F.assets-B)+5*4)-B+0x48)-B;
 const ua=R.u32(clean,units+4)-B;w16(hack,ua+20+4,2|(1<<6));
 return hack;
}

test("UPS: aplicar el parche reproduce el hack y rechaza otra ROM",()=>{
 const a=makeRom(),b=makeHack(a),p=ups(a,b),out=R.applyUPS(a,p);
 assert.equal(out.length,b.length);assert.equal(R.crc32(out),R.crc32(b));
 const other=a.slice();other[5]=1;assert.throws(()=>R.applyUPS(other,p),/otra ROM/);
 assert.equal(R.crc32(R.applyPatch(a,p)),R.crc32(b));
 assert.equal(R.applyPatch(a,b),b,"una ROM ya parcheada también vale");
});
test("BPS: lecturas de origen y de destino",()=>{
 const a=Uint8Array.from([1,2,3,4,5,6,7,8]),b=Uint8Array.from([1,2,3,9,9,6,7,8,1,2]);
 const body=[..."BPS1"].map(c=>c.charCodeAt(0)).concat(venc(8),venc(10),venc(0),venc((3-1)*4+0),venc((2-1)*4+1),9,9,venc((3-1)*4+0),venc((2-1)*4+2),venc(0));
 const tail=[],w=v=>tail.push(v&255,v>>>8&255,v>>>16&255,v>>>24&255);w(R.crc32(a));w(R.crc32(b));const bb=Uint8Array.from(body.concat(tail)),p=new Uint8Array(bb.length+4);p.set(bb);const c=R.crc32(bb);[0,8,16,24].forEach((s,i)=>p[bb.length+i]=c>>>s&255);
 assert.deepEqual(Array.from(R.applyBPS(a,p)),Array.from(b));
});
test("LZ77 con referencias hacia atrás",()=>{
 // "ab" + copia de 4 bytes a distancia 2 → "ababab"
 const z=Uint8Array.from([0x10,6,0,0,0x20,97,98,0x10,0x01]);assert.equal(String.fromCharCode(...R.lz77(z,0)),"ababab");
 assert.equal(R.lz77(Uint8Array.from([0x11,1,0,0]),0),null);
});
test("ROM limpia: tablas, textos Huffman, capítulos y unidades",()=>{
 const rom=makeRom(),ctx=R.open(rom);assert.deepEqual(ctx.errors,[]);
 assert.ok(ctx.huffman,"descifra el árbol de Huffman");
 const d=R.read(ctx);
 assert.equal(d.characters[1].name,"Eirika");assert.equal(d.characters[2].name,"Seth");assert.equal(d.classes[2].name,"Paladin");assert.equal(d.items[1].name,"Iron Sword");
 assert.equal(d.items[1].weapon,true);assert.equal(d.items[1].minRange,1);assert.equal(d.items[2].weapon,false);
 assert.equal(d.chapters.length,2);const c=d.chapters[0];
 assert.equal(c.name,"Prologue");assert.equal(c.map.width,4);assert.equal(c.map.height,3);
 assert.deepEqual(c.terrain,[1,12,12,0x20,1,1,0x1F,1,1,1,1,3]);
 assert.equal(c.units.length,3);assert.deepEqual([c.units[1].x,c.units[1].y,c.units[1].team,c.units[1].level],[3,1,2,2]);
 const img=R.renderMap(ctx,c);assert.equal(img.width,64);assert.equal(img.height,48);assert.equal(img.data[3],255);
});
test("hack: encuentra la tabla movida, detecta cambios y lo importa a MZ",()=>{
 const clean=makeRom(),hack=R.applyUPS(clean,ups(clean,makeHack(clean)));
 const cc=R.open(clean),hc=R.open(hack,cc);assert.deepEqual(hc.errors,[]);
 assert.equal(hc.charactersAt,0x900000,"sigue el puntero nuevo");
 const cd=R.read(cc),hd=R.diff(cd,R.read(hc));
 assert.equal(hd.characters[2].changed,"changed");assert.equal(hd.characters[1].changed,"");
 assert.equal(hd.chapters[0].changed,"changed");assert.equal(hd.chapters[1].changed,"");
 const plan=R.plan(hd,[0]);
 assert.deepEqual(plan.characters.map(c=>c.name),["Eirika","Seth","Boss"],"cambiados + los que usa el capítulo (no el soldado genérico)");
 const p=Object.assign(mzDatabase(),{mapInfos:[null,{id:1,name:"Mapa",order:1}]});
 const res=R.apply(p,plan,{template:{tilesetId:3,data:[7]}});
 assert.equal(res.maps.length,1);const m=res.maps[0];assert.equal(m.id,2);assert.equal(p.mapInfos[2].name,"Prologue");
 assert.equal(m.json.width,4);assert.equal(m.json.data[5*12+1],12,"terreno en la capa de regiones");assert.equal(m.json.tilesetId,3);
 const M=T.Editor,kinds=m.json.events.filter(Boolean).map(e=>M.kind(e)).sort();
 assert.deepEqual(kinds,["ally","chest","enemy","enemy","goal","mission","village"]);
 const eirika=p.actors.find(a=>a&&a.name==="Eirika"),D=M.Db;assert.ok(eirika);
 const f=D.fields(eirika,"actors");assert.equal(f.stats.health,19,"bases de clase + personaje");assert.deepEqual(f.inventory.map(i=>i.kind),["weapon","item"]);
 const boss=m.json.events.filter(Boolean).find(e=>M.find(e,"Unit"));assert.equal(M.find(boss,"Unit").args.boss,true);assert.equal(M.find(boss,"Unit").args.actorId,p.actors.find(a=>a&&a.name==="Boss").id);
 const lord=p.classes.find(c=>c&&c.name==="Lord");assert.deepEqual(D.fields(lord,"classes").promotions,[p.classes.find(c=>c&&c.name==="Knight").id]);
 const paladin=p.classes.find(c=>c&&c.name==="Paladin");assert.equal(D.fields(paladin,"classes").moveType,"mounted");
 const sword=p.weapons.find(w=>w&&w.name==="Iron Sword");assert.equal(D.fields(sword,"weapons").category,"blade");assert.equal(sword.price,460);
 // el mapa compila para el juego
 const compiled=T.compileMap(m.json,m.id);assert.ok(compiled.units.length>=3);
});
