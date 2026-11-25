"use strict";
// Compatibilidad con la v0.2.0: el código original vive en la rama main (plugins/).
// Compila el mismo mapa clásico con ambos motores y compara el resultado.
const test=require("node:test"),assert=require("node:assert"),{execSync}=require("child_process");
const {loadEngine,cmd,event,map,mzDatabase}=require("./helpers");
let legacy=null;
// Commit que añadió la v0.2.0 original (o LEGACY_REF si se indica).
const legacyRef=()=>process.env.LEGACY_REF||execSync("git log --all --diff-filter=A --format=%H -- :/plugins/TacticsSystem.js",{cwd:__dirname,stdio:["ignore","pipe","ignore"]}).toString().trim().split("\n").pop();
try{
 const files=["TacticsSystem","TacticsCommands","TacticsRules","TacticsData"].map(f=>execSync("git show "+legacyRef()+":plugins/"+f+".js",{cwd:__dirname,stdio:["ignore","pipe","ignore"]}).toString());
 const sandbox={};sandbox.globalThis=sandbox;files.forEach(code=>new Function("globalThis","module",code)(sandbox,undefined));legacy=sandbox.Tactics;
}catch(e){}
const T=loadEngine();
const classic=()=>map(12,12,[
 event(1,0,0,[cmd("Mission",{title:"Clásica",objective:"boss",leader:2,protectedIds:"2",gold:900,turnLimit:20}),cmd("Campaign",{nextMapId:3,deployment:"placed"})]),
 event(2,1,1,[cmd("Unit",{actorId:1,team:"1",level:2,inventory:[{kind:"weapon",id:1,uses:-1,drop:false}]})]),
 event(3,9,9,[cmd("Unit",{classId:2,team:"2",ai:"guard",boss:true,loot:true,stats:[{stat:"power",value:9}],ranks:[{category:"blade",value:30}]})]),
 event(4,11,0,[cmd("Unit",{classId:1,team:"2"}),cmd("Template",{})]),
 event(5,0,11,[cmd("On",{type:"turnStart",team:"2",turn:3}),cmd("Spawn",{template:4,x:11,y:0}),cmd("Dialogue",{name:"Jefe",text:"¡Refuerzos!"})]),
 event(6,5,5,[cmd("Interaction",{type:"chest",rewardKind:"weapon",rewardId:2,rewardGold:10})]),
 event(7,6,6,[cmd("Conversation",{first:2,second:3,text:"Hola",recruit:true})]),
 event(8,7,7,[cmd("Goal",{})]),event(9,3,3,[cmd("Deployment",{})]),event(10,0,5,[cmd("Bounds",{x:0,y:0,width:12,height:12})])]);

test("un mapa hecho con comandos clásicos compila igual que en la v0.2.0",{skip:!legacy&&"sin acceso al código original (git)"},()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(T.compileMap(classic(),4))),JSON.parse(JSON.stringify(legacy.compileMap(classic(),4))));
});

test("las notas JSON de F9 se leen igual que en la v0.2.0",{skip:!legacy&&"sin acceso al código original (git)"},()=>{
 const notes={classes:{2:'<Tactics>{"moveType":"mounted","promotions":[3]}</Tactics>'},weapons:{2:'<Tactics>{"minRange":2,"maxRange":2,"effective":["flying"]}</Tactics>'},skills:{1:'<Tactics>{"effects":[{"type":"steal"}]}</Tactics>'}};
 // readDatabase vivía en TacticsMZ.js (dependiente de MZ); se extrae su función para compararla.
 const src=execSync("git show "+legacyRef()+":plugins/TacticsMZ.js",{cwd:__dirname}).toString();
 const body=src.slice(src.indexOf("function note(row){"),src.indexOf("T.audioBridge="));
 const sandbox={Tactics:legacy};new Function("root","const T=root.Tactics;"+body)(sandbox);
 assert.deepEqual(T.readDatabase(mzDatabase(notes)),legacy.readDatabase(mzDatabase(notes)));
});

test("el motor nuevo da el mismo resultado en una partida clásica",{skip:!legacy&&"sin acceso al código original (git)"},()=>{
 const play=Tx=>{const db=Tx.readDatabase?Tx.readDatabase(mzDatabase()):T.readDatabase(mzDatabase());Object.values(db.classes).forEach(c=>{if(!c.inventory.length)c.inventory=[{kind:"weapon",id:1}];});
  const e=new Tx.Engine(db,Tx.compileMap(classic(),4));
  for(let t=1;t<=4;t++){e.s.turn=t;e.s.team=2;e.signal("turnStart");for(let i=0;i<20;i++){e.s.presentations=[];e.tick();}}
  e.s.presentations=[];return JSON.parse(JSON.stringify(e.save()));};
 const a=play(T),b=play(legacy);assert.ok(a.units.length===3,"la partida debe haber creado el refuerzo");assert.deepEqual(a.units,b.units);assert.deepEqual(a.map,b.map);
});
