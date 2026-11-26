/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
// Comandos rápidos. Cada uno es "azúcar": antes de compilar el mapa se traduce a los comandos
// clásicos (Colocar unidad, Plantilla de refuerzo, Cuándo ejecutar, Crear refuerzo, Configurar
// interacción, Conversación y Configurar misión). El motor no cambia: un mapa hecho con comandos
// rápidos se comporta exactamente igual que uno hecho a mano con los comandos clásicos.
(function(root){
"use strict";
const T=root.Tactics,{n,s,b,choice,ref}=T.fields,plain=T.notes.plain,copy=T.copy;
const PLUGIN="TacticsMZ",PHASES={0:"La del equipo de la unidad",1:"Aliados",2:"Enemigos",3:"Independientes"};

// ---------- roles de enemigo ----------
// Un rol es un paquete de comportamiento. Las plantillas del Administrador de plugins pueden fijarlo.
T.roles={
 soldier:{label:"Soldado: avanza y ataca",ai:"approach"},
 guard:{label:"Guardia: defiende su zona",ai:"guard"},
 hold:{label:"Torreta: no se mueve, ataca en rango",ai:"hold"},
 boss:{label:"Jefe: no se mueve, es jefe y suelta su botín",ai:"hold",boss:true,loot:true},
 healer:{label:"Curandero: cura a sus aliados",ai:"heal"},
 thief:{label:"Ladrón: abre cofres y huye",ai:"thief"},
 pillager:{label:"Saqueador: arrasa aldeas",ai:"pillage"},
 patrol:{label:"Patrulla: se mueve al azar",ai:"random"}
};
const roleOptions=Object.assign({auto:"Según plantilla (o Soldado)"},Object.fromEntries(Object.keys(T.roles).map(k=>[k,T.roles[k].label])));
// Plantillas de enemigo: {nombre:{classId,level,role,weaponId,itemId,loot,name}}. TacticsMZ las rellena desde sus parámetros.
T.enemyPresets=T.enemyPresets||{};
T.setEnemyPresets=function(list){T.enemyPresets={};(list||[]).forEach(p=>{if(p&&p.name)T.enemyPresets[plain(p.name)]=Object.assign({},p);});return T.enemyPresets;};

// ---------- catálogo ----------
const add=(id,label,help,fields)=>{const def=T.addCommand(id,label,help,fields,true);def.quick=true;return def;};
add("Enemy","★ Enemigo","Rápido. Elige clase y nivel (o una plantilla) y listo. Aparece en la casilla de este evento.",[
 s("preset","Plantilla (nombre, opcional)"),ref("classId","Clase (0 = la de la plantilla)","class"),n("level","Nivel (0 = plantilla o 1)"),
 choice("role","Rol",roleOptions,"auto"),s("name","Nombre (vacío = la clase)"),ref("weaponId","Arma (0 = la de la clase)","weapon"),
 ref("itemId","Objeto que lleva (0 = ninguno)","item"),b("loot","Suelta lo que lleva al caer")]);
add("Ally","★ Aliado","Rápido. Un personaje de F9 en la casilla de este evento. Conserva su progreso entre misiones.",[
 ref("actorId","Personaje","actor"),n("level","Nivel (0 = el de F9)"),b("lord","Es el líder (si cae, se pierde)"),b("onlyRecruited","Solo si ya fue reclutado")]);
add("Reinforcement","★ Refuerzo","Ponlo debajo de Enemigo/Aliado/Colocar unidad. Esa unidad no está al inicio: llega cuando digas. No hace falta otro evento.",[
 n("turn","Turno de llegada",2),choice("phase","Fase en la que llega",PHASES,"0"),n("every","Repetir cada N turnos (0 = solo una vez)"),
 ref("switchId","…o al activar este interruptor (0 = usar el turno)","switch"),n("count","Cuántas copias",1),
 n("x","Casilla X (-1 = la del evento)",-1),n("y","Casilla Y (-1 = la del evento)",-1)]);
add("Chest","★ Cofre","Rápido. Se abre con llave o con Cerrajería. Elige UNA recompensa (arma u objeto) y/o oro.",[
 ref("itemId","Objeto","item"),ref("weaponId","Arma","weapon"),n("gold","Oro")]);
add("Door","★ Puerta","Rápido. Se abre con llave o con Cerrajería. Ocupa la casilla del evento (o un rectángulo).",[
 n("width","Ancho",1),n("height","Alto",1)]);
add("Village","★ Aldea","Rápido. Visitar muestra el texto y da la recompensa. Las acciones que pongas debajo en este evento también se ejecutan.",[
 s("name","Nombre"),s("text","Texto al visitar"),ref("itemId","Objeto de regalo","item"),ref("weaponId","Arma de regalo","weapon"),n("gold","Oro de regalo"),
 n("recruit","Unidad que se une (ID de evento, 0 = ninguna)")]);
add("Shop","★ Tienda","Rápido. Escribe los IDs separados por comas, p. ej. 1,2,5. Existencias infinitas y precio de F9.",[
 s("name","Nombre","Tienda"),s("weapons","Armas en venta (IDs)"),s("items","Objetos en venta (IDs)")]);
add("Recruit","★ Reclutable","Ponlo en el evento del enemigo que se puede reclutar hablando. Las acciones que pongas debajo se ejecutan al hablar.",[
 n("by","Quién puede reclutarlo (ID de evento, 0 = el líder)"),s("text","Lo que dice al unirse")]);

// ---------- traducción a comandos clásicos ----------
const isTactics=c=>c&&c.code===357&&c.parameters&&c.parameters[0]===PLUGIN;
const raw=(id,args)=>({code:357,indent:0,parameters:[PLUGIN,id,"",args]});
const quickIds=new Set(T.catalog.filter(c=>c.quick).map(c=>c.id));
const numberList=v=>String(v||"").split(/[,;\s]+/).map(Number).filter(x=>Number.isInteger(x)&&x>0);
const reward=a=>{T.assert(!(a.itemId&&a.weaponId),"Elige objeto O arma como recompensa, no ambos");return a.weaponId?{rewardKind:"weapon",rewardId:a.weaponId}:{rewardKind:"item",rewardId:a.itemId||0};};
const hasActions=list=>(list||[]).some(c=>isTactics(c)&&(()=>{const d=T.catalog.find(x=>x.id===c.parameters[1]);return d&&!d.definition&&c.parameters[1]!=="Start";})());

T.enemyArgs=function(a,where){
 const preset=a.preset?T.enemyPresets[plain(a.preset)]:null;
 T.assert(!a.preset||preset,where+": no existe la plantilla de enemigo «"+a.preset+"». Créala en el Administrador de plugins → TacticsMZ → Plantillas de enemigo.");
 const p=preset||{},roleKey=a.role&&a.role!=="auto"?a.role:p.role||"soldier",role=T.roles[roleKey];
 T.assert(role,where+": rol desconocido «"+roleKey+"»");
 const classId=Number(a.classId)||Number(p.classId)||0;
 T.assert(classId,where+": el enemigo necesita una clase o una plantilla");
 return {actorId:0,classId,name:a.name||p.name||"",team:"2",level:Number(a.level)||Number(p.level)||1,
  weaponId:Number(a.weaponId)||Number(p.weaponId)||0,itemId:Number(a.itemId)||Number(p.itemId)||0,ai:role.ai,
  boss:!!role.boss,loot:!!(a.loot||p.loot||role.loot)};
};

T.desugarMap=function(source){
 const map=copy(source),events=(map.events||[]).filter(Boolean);
 const firstPage=e=>(e.pages||[])[0]||{list:[]};
 const commands=e=>(firstPage(e).list||[]).filter(isTactics);
 const uses=id=>events.some(e=>commands(e).some(c=>c.parameters[1]===id));
 if(![...quickIds].some(uses)&&uses("Mission"))return map; // mapa 100% clásico: no se toca
 let nextEventId=Math.max(0,...events.map(e=>e.id))+1;
 const lords=[],allies=[],recruits=[],extra=[];
 events.forEach(event=>{
  const page=firstPage(event),list=page.list||[],where="Evento "+event.id+" ("+(event.name||"sin nombre")+")";
  let unitTeam=0;
  for(let i=0;i<list.length;i++){const c=list[i];if(!isTactics(c))continue;const id=c.parameters[1];
   if(id==="Unit"){const a=T.args("Unit",c.parameters[3]||{});unitTeam=Number(a.team)||1;if(unitTeam===1)allies.push(event.id);}
   if(!quickIds.has(id))continue;
   const a=T.args(id,c.parameters[3]||{});
   if(id==="Enemy"){c.parameters[1]="Unit";c.parameters[3]=T.enemyArgs(a,where);unitTeam=2;}
   else if(id==="Ally"){T.assert(a.actorId,where+": elige el personaje del aliado");c.parameters[1]="Unit";c.parameters[3]={actorId:a.actorId,team:"1",level:a.level,onlyRecruited:a.onlyRecruited};unitTeam=1;allies.push(event.id);if(a.lord)lords.push(event.id);}
   else if(id==="Reinforcement"){
    T.assert(unitTeam,where+": pon Refuerzo debajo de Enemigo, Aliado o Colocar unidad");
    c.parameters[1]="Template";c.parameters[3]={};
    const team=Number(a.phase)||unitTeam,x=a.x<0?event.x:a.x,y=a.y<0?event.y:a.y,spawns=[];
    for(let k=0;k<Math.max(1,a.count);k++)spawns.push(raw("Spawn",{template:event.id,id:0,x,y}));
    const on=a.switchId?{type:"switch",team:"0",turn:0,unit:0,region:0,switchId:a.switchId,once:true}
     :{type:"turnStart",team:String(team),turn:a.every>0?0:Math.max(1,a.turn),unit:0,region:0,switchId:0,once:!(a.every>0)};
    const body=!a.switchId&&a.every>0?[raw("If",{type:"modulo",value:a.every,offset:Math.max(1,a.turn)})].concat(spawns,[raw("EndIf",{})]):spawns;
    extra.push({id:nextEventId++,name:"Refuerzo de "+event.id,x:event.x,y:event.y,pages:[{conditions:{},image:{},list:[raw("On",on)].concat(body,[{code:0,indent:0,parameters:[]}])}]});
   }
   else if(id==="Chest"){c.parameters[1]="Interaction";c.parameters[3]=Object.assign({type:"chest",rewardGold:a.gold},reward(a));}
   else if(id==="Door"){c.parameters[1]="Interaction";c.parameters[3]={type:"door",width:Math.max(1,a.width),height:Math.max(1,a.height)};}
   else if(id==="Village"){c.parameters[1]="Interaction";c.parameters[3]=Object.assign({type:"village",name:a.name,text:a.text,rewardGold:a.gold,recruit:a.recruit,event:hasActions(list)?event.id:0},reward(a));}
   else if(id==="Shop"){c.parameters[1]="Interaction";const stock=numberList(a.weapons).map(id=>({kind:"weapon",id,count:-1,price:-1})).concat(numberList(a.items).map(id=>({kind:"item",id,count:-1,price:-1})));T.assert(stock.length,where+": la tienda no vende nada");c.parameters[3]={type:"shop",name:a.name,stock:JSON.stringify(stock)};}
   else if(id==="Recruit"){c.parameters[1]="Conversation";c.parameters[3]={first:a.by,second:event.id,text:a.text,event:hasActions(list)?event.id:0,once:true,recruit:true};if(!a.by)recruits.push(c);}
  }
 });
 // Configurar misión: opcional. Si falta, se crea una con valores sensatos.
 let mission=null;events.forEach(e=>commands(e).forEach(c=>{if(c.parameters[1]==="Mission"&&!mission)mission=c;}));
 if(!mission){
  const seize=uses("Goal");
  mission=raw("Mission",{title:map.displayName||"Misión",objective:seize?"seize":"eliminate"});
  extra.push({id:nextEventId++,name:"Misión automática",x:0,y:0,pages:[{conditions:{},image:{},list:[mission]}]});
 }
 const m=T.args("Mission",mission.parameters[3]||{});
 if(lords.length){
  if(!m.leader)m.leader=lords[0];
  const ids=String(m.protectedIds||"").split(",").map(Number).filter(Boolean);lords.forEach(id=>{if(ids.indexOf(id)<0)ids.push(id);});
  m.protectedIds=ids.join(",");
 }
 mission.parameters[3]=m;
 const leader=m.leader||allies[0]||0;
 recruits.forEach(c=>{T.assert(leader,"Reclutable: no hay líder ni aliados en el mapa; indica quién recluta");c.parameters[3].first=leader;});
 extra.forEach(e=>{map.events[e.id]=e;});
 return map;
};
const compile=T.compileMap;
T.compileMap=function(map,id){return compile(T.desugarMap(map),id);};
if(typeof module!=="undefined"&&module.exports)module.exports=T;
})(typeof globalThis!=="undefined"?globalThis:this);
