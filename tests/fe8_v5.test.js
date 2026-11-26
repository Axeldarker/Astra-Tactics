/* Synthetic test: FE6/7/8 resource decoders and MZ Bridge startup. No ROM is distributed. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(process.env.ASTRA_TEST_HTML||path.join(__dirname,'../dist/AstraEditor.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];vm.runInThisContext(scripts[0][1]);vm.runInThisContext(scripts[1][1]);
const T=global.Tactics,R=T.Editor.Rom,M=T.Editor,D=M.Db;
const u32=(a,o,v)=>{for(let i=0;i<4;i++)a[o+i]=v>>>(8*i)&255};
function makeFixture(code){
 const b=new Uint8Array(0x100000);b.set(Buffer.from(code),0xac);const p=R.GBA_RESOURCES[code],ptr=(a,o)=>u32(b,a,o+0x08000000);
 function lz(a,raw){u32(b,a,(raw.length<<8)|16);let q=a+4;for(let i=0;i<raw.length;i+=8){b[q++]=0;for(let j=i;j<Math.min(raw.length,i+8);j++)b[q++]=raw[j];}}
 ptr(p.background,0x90000);ptr(p.platform,0x90100);ptr(0x90000,0x91000);ptr(0x90004,0x92000);ptr(0x90008,0x93000);ptr(0x9010c,0x94000);ptr(0x90110,0x95000);
 // 8x8 color pattern, TSA horizontal and vertical flipping, two palette banks.
 const tile=new Uint8Array(32).fill(0x11);tile[0]=0x21;const tsa=new Uint8Array(1200);tsa[2+1]=4;tsa[4+1]=8;tsa[6+1]=16;
 const pal=new Uint8Array(64);pal[2]=31;pal[4]=0xe0;pal[5]=3;pal[34]=0;pal[35]=0x7c; // red, green, blue
 lz(0x91000,tile);lz(0x92000,tsa);lz(0x93000,pal);lz(0x94000,new Uint8Array(4096).fill(0x11));b[0x95002]=31;
 return b;
}
for(const code of ['BE8E','AE7E','AFEJ']){const b=makeFixture(code),r=R.battleExtras({rom:b});assert.equal(r.backgrounds.length,1,code);assert.equal(r.platforms.length,1);let im=r.backgrounds[0].image;assert.equal(im.width,240);assert.equal(im.height,160);let px=(x,y)=>Array.from(im.data.slice((y*240+x)*4,(y*240+x)*4+4));assert.deepEqual(px(0,0),[255,0,0,255]);assert.deepEqual(px(1,0),[0,255,0,255]);assert.deepEqual(px(14,0),[0,255,0,255]);assert.deepEqual(px(17,7),[0,255,0,255]);assert.deepEqual(px(24,0),[0,0,255,255]);}
assert.equal(R.decodeBackground(new Uint8Array(32),new Uint8Array(4),Array(16).fill([0,0,0])),null);
assert.equal(R.battleExtras({rom:new Uint8Array(256)}).backgrounds.length,0);
// Run exact embedded bridge from the final HTML using simulated MZ globals and real tactics core.
const raw=scripts[2][1];const plugins=JSON.parse(raw.slice(raw.indexOf('=')+1,raw.indexOf('\n')).trim().replace(/;$/,'')); // exact embedded plugins object
const bridge=plugins['TacticsMZ.js'].slice(plugins['TacticsMZ.js'].indexOf('(function(root){\n"use strict";\nconst T=root.Tactics;'));
let opened=[],errors=[],commands={},baseStarts=0;
Object.assign(global,{Scene_Base:class{},Scene_Map:class{start(){baseStarts++;}},Scene_Title:class{create(){}update(){}terminate(){}createCommandWindow(){}},Window_TitleCommand:class{makeCommandList(){}},Game_Interpreter:class{updateWaitMode(){}},PluginManager:{parameters:()=>({}),registerCommand:(p,id,f)=>commands[id]=f},DataManager:{_databaseFiles:[],makeSaveContents:()=>({}),extractSaveContents(){},setupNewGame(){}},SceneManager:{goto:c=>opened.push(c),catchException:e=>errors.push(e.message)},$dataClasses:[null,D.create([], 'classes','Lord')],$dataActors:[null,D.create([],'actors','Eirika')],$dataItems:[null],$dataWeapons:[null],$dataSkills:[null],$dataStates:[null],$dataTilesets:[], $gameMap:{mapId:()=>17,event:()=>null},$gameSwitches:{_data:[]},$gameVariables:{_data:[]},$gameParty:{},$gameSelfSwitches:{}});
// Build the fixture with real editor helpers. Use valid class id and HP.
T.View=class{};T.presentation={};
const map={width:2,height:2,data:Array(24).fill(0),events:[null],note:'',displayName:'Fixture'};M.create(map,'ally',1,1,{actorId:1,level:1,lord:true});M.setCommand(M.missionEvent(map,true),'Mission',{title:'Fixture',leader:1,protagonist:1});R.ensureMissionStart(map);global.$dataMap=map;
vm.runInThisContext(bridge);
assert.equal(T.astraRuntime,'LOTE-v5');assert.equal(T.shouldAutoStart(map),true);assert.equal(T.shouldAutoStart({...map,note:'',events:map.events.filter(e=>!e||!/<AstraAutoStart>/.test(e.note||''))}),false);
new Scene_Map().start();assert.equal(errors.length,0,errors.join());assert.equal(opened.length,1);assert.equal(T.activeEngine().s.map.id,17);assert.equal(T.activeEngine().s.units.filter(u=>u.team===1).length,1);
new Scene_Map().start();assert.equal(opened.length,1);DataManager.setupNewGame();new Scene_Map().start();assert.equal(opened.length,2);
DataManager.setupNewGame();global.$dataMap={...map,events:[null,M.missionEvent(map)]};new Scene_Map().start();assert.equal(opened.length,2);assert.equal(errors.length,1);assert.match(errors[0],/aliados desplegables/);
console.log('PASS: GBA background/terrain extraction for three headers, tile flips/palette, direct MZ scene launch, no repeated launches, reset on new game, explicit failure on missing allies.');
