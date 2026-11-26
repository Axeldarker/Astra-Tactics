// Astra Editor · ventana "Base de datos" (estilo Lex Talionis): una pestaña por tabla, lista con iconos
// a la izquierda y formulario a la derecha. Escribe en data/*.json (nota F9 incluida), en el paquete de
// gráficos (terrenos, colores de equipo, animaciones, sprites) y en plugins.js (plantillas de enemigo).
"use strict";
(function(){
const Astra=window.Astra,T=window.Tactics,D=T.Editor.Db;
const $=id=>document.getElementById(id);
const esc=s=>Astra.ui.esc(s);
const DB=Astra.dbState={open:false,tab:"actors",sel:{},filter:"",dirty:new Set(),mode:"normal"};
const P=()=>Astra.state.project;
const TABS=[
 {id:"actors",label:"Personajes",icon:"🧑",table:"actors",help:"Los personajes jugables de F9: clase, nivel, inventario y estadísticas propias."},
 {id:"classes",label:"Clases",icon:"🛡",table:"classes",help:"Estadísticas, crecimientos, armas que usan, promociones, sprite de mapa y animaciones de batalla."},
 {id:"weapons",label:"Armas",icon:"⚔",table:"weapons",help:"Poder, golpe, crítico, peso, alcance y efectos especiales."},
 {id:"items",label:"Objetos",icon:"🧪",table:"items",help:"Consumibles, llaves, sellos de promoción y potenciadores."},
 {id:"skills",label:"Habilidades",icon:"✨",table:"skills",help:"Efectos pasivos de clases y personajes."},
 {id:"states",label:"Estados",icon:"☠",table:"states",help:"Veneno, regeneración y modificadores temporales."},
 {id:"terrain",label:"Terrenos",icon:"🌲",help:"Cada terreno es una región de MZ: coste de movimiento, defensa, evasión y curación."},
 {id:"movement",label:"Tabla de movimiento",icon:"🥾",help:"Coste de cada terreno para cada tipo de movimiento. Vacío = coste base. 0 = no puede pasar."},
 {id:"teams",label:"Colores de equipo",icon:"🎨",help:"Colores con los que se pinta cada equipo en el mapa y en la batalla."},
 {id:"presets",label:"Enemigos rápidos",icon:"👾",help:"Plantillas para ★ Enemigo: defines el tipo una vez y lo usas por nombre."},
 {id:"anims",label:"Animaciones",icon:"🎞",help:"Animaciones de batalla del paquete de gráficos. Importa hojas PNG o paquetes de FE Essentials."}
];
const tab=()=>TABS.find(t=>t.id===DB.tab);
const TEAM_NAMES=["Ya actuó (gris)","Jugador","Enemigo","Otro / NPC","Extra"];
let player=null;

// ---------- abrir / cerrar / guardar ----------
Astra.openDatabase=function(tabId){
 if(!P())return;DB.open=true;if(tabId)DB.tab=tabId;$("dbWin").classList.remove("hidden");render();
};
function close(){DB.open=false;if(player)player.stop();$("dbWin").classList.add("hidden");Astra.ui.refresh();updateButton();}
function updateButton(){const b=$("dbBtn");if(b)b.innerHTML="📚 Base de datos"+(DB.dirty.size?" <b>●</b>":"");const s=$("dbSave");if(s){s.disabled=!DB.dirty.size;s.innerHTML=DB.dirty.size?"💾 Guardar <b>●</b>":"💾 Guardado";s.classList.toggle("gold",!!DB.dirty.size);}}
function dirty(what){DB.dirty.add(what);Astra.refreshDatabase(P());updateButton();}
async function save(){
 const p=P();if(!DB.dirty.size)return;
 if(!localStorage.getItem("astra.saveWarned")){const ok=await Astra.ui.modal(`<h2>Antes de guardar</h2><p>Astra escribe directamente en tu proyecto. <b>Cierra RPG Maker MZ</b> mientras guardas, o vuelve a abrir el proyecto después: si no, MZ guardará su copia antigua encima.</p><p class="help">La primera vez que guardas cada archivo se crea una copia: <code>Archivo.json.astra-bak</code>.</p>`,[{label:"Cancelar",value:false},{label:"Entendido, guardar",value:true,cls:"gold"}]);if(!ok)return;localStorage.setItem("astra.saveWarned","1");}
 const done=[];
 try{
  for(const what of [...DB.dirty]){
   if(D.TABLES[what]){const path="data/"+D.TABLES[what].file+".json";await Astra.saveFile(p,path,D.stringifyTable(p[what]));done.push(path);}
   else if(what==="pack"){const path="data/"+p.packName+".json";await Astra.saveFile(p,path,JSON.stringify(p.pack));done.push(path);}
   else if(what==="plugins"){await Astra.saveFile(p,"js/plugins.js",Astra.writePlugins(p.plugins));done.push("js/plugins.js");}
   DB.dirty.delete(what);
  }
  Astra.ui.toast("💾 Guardado: "+done.join(", "));
 }catch(e){Astra.ui.modal(`<h2>No se pudo guardar</h2><p class="error">${esc(e.message)}</p>`,[{label:"Vale",value:0}]);}
 updateButton();
}
// Paquete de gráficos: si el proyecto no tiene, se crea data/AstraGraphics.json y se apunta en el plugin.
function ensurePack(){
 const p=P();if(p.pack)return p.pack;
 const mz=p.plugins.find(x=>x.name==="TacticsMZ");T.assert(mz,"Primero instala TacticsMZ (botón Actualizar del panel derecho).");
 p.pack=D.emptyPack();p.pack.terrain=p.terrain;p.packName="AstraGraphics";mz.parameters=Object.assign({},mz.parameters,{ResourcePack:"AstraGraphics"});p.tacticsParams=mz.parameters;
 dirty("pack");dirty("plugins");Astra.ui.toast("Creado el paquete de gráficos data/AstraGraphics.json");return p.pack;
}

// ---------- render ----------
function render(){
 const t=tab();
 $("dbTabs").innerHTML=TABS.map(x=>`<button class="dbtab${x.id===DB.tab?" on":""}" data-tab="${x.id}"><i>${x.icon}</i>${esc(x.label)}${x.table&&DB.dirty.has(x.table)?" ●":""}</button>`).join("");
 $("dbHint").textContent=t.help;
 const single=t.id==="movement";$("dbWin").classList.toggle("single",single);
 if(!single)renderList();
 renderForm();updateButton();
}
// Entradas de la lista de cada pestaña.
function entries(){
 const p=P(),t=tab(),db=p.db;
 const rowsOf=table=>(p[table]||[]).filter(r=>r);
 switch(t.id){
  case "actors":return rowsOf("actors").map(r=>{const c=db.classes[r.classId];return {id:r.id,label:r.name||"(sin nombre)",sub:(c?c.name:"sin clase")+" · Nv "+(r.initialLevel||1),icon:`<canvas width="32" height="32" data-actor="${r.id}"></canvas>`};});
  case "classes":return rowsOf("classes").map(r=>{const c=db.classes[r.id]||{};return {id:r.id,label:r.name||"(sin nombre)",sub:(D.MOVE_TYPES[c.moveType]||c.moveType||"")+" · "+(c.weaponTypes||[]).map(w=>D.WEAPON_TYPES[w]||w).join(", "),icon:`<canvas width="32" height="32" data-class="${r.id}"></canvas>`};});
  case "weapons":return rowsOf("weapons").map(r=>{const w=db.weapons[r.id]||{};return {id:r.id,label:r.name||"(sin nombre)",sub:(D.WEAPON_TYPES[w.category]||w.category||"")+" · Pod "+w.might+" · Gol "+w.hit,icon:`<canvas width="32" height="32" data-item="weapon:${r.id}"></canvas>`};});
  case "items":return rowsOf("items").map(r=>{const i=db.items[r.id]||{};return {id:r.id,label:r.name||"(sin nombre)",sub:D.ITEM_EFFECTS[i.effect]||i.effect||"",icon:`<canvas width="32" height="32" data-item="item:${r.id}"></canvas>`};});
  case "skills":case "states":return rowsOf(t.id).map(r=>{const s=db[t.id][r.id]||{};return {id:r.id,label:r.name||"(sin nombre)",sub:(s.effects||[]).map(e=>(D.EFFECTS[e.type]||[e.type])[0]).join(", ")||"sin efectos",icon:`<canvas width="32" height="32" data-iconset="${r.iconIndex||0}"></canvas>`};});
  case "terrain":return terrainIds().map(id=>{const r=p.terrain[id];return {id,label:id+" · "+(r.name||""),sub:r.cost>0?"coste "+r.cost+(r.defense?" · def +"+r.defense:"")+(r.avoid?" · eva +"+r.avoid:""):"intransitable",icon:`<b class="sw" style="background:${esc(r.color||"#667f60")}"></b>`};});
  case "teams":{const pal=p.pack&&p.pack.palette;return pal?pal.teams.map((tm,i)=>({id:i,label:TEAM_NAMES[i]||"Equipo "+i,sub:"",icon:`<span class="swatches">${tm.slice(0,6).map(c=>`<b style="background:rgb(${c.join(",")})"></b>`).join("")}</span>`})):[];}
  case "presets":return presets().map((x,i)=>({id:i,label:x.name||"(sin nombre)",sub:((db.classes[x.classId]||{}).name||"sin clase")+" · Nv "+x.level+" · "+((T.roles[x.role]||{}).label||x.role),icon:`<canvas width="32" height="32" data-class="${x.classId}" data-team="2"></canvas>`}));
  case "anims":return Object.values(D.animations(p.pack)).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>({id:a.name,label:a.name,sub:Object.keys(a.modes).map(m=>D.MODES[m]).join(" · "),icon:`<canvas width="32" height="32" data-anim="${esc(a.modes.normal||Object.values(a.modes)[0])}"></canvas>`}));
 }
 return [];
}
const terrainIds=()=>Object.keys(P().terrain).map(Number).sort((a,b)=>a-b);
function presets(){const p=P();if(!DB.presets)DB.presets=D.decodePresets(p.tacticsParams.EnemyPresets);return DB.presets;}
function renderList(){
 const t=tab(),all=entries();if(DB.sel[t.id]===undefined||!all.some(e=>String(e.id)===String(DB.sel[t.id])))DB.sel[t.id]=all.length?(t.id==="teams"&&all[1]?all[1].id:all[0].id):null;
 const creatable=t.table||["terrain","presets"].indexOf(t.id)>=0;
 $("dbList").innerHTML=`<div class="dbsearch"><input id="dbFilter" placeholder="Buscar por nombre o ID…" value="${esc(DB.filter)}"></div><div class="dbitems" id="dbItems"></div>
  <div class="dbactions">${creatable?`<button class="btn small" data-act="new">＋ Nuevo</button>`:""}${t.table||t.id==="presets"?`<button class="btn small" data-act="dup">⧉ Duplicar</button>`:""}${t.id==="anims"?`<button class="btn small gold" data-act="import">📤 Importar animación</button>`:""}${t.id==="presets"?`<button class="btn small danger" data-act="delpreset">🗑</button>`:""}</div>`;
 renderItems(all);
}
function renderItems(all){
 const t=tab(),q=T.notes.plain(DB.filter),list=(all||entries()).filter(e=>!q||T.notes.plain(e.label+" "+e.sub).includes(q)||String(e.id)===q);
 $("dbItems").innerHTML=list.map(e=>`<button class="dbitem${String(e.id)===String(DB.sel[t.id])?" on":""}" data-sel="${esc(e.id)}"><span class="ic">${e.icon}</span><span class="tx"><b>${t.table?`<small>${e.id}</small> `:""}${esc(e.label)}</b><small>${esc(e.sub)}</small></span></button>`).join("")||`<p class="help" style="padding:12px">Nada por aquí.</p>`;
 Astra.paintIcons($("dbItems"));paintAnimThumbs($("dbItems"));
}
async function paintAnimThumbs(root){
 const p=P();for(const c of root.querySelectorAll("canvas[data-anim]")){const clip=p.pack&&p.pack.clips[c.dataset.anim];if(!clip)continue;const src=await Astra.clipSource(p,clip),f=src.frames[0]||[];
  const x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);f.forEach(l=>{const a=src.atlases[l.atlas];const r=a&&a.rects[l.rect];if(!r||!a.image)return;const W=c.width,H=c.height,s=Math.min(W/32*2,(H-4)/r.h,(W-4)/r.w);x.imageSmoothingEnabled=false;x.drawImage(a.image,r.x,r.y,r.w,r.h,(W-r.w*s)/2,H-2-r.h*s,r.w*s,r.h*s);});}
}

// ---------- formularios ----------
const opt=(v,label,sel)=>`<option value="${esc(v)}"${sel?" selected":""}>${esc(label)}</option>`;
const F={
 text:(k,label,v,extra)=>`<label class="f"><span>${label}</span><input data-k="${k}" data-t="text" value="${esc(v===undefined?"":v)}" ${extra||""}></label>`,
 area:(k,label,v)=>`<label class="f wide"><span>${label}</span><textarea data-k="${k}" data-t="text">${esc(v||"")}</textarea></label>`,
 num:(k,label,v,ph)=>`<label class="f"><span>${label}</span><input type="number" data-k="${k}" data-t="num" value="${v===undefined||v===null?"":esc(v)}" placeholder="${esc(ph===undefined?"":ph)}"></label>`,
 sel:(k,label,v,options,numeric)=>`<label class="f"><span>${label}</span><select data-k="${k}" data-t="${numeric?"seln":"sel"}">${options.map(o=>opt(o[0],o[1],String(o[0])===String(v))).join("")}</select></label>`,
 bool:(k,label,v)=>`<label class="f check"><span>${label}</span><input type="checkbox" data-k="${k}" data-t="bool"${v?" checked":""}></label>`,
 color:(k,label,v)=>`<label class="f"><span>${label}</span><input type="color" data-k="${k}" data-t="text" value="${esc(v||"#667f60")}"></label>`
};
const refOpts=(table,none)=>[[0,none||"— ninguno —"]].concat((P()[table]||[]).filter(r=>r&&r.name).map(r=>[r.id,r.id+" · "+r.name]));
const kv=obj=>Object.keys(obj).map(k=>[k,obj[k]]);
const withCustom=(obj,v)=>kv(obj).concat(v&&!obj[v]?[[v,v]]:[]);
const section=(title,body,extra)=>`<div class="dbsec"><h3>${title}${extra||""}</h3>${body}</div>`;
function hero(canvas,title,sub){return `<div class="dbhero">${canvas}<div><div class="name">${esc(title)}</div><div class="sub">${sub}</div></div></div>`;}
function statsTable(rows){
 return `<div class="stattable"><table><tr><th></th>${D.STATS.map(s=>`<th>${D.STAT_LABELS[s]}</th>`).join("")}</tr>${rows.map(r=>`<tr><th>${r.label}</th>${D.STATS.map(s=>`<td><input type="number" data-k="${r.key}" data-t="stat" data-s="${s}" value="${r.value&&r.value[s]!==undefined?r.value[s]:""}" placeholder="${r.ph&&r.ph[s]!==undefined?r.ph[s]:""}"></td>`).join("")}</tr>`).join("")}</table></div>`;
}
function listChips(key,ids,table){
 const p=P();return `<div class="chips">${(ids||[]).map((id,i)=>`<span class="chip">${table==="skills"?`<canvas width="20" height="20" data-iconset="${(p.skills[id]||{}).iconIndex||0}"></canvas>`:table==="classes"?`<canvas width="20" height="20" data-class="${id}"></canvas>`:""}${esc(((p[table]||[])[id]||{}).name||"#"+id)}<button data-act="rm" data-k="${key}" data-i="${i}">✕</button></span>`).join("")}
  <select data-k="${key}" data-t="add">${opt("","＋ añadir…")}${(p[table]||[]).filter(r=>r&&r.name).map(r=>opt(r.id,r.id+" · "+r.name)).join("")}</select></div>`;
}
function inventory(key,inv){
 const p=P();return `<div class="inv">${(inv||[]).map((it,i)=>{const row=(it.kind==="weapon"?p.weapons:p.items)[it.id]||{};return `<div class="invrow"><canvas width="24" height="24" data-item="${it.kind}:${it.id}"></canvas><span>${esc(row.name||"#"+it.id)}</span><small>${it.kind==="weapon"?"arma":"objeto"}</small><button data-act="rm" data-k="${key}" data-i="${i}">✕</button></div>`;}).join("")||`<p class="help">Vacío.</p>`}
  <select data-k="${key}" data-t="inv">${opt("","＋ añadir arma u objeto…")}<optgroup label="Armas">${p.weapons.filter(r=>r&&r.name).map(r=>opt("weapon:"+r.id,r.name)).join("")}</optgroup><optgroup label="Objetos">${p.items.filter(r=>r&&r.name).map(r=>opt("item:"+r.id,r.name)).join("")}</optgroup></select></div>`;
}
function effectsTable(list){
 return `<div class="effects">${(list||[]).map((e,i)=>{const def=D.EFFECTS[e.type]||[e.type,"value"],num=def[1];return `<div class="effrow"><select data-k="effects" data-t="eff" data-i="${i}" data-s="type">${withCustom(Object.fromEntries(Object.keys(D.EFFECTS).map(k=>[k,D.EFFECTS[k][0]])),e.type).map(o=>opt(o[0],o[1],o[0]===e.type)).join("")}</select>
  ${e.type==="stat"?`<select data-k="effects" data-t="eff" data-i="${i}" data-s="stat">${D.STATS.map(s=>opt(s,D.STAT_LABELS[s],s===e.stat)).join("")}</select>`:""}
  ${num?`<input type="number" data-k="effects" data-t="eff" data-i="${i}" data-s="${num}" value="${e[num]===undefined?"":e[num]}" placeholder="${num==="chance"?"% prob.":"valor"}" title="${num==="chance"?"Probabilidad (%)":"Valor"}">`:"<span></span>"}
  <button data-act="rm" data-k="effects" data-i="${i}">✕</button></div>`;}).join("")||`<p class="help">Sin efectos.</p>`}<button class="btn small" data-act="addeff">＋ Efecto</button></div>`;
}
function renderForm(){
 const t=tab(),el=$("dbForm"),scroll=el.scrollTop;if(player){player.stop();player=null;}
 let html="";try{html=formHtml(t);}catch(e){html=`<p class="error">✖ ${esc(e.message)}</p>`;}
 el.innerHTML=html;el.scrollTop=scroll;Astra.paintIcons(el);paintAnimThumbs(el);
 if(t.id==="anims")startPlayer();
}
function formHtml(t){
 const p=P(),id=DB.sel[t.id];
 if(t.table){const row=p[t.table][id];if(!row)return `<p class="help">Elige algo de la lista o crea uno nuevo.</p>`;return FORMS[t.id](row,D.effective(t.table,row),D.fields(row,t.table));}
 return FORMS[t.id](id);
}
const FORMS={
 actors(row,e,f){
  const p=P(),cls=p.db.classes[row.classId]||{},variants=Object.keys(cls.variants||{});
  return hero(`<canvas class="portrait" width="96" height="96" data-actor="${row.id}"></canvas><canvas class="mini" width="48" height="48" data-class="${row.classId}"></canvas>`,row.name||"",`ID ${row.id} · ${esc(cls.name||"sin clase")} <button class="btn small" data-act="portrait">🙂 Importar retrato</button>`)
  +section("Datos",F.text("name","Nombre",row.name)+F.sel("classId","Clase",row.classId,refOpts("classes"),true)+F.num("initialLevel","Nivel inicial",row.initialLevel)
   +(variants.length?F.sel("variant","Variante de la clase",e.variant||"",[["","(normal)"]].concat(variants.map(v=>[v,v]))):"")
   +F.text("affinity","Afinidad",e.affinity)+F.text("group","Grupo",e.group)+F.color("color","Color",e.color||"#61adcf")+F.area("profile","Perfil",row.profile)+F.text("deathQuote","Frase al caer",e.deathQuote))
  +section("Estadísticas propias",`<p class="help">Vacío = usa el valor de la clase (en gris).</p>`+statsTable([{label:"Bases",key:"stats",value:f.stats,ph:cls.stats},{label:"Crecimientos %",key:"growth",value:f.growth,ph:cls.growth}]))
  +section("Inventario inicial",inventory("inventory",e.inventory))
  +section("Habilidades personales",listChips("skills",e.skills,"skills"));
 },
 classes(row,e){
  const p=P(),pack=p.pack,arts=pack&&pack.units?Object.keys(pack.units).sort():[],anims=Object.keys(D.animations(pack)).sort();
  const types=[...new Set(Object.keys(D.WEAPON_TYPES).concat(e.weaponTypes||[]))],ba=e.battleAnimations||{};
  return hero(`<canvas class="portrait" width="96" height="96" data-class="${row.id}"></canvas><span class="teams3">${[1,2,3].map(tm=>`<canvas width="32" height="32" data-class="${row.id}" data-team="${tm}"></canvas>`).join("")}</span>`,row.name||"",`ID ${row.id} · ${esc(D.MOVE_TYPES[e.moveType]||e.moveType)}`)
  +section("Datos",F.text("name","Nombre",row.name)+F.sel("moveType","Tipo de movimiento",e.moveType,withCustom(D.MOVE_TYPES,e.moveType))
   +F.num("maxLevel","Nivel máximo",e.maxLevel,20)+F.num("promoteLevel","Nivel para promocionar",e.promoteLevel,10)+F.num("capacity","Capacidad de rescate",e.capacity)+F.num("vision","Visión (niebla)",e.vision)+F.text("tags","Etiquetas (coma)",(e.tags||[]).join(", "),'data-list="1"'))
  +section("Sprite de mapa",`<div class="artrow"><select data-k="art" data-t="sel">${opt("","— ninguno —")}${arts.map(a=>opt(a,a,a===e.art)).join("")}${e.art&&arts.indexOf(e.art)<0?opt(e.art,e.art+" (no existe)",true):""}</select><button class="btn small" data-act="mapsprite">📤 Subir sprite</button></div>`)
  +section("Estadísticas",statsTable([{label:"Bases",key:"stats",value:e.stats},{label:"Crecimientos %",key:"growth",value:e.growth},{label:"Bono al promocionar",key:"promotionBonus",value:e.promotionBonus||{}}]))
  +section("Armas y animaciones de batalla",`<div class="wtable"><div class="wh"><span>Arma</span><span>Usa</span><span>Rango inicial</span><span>Animación de batalla</span><span></span></div>${types.map(w=>{const on=(e.weaponTypes||[]).indexOf(w)>=0,entry=ba[w],cur=entry?String(typeof entry==="string"?entry:entry.normal||"").replace(/:(normal|critical|miss)$/,""):"",far=ba[w+":far"];
   return `<div class="wr${on?"":" off"}"><span>${esc(D.WEAPON_TYPES[w]||w)}</span><input type="checkbox" data-k="weaponTypes" data-t="wtype" data-s="${esc(w)}"${on?" checked":""}><input type="number" data-k="ranks" data-t="stat" data-s="${esc(w)}" value="${(e.ranks||{})[w]===undefined?"":(e.ranks||{})[w]}" ${on?"":"disabled"}>
    <select data-k="battleAnimations" data-t="banim" data-s="${esc(w)}" ${on?"":"disabled"}>${opt("","— la del sprite —")}${anims.map(a=>opt(a,a,a===cur)).join("")}${cur&&anims.indexOf(cur)<0?opt(cur,cur+" (no existe)",true):""}</select>
    <button class="btn small" data-act="playanim" data-s="${esc(cur)}" ${cur?"":"disabled"} title="Ver">▶</button>${far?`<small class="far">+ a distancia: ${esc(String(far.normal||far).replace(/:normal$/,""))}</small>`:""}</div>`;}).join("")}</div>`)
  +section("Promociona a",listChips("promotions",e.promotions,"classes"))
  +section("Habilidades de clase",listChips("skills",e.skills,"skills")+`<h4>Aprende al subir de nivel</h4><div class="learn">${(e.learn||[]).map((l,i)=>`<div class="lrow">Nv <input type="number" data-k="learn" data-t="learn" data-i="${i}" data-s="level" value="${l.level}"><select data-k="learn" data-t="learn" data-i="${i}" data-s="skill">${refOpts("skills").map(o=>opt(o[0],o[1],o[0]===l.skill)).join("")}</select><button data-act="rm" data-k="learn" data-i="${i}">✕</button></div>`).join("")}<button class="btn small" data-act="addlearn">＋ Habilidad por nivel</button></div>`)
  +section("Inventario de los enemigos de esta clase",inventory("inventory",e.inventory));
 },
 weapons(row,e){
  const p=P(),spells=Object.keys((p.pack&&p.pack.spells&&p.pack.spells.definitions)||{});
  return hero(`<canvas class="portrait icon" width="96" height="96" data-item="weapon:${row.id}"></canvas>`,row.name||"",`ID ${row.id} · ${esc(D.WEAPON_TYPES[e.category]||e.category)} <button class="btn small" data-act="icon">🖼 Importar icono</button>`)
  +section("Datos",F.text("name","Nombre",row.name)+F.area("description","Descripción",row.description)+F.num("iconIndex","Icono (IconSet)",row.iconIndex)+F.num("price","Precio",e.price))
  +section("Combate",`<div class="grid3">${F.sel("category","Tipo",e.category,withCustom(D.WEAPON_TYPES,e.category))+F.num("might","Poder",e.might)+F.num("hit","Golpe",e.hit)+F.num("crit","Crítico",e.crit)+F.num("weight","Peso",e.weight)+F.num("uses","Usos",e.uses)
   +F.num("minRange","Alcance mín.",e.minRange)+F.num("maxRange","Alcance máx.",e.maxRange)+F.num("rank","Rango necesario",e.rank)+F.num("hits","Golpes por ataque",e.hits,1)+F.bool("magic","Mágica (usa Mag/Res)",e.magic)}</div>`
   +`<div class="f wide"><span>Eficaz contra</span><div class="chips">${kv(D.MOVE_TYPES).map(([k,l])=>`<label class="chip"><input type="checkbox" data-k="effective" data-t="flag" data-s="${k}"${(e.effective||[]).indexOf(k)>=0?" checked":""}> ${l}</label>`).join("")}</div></div>`)
  +section("Extras",F.bool("staff","Es un bastón",e.staff)+(e.staff?F.sel("effect","Efecto del bastón",e.effect,withCustom(D.ITEM_EFFECTS,e.effect))+F.num("power","Potencia",e.power):"")
   +(spells.length?F.sel("spell","Hechizo (animación)",e.spell||"",[["","— ninguno —"]].concat(spells.map(s=>[s,(p.pack.spells.definitions[s].name||s)]))):"")
   +F.sel("state","Causa el estado",e.state||0,refOpts("states"),true)+(e.state?F.num("stateTurns","Turnos del estado",e.stateTurns,2):""));
 },
 items(row,e){
  const p=P();
  return hero(`<canvas class="portrait icon" width="96" height="96" data-item="item:${row.id}"></canvas>`,row.name||"",`ID ${row.id} · ${esc(D.ITEM_EFFECTS[e.effect]||e.effect)} <button class="btn small" data-act="icon">🖼 Importar icono</button>`)
  +section("Datos",F.text("name","Nombre",row.name)+F.area("description","Descripción",row.description)+F.num("iconIndex","Icono (IconSet)",row.iconIndex)+F.num("price","Precio",e.price)+F.num("uses","Usos (0 = infinito)",e.uses))
  +section("Efecto",F.sel("effect","Qué hace",e.effect,withCustom(D.ITEM_EFFECTS,e.effect))
   +(["heal","torch","boost","growth","rank"].indexOf(e.effect)>=0?F.num("power","Potencia",e.power):"")
   +(["boost","growth"].indexOf(e.effect)>=0?F.sel("stat","Estadística",e.stat||"power",D.STATS.map(s=>[s,D.STAT_LABELS[s]])):"")
   +(e.effect==="rank"?F.sel("category","Tipo de arma",e.category||"blade",withCustom(D.WEAPON_TYPES,e.category)):"")
   +(e.effect==="promote"?F.sel("classId","Promociona a",e.classId||0,refOpts("classes","— la que elija el jugador —"),true):"")
   +(e.effect==="key"?F.sel("key","Abre",e.key||"all",kv(D.KEYS)):"")+(e.effect==="torch"?F.num("turns","Turnos",e.turns):"")
   +F.bool("accessory","Accesorio (se equipa)",e.accessory)+F.bool("bound","Ligado (no se puede tirar)",e.bound));
 },
 skills(row,e){return hero(`<canvas class="portrait icon" width="96" height="96" data-iconset="${row.iconIndex||0}"></canvas>`,row.name||"",`ID ${row.id}`)
  +section("Datos",F.text("name","Nombre",row.name)+F.area("description","Descripción",row.description)+F.num("iconIndex","Icono (IconSet)",row.iconIndex))+section("Efectos",effectsTable(e.effects));},
 states(row,e){return hero(`<canvas class="portrait icon" width="96" height="96" data-iconset="${row.iconIndex||0}"></canvas>`,row.name||"",`ID ${row.id}`)
  +section("Datos",F.text("name","Nombre",row.name)+F.num("iconIndex","Icono (IconSet)",row.iconIndex))+section("Efectos",effectsTable(e.effects));},
 terrain(id){
  const r=P().terrain[id];if(!r)return `<p class="help">Elige un terreno.</p>`;const types=moveTypes();
  return hero(`<b class="bigsw" style="background:${esc(r.color||"#667f60")}"></b>`,r.name||"",`Región ${id} de MZ`)
  +section("Datos",F.text("name","Nombre",r.name)+F.color("color","Color en el editor",r.color)+F.num("cost","Coste de movimiento (0 = no se puede pasar)",r.cost)+F.num("defense","Defensa",r.defense)+F.num("avoid","Evasión",r.avoid)+F.num("heal","Curación por turno",r.heal))
  +section("Coste por tipo de movimiento",`<p class="help">Vacío = coste normal (${r.cost}).</p>`+types.map(mt=>`<label class="f"><span>${esc(D.MOVE_TYPES[mt]||mt)}</span><input type="number" data-k="costs" data-t="stat" data-s="${esc(mt)}" value="${(r.costs||{})[mt]===undefined?"":(r.costs||{})[mt]}" placeholder="${r.cost}"></label>`).join(""));
 },
 movement(){
  const p=P(),types=moveTypes();
  return `<div class="dbsec"><h3>🥾 Tabla de movimiento</h3><p class="help">Filas = terrenos, columnas = tipos de movimiento. Vacío = coste base. 0 = no se puede pasar.</p><div class="mtable"><table><tr><th>Terreno</th><th>Base</th>${types.map(t=>`<th>${esc(D.MOVE_TYPES[t]||t)}</th>`).join("")}</tr>
  ${terrainIds().map(id=>{const r=p.terrain[id];return `<tr><th><b class="sw" style="background:${esc(r.color||"#667f60")}"></b>${id} · ${esc(r.name||"")}</th><td><input type="number" data-t="mcell" data-id="${id}" data-s="" value="${r.cost}"></td>${types.map(t=>{const v=(r.costs||{})[t];return `<td class="${v===0?"block":""}"><input type="number" data-t="mcell" data-id="${id}" data-s="${esc(t)}" value="${v===undefined?"":v}" placeholder="${r.cost}"></td>`;}).join("")}</tr>`;}).join("")}</table></div></div>`;
 },
 teams(i){
  const p=P(),pal=p.pack&&p.pack.palette;
  if(!pal)return section("Colores de equipo",`<p class="help">Tu paquete de gráficos no define paleta por equipos (<code>palette</code>). Los sprites se ven con sus colores originales.</p>`);
  const team=pal.teams[i];if(!team)return "";const arts=Object.keys(p.pack.units||{}).slice(0,6);
  return hero(`<span class="teams3">${arts.slice(0,3).map(a=>`<canvas width="48" height="48" data-art="${esc(a)}" data-team="${i}"></canvas>`).join("")}</span>`,TEAM_NAMES[i]||"Equipo "+i,"Cada color original se cambia por el de este equipo")
  +section("Colores",`<div class="palette">${pal.source.map((c,j)=>`<label class="pc"><b style="background:rgb(${c.join(",")})" title="Original"></b>→<input type="color" data-t="pal" data-i="${i}" data-s="${j}" value="${"#"+(team[j]||c).map(v=>Number(v).toString(16).padStart(2,"0")).join("")}"></label>`).join("")}</div>`)
  +section("Vista previa",`<div class="teamprev">${arts.map(a=>`<canvas width="48" height="48" data-art="${esc(a)}" data-team="${i}"></canvas>`).join("")}</div>`);
 },
 presets(i){
  const x=presets()[i];if(!x)return `<p class="help">Crea una plantilla con «＋ Nuevo».</p>`;
  return hero(`<canvas class="portrait" width="96" height="96" data-class="${x.classId}" data-team="2"></canvas>`,x.name||"(sin nombre)",`Úsala escribiendo «${esc(x.name)}» en ★ Enemigo`)
  +section("Plantilla",F.text("name","Nombre",x.name)+F.sel("classId","Clase",x.classId,refOpts("classes"),true)+F.num("level","Nivel",x.level)+F.sel("role","Rol",x.role,Object.keys(T.roles).map(k=>[k,T.roles[k].label]))
   +F.sel("weaponId","Arma (0 = la de la clase)",x.weaponId,refOpts("weapons","— la de la clase —"),true)+F.sel("itemId","Objeto",x.itemId,refOpts("items"),true)+F.bool("loot","Suelta lo que lleva",x.loot));
 },
 anims(name){
  const p=P(),a=D.animations(p.pack)[name];
  if(!a)return section("Animaciones de batalla",`<p class="help">Aún no hay animaciones. Pulsa <b>📤 Importar animación</b>: acepta hojas PNG en rejilla y los paquetes de <b>FE Essentials</b> / FE Repo / FEBuilder (.zip, carpeta o script .txt + PNG).</p>`);
  if(!a.modes[DB.mode])DB.mode=Object.keys(a.modes)[0];
  const users=D.animationUsers(p.db.classes,name),clip=p.pack.clips[a.modes[DB.mode]]||{};
  return hero(`<canvas class="portrait" width="96" height="96" data-anim="${esc(a.modes.normal||Object.values(a.modes)[0])}"></canvas>`,name,`${(clip.frames||[]).length} fotogramas · ${((clip.frames||[]).length/(clip.fps||60)).toFixed(2)} s · golpe en ${clip.impact||0}`)
  +`<div class="dbsec"><div class="tabs">${Object.keys(D.MODES).filter(m=>a.modes[m]).map(m=>`<button class="${DB.mode===m?"on":""}" data-mode="${m}">${D.MODES[m]}</button>`).join("")}<span class="grow"></span><select id="dbRival" title="Con quién se compara (mismo tamaño que en el juego)">${Astra.rivalOptions(p,Astra.rivalName())}</select><button class="btn small" data-act="flip" title="Si mira hacia el lado equivocado. Se aplica también en el juego.">↔ Voltear${D.isFlipped(p.pack,name)?" ✓":""}</button><button class="btn small" data-act="pause">⏯</button><button class="btn small" data-act="slow">🐢 ×${DB.speed||1}</button></div><canvas id="dbPlayer" class="player" width="520" height="300"></canvas></div>`
  +section("La usan",users.length?`<div class="chips">${users.map(u=>`<button class="chip" data-goclass="${u.classId}">${esc(u.label)}</button>`).join("")}</div>`:`<p class="help">Ninguna clase. Asígnala en <b>Clases → Armas y animaciones de batalla</b>.</p>`);
 }
};
function moveTypes(){const p=P(),set=new Set(Object.keys(D.MOVE_TYPES));Object.values(p.db.classes).forEach(c=>{if(c&&c.moveType)set.add(c.moveType);});Object.values(p.terrain).forEach(r=>Object.keys(r.costs||{}).forEach(k=>set.add(k)));return [...set];}
async function startPlayer(){
 const p=P(),name=DB.sel.anims,a=D.animations(p.pack)[name],cv=$("dbPlayer");if(!a||!cv)return;
 const clip=p.pack.clips[a.modes[DB.mode]];if(!clip)return;const src=await Astra.clipSource(p,clip);if(!$("dbPlayer"))return;
 if(player)player.stop();player=new Astra.Player(cv);player.speed=DB.speed||1;player.load(src);player.start();
 const rival=await Astra.rivalSource(p,Astra.rivalName());if(player)player.setRival(rival);
}

// ---------- cambios ----------
function current(){const t=tab(),p=P();if(t.table){const row=p[t.table][DB.sel[t.id]];return {row,eff:row&&D.effective(t.table,row),fields:row&&D.fields(row,t.table)};}return {};}
function setValue(key,value){
 const t=tab(),p=P();
 if(t.table){const row=p[t.table][DB.sel[t.id]];if(!row)return;D.set(t.table,row,key,value);dirty(t.table);}
 else if(t.id==="terrain"){const r=p.terrain[DB.sel.terrain];if(value===undefined)delete r[key];else r[key]=value;ensurePack();p.pack.terrain=p.terrain;p.terrainColors=null;dirty("pack");}
 else if(t.id==="presets"){const x=presets()[DB.sel.presets];x[key]=value;savePresets();}
}
function savePresets(){const p=P(),mz=p.plugins.find(x=>x.name==="TacticsMZ");T.assert(mz,"Primero instala TacticsMZ.");mz.parameters=Object.assign({},mz.parameters,{EnemyPresets:D.encodePresets(DB.presets)});p.tacticsParams=mz.parameters;T.setEnemyPresets(DB.presets);dirty("plugins");}
function onChange(ev){
 const el=ev.target,ty=el.dataset.t;
 if(el.id==="dbRival"){localStorage.setItem("astra.rival",el.value);Astra.rivalSource(P(),el.value).then(r=>{if(player)player.setRival(r);});return;}
 if(!ty)return;
 try{
  const k=el.dataset.k,s=el.dataset.s,i=Number(el.dataset.i),raw=el.type==="checkbox"?el.checked:el.value,num=raw===""?undefined:Number(raw);
  const {eff,fields}=current();const p=P();const t=tab();
  const curOf=key=>t.id==="terrain"?p.terrain[DB.sel.terrain][key]:t.id==="actors"&&(key==="stats"||key==="growth")?fields[key]:eff&&eff[key];
  switch(ty){
   case "text":{let v=raw;if(el.dataset.list)v=String(raw).split(",").map(x=>x.trim()).filter(Boolean);setValue(k,v===""&&t.table&&D.NATIVE[t.table].indexOf(k)<0?undefined:v);break;}
   case "num":setValue(k,num);break;
   case "sel":setValue(k,raw===""&&t.table&&D.NATIVE[t.table].indexOf(k)<0?undefined:raw);break;
   case "seln":setValue(k,Number(raw)||0);break;
   case "bool":setValue(k,!!raw);break;
   case "stat":{const o=Object.assign({},curOf(k)||{});if(num===undefined)delete o[s];else o[s]=num;setValue(k,Object.keys(o).length?o:undefined);break;}
   case "add":if(raw){setValue(k,(curOf(k)||[]).concat(Number(raw)));}break;
   case "inv":if(raw){const [kind,id]=raw.split(":");setValue(k,(curOf(k)||[]).concat({kind,id:Number(id)}));}break;
   case "flag":{const set=new Set(curOf(k)||[]);if(raw)set.add(s);else set.delete(s);setValue(k,[...set]);break;}
   case "wtype":{const types=(eff.weaponTypes||[]).filter(w=>w!==s).concat(raw?[s]:[]),ranks=Object.assign({},eff.ranks||{});if(raw&&ranks[s]===undefined)ranks[s]=0;if(!raw)delete ranks[s];setValue("weaponTypes",types);setValue("ranks",ranks);break;}
   case "banim":{const o=Object.assign({},eff.battleAnimations||{});if(raw)o[s]={normal:raw+":normal",critical:raw+":critical",miss:raw+":miss"};else delete o[s];setValue("battleAnimations",Object.keys(o).length?o:undefined);break;}
   case "learn":{const l=(eff.learn||[]).map(x=>Object.assign({},x));l[i][s]=Number(raw)||0;setValue("learn",l);break;}
   case "eff":{const l=(eff.effects||[]).map(x=>Object.assign({},x));if(s==="type"){l[i]={type:raw};const d=D.EFFECTS[raw];if(raw==="stat"){l[i].stat="power";l[i].value=1;}else if(d&&d[1])l[i][d[1]]=d[1]==="chance"?30:1;}else if(s==="stat")l[i].stat=raw;else{if(num===undefined)delete l[i][s];else l[i][s]=num;}setValue("effects",l);break;}
   case "mcell":{const r=p.terrain[el.dataset.id];if(!s){r.cost=num||0;}else{r.costs=Object.assign({},r.costs);if(num===undefined)delete r.costs[s];else r.costs[s]=num;}ensurePack();p.pack.terrain=p.terrain;p.terrainColors=null;dirty("pack");el.parentNode.classList.toggle("block",num===0&&!!s);return;}
   case "pal":{const c=el.value;p.pack.palette.teams[i][Number(s)]=[1,3,5].map(j=>parseInt(c.slice(j,j+2),16));Astra.clearArtCache();dirty("pack");break;}
  }
  render();
 }catch(e){Astra.ui.toast("✖ "+e.message);}
}
async function onClick(ev){
 const b=ev.target.closest("[data-tab],[data-sel],[data-act],[data-mode],[data-goclass]");if(!b)return;
 const p=P(),t=tab();
 try{
  if(b.dataset.tab){DB.tab=b.dataset.tab;DB.filter="";render();return;}
  if(b.dataset.sel!==undefined){DB.sel[t.id]=t.id==="anims"?b.dataset.sel:Number(b.dataset.sel);render();return;}
  if(b.dataset.mode){DB.mode=b.dataset.mode;renderForm();return;}
  if(b.dataset.goclass){DB.tab="classes";DB.sel.classes=Number(b.dataset.goclass);render();return;}
  const act=b.dataset.act,{eff}=current();
  if(act==="rm"){const k=b.dataset.k,i=Number(b.dataset.i),cur=(t.id==="actors"&&(k==="skills"||k==="inventory")?eff[k]:eff[k])||[];setValue(k,cur.filter((x,j)=>j!==i));render();return;}
  if(act==="addeff"){setValue("effects",(eff.effects||[]).concat({type:"stat",stat:"power",value:1}));render();return;}
  if(act==="addlearn"){setValue("learn",(eff.learn||[]).concat({level:5,skill:((p.skills||[]).find(r=>r&&r.name)||{id:1}).id}));render();return;}
  if(act==="new"||act==="dup"){
   if(t.table){const list=p[t.table],from=act==="dup"?list[DB.sel[t.id]]:null;if(act==="dup"&&!from)return;const row=D.create(list,t.table,act==="new"?"Nuevo "+t.label.toLowerCase().replace(/s$/,""):null,from);DB.sel[t.id]=row.id;dirty(t.table);DB.filter="";render();Astra.ui.toast("Creado: "+row.id+" · "+row.name+". Recuerda guardar.");return;}
   if(t.id==="terrain"){const id=[...Array(256).keys()].find(i=>i>0&&!p.terrain[i]);T.assert(id,"No quedan regiones libres (1-255).");p.terrain[id]={name:"Nuevo",cost:1,defense:0,avoid:0,heal:0,color:"#7aa05a"};ensurePack();p.pack.terrain=p.terrain;dirty("pack");DB.sel.terrain=id;render();return;}
   if(t.id==="presets"){const list=presets(),from=act==="dup"?list[DB.sel.presets]:null;list.push(Object.assign({},from||D.PRESET_DEFAULT,{name:from?from.name+" 2":"Nuevo",classId:from?from.classId:((p.classes||[]).find(r=>r&&r.name)||{id:0}).id}));DB.sel.presets=list.length-1;savePresets();render();return;}
  }
  if(act==="delpreset"){const list=presets();if(!list[DB.sel.presets])return;if(!await Astra.ui.modal(`<h2>Borrar plantilla</h2><p>¿Borrar «${esc(list[DB.sel.presets].name)}»? Los ★ Enemigo que la usen por nombre dejarán de encontrarla.</p>`,[{label:"Cancelar",value:false},{label:"Borrar",value:true,cls:"danger"}]))return;list.splice(DB.sel.presets,1);DB.sel.presets=0;savePresets();render();return;}
  if(act==="import"){Astra.importAnimation({project:p,pack:ensurePack,done:(name,assigned)=>{dirty("pack");if(assigned)dirty("classes");DB.tab="anims";DB.sel.anims=name;DB.mode="normal";render();Astra.ui.toast("🎞 Animación «"+name+"» importada. Recuerda guardar.");}});return;}
  if(act==="mapsprite"){const row=p.classes[DB.sel.classes];Astra.importMapSprite({project:p,pack:ensurePack,classId:row.id,done:name=>{dirty("pack");D.set("classes",row,"art",name);dirty("classes");Astra.clearArtCache();render();Astra.ui.toast("🧍 Sprite «"+name+"» asignado a "+row.name);}});return;}
  if(act==="portrait"){const row=p.actors[DB.sel.actors];Astra.importPortrait({project:p,pack:ensurePack,actorId:row.id,done:()=>{dirty("pack");render();Astra.ui.toast("🙂 Retrato de "+row.name+" importado. Recuerda guardar.");}});return;}
  if(act==="icon"){const kind=DB.tab==="weapons"?"weapon":"item";Astra.importItemIcon({project:p,pack:ensurePack,target:kind+":"+DB.sel[DB.tab],done:(t,label)=>{dirty("pack");render();Astra.ui.toast("🖼 Icono asignado a "+label+". Recuerda guardar.");}});return;}
  if(act==="playanim"){if(b.dataset.s){DB.tab="anims";DB.sel.anims=b.dataset.s;DB.mode="normal";render();}return;}
  if(act==="flip"){const on=D.flipAnimation(p.pack,DB.sel.anims);dirty("pack");renderForm();Astra.ui.toast(on?"↔ Volteada (también en el juego). Recuerda guardar.":"↔ Orientación original");return;}
  if(act==="pause"){if(player)player.playing=!player.playing;return;}
  if(act==="slow"){DB.speed=DB.speed===1||!DB.speed?.5:DB.speed===.5?.25:1;if(player)player.speed=DB.speed;b.textContent="🐢 ×"+DB.speed;return;}
 }catch(e){Astra.ui.toast("✖ "+e.message);}
}
// Para el menú 📥 Importar: crea el paquete si hace falta, marca cambios y abre la pestaña con lo importado.
Astra.db={ensurePack,dirty,show(tabId,sel){DB.tab=tabId;if(sel!==undefined)DB.sel[tabId]=sel;if(tabId==="anims")DB.mode="normal";Astra.openDatabase(tabId);}};
function boot(){
 const w=$("dbWin");w.addEventListener("click",onClick);w.addEventListener("change",onChange);
 w.addEventListener("input",ev=>{if(ev.target.id==="dbFilter"){DB.filter=ev.target.value;renderItems();}});
 $("dbClose").onclick=close;$("dbSave").onclick=save;$("dbBtn").onclick=()=>Astra.openDatabase();
 document.addEventListener("keydown",ev=>{if(!DB.open||!$("modal").classList.contains("hidden"))return;const k=ev.key.toLowerCase();
  if((ev.ctrlKey||ev.metaKey)&&k==="s"){ev.preventDefault();ev.stopImmediatePropagation();save();}else if(k==="escape"&&!$("animWin")?.innerHTML)close();},true);
}
boot();
})();
