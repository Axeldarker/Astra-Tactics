/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
// Astra Editor · modelo. Lee y escribe eventos de un mapa de MZ (el JSON de data/MapXXX.json)
// usando los mismos comandos de TacticsMZ que pondrías a mano. No depende de MZ: se prueba en Node.
(function(root){
"use strict";
const T=root.Tactics,copy=T.copy,PLUGIN="TacticsMZ";
const M=T.Editor=T.Editor||{};

// ---------- herramientas de la paleta ----------
// cmd: comando ★ que crea · color/letter: marcador en el mapa · defaults: argumentos iniciales.
M.tools={
 enemy:{label:"Enemigo",letter:"E",color:"#e37879",cmd:"Enemy",unit:true},
 ally:{label:"Aliado",letter:"A",color:"#51bdde",cmd:"Ally",unit:true},
 chest:{label:"Cofre",letter:"C",color:"#d2b567",cmd:"Chest"},
 door:{label:"Puerta",letter:"P",color:"#a49772",cmd:"Door"},
 village:{label:"Aldea",letter:"V",color:"#9de1b1",cmd:"Village"},
 shop:{label:"Tienda",letter:"T",color:"#b59de2",cmd:"Shop"},
 goal:{label:"Conquista",letter:"★",color:"#f0ebda",cmd:"Goal"},
 deploy:{label:"Despliegue",letter:"D",color:"#62d7ed",cmd:"Deployment"}
};
// Comandos que definen "qué es" un evento, para elegir su marcador.
const KIND=[["Enemy","enemy"],["Ally","ally"],["Unit",null],["Chest","chest"],["Door","door"],["Village","village"],["Shop","shop"],["Interaction",null],["Goal","goal"],["Deployment","deploy"],["Mission","mission"]];
// Complementos que se añaden debajo de una unidad.
M.addons={Reinforcement:"Refuerzo",Recruit:"Reclutable"};

// ---------- argumentos: MZ los guarda siempre como texto ----------
M.encode=function(id,args){const def=T.catalog.find(c=>c.id===id);T.assert(def,"Comando desconocido: "+id);const out={};
 def.fields.forEach(f=>{const v=args&&args[f.id]!==undefined?args[f.id]:f.value;out[f.id]=typeof v==="string"?v:Array.isArray(v)?JSON.stringify(v.map(x=>typeof x==="string"?x:JSON.stringify(x))):String(v);});return out;};
const label=id=>T.catalog.find(c=>c.id===id).label;
const display=(def,f,v)=>f.type==="select"&&f.options?(f.options[String(v)]!==undefined?f.options[String(v)]:v):Array.isArray(v)?"["+v.length+"]":v;
// Un comando de plugin en MZ = 357 + líneas 657 que el editor muestra debajo.
M.commandLines=function(id,args,indent){
 const def=T.catalog.find(c=>c.id===id),a=T.args(id,M.encode(id,args)),ind=indent||0;
 const lines=[{code:357,indent:ind,parameters:[PLUGIN,id,label(id),M.encode(id,args)]}];
 def.fields.forEach(f=>{const v=a[f.id],d=T.copy(f.value);if(JSON.stringify(v)!==JSON.stringify(d))lines.push({code:657,indent:ind,parameters:[f.label+" = "+display(def,f,v)]});});
 return lines;
};

// ---------- eventos ----------
M.blankPage=function(){return {conditions:{actorId:1,actorValid:false,itemId:1,itemValid:false,selfSwitchCh:"A",selfSwitchValid:false,switch1Id:1,switch1Valid:false,switch2Id:1,switch2Valid:false,variableId:1,variableValid:false,variableValue:0},
 directionFix:false,image:{characterIndex:0,characterName:"",direction:2,pattern:0,tileId:0},list:[{code:0,indent:0,parameters:[]}],
 moveFrequency:3,moveRoute:{list:[{code:0,parameters:[]}],repeat:true,skippable:false,wait:false},moveSpeed:3,moveType:0,priorityType:0,stepAnime:false,through:false,trigger:0,walkAnime:true};};
M.nextId=function(map){let id=1;while(map.events[id])id++;return id;};
M.eventAt=function(map,x,y){return (map.events||[]).filter(Boolean).filter(e=>e.x===x&&e.y===y).sort((a,b)=>M.rank(a)-M.rank(b))[0]||null;};
M.rank=function(e){const k=M.kind(e);return k==="mission"?9:k?0:5;};
M.page=e=>(e.pages||[])[0];
// Comandos de TacticsMZ en la página 1, con su posición en la lista.
M.commands=function(e){const out=[],list=(M.page(e)||{}).list||[];list.forEach((c,index)=>{if(c.code===357&&c.parameters[0]===PLUGIN&&T.catalog.some(d=>d.id===c.parameters[1]))out.push({index,id:c.parameters[1],args:T.args(c.parameters[1],c.parameters[3]||{})});});return out;};
M.find=(e,id)=>M.commands(e).find(c=>c.id===id)||null;
M.kind=function(e){const ids=M.commands(e).map(c=>c.id);for(const [id,k] of KIND)if(ids.indexOf(id)>=0){if(k)return k;const a=M.find(e,id).args;return id==="Unit"?(Number(a.team)===2?"enemy":"ally"):({chest:"chest",door:"door",village:"village",house:"village",shop:"shop",arena:"shop"})[a.type]||"chest";}return null;};
// Quita un comando y sus líneas 657.
const cut=(list,index)=>{let end=index+1;while(list[end]&&list[end].code===657)end++;list.splice(index,end-index);};
// Fija un comando: lo reemplaza si existe o lo añade (después de "after" si se indica, si no antes del final).
M.setCommand=function(e,id,args,after){
 const page=M.page(e),list=page.list,existing=M.find(e,id);
 const merged=Object.assign({},existing?existing.args:{},args||{}),lines=M.commandLines(id,merged);
 let at;if(existing){at=existing.index;cut(list,at);}
 else{const ref=after&&M.find(e,after);if(ref){at=ref.index+1;while(list[at]&&list[at].code===657)at++;}else{at=list.length;while(at>0&&list[at-1].code===0)at--;}}
 list.splice(at,0,...lines);if(!list.length||list[list.length-1].code!==0)list.push({code:0,indent:0,parameters:[]});
 M.refreshLook(e);
 return T.args(id,M.encode(id,merged));
};
M.removeCommand=function(e,id){const c=M.find(e,id);if(c){cut(M.page(e).list,c.index);return true;}return false;};
// Nombre visible del evento en MZ y gráfico de aliados (para verlo en el editor de MZ).
M.db=null; // {actors,classes,...} de MZ; lo pone la escena.
M.describe=function(e){
 const k=M.kind(e),c=M.commands(e)[0],db=M.db||{},name=(table,id)=>((db[table]||[])[id]||{}).name||("#"+id);
 if(!c)return e.name||("EV"+e.id);
 const a=c.args,r=M.find(e,"Reinforcement");let text;
 if(c.id==="Enemy")text=(a.name||(a.preset?a.preset:name("classes",a.classId)))+(a.level?" Nv"+a.level:"");
 else if(c.id==="Ally")text=name("actors",a.actorId)+(a.lord?" ♛":"");
 else if(c.id==="Unit")text=a.name||(a.actorId?name("actors",a.actorId):name("classes",a.classId));
 else if(c.id==="Chest")text=a.weaponId?name("weapons",a.weaponId):a.itemId?name("items",a.itemId):a.gold?a.gold+" oro":"vacío";
 else text=a.name||"";
 return (M.tools[k]?M.tools[k].label:label(c.id).replace("★ ",""))+(text?": "+text:"")+(r?" · "+M.reinforcementBadge(r.args):"");
};
M.reinforcementBadge=a=>a.switchId?"S"+a.switchId:a.every>0?"T"+a.turn+"↻"+a.every:"T"+a.turn;
M.refreshLook=function(e){
 const page=M.page(e),ally=M.find(e,"Ally"),db=M.db||{};
 e.name=M.describe(e).slice(0,40);
 if(ally&&db.actors&&db.actors[ally.args.actorId]){const a=db.actors[ally.args.actorId];page.image=Object.assign(page.image||{},{characterName:a.characterName||"",characterIndex:a.characterIndex||0,direction:2,pattern:1,tileId:0});}
};
M.create=function(map,tool,x,y,args){
 const t=M.tools[tool];T.assert(t,"Herramienta desconocida: "+tool);
 const id=M.nextId(map),e={id,name:"",note:"",pages:[M.blankPage()],x,y};map.events[id]=e;
 M.setCommand(e,t.cmd,args||{});M.refreshLook(e);return e;
};
M.move=function(map,id,x,y){const e=map.events[id];T.assert(e,"Evento inexistente");e.x=x;e.y=y;return e;};
M.remove=function(map,id){T.assert(map.events[id],"Evento inexistente");map.events[id]=null;while(map.events.length>1&&!map.events[map.events.length-1])map.events.pop();};
M.missionEvent=function(map,create){
 const found=(map.events||[]).filter(Boolean).find(e=>M.find(e,"Mission"));if(found||!create)return found||null;
 const id=M.nextId(map),e={id,name:"Misión",note:"",pages:[M.blankPage()],x:0,y:0};map.events[id]=e;M.setCommand(e,"Mission",{title:map.displayName||"Misión"});return e;
};
// Marcadores para dibujar encima del mapa.
M.markers=function(map){return (map.events||[]).filter(Boolean).map(e=>{const k=M.kind(e);if(!k||k==="mission")return null;const t=M.tools[k],r=M.find(e,"Reinforcement"),u=M.find(e,k==="enemy"?"Enemy":k==="ally"?"Ally":"Unit");
 return {id:e.id,x:e.x,y:e.y,kind:k,letter:t.letter,color:t.color,badge:r?M.reinforcementBadge(r.args):M.find(e,"Template")?"plantilla":"",level:u&&u.args.level?u.args.level:0,boss:!!(u&&(u.args.role==="boss"||u.args.boss)),lord:!!(u&&u.args.lord),recruit:!!M.find(e,"Recruit"),title:M.describe(e)};}).filter(Boolean);};
// Revisión: compila el mapa con el motor real y devuelve el error (o null) y un resumen.
M.check=function(map,id){
 try{const m=T.compileMap(copy(map),id||0);
  const foes=m.units.filter(u=>Number(u.team)===2).length,allies=m.units.filter(u=>Number(u.team)===1).length,warnings=[];
  if(!allies&&m.deployment!=="prepare")warnings.push("No hay aliados en el mapa.");
  if(m.objective==="eliminate"&&!foes&&!Object.keys(m.templates).length)warnings.push("Objetivo Eliminar enemigos pero no hay enemigos.");
  if(m.objective==="boss"&&!m.units.some(u=>u.boss))warnings.push("Objetivo Derrotar jefes pero ningún enemigo es jefe.");
  if(m.objective==="seize"&&!m.goals.length)warnings.push("Objetivo Conquistar pero no hay Casilla de conquista.");
  if(allies>1&&!m.leader)warnings.push("Ningún aliado está marcado como líder.");
  return {ok:true,error:null,warnings,summary:{title:m.title,objective:m.objective,allies,foes,reinforcements:Object.keys(m.templates).length,interactions:m.interactions.length,goals:m.goals.length}};
 }catch(error){return {ok:false,error:error.message,warnings:[],summary:null};}
};
if(typeof module!=="undefined"&&module.exports)module.exports=T;
})(typeof globalThis!=="undefined"?globalThis:this);
