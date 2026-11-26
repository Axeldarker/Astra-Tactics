/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
/*:
 * @target MZ
 * @plugindesc TacticsMZ: reglas tácticas independientes. Cargar antes de TacticsMZ.
 * @author TacticsMZ contributors
 * @help Código bajo MIT. Consulta LICENSE y Manuales dentro del paquete.
 */
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
