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
