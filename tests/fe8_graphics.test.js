/* Synthetic fixtures only: no copyrighted ROM or assets. Run from repository with node tests/fe8_graphics.test.js. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const run=s=>vm.runInThisContext(s);
if(process.env.ASTRA_TEST_HTML){const h=fs.readFileSync(process.env.ASTRA_TEST_HTML,'utf8'),scripts=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];run(scripts[0][1]);run(scripts[1][1]);}
else{for(const f of fs.readdirSync(path.join(root,'src/core')).filter(x=>/^\d+.*\.js$/.test(x)).sort())run(fs.readFileSync(path.join(root,'src/core',f),'utf8'));for(const f of ['01_Model.js','02_Database.js','03_Rom.js'])run(fs.readFileSync(path.join(root,'src/editor',f),'utf8'));}
const T=globalThis.Tactics,R=T.Editor.Rom,D=T.Editor.Db;
const B=new Uint8Array(0x600000),u16=(a,o,v)=>{a[o]=v&255;a[o+1]=v>>8&255;},u32=(a,o,v)=>{for(let i=0;i<4;i++)a[o+i]=v>>>(8*i)&255;},ptr=(o,p)=>u32(B,o,0x08000000+p);
function literal(at,raw){B[at]=0x10;B[at+1]=raw.length&255;B[at+2]=raw.length>>8&255;B[at+3]=raw.length>>16&255;let pos=at+4;for(let i=0;i<raw.length;i+=8){B[pos++]=0;for(let k=i;k<Math.min(i+8,raw.length);k++)B[pos++]=raw[k];}}
const pal=0x40000;for(let i=0;i<16;i++)u16(B,pal+i*2,i===1?31:0);for(let team=0;team<5;team++)for(let i=0;i<16;i++)u16(B,0x59EE20+team*32+i*2,i===1?31:0);
const ctx={rom:B};
// Table reference resolution; enough entries to identify a valid structural table.
ptr(0x5524,0x10000);ptr(0x26730,0x11000);ptr(0x79584,0x12000);ptr(0x59BD8,0x13000);ptr(0x36B4,0x41000);ptr(0x35D0,pal);
literal(0x50000,new Uint8Array(4096).fill(0x11));literal(0x52000,new Uint8Array(384).fill(0x11));literal(0x54000,new Uint8Array(7680).fill(0x11));
for(let i=0;i<5;i++){const f=0x10000+i*28;ptr(f,0x50000);ptr(f+8,pal);const s=0x11000+i*8;B[s+2]=0;ptr(s+4,0x52000);ptr(0x12000+i*8,0x54000);ptr(0x12004+i*8,0x60000);}
const sheet=new Uint8Array(8192);sheet.fill(0x11,0,32);literal(0x70000,sheet);
const oam=new Uint8Array(24);oam[12]=1;literal(0x5B000,oam);const palette=new Uint8Array(128);u16(palette,2,31);literal(0x5C000,palette);
const sc=new Uint8Array(20);u32(sc,0,0x86000003);u32(sc,4,0x08070000);u32(sc,8,0);u32(sc,12,0x85000005);u32(sc,16,0x80000000);literal(0x5D000,sc);
for(let i=0;i<12;i++)u32(B,0x61000+i*4,0);for(let i=0;i<4;i++){const o=0x13000+i*32;ptr(o+12,0x61000);ptr(o+16,0x5D000);ptr(o+20,0x5B000);ptr(o+24,0x5B000);ptr(o+28,0x5C000);}
B.fill(0x11,0x41000,0x41080);
assert.equal(R.graphicTables(ctx).faces,0x10000);assert.equal(R.graphicTables(ctx).standing,0x11000);assert.equal(R.graphicTables(ctx).battle,0x13000);
const portrait=R.portrait(ctx,1);assert.equal(portrait.width,96);assert.equal(portrait.height,80);assert.equal(portrait.data[(10*96+16)*4+3],255);assert.equal(portrait.data[3],0);
const sprite=R.standingSprite(ctx,1,2);assert.equal(sprite.image.width,64);assert.equal(sprite.image.height,48);assert.equal(sprite.image.data[3],255);
const moving=R.movingSprite(ctx,1,1);assert.equal(moving.image.width,128);assert.equal(moving.source.height,480);
assert.equal(R.itemIcon(ctx,0).data[3],255);
const a=R.battleAnimation(ctx,1);assert(a&&a.modes.normal);assert.equal(a.modes.normal.steps[0].ticks,3);assert.equal(a.frames[0].image.width,8);
const built=R.animationPack(a,'FE8_TEST','img/test.png');assert.equal(built.clips['FE8_TEST:normal'].frames.length,3);assert.equal(built.modeKeys.farNormal,'FE8_TEST_far:normal');assert(D.animations({clips:built.clips})['FE8_TEST_far']);
assert.equal(R.portrait(ctx,9999),null);assert.equal(R.standingSprite(ctx,9999),null);assert.equal(R.battleFrame(sheet,oam,500,palette),null);
const bad=oam.slice();bad[1]=1;assert.throws(()=>R.battleFrame(sheet,bad,0,Array(64).fill([0,0,0])),/afín/);
const def={bases:{health:20,move:5,power:5},growth:{health:20,power:20,skill:20,speed:20,luck:20,defense:20,resistance:20},ranks:{blade:30},attributes:0,promotion:0};
const cls1={...def,id:1,name:'Igual'},cls2={...def,id:2,name:'Igual'},character={...def,id:1,name:'Actor',classId:1,level:1,portraitId:1};
const ch={index:0,name:'Prueba',map:{width:2,height:2},terrain:[1,6,1,1],units:[{character:1,classId:1,level:1,team:0,x:0,y:0,items:[],ai:[0,0,0,0]}]};
const data={characters:{1:character},classes:{1:cls1,2:cls2},items:{},chapters:[ch]};
const plan=R.plan(data,[0],{allData:true});assert.equal(plan.classes.length,2);
const project={actors:[null],classes:[null],weapons:[null],items:[null],mapInfos:[null]};
const tm=R.terrainMapping({1:{name:'Existing',cost:99}},plan.chapters);assert.notEqual(tm.ids[1],1);assert.equal(tm.terrain[1].cost,99);
const result=R.apply(project,plan,{source:'test',terrainIds:tm.ids,nativePreview:true});assert.notEqual(result.ids.classes[1],result.ids.classes[2]);assert.equal(result.maps[0].json.data[0],0);assert.equal(result.maps[0].json.data[20],tm.ids[1]);assert.equal(T.Editor.check(result.maps[0].json,1).ok,true);
const repair=R.apply(project,R.plan(data,[],{allData:true}),{source:'test'});assert.equal(repair.report.maps,0);assert.equal(repair.ids.classes[1],result.ids.classes[1]);assert.equal(repair.ids.classes[2],result.ids.classes[2]);
console.log('OK: tablas gráficas, retrato, sprites, iconos, OAM, clips, regiones, tienda vacía, IDs y reparación sin mapas.');
// Regression: actual FE8U double-indirected Huffman root, direct text pointer.
const textCtx={rom:B,charactersAt:0x20000,charactersShift:1,textAt:0x21000,crc:R.FE8U.crc,notes:[]};
B[0x20004]=1;u16(B,0x20000,1);ptr(0x21004,0x24000);
const tree=0x22000,holder=0x23000;ptr(0x6E0,tree);ptr(0x6DC,holder);ptr(holder,tree+6*4);
// Three pair leaves, terminator; internal nodes 4,5,6. Bits 00,01,10,11 in LSB order.
for(const [i,word] of [[0,0x6945],[1,0x6972],[2,0x616B],[3,0]])u32(B,tree+i*4,(0xFFFF0000|word)>>>0);
u32(B,tree+16,0x00010000);u32(B,tree+20,0x00030002);u32(B,tree+24,0x00050004);B[0x24000]=0xD8;
R.setupText(textCtx);assert.equal(textCtx.text(1),'Eirika');assert.deepEqual(textCtx.huffman,{tree,root:tree+24});
// Intro with a cutscene on another map, then normal map and battle units.
const group=0x25000,main=0x25100,cut=0x25200,ally=0x25300,enemy=0x25400,extra=0x25500,redas=0x25600;
ptr(group+0x48,main);ptr(group+0x28,ally);
function cmd(o,op,len=2,sub=0,arg=0,target=0){B[o]=len*16+sub;B[o+1]=op;u16(B,o+2,arg);if(len===4)ptr(o+4,target);}
function unit(o,id,cls,team,x,y){B[o]=id;B[o+1]=cls;B[o+3]=(1<<3)|(team<<1);u16(B,o+4,x|(y<<6));}
unit(ally,1,1,0,1,1);B[ally+7]=1;ptr(ally+8,redas);B[redas]=3;B[redas+1]=4;
unit(enemy,2,1,2,5,5);unit(extra,5,1,0,3,3);
cmd(main,0x0A,4,0,0,cut);cmd(main+8,0x2C,4,0,1,ally);cmd(main+16,0x2C,4,0,1,enemy);cmd(main+24,1);
cmd(cut,0x25,2,0,16);cmd(cut+4,0x2C,4,0,1,extra);cmd(cut+12,0x25,2,0,0);cmd(cut+16,1);
const placed=R.initialUnitLoads(B,group,0);assert.deepEqual(placed.map(x=>x.character),[1,2]);assert.equal(placed[0].redaX,3);assert.equal(placed[0].redaY,4);
// Native tiles: more than 256 unique metatiles; verify addressing and every output pixel.
const W=20,H=14,im={width:W*16,height:H*16,data:new Uint8ClampedArray(W*16*H*16*4)},tiles=Array.from({length:W*H},(_,i)=>i===W*H-1?5:i),terr=tiles.map(i=>i%2?1:16);
for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=tiles[(y>>4)*W+(x>>4)],p=(y*im.width+x)*4;im.data.set([i&255,i>>8,((x&15)<<4)|(y&15),255],p);}
const mz=R.nativeTiles({map:{width:W,height:H,tiles},terrain:terr},im);assert.equal(mz.unique,W*H-1);assert.equal(mz.flags[0],16);assert.equal(mz.flags[1],15);assert.equal(mz.ids.at(-1),mz.ids[5]);
for(let k=0;k<tiles.length;k++){const id=mz.ids[k],sheet=mz.sheets[id>>8],sx=(Math.floor(id/128)%2*8+id%8)*16,sy=Math.floor(id%256/8)%16*16;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const p=((sy+y)*256+sx+x)*4,q=((Math.floor(k/W)*16+y)*im.width+k%W*16+x)*4;for(let c=0;c<4;c++)assert.equal(sheet.data[p+c],im.data[q+c]);}}
const cs=R.nativeCharacter(sprite,moving);assert.equal(cs.width,96);assert.equal(cs.height,128);
// Fix old placeholder and existing map ID; no extra MapInfos entry.
const er=project.actors[result.ids.characters[1]];er.name='Personaje 1';er.classId=999;
const renamed={...character,name:'Eirika'},data2={...data,characters:{1:renamed}};
const fixed=R.apply(project,R.plan(data2,[0],{allData:true}),{source:'test',replaceMapId:1,repairActors:true});assert.equal(fixed.maps[0].id,1);assert.equal(project.mapInfos.filter(Boolean).length,1);assert.equal(er.name,'Eirika');assert.equal(er.classId,result.ids.classes[1]);
console.log('OK: Huffman Eirika, filtro de cinemáticas, REDA, mosaicos MZ (reconstrucción RGBA exacta), hoja nativa y reparación de mapa.');
// Regression: vanilla fake-compression header counts itself; physical table begins at ID 1.
const rawRom=new Uint8Array(0x1000000),rawAt=0x810000,rawPal=0x80E000,faceTable=0x8ACBE0;
u32(rawRom,rawAt,(0x1400+4)<<8);rawRom.fill(0x11,rawAt+4,rawAt+4+0x1400);u16(rawRom,rawPal+2,31);
for(let i=0;i<12;i++){u32(rawRom,faceTable+i*28,0x08000000+rawAt);u32(rawRom,faceTable+i*28+8,0x08000000+rawPal);}
u32(rawRom,0x5524,0x08000000+faceTable-28);
const rawCtx={rom:rawRom,crc:R.FE8U.crc};assert.equal(R.graphicTables(rawCtx).faces,faceTable-28);const eirika=R.portrait(rawCtx,2);assert(eirika);assert.equal(eirika.width,96);assert.equal(eirika.height,80);assert.equal(eirika.data[(10*96+16)*4+3],255);
// A mission configuration is not an MZ entry point; a separate autorun is now generated.
const m=fixed.maps[0].json,starts=m.events.filter(Boolean).filter(e=>T.Editor.find(e,'Start'));
assert.equal(starts.length,1);assert.equal(starts[0].pages[0].trigger,3);assert.equal(starts[0].pages[0].list.find(c=>c.code===357).parameters[1],'Start');assert.equal(starts[0].pages[1].conditions.selfSwitchValid,true);assert.equal(R.ensureMissionStart(m).created,false);assert.equal(T.Editor.check(m,1).ok,true);
const importedDB=T.readDatabase({actors:project.actors,classes:project.classes,items:project.items,weapons:project.weapons});importedDB.terrain=tm.terrain;
const battle=new T.Engine(importedDB,T.compileMap(m,1));assert(battle.s.units.some(u=>u.team===1));
console.log('OK: retrato FE8U tipo 0 con cabecera inclusiva, evento MZ de inicio automático y compilación/arranque del motor con una misión sintética.');
