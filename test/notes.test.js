"use strict";
const test=require("node:test"),assert=require("node:assert");
const {loadEngine,mzDatabase}=require("./helpers");
const T=loadEngine();
const read=notes=>T.readDatabase(mzDatabase(notes));

test("el JSON clásico funciona exactamente igual",()=>{
 const db=read({classes:{2:'<Tactics>{"moveType":"mounted","promotions":[3],"stats":{"move":7}}</Tactics>'}});
 assert.equal(db.classes[2].moveType,"mounted");assert.deepEqual(db.classes[2].promotions,[3]);
 assert.deepEqual(db.classes[2].stats,{move:7},"el JSON reemplaza stats completo, como en la v0.2");
});

test("etiquetas sueltas en clases: <Mov>, <Tipo>, <Promociona>, <Armas>",()=>{
 const db=read({classes:{3:"<Tipo: Volador>\n<Mov: 7>\n<Promociona: 1, 2>\n<Nivel promoción: 10>\n<Armas: lanza, Espada>\n<Crecimientos: PV 70, Fue 40, vel 55>"}});
 const c=db.classes[3];
 assert.equal(c.moveType,"flying");assert.equal(c.stats.move,7);assert.equal(c.stats.health,20,"el resto de stats se conserva");
 assert.deepEqual(c.promotions,[1,2]);assert.equal(c.promoteLevel,10);
 assert.deepEqual(c.weaponTypes,["pole","blade"]);assert.deepEqual(c.ranks,{pole:0,blade:0});
 assert.equal(c.growth.health,70);assert.equal(c.growth.speed,55);assert.equal(c.growth.luck,30,"crecimientos no tocados se conservan");
});

test("bloque <Tactics> por líneas, sin comillas ni llaves",()=>{
 const db=read({weapons:{2:"<Tactics>\ntipo: arco\nalcance: 2-3\ngolpe: 80\nefectivo: volador\nusos: 40\nhits: 2\n</Tactics>"}});
 const w=db.weapons[2];
 assert.equal(w.category,"bow");assert.equal(w.minRange,2);assert.equal(w.maxRange,3);assert.equal(w.hit,80);
 assert.deepEqual(w.effective,["flying"]);assert.equal(w.uses,40);assert.equal(w.hits,2,"claves en inglés del motor también valen");
});

test("armas: bastón, mágica, crítico",()=>{
 const db=read({weapons:{1:"<Bastón: curar 12> <Alcance: 1-2>",2:"<Mágica> <Crítico: 10> <Peso: 3>"}});
 assert.equal(db.weapons[1].staff,true);assert.equal(db.weapons[1].effect,"heal");assert.equal(db.weapons[1].power,12);assert.equal(db.weapons[1].maxRange,2);
 assert.equal(db.weapons[2].magic,true);assert.equal(db.weapons[2].crit,10);assert.equal(db.weapons[2].weight,3);
});

test("objetos: llave, curar, tónico",()=>{
 const db=read({items:{1:"<Efecto: curar 20> <Usos: 3>",2:"<Llave: cofre>"}});
 assert.equal(db.items[1].effect,"heal");assert.equal(db.items[1].power,20);assert.equal(db.items[1].uses,3);
 assert.equal(db.items[2].effect,"key");assert.equal(db.items[2].key,"chest");
});

test("habilidades y estados: <Efecto> acumulable",()=>{
 const db=read({skills:{1:"<Efecto: robar>\n<Efecto: drenar 30>"},states:{1:"<Efecto: stat vel -3>\n<Efecto: veneno 2>"}});
 assert.deepEqual(db.skills[1].effects,[{type:"steal"},{type:"drain",chance:30}]);
 assert.deepEqual(db.states[1].effects,[{type:"stat",stat:"speed",value:-3},{type:"poison",value:2}]);
});

test("etiquetas de otros plugins se ignoran",()=>{
 const db=read({classes:{1:"<SideView Battler: Actor1> <hidden> <Custom:abc>"}});
 assert.equal(db.classes[1].moveType,"foot");assert.equal(db.classes[1].hidden,undefined);
});

test("una línea mal escrita en el bloque da un error que dice dónde",()=>{
 assert.throws(()=>read({classes:{1:"<Tactics>\nesto no es nada\n</Tactics>"}}),/1 · Soldado.*esto no es nada/);
});
