/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
// Lectura de la base de datos de F9 y notas simplificadas.
// Formatos aceptados en el cuadro "Nota" de clases, personajes, armas, objetos, habilidades y estados:
//   1) Clásico (sin cambios):   <Tactics>{"moveType":"flying","promotions":[7]}</Tactics>
//   2) Bloque por líneas:       <Tactics>
//                                 tipo: volador
//                                 promociona: 7
//                               </Tactics>
//   3) Etiquetas sueltas:       <Tipo: volador> <Mov: 7> <Promociona: 7>
// El JSON clásico se aplica exactamente igual que antes. Los formatos 2 y 3 fusionan stats y
// crecimientos campo por campo, así que <Mov: 7> no borra el resto de estadísticas.
(function(root){
"use strict";
const T=root.Tactics;

// ---------- utilidades ----------
const plain=text=>String(text).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[\s_-]+/g," ").trim();
const number=v=>{const n=Number(String(v).trim().replace(",","."));return Number.isFinite(n)?n:undefined;};
const list=v=>String(v).split(/[,;]/).map(x=>x.trim()).filter(Boolean);
const numbers=v=>list(v).map(Number).filter(Number.isFinite);
const isMerge=k=>k==="stats"||k==="growth";
T.notes={plain};

// ---------- vocabulario ----------
const STAT={pv:"health",hp:"health",vida:"health",salud:"health",health:"health",
 fue:"power",fuerza:"power",str:"power",atk:"power",power:"power",
 mag:"magic",magia:"magic",magic:"magic",
 hab:"skill",habilidad:"skill",destreza:"skill",skl:"skill",skill:"skill",
 vel:"speed",velocidad:"speed",spd:"speed",agi:"speed",speed:"speed",
 suerte:"luck",sue:"luck",luk:"luck",lck:"luck",luck:"luck",
 def:"defense",defensa:"defense",defense:"defense",
 res:"resistance",resistencia:"resistance",resistance:"resistance",
 mov:"move",movimiento:"move",move:"move",
 con:"build",constitucion:"build",build:"build"};
const MOVE={"a pie":"foot",pie:"foot",infanteria:"foot",foot:"foot",montado:"mounted",caballeria:"mounted",jinete:"mounted",mounted:"mounted",
 volador:"flying",volar:"flying",aereo:"flying",flying:"flying",acorazado:"armored",armadura:"armored",armored:"armored"};
const WEAPON={espada:"blade",espadas:"blade",hoja:"blade",blade:"blade",sword:"blade",lanza:"pole",lanzas:"pole",pole:"pole",lance:"pole",
 hacha:"axe",hachas:"axe",axe:"axe",arco:"bow",arcos:"bow",bow:"bow",magia:"arcane",tomo:"arcane",tomos:"arcane",arcane:"arcane",anima:"arcane",
 baston:"staff",bastones:"staff",vara:"staff",staff:"staff"};
const TEAM={aliados:1,aliado:1,enemigos:2,enemigo:2,independientes:3,independiente:3,otros:3};
const KEY={cofre:"chest",cofres:"chest",chest:"chest",puerta:"door",puertas:"door",door:"door",todas:"all",todo:"all",maestra:"all",all:"all"};
const ITEM_EFFECT={curar:"heal",cura:"heal",heal:"heal",antidoto:"restore",restaurar:"restore",restore:"restore",antorcha:"torch",luz:"torch",torch:"torch",
 llave:"key",key:"key",promocion:"promote",promocionar:"promote",promote:"promote",potenciar:"boost",tonico:"boost",boost:"boost",
 reparar:"repair",repair:"repair",rango:"rank",dominio:"rank",rank:"rank",crecimiento:"growth",growth:"growth",
 refrescar:"refresh",bailar:"refresh",refresh:"refresh",pasivo:"passive",passive:"passive"};
// Efectos de habilidades/estados. "n" indica qué significa el número sin nombre: probabilidad (chance) o valor (value).
const SKILL_EFFECT={
 robar:["steal"],steal:["steal"],cerrajeria:["lockpick"],ganzua:["lockpick"],lockpick:["lockpick"],
 "paso ligero":["canto"],canto:["canto"],"paso de reserva":["cantoCombat"],cantocombat:["cantoCombat"],
 iniciativa:["firstStrike"],"primer golpe":["firstStrike"],firststrike:["firstStrike"],
 ruptura:["halfDefense","chance"],halfdefense:["halfDefense","chance"],drenar:["drain","chance"],drain:["drain","chance"],
 cobertura:["cover"],cubrir:["cover"],cover:["cover"],"anti critico":["critGuard"],critguard:["critGuard"],
 "reducir dano":["reduceDamage","chance"],reducedamage:["reduceDamage","chance"],"ignorar defensa":["ignoreDefense","chance"],ignoredefense:["ignoreDefense","chance"],
 rafaga:["extraStrike","chance"],extrastrike:["extraStrike","chance"],concentracion:["negateSkills"],negateskills:["negateSkills"],
 interrupcion:["cancelReply","chance"],cancelreply:["cancelReply","chance"],"ultimo esfuerzo":["injuredPower","chance"],injuredpower:["injuredPower","chance"],
 remate:["finisher","chance"],finisher:["finisher","chance"],veneno:["poison","value"],poison:["poison","value"],
 regenerar:["regenerate","value"],regeneracion:["regenerate","value"],regenerate:["regenerate","value"],stat:["stat","value"],estadistica:["stat","value"]};
T.vocabulary={STAT,MOVE,WEAPON,TEAM,KEY,ITEM_EFFECT,SKILL_EFFECT};
const weaponType=v=>WEAPON[plain(v)]||String(v).trim();

// "pv 20, fue 5" -> {health:20,power:5}
const statList=v=>{const out={};list(v).forEach(part=>{const m=part.match(/^(.+?)\s*[:=]?\s*(-?\d+(?:\.\d+)?)$/);if(m&&STAT[plain(m[1])])out[STAT[plain(m[1])]]=Number(m[2]);});return out;};
// "arma 1, objeto 3 x2" -> [{kind:"weapon",id:1},{kind:"item",id:3},{kind:"item",id:3}]
const inventory=v=>{const out=[];list(v).forEach(part=>{const m=plain(part).match(/^(arma|weapon|objeto|item)?\s*(\d+)(?:\s*x\s*(\d+))?$/);if(!m)return;const kind=m[1]&&/^(objeto|item)$/.test(m[1])?"item":"weapon";for(let i=0;i<Number(m[3]||1);i++)out.push({kind,id:Number(m[2])});});return out;};
// "drenar 30", "stat vel -3", "reducir daño 30 valor=0.5"
const effect=v=>{
 const words=String(v).trim().split(/\s+/),extra={};let rest=[];
 words.forEach(w=>{const kv=w.match(/^([^=]+)=(.+)$/);if(kv)extra[kv[1]]=T.decode(kv[2]);else rest.push(w);});
 let def=null,used=0;for(let n=Math.min(3,rest.length);n>0&&!def;n--){const k=plain(rest.slice(0,n).join(" "));if(SKILL_EFFECT[k]){def=SKILL_EFFECT[k];used=n;}}
 const e={type:def?def[0]:rest[0]};rest=rest.slice(def?used:1);
 if(e.type==="stat"&&rest.length){e.stat=STAT[plain(rest[0])]||rest[0];rest=rest.slice(1);}
 if(rest.length&&number(rest[0])!==undefined)e[def&&def[1]||"value"]=number(rest[0]);
 Object.keys(extra).forEach(k=>{const key=plain(k)==="probabilidad"?"chance":plain(k)==="valor"?"value":k;e[key]=extra[k];});
 return e;
};
const flag=v=>v===""||v===undefined?true:!/^(no|false|0)$/i.test(String(v).trim());

// Alias por tabla. Cada alias devuelve un "parche" que se fusiona con la fila.
const COMMON={
 nombre:v=>({name:String(v).trim()}),
 habilidades:v=>({skills:numbers(v)}),skills:v=>({skills:numbers(v)}),
 etiquetas:v=>({tags:list(v)}),tags:v=>({tags:list(v)}),
 afinidad:v=>({affinity:String(v).trim()}),
 precio:v=>({price:number(v)}),usos:v=>({uses:number(v)}),
 alcance:v=>{const r=numbers(String(v).replace(/\s*(-|a)\s*/g,","));return r.length>1?{minRange:r[0],maxRange:r[1]}:{minRange:r[0],maxRange:r[0]};}
};
const statTags=Object.fromEntries(Object.keys(STAT).map(k=>[k,v=>({stats:{[STAT[k]]:number(v)}})]));
const ALIASES={
 classes:Object.assign({},statTags,{
  stats:v=>({stats:statList(v)}),estadisticas:v=>({stats:statList(v)}),
  crecimientos:v=>({growth:statList(v)}),crecimiento:v=>({growth:statList(v)}),growth:v=>({growth:statList(v)}),
  tipo:v=>({moveType:MOVE[plain(v)]||plain(v)}),"tipo de movimiento":v=>({moveType:MOVE[plain(v)]||plain(v)}),
  armas:v=>{const types=list(v).map(weaponType);return {weaponTypes:types,ranks:Object.fromEntries(types.map(t=>[t,0]))};},
  promociona:v=>({promotions:numbers(v)}),promociones:v=>({promotions:numbers(v)}),
  "nivel promocion":v=>({promoteLevel:number(v)}),"nivel maximo":v=>({maxLevel:number(v)}),
  inventario:v=>({inventory:inventory(v)}),capacidad:v=>({capacity:number(v)}),
  "radio guardia":v=>({guardRadius:number(v)}),vision:v=>({vision:number(v)}),
  "bono promocion":v=>({promotionBonus:statList(v)}),seleccionable:v=>({selectable:flag(v)}),
  afinidad:COMMON.afinidad,habilidades:COMMON.habilidades,etiquetas:COMMON.etiquetas}),
 actors:Object.assign({},statTags,{
  stats:v=>({stats:statList(v)}),estadisticas:v=>({stats:statList(v)}),
  crecimientos:v=>({growth:statList(v)}),crecimiento:v=>({growth:statList(v)}),growth:v=>({growth:statList(v)}),
  color:v=>({color:String(v).trim()}),inventario:v=>({inventory:inventory(v)}),
  "frase de muerte":v=>({deathQuote:String(v).trim()}),"ultima frase":v=>({deathQuote:String(v).trim()}),
  grupo:v=>({group:String(v).trim()}),variante:v=>({variant:String(v).trim()}),
  afinidad:COMMON.afinidad,habilidades:COMMON.habilidades,etiquetas:COMMON.etiquetas}),
 weapons:Object.assign({},COMMON,{
  tipo:v=>({category:weaponType(v)}),categoria:v=>({category:weaponType(v)}),
  poder:v=>({might:number(v)}),mt:v=>({might:number(v)}),might:v=>({might:number(v)}),
  golpe:v=>({hit:number(v)}),precision:v=>({hit:number(v)}),hit:v=>({hit:number(v)}),
  critico:v=>({crit:number(v)}),crit:v=>({crit:number(v)}),peso:v=>({weight:number(v)}),weight:v=>({weight:number(v)}),
  rango:v=>({rank:number(v)}),"rango minimo":v=>({rank:number(v)}),
  magica:v=>({magic:flag(v)}),magico:v=>({magic:flag(v)}),golpes:v=>({hits:number(v)}),
  efectivo:v=>({effective:list(v).map(x=>MOVE[plain(x)]||plain(x))}),eficaz:v=>({effective:list(v).map(x=>MOVE[plain(x)]||plain(x))}),
  baston:v=>{const p=String(v||"").trim().split(/\s+/).filter(Boolean),eff=p.length?ITEM_EFFECT[plain(p[0])]||p[0]:"heal";const out={staff:true,effect:eff,might:0,category:"staff"};if(number(p[1])!==undefined)out.power=number(p[1]);return out;},
  hechizo:v=>({spell:plain(v)}),
  estado:v=>{const n=numbers(String(v).replace(/\s+/g,","));return {state:n[0],stateTurns:n[1]||2};}}),
 items:Object.assign({},COMMON,{
  efecto:v=>{const p=String(v).trim().split(/\s+/),out={effect:ITEM_EFFECT[plain(p[0])]||p[0]};if(out.effect==="boost"||out.effect==="growth"){if(p[1])out.stat=STAT[plain(p[1])]||p[1];if(number(p[2])!==undefined)out.power=number(p[2]);}else if(out.effect==="rank"){if(p[1])out.category=weaponType(p[1]);if(number(p[2])!==undefined)out.power=number(p[2]);}else if(out.effect==="promote"){if(number(p[1])!==undefined)out.classId=number(p[1]);}else if(number(p[1])!==undefined)out.power=number(p[1]);return out;},
  llave:v=>({effect:"key",key:KEY[plain(v||"todas")]||plain(v)}),
  accesorio:v=>({accessory:flag(v)}),ligado:v=>({bound:flag(v)}),credencial:v=>({secretCard:flag(v),bound:true}),
  turnos:v=>({turns:number(v)})}),
 skills:{efecto:v=>({effects:[effect(v)]}),efectos:v=>({effects:String(v).split(/[,;]/).map(effect)})},
 states:{efecto:v=>({effects:[effect(v)]}),efectos:v=>({effects:String(v).split(/[,;]/).map(effect)})}
};
T.noteAliases=ALIASES;

// Fusiona un parche: arrays de efectos se acumulan, stats/crecimientos se mezclan campo a campo.
const mergeInto=(target,patch)=>{Object.keys(patch).forEach(k=>{const v=patch[k];if(v===undefined)return;
 if(isMerge(k)||k==="promotionBonus"||k==="ranks")target[k]=Object.assign({},target[k],v);
 else if(k==="effects")target[k]=(target[k]||[]).concat(v);else target[k]=v;});return target;};

// Una entrada "clave: valor". Primero busca un alias de la tabla; si no, usa la clave tal cual (inglés del motor).
// Fuera del bloque <Tactics> solo se aceptan alias conocidos: las etiquetas de otros plugins se ignoran.
const entry=(table,rawKey,rawValue,patch,where,aliasOnly)=>{
 const aliases=ALIASES[table]||{},k=plain(rawKey),fn=Object.prototype.hasOwnProperty.call(aliases,k)&&aliases[k];
 if(fn){mergeInto(patch,fn(rawValue===undefined?"":rawValue));return true;}
 if(aliasOnly)return false;
 if(/^[a-z][a-zA-Z0-9]*$/.test(String(rawKey).trim())&&rawValue!==undefined){const v=String(rawValue).trim(),key=String(rawKey).trim();mergeInto(patch,{[key]:/^[[{"]/.test(v)?JSON.parse(v):T.decode(v)});return true;}
 return false;
};

// Devuelve {json, simple}: json se aplica como antes (Object.assign), simple se fusiona encima.
T.parseNote=function(text,table,where){
 const note=String(text||""),simple={};let json={};
 const block=note.match(/<Tactics>([\s\S]*?)<\/Tactics>/i);
 if(block){const body=block[1].trim();
  if(!body||body[0]==="{"){try{json=body?JSON.parse(body):{};}catch(error){throw new Error("F9: nota Tactics inválida en "+where+": "+error.message);}}
  else body.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")).forEach(line=>{const m=line.match(/^([^:=]+)[:=]\s*(.*)$/);
   try{T.assert(entry(table,m?m[1]:line,m?m[2]:"",simple,where),"línea no reconocida «"+line+"»");}catch(error){throw new Error("F9: nota Tactics inválida en "+where+": "+error.message);}});
 }
 const outside=note.replace(/<Tactics>[\s\S]*?<\/Tactics>/ig,"");
 outside.replace(/<([^<>/:]+?)(?::([^<>]*))?>/g,(all,k,v)=>{entry(table,k,v===undefined?"":v,simple,where,true);return all;});
 return {json,simple};
};

// Antes vivía en TacticsMZ.js. Igual que la versión 0.2.0 más las notas simplificadas.
T.readDatabase=function(data){
 const db={classes:{},actors:{},weapons:{},items:{},skills:{},states:{},terrain:T.copy(T.exampleDatabase?T.exampleDatabase.terrain:{0:{name:"Suelo",cost:1,color:"#667f60"}}),triangle:["blade","pole","axe"]};
 const rows=(name,fn)=>(data[name]||[]).filter(Boolean).forEach(row=>{const n=T.parseNote(row.note,name,row.id+" · "+row.name);fn(row,n.json,n.simple);});
 const build=(defaults,json,simple)=>mergeInto(Object.assign(defaults,json),simple);
 rows("classes",(c,n,x)=>{const param=i=>(c.params&&c.params[i]&&c.params[i][1])||0;const types=(c.traits||[]).filter(t=>t.code===51).map(t=>String(t.dataId));
  db.classes[c.id]=build({id:c.id,name:c.name,stats:{health:Math.max(1,param(0)),power:param(2),magic:param(4),skill:param(6),speed:param(6),luck:param(7),defense:param(3),resistance:param(5),move:5,build:6},growth:{health:60,power:35,magic:35,skill:40,speed:35,luck:30,defense:25,resistance:25},weaponTypes:types,ranks:Object.fromEntries(types.map(t=>[t,0])),skills:[],inventory:[],promotions:[],moveType:"foot",learn:(c.learnings||[]).map(l=>({level:l.level,skill:l.skillId}))},n,x);
  if(x.weaponTypes)db.classes[c.id].ranks=Object.assign(Object.fromEntries(x.weaponTypes.map(t=>[t,0])),n.ranks||{});
 });
 rows("actors",(a,n,x)=>{db.actors[a.id]=build({id:a.id,name:a.name,profile:a.profile||"",classId:a.classId,level:a.initialLevel,face:a.faceName?"img/faces/"+a.faceName+".png":"",faceIndex:a.faceIndex||0,characterIndex:a.characterIndex||0,graphic:a.characterName,inventory:a.equips&&a.equips[0]?[{kind:"weapon",id:a.equips[0]}]:undefined},n,x);});
 rows("weapons",(w,n,x)=>db.weapons[w.id]=build({id:w.id,name:w.name,description:w.description||"",iconIndex:w.iconIndex||0,category:String(w.wtypeId),might:(w.params||[])[2]||0,hit:85,crit:0,weight:5,minRange:1,maxRange:1,uses:35,price:w.price,rank:0},n,x));
 rows("items",(i,n,x)=>{const effect=(i.effects||[]).find(e=>e.code===11);db.items[i.id]=build({id:i.id,name:i.name,description:i.description||"",iconIndex:i.iconIndex||0,effect:effect?"heal":"passive",power:effect?effect.value2:0,healPercent:effect?effect.value1:0,uses:i.consumable?1:0,price:i.price},n,x);});
 rows("skills",(s,n,x)=>db.skills[s.id]=build({id:s.id,name:s.name,description:s.description||"",iconIndex:s.iconIndex||0,effects:[]},n,x));
 rows("states",(s,n,x)=>db.states[s.id]=build({id:s.id,name:s.name,description:s.description||"",iconIndex:s.iconIndex||0,effects:[]},n,x));
 return db;
};
if(typeof module!=="undefined"&&module.exports)module.exports=T;
})(typeof globalThis!=="undefined"?globalThis:this);
