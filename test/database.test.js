"use strict";
const test=require("node:test"),assert=require("node:assert"),fs=require("fs"),path=require("path");
const {loadEngine,mzDatabase}=require("./helpers");
const T=loadEngine();
["01_Model.js","02_Database.js"].forEach(f=>new Function("globalThis","module",fs.readFileSync(path.join(__dirname,"..","src","editor",f),"utf8"))({Tactics:T},undefined));
const D=T.Editor.Db;

test("editar una nota JSON clásica conserva el resto de campos y el texto ajeno",()=>{
 const row={id:1,name:"Soldado",note:"Nota mía\n<Otro:1>\n<Tactics>\n{\"moveType\":\"mounted\",\"tags\":[\"x\"]}\n</Tactics>"};
 D.set("classes",row,"maxLevel",30);
 assert.match(row.note,/^Nota mía\n<Otro:1>\n<Tactics>/);
 const f=D.fields(row,"classes");assert.deepEqual(f,{moveType:"mounted",tags:["x"],maxLevel:30});
 assert.equal(D.get("classes",row,"maxLevel"),30);
});

test("las etiquetas sueltas se pasan al bloque sin perder las estadísticas por defecto",()=>{
 const db=mzDatabase(),row=db.classes[1];row.note="<Mov: 7>\n<Tipo: volador>";
 const before=D.effective("classes",row);assert.equal(before.stats.move,7);assert.equal(before.stats.health,20);
 D.set("classes",row,"maxLevel",25);
 assert.doesNotMatch(row.note,/<Mov/);assert.match(row.note,/<Tactics>/);
 const after=D.effective("classes",row);
 assert.deepEqual(after.stats,before.stats,"las estadísticas no cambian al reescribir la nota");
 assert.equal(after.moveType,"flying");assert.equal(after.maxLevel,25);
});

test("campos nativos: el nombre se guarda en la fila y en la nota si estaba allí",()=>{
 const row={id:3,name:"Viejo",note:"<Tactics>{\"name\":\"Viejo\",\"might\":5}</Tactics>"};
 D.set("weapons",row,"name","Nuevo");
 assert.equal(row.name,"Nuevo");assert.equal(D.fields(row,"weapons").name,"Nuevo");assert.equal(D.get("weapons",row,"name"),"Nuevo");
 D.set("weapons",row,"might",undefined);assert.equal(D.fields(row,"weapons").might,undefined);
});

test("crear filas: IDs seguidos y estructura válida de MZ",()=>{
 const list=[null,{id:1,name:"A",note:""}];
 const w=D.create(list,"weapons","Hacha");assert.equal(w.id,2);assert.equal(list[2],w);assert.equal(w.wtypeId,1);assert.ok(Array.isArray(w.params));
 const c=D.create([null],"classes","Mago");assert.equal(c.id,1);assert.equal(c.params.length,8);assert.equal(c.params[0].length,100);
 const dup=D.create(list,"weapons",null,{id:1,name:"A",note:"<Tactics>{\"id\":1,\"name\":\"A\",\"might\":9}</Tactics>"});
 assert.equal(dup.name,"A (copia)");assert.equal(D.fields(dup,"weapons").id,3);assert.equal(D.get("weapons",dup,"might"),9);
});

test("plantillas de enemigo: ida y vuelta con el formato del Administrador de plugins",()=>{
 const list=[{name:"Soldado",classId:2,level:3,role:"guard",weaponId:1,itemId:0,loot:true}];
 const text=D.encodePresets(list);
 assert.equal(typeof JSON.parse(text)[0],"string","MZ guarda cada struct como texto");
 assert.deepEqual(D.decodePresets(text),list);
 assert.equal(T.setEnemyPresets(T.decode(text)).soldado.role,"guard");
});

test("animaciones: agrupa pistas y encuentra qué clases las usan",()=>{
 const pack={clips:{"Myr:normal":{},"Myr:critical":{},"Myr:miss":{},"Suelta":{}}};
 const a=D.animations(pack);assert.deepEqual(Object.keys(a).sort(),["Myr","Suelta"]);assert.equal(a.Myr.modes.critical,"Myr:critical");
 const users=D.animationUsers({1:{id:1,name:"Mirmidón",battleAnimations:{blade:{normal:"Myr:normal"}}}},"Myr");
 assert.equal(users.length,1);assert.match(users[0].label,/Espada/);
});

test("importar una hoja: rejilla, recorte, pies y pistas listas para el juego",()=>{
 // Hoja 2×1 de celdas 8×8; un "muñeco" de 2×3 píxeles con los pies en (4,7) en cada celda.
 const W=16,H=8,data=new Uint8ClampedArray(W*H*4);
 const px=(x,y)=>{const i=(y*W+x)*4;data[i]=200;data[i+3]=255;};
 [[3,5],[4,5],[3,6],[4,6],[3,7],[4,7]].forEach(([x,y])=>{px(x,y);px(x+8,y-1);});
 const img={width:W,height:H,data},cells=D.grid(W,H,8,8);assert.equal(cells.length,2);
 const t=cells.map(c=>D.trim(img,c,null));assert.deepEqual(t[0],{x:3,y:5,w:2,h:3,dx:3,dy:5});assert.deepEqual(t[1],{x:11,y:4,w:2,h:3,dx:3,dy:4});
 const anchor=D.guessAnchor(img,cells[0],null);assert.deepEqual(anchor,{x:4,y:8});
 assert.equal(D.trim({width:8,height:8,data:new Uint8ClampedArray(256)},{x:0,y:0,w:8,h:8},null),null,"celda vacía");
 const shelf=D.shelf(t,1024);
 const built=D.buildAnimation({name:"Prueba",path:"img/astra/battle/Prueba.png",frames:t,pos:shelf.pos,anchor,zoom:1,
  modes:{normal:{steps:[{frame:0,ticks:4},{frame:1,ticks:6}],impact:1}}});
 const clip=built.clips["Prueba:normal"];
 assert.equal(clip.frames.length,10);assert.equal(clip.impact,4);assert.equal(clip.fps,60);
 assert.ok(built.clips["Prueba:critical"]&&built.clips["Prueba:miss"],"crítico y fallo copian la normal");
 // pies a 24 px por debajo del punto de anclaje del motor
 assert.equal(built.atlas.rects[0].ox,1);assert.equal(built.atlas.rects[0].oy,8-5-24);
 const pack=D.installAnimation(D.emptyPack(),"Prueba",built);
 assert.doesNotThrow(()=>{if(T.validateTrack)T.validateTrack(clip,pack);});
 assert.throws(()=>D.installAnimation(pack,"Prueba",built),/Ya existe/);
 assert.throws(()=>D.buildAnimation({name:"a:b",frames:[],pos:[],anchor,modes:{}}),/nombre/);
});

test("guardar tablas con el formato de MZ",()=>{
 const text=D.stringifyTable([null,{id:1,name:"A"}]);assert.equal(text,'[\nnull,\n{"id":1,"name":"A"}\n]');
 assert.deepEqual(JSON.parse(text),[null,{id:1,name:"A"}]);
 assert.equal(D.fileName("Mirmidón ágil: espada"),"Mirmidon_agil_espada");
});

test("script de FE Essentials / FEBuilder: modos, duraciones e impacto",()=>{
 const text=`/// - Mode 1 #Melee
C03 #start
C07
1 p- stand.png
3 p- a01.png
C04 #hp
C1A #hit
C1F
3 p- a02.png
C01 #wait
4 p- a03.png
C06
C0D
~~~
/// - Mode 3
2 p- stand.png
C09
5 p- crit.png
~~~
/// - Mode 12
1 p- stand.png
6 p- a01.png
~~~
/// - Mode 9
L
1 p- stand.png
C01
~~~`;
 const m=D.parseFEScript(text);
 assert.deepEqual(Object.keys(m).map(Number),[1,3,9,12]);
 assert.deepEqual(m[1].steps.map(s=>s.file),["stand.png","a01.png","a02.png","a03.png"]);
 assert.equal(m[1].impact,2,"el golpe cae en el fotograma que sigue a C1A");
 assert.equal(m[1].steps[2].ticks,23,"C01 tras el golpe alarga el fotograma (espera de la vida)");
 assert.equal(m[3].impact,1);assert.equal(m[12].impact,0);assert.equal(m[9].steps[0].ticks,1,"C01 sin golpe no alarga");
 const t=D.feTracks(m,false);assert.equal(t.normal,m[1]);assert.equal(t.critical,m[3]);assert.equal(t.miss,m[12]);
 assert.equal(D.feTracks({5:m[1]},false).normal,m[1],"sin modo 1 usa el de distancia");
});

test("iconos pixel-art: 16×16 y solo colores de la paleta",()=>{
 const code=fs.readFileSync(path.join(__dirname,"..","src","app","icons.js"),"utf8"),win={Astra:{},Tactics:T};
 new Function("window",code)(win);
 const pix=win.Astra.PIXEL;["village","shop","chest","door","goal","deploy","enemy","ally"].forEach(k=>{
  assert.equal(pix[k].length,16,k);pix[k].forEach((r,i)=>{assert.equal(r.length,16,k+" fila "+i);assert.match(r,/^[.krRwWbBnygGsSuUeEvpP]+$/,k+" fila "+i);});});
});

test("voltear una animación: todas sus pistas, ida y vuelta",()=>{
 const layer=()=>({atlas:"A",rect:0,mirror:false});
 const pack={clips:{"A:normal":{frames:[[layer()],[layer()]]},"A:critical":{frames:[[layer()]]},"A:miss":{frames:[[layer()]]},"B:normal":{frames:[[layer()]]}}};
 assert.equal(D.isFlipped(pack,"A"),false);
 assert.equal(D.flipAnimation(pack,"A"),true);assert.equal(D.isFlipped(pack,"A"),true);
 assert.ok(["A:normal","A:critical","A:miss"].every(k=>pack.clips[k].frames.every(f=>f[0].mirror)));
 assert.equal(pack.clips["B:normal"].frames[0][0].mirror,false,"no toca otras animaciones");
 assert.equal(D.flipAnimation(pack,"A"),false);assert.equal(D.isFlipped(pack,"A"),false);
 const built=D.buildAnimation({name:"M",path:"p.png",frames:[{w:2,h:2,dx:0,dy:0}],pos:[{x:0,y:0}],anchor:{x:1,y:2},mirror:true,modes:{normal:{steps:[{frame:0,ticks:2}],impact:0}}});
 assert.ok(built.clips["M:normal"].frames.every(f=>f[0].mirror));
});
