"use strict";
// Utilidades de prueba: carga dist/TacticsEngine.js en un entorno aislado y fabrica mapas como los guarda MZ.
const fs=require("fs"),path=require("path");
function loadEngine(file){
 const code=fs.readFileSync(file||path.join(__dirname,"..","dist","TacticsEngine.js"),"utf8");
 const sandbox={};sandbox.globalThis=sandbox;new Function("globalThis","module",code)(sandbox,undefined);return sandbox.Tactics;
}
// MZ guarda todos los argumentos como texto; las listas y estructuras, como JSON en texto.
const asText=args=>Object.fromEntries(Object.entries(args||{}).map(([k,v])=>[k,typeof v==="string"?v:JSON.stringify(v)]));
const cmd=(id,args)=>({code:357,indent:0,parameters:["TacticsMZ",id,"",asText(args)]});
const event=(id,x,y,list,name)=>({id,name:name||"EV"+id,x,y,pages:[{conditions:{},image:{},list:list.concat([{code:0,indent:0,parameters:[]}])}]});
function map(width,height,events,displayName){const ev=[null];events.forEach(e=>ev[e.id]=e);return {width,height,tilesetId:1,displayName:displayName||"Prueba",data:new Array(width*height*6).fill(0),events:ev};}
// Base de datos mínima de MZ (lo que leería TacticsMZ de $dataClasses, etc.).
function mzDatabase(notes){notes=notes||{};
 const params=[[0,20],[0,0],[0,6],[0,5],[0,2],[0,2],[0,7],[0,4]];
 const cls=(id,name)=>({id,name,note:(notes.classes||{})[id]||"",params:params.map(p=>p.slice()),traits:[{code:51,dataId:1,value:1}],learnings:[]});
 return {classes:[null,cls(1,"Soldado"),cls(2,"Jinete"),cls(3,"Pegaso")],
  actors:[null,{id:1,name:"Ari",classId:1,initialLevel:1,note:(notes.actors||{})[1]||"",equips:[1]},{id:2,name:"Nara",classId:1,initialLevel:3,note:"",equips:[1]}],
  weapons:[null,{id:1,name:"Espada",wtypeId:1,params:[0,0,5,0,0,0,0,0],price:100,note:(notes.weapons||{})[1]||""},{id:2,name:"Arco",wtypeId:2,params:[0,0,6,0,0,0,0,0],price:200,note:(notes.weapons||{})[2]||""}],
  items:[null,{id:1,name:"Vulneraria",effects:[{code:11,value1:0,value2:10}],consumable:true,price:30,note:(notes.items||{})[1]||""},{id:2,name:"Llave",effects:[],consumable:true,price:50,note:(notes.items||{})[2]||""}],
  skills:[null,{id:1,name:"Robo",note:(notes.skills||{})[1]||""}],states:[null,{id:1,name:"Lento",note:(notes.states||{})[1]||""}]};
}
// Clases con arma inicial para que spawn pueda equipar.
function database(T,notes){const db=T.readDatabase(mzDatabase(notes));Object.values(db.classes).forEach(c=>{if(!c.inventory.length)c.inventory=[{kind:"weapon",id:1}];});return db;}
// Ejecuta la cola de eventos hasta vaciarla (descarta presentaciones: no hay interfaz).
function run(e){for(let i=0;i<50&&(e.s.queue.length||e.s.presentations.length);i++){e.s.presentations=[];e.tick();}e.s.presentations=[];}
module.exports={loadEngine,cmd,event,map,mzDatabase,database,run};
