// Astra Editor · 🎮 importar un hack de FE8 (The Sacred Stones, USA).
// El usuario aporta su ROM limpia y el parche del hack (.ups / .bps) o la ROM ya parcheada.
// Astra compara las dos y trae solo lo que el hack cambió: capítulos (mapa dibujado, terreno,
// unidades, cofres, puertas, aldeas, tiendas y trono) y los personajes, clases y objetos que el
// hack cambia o que esos capítulos usan. La lógica está en src/editor/03_Rom.js.
"use strict";
(function(){
const Astra=window.Astra,T=window.Tactics,M=T.Editor,D=M.Db,R=M.Rom;
const esc=s=>Astra.ui.esc(s);
const $=id=>document.getElementById(id);
const P=()=>Astra.state.project;
const pause=()=>new Promise(r=>setTimeout(r,20));
const isPatch=f=>/\.(ups|bps)$/i.test(f.name);
const isRom=f=>/\.gba$/i.test(f.name);
Astra.isRomImport=files=>(files||[]).some(f=>isPatch(f)||isRom(f));

Astra.openRomImport=function(initial){
 const p=P();if(!p)return Astra.ui.toast("Primero abre tu proyecto.");
 const {win,closeWin}=Astra.imgTools;
 const S={clean:null,hack:null,result:null,busy:false};
 const w=win(`<header><h2>🎮 Importar un hack de FE8</h2><span class="grow"></span><button class="btn small" data-x="close">✕</button></header>
  <div class="awbody single"><div class="romimp">
   <p>Pasa tu hack de <b>Fire Emblem: The Sacred Stones (USA)</b> a este proyecto. Astra compara el hack con la ROM original y <b>solo trae lo que el hack cambió</b>: sus capítulos (mapa, terreno, unidades, cofres, puertas, aldeas y tiendas) y los personajes, clases y objetos que cambió o que esos capítulos usan.</p>
   <div class="romslots">
    <label class="romslot" id="rsClean"><span class="ki">💾</span><b>1 · Tu ROM limpia de FE8 (USA)</b><small>El .gba original, sin parchear.</small><em></em><input type="file" accept=".gba" hidden data-slot="clean"></label>
    <label class="romslot" id="rsHack"><span class="ki">🩹</span><b>2 · El hack</b><small>Su parche .ups o .bps, o la ROM ya parcheada (.gba).</small><em></em><input type="file" accept=".ups,.bps,.gba" hidden data-slot="hack"></label>
   </div>
   <p class="help">También puedes arrastrar los dos archivos aquí. Todo se procesa en tu navegador: los archivos no salen de tu equipo y Astra no copia la ROM a tu proyecto. Los gráficos de personajes (retratos, animaciones y sprites) no se sacan de la ROM: tráelos desde 🌐 Galería con sus créditos.</p>
   <div id="riOut"></div>
  </div></div>
  <footer><span class="help" id="riHint"></span><span class="grow"></span><button class="btn" data-x="close">Cerrar</button><button class="btn gold" data-x="go" id="riGo" disabled>📥 Importar</button></footer>`);
 const hint=(t,bad)=>{const h=$("riHint");if(h){h.textContent=t;h.classList.toggle("error",!!bad);}};
 const show=()=>{[["clean","rsClean"],["hack","rsHack"]].forEach(([k,id])=>{const el=$(id);if(!el)return;el.classList.toggle("ok",!!S[k]);el.querySelector("em").textContent=S[k]?"✔ "+S[k].name:"";});};
 async function take(files){
  for(const f of files){
   if(isPatch(f))S.hack=f;
   else if(isRom(f)){
    // ¿Cuál es la limpia? La que tiene el CRC de FE8 USA original.
    const head=new Uint8Array(await f.arrayBuffer());
    if(R.crc32(head)===R.FE8U.crc)S.clean=f;else if(!S.hack)S.hack=f;else S.clean=f;
   }
  }
  show();if(S.clean&&S.hack)analyze();
 }
 async function bytes(f){return new Uint8Array(await f.arrayBuffer());}
 async function analyze(){
  if(S.busy)return;S.busy=true;$("riGo").disabled=true;$("riOut").innerHTML="";S.result=null;
  try{
   hint("Leyendo la ROM limpia…");await pause();
   const clean=await bytes(S.clean),cctx=R.open(clean);
   if(cctx.errors.length)throw new Error(cctx.errors.join(" "));
   hint("Aplicando el parche…");await pause();
   const hack=R.applyPatch(clean,await bytes(S.hack));
   T.assert(hack!==clean||S.hack!==S.clean,"Los dos archivos son el mismo.");
   hint("Leyendo el hack…");await pause();
   const hctx=R.open(hack,cctx);if(hctx.errors.length)throw new Error(hctx.errors.join(" "));
   const cdata=R.read(cctx);await pause();const hdata=R.diff(cdata,R.read(hctx));
   S.result={cctx,hctx,cdata,hdata};render();hint("");
  }catch(e){hint("✖ "+e.message,true);}
  finally{S.busy=false;}
 }
 function render(){
  const {cctx,hctx,hdata}=S.result,chs=hdata.chapters.filter(c=>c.changed),same=hdata.chapters.length-chs.length;
  const count=k=>Object.values(hdata[k]).filter(r=>r.changed).length;
  const notes=cctx.notes.concat(hctx.notes).concat(hctx.errors);
  $("riOut").innerHTML=`
   ${notes.length?`<div class="card warn">${notes.map(n=>"⚠ "+esc(n)).join("<br>")}</div>`:""}
   <div class="card"><b>El hack cambia</b>: ${chs.length} capítulo${chs.length===1?"":"s"}, ${count("characters")} personajes, ${count("classes")} clases y ${count("items")} objetos.
    <span class="help">${same} capítulo${same===1?"":"s"} sin cambios no se importan.</span></div>
   ${chs.length?`<h3>Capítulos del hack</h3><div class="romlist">${chs.map(c=>`<label class="romrow"><input type="checkbox" data-ch="${c.index}" checked>
     <b>${esc(c.name)}</b><span class="tag ${c.changed}">${c.changed==="new"?"nuevo":"cambiado"}</span>
     <small>${c.map.width}×${c.map.height} · ${c.units.length} unidades</small></label>`).join("")}</div>`:`<p class="help">El hack no cambia ningún capítulo.</p>`}
   <label class="chk"><input type="checkbox" id="riData" checked> Traer también los personajes, clases y objetos que el hack cambió aunque no salgan en estos capítulos</label>
   <label class="chk"><input type="checkbox" id="riDraw" checked> Dibujar cada mapa con su tileset (imagen del capítulo)</label>
   <div class="card" id="riPlan"></div>
   <details class="help"><summary>Detalles técnicos</summary>
    Tablas del hack: personajes ${R.hex(hctx.charactersAt+0x08000000)}, clases ${R.hex(hctx.classesAt+0x08000000)}, objetos ${R.hex(hctx.itemsAt+0x08000000)}, capítulos ${R.hex(hctx.chaptersAt+0x08000000)}, textos ${R.hex(hctx.textAt+0x08000000)}.
    Textos: ${hctx.huffman?"Huffman":"sin comprimir"}. Campos del capítulo: ${esc(JSON.stringify(hctx.layout||{}))}.</details>`;
  plan();
 }
 const chosen=()=>[...w.querySelectorAll("[data-ch]")].filter(i=>i.checked).map(i=>Number(i.dataset.ch));
 function plan(){
  if(!S.result)return;const pl=R.plan(S.result.hdata,chosen(),{changedData:$("riData").checked});S.plan=pl;
  const n=pl.chapters.length+pl.characters.length+pl.classes.length+pl.items.length;
  $("riPlan").innerHTML=`<b>Se importará</b>: ${pl.chapters.length} mapa${pl.chapters.length===1?"":"s"}, ${pl.characters.length} personajes, ${pl.classes.length} clases y ${pl.items.length} objetos y armas.
   <span class="help">Lo que ya exista en tu proyecto con el mismo nombre se reutiliza, no se duplica.</span>`;
  $("riGo").disabled=!n;
 }
 async function go(){
  if(S.busy||!S.plan)return;
  if(Astra.state.dirty||(Astra.dbState&&Astra.dbState.dirty.size)){Astra.ui.toast("Primero guarda los cambios del mapa y de la base de datos.");return;}
  S.busy=true;$("riGo").disabled=true;
  try{
   const pack=Astra.db.ensurePack();
   hint("Creando datos y mapas…");await pause();
   const cur=Astra.state.map||{},res=R.apply(p,S.plan,{template:{tilesetId:cur.tilesetId,data:cur.data}});
   pack.maps=pack.maps||{};
   pack.terrain=Object.assign({},p.terrain,pack.terrain||{},R.terrainRows(Object.assign({},p.terrain,pack.terrain||{})));
   const draw=$("riDraw").checked,written=[];
   for(const m of res.maps){
    hint("Guardando "+m.json.displayName+"…");await pause();
    if(draw){const img=R.renderMap(S.result.hctx,m.chapter);
     if(img){const c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").putImageData(new ImageData(img.data,img.width,img.height),0,0);
      const blob=await new Promise(r=>c.toBlob(r,"image/png"));await p.backend.write(m.image,blob);delete p.images[m.image];
      pack.maps[m.id]={path:m.image,cell:16,width:m.json.width,height:m.json.height};written.push(m.image);}}
    await Astra.saveFile(p,Astra.mapPath(m.id),JSON.stringify(m.json));written.push(Astra.mapPath(m.id));
   }
   await Astra.saveFile(p,"data/MapInfos.json",D.stringifyTable(p.mapInfos));
   for(const t of ["actors","classes","weapons","items"]){await Astra.saveFile(p,"data/"+D.TABLES[t].file+".json",D.stringifyTable(p[t]));if(Astra.dbState)Astra.dbState.dirty.delete(t);}
   await Astra.saveFile(p,"data/"+p.packName+".json",JSON.stringify(pack));
   await Astra.saveFile(p,"js/plugins.js",Astra.writePlugins(p.plugins));
   if(Astra.dbState){Astra.dbState.dirty.delete("pack");Astra.dbState.dirty.delete("plugins");}
   const r=res.report;
   if(res.maps[0])localStorage.setItem("astra.map."+p.name,String(res.maps[0].id));
   closeWin();await Astra.open(p.backend);
   Astra.ui.modal(`<h2>🎮 Hack importado</h2><p>${r.maps} mapa${r.maps===1?"":"s"}, ${r.units} unidades, ${r.actors} personajes, ${r.classes} clases, ${r.weapons} armas y ${r.items} objetos nuevos${r.reused?` (y ${r.reused} que ya tenías, reutilizados)`:""}.</p>
    <p class="help">Los diálogos y los eventos con lógica (refuerzos, conversaciones, condiciones) no se importan: añádelos con los comandos ★. Los cofres, aldeas y tiendas están colocados pero vacíos, y los retratos y animaciones se traen desde 🌐 Galería.</p>`,[{label:"Vale",value:0,cls:"gold"}]);
  }catch(e){hint("✖ "+e.message,true);$("riGo").disabled=false;}
  finally{S.busy=false;}
 }
 w.onchange=e=>{const i=e.target;if(i.dataset.slot&&i.files[0]){S[i.dataset.slot]=i.files[0];show();if(S.clean&&S.hack)analyze();}else if(i.dataset.ch!==undefined||i.id==="riData")plan();};
 const body=w.querySelector(".awin");
 body.ondragover=e=>{e.preventDefault();};
 body.ondrop=async e=>{e.preventDefault();take(await Astra.droppedFiles(e.dataTransfer));};
 w.onclick=e=>{const b=e.target.closest("[data-x]");if(!b)return;if(b.dataset.x==="close")return closeWin();if(b.dataset.x==="go")return go();};
 if(initial&&initial.length)take(initial);
};
})();
