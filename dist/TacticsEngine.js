/* TacticsMZ v0.3.0 | Copyright (c) 2026 TacticsMZ contributors | MIT License */
/* Archivo generado por tools/build.js desde src/. No lo edites a mano. */
/*:
 * @target MZ
 * @plugindesc v0.3.0 TacticsMZ · Núcleo: reglas, comandos, notas F9 y comandos rápidos.
 * @author TacticsMZ contributors
 * @url https://opensource.org/license/mit
 * @orderBefore TacticsUI
 * @orderBefore TacticsMZ
 * @help
 * Librería núcleo de TacticsMZ. No tiene comandos propios: los muestra TacticsMZ.
 * Orden: TacticsEngine, TacticsUI, TacticsMZ.
 * Sustituye a TacticsSystem, TacticsCommands, TacticsRules y TacticsData.
 */
(function(root){if(root.Tactics&&root.Tactics.Engine)throw new Error("TacticsEngine: hay plugins antiguos de TacticsMZ activos (TacticsSystem, TacticsCommands, TacticsRules, TacticsView, TacticsGraphics, TacticsPresentation, TacticsScenes, TacticsData). Desactívalos: TacticsEngine los sustituye.");})(typeof globalThis!=="undefined"?globalThis:this);
// ===== src/core/01_System.js =====
(function(root) {
"use strict";
const T = root.Tactics = root.Tactics || {};
T.version = "0.3.0";
const copy = T.copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const clamp = T.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = T.distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const key = T.key = (x, y) => x + "," + y;
const stats = T.stats = ["health", "power", "magic", "skill", "speed", "luck", "defense", "resistance", "move", "build"];
const baseStats = {health:24, power:6, magic:2, skill:7, speed:7, luck:4, defense:4, resistance:2, move:5, build:6};
const fail = message => { throw new Error(message); };
T.assert = (test, message) => { if (!test) fail(message); };
const living = u => u && u.hp > 0 && !u.removed;
const campaignFields = ["name","classId","stats","growth","growthBank","level","exp","skills","ranks","inventory","equipped","color","colors","customColors","graphic","face","faceKey","faceIndex","characterIndex","variant","profile","affinity","tags","deathQuote","group"];
T.alive = living;
class Engine {
 constructor(database, mission, snapshot, campaign) {
  this.db = copy(database);
  if (snapshot) {
   T.assert(snapshot.version === 1, "Formato de guardado no compatible");
   this.s = copy(snapshot);
   this.s.roster=this.s.roster||{};this.s.nextRosterId=this.s.nextRosterId||1;
   Object.assign(this.db.classes,this.s.customClasses||{});
  } else {
   const m = copy(mission);
   T.assert(m && m.width > 0 && m.height > 0, "Misión sin dimensiones");
   this.s = {version:1, map:m, seed:m.seed || 61927, units:[], turn:1, team:1,
    teams:m.teams || [1,2,3], gold:m.gold || 0, convoy:[], pendingItems:[],
    flags:{}, vars:{}, self:{}, done:{}, queue:[], presentations:[], log:[],
    objective:m.objective || "eliminate", protectedIds:m.protectedIds || [],
    result:null, phasePending:null, roster:{}, selected:null, moveOrigin:null,
    nextId:1000, nextRosterId:1, lastSpawn:null, supports:{}, options:Object.assign({inventory:6, convoy:100,
     doubleSpeed:4, critical:3, twoRolls:false, supportCap:5, singleTopRank:false},m.options),
    fog:m.fog || 0, camera:{x:0,y:0}, tone:null, teamNames:{1:"Aliados",2:"Enemigos",3:"Independientes"}};
   if(campaign){
    ["gold","convoy","pendingItems","roster","flags","vars","supports","customClasses","creatorDone","seed","nextRosterId"].forEach(k=>{if(campaign[k]!==undefined)this.s[k]=copy(campaign[k]);});
    this.s.options=Object.assign(this.s.options,copy(campaign.options||{}),m.options||{});Object.assign(this.db.classes,this.s.customClasses||{});
   }
   (m.units || []).forEach(d => this.spawn(d));
   if(campaign&&m.deployment==="all")this.deployRoster();
   (m.conversations||[]).forEach(c=>{const u=this.unit(c.second);if(c.recruit&&u&&u.team===1&&this.s.roster[u.rosterKey||u.actorId])c.used=true;});
   if(m.deployment==="prepare")this.prepareDeployment();else{this.signal("start");this.signal("turnStart");}
  }
 }
 save() { this.rememberParty();return copy(this.s); }
 rememberParty() {
  this.s.units.forEach(u=>{
   if(u.team!==1||u.temporary)return;
   if(!u.rosterKey){if(u.actorId)u.rosterKey=String(u.actorId);else{do{u.rosterKey="unit:"+this.s.nextRosterId++;}while(this.s.roster[u.rosterKey]);}}
   this.s.roster[u.rosterKey]=copy(u);
  });
 }
 deployRoster() {
  const leader=this.unit(this.s.map.leader)||this.s.units.find(u=>u.team===1&&living(u)),x=leader?leader.x:0,y=leader?leader.y:0;
  Object.keys(this.s.roster).forEach(key=>{const member=this.s.roster[key];if(member.hp<=0||this.s.units.some(u=>u.rosterKey===key||member.actorId&&u.actorId===member.actorId))return;
   this.spawn({actorId:member.actorId,classId:member.classId,rosterKey:key,team:1,x,y});
  });
 }
 deploymentMember(key) {return this.s.units.find(u=>u.team===1&&u.rosterKey===String(key));}
 deploymentRequired(u) {return u&&[this.s.map.leader].concat(this.s.protectedIds||[]).indexOf(u.id)>=0;}
 deployMember(key,x,y) {
  const member=this.s.roster[key];T.assert(member&&member.hp>0,"Recluta no disponible");
  const placed=(this.s.map.units||[]).find(d=>member.actorId&&Number(d.actorId)===member.actorId);
  return this.spawn(Object.assign({},placed||{},{id:placed?placed.id:0,actorId:member.actorId,classId:member.classId,team:1,rosterKey:String(key),x,y}));
 }
 prepareDeployment() {
  const slots=copy(this.s.map.deployments||[]);T.assert(slots.length,"Añade casillas con el comando Casilla de despliegue");
  const seen=new Set();slots.forEach(p=>{T.assert(this.inside(p.x,p.y),"Casilla de despliegue fuera del mapa");T.assert(!seen.has(key(p.x,p.y)),"Casilla de despliegue repetida");seen.add(key(p.x,p.y));});
  this.rememberParty();const allies=this.s.units.filter(u=>u.team===1),required=allies.filter(u=>this.deploymentRequired(u)).map(u=>u.rosterKey);
  this.s.preparation={slots,required,selectedKey:required[0]||allies[0]&&allies[0].rosterKey||null};
  this.s.units=this.s.units.filter(u=>u.team!==1);
  const order=required.concat(Object.keys(this.s.roster).filter(k=>required.indexOf(k)<0));
  order.forEach(k=>{const member=this.s.roster[k];if(member.hp<=0)return;const slot=slots.find(p=>!this.at(p.x,p.y)&&Number.isFinite(this.moveCost(member,p.x,p.y)));if(slot)this.deployMember(k,slot.x,slot.y);});
  T.assert(required.every(k=>this.deploymentMember(k)),"Faltan casillas transitables para los personajes obligatorios");
 }
 setDeployment(memberKey,slotIndex) {
  const p=this.s.preparation;T.assert(p,"No estás en preparación");const k=String(memberKey),member=this.s.roster[k],slot=p.slots[slotIndex];
  T.assert(member&&member.hp>0,"Recluta no disponible");T.assert(Number.isInteger(slotIndex)&&slot,"Casilla de despliegue inválida");
  const u=this.deploymentMember(k),target=this.at(slot.x,slot.y);T.assert(!target||target.team===1,"La casilla está ocupada por otra unidad");
  T.assert(Number.isFinite(this.moveCost(member,slot.x,slot.y)),"La clase no puede desplegarse en ese terreno");
  if(u&&target===u)return;
  if(target&&u)T.assert(Number.isFinite(this.moveCost(target,u.x,u.y)),"La otra unidad no puede ocupar la casilla de origen");
  if(target&&!u)T.assert(p.required.indexOf(target.rosterKey)<0,"El protagonista o personaje protegido debe participar");
  this.rememberParty();
  if(u){if(target){target.x=u.x;target.y=u.y;}u.x=slot.x;u.y=slot.y;}
  else{if(target)this.s.units=this.s.units.filter(v=>v!==target);this.deployMember(k,slot.x,slot.y);}
  p.selectedKey=k;
 }
 reserveMember(memberKey) {
  const p=this.s.preparation,k=String(memberKey);T.assert(p,"No estás en preparación");T.assert(p.required.indexOf(k)<0,"El protagonista o personaje protegido debe participar");
  const u=this.deploymentMember(k);T.assert(u,"El personaje ya está en reserva");this.rememberParty();this.s.units=this.s.units.filter(v=>v!==u);
 }
 beginMission() {
  const p=this.s.preparation;T.assert(p,"La misión ya comenzó");T.assert(p.required.every(k=>this.deploymentMember(k)),"Debes desplegar los personajes obligatorios");
  const allies=this.s.units.filter(u=>u.team===1&&living(u));T.assert(allies.length,"Despliega al menos un aliado");
  T.assert(allies.every(u=>p.slots.some(p=>p.x===u.x&&p.y===u.y)),"Todos los aliados deben estar en una casilla de despliegue");
  this.rememberParty();this.s.preparation=null;this.s.selected=null;this.signal("start");this.signal("turnStart");
 }
 random() { let x = this.s.seed | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s.seed = x >>> 0; return this.s.seed / 4294967296; }
 roll(chance) { return this.random() * 100 < clamp(chance,0,100); }
 unit(id) { return this.s.units.find(u => u.id === Number(id)); }
 cls(u) { return this.db.classes[u.classId] || {}; }
 allies(a,b) { return !!(a&&b&&(a.team === b.team || (a.team !== 2 && b.team !== 2))); }
 inside(x,y) { return Number.isInteger(x)&&Number.isInteger(y)&&x>=0 && y>=0 && x<this.s.map.width && y<this.s.map.height; }
 at(x,y) { return this.s.units.find(u => living(u) && !u.carrier && u.x===x && u.y===y); }
 terrain(x,y) {
  const id = (this.s.map.tiles || [])[y*this.s.map.width+x] || 0;
  return Object.assign({name:"Llanura",cost:1,defense:0,avoid:0,heal:0,color:"#667950"},this.db.terrain[id]);
 }
 skillIds(u) {
  const ids=(u.skills||[]).slice();
  (u.inventory||[]).forEach((item,index)=>{const d=this.itemData(item);if(!d||d.uses>0&&item.uses<=0)return;if(item.kind==='weapon'?index===u.equipped&&this.canEquip(u,item):d.accessory)(d.skills||[]).forEach(id=>{if(ids.indexOf(id)<0)ids.push(id);});});
  return ids;
 }
 effects(u,type) {
  const effects = [];
  this.skillIds(u).forEach(id => { const sk = this.db.skills[id]; if(sk) effects.push.apply(effects, sk.effects || []); });
  (u.states || []).forEach(s => { const st = this.db.states[s.id]; if(st) effects.push.apply(effects,st.effects || []); });
  return type ? effects.filter(e => e.type === type) : effects;
 }
 has(u,type) { return this.effects(u,type).length > 0; }
 value(u,stat) {
  let n = Number(u.stats[stat]) || 0;
  this.effects(u,"stat").forEach(e => { if(e.stat===stat) n += Number(e.value)||0; });
  if(u.passenger && !this.has(u,"cover") && (stat === "speed" || stat === "skill")) n = Math.floor(n/2);
  return Math.max(stat === "health" ? 1 : 0,n);
 }
 item(kind,id,uses) {
  const table = kind === "weapon" ? this.db.weapons : this.db.items, data = table[Number(id)];
  T.assert(data,"Arma/objeto inexistente: " + kind + " " + id);
  return {kind:kind,id:Number(id),uses:uses === undefined || Number(uses)<0 ? (data.uses || 0) : Number(uses)};
 }
 itemData(item) { return item ? (item.kind === "weapon" ? this.db.weapons : this.db.items)[item.id] : null; }
 protagonistInventory(u) {
  const cls=this.cls(u),actor=this.db.actors[u.actorId]||{},initial=actor.inventory||cls.inventory||[];
  let weapons=initial.filter(i=>i.kind==="weapon").map(i=>this.item(i.kind,i.id,i.uses)).filter(i=>this.canEquip(u,i));
  if(!weapons.length)weapons=(cls.inventory||[]).filter(i=>i.kind==="weapon").map(i=>this.item(i.kind,i.id,i.uses));
  return weapons.concat(initial.filter(i=>i.kind!=="weapon").map(i=>this.item(i.kind,i.id,i.uses)));
 }
 spawn(def) {
  const d = copy(def), rosterKey=d.rosterKey||(d.actorId?String(d.actorId):null),previous=rosterKey&&this.s.roster[rosterKey];
  this.s.lastSpawn=null;
  if(d.onlyRecruited&&!previous||previous&&previous.hp<=0)return null;
  const a = this.db.actors[d.actorId] || {}, c = this.db.classes[previous?previous.classId:d.classId || a.classId];
  T.assert(c,"Clase inexistente");
  const team=previous?1:Number(d.team)||1;
  T.assert(!(team===1&&d.actorId&&this.s.units.some(u=>u.actorId===Number(d.actorId)&&u.team===1&&!u.removed)),"El personaje de F9 "+d.actorId+" ya está desplegado");
  while(this.unit(this.s.nextId)||(this.s.map.events||[]).some(e=>e.id===this.s.nextId))this.s.nextId++;
  let id = Number(d.id) || this.s.nextId++;
  T.assert(!this.unit(id),"ID de unidad repetido: " + id);
  let p = this.nearest(d.x,d.y,c.moveType || "foot");
  this.s.lastSpawn = null;
  if(!p) return null;
  const u = {id,actorId:Number(d.actorId)||0,classId:c.id,name:d.name || a.name || c.name,
   team,x:p.x,y:p.y,rosterKey,stats:Object.assign({},baseStats,c.stats,a.stats,d.stats),
   level:1,exp:0,skills:Array.from(new Set((c.skills||[]).concat(a.skills||[],d.skills||[]))),
   states:[],ranks:Object.assign({},c.ranks,a.ranks,d.ranks),inventory:[],equipped:0,
   boss:!!d.boss,loot:!!d.loot,ai:d.ai || "approach",priority:Number(d.priority)||0,
   color:d.color || a.color || (d.team===2?"#d66b72":d.team===3?"#67ba99":"#61adcf"),
   colors:copy(d.colors || a.colors || {cloth:d.color || a.color || (d.team===2?"#d66b72":d.team===3?"#67ba99":"#61adcf"),hair:"#392d35",skin:"#dfb797"}),
   variant:d.variant||a.variant||'',profile:a.profile||'',affinity:d.affinity||a.affinity||c.affinity||'',tags:copy(d.tags||a.tags||[]),deathQuote:a.deathQuote||'',group:d.group||a.group||'',
   face:a.face || "",faceKey:a.faceKey||"",faceIndex:a.faceIndex||0,characterIndex:a.characterIndex||0, graphic:a.graphic || c.graphic || "", moved:0,acted:false,carrier:null,passenger:null,
   growth:Object.assign({},c.growth,a.growth,d.growth), growthBank:{}, supportTurns:{}};
  if(previous){campaignFields.forEach(k=>{if(previous[k]!==undefined)u[k]=copy(previous[k]);});}
  else{
   const profile=(c.buildProfiles||{})[d.buildProfile]||{};Object.assign(u.growth,profile.growth||{});Object.keys(profile.stats||{}).forEach(k=>{if(stats.indexOf(k)>=0)u.stats[k]+=Number(profile.stats[k])||0;});if(d.constitution>0)u.stats.build=d.constitution;
   const count = clamp(Number(d.level || a.level || 1),1,c.maxLevel || 20);u.hp=u.stats.health;
   for(let i=0;i<clamp(Number(d.preLevels)||0,0,100);i++){u.level=1;this.levelUp(u,false);}u.level=1;
   for(let i=1;i<count;i++)this.levelUp(u,false);
   u.exp=Number(d.exp)||0;
   const initial=copy(d.inventory || a.inventory || c.inventory || []);
   if(d.weaponId){const index=initial.findIndex(i=>i.kind==="weapon"),weapon={kind:"weapon",id:d.weaponId};if(index<0)initial.unshift(weapon);else initial[index]=weapon;}
   if(d.itemId)initial.push({kind:"item",id:d.itemId});
   initial.forEach(i=>u.inventory.push(Object.assign(this.item(i.kind,i.id,i.uses),i.drop?{drop:true}:{})));
  }
  u.hp=this.value(u,"health");this.s.units.push(u);this.s.lastSpawn=id;if(!previous)this.autoEquip(u);return u;
 }
 nearest(x,y,moveType) {
  const w=this.s.map.width,h=this.s.map.height;
  const bounds=this.s.map.bounds||{x:0,y:0,w,h};x=clamp(Math.round(Number(x)||0),bounds.x,bounds.x+bounds.w-1); y=clamp(Math.round(Number(y)||0),bounds.y,bounds.y+bounds.h-1);
  const q=[{x,y}],seen=new Set();
  while(q.length) { const p=q.shift(),k=key(p.x,p.y); if(seen.has(k)||!this.inside(p.x,p.y))continue; seen.add(k);
   const t=this.terrain(p.x,p.y),cost=t.costs && t.costs[moveType] !== undefined?t.costs[moveType]:t.cost;
   if(!this.at(p.x,p.y)&&cost>0)return p;
   [[1,0],[-1,0],[0,1],[0,-1]].forEach(v=>q.push({x:p.x+v[0],y:p.y+v[1]})); }
  return null;
 }
 moveCost(u,x,y) {
  if(!this.inside(x,y))return Infinity;
  const t=this.terrain(x,y),type=this.cls(u).moveType||"foot",cost=t.costs && t.costs[type] !== undefined?t.costs[type]:t.cost;
  return cost>0?cost:Infinity;
 }
 paths(u,budget) {
  const origin=key(u.x,u.y),costs={[origin]:0},previous={},open=[{x:u.x,y:u.y,c:0}];
  while(open.length){ open.sort((a,b)=>a.c-b.c); const p=open.shift(); if(p.c!==costs[key(p.x,p.y)])continue;
   [[1,0],[-1,0],[0,1],[0,-1]].forEach(v=>{
    const x=p.x+v[0],y=p.y+v[1],k=key(x,y),o=this.at(x,y);
    if(o&&!this.allies(u,o))return;
    const c=p.c+(this.stepCost?this.stepCost(u,p,{x,y}):this.moveCost(u,x,y));
    if(c>budget||!Number.isFinite(c)||costs[k]!==undefined&&costs[k]<=c)return;
    costs[k]=c; previous[k]=key(p.x,p.y); open.push({x,y,c});
   });
  }
  return {costs,previous,origin};
 }
 route(u,x,y,budget) {
  const p=this.paths(u,budget),k=key(x,y); if(p.costs[k]===undefined)return null;
  let cursor=k; const route=[];
  while(cursor!==p.origin){const xy=cursor.split(",").map(Number); route.unshift({x:xy[0],y:xy[1]}); cursor=p.previous[cursor];}
  return {path:route,cost:p.costs[k]};
 }
 selectionRange(u,currentPosition) {
  const result={move:[],attack:[]};
  if(!living(u)||u.carrier||u.acted||u.team!==this.s.team||this.s.result)return result;
  const paths=this.paths(u,currentPosition?0:this.movementBudget(u));
  Object.keys(paths.costs).forEach(k=>{const p=k.split(",").map(Number),occupant=this.at(p[0],p[1]);if(!occupant||occupant===u)result.move.push({x:p[0],y:p[1],cost:paths.costs[k]});});
  const weapon=this.weapon(u);if(!weapon||weapon.staff||u.canto||u.actionLock==="take")return result;
  const range=this.weaponRange(u,weapon),min=Math.max(1,range.min),max=Math.min(range.max,this.s.map.width+this.s.map.height-2),seen=new Set();
  result.move.forEach(origin=>{for(let dx=-max;dx<=max;dx++)for(let dy=-max;dy<=max;dy++){
   const distance=Math.abs(dx)+Math.abs(dy),x=origin.x+dx,y=origin.y+dy;if(distance<min||distance>max||!this.inside(x,y))continue;
   const occupant=this.at(x,y),k=key(x,y);if(seen.has(k)||occupant&&this.allies(u,occupant))continue;
   seen.add(k);result.attack.push({x,y});
  }});
  return result;
 }
 move(u,x,y,scripted) {
  T.assert(living(u)&&!u.carrier,"Unidad no disponible");
  const occupying=this.at(x,y); T.assert(!occupying||occupying===u,"Casilla ocupada");
  T.assert(scripted || (!u.acted&&u.team===this.s.team),"Unidad sin acción");
  const route=this.route(u,Number(x),Number(y),scripted?Infinity:this.movementBudget(u));
  T.assert(route,"Destino fuera del movimiento permitido");
  if(!scripted&&!this.s.moveOrigin)this.s.moveOrigin={id:u.id,x:u.x,y:u.y,moved:u.moved};
  const from={x:u.x,y:u.y}; u.x=Number(x);u.y=Number(y);if(!scripted)u.moved+=route.cost;
  this.present({type:"move",id:u.id,from,path:route.path,scripted:!!scripted});
  const queued=this.s.queue.length;this.signal("enter",{unit:u.id,x:u.x,y:u.y,region:(this.s.map.regions||[])[u.y*this.s.map.width+u.x]||0});
  if(!scripted&&this.s.queue.length>queued)this.commit(u);
  return route;
 }
 undoMove(u) {const o=this.s.moveOrigin;T.assert(o&&o.id===u.id&&!u.committed,"El movimiento ya está confirmado"); u.x=o.x;u.y=o.y;u.moved=o.moved;this.s.moveOrigin=null;}
 commit(u) {u.committed=true;this.s.moveOrigin=null;}
 movementBudget(u) {return u.moveLocked?0:Math.max(0,this.value(u,"move")-u.moved);}
 finishAction(u,kind) {
  this.commit(u);
  const full=this.has(u,"cantoCombat"),utility=this.has(u,"canto")||this.cls(u).moveType==="mounted";
  u.canto=!u.moveLocked&&(full||utility&&kind!=="combat"&&kind!=="staff") && u.moved<this.value(u,"move");
  u.actionLock=null;u.moveLocked=false;
  u.acted=!u.canto; this.checkObjective();
 }
 waitUnit(u) {this.commit(u);u.canto=false;u.acted=true;u.actionLock=null;u.moveLocked=false;}
 canEquip(u,item) {
  const w=this.itemData(item); if(!w||item.kind!=="weapon"||w.uses>0&&item.uses<=0)return false;
  const types=this.cls(u).weaponTypes || []; if(types.indexOf(w.category)<0)return false;
  if(w.actors&&w.actors.length&&w.actors.indexOf(u.actorId)<0)return false;
  if(w.classes&&w.classes.length&&w.classes.indexOf(u.classId)<0)return false;
  const tags=(this.cls(u).tags||[]).concat(u.tags||[]);if(w.tagsRequired&&w.tagsRequired.some(tag=>tags.indexOf(tag)<0))return false;
  if((w.categories||[]).some(type=>types.indexOf(type)<0))return false;
  if(Object.keys(w.requiredRanks||{}).some(type=>(u.ranks[type]||0)<w.requiredRanks[type]))return false;
  return (u.ranks[w.category]||0)>=(w.rank||0);
 }
 autoEquip(u) { if(!this.canEquip(u,u.inventory[u.equipped])) u.equipped=u.inventory.findIndex(i=>this.canEquip(u,i)); }
 weapon(u) {const i=u&&u.inventory&&u.inventory[u.equipped];return i&&this.canEquip(u,i)?this.itemData(i):null;}
 weaponRange(u,w) {if(!w)return {min:0,max:0};const min=Math.max(0,Number(w.minRange===undefined?1:w.minRange)||0),dynamic=w.rangeStat&&stats.indexOf(w.rangeStat)>=0?Math.floor(this.value(u,w.rangeStat)*(w.rangeFactor===undefined?.5:w.rangeFactor))+(w.rangeBonus||0):Number(w.maxRange===undefined?1:w.maxRange);return {min,max:Math.max(min,Math.min(99,Number.isFinite(dynamic)?dynamic:min))};}
 reach(u,target,w) {const r=this.weaponRange(u,w);return !!w&&dist(u,target)>=r.min&&dist(u,target)<=r.max;}
 supportBonus(u) {
  let n=0;this.s.units.forEach(v=>{if(v!==u&&living(v)&&!v.carrier&&this.allies(u,v)&&dist(u,v)<=3){n+=this.s.supports[this.bondKey(u,v)]||0;}});return n;
 }
 supportStats(u) {
  const result={attack:0,defense:0,hit:0,avoid:0,crit:0,dodge:0},table=Object.assign({},this.db.affinities,this.s.affinities);
  this.s.units.forEach(v=>{const rank=this.s.supports[this.bondKey(u,v)]||0;if(v===u||!living(v)||v.carrier||!this.allies(u,v)||dist(u,v)>3||!rank)return;const a=table[u.affinity],b=table[v.affinity];if(!a&&!b){result.attack+=rank;result.hit+=rank*5;}else Object.keys(result).forEach(k=>result[k]+=((a&&a[k]||0)+(b&&b[k]||0))*rank);});
  Object.keys(result).forEach(k=>result[k]=Math.floor(result[k]));return result;
 }
 counterForecast(defender,attacker,weapon,attackingWeapon) {const w=attackingWeapon||this.weapon(attacker);return w&&w.noCounter?{can:false,damage:0,hit:0,crit:0,strikes:0}:this.forecast(defender,attacker,weapon,attackingWeapon);}
 speed(u,w) {return Math.max(0,this.value(u,"speed")-Math.max(0,(w? w.weight||0:0)-this.value(u,"build")));}
 triangle(a,b) {
  if(!a||!b)return 0;const cycle=this.db.triangle||["blade","pole","axe"],i=cycle.indexOf(a.category),j=cycle.indexOf(b.category);
  if(i<0||j<0||i===j)return 0;let n=(i+1)%cycle.length===j?-1:1; if(a.reverse||b.reverse)n*=-1;return n;
 }
 forecast(a,b,wa,wb) {
  wa=wa||this.weapon(a);wb=wb||this.weapon(b);
  if(!wa||wa.staff||!this.reach(a,b,wa))return {damage:0,hit:0,crit:0,strikes:0,can:false};
  const c=this.cls(b),t=this.terrain(b.x,b.y),edge=this.triangle(wa,wb),tags=[c.moveType].concat(c.tags||[],b.tags||[]),matched=(wa.effective||[]).filter(tag=>tags.indexOf(tag)>=0),bonusA=this.supportStats(a),bonusB=this.supportStats(b);
  const multiplier=matched.length?Math.max(0,...matched.map(tag=>(c.effectiveness||{})[tag]===undefined?(wa.effectiveMultiplier||3):c.effectiveness[tag])):1;
  const attack=this.value(a,wa.magic?"magic":"power")+(wa.might||0)*multiplier+edge+bonusA.attack;
  let defense=this.value(b,wa.magic?"resistance":"defense")+(c.ignoreTerrainDefense?0:t.defense||0)+bonusB.defense;
  const hit=clamp((wa.hit===undefined?85:wa.hit)+2*this.value(a,"skill")+Math.floor(this.value(a,"luck")/2)+edge*15+bonusA.hit-2*this.speed(b,wb)-this.value(b,"luck")-(c.ignoreTerrainAvoid?0:t.avoid||0)-bonusB.avoid,0,100);
  const crit=this.has(b,"critGuard")?0:clamp((wa.crit||0)+Math.floor(this.value(a,"skill")/2)-this.value(b,"luck")+bonusA.crit-bonusB.dodge,0,100);
  return {can:true,damage:Math.max(0,attack-defense),attack,defense,hit,crit,strikes:(wa.hits||1)*(this.speed(a,wa)-this.speed(b,wb)>=this.s.options.doubleSpeed?2:1)};
 }
 consume(u,index,deferEquip) {
  const i=u.inventory[index],d=this.itemData(i);if(!d)return;
  if(d.uses>0){i.uses--;if(i.uses<=0){u.inventory.splice(index,1);u.equipped=-1;}}
  if(!deferEquip)this.autoEquip(u);
 }
 combat(a,b,consumeAction) {
  T.assert(living(a)&&living(b)&&!a.carrier&&!b.carrier&&!this.allies(a,b),"Combate inválido");
  T.assert(this.forecast(a,b).can,"El objetivo no está al alcance de un arma ofensiva");
  const start={[a.id]:a.hp,[b.id]:b.hp},strikes=[];
  const fa=this.forecast(a,b),fb=this.counterForecast(b,a),order=[];this._afterCombat=[];
  const opening=this.has(b,"firstStrike")&&b.hp<=this.value(b,"health")/2&&fb.can&&!this.has(a,"negateSkills");
  const group=(u,v)=>{const w=this.weapon(u);for(let i=0;i<(w?w.hits||1:0);i++)order.push([u,v]);};
  if(opening)group(b,a);group(a,b);if(!opening&&fb.can)group(b,a);
  if(fa.strikes>(this.weapon(a).hits||1))group(a,b);
  if(fb.can&&fb.strikes>(this.weapon(b).hits||1))group(b,a);
  for(let i=0;i<order.length&&i<24;i++){
   const u=order[i][0],v=order[i][1];if(!living(u)||!living(v))continue;
   const w=this.weapon(u),f=this.forecast(u,v);if(!f.can)continue;
   const enabled=!this.has(v,"negateSkills"),guard=!this.has(u,"negateSkills");
   const proc=type=>enabled&&this.effects(u,type).some(e=>this.roll(e.chance===undefined?this.value(u,"skill"):e.chance));
   let attack=f.attack,defense=f.defense,multiplier=1,heal=0,label="";
   if(proc("ignoreDefense")){defense=0;label="Penetración";}
   else if(proc("halfDefense")){defense=Math.floor(defense/2);label="Ruptura";}
   if(proc("injuredPower"))attack+=Math.floor((this.value(u,"health")-u.hp)/2);
   const drain=proc("drain")||w.drain;
   if(proc("extraStrike")&&order.length<24){order.splice(i+1,0,[u,v]);label="Ráfaga";}
   const hit=this.s.options.twoRolls?(this.random()+this.random())*50<f.hit:this.roll(f.hit);
   const critical=hit&&this.roll(f.crit);if(critical)multiplier=this.s.options.critical;
   let damage=hit?Math.max(0,attack-defense)*multiplier:0;
   if(guard)this.effects(v,"reduceDamage").forEach(e=>{if(this.roll(e.chance===undefined?100:e.chance))damage=Math.floor(damage*(1-clamp(e.value||0.5,0,1)));});
   if(hit&&proc("finisher")&&!v.boss)damage=v.hp;
   const curse=hit&&w.curse&&this.roll(typeof w.curse==='number'?w.curse:Math.max(0,(w.curse.base||31)-this.value(u,'luck'))),victim=curse?u:v;if(curse)label='Retroceso maldito';
   damage=Math.min(victim.hp,damage);victim.hp-=damage;if(drain&&!curse){heal=Math.min(this.value(u,"health")-u.hp,damage);u.hp+=heal;}
   if(hit&&!curse&&w.state)this.applyState(v,w.state,w.stateTurns||3);if(hit&&!curse&&w.removeStates)v.states=v.states.filter(s=>w.removeStates.indexOf(s.id)<0);
   strikes.push({attacker:u.id,target:victim.id,intendedTarget:v.id,damage,heal,critical,hit,label,hp:victim.hp,attackerHp:u.hp,weapon:w.name,weaponId:w.id,spell:w.spell||null,weaponCategory:w.category,magic:!!w.magic,distance:dist(u,v)});
   const cancelled=hit&&proc("cancelReply");this.rank(u,w.category,w.wexp===undefined?1+(hit?1:0):Math.max(0,w.wexp));this.consume(u,u.equipped,true);
   if(cancelled){for(let j=order.length-1;j>i;j--)if(order[j][0]===v)order.splice(j,1);}
   if(!living(v))this.defeat(v,u);
   if(!living(u))this.defeat(u,v);
  }
  this.autoEquip(a);this.autoEquip(b);
  this.present({type:"combat",a:a.id,b:b.id,start,strikes});const after=this._afterCombat;this._afterCombat=null;
  if(a.team===1&&living(a))this.experience(a,living(b)?10:30+Math.max(0,b.level-a.level)*3);
  if(b.team===1&&living(b))this.experience(b,living(a)?5:30);
  (after||[]).forEach(p=>this.present(p));
  if(consumeAction!==false)this.finishAction(a,"combat");
  this.checkObjective();return strikes;
 }
 defeat(u,killer) {
  if(u.defeatHandled)return;u.hp=0;u.defeatHandled=true;
  if(u.passenger){const p=this.unit(u.passenger);p.carrier=null;p.x=u.x;p.y=u.y;p.acted=true;u.passenger=null;}
  if(killer){const drops=u.inventory.filter(i=>u.loot||i.drop);u.inventory=u.inventory.filter(i=>!u.loot&&!i.drop);drops.forEach(i=>this.give(killer,i));}
  if(u.deathQuote){const p={type:'dialogue',unit:u.id,name:u.name,text:u.deathQuote};if(this._afterCombat)this._afterCombat.push(p);else this.present(p);}
  this.signal("unitDefeated",{unit:u.id,killer:killer?killer.id:0});
 }
 levelUp(u,show) {
  const c=this.cls(u); if(u.level>=(c.maxLevel||20))return;
  u.level++;const gains={};
  stats.forEach(stat=>{let g=Number(u.growth[stat])||0;this.effects(u,"growth").forEach(e=>{if(e.stat===stat)g+=e.value;});
   let inc=Math.floor(g/100);if(this.s.options.fixedGrowth){u.growthBank[stat]=(u.growthBank[stat]||0)+g%100;if(u.growthBank[stat]>=100){inc++;u.growthBank[stat]-=100;}}
   else if(this.roll(g%100))inc++;
   const old=u.stats[stat];u.stats[stat]=Math.min((c.caps||{})[stat]|| (stat==="health"?80:40),old+inc);gains[stat]=u.stats[stat]-old;
  });
  (c.learn||[]).filter(x=>x.level===u.level).forEach(x=>{if(u.skills.indexOf(x.skill)<0)u.skills.push(x.skill);});
  u.hp=Math.min(this.value(u,"health"),u.hp+(gains.health||0));
  if(show){this.notice(u.name+" alcanza nivel "+u.level);if(this.s.options.showProgress)this.present({type:'level',unit:u.id,level:u.level,gains:copy(gains)});}
 }
 experience(u,amount) {const before=u.exp,gained=Math.max(0,Number(amount)||0);if(this.s.options.showProgress&&gained&&u.level<(this.cls(u).maxLevel||20))this.present({type:'experience',unit:u.id,from:before,amount:gained});u.exp+=gained;while(u.exp>=100&&u.level<(this.cls(u).maxLevel||20)){u.exp-=100;this.levelUp(u,true);}if(u.level>=(this.cls(u).maxLevel||20))u.exp=0;}
 rank(u,category,amount,set) {
  const cap=(this.cls(u).rankCaps||{})[category]||300;
  let v=clamp(set?amount:(u.ranks[category]||0)+amount,0,cap);
  if(this.s.options.singleTopRank&&v>=250&&Object.keys(u.ranks).some(k=>k!==category&&u.ranks[k]>=250))v=249;
  u.ranks[category]=v;
 }
 promote(u,classId,ignoreLevel) {
  const c=this.cls(u),next=this.db.classes[classId];T.assert(next&&(c.promotions||[]).indexOf(Number(classId))>=0,"Promoción no compatible");
  T.assert(ignoreLevel||u.level>=(c.promoteLevel||10),"Nivel insuficiente");
  const before=copy(u.stats);u.classId=Number(classId);u.level=1;u.exp=0;
  stats.forEach(k=>{u.stats[k]=Math.min((next.caps||{})[k]||80,u.stats[k]+((next.promotionBonus||{})[k]||0));});
  u.skills=Array.from(new Set(u.skills.concat(next.skills||[])));Object.keys(next.ranks||{}).forEach(k=>{u.ranks[k]=Math.max(u.ranks[k]||0,next.ranks[k]);});
  u.growth=Object.assign({},u.growth,next.growth);u.hp=this.value(u,"health");this.autoEquip(u);this.notice(u.name+": "+next.name);
  if(this.s.options.showProgress)this.present({type:'promotion',unit:u.id,oldClass:c.name,newClass:next.name,gains:Object.fromEntries(stats.map(k=>[k,u.stats[k]-before[k]]))});
 }
 give(u,item) {
  const i=copy(item);if(u&&u.inventory.length<this.s.options.inventory){u.inventory.push(i);this.autoEquip(u);return "unit";}
  if(this.s.convoy.length<this.s.options.convoy){this.s.convoy.push(i);return "convoy";}
  this.s.pendingItems.push(i);this.notice("Inventario y almacén llenos: objeto retenido en entregas pendientes");return "pending";
 }
 trade(a,b,ia,ib) {
  T.assert(living(a)&&living(b)&&!a.carrier&&!b.carrier&&a!==b&&this.allies(a,b)&&dist(a,b)<=1,"Intercambio requiere aliados adyacentes");
  T.assert(Number.isInteger(ia)&&Number.isInteger(ib)&&ia>=0&&ib>=0&&ia<=a.inventory.length&&ib<=b.inventory.length,"Posición de inventario inválida");
  const x=a.inventory[ia],y=b.inventory[ib];T.assert(x||y,"No hay objeto");
  T.assert(x||a.inventory.length<this.s.options.inventory,"Inventario lleno");T.assert(y||b.inventory.length<this.s.options.inventory,"Inventario lleno");
  if(x)a.inventory.splice(ia,1);if(y)b.inventory.splice(ib,1);if(y)a.inventory.splice(Math.min(ia,a.inventory.length),0,y);if(x)b.inventory.splice(Math.min(ib,b.inventory.length),0,x);
  this.autoEquip(a);this.autoEquip(b);this.commit(a);
 }
 steal(a,b,slot) {
  T.assert(living(a)&&living(b)&&!a.carrier&&!b.carrier&&Number.isInteger(slot)&&slot>=0,"No se puede robar");
  const i=b.inventory[slot],d=this.itemData(i);T.assert(this.has(a,"steal")&&living(b)&&!this.allies(a,b)&&dist(a,b)===1,"No se puede robar");
  T.assert(i&&i.kind==="item"&&!d.bound&&this.value(a,"speed")>this.value(b,"speed")&&a.inventory.length<this.s.options.inventory,"Objeto protegido, velocidad o espacio insuficiente");
  a.inventory.push(b.inventory.splice(slot,1)[0]);this.finishAction(a,"steal");
 }
 convoy(u,slot,deposit) {
  const from=deposit?u.inventory:this.s.convoy,to=deposit?this.s.convoy:u.inventory,cap=deposit?this.s.options.convoy:this.s.options.inventory;
  T.assert(from[slot]&&to.length<cap,"Posición inválida o destino lleno");to.push(from.splice(slot,1)[0]);this.autoEquip(u);this.commit(u);
 }
 bondKey(a,b) {return [a.actorId?"a"+a.actorId:"u"+a.id,b.actorId?"a"+b.actorId:"u"+b.id].sort().join(":");}
 support(a,b) {
  T.assert(living(a)&&living(b)&&!a.carrier&&!b.carrier&&a.actorId&&b.actorId&&a!==b&&this.allies(a,b)&&dist(a,b)<=3,"Apoyo requiere personajes aliados cercanos");
  const k=this.bondKey(a,b),v=this.s.supports[k]||0;
  T.assert(v<3,"Apoyo completo");
  const total=u=>Object.keys(this.s.supports).filter(k=>k.split(":").indexOf(u.actorId?"a"+u.actorId:"u"+u.id)>=0).reduce((n,k)=>n+this.s.supports[k],0);
  T.assert(total(a)<this.s.options.supportCap&&total(b)<this.s.options.supportCap,"Límite de apoyos");
  T.assert(a.supportTurns[k]!==this.s.turn,"Ya conversaron este turno");this.s.supports[k]=v+1;a.supportTurns[k]=this.s.turn;this.commit(a);
 }
 rescueError(a,b,mode,x,y) {
  if(!living(a)||a.carrier)return "Unidad no disponible";
  if(mode==="drop"){
   const p=this.unit(a.passenger);
   return living(p)&&dist(a,{x,y})===1&&!this.at(x,y)&&Number.isFinite(this.moveCost(p,x,y))?null:"No se puede soltar ahí";
  }
  if(["rescue","give","take","cover"].indexOf(mode)<0)return "Operación de rescate inválida";
  if(!living(b)||a===b||!this.allies(a,b)||dist(a,b)!==1||b.carrier)return "Rescate requiere aliados adyacentes";
  if(mode==="give"&&a.team!==b.team)return "Entregar requiere el mismo equipo";
  if(mode==="cover"&&(!this.has(a,"cover")||!Number.isFinite(this.moveCost(a,b.x,b.y))))return "No puedes cubrir a esa unidad";
  const p=mode==="give"?this.unit(a.passenger):mode==="take"?this.unit(b.passenger):b,to=mode==="give"?b:a;
  return living(p)&&!p.passenger&&!to.passenger&&(this.cls(to).capacity||this.value(to,"build")+4)>=this.value(p,"build")?null:"Capacidad insuficiente";
 }
 conversationTargets(a) {
  if(!living(a)||a.carrier||a.acted||a.canto||a.actionLock==="take"||a.team!==this.s.team||this.s.result||this.s.preparation)return [];
  const conversations=this.s.map.conversations||[];
  return this.s.units.filter(b=>b!==a&&living(b)&&!b.carrier&&this.visible(b.x,b.y)&&conversations.some(c=>(c.first===a.id&&c.second===b.id||c.first===b.id&&c.second===a.id)&&(!c.used||!c.once)));
 }
 actionTargets(a,mode) {
  if(!living(a)||a.carrier||a.acted||a.canto&&a.actionLock!=="take"||a.team!==this.s.team||this.s.result)return [];
  if(a.actionLock==="take"&&mode!=="drop"||a.actionLock==="give"&&["rescue","give","take","cover","trade","support"].indexOf(mode)>=0)return [];
  if(mode==="talk")return this.conversationTargets(a).filter(b=>dist(a,b)===1);
  if(mode==="drop")return [[1,0],[-1,0],[0,1],[0,-1]].map(d=>({x:a.x+d[0],y:a.y+d[1]})).filter(p=>!this.rescueError(a,null,mode,p.x,p.y));
  return this.s.units.filter(b=>{
   if(b===a||!living(b)||b.carrier||dist(a,b)!==1||!this.visible(b.x,b.y))return false;
   if(["rescue","give","take","cover"].indexOf(mode)>=0)return !this.rescueError(a,b,mode);
   if(mode==="trade")return this.allies(a,b)&&!!(a.inventory.length||b.inventory.length);
   if(mode==="steal")return this.stealSlots(a,b).length>0;
   if(mode==="support"){
    if(!this.allies(a,b)||!a.actorId||!b.actorId)return false;
    const k=this.bondKey(a,b),total=u=>Object.keys(this.s.supports).filter(k=>k.split(":").indexOf("a"+u.actorId)>=0).reduce((n,k)=>n+this.s.supports[k],0);
    return (this.s.supports[k]||0)<3&&a.supportTurns[k]!==this.s.turn&&total(a)<this.s.options.supportCap&&total(b)<this.s.options.supportCap;
   }
   return false;
  });
 }
 stealSlots(a,b) {
  if(!living(a)||!living(b)||a.carrier||b.carrier||this.allies(a,b)||dist(a,b)!==1||!this.has(a,"steal")||this.value(a,"speed")<=this.value(b,"speed")||a.inventory.length>=this.s.options.inventory)return [];
  return b.inventory.map((item,index)=>({item,index})).filter(row=>row.item.kind==="item"&&this.itemData(row.item)&&!this.itemData(row.item).bound).map(row=>row.index);
 }
 contextActions(a) {
  return [["Hablar","talk"],["Intercambiar","trade"],["Rescatar","rescue"],["Entregar","give"],["Tomar","take"],["Soltar","drop"],["Cubrir","cover"],["Apoyar","support"],["Robar","steal"]].map(row=>({label:row[0],mode:row[1],targets:this.actionTargets(a,row[1])})).filter(row=>row.targets.length);
 }
 rescue(a,b,mode,x,y) {
  const error=this.rescueError(a,b,mode,x,y);T.assert(!error,error);
  if(mode==="drop"){
   const p=this.unit(a.passenger);T.assert(p&&dist(a,{x,y})===1&&!this.at(x,y)&&Number.isFinite(this.moveCost(p,x,y)),"No se puede soltar ahí");
   p.carrier=null;p.x=x;p.y=y;if(p.team===this.s.team)p.acted=true;a.passenger=null;
  }else{
   T.assert(a!==b&&living(a)&&living(b)&&this.allies(a,b)&&dist(a,b)===1&&!a.carrier&&!b.carrier,"Rescate requiere aliados adyacentes");
   let from,to,p;
   if(mode==="give"){from=a;to=b;p=this.unit(a.passenger);}
   else if(mode==="take"){from=b;to=a;p=this.unit(b.passenger);}
   else if(mode==="cover"){from=null;to=a;p=b;a.x=b.x;a.y=b.y;}
   else{from=null;to=a;p=b;}
   T.assert(p&&!p.passenger&&!to.passenger&&(this.cls(to).capacity||this.value(to,"build")+4)>=this.value(p,"build"),"Capacidad insuficiente");
   if(from)from.passenger=null;to.passenger=p.id;p.carrier=to.id;p.x=to.x;p.y=to.y;if(!from)p.acted=true;
  }
  if(mode==="take"||mode==="give"){
   this.commit(a);a.actionLock=mode;a.moveLocked=!(this.has(a,"canto")||this.has(a,"cantoCombat")||this.cls(a).moveType==="mounted");a.canto=mode==="take"&&!a.moveLocked&&a.moved<this.value(a,"move");a.acted=false;return;
  }
  this.finishAction(a,"rescue");
 }
 applyState(u,id,turns) {
  T.assert(this.db.states[id],"Estado inexistente");const s=u.states.find(s=>s.id===Number(id));
  if(s)s.turns=Number(turns)||3;else u.states.push({id:Number(id),turns:Number(turns)||3});
 }
 useItem(u,slot,target,position) {
  const item=u.inventory[slot],d=this.itemData(item),v=target||u;T.assert(item&&d,"Objeto inexistente");
  T.assert(living(u)&&living(v)&&!u.carrier&&!v.carrier,"Unidad no disponible");T.assert(!(d.uses>0)||item.uses>0,'No quedan usos');
  if(item.kind==="weapon")T.assert(d.staff&&this.canEquip(u,item)&&this.reach(u,v,d),"Bastón incompatible o fuera de alcance");
  else T.assert(dist(u,v)<=(d.maxRange||0),"Objeto fuera de alcance");
  const effect=d.effect||"heal";
  T.assert(this.allies(u,v)||effect==="status"||effect==="damage","El objetivo debe ser aliado");
  let repair,chosenClass;
  if(effect==='repair'){repair=v.inventory[position&&Number.isInteger(position.slot)?position.slot:v.inventory.findIndex(i=>i.kind==='weapon')];const data=this.itemData(repair);T.assert(repair&&repair.kind==='weapon'&&data.uses>0&&repair.uses<data.uses,'Elige un arma con usos gastados');}
  if(effect==='teleport'){const p=position,r=d.teleportRangeStat?Math.max(1,Math.floor(this.value(u,d.teleportRangeStat)*(d.teleportFactor===undefined?.5:d.teleportFactor))):d.teleportRange;T.assert(p&&this.inside(p.x,p.y)&&!this.at(p.x,p.y)&&Number.isFinite(this.moveCost(v,p.x,p.y))&&(r===undefined||dist(u,p)<=r),'Destino de transporte inválido');}
  if(effect==='promote'){chosenClass=position&&position.classId||d.classId;const choices=this.cls(v).promotions||[];if(!chosenClass&&choices.length>1){this.present({type:'promoteChoice',unit:u.id,target:v.id,slot});return false;}chosenClass=chosenClass||choices[0];T.assert(choices.indexOf(Number(chosenClass))>=0&&v.level>=(this.cls(v).promoteLevel||10),'Promoción no disponible');}
  const hit=d.accuracy===undefined||this.roll(d.accuracy);
  if(!hit){this.consume(u,slot);this.notice(d.name+': fallo');this.present({type:'itemMiss',unit:u.id,target:v.id});this.finishAction(u,d.staff?'staff':'item');return false;}
  if(effect==="heal")v.hp=clamp(v.hp+(d.power===undefined?10:d.power)+Math.floor(this.value(v,'health')*(d.healPercent||0))+(d.staff?this.value(u,"magic"):0),1,this.value(v,"health"));
  else if(effect==="restore")v.states=d.removeStates?v.states.filter(s=>d.removeStates.indexOf(s.id)<0):[];
  else if(effect==="status")this.applyState(v,d.state,d.turns);
  else if(effect==="damage"){v.hp=Math.max(0,v.hp-(d.power||10));if(!v.hp)this.defeat(v,u);}
  else if(effect==="boost")v.stats[d.stat]+=d.power||1;
  else if(effect==="growth")v.growth[d.stat]=(v.growth[d.stat]||0)+(d.power||5);
  else if(effect==="repair")repair.uses=this.itemData(repair).uses;
  else if(effect==="rank")this.rank(v,d.category,d.power||20);
  else if(effect==="torch")v.visionBonus={value:d.power||4,turns:d.turns||5};
  else if(effect==="promote")this.promote(v,chosenClass,false);
  else if(effect==="refresh"){T.assert(u!==v,"No puedes renovar tu propia acción");v.acted=false;v.moved=0;v.committed=false;v.canto=false;v.actionLock=null;v.moveLocked=false;}
  else if(effect==="teleport"){
   v.x=position.x;v.y=position.y;
  }else fail("Efecto desconocido: "+effect);
  this.consume(u,slot);if(d.staff){this.experience(u,d.exp===undefined?12:d.exp);this.rank(u,d.category,d.wexp===undefined?1:d.wexp);}this.present({type:"heal",id:v.id});this.finishAction(u,d.staff?'staff':"item");return true;
 }
 visible(x,y) {
  if(!this.s.fog)return true;
  return this.s.units.some(u=>living(u)&&!u.carrier&&u.team===1&&dist(u,{x,y})<=this.s.fog+(this.cls(u).vision||0)+(u.visionBonus?u.visionBonus.value:0)+(this.terrain(u.x,u.y).vision||0));
 }
 startPhase() {
  this.s.units.filter(u=>living(u)&&u.team===this.s.team).forEach(u=>{
   u.acted=false;u.moved=0;u.committed=false;u.canto=false;u.actionLock=null;u.moveLocked=false;
   if(u.carrier)return;
   let heal=this.terrain(u.x,u.y).heal||0;this.effects(u,"regenerate").forEach(e=>heal+=e.value||5);
   this.effects(u,"poison").forEach(e=>heal-=e.value||3);u.hp=clamp(u.hp+heal,1,this.value(u,"health"));
   u.states.forEach(s=>s.turns--);u.states=u.states.filter(s=>s.turns>0);
   if(u.visionBonus&&--u.visionBonus.turns<=0)u.visionBonus=null;
  });
  this.signal("turnStart");this.checkObjective();
 }
 endPhase() {
  T.assert(!this.s.phasePending,"Fase ya terminada");this.signal("turnEnd");this.s.phasePending=true;this.s.selected=null;this.s.moveOrigin=null;
 }
 advancePhase() {
  if(!this.s.phasePending||this.s.queue.length||this.s.presentations.length||this.s.result)return;
  const teams=this.s.teams;let i=teams.indexOf(this.s.team)+1;
  while(i<teams.length&&!this.s.units.some(u=>living(u)&&u.team===teams[i]&&!u.carrier))i++;
  if(i>=teams.length){i=0;this.s.turn++;}this.s.team=teams[i];this.s.phasePending=null;this.startPhase();
 }
 ai(u) {
  if(u.acted||!living(u)||u.carrier)return {type:"wait"};
  const allies=this.s.units.filter(v=>living(v)&&!v.carrier&&this.allies(u,v)),enemies=this.s.units.filter(v=>living(v)&&!v.carrier&&!this.allies(u,v));
  const medicine=u.inventory.findIndex(i=>{const d=this.itemData(i);return i.kind==="item"&&d.effect==="heal";});
  if(medicine>=0&&u.hp<this.value(u,"health")/2)return {type:"item",unit:u.id,slot:medicine,target:u.id};
  const reach=this.paths(u,u.ai==="hold"||u.ai==="guard"?0:this.value(u,"move")-u.moved),positions=Object.keys(reach.costs).map(k=>{const p=k.split(",").map(Number);return {x:p[0],y:p[1]};}).filter(p=>!this.at(p.x,p.y)||this.at(p.x,p.y)===u);
  let best=null;
  positions.forEach(p=>{const proxy=Object.assign({},u,p);u.inventory.forEach((item,slot)=>{const w=this.itemData(item);if(!this.canEquip(u,item))return;
   (w.staff?allies:enemies).forEach(v=>{
    if(!this.reach(proxy,v,w))return;let score;
    if(w.staff){if(w.effect!=="heal"||v.hp===this.value(v,"health"))return;score=30+(this.value(v,"health")-v.hp)*2;}
    else{const f=this.forecast(proxy,v,w),back=this.counterForecast(v,proxy,null,w);score=f.damage*f.strikes*f.hit/100-back.damage*back.strikes*back.hit/150+(f.damage>=v.hp?40:0);}
    score+=(this.terrain(p.x,p.y).defense||0)*2-reach.costs[key(p.x,p.y)]/10;
    if(!best||score>best.score)best={type:w.staff?"item":"attack",unit:u.id,target:v.id,slot,x:p.x,y:p.y,score};
   });});});
  if(best)return best;
  let targets=(u.ai==="pillage"||u.ai==="thief")?(this.s.map.interactions||[]).filter(i=>!i.used&&(i.type==="village"||i.type==="chest")):enemies;
  if(u.pillageTarget&&targets.some(i=>i.id===u.pillageTarget))targets=targets.filter(i=>i.id===u.pillageTarget);
  if(u.ai==="hold"||u.ai==="guard"||!targets.length)return {type:"wait"};
  const target=targets.slice().sort((a,b)=>dist(u,a)-dist(u,b))[0];
  const p=u.ai==="random"?positions[Math.floor(this.random()*positions.length)]:positions.sort((a,b)=>dist(a,target)-dist(b,target))[0];
  return p?{type:"move",x:p.x,y:p.y,interaction:targets===enemies?null:target.id}:{type:"wait"};
 }
 runAI(u) {
  const action=this.ai(u);if(action.x!==undefined&&(u.x!==action.x||u.y!==action.y))this.move(u,action.x,action.y,false);
  if(action.type==="attack"){u.equipped=action.slot;this.combat(u,this.unit(action.target),true);}
  else if(action.type==="item")this.useItem(u,action.slot,this.unit(action.target));
  else if(action.interaction&&dist(u,(this.s.map.interactions||[]).find(i=>i.id===action.interaction))<=1){try{this.interact(u,action.interaction);}catch(e){this.notice(e.message);}}
  this.waitUnit(u);return action;
 }
 availableInteractions(u) {return (this.s.map.interactions||[]).filter(i=>(!i.used||i.repeat)&&dist(u,i)<=1&&this.visible(i.x,i.y));}
 interact(u,id) {
  const i=(this.s.map.interactions||[]).find(i=>i.id===Number(id));T.assert(i&&dist(u,i)<=1&&(!i.used||i.repeat),"Interacción no disponible");
  if(i.secret)T.assert(u.inventory.some(it=>this.itemData(it).secretCard),"Necesitas una credencial");
  if(i.type==="door"||i.type==="chest"){
   if(!this.has(u,"lockpick")){const slot=u.inventory.findIndex(it=>this.itemData(it).key===i.type||this.itemData(it).key==="all");T.assert(slot>=0,"Necesitas una llave");this.consume(u,slot);}
  }
  if(i.type==="shop"||i.type==="arena"){this.present({type:i.type,id:i.id,unit:u.id});return;}
  if(u.team===2&&(i.type==="village"||i.type==="chest")){
   if(i.type==="chest"&&i.reward&&i.reward.id)this.give(u,this.item(i.reward.kind||"item",i.reward.id));i.used=true;i.pillaged=true;
  }else{
   if(i.reward&&!i.used){if(i.reward.id)this.give(u,this.item(i.reward.kind||"item",i.reward.id));this.s.gold+=i.reward.gold||0;}
   if(i.recruit){const ally=this.unit(i.recruit);if(ally){ally.team=1;ally.acted=true;}}
   if(i.switchId)this.setSwitch(i.switchId,true);i.used=true;
   if(i.text)this.present({type:"dialogue",name:i.name||"",text:i.text,unit:u.id});
   if(i.event)this.callEvent(i.event,{unit:u.id});
  }
  if(i.type==="door"){
   const group=(this.s.map.interactions||[]).filter(v=>v===i||i.group&&v.group===i.group);
   group.forEach(d=>{d.used=true;const area=d.area||{x:d.x,y:d.y,w:1,h:1};for(let y=area.y;y<area.y+area.h;y++)for(let x=area.x;x<area.x+area.w;x++)if(this.inside(x,y))this.s.map.tiles[y*this.s.map.width+x]=d.terrain||0;});
  }
  this.signal("interaction",{unit:u.id,interaction:i.id});this.finishAction(u,"interact");
 }
 buy(u,shopId,index) {
  const shop=this.availableInteractions(u).find(i=>i.id===shopId&&i.type==="shop"),row=shop&&(shop.stock||[])[index];T.assert(row&&row.count!==0,"Mercancía agotada");
  const i=this.item(row.kind,row.id),d=this.itemData(i),price=row.price===undefined?d.price||0:row.price;
  T.assert(this.s.gold>=price,"Oro insuficiente");T.assert(u.inventory.length<this.s.options.inventory,"Inventario lleno");
  if(shop.secret)T.assert(u.inventory.some(it=>this.itemData(it).secretCard),"Necesitas una credencial");
  this.s.gold-=price;u.inventory.push(i);if(row.count>0)row.count--;this.commit(u);this.autoEquip(u);
 }
 sell(u,shopId,slot) {
  T.assert(this.availableInteractions(u).some(i=>i.id===shopId&&i.type==="shop"),"No hay tienda cerca");
  const item=u.inventory[slot],d=this.itemData(item);T.assert(d&&!d.bound,"Objeto no vendible");
  const price=Math.floor((d.price||0)/2*(d.uses?item.uses/d.uses:1));u.inventory.splice(slot,1);this.s.gold+=price;this.autoEquip(u);this.commit(u);return price;
 }
 arena(u,wager,rounds) {
  T.assert(wager>0&&this.s.gold>=wager,"Apuesta inválida");T.assert(living(u)&&this.weapon(u)&&!this.weapon(u).staff,"Necesitas un arma ofensiva");
  this.s.gold-=wager;const data=copy(this.db),arenaUnit=copy(u),enemy=copy(u);
  arenaUnit.id=1;arenaUnit.team=1;arenaUnit.x=0;arenaUnit.y=0;arenaUnit.hp=this.value(u,"health");
  enemy.id=2;enemy.name="Rival de práctica";enemy.team=2;enemy.x=1;enemy.y=0;enemy.boss=false;enemy.loot=false;enemy.actorId=0;
  const w=copy(this.weapon(u));w.minRange=1;w.maxRange=1;w.uses=0;w.rank=0;data.weapons[99999]=w;
  [arenaUnit,enemy].forEach(v=>{v.inventory=[{kind:"weapon",id:99999,uses:0}];v.equipped=0;v.skills=[];v.states=[];v.passenger=null;v.carrier=null;});
  const e=new Engine(data,{width:2,height:1,units:[],objective:"manual",seed:this.s.seed});e.s.units=[arenaUnit,enemy];
  const fights=[];let outcome="retreat";
  for(let n=0;n<(rounds||3)&&living(arenaUnit)&&living(enemy);n++)fights.push(e.combat(arenaUnit,enemy,false));
  if(!living(enemy))outcome="win";else if(!living(arenaUnit))outcome="loss";
  this.s.seed=e.s.seed;if(outcome==="win"){this.s.gold+=wager*2;this.experience(u,30);}u.hp=Math.max(1,Math.min(u.hp,arenaUnit.hp));
  this.finishAction(u,"combat");this.notice(outcome==="win"?"Coliseo: victoria":outcome==="loss"?"Coliseo: derrota":"Coliseo: retirada");
  return {outcome,fights};
 }
 checkObjective() {
  if(this.s.result)return this.s.result;
  const s=this.s,active=s.units.filter(u=>living(u));
  if(s.protectedIds.some(id=>!living(this.unit(id)))||!active.some(u=>u.team===1)||s.map.turnLimit&&s.turn>s.map.turnLimit)return this.finish("defeat");
  const foes=active.filter(u=>u.team===2),condition=s.objective;
  if(condition==="eliminate"&&!foes.length||condition==="boss"&&!foes.some(u=>u.boss)||condition==="survive"&&s.turn>=(s.map.surviveTurns||5))return this.finish("victory");
  return null;
 }
 seize(u) {T.assert(this.s.objective==="seize"&&(this.s.map.goals||[]).some(p=>dist(p,u)===0)&&(!this.s.map.leader||u.id===this.s.map.leader),"Esta unidad no puede conquistar aquí");this.finish("victory");}
 finish(result) {if(this.s.result)return this.s.result;this.s.result=result;this.signal(result);this.notice(result==="victory"?"Misión cumplida":"Misión perdida");return result;}
 nextMission(mission) {
  this.rememberParty();const next=new Engine(this.db,mission,null,this.s);this.s=next.s;this.db=next.db;return this;
 }
 present(p) {this.s.presentations.push(copy(p));}
 notice(message) {this.s.log.push(String(message));if(this.s.log.length>100)this.s.log.shift();}
 setSwitch(id,value) {const old=this.s.flags[id];this.s.flags[id]=!!value;if(value&&!old)this.signal("switch",{switchId:Number(id)});}
 eligible(page,eventId) {
  const c=page.conditions||{};return !(c.switch1Valid&&!this.s.flags[c.switch1Id]||c.switch2Valid&&!this.s.flags[c.switch2Id]||c.variableValid&&(this.s.vars[c.variableId]||0)<c.variableValue||c.selfSwitchValid&&!this.s.self[eventId+":"+c.selfSwitchCh]||c.actorValid&&!this.s.units.some(u=>living(u)&&u.actorId===c.actorId&&u.team===1)||c.itemValid&&!this.s.units.some(u=>u.team===1&&u.inventory.some(i=>i.kind==="item"&&i.id===c.itemId)));
 }
 eventPage(event) {if(!event.pages)return event;for(let i=event.pages.length-1;i>=0;i--)if(this.eligible(event.pages[i],event.id))return Object.assign({pageIndex:i},event.pages[i]);return null;}
 signal(type,context) {
  const ctx=Object.assign({team:this.s.team,turn:this.s.turn},context);
  (this.s.map.events||[]).forEach(event=>{const page=this.eventPage(event),on=page&&page.on;if(!on||on.type!==type)return;
   if(on.team&&on.team!==ctx.team||on.turn&&on.turn!==ctx.turn||on.unit&&on.unit!==ctx.unit||on.switchId&&on.switchId!==ctx.switchId)return;
   if(type==="enter"&&(on.region?on.region!==ctx.region:ctx.x!==event.x||ctx.y!==event.y))return;
   const k=event.id+":"+(page.pageIndex||0);if(on.once!==false&&this.s.done[k])return;
   if(on.once!==false)this.s.done[k]=true;this.s.queue.push({event:event.id,commands:copy(page.commands||[]),pc:0,context:ctx,wait:0,branches:[]});
  });
 }
 callEvent(id,ctx) {const e=(this.s.map.events||[]).find(e=>e.id===Number(id)),p=e&&this.eventPage(e);T.assert(p,"Evento no disponible");T.assert(this.s.queue.length<100,"Demasiadas llamadas de eventos");this.s.queue.unshift({event:e.id,commands:copy(p.commands||[]),pc:0,context:copy(ctx||{}),wait:0,branches:[]});}
}
T.Engine=Engine;
if(typeof module!=="undefined"&&module.exports)module.exports=T;
})(typeof globalThis!=="undefined"?globalThis:this);

// ===== src/core/02_Commands.js =====
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

// ===== src/core/03_Rules.js =====
(function(root){
'use strict';
const T=root.Tactics,E=T.Engine.prototype,copy=T.copy,alive=T.alive,distance=T.distance;
const {field:f,n:num,s:str,b:bool,choice:select,unit,xy}=T.fields;
const add=T.addCommand,extend=T.extendCommand;
extend('Unit',[str('variant','Variante gráfica'),str('buildProfile','Perfil de crecimiento de la clase'),num('preLevels','Niveles previos para estadísticas'),num('constitution','Constitución (0 = BD)'),str('group','Subgrupo'),str('affinity','Afinidad')]);
T.structures.Equipment.push(bool('drop','Dejar este objeto al caer'));
extend('Mission',[select('mode','Tipo de mapa',{battle:'Batalla táctica',story:'Solo narrativa'},'battle'),select('mapGraphics','Gráfico del mapa',{resource:'Imagen del paquete',native:'Tiles del editor MZ'},'resource'),bool('showProgress','Mostrar EXP y ganancias de nivel',true)]);
extend('UseItem',[num('targetSlot','Arma a reparar (0 = primera dañada)'),f('classId','Promoción elegida (0 = preguntar)','class',0)]);
extend('Promote',[bool('choose','Dejar elegir al jugador')]);
extend('Camera',[num('frames','Duración del desplazamiento',30)]);
extend('Dialogue',[num('speakerSlot','Retrato que habla (0 = unidad)'),bool('animate','Animar boca y ojos',true)]);
extend('On',[bool('skippable','Secuencia saltable con Mayús')]);
extend('Interaction',[num('wager','Apuesta de coliseo',100),num('rounds','Rondas de coliseo',3)]);
const aiOptions={talk:'Buscar conversación',steal:'Robar a una unidad',escape:'Huir a destino',seize:'Conquistar destino'};
['Unit','ChangeUnit'].forEach(id=>Object.assign(T.catalog.find(c=>c.id===id).fields.find(f=>f.id==='ai').options,aiOptions));
Object.assign(T.catalog.find(c=>c.id==='OpenMenu').fields[0].options,{pending:'Entregas pendientes',groups:'Datos de ejércitos',promotion:'Elegir promoción',tracks:'Editor de pistas',palette:'Editor de paletas RGB'});
add('Bounds','Área jugable','Limita movimiento y selección; conserva el tamaño del mapa del editor.',[...xy(),num('width','Ancho',10),num('height','Alto',10)],true);
add('Scene','Escena narrativa','Iniciar o terminar una escena. Saltarla conserva cambios, recompensas y eventos.',[select('mode','Operación',{begin:'Comenzar',end:'Terminar'}),str('background','Fondo (ruta en img/, vacío = mapa)'),bool('skippable','Permitir saltar',true)]);
add('Portrait','Colocar retrato','Usa unidad del mapa o personaje de F9. Hay seis posiciones persistentes.',[num('slot','Posición (1 a 6)',1),unit(),f('actorId','Personaje de F9 (si no hay unidad)','actor',0),str('faceKey','Retrato del paquete (opcional)'),str('expression','Expresión','normal'),bool('mirror','Girar'),num('frames','Entrada en fotogramas',18)]);
add('PortraitAction','Dirigir retrato','Mover, intercambiar, girar, hacer saltar, cambiar expresión o retirar.',[num('slot','Posición de origen',1),select('mode','Acción',{move:'Mover',swap:'Intercambiar',flip:'Girar',jump:'Saltar',expression:'Cambiar expresión',remove:'Retirar'}),num('targetSlot','Posición de destino',4),str('expression','Expresión','normal'),num('frames','Duración',18)]);
add('Chapter','Presentar capítulo','Muestra una tarjeta antes de continuar la secuencia.',[str('title','Título','Nuevo capítulo'),str('subtitle','Subtítulo'),num('frames','Duración mínima',90)]);
add('AIPlan','Objetivo de inteligencia','Conversar, robar, huir, defender o conquistar; una ruta puede enumerar IDs de interacciones y acabar en la casilla destino.',[unit(),select('mode','Plan',{guard:'Defender área',heal:'Curar aliados',talk:'Conversar',steal:'Robar',escape:'Huir',seize:'Conquistar',thief:'Tesoros y salida',approach:'Atacar'}),num('target','Unidad objetivo (0 = automática)'),...xy(),num('radius','Radio de defensa',3),str('route','IDs de interacciones en orden'),num('event','Evento al completar (0 = ninguno)')]);
add('Group','Asignar subgrupo','Asigna un nombre interno del ejército. Consulta los conteos en Datos de ejércitos.',[unit(),str('name','Subgrupo','Destacamento')]);
add('Alliance','Relación entre equipos','Define si dos equipos son aliados. Afecta movimiento, combate y apoyos.',[num('first','Primer equipo',1),num('second','Segundo equipo',3),bool('allied','Son aliados',true)]);
add('Pending','Gestionar entregas pendientes','Retirar conserva usos y solo elimina la entrega si cabe. Posiciones desde 1.',[select('mode','Operación',{open:'Abrir ventana',unit:'Dar a unidad',convoy:'Enviar al almacén',discard:'Descartar'}),unit(),num('slot','Posición',1)]);
add('DropItem','Marcar botín individual','Marca o desmarca un objeto concreto del inventario.',[unit(),num('slot','Posición',1),bool('drop','Dejar al caer',true)]);
add('Variant','Cambiar variante','El nombre debe existir en variants de la clase. Vacío usa la apariencia principal.',[unit(),str('variant','Variante')]);
add('Tile','Cambiar tile del editor','Modifica una capa de un mapa nativo MZ. Los IDs de tile provienen del editor.',[...xy(),num('layer','Capa (0 a 3)'),num('tileId','ID de tile')]);
add('Affinity','Configurar afinidad','Bonos por rango de apoyo; se suman las afinidades de ambos personajes.',[str('name','Afinidad','fuego'),num('attack','Ataque'),num('defense','Defensa'),num('hit','Acierto'),num('avoid','Evasión'),num('crit','Crítico'),num('dodge','Evitar crítico')]);
add('BattleTracks','Asignar pistas de combate','Usa la secuencia guardada con el editor de pistas para una clase, arma y distancia.',[f('classId','Clase','class',1),str('category','Tipo de arma (vacío = cualquiera)'),select('distance','Distancia',{any:'Cualquiera',near:'Adyacente',far:'A distancia'}),str('clip','Nombre de pista guardada')]);
const compile=T.compileMap;
T.compileMap=function(map,id){const m=compile(map,id);m.nativeData=copy(map.data||[]);if(m.mapGraphics==='native')m.tiles=m.regions.map(r=>r||1);m.options=Object.assign({},m.options,{showProgress:!!m.showProgress});(map.events||[]).filter(Boolean).forEach(event=>{((event.pages||[])[0]?.list||[]).filter(c=>c.code===357&&c.parameters[0]==='TacticsMZ'&&c.parameters[1]==='Bounds').forEach(c=>{const a=T.args('Bounds',c.parameters[3]);T.assert(a.width>0&&a.height>0&&a.x>=0&&a.y>=0&&a.x+a.width<=m.width&&a.y+a.height<=m.height,'Área jugable inválida');m.bounds={x:a.x,y:a.y,w:a.width,h:a.height};});});return m;};
const inside=E.inside,allies=E.allies,objective=E.checkObjective,finish=E.finish,present=E.present,command=E.command;
E.inside=function(x,y){const b=this.s.map.bounds;return inside.call(this,x,y)&&(!b||x>=b.x&&y>=b.y&&x<b.x+b.w&&y<b.y+b.h);};
E.allies=function(a,b){if(!a||!b)return false;const k=[a.team,b.team].sort((a,b)=>a-b).join(':'),custom=(this.s.alliances||{})[k];return custom===undefined?allies.call(this,a,b):a.team===b.team||custom;};
E.checkObjective=function(){return this.s.map.mode==='story'?this.s.result:objective.call(this);};
E.finish=function(result){const first=!this.s.result,r=finish.call(this,result);if(first&&result==='victory'&&this.s.themes&&this.s.themes.victory)this.s.victoryMusicPending=true;return r;};
E.interpolate=function(text){return String(text||'').replace(/\{(protagonista|actor:\d+|unidad:\d+|variable:\d+)\}/g,(all,token)=>{if(token==='protagonista')return (this.unit(this.s.map.protagonist||this.s.map.leader)||{}).name||'';const parts=token.split(':'),id=Number(parts[1]);return parts[0]==='variable'?String(this.s.vars[id]===undefined?0:this.s.vars[id]):parts[0]==='unidad'?(this.unit(id)||{}).name||'':(this.s.units.find(u=>u.actorId===id)||this.s.roster[id]||this.db.actors[id]||{}).name||'';});};
E.present=function(p){if(p.type==='dialogue'){p=Object.assign({},p,{text:this.interpolate(p.text),name:this.interpolate(p.name)});if(this.s.story)p.story=copy(this.s.story);}if(this.s.skippingScene&&['dialogue','move','camera','chapter','portraitMotion','experience','level','promotion','heal'].indexOf(p.type)>=0)return;present.call(this,p);};
E.skipScene=function(){T.assert(this.s.story&&this.s.story.skippable||this.s.queue[0]&&this.s.queue[0].skippable,'Esta secuencia no se puede saltar');this.s.skippingScene=true;this.s.presentations=this.s.presentations.filter(p=>['dialogue','move','camera','chapter','portraitMotion','experience','level','promotion','heal'].indexOf(p.type)<0);this.s.queue.forEach(q=>q.wait=0);};
E.claimPending=function(slot,mode,u){const item=this.s.pendingItems[slot];T.assert(Number.isInteger(slot)&&slot>=0&&item,'Entrega inexistente');const to=mode==='unit'?u&&u.inventory:mode==='convoy'?this.s.convoy:null;T.assert(mode==='discard'||to,'Destino de entrega inválido');if(to)T.assert(to.length<(mode==='unit'?this.s.options.inventory:this.s.options.convoy),'Destino lleno');if(to)to.push(copy(item));this.s.pendingItems.splice(slot,1);if(u)this.autoEquip(u);return item;};
E.armyGroups=function(){const rows={};this.s.units.filter(u=>!u.temporary).forEach(u=>{const key=u.team+':'+(u.group||'General'),row=rows[key]||(rows[key]={team:u.team,name:u.group||'General',alive:0,defeated:0,retreated:0});row[u.hp<=0?'defeated':u.removed?'retreated':'alive']++;});return Object.values(rows);};
E.command=function(id,raw,entry){const a=T.args(id,raw),q=entry||{event:0,context:{},branches:[]},s=this.s,get=id=>{const u=this.unit(Number(id)||q.context.unit);T.assert(u,'Unidad no encontrada: '+id);return u;};if(q.branches.some(b=>!b.active)&&['If','Else','EndIf'].indexOf(id)<0)return;
 if(id==='UseItem')return this.useItem(get(a.unit),a.slot-1,a.target?get(a.target):get(a.unit),{x:a.x,y:a.y,slot:a.targetSlot>0?a.targetSlot-1:undefined,classId:a.classId});
 if(id==='Promote'&&a.choose){this.present({type:'promoteChoice',unit:get(a.unit).id,target:get(a.unit).id,ignoreLevel:a.ignoreLevel});return;}
 if(id==='Dialogue'){this.present({type:'dialogue',name:a.name,text:a.text,unit:a.unit||q.context.unit,speakerSlot:a.speakerSlot,animate:a.animate});return;}
 if(id==='Camera'){s.camera={x:a.x,y:a.y};if(a.frames&&!s.skippingScene)this.present({type:'camera',x:a.x,y:a.y,duration:Math.max(1,a.frames)});return;}
 if(id==='Scene'){if(a.mode==='end'){s.story=null;s.skippingScene=false;}else{s.story={slots:{},background:a.background,skippable:a.skippable};}return;}
 if(id==='Portrait'){T.assert(a.slot>=1&&a.slot<=6,'Posición de retrato inválida');const u=a.unit?get(a.unit):this.db.actors[a.actorId];T.assert(u||a.faceKey,'Asigna una unidad, personaje o retrato');s.story=s.story||{slots:{}};s.story.slots[a.slot]={unit:a.unit||0,actorId:a.actorId||0,faceKey:a.faceKey||u&&u.faceKey||'',expression:a.expression,mirror:a.mirror};if(a.frames)this.present({type:'portraitMotion',mode:'enter',slot:a.slot,duration:Math.max(1,a.frames)});return;}
 if(id==='PortraitAction'){const slots=s.story&&s.story.slots,p=slots&&slots[a.slot];T.assert(p,'No hay retrato en esa posición');T.assert(a.targetSlot>=1&&a.targetSlot<=6,'Posición destino inválida');const before=copy(slots);if(a.mode==='move'||a.mode==='swap'){const other=slots[a.targetSlot];slots[a.targetSlot]=p;if(a.mode==='swap'&&other)slots[a.slot]=other;else delete slots[a.slot];}else if(a.mode==='flip')p.mirror=!p.mirror;else if(a.mode==='expression')p.expression=a.expression;else if(a.mode==='remove')delete slots[a.slot];if(a.frames)this.present({type:'portraitMotion',mode:a.mode,slot:a.slot,targetSlot:a.targetSlot,before,duration:Math.max(1,a.frames)});return;}
 if(id==='Chapter'){this.present({type:'chapter',title:this.interpolate(a.title),subtitle:this.interpolate(a.subtitle),duration:Math.max(1,a.frames)});return;}
 if(id==='AIPlan'){const u=get(a.unit);u.ai=a.mode;u.aiPlan={target:a.target,x:a.x,y:a.y,radius:Math.max(0,a.radius),route:String(a.route).split(',').map(Number).filter(Boolean),event:a.event};return;}
 if(id==='Group'){get(a.unit).group=a.name;return;}
 if(id==='Alliance'){T.assert(a.first>0&&a.second>0,'Equipo inválido');s.alliances=s.alliances||{};s.alliances[[a.first,a.second].sort((a,b)=>a-b).join(':')]=a.allied;return;}
 if(id==='Pending'){if(a.mode==='open')this.present({type:'menu',menu:'pending',unit:a.unit||s.map.leader});else this.claimPending(a.slot-1,a.mode,a.mode==='unit'?get(a.unit):null);return;}
 if(id==='DropItem'){const i=get(a.unit).inventory[a.slot-1];T.assert(i,'Posición de inventario inválida');i.drop=a.drop;return;}
 if(id==='Variant'){const u=get(a.unit);T.assert(!a.variant||(this.cls(u).variants||{})[a.variant],'Variante inexistente');u.variant=a.variant;return;}
 if(id==='Tile'){T.assert(this.inside(a.x,a.y)&&Number.isInteger(a.layer)&&a.layer>=0&&a.layer<=3&&Number.isInteger(a.tileId)&&a.tileId>=0,'Tile inválido');s.map.nativeData=s.map.nativeData||[];s.map.nativeData[(a.layer*s.map.height+a.y)*s.map.width+a.x]=a.tileId;s.map.tileRevision=(s.map.tileRevision||0)+1;return;}
 if(id==='Affinity'){s.affinities=s.affinities||{};s.affinities[a.name]={attack:a.attack,defense:a.defense,hit:a.hit,avoid:a.avoid,crit:a.crit,dodge:a.dodge};this.db.affinities=Object.assign({},this.db.affinities,s.affinities);return;}
 if(id==='BattleTracks'){T.assert(this.db.classes[a.classId],'Clase inexistente');s.battleTracks=s.battleTracks||{};s.battleTracks[a.classId+':'+a.category+':'+a.distance]=a.clip;return;}
 if(id==='Wait'&&s.skippingScene)return;
 return command.call(this,id,a,q);
};
const tick=E.tick,signal=E.signal;
E.signal=function(type,context){const before=this.s.queue.length;signal.call(this,type,context);this.s.queue.slice(before).forEach(q=>{const ev=this.s.map.events.find(e=>e.id===q.event),page=ev&&this.eventPage(ev);q.skippable=!!(page&&page.on&&page.on.skippable);});};
E.tick=function(){if(this.s.affinities)this.db.affinities=Object.assign({},this.db.affinities,this.s.affinities);tick.call(this);if(!this.s.queue.length&&!this.s.story)this.s.skippingScene=false;};
E.nativePassage=function(x,y,bit){const m=this.s.map,set=(this.db.tilesets||[])[m.tilesetId];if(m.mapGraphics!=='native'||!set)return true;for(let layer=3;layer>=0;layer--){const id=m.nativeData[(layer*m.height+y)*m.width+x]||0,flag=(set.flags||[])[id]||0;if(flag&16)continue;return !(flag&bit);}return true;};
E.stepCost=function(u,from,to){const bit=to.x>from.x?4:to.x<from.x?2:to.y>from.y?1:8,reverse={1:8,8:1,2:4,4:2}[bit];return this.cls(u).moveType!=='flying'&&(!this.nativePassage(from.x,from.y,bit)||!this.nativePassage(to.x,to.y,reverse))?Infinity:this.moveCost(u,to.x,to.y);};
E.canOpen=function(u,i){return this.has(u,'lockpick')||u.inventory.some(item=>{const d=this.itemData(item);return d&&(!d.uses||item.uses>0)&&(d.key===i.type||d.key==='all');});};
// Dijkstra over the mission: costs honor movement and directional MZ passage.
// A closed door is a future action, never an instantaneous walk through a wall.
E.objectiveRoute=function(u,target,adjacent,minimum){
 const origin=T.key(u.x,u.y),open=[{x:u.x,y:u.y,c:0}],costs={[origin]:0},prev={},doors=(this.s.map.interactions||[]).filter(i=>i.type==='door'&&!i.used&&this.canOpen(u,i));let goal=null;
 while(open.length){open.sort((a,b)=>a.c-b.c);const p=open.shift(),pk=T.key(p.x,p.y);if(costs[pk]!==p.c)continue;if(distance(p,target)<=adjacent&&distance(p,target)>=(minimum||0)&&(!this.at(p.x,p.y)||this.at(p.x,p.y)===u)){goal=pk;break;}
  [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{const q={x:p.x+d[0],y:p.y+d[1]},k=T.key(q.x,q.y),o=this.at(q.x,q.y);if(!this.inside(q.x,q.y)||o&&!this.allies(u,o))return;const door=doors.find(i=>i.x===q.x&&i.y===q.y),step=door?3:this.stepCost(u,p,q),cost=p.c+step;if(!Number.isFinite(cost)||costs[k]!==undefined&&costs[k]<=cost)return;costs[k]=cost;prev[k]=pk;open.push({x:q.x,y:q.y,c:cost});});
 }
 if(!goal)return null;const path=[];while(goal!==origin){const v=goal.split(',').map(Number);path.unshift({x:v[0],y:v[1]});goal=prev[goal];}return path;
};
E.planMove=function(u,target,adjacent,action){const route=this.objectiveRoute(u,target,adjacent,action.minimum);if(!route)return {type:'wait'};let p={x:u.x,y:u.y},spent=0;const budget=this.movementBudget(u);for(const step of route){const door=(this.s.map.interactions||[]).find(i=>i.type==='door'&&!i.used&&i.x===step.x&&i.y===step.y);if(door){if(distance(p,door)===1)return {type:'interact',interaction:door.id,x:p.x,y:p.y};break;}const cost=this.stepCost(u,p,step);if(spent+cost>budget)break;spent+=cost;p=step;}if(this.at(p.x,p.y)&&this.at(p.x,p.y)!==u){let index=route.indexOf(p);while(index>=0&&this.at(route[index].x,route[index].y)&&this.at(route[index].x,route[index].y)!==u)index--;p=index>=0?route[index]:{x:u.x,y:u.y};}const arrived=distance(p,target)<=adjacent&&distance(p,target)>=(action.minimum||0);return Object.assign({type:arrived?action.type:'move',x:p.x,y:p.y},arrived?action:{});};
const baseAI=E.ai,baseRunAI=E.runAI;
E.ai=function(u){
 if(u.acted||!alive(u)||u.carrier)return {type:'wait'};const plan=u.aiPlan||{},units=this.s.units.filter(v=>alive(v)&&!v.carrier),friends=units.filter(v=>this.allies(u,v)),foes=units.filter(v=>!this.allies(u,v));
 const pursue=(targets,adjacent,make)=>{for(const v of targets.slice().sort((a,b)=>distance(u,a)-distance(u,b))){const action=this.planMove(u,v,adjacent,make(v));if(action.type!=='wait')return action;}return {type:'wait'};};
 if(u.ai==='escape')return this.planMove(u,plan,0,{type:'escape',event:plan.event});
 if(u.ai==='talk'){const pairs=(this.s.map.conversations||[]).filter(c=>(c.first===u.id||c.second===u.id)&&(!c.used||!c.once)),targets=pairs.map(c=>this.unit(c.first===u.id?c.second:c.first)).filter(v=>alive(v)&&(!plan.target||v.id===plan.target));return pursue(targets,1,v=>({type:'talk',target:v.id}));}
 if(u.ai==='steal'){const targets=foes.filter(v=>(!plan.target||v.id===plan.target)&&this.has(u,'steal')&&this.value(u,'speed')>this.value(v,'speed')&&u.inventory.length<this.s.options.inventory&&v.inventory.some(i=>i.kind==='item'&&!this.itemData(i).bound));return pursue(targets,1,v=>({type:'steal',target:v.id,slot:v.inventory.findIndex(i=>i.kind==='item'&&!this.itemData(i).bound)}));}
 if(u.ai==='seize')return this.planMove(u,plan,0,{type:'seizeAI',event:plan.event});
 if(u.ai==='thief'&&u.aiPlan){const ids=plan.route||[],targets=ids.length?ids.map(id=>(this.s.map.interactions||[]).find(i=>i.id===id)).filter(i=>i&&!i.used):(this.s.map.interactions||[]).filter(i=>i.type==='chest'&&!i.used);const target=targets[0];return target?this.canOpen(u,target)?this.planMove(u,target,1,{type:'interact',interaction:target.id}):{type:'wait'}:this.planMove(u,plan,0,{type:'escape',event:plan.event});}
 if(u.ai==='heal'){const patients=friends.filter(v=>v!==u&&v.hp<this.value(v,'health')),staffs=u.inventory.map((i,slot)=>({i,slot,d:this.itemData(i)})).filter(v=>v.d.staff&&v.d.effect==='heal'&&this.canEquip(u,v.i));for(const staff of staffs){const action=pursue(patients,this.weaponRange(u,staff.d).max,v=>({type:'item',target:v.id,slot:staff.slot,minimum:this.weaponRange(u,staff.d).min}));if(action.type!=='wait')return action;}return {type:'wait'};}
 if(u.ai==='guard'&&u.aiPlan){const origin={x:u.x,y:u.y},home={x:plan.x,y:plan.y},radius=plan.radius||0,oldAI=u.ai;u.ai='approach';let chosen;try{chosen=baseAI.call(this,u);}finally{u.ai=oldAI;}if(chosen.type==='attack'&&distance(chosen,home)<=radius&&distance(this.unit(chosen.target),home)<=radius+this.weaponRange(u,this.itemData(u.inventory[chosen.slot])).max)return chosen;if(distance(origin,home)>radius)return this.planMove(u,home,0,{type:'wait'});return {type:'wait'};}
 return baseAI.call(this,u);
};
E.runAI=function(u){const action=this.ai(u);if(['talk','steal','escape','seizeAI','interact'].indexOf(action.type)<0){const original=this.ai;this.ai=()=>action;try{return baseRunAI.call(this,u);}finally{this.ai=original;}}
 if(action.x!==undefined&&(u.x!==action.x||u.y!==action.y))this.move(u,action.x,action.y,false);
 if(action.type==='talk')this.talk(u,this.unit(action.target));
 if(action.type==='steal')this.steal(u,this.unit(action.target),action.slot);
 if(action.type==='interact')this.interact(u,action.interaction);
 if(action.type==='escape'){u.removed=true;if(action.event)this.callEvent(action.event,{unit:u.id});this.checkObjective();}
 if(action.type==='seizeAI'){if(action.event)this.callEvent(action.event,{unit:u.id});else this.finish(u.team===1?'victory':'defeat');}
 this.waitUnit(u);return action;
};
const originalSpawn=E.spawn;
E.spawn=function(def){const u=originalSpawn.call(this,def);if(u&&u.ai==='guard'&&!u.aiPlan)u.aiPlan={x:u.x,y:u.y,radius:this.cls(u).guardRadius||3};return u;};
const next=E.nextMission;
E.nextMission=function(map){const carry={affinities:copy(this.s.affinities),battleTracks:copy(this.s.battleTracks),customTracks:copy(this.s.customTracks),resourcePalettes:copy(this.s.resourcePalettes),alliances:copy(this.s.alliances)};next.call(this,map);Object.keys(carry).forEach(k=>{if(carry[k]!==undefined)this.s[k]=carry[k];});return this;};
E.startTournament=function(u,wager,rounds){T.assert(!this.s.tournament,'Ya hay un torneo en curso');T.assert(alive(u)&&this.weapon(u)&&!this.weapon(u).staff&&Number.isFinite(wager)&&wager>0&&this.s.gold>=wager,'Unidad, arma o apuesta inválida');T.assert(Number.isInteger(rounds)&&rounds>=1&&rounds<=10,'Elige entre 1 y 10 rondas');this.s.gold-=wager;this.s.tournament={unit:u.id,wager,rounds,wins:0,status:'ready'};this.commit(u);};
E.tournamentRound=function(){const t=this.s.tournament,u=t&&this.unit(t.unit);T.assert(t&&u&&t.status==='ready','No hay una ronda disponible');const choices=Object.values(this.db.classes).filter(c=>(c.inventory||[]).some(i=>i.kind==='weapon'&&this.db.weapons[i.id]&&!this.db.weapons[i.id].staff));T.assert(choices.length,'Configura clases rivales con un arma inicial');const cls=choices[Math.floor(this.random()*choices.length)],arena=new T.Engine(this.db,{width:3,height:1,objective:'manual',units:[],seed:this.s.seed}),fighter=copy(u);arena.db.terrain[0]={name:'Coliseo',cost:1,defense:0,avoid:0};arena.s.map.tiles=[0,0,0];fighter.id=1;fighter.x=0;fighter.y=0;fighter.hp=this.value(u,'health');fighter.removed=false;fighter.team=1;fighter.actorId=0;fighter.passenger=null;fighter.carrier=null;fighter.states=[];arena.experience=()=>{};arena.s.units.push(fighter);const rival=arena.spawn({id:2,classId:cls.id,team:2,x:1,y:0,level:Math.max(1,Math.min(cls.maxLevel||20,u.level+t.wins))});const weapon=arena.weapon(fighter);weapon.minRange=1;weapon.maxRange=1;weapon.rangeStat=null;weapon.uses=0;const enemyWeapon=arena.weapon(rival);if(enemyWeapon){enemyWeapon.minRange=1;enemyWeapon.maxRange=1;enemyWeapon.rangeStat=null;enemyWeapon.uses=0;}const start={[fighter.id]:fighter.hp,[rival.id]:rival.hp},strikes=[];for(let n=0;n<8&&alive(fighter)&&alive(rival);n++)strikes.push.apply(strikes,arena.combat(fighter,rival,false));this.s.seed=arena.s.seed;t.lastRival=cls.name;t.status=!alive(rival)?'won':!alive(fighter)?'lost':'draw';if(t.status==='won')t.wins++;
 this.s.units=this.s.units.filter(v=>!v.temporary);const a=-90001,b=-90002,fa=Object.assign(copy(fighter),{id:a,temporary:true,removed:true}),fb=Object.assign(copy(rival),{id:b,temporary:true,removed:true});this.s.units.push(fa,fb);this.present({type:'combat',a,b,start:{[a]:start[1],[b]:start[2]},strikes:strikes.map(s=>Object.assign(s,{attacker:s.attacker===1?a:b,target:s.target===1?a:b}))});this.present({type:'menu',menu:'arena',unit:u.id});return {status:t.status,rival:cls.name};};
E.finishTournament=function(){const t=this.s.tournament;T.assert(t,'No hay torneo');const u=this.unit(t.unit),payout=t.status==='lost'?0:t.wager+Math.floor(t.wager*t.wins*(t.wins>=t.rounds?1:.5));this.s.gold+=payout;if(u){if(t.wins)this.experience(u,20*t.wins);this.finishAction(u,'combat');}this.s.units=this.s.units.filter(v=>!v.temporary);this.s.tournament=null;return payout;};
})(typeof globalThis!=='undefined'?globalThis:this);

// ===== src/core/04_Data.js =====
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

// ===== src/core/05_Notes.js =====
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

// ===== src/core/06_Easy.js =====
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
