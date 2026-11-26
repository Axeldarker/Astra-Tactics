/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
/*:
 * @target MZ
 * @plugindesc TacticsMZ: catálogo y ejecución de comandos. Cargar después de TacticsSystem.
 * @author TacticsMZ contributors
 * @help Autoría de eventos desde TacticsMZ. No se utilizan comentarios ni notas de eventos.
 */
(function(root){
"use strict";
const T=root.Tactics,E=T.Engine.prototype;
const field=(id,label,type,value,options)=>({id,label,type,value,options});
const n=(id,label,value)=>field(id,label,"number",value===undefined?0:value);
const s=(id,label,value)=>field(id,label,"string",value||"");
const b=(id,label,value)=>field(id,label,"boolean",!!value);
const choice=(id,label,options,value)=>field(id,label,"select",value===undefined?Object.keys(options)[0]:value,options);
const ref=(id,label,type,value)=>field(id,label,type,value||0);
const list=(id,label,type)=>field(id,label,"struct<"+type+">[]",[]);
const unit=()=>n("unit","Unidad (ID del evento; 0 = activadora)");
const target=()=>n("target","Unidad objetivo (ID del evento)");
const xy=()=>[n("x","Casilla X"),n("y","Casilla Y")];
// Constructores de campos compartidos: Rules, Easy y cualquier extensión los reutilizan.
T.fields={field,n,s,b,choice,ref,list,unit,target,xy};
const modes={add:"Sumar",set:"Fijar"};
const kinds={weapon:"Arma",item:"Objeto"};
const teams={0:"Cualquiera",1:"Aliados",2:"Enemigos",3:"Independientes"};
const objectives={eliminate:"Eliminar enemigos",boss:"Derrotar jefes",seize:"Conquistar",survive:"Sobrevivir",manual:"Comando de finalizar"};
const ai={approach:"Avanzar y atacar",hold:"Mantener posición",guard:"Guardar posición",heal:"Curar y apoyar",pillage:"Saquear",thief:"Buscar tesoros",random:"Patrullar"};
const command=(id,label,help,fields,definition)=>({id,label,help,fields,definition:!!definition});
const unitFields=[ref("actorId","Personaje de F9 (0 = genérico)","actor"),ref("classId","Clase de F9 (0 = clase del personaje)","class"),s("name","Nombre (vacío = BD)"),choice("team","Equipo",teams,"1"),n("level","Nivel (0 = BD)"),ref("weaponId","Arma inicial (0 = BD)","weapon"),ref("itemId","Objeto inicial opcional","item"),choice("ai","Comportamiento",ai),b("boss","Es jefe"),b("loot","Deja inventario al caer"),n("priority","Prioridad de IA"),list("inventory","Inventario avanzado","Equipment"),list("stats","Estadísticas opcionales","Statistic"),list("ranks","Dominio inicial","Rank"),s("color","Color de vestimenta (#RRGGBB)")];
T.structures={
 Equipment:[choice("kind","Tipo",kinds),n("id","ID de la entrada en F9",1),n("uses","Usos (-1 = BD)",-1)],
 Statistic:[choice("stat","Estadística",Object.fromEntries(T.stats.map(k=>[k,k]))),n("value","Valor")],
 Rank:[s("category","Tipo de arma (blade, pole, axe, bow, arcane, staff o ID MZ)","blade"),n("value","Experiencia de arma")],
 Goods:[choice("kind","Tipo",kinds),n("id","ID de F9",1),n("count","Existencias (-1 = infinitas)",-1),n("price","Precio (-1 = BD)",-1)]
};
T.catalog=[
 command("Mission","Configurar misión","Una configuración por mapa. Las unidades se colocan con comandos en sus eventos.",[s("title","Título","Nueva misión"),choice("objective","Victoria",objectives),n("leader","Unidad líder"),s("protectedIds","Unidades protegidas (IDs separados por comas)"),n("surviveTurns","Turnos para sobrevivir",5),n("turnLimit","Límite de turnos (0 = sin límite)"),n("gold","Oro inicial",500),n("fog","Visión (0 = sin niebla)"),ref("nextMapId","Mapa siguiente (0 = final)","map"),b("creator","Crear protagonista al comenzar"),n("protagonist","Unidad protagonista",1)],true),
 command("Campaign","Configurar continuidad","El progreso se guarda por partida. La preparación usa las casillas de despliegue de ESTE mapa.",[ref("nextMapId","Mapa siguiente","map"),choice("deployment","Aliados al entrar",{prepare:"Preparación: elegir y colocar reclutas",all:"Todos los reclutados: junto al líder",placed:"Solo los colocados: resto en reserva"},"placed")],true),
 command("Deployment","Casilla de despliegue","La posición de este evento será una casilla disponible en el mapa de preparación. Activa Preparación en Configurar continuidad.",[],true),
 command("Unit","Colocar unidad","Usa la posición del evento. Un aliado guardado conserva su progreso; nivel e inventario iniciales solo se aplican la primera vez.",unitFields.concat([b("onlyRecruited","Solo si ya fue reclutado",false)]),true),
 command("Template","Plantilla de refuerzo","Añádelo a un evento con Colocar unidad. No aparece al inicio.",[],true),
 command("Goal","Casilla de conquista","La posición de este evento se convierte en un objetivo.",[],true),
 command("Interaction","Configurar interacción","Cofres y puertas consumen llaves o requieren la habilidad de abrir cerraduras.",[choice("type","Tipo",{chest:"Cofre",door:"Puerta",shop:"Tienda",house:"Casa",village:"Poblado",arena:"Coliseo"}),s("name","Nombre"),s("text","Diálogo"),b("repeat","Permitir repetir"),n("event","Evento a ejecutar"),n("recruit","Unidad para reclutar"),ref("switchId","Activar interruptor","switch"),choice("rewardKind","Tipo de recompensa",kinds,"item"),n("rewardId","ID recompensa (0 = ninguna)"),n("rewardGold","Oro de recompensa"),list("stock","Mercancías","Goods"),b("secret","Requiere credencial"),s("group","Grupo de puertas"),n("terrain","Terreno después de abrir"),n("width","Ancho de puerta",1),n("height","Alto de puerta",1)],true),
 command("Conversation","Conversación de unidades","Permite hablar junto a otra unidad y ejecutar un evento.",[n("first","Primera unidad"),n("second","Segunda unidad"),s("text","Texto"),n("event","Evento a ejecutar"),b("once","Solo una vez",true),b("recruit","Reclutar segunda unidad")],true),
 command("On","Cuándo ejecutar","Añade acciones después. Las condiciones de página normales de MZ siguen activas.",[choice("type","Momento",{start:"Inicio",turnStart:"Comienzo de fase",turnEnd:"Fin de fase",unitDefeated:"Unidad derrotada",enter:"Entrar en casilla o región",switch:"Interruptor activado",victory:"Victoria",defeat:"Derrota",manual:"Llamada de otro evento",interaction:"Interacción"}),choice("team","Filtro de equipo",teams),n("turn","Turno (0 = cualquiera)"),n("unit","Unidad (0 = cualquiera)"),n("region","Región (0 = casilla del evento)"),ref("switchId","Interruptor","switch"),b("once","Solo una vez",true)],true),
 command("Start","Abrir misión","Inicia el mapa táctico desde un evento normal de MZ. 0 utiliza el mapa actual.",[ref("mapId","Mapa","map")]),
 command("Spawn","Crear refuerzo","Busca una casilla válida cercana si la indicada está ocupada o fuera del mapa.",[n("template","Evento plantilla"),n("id","ID nuevo (0 = automático)"),...xy()]),
 command("MoveSpawn","Mover último refuerzo","Espera a que termine la animación.",xy()),
 command("MoveUnit","Mover unidad","Movimiento de escena con ruta válida; no consume puntos de movimiento.",[unit(),...xy()]),
 command("ChangeUnit","Cambiar unidad","Campos vacíos conservan el valor.",[unit(),s("name","Nombre"),choice("team","Equipo (0 = conservar)",teams),choice("ai","Comportamiento (vacío = conservar)",Object.assign({"":"Conservar"},ai)),choice("boss","Jefe",{"":"Conservar",true:"Sí",false:"No"}),b("refresh","Recuperar acción")]),
 command("RemoveUnit","Retirar unidad","Retirar un líder protegido también puede causar derrota.",[unit(),b("defeated","Contar como derrota",true)]),
 command("HP","Cambiar salud","0 PV derrota a la unidad. Este comando no resucita.",[unit(),choice("mode","Operación",{add:"Sumar",set:"Fijar",full:"Recuperar todos"}),n("value","Cantidad")]),
 command("Stats","Cambiar estadística","Modifica la estadística permanente.",[unit(),choice("stat","Estadística",Object.fromEntries(T.stats.map(k=>[k,k]))),choice("mode","Operación",modes),n("value","Cantidad")]),
 command("Experience","Dar experiencia","Cada 100 EXP aplica los crecimientos y aprende las habilidades de nivel.",[unit(),n("value","EXP",25)]),
 command("WeaponRank","Dominio de arma","Respeta los límites de la clase.",[unit(),s("category","Tipo","blade"),choice("mode","Operación",modes),n("value","Cantidad",10)]),
 command("Support","Mejorar apoyo","Requiere dos aliados a distancia máxima de 3 casillas.",[unit(),target()]),
 command("Skill","Aprender o quitar habilidad","La habilidad seleccionada debe definir efectos tácticos en su nota de F9.",[unit(),ref("skillId","Habilidad","skill"),b("remove","Quitar")]),
 command("State","Aplicar o quitar estado","Los estados expiran al comenzar las fases de su unidad.",[unit(),ref("stateId","Estado","state"),n("turns","Duración",3),b("remove","Quitar")]),
 command("Promote","Promocionar","Requiere una rama compatible de la clase.",[unit(),ref("classId","Clase destino","class"),b("ignoreLevel","Ignorar requisito de nivel")]),
 command("Inventory","Cambiar inventario","Regalos sin espacio van al almacén; si está lleno quedan pendientes.",[unit(),choice("mode","Operación",{give:"Dar",remove:"Quitar",equip:"Equipar"}),choice("kind","Tipo",kinds),n("id","ID de F9",1),n("quantity","Cantidad",1),n("uses","Usos (-1 = BD)",-1)]),
 command("Convoy","Cambiar almacén","Depositar y retirar usan posiciones de inventario empezando por 1.",[unit(),choice("mode","Operación",{give:"Dar al almacén",remove:"Quitar del almacén",deposit:"Depositar de unidad",withdraw:"Retirar hacia unidad"}),choice("kind","Tipo",kinds),n("id","ID",1),n("slot","Posición",1)]),
 command("Gold","Cambiar oro","Una suma negativa descuenta oro; el mínimo es 0.",[choice("mode","Operación",modes),n("value","Cantidad",100)]),
 command("Trade","Intercambiar objetos","Requiere aliados adyacentes.",[unit(),target(),n("slot","Posición de unidad",1),n("targetSlot","Posición de objetivo (vacía = entregar)",1)]),
 command("Steal","Robar objeto","Requiere habilidad, mayor velocidad y espacio.",[unit(),target(),n("slot","Posición del objetivo",1)]),
 command("UseItem","Usar objeto o bastón","Respeta alcance y requisitos del efecto.",[unit(),target(),n("slot","Posición del objeto",1),...xy()]),
 command("Combat","Resolver combate","Aplica reglas, contraataques, usos, experiencia y presentación.",[unit(),target(),b("consumeAction","Consumir acción",true)]),
 command("Rescue","Rescatar o soltar","Rescate físico entre aliados cercanos.",[choice("mode","Operación",{rescue:"Rescatar",give:"Entregar",take:"Tomar",drop:"Soltar",cover:"Cubrir"}),unit(),target(),...xy()]),
 command("Switch","Cambiar interruptor","También activa disparadores de interruptor.",[ref("id","Interruptor","switch"),b("value","Valor",true)]),
 command("SelfSwitch","Cambiar autointerruptor","0 significa este evento.",[n("event","Evento"),choice("letter","Letra",{A:"A",B:"B",C:"C",D:"D"}),b("value","Valor",true)]),
 command("Variable","Cambiar variable","Permite usar constante, turno u otra variable con desplazamiento.",[ref("id","Variable","variable"),choice("mode","Operación",{set:"Fijar",add:"Sumar",subtract:"Restar"}),choice("source","Origen",{constant:"Cantidad",turn:"Turno actual",variable:"Otra variable"}),n("value","Cantidad o ID variable"),n("offset","Desplazamiento")]),
 command("If","Si se cumple","Debe cerrarse con Fin de condición. Se admite anidación.",[choice("type","Condición",{switch:"Interruptor",variable:"Variable",alive:"Unidad viva",turn:"Turno",modulo:"Periodicidad",area:"Unidad en área",free:"Casilla libre",interaction:"Interacción usada",result:"Resultado",self:"Autointerruptor"}),n("id","ID (unidad, interruptor, variable o interacción)"),choice("compare","Comparación",{eq:"Igual",ne:"Distinto",gte:"Mayor o igual",lte:"Menor o igual"}),n("value","Valor",1),n("offset","Turno inicial / desplazamiento"),...xy(),n("width","Ancho",1),n("height","Alto",1),s("text","Resultado o autointerruptor","victory"),b("negate","Invertir condición")]),
 command("Else","Si no se cumple","Rama alternativa del Si anterior.",[]),command("EndIf","Fin de condición","Cierra la condición más reciente.",[]),
 command("RunEvent","Ejecutar otro evento","Espera a que termine la secuencia llamada.",[n("event","Evento")]),
 command("Wait","Esperar","La espera se conserva al guardar.",[n("frames","Fotogramas",30)]),
 command("EraseEvent","Desactivar evento","No borra sus unidades. Impide nuevas activaciones.",[n("event","Evento (0 = este)")]),
 command("StopEvent","Terminar secuencia","No ejecuta las acciones restantes de esta llamada.",[]),
 command("Dialogue","Mostrar diálogo","Espera confirmación. Texto largo se pagina automáticamente.",[s("name","Nombre"),s("text","Texto","Bienvenidos."),unit()]),
 command("Camera","Enfocar cámara","Centra la vista en la casilla.",xy()),
 command("Music","Música o sonido","Selecciona un archivo del proyecto MZ.",[choice("kind","Tipo",{bgm:"Música",se:"Sonido",stop:"Detener música"}),ref("name","Archivo","file"),n("volume","Volumen",80),n("pitch","Tono",100)]),
 command("Themes","Tema de combate","Asigna música para el próximo combate.",[s("battle","Archivo BGM de combate"),s("victory","Archivo ME de victoria")]),
 command("TeamName","Nombrar equipo","Etiqueta mostrada en la HUD.",[choice("team","Equipo",teams,"1"),s("name","Nombre","Aliados")]),
 command("EscapePoint","Punto de retirada","Una unidad indicada en esa casilla se retira cuando ejecuta este comando.",[unit(),...xy()]),
 command("PillageTarget","Objetivo de saqueo","Cambia la IA a saquear y marca una interacción como objetivo preferido.",[unit(),n("interaction","ID de interacción")]),
 command("Tone","Color del mapa","Color hexadecimal y opacidad de 0 a 100. 0 quita el efecto.",[s("color","Color","#202b60"),n("opacity","Opacidad",20)]),
 command("Terrain","Cambiar terreno","Actualiza movimiento, defensa y aspecto de un rectángulo.", [...xy(),n("width","Ancho",1),n("height","Alto",1),n("terrain","ID del terreno")]),
 command("Fog","Niebla de guerra","Visión 0 revela todo el mapa.",[n("radius","Visión",4)]),
 command("Options","Cambiar reglas","Solo se aceptan opciones conocidas.",[choice("option","Opción",{doubleSpeed:"Diferencia para doble ataque",critical:"Multiplicador crítico",twoRolls:"Dos tiradas de precisión (0/1)",fixedGrowth:"Crecimiento fijo (0/1)",singleTopRank:"Un solo rango máximo (0/1)",inventory:"Capacidad de inventario",convoy:"Capacidad de almacén",supportCap:"Límite de apoyos"}),n("value","Valor",4)]),
 command("Objective","Cambiar objetivo","Sustituye la victoria activa.",[choice("objective","Objetivo",objectives),n("leader","Unidad líder"),n("turns","Turnos",5)]),
 command("Finish","Finalizar misión","Las recompensas deben ponerse en un evento de victoria de una sola ejecución.",[choice("result","Resultado",{victory:"Victoria",defeat:"Derrota"})]),
 command("Save","Guardar partida","Guarda también la posición actual de la secuencia.",[n("slot","Ranura",1)]),
 command("NextMission","Continuar campaña","0 usa el mapa siguiente de la misión.",[ref("mapId","Mapa","map")]),
 command("OpenMenu","Abrir pantalla","Permite acceder a creador, galería, taller o almacén durante la misión.",[choice("menu","Pantalla",{animations:"Animaciones",creator:"Crear protagonista",workshop:"Taller de clases",convoy:"Almacén",status:"Estado"}),unit()]),
 command("Color","Cambiar colores RGB","Colores hexadecimales #RRGGBB.",[unit(),s("cloth","Vestimenta","#61adcf"),s("hair","Cabello","#392d35"),s("skin","Piel","#dfb797")])
];
// API de extensión: añade comandos nuevos o campos a comandos existentes sin tocar el catálogo base.
T.addCommand=(id,label,help,fields,definition)=>{T.assert(!T.catalog.some(c=>c.id===id),"Comando duplicado: "+id);const def=command(id,label,help,fields,definition);T.catalog.push(def);return def;};
T.extendCommand=(id,fields)=>{const def=T.catalog.find(c=>c.id===id);T.assert(def,"Comando desconocido: "+id);def.fields.push.apply(def.fields,fields);return def;};
T.decode=function(value){
 if(typeof value!=="string")return value;
 const t=value.trim();if(t==="true")return true;if(t==="false")return false;
 if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);
 if(t[0]==="["||t[0]==="{"){try{const result=JSON.parse(t);if(Array.isArray(result))return result.map(T.decode);Object.keys(result).forEach(k=>result[k]=T.decode(result[k]));return result;}catch(e){return value;}}
 return value;
};
T.args=function(id,args){const def=T.catalog.find(c=>c.id===id);T.assert(def,"Comando desconocido: "+id);const result={};def.fields.forEach(f=>{result[f.id]=args&&args[f.id]!==undefined?T.decode(args[f.id]):T.copy(f.value);});return result;};
T.unitDefinition=function(args,event){
 const a=T.args("Unit",args),d=Object.assign({},a,{id:event.id,x:event.x,y:event.y});
 if(!a.classId)delete d.classId;if(!a.level)delete d.level;if(!a.color)delete d.color;
 d.stats={};a.stats.forEach(s=>d.stats[s.stat]=s.value);d.ranks={};a.ranks.forEach(s=>d.ranks[s.category]=s.value);
 if(!a.inventory.length)delete d.inventory;
 return d;
};
T.compileMap=function(map,id){
 T.assert(map&&Number.isInteger(map.width)&&Number.isInteger(map.height)&&map.width>0&&map.height>0,"Mapa sin dimensiones válidas");
 const m={id,width:map.width,height:map.height,tilesetId:map.tilesetId||0,tileWidth:map.tileWidth||48,tileHeight:map.tileHeight||48,title:map.displayName||"Misión",tiles:[],regions:[],units:[],events:[],templates:{},interactions:[],goals:[],deployments:[],conversations:[]};
 for(let i=0;i<m.width*m.height;i++){const region=(map.data||[])[5*m.width*m.height+i]||0;m.regions.push(region);m.tiles.push(region);}
 let configured=false;
 (map.events||[]).filter(Boolean).forEach(event=>{
  const converted={id:event.id,x:event.x,y:event.y,pages:[]};
  (event.pages||[]).forEach((page,pageIndex)=>{
   const commands=(page.list||[]).filter(c=>c.code===357&&c.parameters[0]==="TacticsMZ").map(c=>({id:c.parameters[1],args:T.args(c.parameters[1],c.parameters[3]||{})}));
   const on=commands.find(c=>c.id==="On");
   converted.pages.push({conditions:T.copy(page.conditions||{}),image:T.copy(page.image||{}),stepAnime:!!page.stepAnime,priorityType:page.priorityType||0,on:on?on.args:null,commands:commands.filter(c=>!T.catalog.find(d=>d.id===c.id).definition&&c.id!=="Start")});
   if(pageIndex!==0)return;
   const templ=commands.some(c=>c.id==="Template");
   commands.forEach(c=>{const a=c.args;
    if(c.id==="Mission"){T.assert(!configured,"Solo puede haber una configuración de misión por mapa");Object.assign(m,a);m.protectedIds=String(a.protectedIds).split(",").map(Number).filter(Boolean);configured=true;}
    if(c.id==="Campaign"){m.nextMapId=a.nextMapId;m.deployment=a.deployment;}
    if(c.id==="Deployment")m.deployments.push({id:event.id,x:event.x,y:event.y});
    if(c.id==="Unit"){const d=T.unitDefinition(a,event);if(templ)m.templates[event.id]=d;else m.units.push(d);}
    if(c.id==="Goal")m.goals.push({x:event.x,y:event.y});
    if(c.id==="Conversation")m.conversations.push(Object.assign({id:event.id},a));
    if(c.id==="Interaction"){
     const d=Object.assign({id:event.id,x:event.x,y:event.y},a);d.reward={kind:a.rewardKind,id:a.rewardId,gold:a.rewardGold};d.area={x:event.x,y:event.y,w:a.width,h:a.height};
     d.stock.forEach(g=>{if(g.price<0)delete g.price;});m.interactions.push(d);
    }
   });
  });m.events.push(converted);
 });
 T.assert(configured,"El mapa no tiene Configurar misión");return m;
};
E.testCondition=function(a,entry){
 let actual=0,wanted=a.value,result;
 const u=this.unit(a.id);
 if(a.type==="switch")actual=this.s.flags[a.id]?1:0;
 if(a.type==="variable")actual=this.s.vars[a.id]||0;
 if(a.type==="alive")actual=T.alive(u)?1:0;
 if(a.type==="turn")actual=this.s.turn;
 if(a.type==="modulo")return a.value>0&&this.s.turn>=a.offset&&(this.s.turn-a.offset)%a.value===0;
 if(a.type==="area")actual=T.alive(u)&&u.x>=a.x&&u.y>=a.y&&u.x<a.x+a.width&&u.y<a.y+a.height?1:0;
 if(a.type==="free")actual=this.inside(a.x,a.y)&&!this.at(a.x,a.y)?1:0;
 if(a.type==="interaction")actual=(this.s.map.interactions||[]).some(i=>i.id===a.id&&i.used)?1:0;
 if(a.type==="result"){actual=this.s.result;wanted=a.text;}
 if(a.type==="self")actual=this.s.self[(a.id||entry.event)+":"+a.text]?1:0;
 if(a.compare==="ne")result=actual!==wanted;else if(a.compare==="gte")result=actual>=wanted;else if(a.compare==="lte")result=actual<=wanted;else result=actual===wanted;
 return a.negate?!result:result;
};
E.command=function(id,raw,entry){
 const a=T.args(id,raw),q=entry||{context:{},event:0,branches:[]},s=this.s;
 const get=number=>{const u=this.unit(Number(number)||q.context.unit);T.assert(u,"Unidad no encontrada: "+number);return u;};
 if(id==="If"){q.branches.push({active:this.testCondition(a,q),otherwise:false});return;}
 if(id==="Else"){T.assert(q.branches.length,"Si no se cumple sin Si");const last=q.branches[q.branches.length-1];T.assert(!last.otherwise,"Rama alternativa duplicada");last.active=!last.active;last.otherwise=true;return;}
 if(id==="EndIf"){T.assert(q.branches.length,"Fin de condición sin Si");q.branches.pop();return;}
 if(q.branches.some(b=>!b.active))return;
 if(id==="Spawn"){s.lastSpawn=null;const d=s.map.templates[a.template];T.assert(d,"Plantilla inexistente");this.spawn(Object.assign({},T.copy(d),{id:a.id,x:a.x,y:a.y}));}
 else if(id==="MoveSpawn"){T.assert(s.lastSpawn,"No se creó el refuerzo");this.move(get(s.lastSpawn),a.x,a.y,true);}
 else if(id==="MoveUnit")this.move(get(a.unit),a.x,a.y,true);
 else if(id==="ChangeUnit"){const u=get(a.unit);if(a.name)u.name=a.name;if(a.team)u.team=Number(a.team);if(a.ai)u.ai=a.ai;if(a.boss!=="")u.boss=a.boss===true||a.boss==="true";if(a.refresh){u.acted=false;u.moved=0;u.committed=false;}}
 else if(id==="RemoveUnit"){const u=get(a.unit);if(a.defeated)this.defeat(u);else{u.removed=true;if(u.passenger){const p=get(u.passenger);p.carrier=null;p.x=u.x;p.y=u.y;u.passenger=null;}}this.checkObjective();}
 else if(id==="HP"){const u=get(a.unit);if(T.alive(u)){u.hp=T.clamp(a.mode==="full"?this.value(u,"health"):a.mode==="set"?a.value:u.hp+a.value,0,this.value(u,"health"));if(!u.hp)this.defeat(u);this.checkObjective();}}
 else if(id==="Stats"){const u=get(a.unit);u.stats[a.stat]=Math.max(a.stat==="health"?1:0,a.mode==="set"?a.value:u.stats[a.stat]+a.value);u.hp=Math.min(u.hp,this.value(u,"health"));}
 else if(id==="Experience")this.experience(get(a.unit),a.value);
 else if(id==="WeaponRank")this.rank(get(a.unit),a.category,a.value,a.mode==="set");
 else if(id==="Support")this.support(get(a.unit),get(a.target));
 else if(id==="Skill"){T.assert(this.db.skills[a.skillId],"Habilidad inexistente");const u=get(a.unit);if(a.remove)u.skills=u.skills.filter(i=>i!==a.skillId);else if(u.skills.indexOf(a.skillId)<0)u.skills.push(a.skillId);}
 else if(id==="State"){const u=get(a.unit);if(a.remove)u.states=u.states.filter(st=>st.id!==a.stateId);else this.applyState(u,a.stateId,a.turns);}
 else if(id==="Promote")this.promote(get(a.unit),a.classId,a.ignoreLevel);
 else if(id==="Inventory"){
  const u=get(a.unit);if(a.mode==="give")for(let i=0;i<a.quantity;i++)this.give(u,this.item(a.kind,a.id,a.uses));
  else if(a.mode==="remove")for(let i=0;i<a.quantity;i++){const at=u.inventory.findIndex(x=>x.kind===a.kind&&x.id===a.id);if(at>=0)u.inventory.splice(at,1);}
  else{const at=u.inventory.findIndex(x=>x.kind===a.kind&&x.id===a.id);T.assert(at>=0&&this.canEquip(u,u.inventory[at]),"No se puede equipar");u.equipped=at;}this.autoEquip(u);
 }else if(id==="Convoy"){
  if(a.mode==="deposit"||a.mode==="withdraw")this.convoy(get(a.unit),a.slot-1,a.mode==="deposit");
  else if(a.mode==="give")this.give(null,this.item(a.kind,a.id));
  else{const at=s.convoy.findIndex(i=>i.kind===a.kind&&i.id===a.id);if(at>=0)s.convoy.splice(at,1);}
 }else if(id==="Gold")s.gold=Math.max(0,a.mode==="set"?a.value:s.gold+a.value);
 else if(id==="Trade")this.trade(get(a.unit),get(a.target),a.slot-1,a.targetSlot-1);
 else if(id==="Steal")this.steal(get(a.unit),get(a.target),a.slot-1);
 else if(id==="UseItem")this.useItem(get(a.unit),a.slot-1,a.target?get(a.target):get(a.unit),{x:a.x,y:a.y});
 else if(id==="Combat")this.combat(get(a.unit),get(a.target),a.consumeAction);
 else if(id==="Rescue")this.rescue(get(a.unit),a.mode==="drop"?null:get(a.target),a.mode,a.x,a.y);
 else if(id==="Switch")this.setSwitch(a.id,a.value);
 else if(id==="SelfSwitch")s.self[(a.event||q.event)+":"+a.letter]=a.value;
 else if(id==="Variable"){const v=(a.source==="turn"?s.turn:a.source==="variable"?s.vars[a.value]||0:a.value)+a.offset;s.vars[a.id]=a.mode==="set"?v:(s.vars[a.id]||0)+(a.mode==="subtract"?-v:v);}
 else if(id==="RunEvent")this.callEvent(a.event,q.context);
 else if(id==="Wait")q.wait=Math.max(0,a.frames);
 else if(id==="EraseEvent")s.map.events=s.map.events.filter(e=>e.id!==(a.event||q.event));
 else if(id==="StopEvent")q.pc=q.commands.length;
 else if(id==="Dialogue")this.present({type:"dialogue",name:a.name,text:a.text,unit:a.unit||q.context.unit});
 else if(id==="Camera")s.camera={x:a.x,y:a.y};
 else if(id==="Music")this.present(Object.assign({type:"music"},a));
 else if(id==="Themes")s.themes={battle:a.battle,victory:a.victory};
 else if(id==="TeamName")s.teamNames[a.team]=a.name;
 else if(id==="EscapePoint"){const u=get(a.unit);if(u.x===a.x&&u.y===a.y){u.removed=true;this.checkObjective();}}
 else if(id==="PillageTarget"){const u=get(a.unit);u.ai="pillage";u.pillageTarget=a.interaction;}
 else if(id==="Tone")s.tone={color:a.color,opacity:T.clamp(a.opacity,0,100)/100};
 else if(id==="Terrain"){for(let y=a.y;y<a.y+a.height;y++)for(let x=a.x;x<a.x+a.width;x++)if(this.inside(x,y))s.map.tiles[y*s.map.width+x]=a.terrain;}
 else if(id==="Fog")s.fog=Math.max(0,a.radius);
 else if(id==="Options")s.options[a.option]=["twoRolls","fixedGrowth","singleTopRank"].indexOf(a.option)>=0?!!a.value:Math.max(1,a.value);
 else if(id==="Objective"){s.objective=a.objective;s.map.leader=a.leader;s.map.surviveTurns=a.turns;}
 else if(id==="Finish")this.finish(a.result);
 else if(id==="Save")this.present({type:"save",slot:a.slot});
 else if(id==="NextMission")this.present({type:"next",mapId:a.mapId||s.map.nextMapId});
 else if(id==="OpenMenu")this.present({type:"menu",menu:a.menu,unit:a.unit||s.map.protagonist||1});
 else if(id==="Color"){const u=get(a.unit);["cloth","hair","skin"].forEach(k=>{T.assert(/^#[0-9a-f]{6}$/i.test(a[k]),"Color inválido: "+a[k]);u.colors[k]=a[k];});u.color=a.cloth;u.customColors=true;}
 else if(id==="Start")this.present({type:"next",mapId:a.mapId||s.map.id});
 else if(!T.catalog.find(c=>c.id===id).definition)throw new Error("Comando sin implementar: "+id);
};
E.tick=function(){
 if(this.s.preparation)return;
 if(this.s.presentations.length)return;
 let budget=100;
 while(this.s.queue.length&&budget-->0&&!this.s.presentations.length){
  const q=this.s.queue[0];if(q.wait>0){q.wait--;return;}
  if(q.pc>=q.commands.length){if(q.branches.length)this.notice("Evento "+q.event+": falta Fin de condición");this.s.queue.shift();continue;}
  const c=q.commands[q.pc++];
  try{this.command(c.id,c.args,q);}catch(error){this.s.error={event:q.event,command:c.id,message:error.message};this.notice("Evento "+q.event+" / "+c.id+": "+error.message);q.pc=q.commands.length;return;}
  if(q.wait>0)return;
 }
 this.advancePhase();
};
E.talk=function(u,v){
 T.assert(T.alive(u)&&T.alive(v)&&T.distance(u,v)<=1,"Acércate para hablar");
 const c=(this.s.map.conversations||[]).find(c=>(c.first===u.id&&c.second===v.id||c.first===v.id&&c.second===u.id)&&(!c.used||!c.once));
 T.assert(c,"No hay conversación disponible");c.used=true;if(c.text)this.present({type:"dialogue",name:v.name,text:c.text,unit:v.id});if(c.recruit){const recruit=this.unit(c.second);if(recruit)recruit.team=1;}if(c.event)this.callEvent(c.event,{unit:u.id,target:v.id});this.finishAction(u,"talk");
};
if(typeof module!=="undefined"&&module.exports)module.exports=T;
})(typeof globalThis!=="undefined"?globalThis:this);
