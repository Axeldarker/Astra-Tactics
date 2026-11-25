/* Original example content. Copyright (c) 2026 TacticsMZ contributors. MIT License. */
(function(root){
"use strict";
const T=root.Tactics;
const stats={health:26,power:7,magic:2,skill:8,speed:8,luck:5,defense:5,resistance:3,move:5,build:6};
const growth={health:65,power:40,magic:20,skill:45,speed:40,luck:35,defense:30,resistance:25,move:0,build:0};
const classes={};
const add=(id,name,patch,types,inventory,extra)=>{classes[id]=Object.assign({id,name,stats:Object.assign({},stats,patch),growth:Object.assign({},growth),weaponTypes:types,ranks:Object.fromEntries(types.map(t=>[t,0])),inventory:inventory.map(id=>({kind:"weapon",id})).concat([{kind:"item",id:1}]),skills:[],maxLevel:20,promoteLevel:10,promotions:[7],moveType:"foot",animation:{columns:6,rows:1,frameWidth:64,frameHeight:64,frames:[0,1,2,3,4,5],impact:3,fps:12}},extra);};
add(1,"Vanguardia",{},["blade"],[1]);
add(2,"Lancero",{health:28,speed:6,defense:7,build:8},["pole"],[2]);
add(3,"Exploradora",{health:23,defense:3,speed:10,move:6},["bow"],[4]);
add(4,"Canalizador",{health:22,power:2,magic:9,resistance:7},["arcane","staff"],[5,6]);
add(5,"Jinete",{health:27,move:7,build:9},["pole","blade"],[2],{moveType:"mounted",capacity:16});
add(6,"Infiltrador",{power:5,speed:12,move:6,defense:3},["blade"],[1],{skills:[2,3]});
add(7,"Custodio",{health:30,power:10,defense:8},["blade","pole","axe"],[3],{promotions:[],ranks:{blade:80,pole:80,axe:80},promotionBonus:{health:4,power:2,defense:2,move:1}});
add(8,"Vigía alado",{health:24,move:7,defense:4,resistance:6},["pole"],[2],{moveType:"flying",capacity:12});
const weapons={};
const weapon=(id,name,category,patch)=>weapons[id]=Object.assign({id,name,category,might:5,hit:85,crit:0,weight:5,minRange:1,maxRange:1,uses:35,price:350,rank:0},patch);
weapon(1,"Hoja de entrenamiento","blade",{might:5,hit:95});
weapon(2,"Lanza de fresno","pole",{might:7,weight:7});
weapon(3,"Hacha de guardia","axe",{might:9,hit:75,weight:9});
weapon(4,"Arco viajero","bow",{might:6,minRange:2,maxRange:2,effective:["flying"]});
weapon(5,"Prisma ígneo","arcane",{might:5,minRange:1,maxRange:2,magic:true,spell:'fire',weight:3});
weapon(6,"Vara de auxilio","staff",{staff:true,effect:"heal",power:10,might:0,maxRange:2,uses:20});
weapon(7,"Hoja doble","blade",{might:3,hits:2,rank:50,price:850});
weapon(8,"Jabalina de viaje","pole",{might:4,maxRange:2,hit:75});
weapon(9,"Vara de recuperación","staff",{staff:true,effect:"restore",might:0,maxRange:2});
weapon(10,"Prisma de escarcha","arcane",{might:4,magic:true,spell:'ice',maxRange:2,state:1,stateTurns:2});
const items={
 1:{id:1,name:"Ungüento",effect:"heal",power:15,uses:3,price:90},
 2:{id:2,name:"Llave de cofre",key:"chest",effect:"key",uses:1,price:60},
 3:{id:3,name:"Llave de puerta",key:"door",effect:"key",uses:1,price:40},
 4:{id:4,name:"Lámpara",effect:"torch",power:4,turns:4,uses:2,price:80},
 5:{id:5,name:"Sello de custodia",effect:"promote",classId:7,uses:1,price:1000},
 6:{id:6,name:"Credencial del gremio",secretCard:true,bound:true,effect:"passive",uses:0,price:0},
 7:{id:7,name:"Manual de fuerza",effect:"boost",stat:"power",power:2,uses:1,price:500},
 8:{id:8,name:"Kit de reparación",effect:"repair",uses:2,price:200},
 9:{id:9,name:"Antídoto",effect:"restore",uses:3,price:75},
 10:{id:10,name:"Manual de esgrima",effect:"rank",category:"blade",power:50,uses:1,price:250},
 11:{id:11,name:"Semilla de vigor",effect:"growth",stat:"health",power:10,uses:1,price:300},
 12:{id:12,name:"Campana de relevo",effect:"refresh",maxRange:1,uses:2,price:200}
};
const skills={
 1:{id:1,name:"Paso de reserva",effects:[{type:"cantoCombat"}]},
 2:{id:2,name:"Cerrajería",effects:[{type:"lockpick"}]},
 3:{id:3,name:"Manos ágiles",effects:[{type:"steal"}]},
 4:{id:4,name:"Iniciativa",effects:[{type:"firstStrike"}]},
 5:{id:5,name:"Ruptura",effects:[{type:"halfDefense",chance:30}]},
 6:{id:6,name:"Recuperación ofensiva",effects:[{type:"drain",chance:30}]},
 7:{id:7,name:"Cobertura",effects:[{type:"cover"}]},
 8:{id:8,name:"Armadura firme",effects:[{type:"critGuard"},{type:"reduceDamage",chance:30,value:0.5}]},
 9:{id:9,name:"Técnica precisa",effects:[{type:"ignoreDefense",chance:25}]},
 10:{id:10,name:"Ráfaga",effects:[{type:"extraStrike",chance:25}]},
 11:{id:11,name:"Concentración",effects:[{type:"negateSkills"}]},
 12:{id:12,name:"Interrupción",effects:[{type:"cancelReply",chance:20}]},
 13:{id:13,name:"Último esfuerzo",effects:[{type:"injuredPower",chance:100}]},
 14:{id:14,name:"Remate",effects:[{type:"finisher",chance:10}]},
 15:{id:15,name:"Paso ligero",effects:[{type:"canto"}]}
};
classes[1].learn=[{level:3,skill:4},{level:7,skill:5}];
const states={1:{id:1,name:"Entumecido",effects:[{type:"stat",stat:"speed",value:-3}]},2:{id:2,name:"Veneno",effects:[{type:"poison",value:3}]},3:{id:3,name:"Regeneración",effects:[{type:"regenerate",value:4}]}};
const actors={
 1:{id:1,name:"Ari",classId:1,level:1,color:"#59b5cc",skills:[1]},
 2:{id:2,name:"Nara",classId:4,level:1,color:"#b59de2"},
 3:{id:3,name:"Oren",classId:6,level:1,color:"#7ec99d"},
 4:{id:4,name:"Vera",classId:3,level:1,color:"#e3b765"}
};
const terrain={
 0:{name:"Pradera",cost:1,color:"#667f60"},
 1:{name:"Bosque",cost:2,avoid:15,defense:1,costs:{mounted:3,flying:1},color:"#345d4b"},
 2:{name:"Agua",cost:0,costs:{flying:1},color:"#437f91"},
 3:{name:"Muralla",cost:0,costs:{flying:0},color:"#515b62"},
 4:{name:"Camino",cost:1,color:"#a49772"},
 5:{name:"Santuario",cost:1,heal:4,defense:2,avoid:10,color:"#949292"},
 6:{name:"Montaña",cost:3,defense:2,avoid:20,costs:{mounted:0,flying:1},color:"#7b7672"}
};
T.exampleDatabase={classes,actors,weapons,items,skills,states,terrain,triangle:["blade","pole","axe"]};
const c=(id,args)=>({id,args:args||{}});
function mission(id){
 const m={id,title:id===1?"01 · El paso de los faros":"02 · La torre del alba",width:18,height:12,tiles:Array(216).fill(0),regions:Array(216).fill(0),gold:650,objective:id===1?"boss":"seize",protectedIds:[1],leader:1,creator:id===1,protagonist:1,nextMapId:id===1?2:0,units:[],events:[],templates:{},goals:[{x:15,y:2}],conversations:[],interactions:[]};
 for(let y=0;y<12;y++){m.tiles[y*18+8]=2;if(y===6||y===7)m.tiles[y*18+8]=4;}
 for(let x=0;x<18;x++)m.tiles[7*18+x]=4;
 [[3,3],[4,3],[5,4],[11,4],[12,4],[14,8],[15,8],[2,9]].forEach(p=>m.tiles[p[1]*18+p[0]]=1);
 m.tiles[2*18+15]=5;
 m.units=[{id:1,actorId:1,team:1,x:2,y:7},{id:2,actorId:2,team:1,x:2,y:8},{id:3,actorId:3,team:1,x:1,y:6},
  {id:10,name:"Vigía",classId:2,team:2,x:10,y:7,ai:"approach"},{id:11,name:"Arquero",classId:3,team:2,x:12,y:5,ai:"approach"},
  {id:12,name:"Guardián de la torre",classId:7,team:2,x:15,y:2,ai:"hold",boss:true,level:2,loot:true},
  {id:13,actorId:4,team:3,x:4,y:7,ai:"hold"}];
 m.templates[30]={classId:1,name:"Refuerzo",team:2,ai:"approach"};
 m.interactions=[{id:20,type:"chest",name:"Cofre del camino",x:5,y:6,reward:{kind:"weapon",id:8,gold:60}},
  {id:21,type:"shop",name:"Tienda del paso",x:1,y:9,stock:[{kind:"item",id:1,count:3},{kind:"weapon",id:7,count:1},{kind:"item",id:3,count:-1}]},
  {id:22,type:"house",name:"Posada",x:3,y:9,repeat:true,text:"Cruza el puente. Habla con Vera antes de partir.",reward:{kind:"item",id:2}},
  {id:23,type:"arena",name:"Círculo de práctica",x:6,y:9},
  {id:24,type:"door",name:"Portón",x:14,y:2,terrain:4},
  {id:25,type:"village",name:"Huerta",x:13,y:9,text:"Gracias por proteger el paso.",reward:{gold:120}}];
 m.tiles[2*18+14]=3;
 m.conversations=[{id:26,first:1,second:13,text:"Soy Vera. Conozco el camino: iré con ustedes.",recruit:true,once:true}];
 m.events=[{id:40,on:{type:"start",once:true},commands:[c("Dialogue",{name:"Nara",unit:2,text:id===1?"El faro ha dejado de responder. Debemos cruzar el puente y despejar la torre. Selecciona una unidad, elige su destino y espera a que termine de caminar.":"La torre está cerca. Ari debe llegar al santuario y elegir Conquistar."})]},
 {id:41,on:{type:"turnStart",team:2,turn:3,once:true},commands:[c("Spawn",{template:30,id:31,x:17,y:7}),c("Dialogue",{name:"Vera",unit:13,text:"¡Hay otro guardia en el camino!"})]},
 {id:42,on:{type:"victory",once:true},commands:[c("Gold",{value:200}),c("Dialogue",{name:"Nara",unit:2,text:id===1?"El paso está a salvo. Podemos continuar hacia la torre.":"El faro vuelve a brillar. Nuestra expedición ha terminado."})]},
 {id:43,on:{type:"defeat",once:true},commands:[c("Dialogue",{name:"Nara",text:"Necesitamos retirarnos. Volvamos a intentarlo."})]}];
 if(id===2){m.units.find(u=>u.id===10).classId=4;m.units.find(u=>u.id===11).classId=8;m.fog=5;}
 return m;
}
T.exampleMissions={1:mission(1),2:mission(2)};
if(typeof module!=="undefined"&&module.exports)module.exports=T;
})(typeof globalThis!=="undefined"?globalThis:this);
