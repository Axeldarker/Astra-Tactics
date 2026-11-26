// Astra Editor · interfaz. Todo el estado vive en el objeto S; cada cambio del mapa pasa por edit().
"use strict";
(function(){
const Astra=window.Astra,T=window.Tactics,M=T.Editor;
const $=id=>document.getElementById(id);
const esc=s=>String(s===undefined||s===null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const OBJECTIVES={eliminate:"Eliminar enemigos",boss:"Derrotar jefes",seize:"Conquistar",survive:"Sobrevivir",manual:"Comando de finalizar"};
const STAT_LABELS={health:"PV",power:"Fue",magic:"Mag",skill:"Hab",speed:"Vel",luck:"Sue",defense:"Def",resistance:"Res",move:"Mov",build:"Con"};
const TOOL_ORDER=["select","ally","enemy","chest","door","village","shop","goal","deploy","terrain","erase"];
// Nombres de la paleta (en plural, como grupos) y separadores después de estas herramientas.
const PALETTE_LABELS={ally:"Aliados",enemy:"Enemigos",chest:"Cofres",door:"Puertas",village:"Aldeas",shop:"Tiendas",goal:"Conquista",deploy:"Despliegue"};
const PALETTE_BREAKS=new Set(["enemy","shop","deploy","terrain"]);
const TOOLS=Object.assign({select:{label:"Elegir",letter:"↖",color:"#93aaad",hint:"Clic para elegir · arrastra para mover"},
 terrain:{label:"Terreno",letter:"▦",color:"#8fdcaa",hint:"Clic o arrastra para pintar el terreno elegido a la derecha"},
 erase:{label:"Borrar",letter:"✕",color:"#e8797c",hint:"Clic en algo colocado para borrarlo"}},
 Object.fromEntries(Object.keys(M.tools).map(k=>[k,Object.assign({hint:"Clic en una casilla vacía para colocar "+M.tools[k].label.toLowerCase()},M.tools[k])])));

const S={project:null,mapId:0,map:null,tileset:null,undo:[],redo:[],dirty:false,tool:"select",selected:0,brush:1,
 view:{bg:"game",terrain:false,grid:true},zoom:1,hover:null,drag:null,painting:false,last:{},preview:null,check:null};
Astra.state=S;
// Para database.js: refrescar todo después de tocar la base de datos.
Astra.ui={esc,toast:(...a)=>toast(...a),modal:(...a)=>modal(...a),refresh(){Object.keys(spriteCache).forEach(k=>delete spriteCache[k]);Astra.clearArtCache();S.project.terrainColors=null;S.preview=null;if(S.map)renderAll();}};

// ---------- utilidades de interfaz ----------
function toast(text){const t=$("toast");t.textContent=text;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2600);}
function modal(html,actions){
 $("modalBody").innerHTML=html+`<div class="actions">${actions.map((a,i)=>`<button class="btn ${a.cls||""}" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>`;
 $("modal").classList.remove("hidden");
 return new Promise(resolve=>{$("modalBody").querySelectorAll(".actions button").forEach(b=>b.onclick=()=>{$("modal").classList.add("hidden");resolve(actions[Number(b.dataset.i)].value);});});
}
const names=(list,id)=>((list||[])[id]||{}).name||("#"+id);

// ---------- abrir proyecto ----------
const DB_NAME="astra-editor";
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore("handles");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function remember(handle){try{const db=await idb();db.transaction("handles","readwrite").objectStore("handles").put(handle,"last");}catch(e){}}
async function recall(){try{const db=await idb();return await new Promise(res=>{const q=db.transaction("handles").objectStore("handles").get("last");q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);});}catch(e){return null;}}
async function welcome(){
 const supported=!!window.showDirectoryPicker,last=supported?await recall():null;
 $("browserNote").innerHTML=supported?"Tus archivos no salen de tu ordenador: Astra trabaja directamente sobre la carpeta del proyecto.":`<span class="error">Este navegador no permite abrir carpetas. Usa <b>Google Chrome</b> o <b>Microsoft Edge</b>.</span>`;
 $("welcomeActions").innerHTML=(supported?`<button class="btn gold" id="openBtn">📂 Abrir proyecto de RPG Maker MZ</button>`:"")+(last?` <button class="btn" id="reopenBtn">↻ Reabrir «${esc(last.name)}»</button>`:"");
 if($("openBtn"))$("openBtn").onclick=async()=>{try{const dir=await showDirectoryPicker({id:"astra",mode:"readwrite"});await remember(dir);await open(new Astra.FolderBackend(dir));}catch(e){if(e.name!=="AbortError")$("welcomeError").textContent=e.message;}};
 if($("reopenBtn"))$("reopenBtn").onclick=async()=>{try{const b=new Astra.FolderBackend(last);if(!await b.permission())throw new Error("Necesito permiso para abrir la carpeta.");await open(b);}catch(e){$("welcomeError").textContent=e.message;}};
}
async function open(backend){
 $("welcomeError").textContent="Abriendo…";
 const p=await Astra.loadProject(backend);S.project=p;M.db={actors:p.actors,classes:p.classes,weapons:p.weapons,items:p.items};
 $("welcome").classList.add("hidden");$("welcomeError").textContent="";
 const maps=(p.mapInfos||[]).filter(Boolean).sort((a,b)=>a.order-b.order);
 $("mapSelect").innerHTML=maps.map(m=>`<option value="${m.id}">${esc(String(m.name||"Mapa "+m.id).replace(/^\s*\d+\s*[·.:-]\s*/,""))}</option>`).join("");
 $("statusProject").textContent="📁 "+p.title;
 const saved=Number(localStorage.getItem("astra.map."+p.name));
 await loadMap(maps.some(m=>m.id===saved)?saved:maps[0]?maps[0].id:1);
 if(p.pluginStatus.legacy||p.pluginStatus.missing)upgradePrompt();
}
Astra.open=open;

// ---------- plugins del proyecto ----------
async function upgradePrompt(){
 const st=S.project.pluginStatus;
 const text=st.missing?"Este proyecto no tiene TacticsMZ instalado. Astra puede instalar los 3 plugins (TacticsEngine, TacticsUI y TacticsMZ) por ti."
  :"Este proyecto usa <b>TacticsMZ 0.2</b> (9 plugins). Los objetos que coloca Astra necesitan la <b>0.3</b>. Astra puede actualizarlo ahora: copia los 3 plugins nuevos, desactiva los 8 antiguos y conserva tu configuración (con copia de seguridad de <code>plugins.js</code>).";
 const go=await modal(`<h2>Actualizar TacticsMZ</h2><p>${text}</p><p class="help">⚠ Cierra RPG Maker MZ antes de aceptar.</p>`,[{label:"Ahora no",value:false},{label:"Actualizar plugins",value:true,cls:"gold"}]);
 if(!go)return renderAll();
 try{await Astra.installPlugins(S.project);toast("✔ Plugins actualizados. Ya puedes abrir el proyecto en MZ.");}catch(e){modal(`<h2>No se pudo actualizar</h2><p class="error">${esc(e.message)}</p>`,[{label:"Vale",value:0}]);}
 renderAll();
}
Astra.installPlugins=async function(p){
 const files=window.ASTRA_PLUGINS||{};T.assert(files["TacticsMZ.js"],"Esta copia de Astra no incluye los plugins.");
 for(const name of Object.keys(files))await Astra.saveFile(p,"js/plugins/"+name,files[name]);
 p.plugins=Astra.upgradePlugins(p.plugins);await Astra.saveFile(p,"js/plugins.js",Astra.writePlugins(p.plugins));
 p.pluginStatus=Astra.pluginStatus(p.plugins);
};

// ---------- mapa ----------
async function loadMap(id){
 if(S.dirty&&!await modal(`<h2>Cambios sin guardar</h2><p>Si cambias de mapa perderás los cambios de este.</p>`,[{label:"Cancelar",value:false},{label:"Descartar y cambiar",value:true,cls:"danger"}])){$("mapSelect").value=S.mapId;return;}
 const p=S.project;S.mapId=id;S.map=await Astra.loadMap(p,id);S.undo=[];S.redo=[];S.dirty=false;S.selected=0;
 localStorage.setItem("astra.map."+p.name,id);$("mapSelect").value=id;
 S.tileset=await Astra.loadTileset(p,S.map.tilesetId);
 const packMap=p.pack&&p.pack.maps&&p.pack.maps[id];S.packImage=packMap?await Astra.image(p,packMap.path):null;
 if(!S.packImage&&S.view.bg==="game")S.view.bg="tiles";else if(S.packImage)S.view.bg="game";
 S.zoom=fitZoom(1.5);
 drawBase();renderAll();
}
// Zoom para que el mapa quepa en la pantalla (en pasos de 25 %).
function fitZoom(maxZ){const p=S.project,v=$("viewport");return Math.min(maxZ||4,Math.max(.25,Math.floor(Math.min((v.clientWidth-24)/(S.map.width*p.tileSize),(v.clientHeight-24)/(S.map.height*p.tileSize))*20)/20||1));}
function drawBase(){
 const p=S.project,tw=p.tileSize,W=S.map.width*tw,H=S.map.height*tw,c=$("base");c.width=W;c.height=H;$("overlay").width=W;$("overlay").height=H;
 const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.fillStyle="#10222a";ctx.fillRect(0,0,W,H);
 Astra.drawTilemap(ctx,S.map,S.tileset,p.autotiles,tw,tw,0);
 // Vista "Juego": la imagen del paquete de gráficos, encima de los tiles (igual que la batalla).
 if(S.view.bg==="game"&&S.packImage){const cell=(p.pack.maps[S.mapId]||{}).cell||16;ctx.drawImage(S.packImage,0,0,S.map.width*cell,S.map.height*cell,0,0,W,H);}
 applyZoom();
}
function applyZoom(){const st=$("stage"),c=$("base");st.style.width=c.width+"px";st.style.height=c.height+"px";st.style.transform=`scale(${S.zoom})`;const v=$("viewport"),mx=Math.max(10,(v.clientWidth-c.width*S.zoom)/2),my=Math.max(10,(v.clientHeight-c.height*S.zoom)/2);st.style.margin=my+"px "+(mx+c.width*(S.zoom-1))+"px "+(my+c.height*(S.zoom-1))+"px "+mx+"px";$("statusZoom").textContent="";$("zoomPct").textContent=Math.round(S.zoom*100)+"%";}

// ---------- historial ----------
function edit(fn){S.undo.push(JSON.stringify(S.map));if(S.undo.length>150)S.undo.shift();S.redo=[];const r=fn();S.dirty=true;afterEdit();return r;}
function afterEdit(){S.preview=null;renderAll();}
function undo(){if(!S.undo.length)return;S.redo.push(JSON.stringify(S.map));S.map=JSON.parse(S.undo.pop());S.dirty=true;if(!S.map.events[S.selected])S.selected=0;afterEdit();toast("↶ Deshecho");}
function redo(){if(!S.redo.length)return;S.undo.push(JSON.stringify(S.map));S.map=JSON.parse(S.redo.pop());S.dirty=true;if(!S.map.events[S.selected])S.selected=0;afterEdit();toast("↷ Rehecho");}

// ---------- guardar ----------
async function save(){
 if(!S.map)return;
 if(!localStorage.getItem("astra.saveWarned")){
  const ok=await modal(`<h2>Antes de guardar</h2><p>Astra escribe directamente en tu proyecto. <b>Cierra RPG Maker MZ</b> mientras guardas, o vuelve a abrir el proyecto en MZ después: si no, MZ guardará su copia antigua encima.</p><p class="help">La primera vez que guardas cada mapa se crea una copia de seguridad: <code>MapXXX.json.astra-bak</code>.</p>`,[{label:"Cancelar",value:false},{label:"Entendido, guardar",value:true,cls:"gold"}]);
  if(!ok)return;localStorage.setItem("astra.saveWarned","1");
 }
 try{await Astra.saveFile(S.project,Astra.mapPath(S.mapId),JSON.stringify(S.map));S.dirty=false;renderTop();toast("💾 Guardado: "+Astra.mapPath(S.mapId));}
 catch(e){modal(`<h2>No se pudo guardar</h2><p class="error">${esc(e.message)}</p>`,[{label:"Vale",value:0}]);}
}

// ▶ Probar misión: el navegador no puede abrir MZ, así que guarda, revisa y explica el último paso.
async function playtest(){
 if(!S.map)return;if(S.dirty){await save();if(S.dirty)return;}
 const c=S.check||M.check(S.map,S.mapId),name=(($("mapSelect").selectedOptions||[])[0]||{}).text||"";
 modal(`<h2>▶ Probar misión</h2>${c.ok?`<p>✔ <b>${esc(name)}</b> está guardado y la misión está lista${c.warnings.length?` (con ${c.warnings.length} aviso${c.warnings.length===1?"":"s"})`:""}.</p>`:`<p class="error">✖ Antes de probar, arregla esto: ${esc(c.error)}</p>`}
  ${c.warnings.map(w=>`<p class="help">⚠ ${esc(w)}</p>`).join("")}
  <ol class="steps2"><li>Abre el proyecto en <b>RPG Maker MZ</b>. Si ya estaba abierto, vuelve a abrirlo <b>sin guardar</b> (Archivo → Abrir proyecto), o MZ pisará lo que guardó Astra.</li>
  <li>Pulsa <b>▶ Reproducir prueba</b> (Ctrl+R) y entra en este mapa: la misión empieza sola.</li></ol>
  <p class="help">Astra funciona en el navegador y no puede abrir MZ por ti; por eso deja todo guardado y revisado.</p>`,[{label:"Entendido",value:0,cls:"gold"}]);
}

// ---------- render general ----------
function renderAll(){if(!S.map)return;S.check=M.check(S.map,S.mapId);renderTop();renderPalette();renderInspector();drawOverlay();}
function renderTop(){
 $("undoBtn").disabled=!S.undo.length;$("redoBtn").disabled=!S.redo.length;
 $("saveBtn").classList.toggle("gold",S.dirty);
 const st=$("saveState");st.textContent=S.dirty?"● Sin guardar":"✔ Guardado";st.classList.toggle("dirty",S.dirty);
 const maps=$("mapSelect"),idx=[...maps.options].findIndex(o=>Number(o.value)===S.mapId);$("chapNo").textContent=String(idx+1).padStart(2,"0");
 const c=S.check,l=$("light");
 if(c){
  l.className="light "+(!c.ok?"bad":c.warnings.length?"warn":"ok");
  const sm=c.summary,pix=k=>`<img src="${Astra.pixelUrl(k,32)}" alt="">`;
  l.querySelector("span").innerHTML=!c.ok?`<em class="err">✖ ${esc(c.error)}</em>`
   :`<b class="chip">${pix("goal")} ${esc(OBJECTIVES[sm.objective]||sm.objective)}</b><b class="chip ally">${pix("ally")} ${sm.allies} aliado${sm.allies===1?"":"s"}</b><b class="chip foe">${pix("enemy")} ${sm.foes} enemigo${sm.foes===1?"":"s"}</b>${sm.reinforcements?`<b class="chip gold">${pix("deploy")} ${sm.reinforcements} refuerzo${sm.reinforcements===1?"":"s"}</b>`:""}${c.warnings.length?`<b class="chip warn">⚠ ${c.warnings.length} aviso${c.warnings.length===1?"":"s"}</b>`:""}`;
 }
 document.querySelectorAll("#viewbar [data-view]").forEach(b=>{b.classList.toggle("on",S.view.bg===b.dataset.view);b.classList.toggle("hidden",b.dataset.view==="game"&&!S.packImage);});
 document.querySelectorAll("#viewbar [data-toggle]").forEach(b=>b.classList.toggle("on",!!S.view[b.dataset.toggle]));
}
function renderPalette(){
 $("palette").innerHTML=TOOL_ORDER.map((k,i)=>{const t=TOOLS[k];
  return `<button class="tool${S.tool===k?" on":""}" data-tool="${k}" title="${esc(t.hint)}">${Astra.PIXEL[k]?`<span class="ico pix"><img src="${Astra.pixelUrl(k,32)}" alt=""></span>`:`<span class="ico" style="background:${t.color}">${esc(t.letter)}</span>`}<span class="lbl">${esc(PALETTE_LABELS[k]||t.label)}</span>${i<10?`<kbd>${(i+1)%10}</kbd>`:""}</button>`+(PALETTE_BREAKS.has(k)?`<div class="tool-sep"><i>◆</i></div>`:"");}).join("");
 $("statusHint").textContent=TOOLS[S.tool].hint;
}
function setTool(k){S.tool=k;if(k==="terrain")S.view.terrain=true;if(k==="ally"||k==="enemy")S.panel="units";renderAll();}

// ---------- inspector ----------
// Dos pestañas: «Unidades» (desplegar y la unidad elegida) y «Propiedades» (todo lo editable de lo elegido).
function panelFor(e){const unit=e&&["enemy","ally"].indexOf(M.kind(e))>=0;if(S.tool==="terrain"||(e&&!unit))return "props";return S.panel||"units";}
function renderInspector(){
 const body=$("inspectorBody"),p=S.project;let html="";
 if(p.pluginStatus.legacy||p.pluginStatus.missing)html+=`<div class="banner warn">⚠ ${p.pluginStatus.missing?"Falta TacticsMZ en este proyecto.":"Proyecto con TacticsMZ 0.2."} <button class="btn small" data-act="upgrade">Actualizar</button></div>`;
 p.warnings.forEach(w=>html+=`<div class="banner info">ℹ ${esc(w)}</div>`);
 const e=S.map.events[S.selected],panel=panelFor(e);
 document.querySelectorAll("#ptabs [data-panel]").forEach(b=>b.classList.toggle("on",b.dataset.panel===panel));
 if(panel==="units"){html+=rosterHtml();if(e)html+=selectedUnitHtml(e);}
 else{
  if(S.tool==="terrain")html+=terrainHtml();
  if(e)html+=selectionHtml(e);else if(S.tool!=="terrain")html+=emptyHtml();
  if(S.check&&(!S.check.ok||S.check.warnings.length))html+=`<div class="card"><h3>Revisión de la misión</h3>${!S.check.ok?`<p class="error">✖ ${esc(S.check.error)}</p>`:""}${S.check.warnings.map(w=>`<p class="help">⚠ ${esc(w)}</p>`).join("")}</div>`;
 }
 body.innerHTML=html;drawHero();Astra.paintIcons(body);
}
// Resumen de la unidad elegida (como en la batalla): retrato, clase, nivel, PV y arma.
function selectedUnitHtml(e){
 const c=M.find(e,"Ally")||M.find(e,"Enemy")||M.find(e,"Unit"),u=previewUnit(e),eng=S.preview&&S.preview.engine,p=S.project;
 const ally=M.kind(e)==="ally",actorId=c&&Number(c.args.actorId)||0,m=M.markers(S.map).find(x=>x.id===e.id)||{};
 const name=u&&u.name||(actorId&&(p.actors[actorId]||{}).name)||M.describe(e),cls=names(p.classes,u?u.classId:c&&c.args.classId),lv=u?u.level:c&&c.args.level||1;
 const hp=u?u.hp:0,max=u&&eng?eng.value(u,"health"):0,item=u&&u.inventory[u.equipped],w=item&&eng?eng.itemData(item):null;
 const portrait=ally&&actorId?`<canvas class="selport" width="96" height="96" data-actor="${actorId}"></canvas>`:`<canvas class="selport" id="heroCanvas" width="96" height="96"></canvas>`;
 return `<div class="selcard"><div class="ribbon">UNIDAD SELECCIONADA</div><div class="selbody">${portrait}<div class="selinfo">
  <b class="selname">${esc(name)}</b><span class="selsub">${esc(cls)} · Nv. ${esc(lv)}</span>
  <span class="selteam ${ally?"ally":"foe"}"><img src="${Astra.pixelUrl(ally?"ally":"enemy",32)}" alt="">${ally?(m.lord?"Aliado · Líder":"Aliado"):(m.boss?"Enemigo · Jefe":"Enemigo")}</span>
  ${max?`<span class="selhp"><b>PV</b> ${hp} / ${max}<i><em style="width:${Math.round(Math.min(1,hp/max)*100)}%"></em></i></span>`:""}
  ${w?`<span class="selweapon">${item.kind==="weapon"||item.kind==="item"?`<canvas width="20" height="20" data-item="${item.kind}:${item.id}"></canvas>`:""}${esc(w.name)}</span>`:""}
 </div></div><button class="btn wide edit" data-panel="props">✎ Editar propiedades</button></div>`;
}
// Unidades de la base de datos para colocar: clic para elegir (y luego clic en el mapa) o arrastrar al mapa.
function rosterHtml(){
 const p=S.project,kind=S.tool==="enemy"||S.tool==="ally"?S.tool:(S.rosterTab||"ally"),last=S.last[kind]||{};
 const placed=new Set(S.map.events.filter(Boolean).map(e=>M.find(e,"Ally")).filter(Boolean).map(c=>Number(c.args.actorId)));
 const q=(S.rosterFind||"").trim().toLowerCase(),hide=n=>q&&n.toLowerCase().indexOf(q)<0;
 const row=(pick,canvas,name,sub,on,extra)=>`<button class="urow${on?" on":""}${hide(name+" "+sub)?" hidden":""}" draggable="true" data-pick="${esc(pick)}" data-find="${esc((name+" "+sub).toLowerCase())}" title="Clic: elegir y luego clic en el mapa · Arrastrar: colocar">${canvas}<span class="ut"><b>${esc(name)}</b><small>${esc(sub)}</small></span>${extra||""}<em>▶</em></button>`;
 let rows="";
 if(kind==="ally")rows=(p.actors||[]).filter(a=>a&&a.name).map(a=>row("ally:"+a.id,`<canvas width="40" height="40" data-actor="${a.id}"></canvas>`,a.name,names(p.classes,a.classId)+" · Nv. "+(a.initialLevel||1),Number(last.actorId)===a.id,placed.has(a.id)?`<i>en el mapa</i>`:"")).join("");
 else{const pres=Object.values(T.enemyPresets);
  rows=(pres.length?`<div class="ugroup">Enemigos rápidos</div>`+pres.map(x=>row("preset:"+x.name,`<canvas width="40" height="40" data-class="${Number(x.classId)||0}" data-team="2"></canvas>`,x.name,names(p.classes,x.classId)+" · Nv. "+(x.level||1),last.preset===x.name)).join(""):"")
   +`<div class="ugroup">Clases</div>`+(p.classes||[]).filter(c=>c&&c.name).map(c=>row("class:"+c.id,`<canvas width="40" height="40" data-class="${c.id}" data-team="2"></canvas>`,c.name,"Nv. "+(S.rosterLevel||1),!last.preset&&Number(last.classId)===c.id)).join("");}
 return `<div class="roster"><h4 class="orn">◆ DESPLEGAR UNIDADES ◆</h4>
  <label class="usearch"><span>🔍</span><input id="rosterFind" type="search" placeholder="Buscar unidad…" value="${esc(S.rosterFind||"")}"></label>
  <div class="useg"><button data-roster="ally" class="${kind==="ally"?"on":""}">Aliados</button><button data-roster="enemy" class="${kind==="enemy"?"on":""}">Enemigos</button></div>
  ${kind==="enemy"?`<label class="lvl">Nivel de las clases <input type="number" min="1" id="rosterLevel" value="${S.rosterLevel||1}"></label>`:""}
  <div class="ulist">${rows||`<p class="help">No hay nada en la base de datos.</p>`}</div>
  <p class="orn small">◆ Arrastra una unidad al mapa ◆</p></div>`;
}
function pickArgs(pick){const i=pick.indexOf(":"),k=pick.slice(0,i),v=pick.slice(i+1);
 if(k==="ally")return {kind:"ally",args:{actorId:Number(v),lord:!M.markers(S.map).some(m=>m.lord)}};
 if(k==="preset")return {kind:"enemy",args:{preset:v,classId:0,level:0}};
 return {kind:"enemy",args:{classId:Number(v),level:S.rosterLevel||1}};}
function emptyHtml(){
 return `<div class="card empty"><h3>¿Por dónde empiezo?</h3><ol>
  <li>Elige <b>Aliado</b> en la paleta y haz clic en el mapa. Marca <i>Es el líder</i>.</li>
  <li>Elige <b>Enemigo</b> y haz clic donde quieras enemigos. Cada uno copia los ajustes del anterior.</li>
  <li>Añade <b>Cofres</b>, <b>Aldeas</b> o una casilla de <b>Conquista</b> si te apetece.</li>
  <li>Mira el resumen de la misión arriba: si no sale nada en rojo, está lista. Pulsa <b>▶ Probar misión</b>.</li></ol>
  <p class="help">Haz clic en cualquier cosa colocada para cambiarla. Arrástrala para moverla.</p></div>
  <div class="card"><h3>Atajos</h3><div class="keys"><kbd>1-0</kbd><span>Herramientas</span><kbd>Ctrl+Z / Ctrl+Y</kbd><span>Deshacer / rehacer</span><kbd>Ctrl+S</kbd><span>Guardar</span><kbd>Supr</kbd><span>Borrar lo elegido</span><kbd>T / G</kbd><span>Ver terreno / cuadrícula</span><kbd>+ / −</kbd><span>Zoom (o Ctrl + rueda)</span><kbd>Esc</kbd><span>Soltar selección</span><kbd>Clic derecho</kbd><span>Volver a Elegir</span></div></div>`;
}
function terrainHtml(){
 const t=S.project.terrain;
 return `<div class="card"><h3>▦ Pintar terreno</h3><p class="help">El terreno decide movimiento, defensa y evasión en la batalla. Se guarda como <b>región</b> de MZ. Elige uno y pinta con clic o arrastrando.</p><div class="terrains">${Object.keys(t).map(Number).sort((a,b)=>a-b).filter(id=>id<256).map(id=>{const r=t[id];return `<button class="terrain${S.brush===id?" on":""}" data-brush="${id}"><b style="background:${esc(terrainColor(id))}"></b><span>${id} · ${esc(r.name||"")}<small>${r.cost>0?"coste "+r.cost:"intransitable"}${r.defense?" · def +"+r.defense:""}${r.avoid?" · eva +"+r.avoid:""}</small></span></button>`;}).join("")}</div></div>`;
}
function selectionHtml(e){
 const cmds=M.commands(e),kind=M.kind(e),unit=cmds.find(c=>["Enemy","Ally","Unit"].indexOf(c.id)>=0);
 let html=`<div class="card"><div class="hero"><canvas id="heroCanvas" width="72" height="72"></canvas><div><div class="name">${esc(M.describe(e))}</div><div class="sub">Evento ${e.id} · casilla ${e.x}, ${e.y}</div>${unit?`<div class="chips" style="margin-top:6px">${Object.keys(M.addons).filter(id=>!M.find(e,id)).map(id=>`<button class="btn small" data-add="${id}">+ ${M.addons[id]}</button>`).join("")}</div>`:""}</div></div>${unit?statsHtml(e):""}
  <div class="chips" style="margin-top:10px">${kind&&kind!=="mission"?`<button class="btn small danger" data-act="delete">🗑 Borrar</button>`:""}${kind==="mission"?"":`<button class="btn small" data-act="duplicate" title="Elige una casilla para la copia">⧉ Duplicar</button>`}</div></div>`;
 if(!cmds.length)html+=`<div class="card"><p class="help">Este evento no tiene comandos de TacticsMZ. Edítalo en el editor de MZ.</p></div>`;
 cmds.forEach(c=>{const def=T.catalog.find(d=>d.id===c.id),removable=M.addons[c.id];
  html+=`<div class="card"><h3>${esc(def.label)}${removable?`<button class="x" data-remove="${c.id}" title="Quitar">✕</button>`:""}</h3><p class="help">${esc(def.help)}</p>${def.fields.map(f=>fieldHtml(c.id,f,c.args[f.id])).join("")}</div>`;});
 return html;
}
function statsHtml(e){
 const u=previewUnit(e);if(!u)return "";const eng=S.preview.engine;
 return `<div class="stats">${Object.keys(STAT_LABELS).map(k=>{const v=eng.value(u,k),max=k==="health"?60:k==="move"?10:30;return `<span>${STAT_LABELS[k]}</span><span class="bar"><i style="width:${Math.min(100,v/max*100)}%"></i></span><span>${v}</span>`;}).join("")}</div><p class="help" style="margin-top:8px">${esc(names(S.project.classes,u.classId))} · Nv ${u.level} · ${esc((eng.itemData(u.inventory[u.equipped])||{}).name||"sin arma")}</p>`;
}
function fieldHtml(cmd,f,v){
 const p=S.project,key=`data-cmd="${cmd}" data-field="${f.id}" data-type="${esc(f.type)}"`;
 const table={actor:p.actors,class:p.classes,weapon:p.weapons,item:p.items,skill:p.skills,state:p.states}[f.type];
 const sys={switch:(p.system||{}).switches,variable:(p.system||{}).variables}[f.type];
 const opt=(value,label,sel)=>`<option value="${esc(value)}"${sel?" selected":""}>${esc(label)}</option>`;
 let input;
 if(f.type==="boolean")return `<label class="field check">${esc(f.label)}<input type="checkbox" ${key}${v?" checked":""}></label>`;
 if(f.type==="select")input=`<select ${key}>${Object.keys(f.options).map(k=>opt(k,f.options[k],String(v)===k)).join("")}</select>`;
 else if(table)input=`<select ${key}>${opt(0,"— ninguno —",!Number(v))}${table.filter(r=>r&&r.name).map(r=>opt(r.id,r.id+" · "+r.name,Number(v)===r.id)).join("")}</select>`;
 else if(sys)input=`<select ${key}>${opt(0,"— ninguno —",!Number(v))}${sys.map((n,i)=>i?opt(i,i+" · "+(n||"(sin nombre)"),Number(v)===i):"").join("")}</select>`;
 else if(f.type==="map")input=`<select ${key}>${opt(0,"— ninguno —",!Number(v))}${(p.mapInfos||[]).filter(Boolean).map(m=>opt(m.id,m.id+" · "+m.name,Number(v)===m.id)).join("")}</select>`;
 else if(f.type==="number")input=`<input type="number" ${key} value="${esc(v)}">`;
 else if(/^struct/.test(f.type))return `<label class="field wide">${esc(f.label)} <span class="help">(avanzado, JSON)</span><textarea ${key}>${esc(JSON.stringify(v))}</textarea></label>`;
 else if(cmd==="Enemy"&&f.id==="preset")input=`<input list="astraPresets" ${key} value="${esc(v)}" placeholder="(ninguna)"><datalist id="astraPresets">${Object.values(T.enemyPresets).map(x=>opt(x.name,x.name)).join("")}</datalist>`;
 else input=`<input type="text" ${key} value="${esc(v)}">`;
 return `<label class="field">${esc(f.label)}${input}</label>`;
}

// ---------- vista previa con el motor real ----------
function preview(){
 if(S.preview)return S.preview;S.preview={engine:null};
 try{const m=T.compileMap(T.copy(S.map),S.mapId);m.deployment=m.deployment==="prepare"?"placed":m.deployment;S.preview.engine=new T.Engine(S.project.db,m);}catch(e){}
 return S.preview;
}
function previewUnit(e){const eng=preview().engine;return eng?eng.unit(e.id):null;}
function ranges(e){
 const eng=preview().engine,u=eng&&eng.unit(e.id);if(!u)return null;
 try{const move=eng.paths(u,eng.movementBudget(u)).costs,w=eng.weapon?eng.weapon(u):eng.itemData(u.inventory[u.equipped]),r=w?eng.weaponRange(u,w):{min:1,max:1},attack={};
  Object.keys(move).forEach(k=>{const [x,y]=k.split(",").map(Number);for(let dy=-r.max;dy<=r.max;dy++)for(let dx=-r.max;dx<=r.max;dx++){const d=Math.abs(dx)+Math.abs(dy);if(d>=r.min&&d<=r.max&&eng.inside(x+dx,y+dy))attack[(x+dx)+","+(y+dy)]=true;}});
  return {move,attack,staff:!!(w&&w.staff)};}catch(err){return null;}
}

// ---------- dibujo encima del mapa ----------
async function sprite(classId,actorId,team){
 const palette=S.project.pack&&S.project.pack.palette;
 const p=S.project,cls=p.db.classes[classId]||{},art=cls.art||cls.graphic,unit=p.pack&&p.pack.units&&art&&p.pack.units[art];
 if(unit&&unit.map){const im=await Astra.image(p,unit.map.path);if(im)return Object.assign(crop({im,sx:0,sy:0,w:unit.map.width,h:unit.map.height},palette,team),{base:16});}
 const a=(p.actors||[])[actorId];
 if(a&&a.characterName){const im=await Astra.image(p,"img/characters/"+a.characterName+".png");if(im){const big=a.characterName[0]==="$"||a.characterName.slice(0,2)==="!$";const cw=im.width/(big?3:12),ch=im.height/(big?4:8),i=big?0:a.characterIndex;return Object.assign(crop({im,sx:((i%4)*3+1)*cw,sy:Math.floor(i/4)*4*ch,w:cw,h:ch}),{base:p.tileSize});}}
 return null;
}
const crop=Astra.crop;
const spriteCache={};
// Gráfico propio del evento en MZ (por ejemplo !Chest): si lo tiene, se dibuja ese; si no, el icono pixel-art.
function eventGraphic(e){
 const img=((e.pages||[])[0]||{}).image||{};if(!img.characterName)return null;const key="ev:"+img.characterName+":"+img.characterIndex+":"+img.direction+":"+img.pattern;
 if(!(key in spriteCache)){spriteCache[key]=null;Astra.characterSprite(S.project,img.characterName,img.characterIndex,img.direction,img.pattern).then(s=>{spriteCache[key]=s;drawOverlay();});}
 return spriteCache[key];
}
function spriteFor(m,e){
 const c=M.commands(e).find(c=>["Enemy","Ally","Unit"].indexOf(c.id)>=0);if(!c)return null;
 const eng=preview().engine,u=eng&&eng.unit(e.id);
 let classId=u?u.classId:c.args.classId,actorId=c.args.actorId||0;
 if(!classId&&c.id==="Enemy"&&c.args.preset){const pr=T.enemyPresets[T.notes.plain(c.args.preset)];classId=pr&&pr.classId;}
 if(!classId&&actorId)classId=(S.project.actors[actorId]||{}).classId;
 const team=u?u.team:c.id==="Enemy"?2:c.id==="Ally"?1:Number(c.args.team)||1,key=classId+":"+actorId+":"+team;if(!(key in spriteCache)){spriteCache[key]=null;sprite(classId,actorId,team).then(s=>{spriteCache[key]=s;drawOverlay();});}
 return spriteCache[key];
}
// Colores de terreno: los del paquete si son distintos entre sí; si se repiten, uno propio por ID para que se distingan.
function terrainColor(id){
 const p=S.project;if(!p.terrainColors){const t=p.terrain,count={};Object.values(t).forEach(r=>{count[r.color]=(count[r.color]||0)+1;});
  p.terrainColors={};Object.keys(t).forEach(k=>{const r=t[k];p.terrainColors[k]=r.cost===0?"#262c30":r.color&&count[r.color]===1?r.color:`hsl(${Math.round(Number(k)*137.508)%360},60%,52%)`;});}
 return p.terrainColors[id]||"#000";
}
function drawOverlay(){
 const c=$("overlay"),ctx=c.getContext("2d"),tw=S.project.tileSize,W=S.map.width,H=S.map.height;
 ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
 if(S.view.terrain){const t=S.project.terrain;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const r=Astra.regionAt(S.map,x,y);ctx.globalAlpha=.55;ctx.fillStyle=terrainColor(r);ctx.fillRect(x*tw,y*tw,tw,tw);ctx.globalAlpha=1;
  if(tw*S.zoom>=36){ctx.font="10px sans-serif";ctx.fillStyle="#fff";ctx.textAlign="left";ctx.fillText(String(r),x*tw+3,y*tw+11);}}}
 const sel=S.map.events[S.selected],rg=sel&&["enemy","ally"].indexOf(M.kind(sel))>=0?ranges(sel):null;
 if(rg){Object.keys(rg.attack).forEach(k=>{if(rg.move[k]!==undefined)return;const [x,y]=k.split(",").map(Number);ctx.fillStyle=rg.staff?"rgba(110,220,150,.35)":"rgba(232,90,95,.35)";ctx.fillRect(x*tw+1,y*tw+1,tw-2,tw-2);});
  Object.keys(rg.move).forEach(k=>{const [x,y]=k.split(",").map(Number);ctx.fillStyle="rgba(80,170,255,.38)";ctx.fillRect(x*tw+1,y*tw+1,tw-2,tw-2);});}
 if(S.view.grid){ctx.strokeStyle="rgba(255,255,255,.12)";ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=W;x++){ctx.moveTo(x*tw+.5,0);ctx.lineTo(x*tw+.5,H*tw);}for(let y=0;y<=H;y++){ctx.moveTo(0,y*tw+.5);ctx.lineTo(W*tw,y*tw+.5);}ctx.stroke();}
 // eventos que no son de TacticsMZ: un marco discreto para saber que existen
 S.map.events.filter(Boolean).forEach(e=>{if(!M.kind(e)){ctx.strokeStyle="rgba(255,255,255,.35)";ctx.setLineDash([4,3]);ctx.strokeRect(e.x*tw+4.5,e.y*tw+4.5,tw-9,tw-9);ctx.setLineDash([]);}});
 // Primero lo que va "en el suelo" (despliegue, conquista, cofres…), luego las unidades encima.
 const isUnit=m=>m.kind==="enemy"||m.kind==="ally";
 M.markers(S.map).sort((a,b)=>isUnit(a)-isUnit(b)).forEach(m=>{
  const e=S.map.events[m.id],x=m.x*tw,y=m.y*tw,cx=x+tw/2,selected=m.id===S.selected,dragging=S.drag&&S.drag.id===m.id&&S.drag.moved;
  ctx.globalAlpha=dragging?.4:1;
  const unit=m.kind==="enemy"||m.kind==="ally",sp=unit?spriteFor(m,e):null;
  if(unit){ctx.fillStyle=m.color+"55";ctx.beginPath();ctx.ellipse(cx,y+tw*.78,tw*.38,tw*.16,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=m.color;ctx.lineWidth=2;ctx.stroke();}
  else if(m.kind==="deploy"){ctx.fillStyle=m.color+"40";ctx.fillRect(x+1,y+1,tw-2,tw-2);ctx.strokeStyle=m.color;ctx.lineWidth=1.5;ctx.setLineDash([5,3]);ctx.strokeRect(x+2,y+2,tw-4,tw-4);ctx.setLineDash([]);}
  else{ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.ellipse(cx,y+tw*.86,tw*.36,tw*.1,0,0,Math.PI*2);ctx.fill();}
  const covered=m.kind==="deploy"&&M.markers(S.map).some(o=>o!==m&&o.x===m.x&&o.y===m.y);
  if(sp){const s=Math.min(tw/(sp.base||16),tw*1.5/sp.w,tw*1.5/sp.h),dw=sp.w*s,dh=sp.h*s;ctx.drawImage(sp.im,sp.sx,sp.sy,sp.w,sp.h,cx-dw/2,y+tw*.9-dh,dw,dh);}
  else if(m.kind==="deploy"){if(!covered)ctx.drawImage(Astra.pixel("deploy"),x+3,y+3,tw*.42,tw*.42);}
  else{const own=eventGraphic(e),icon=Astra.pixel(m.kind);
   if(own){const s=Math.min(tw/own.w,tw/own.h),dw=own.w*s,dh=own.h*s;ctx.drawImage(own.im,own.sx,own.sy,own.w,own.h,cx-dw/2,y+tw*.92-dh,dw,dh);}
   else if(icon)ctx.drawImage(icon,x+tw*.08,y+tw*.02,tw*.84,tw*.84);}
  ctx.textBaseline="alphabetic";ctx.font="bold 11px sans-serif";ctx.lineWidth=3;ctx.strokeStyle="#081419";
  const tag=(text,tx,ty,color,align)=>{ctx.textAlign=align;ctx.strokeText(text,tx,ty);ctx.fillStyle=color;ctx.fillText(text,tx,ty);};
  if(m.level)tag(String(m.level),x+tw-3,y+tw-3,"#ffffff","right");
  if(m.badge)tag("⏱"+m.badge,x+2,y+11,"#f3d79b","left");
  if(m.boss)tag("♛",x+tw-3,y+12,"#ff9b9e","right");else if(m.lord)tag("♛",x+tw-3,y+12,"#8fe0f5","right");
  if(m.recruit)tag("💬",x+2,y+tw-3,"#8fdcaa","left");
  if(selected){const k=tw*.3;ctx.strokeStyle="#ffd45e";ctx.lineWidth=3;ctx.shadowColor="#000";ctx.shadowBlur=3;ctx.beginPath();
   [[x+2,y+2,1,1],[x+tw-2,y+2,-1,1],[x+2,y+tw-2,1,-1],[x+tw-2,y+tw-2,-1,-1]].forEach(([px,py,dx,dy])=>{ctx.moveTo(px,py+dy*k);ctx.lineTo(px,py);ctx.lineTo(px+dx*k,py);});ctx.stroke();ctx.shadowBlur=0;}
  ctx.globalAlpha=1;
 });
 if(S.hover){ctx.strokeStyle="#f3d79b";ctx.lineWidth=2;ctx.strokeRect(S.hover.x*tw+1,S.hover.y*tw+1,tw-2,tw-2);}
}
function drawHero(){
 const c=$("heroCanvas");if(!c)return;const e=S.map.events[S.selected],ctx=c.getContext("2d"),m=M.markers(S.map).find(m=>m.id===S.selected);
 ctx.clearRect(0,0,72,72);ctx.imageSmoothingEnabled=false;
 const sp=m&&(m.kind==="enemy"||m.kind==="ally")?spriteFor(m,e):null,color=m?m.color:"#d2b567";
 ctx.fillStyle=color+"33";ctx.beginPath();ctx.arc(36,36,32,0,Math.PI*2);ctx.fill();
 if(sp){const s=Math.min(64/sp.w,64/sp.h);ctx.drawImage(sp.im,sp.sx,sp.sy,sp.w,sp.h,36-sp.w*s/2,36-sp.h*s/2,sp.w*s,sp.h*s);}
 else if(m&&Astra.pixel(m.kind))ctx.drawImage(Astra.pixel(m.kind),8,8,56,56);
 else{ctx.fillStyle=color;ctx.font="bold 30px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(m?m.letter:"⚑",36,38);}
}

// ---------- ratón ----------
function tileFromEvent(ev){const r=$("overlay").getBoundingClientRect(),tw=S.project.tileSize*S.zoom,x=Math.floor((ev.clientX-r.left)/tw),y=Math.floor((ev.clientY-r.top)/tw);return x>=0&&y>=0&&x<S.map.width&&y<S.map.height?{x,y}:null;}
const tactical=e=>e&&M.kind(e)&&M.kind(e)!=="mission";
function onDown(ev){
 if(!S.map)return;if(ev.button===2){setTool("select");S.selected=0;renderAll();return;}
 if(ev.button===1||(ev.button===0&&S.space)){S.pan={x:ev.clientX,y:ev.clientY,sx:$("viewport").scrollLeft,sy:$("viewport").scrollTop};ev.preventDefault();return;}
 const t=tileFromEvent(ev);if(!t)return;const there=M.eventAt(S.map,t.x,t.y);
 if(S.duplicate){const src=S.map.events[S.duplicate];S.duplicate=null;if(src&&!tactical(there)){edit(()=>{const copy=T.copy(src);copy.id=M.nextId(S.map);copy.x=t.x;copy.y=t.y;S.map.events[copy.id]=copy;S.selected=copy.id;});toast("⧉ Duplicado");}return;}
 if(S.tool==="terrain"){S.undo.push(JSON.stringify(S.map));S.redo=[];S.painting=true;paint(t);return;}
 if(S.tool==="erase"){if(tactical(there)){edit(()=>{M.remove(S.map,there.id);if(S.selected===there.id)S.selected=0;});toast("🗑 Borrado");}return;}
 if(tactical(there)){S.drag={id:there.id,from:t,moved:false};S.selected=there.id;S.preview=null;renderInspector();drawOverlay();return;}
 if(S.tool==="select"){S.selected=there?there.id:0;renderAll();return;}
 const args=T.copy(S.last[S.tool]||defaults(S.tool));if(S.tool==="ally")args.lord=!M.markers(S.map).some(m=>m.lord);
 edit(()=>{const e=M.create(S.map,S.tool,t.x,t.y,args);S.selected=e.id;});
}
function defaults(tool){const p=S.project,first=list=>((list||[]).find(r=>r&&r.name)||{id:1}).id;return tool==="enemy"?{classId:first(p.classes),level:1}:tool==="ally"?{actorId:first(p.actors),lord:!M.markers(S.map).some(m=>m.lord)}:{};}
function paint(t){if(Astra.regionAt(S.map,t.x,t.y)===S.brush)return;Astra.setRegion(S.map,t.x,t.y,S.brush);S.dirty=true;S.preview=null;drawOverlay();}
function onMove(ev){
 if(!S.map)return;
 if(S.pan){const v=$("viewport");v.scrollLeft=S.pan.sx-(ev.clientX-S.pan.x);v.scrollTop=S.pan.sy-(ev.clientY-S.pan.y);return;}
 const t=tileFromEvent(ev);
 if(JSON.stringify(t)!==JSON.stringify(S.hover)){S.hover=t;drawOverlay();
  const tip=$("tooltip");
  if(t){const r=Astra.regionAt(S.map,t.x,t.y),d=S.project.terrain[r]||{},e=M.eventAt(S.map,t.x,t.y);
   $("statusTile").textContent=`Casilla ${t.x}, ${t.y} · ${r} ${d.name||""}${d.cost===0?" (intransitable)":d.cost?" · coste "+d.cost:""}`;
   if(e&&M.kind(e)&&!S.drag){tip.innerHTML=`<b>${esc(M.describe(e))}</b>`;tip.classList.remove("hidden");}else tip.classList.add("hidden");}
  else{tip.classList.add("hidden");$("statusTile").textContent="—";}}
 const tip=$("tooltip");tip.style.left=(ev.clientX+16)+"px";tip.style.top=(ev.clientY+14)+"px";
 if(S.painting&&t&&ev.buttons&1)paint(t);
 if(S.drag&&t&&(t.x!==S.drag.from.x||t.y!==S.drag.from.y)){S.drag.moved=true;S.drag.to=t;drawOverlay();}
}
function onUp(){
 if(S.pan){S.pan=null;return;}
 if(S.painting){S.painting=false;afterEdit();return;}
 const d=S.drag;S.drag=null;
 if(d&&d.moved&&d.to){const there=M.eventAt(S.map,d.to.x,d.to.y);if(tactical(there)&&there.id!==d.id){toast("Esa casilla ya está ocupada");drawOverlay();return;}edit(()=>M.move(S.map,d.id,d.to.x,d.to.y));}
 else if(d){renderAll();}
}

// ---------- panel: clics y cambios ----------
function onInspectorClick(ev){
 const t=ev.target.closest("[data-act],[data-add],[data-remove],[data-brush],[data-pick],[data-roster],[data-panel]");if(!t)return;const e=S.map.events[S.selected];
 if(t.dataset.panel){S.panel=t.dataset.panel;renderInspector();return;}
 if(t.dataset.roster){S.rosterTab=t.dataset.roster;S.tool=t.dataset.roster;renderAll();return;}
 if(t.dataset.pick){const r=pickArgs(t.dataset.pick);S.last[r.kind]=r.args;S.tool=r.kind;renderAll();toast("Ahora haz clic en el mapa para colocarlo");return;}
 if(t.dataset.brush){S.brush=Number(t.dataset.brush);renderInspector();return;}
 if(t.dataset.add)return edit(()=>M.setCommand(e,t.dataset.add,t.dataset.add==="Reinforcement"?{turn:2}:{},M.commands(e)[0].id));
 if(t.dataset.remove)return edit(()=>{M.removeCommand(e,t.dataset.remove);M.refreshLook(e);});
 const act=t.dataset.act;
 if(act==="delete")edit(()=>{M.remove(S.map,e.id);S.selected=0;});
 if(act==="duplicate"){S.duplicate=e.id;toast("Haz clic en la casilla donde quieres la copia");}
 if(act==="upgrade")upgradePrompt();
}
function onInspectorChange(ev){
 const t=ev.target;
 if(t.id==="rosterLevel"){S.rosterLevel=Math.max(1,Number(t.value)||1);const l=S.last.enemy;if(l&&!l.preset)l.level=S.rosterLevel;renderInspector();return;}if(!t.dataset.field)return;const e=S.map.events[S.selected];if(!e)return;
 let v=t.type==="checkbox"?t.checked:t.value;const type=t.dataset.type;
 if(["number","map","actor","class","weapon","item","skill","state","switch","variable"].indexOf(type)>=0)v=Number(v)||0;
 if(/^struct/.test(type)){try{v=JSON.parse(v||"[]");}catch(err){t.style.borderColor="#e8797c";toast("JSON no válido");return;}}
 edit(()=>{M.setCommand(e,t.dataset.cmd,{[t.dataset.field]:v});const k=M.kind(e);if(k==="enemy"||k==="ally"){const c=M.find(e,k==="enemy"?"Enemy":"Ally");if(c)S.last[k]=T.copy(c.args);}});
}

// ---------- teclado ----------
function onKey(ev){
 if(Astra.dbState&&Astra.dbState.open)return;
 if(!S.map||!$("modal").classList.contains("hidden"))return;
 const typing=/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName),k=ev.key,ctrl=ev.ctrlKey||ev.metaKey;
 if(ctrl&&k.toLowerCase()==="s"){ev.preventDefault();save();return;}
 if(typing){if(k==="Escape")document.activeElement.blur();return;}
 if(ctrl&&k.toLowerCase()==="z"){ev.preventDefault();ev.shiftKey?redo():undo();return;}
 if(ctrl&&k.toLowerCase()==="y"){ev.preventDefault();redo();return;}
 if(/^[0-9]$/.test(k)){const i=(Number(k)+9)%10;if(TOOL_ORDER[i])setTool(TOOL_ORDER[i]);return;}
 if(k==="Delete"||k==="Backspace"){const e=S.map.events[S.selected];if(tactical(e))edit(()=>{M.remove(S.map,e.id);S.selected=0;});return;}
 if(k==="Escape"){S.selected=0;S.duplicate=null;renderAll();return;}
 if(k==="t"||k==="T"){S.view.terrain=!S.view.terrain;renderTop();drawOverlay();return;}
 if(k==="g"||k==="G"){S.view.grid=!S.view.grid;renderTop();drawOverlay();return;}
 if(k===" "){ev.preventDefault();if(!S.space){S.space=true;$("overlay").style.cursor="grab";}return;}
 if(k==="+"||k==="="){zoom(1);return;}if(k==="-"){zoom(-1);return;}
}
function zoom(d){S.zoom=Math.max(.25,Math.min(4,Math.round(S.zoom*(d>0?1.25:.8)*20)/20));applyZoom();}
window.addEventListener("resize",()=>{if(S.map)applyZoom();});

// ---------- arranque ----------
function boot(){
 $("palette").addEventListener("click",ev=>{const b=ev.target.closest("[data-tool]");if(b)setTool(b.dataset.tool);});
 $("viewbar").addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b||!S.map)return;
  if(b.dataset.view){S.view.bg=b.dataset.view;drawBase();renderTop();}
  if(b.dataset.toggle){S.view[b.dataset.toggle]=!S.view[b.dataset.toggle];renderTop();drawOverlay();}
  if(b.dataset.zoom)zoom(Number(b.dataset.zoom));
  if(b.dataset.fit){S.zoom=fitZoom();applyZoom();}});
 const ov=$("overlay");ov.addEventListener("mousedown",onDown);window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);
 ov.addEventListener("contextmenu",e=>e.preventDefault());ov.addEventListener("mouseleave",()=>{S.hover=null;$("tooltip").classList.add("hidden");if(S.map)drawOverlay();});
 $("viewport").addEventListener("wheel",ev=>{if(ev.ctrlKey&&S.map){ev.preventDefault();zoom(ev.deltaY<0?1:-1);}},{passive:false});
 $("inspectorBody").addEventListener("dragstart",ev=>{const c=ev.target.closest("[data-pick]");if(c){ev.dataTransfer.setData("text/astra",c.dataset.pick);ev.dataTransfer.effectAllowed="copy";}});
 ov.addEventListener("dragover",ev=>{if(!S.map||![...ev.dataTransfer.types].includes("text/astra"))return;ev.preventDefault();const t=tileFromEvent(ev);if(JSON.stringify(t)!==JSON.stringify(S.hover)){S.hover=t;drawOverlay();}});
 ov.addEventListener("drop",ev=>{const pick=ev.dataTransfer.getData("text/astra");if(!pick||!S.map)return;ev.preventDefault();const t=tileFromEvent(ev);if(!t)return;
  const there=M.eventAt(S.map,t.x,t.y);if(tactical(there)){toast("Esa casilla ya está ocupada");return;}
  const r=pickArgs(pick);S.last[r.kind]=T.copy(r.args);edit(()=>{const e=M.create(S.map,r.kind,t.x,t.y,r.args);S.selected=e.id;});toast("✔ Colocado");});
 $("ptabs").addEventListener("click",ev=>{const b=ev.target.closest("[data-panel]");if(b&&S.map){S.panel=b.dataset.panel;if(b.dataset.panel==="units"&&S.tool==="terrain")S.tool="select";renderAll();}});
 $("inspectorBody").addEventListener("input",ev=>{if(ev.target.id!=="rosterFind")return;S.rosterFind=ev.target.value;const q=S.rosterFind.trim().toLowerCase();
  $("inspectorBody").querySelectorAll(".urow").forEach(r=>r.classList.toggle("hidden",!!q&&r.dataset.find.indexOf(q)<0));});
 $("playBtn").onclick=playtest;
 $("inspectorBody").addEventListener("click",onInspectorClick);$("inspectorBody").addEventListener("change",onInspectorChange);
 $("mapSelect").addEventListener("change",ev=>loadMap(Number(ev.target.value)));
 $("undoBtn").onclick=undo;$("redoBtn").onclick=redo;$("saveBtn").onclick=save;
 $("missionBtn").onclick=()=>{if(!S.map)return;let ev=M.missionEvent(S.map);if(!ev)edit(()=>{ev=M.missionEvent(S.map,true);});S.selected=ev.id;S.tool="select";renderAll();};
 $("light").onclick=()=>{if(S.check)modal(`<h2>Revisión de la misión</h2>${S.check.ok?`<p>✔ La misión compila correctamente con TacticsMZ.</p><p class="help">Título: <b>${esc(S.check.summary.title)}</b> · Victoria: <b>${esc(OBJECTIVES[S.check.summary.objective]||S.check.summary.objective)}</b><br>${S.check.summary.allies} aliados · ${S.check.summary.foes} enemigos · ${S.check.summary.reinforcements} refuerzos · ${S.check.summary.interactions} cofres/puertas/aldeas/tiendas · ${S.check.summary.goals} casillas de conquista</p>`:`<p class="error">✖ ${esc(S.check.error)}</p>`}${S.check.warnings.map(w=>`<p>⚠ ${esc(w)}</p>`).join("")}`,[{label:"Cerrar",value:0}]);};
 $("helpBtn").onclick=()=>modal(`<h2>Ayuda rápida</h2><p>Elige una herramienta a la izquierda y haz clic en el mapa. Lo que colocas son <b>eventos normales de MZ</b> con los comandos ★ de TacticsMZ: después puedes abrirlos en el editor de MZ.</p>${emptyHtml().replace(/<div class="card empty">[\s\S]*?<\/div>/,"")}<p class="help">Guía completa: docs/ASTRA_EDITOR.md</p>`,[{label:"Cerrar",value:0}]);
 document.addEventListener("keydown",onKey);
 document.addEventListener("keyup",ev=>{if(ev.key===" "){S.space=false;$("overlay").style.cursor="";}});
 window.addEventListener("beforeunload",ev=>{if(S.dirty||(Astra.dbState&&Astra.dbState.dirty.size)){ev.preventDefault();ev.returnValue="";}});
 welcome();
}
boot();
})();
