"use strict";
const test=require("node:test"),assert=require("node:assert");
const {loadEngine,cmd,event,map,database,run}=require("./helpers");
const T=loadEngine(),db=database(T);
const alive=e=>e.s.units.filter(u=>T.alive(u));

test("una misión mínima: ★ Aliado + ★ Enemigo, sin Configurar misión",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1,lord:true})]),event(2,8,8,[cmd("Enemy",{classId:1,level:3})])]),5);
 assert.equal(m.objective,"eliminate");assert.equal(m.title,"Prueba");
 assert.equal(m.leader,1);assert.deepEqual(m.protectedIds,[1]);
 const e=new T.Engine(db,m);
 const ally=e.unit(1),foe=e.unit(2);
 assert.equal(ally.team,1);assert.equal(ally.name,"Ari");
 assert.equal(foe.team,2);assert.equal(foe.level,3);assert.equal(foe.ai,"approach");assert.equal(foe.name,"Soldado");
});

test("el líder marcado con ★ Aliado provoca derrota al caer",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1,lord:true})]),event(3,2,1,[cmd("Ally",{actorId:2})]),event(2,8,8,[cmd("Enemy",{classId:1})])]),5);
 const e=new T.Engine(db,m);e.unit(1).hp=0;assert.equal(e.checkObjective(),"defeat");
});

test("roles: el jefe no se mueve, es jefe y suelta botín",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1})]),event(2,8,8,[cmd("Enemy",{classId:1,role:"boss",name:"Garm"})])]),5);
 const u=new T.Engine(db,m).unit(2);
 assert.equal(u.ai,"hold");assert.equal(u.boss,true);assert.equal(u.loot,true);assert.equal(u.name,"Garm");
});

test("plantillas de enemigo del Administrador de plugins",()=>{
 T.setEnemyPresets([{name:"Arquero élite",classId:2,level:8,role:"guard",weaponId:2,itemId:1,loot:true}]);
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1})]),event(2,8,8,[cmd("Enemy",{preset:"arquero ELITE"})]),event(3,7,8,[cmd("Enemy",{preset:"Arquero élite",level:2,role:"soldier"})])]),5);
 const e=new T.Engine(db,m),a=e.unit(2),b=e.unit(3);
 assert.equal(a.classId,2);assert.equal(a.level,8);assert.equal(a.ai,"guard");assert.equal(a.loot,true);
 assert.equal(a.inventory[0].id,2);assert.ok(a.inventory.some(i=>i.kind==="item"&&i.id===1));
 assert.equal(b.level,2);assert.equal(b.ai,"approach");
 assert.throws(()=>T.compileMap(map(5,5,[event(1,1,1,[cmd("Enemy",{preset:"No existe"})])]),5),/no existe la plantilla/);
 T.setEnemyPresets([]);
});

test("enemigo sin clase ni plantilla da un error claro",()=>{
 assert.throws(()=>T.compileMap(map(5,5,[event(1,1,1,[cmd("Enemy",{})])]),5),/necesita una clase/);
});

test("★ Refuerzo: llega en la fase enemiga del turno indicado, sin evento extra",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1})]),event(2,8,8,[cmd("Enemy",{classId:1})]),event(4,9,0,[cmd("Enemy",{classId:1}),cmd("Reinforcement",{turn:2,count:2})])]),5);
 assert.ok(m.templates[4]);assert.ok(!m.units.some(u=>u.id===4));
 const e=new T.Engine(db,m);run(e);
 assert.equal(alive(e).filter(u=>u.team===2).length,1);
 e.signal("turnStart",{team:2,turn:1});run(e);
 assert.equal(alive(e).filter(u=>u.team===2).length,1,"turno 1: aún no");
 e.signal("turnStart",{team:1,turn:2});run(e);
 assert.equal(alive(e).filter(u=>u.team===2).length,1,"fase aliada del turno 2: aún no");
 e.signal("turnStart",{team:2,turn:2});run(e);
 assert.equal(alive(e).filter(u=>u.team===2).length,3,"fase enemiga del turno 2: llegan 2");
 e.signal("turnStart",{team:2,turn:2});run(e);
 assert.equal(alive(e).filter(u=>u.team===2).length,3,"solo una vez");
});

test("★ Refuerzo repetido cada N turnos y por interruptor",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1})]),event(4,9,0,[cmd("Enemy",{classId:1}),cmd("Reinforcement",{turn:2,every:2})]),event(5,9,9,[cmd("Enemy",{classId:1}),cmd("Reinforcement",{switchId:7,x:5,y:5})])]),5);
 const e=new T.Engine(db,m);run(e);
 const foes=()=>alive(e).filter(u=>u.team===2).length;
 for(const t of [1,2,3,4]){e.s.turn=t;e.s.team=2;e.signal("turnStart");run(e);}
 assert.equal(foes(),2,"turnos 2 y 4");
 e.setSwitch(7,true);run(e);
 assert.equal(foes(),3);assert.ok(alive(e).some(u=>u.x===5&&u.y===5));
});

test("★ Refuerzo sin unidad encima da un error claro",()=>{
 assert.throws(()=>T.compileMap(map(5,5,[event(1,1,1,[cmd("Reinforcement",{})])]),5),/debajo de Enemigo/);
});

test("★ Cofre, ★ Puerta, ★ Aldea y ★ Tienda generan interacciones completas",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1})]),
  event(2,3,3,[cmd("Chest",{weaponId:2,gold:50})]),event(3,4,4,[cmd("Door",{width:2})]),
  event(4,5,5,[cmd("Village",{text:"¡Gracias!",itemId:1}),cmd("Gold",{value:100})]),
  event(6,6,6,[cmd("Shop",{weapons:"1, 2",items:"1"})])]),5);
 const by=id=>m.interactions.find(i=>i.id===id);
 assert.deepEqual(by(2).reward,{kind:"weapon",id:2,gold:50});assert.equal(by(2).type,"chest");
 assert.deepEqual(by(3).area,{x:4,y:4,w:2,h:1});
 assert.equal(by(4).event,4,"las acciones bajo ★ Aldea se ejecutan al visitar");assert.equal(by(4).reward.id,1);
 assert.deepEqual(by(6).stock.map(g=>g.kind+g.id),["weapon1","weapon2","item1"]);assert.equal(by(6).stock[0].price,undefined);
 const e=new T.Engine(db,m),u=e.unit(1);u.x=5;u.y=4;const gold=e.s.gold;
 e.interact(u,4);run(e);
 assert.equal(e.s.gold,gold+100);assert.ok(u.inventory.some(i=>i.kind==="item"&&i.id===1));
 assert.throws(()=>T.compileMap(map(5,5,[event(2,3,3,[cmd("Chest",{weaponId:1,itemId:1})])]),5),/no ambos/);
});

test("★ Reclutable: el líder habla con el enemigo y se une",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1,lord:true})]),event(2,2,1,[cmd("Enemy",{classId:1}),cmd("Recruit",{text:"Me uno."})]),event(3,9,9,[cmd("Enemy",{classId:1})])]),5);
 assert.deepEqual(m.conversations.map(c=>[c.first,c.second,c.recruit]),[[1,2,true]]);
 const e=new T.Engine(db,m);e.talk(e.unit(1),e.unit(2));run(e);
 assert.equal(e.unit(2).team,1);
});

test("Configurar misión explícito se respeta y el líder se añade a protegidos",()=>{
 const m=T.compileMap(map(10,10,[event(1,0,0,[cmd("Mission",{title:"Capítulo 1",objective:"boss",protectedIds:"9"})]),event(2,1,1,[cmd("Ally",{actorId:1,lord:true})]),event(3,8,8,[cmd("Enemy",{classId:1,role:"boss"})])]),5);
 assert.equal(m.title,"Capítulo 1");assert.equal(m.objective,"boss");assert.equal(m.leader,2);assert.deepEqual(m.protectedIds,[9,2]);
});

test("sin Configurar misión y con Casilla de conquista, el objetivo es conquistar",()=>{
 const m=T.compileMap(map(10,10,[event(1,1,1,[cmd("Ally",{actorId:1,lord:true})]),event(2,9,9,[cmd("Goal",{})])]),5);
 assert.equal(m.objective,"seize");
});
