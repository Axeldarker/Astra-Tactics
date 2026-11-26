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

// Save transparent original-pixel PNGs. Per-team sheets avoid changing the project's global palette.
async function png(p,path,img,scale=1){
 const src=document.createElement("canvas");src.width=img.width;src.height=img.height;
 src.getContext("2d").putImageData(new ImageData(img.data,img.width,img.height),0,0);
 let out=src;if(scale!==1){out=document.createElement("canvas");out.width=img.width*scale;out.height=img.height*scale;const x=out.getContext("2d");x.imageSmoothingEnabled=false;x.drawImage(src,0,0,out.width,out.height);}
 const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error("No pude codificar "+path)),"image/png"));
 await p.backend.write(path,blob);delete p.images[path];return src;
}
async function nativeFace(p,name,im){
 const c=document.createElement("canvas");c.width=576;c.height=288;const x=c.getContext("2d");x.imageSmoothingEnabled=false;
 const s=Math.min(144/im.width,144/im.height);const w=Math.round(im.width*s),h=Math.round(im.height*s);x.drawImage(im,Math.round((144-w)/2),144-h,w,h);
 const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("No pude codificar cara MZ")),"image/png"));const path="img/faces/"+name+".png";await p.backend.write(path,blob);delete p.images[path];
}
async function installGraphics(p,pack,ctx,data,plan,res,source,options,hint){
 const r={portraits:0,nativeFaces:0,nativeCharacters:0,nativeTilesets:0,standing:0,moving:0,animations:0,clips:0,icons:0,assigned:0,skipped:0,warnings:[]},base="img/astra/fe8/"+source+"/";
 const tables=R.graphicTables(ctx);r.tables=tables;
 for(const [k,v] of Object.entries(tables))if(v<0)r.warnings.push("Tabla gráfica no localizada: "+k);
 pack.faces=pack.faces||{};pack.units=pack.units||{};pack.atlases=pack.atlases||{};pack.clips=pack.clips||{};pack.itemIcons=pack.itemIcons||{};pack.itemIcons.weapons=pack.itemIcons.weapons||{};pack.itemIcons.items=pack.itemIcons.items||{};
 const faceCache=new Map(),animCache=new Map(),iconCache=new Map();
 const warn=(label,e)=>{r.skipped++;r.warnings.push(label+": "+(e&&e.message||e||"recurso no legible"));};
 async function face(id){if(!id)return null;if(faceCache.has(id))return faceCache.get(id);const im=R.portrait(ctx,id);if(!im){faceCache.set(id,null);return null;}const path=base+"faces/"+id+".png",name="FE8_"+source+"_Face_"+id;const cv=await png(p,path,im);if(options.native)await nativeFace(p,name,cv);const f={path,width:im.width,height:im.height,fe8Source:source,fe8PortraitId:id};faceCache.set(id,{f,name});return {f,name};}
 if(options.faces){for(const c of plan.characters){const row=p.actors[res.ids.characters[c.id]];if(!row)continue;const cls=data.classes[c.classId],id=c.portraitId||(cls&&cls.portraitId)||0;if(!id)continue;
  if(!options.replace&&(pack.faces[row.id]&&!pack.faces[row.id].fe8Source||row.faceName&&!row.faceName.startsWith("FE8_")))continue;
  try{hint("Retratos · "+c.name);const f=await face(id);if(!f){warn(c.name,"retrato "+id+" no legible");continue;}pack.faces[row.id]=Object.assign({name:c.name},f.f);r.portraits++;
   if(options.native&&(!row.faceName||row.faceName.startsWith("FE8_")||options.replace)){D.set("actors",row,"faceName",f.name);D.set("actors",row,"faceIndex",0);r.nativeFaces++;}
  }catch(e){warn(c.name,e);}await pause();}}
 async function animation(id){
  if(animCache.has(id))return animCache.get(id);
  const a=R.battleAnimation(ctx,id);if(!a){animCache.set(id,null);return null;}
  const name="FE8_"+source+"_Anim_"+id,path=base+"battle/"+id+".png",built=R.animationPack(a,name,path);await png(p,path,built.image);pack.atlases[name]=built.atlas;
  for(const k of Object.keys(pack.clips))if(k.startsWith(name+":")||k.startsWith(name+"_far:")||k.startsWith(name+"_idle:")||k.startsWith(name+"_far_idle:")||k.startsWith(name+"_dodge:"))delete pack.clips[k];Object.assign(pack.clips,built.clips);r.animations++;r.clips+=Object.keys(built.clips).length;
  a.errors.forEach(e=>r.warnings.push(name+" · "+e));for(const [mode,tr] of Object.entries(a.modes))if(tr.estimatedImpact&&/normal|critical/i.test(mode))r.warnings.push(name+" · impacto estimado en "+mode);
  const result={name,modes:a.modes,modeKeys:built.modeKeys};animCache.set(id,result);return result;
 }
 for(const c of plan.classes){const row=p.classes[res.ids.classes[c.id]];if(!row)continue;
  const current=D.fields(row,"classes"),name="FE8_"+source+"_Class_"+c.id,protectedArt=current.art&&!String(current.art).startsWith("FE8_")&&!options.replace;
  let art=Object.assign({name,clips:{}},pack.units[name]||{}),installed=false;
  if(options.sprites&&!protectedArt){try{
   hint("Sprites de mapa · "+c.name);let map=null,walk=null;for(let team=0;team<4;team++){
    const sprite=R.standingSprite(ctx,c.smsId,team);if(sprite){const path=base+"map/"+c.id+"_"+team+".png";await png(p,path,sprite.image);if(!map)map={path,width:sprite.width,height:sprite.height,anchorY:sprite.anchorY,teamPaths:{}};map.teamPaths[team]=path;if(team===1)map.path=path;}
    const moving=R.movingSprite(ctx,c.id,team);if(moving){const path=base+"map/"+c.id+"_walk_"+team+".png";await png(p,path,moving.image);if(!walk)walk={path,width:moving.width,height:moving.height,anchorY:moving.anchorY,teamPaths:{}};walk.teamPaths[team]=path;if(team===1){walk.path=path;await png(p,base+"map/"+c.id+"_moving_source.png",moving.source);walk.sourcePath=base+"map/"+c.id+"_moving_source.png";}}
    if(options.native&&team>0&&(sprite||moving)){const native=R.nativeCharacter(sprite,moving),nativeName="$FE8_"+source+"_Class_"+c.id+"_"+team;if(native){await png(p,"img/characters/"+nativeName+".png",native,(Number(p.tileSize)||48)/16);art.nativeCharacters=art.nativeCharacters||{};art.nativeCharacters[team]=nativeName;r.nativeCharacters++;}}
   }
   if(map){art.map=map;r.standing++;installed=true;}else warn(c.name,"sprite de espera "+c.smsId+" no legible");if(walk){art.walk=walk;r.moving++;installed=true;}
  }catch(e){warn(c.name,e);}}
  if(options.battle){const defs=R.classAnimationDefs(ctx,c),assign=Object.assign({},current.battleAnimations||{});let idle="";
   for(const d of defs){try{hint("Animaciones · "+c.name+" · "+d.id);const a=await animation(d.id);if(!a){warn(c.name,"animación "+d.id+" no legible");continue;}
    const mode=m=>a.modeKeys[m]||null;
    if(!idle)idle=mode("idle")||mode("farIdle")||"";
    const item=d.byType?null:data.items[d.type],category=R.WEAPON_TYPES[d.byType?d.type:item&&item.type];
    if(d.byType&&d.type===9){if(mode("idle"))idle=mode("idle");continue;}
    if(!category)continue;
    const actual=!d.byType&&res.ids.items[d.type],key=actual&&actual.kind==="weapon"?"weapon:"+actual.id:category;
    // Keep manually configured tracks unless explicitly asked to replace them.
    const owned=v=>v&&typeof v.normal==="string"&&v.normal.startsWith("FE8_");
    const set=(k,normal,critical,miss)=>{if(!normal||assign[k]&&!owned(assign[k])&&!options.replace)return;assign[k]={normal};if(critical)assign[k].critical=critical;if(miss)assign[k].miss=miss;r.assigned++;};
    set(key,mode("normal")||mode("farNormal"),mode("critical")||mode("farCritical"),mode("miss"));
    if(mode("farNormal"))set(key+":far",mode("farNormal"),mode("farCritical"),mode("miss"));
    if(!art.clips.normal&&(mode("normal")||mode("farNormal"))){art.clips.normal=mode("normal")||mode("farNormal");if(mode("critical"))art.clips.critical=mode("critical");if(mode("miss"))art.clips.miss=mode("miss");}
    installed=true;
   }catch(e){warn(c.name+" / anim "+d.id,e);}}
   if(Object.keys(assign).length)D.set("classes",row,"battleAnimations",assign);
   if(idle)art.idleClip=idle;
  }
  if(installed&&!protectedArt){pack.units[name]=art;D.set("classes",row,"art",name);}
  await pause();
 }
 if(options.native){for(const c of plan.characters){const row=p.actors[res.ids.characters[c.id]],cls=p.classes[res.ids.classes[c.classId]];if(!row||!cls)continue;const art=pack.units[D.fields(cls,"classes").art],name=art&&art.nativeCharacters&&art.nativeCharacters[1];if(name&&(!row.characterName||/^\$FE8_/.test(row.characterName)||options.replace)){D.set("actors",row,"characterName",name);D.set("actors",row,"characterIndex",0);}}}
 if(options.icons){for(const item of plan.items){const ref=res.ids.items[item.id];if(!ref)continue;const group=ref.kind==="weapon"?"weapons":"items",old=pack.itemIcons[group][ref.id];if(old&&!old.fe8Source&&!options.replace)continue;
  try{let entry=iconCache.get(item.iconId);if(!entry){const im=R.itemIcon(ctx,item.iconId);if(!im)continue;const path=base+"icons/"+item.iconId+".png";await png(p,path,im);entry={path,rect:[0,0,16,16],fe8Source:source};iconCache.set(item.iconId,entry);}pack.itemIcons[group][ref.id]=entry;r.icons++;}catch(e){warn(item.name,e);}
 }}
 return r;
}
// Generate a real Tilesets.json record and B-E sheets. Preserve unrelated tilesets and maps.
async function nativeMap(p,source,m,img){
 const built=R.nativeTiles(m.chapter,img),tag="FE8_"+source+"_"+m.chapter.index,names=new Array(9).fill("");
 for(let i=0;i<built.sheets.length;i++)if(built.sheets[i]){const name=tag+"_"+"BCDE"[i];await png(p,"img/tilesets/"+name+".png",built.sheets[i],(Number(p.tileSize)||48)/16);names[5+i]=name;}
 const tilesets=p.tilesets,old=tilesets.find(t=>t&&t.note==="<FE8Tileset:"+tag+">");const id=old?old.id:tilesets.length||1;
 if(!tilesets.length)tilesets.push(null);
 tilesets[id]={id,name:"FE8 · "+m.chapter.name,mode:0,note:"<FE8Tileset:"+tag+">",tilesetNames:names,flags:built.flags};
 m.json.tilesetId=id;m.json.parallaxName="";m.json.parallaxShow=false;
 const n=m.json.width*m.json.height;for(let k=0;k<n;k++)m.json.data[k]=built.ids[k];
 return built.unique;
}
function nativeUnits(p,pack,map){
 for(const e of map.events.filter(Boolean)){const c=M.find(e,"Ally")||M.find(e,"Enemy")||M.find(e,"Unit");if(!c)continue;
  const a=p.actors[c.args.actorId],id=c.args.classId||(a&&a.classId),cls=p.classes[id],art=cls&&pack.units[D.fields(cls,"classes").art],team=c.id==="Ally"?1:c.id==="Enemy"?2:Number(c.args.team)||1;
  const name=art&&art.nativeCharacters&&art.nativeCharacters[team];if(name)Object.assign(M.page(e).image,{characterName:name,characterIndex:0,direction:2,pattern:1,tileId:0});
 }
}

Astra.openRomImport=function(initial){
 const p=P();if(!p)return Astra.ui.toast("Primero abre tu proyecto.");
 const {win,closeWin}=Astra.imgTools;
 const S={clean:null,hack:null,result:null,plan:null,busy:false,sequence:0};
 const w=win(`<header><h2>🎮 Importar Fire Emblem: The Sacred Stones (FE8 · Native Fix)</h2><span class="grow"></span><button class="btn small" data-x="close">✕</button></header>
  <div class="awbody single"><div class="romimp">
   <p>Importa directamente tu <b>ROM de Fire Emblem: The Sacred Stones (USA)</b>: sus capítulos, mapas, terreno y unidades. <b>Solo necesitas el archivo .gba. Incluye recursos gráficos cuando sean legibles.</b> Si quieres importar un hack, agrega un segundo archivo para comparar sus cambios con la ROM original.</p>
   <div class="romslots">
    <label class="romslot" id="rsClean"><span class="ki">💾</span><b>1 · ROM FE8 (USA) · Obligatoria</b><small>El .gba original, sin parchear.</small><em></em><input type="file" accept=".gba" hidden data-slot="clean"></label>
    <label class="romslot" id="rsHack"><span class="ki">🩹</span><b>2 · Hack o parche · Opcional</b><small>Su parche .ups o .bps, o la ROM ya parcheada (.gba).</small><em></em><input type="file" accept=".ups,.bps,.gba" hidden data-slot="hack"></label>
   </div>
   <p class="help">También puedes arrastrar la ROM, o ambos archivos si vas a importar un hack. Todo se procesa en tu navegador: los archivos no salen de tu equipo y Astra no copia la ROM a tu proyecto. La extracción gráfica se ejecuta localmente y guarda PNG y pistas compatibles. Las animaciones especiales y los hacks con formatos no estándar pueden requerir ajustes. Usa recursos que tengas derecho a utilizar.</p>
   <div id="riOut"></div>
  </div></div>
  <footer><button class="btn small" data-x="runtime" id="riRuntime">Actualizar motor gráfico MZ</button><span class="help" id="riHint"></span><span class="grow"></span><button class="btn" data-x="close">Cerrar</button><button class="btn gold" data-x="go" id="riGo" disabled>📥 Importar</button></footer>`);
 const hint=(t,bad)=>{const h=$("riHint");if(h){h.textContent=t;h.classList.toggle("error",!!bad);}};
 const show=()=>{[["clean","rsClean"],["hack","rsHack"]].forEach(([k,id])=>{const el=$(id);if(!el)return;el.classList.toggle("ok",!!S[k]);el.querySelector("em").textContent=S[k]?"✔ "+S[k].name:"";});};
 async function take(files){
  for(const f of files){
   if(isPatch(f))S.hack=f;
   else if(isRom(f)){
    // ¿Cuál es la limpia? La que tiene el CRC de FE8 USA original.
    const head=new Uint8Array(await f.arrayBuffer());
    if(R.crc32(head)===R.FE8U.crc)S.clean=f;else if(!S.clean&&!S.hack)S.clean=f;else if(!S.hack)S.hack=f;else S.clean=f;
   }
  }
  show();if(S.clean)analyze();
 }
 async function bytes(f){return new Uint8Array(await f.arrayBuffer());}
 async function analyze(){
  if(S.busy||!S.clean)return;
  const seq=++S.sequence;S.busy=true;$("riGo").disabled=true;$("riOut").innerHTML="";S.result=null;S.plan=null;
  try{
   hint("Leyendo la ROM FE8 (USA)…");await pause();
   const clean=await bytes(S.clean),cctx=R.open(clean);
   if(cctx.errors.length)throw new Error(cctx.errors.join(" "));
   // Una sola ROM: todos sus capítulos son seleccionables, sin exigir un hack.
   // Dos archivos: se conserva la comparación original de FE8 y sus parches UPS/BPS.
   let hctx=cctx,hdata,mode="direct";
   if(S.hack){
    hint("Aplicando el hack y comparando…");await pause();
    const hack=R.applyPatch(clean,await bytes(S.hack));
    T.assert(S.hack!==S.clean,"Selecciona dos archivos diferentes o deja el hack vacío.");
    hctx=R.open(hack,cctx);
    if(hctx.errors.length)throw new Error(hctx.errors.join(" "));
    const cdata=R.read(cctx);await pause();
    hdata=R.diff(cdata,R.read(hctx));mode="hack";
   }else{
    hint("Leyendo capítulos y datos de FE8…");await pause();
    hdata=R.read(cctx);
   }
   if(hctx.errors.length)throw new Error(hctx.errors.join(" "));
   if(!hdata.chapters.length)throw new Error("No se encontraron capítulos legibles. Comprueba que la ROM sea FE8 USA (BE8E) y que no esté dañada.");
   if(seq!==S.sequence)return;
   S.result={cctx,hctx,hdata,mode};render();hint("");
  }catch(e){if(seq===S.sequence)hint("✖ "+e.message,true);}
  finally{S.busy=false;}
 }
 function render(){
  const {cctx,hctx,hdata,mode}=S.result;
  const direct=mode==="direct",all=hdata.chapters,changed=all.filter(c=>c.changed),same=all.length-changed.length;
  const count=k=>Object.values(hdata[k]).filter(r=>r.changed).length;
  const notes=[...new Set(cctx.notes.concat(hctx.notes).concat(hctx.errors))];
  // Read a real record before any write: the user can see Eirika/character 1, class and portrait.
  const hero=hdata.characters[1],heroClass=hero&&hdata.classes[hero.classId],tables=R.graphicTables(hctx);
  let face=null,standing=null;try{if(hero)face=R.portrait(hctx,hero.portraitId||(heroClass&&heroClass.portraitId)||0);if(heroClass)standing=R.standingSprite(hctx,heroClass.smsId,1);}catch(e){notes.push("Prueba gráfica: "+e.message);}
  S.result.diagnostics={character1:hero?{name:hero.name,id:hero.id,classId:hero.classId,portraitId:hero.portraitId,className:heroClass&&heroClass.name}:null,huffman:!!hctx.huffman,textAt:hctx.textAt,portrait:!!face,standingSprite:!!standing,graphicTables:tables};
  $("riOut").innerHTML=`
   ${notes.length?`<div class="card warn">${notes.map(n=>"⚠ "+esc(n)).join("<br>")}</div>`:""}
   <div class="card">${direct
    ?`<b>ROM original cargada:</b> ${all.length} capítulos detectados. Puedes importar cualquiera de ellos.`
    :`<b>Hack detectado:</b> ${changed.length} capítulos modificados, ${count("characters")} personajes, ${count("classes")} clases y ${count("items")} objetos cambiados.`}
    <span class="help">${direct?"No hace falta añadir un parche ni otra ROM.":same+" capítulos sin cambios también pueden seleccionarse."}</span></div>
   <div class="card"><h3>Comprobación previa · personaje FE8 #1</h3><div style="display:flex;align-items:center;gap:14px">
    <canvas id="riFacePreview" width="96" height="80" style="image-rendering:pixelated;background:#0a1226;border:1px solid var(--line);border-radius:6px;flex:none"></canvas>
    <div><b>${esc(hero?hero.name:"No encontrado")}</b> · ${esc(heroClass?heroClass.name:"Clase no encontrada")}<br>
    <small>Retrato: ${face?"legible":"no legible"} · Sprite: ${standing?"legible":"no legible"} · Textos: ${hctx.huffman?"Huffman":"sin árbol válido"}</small><br>
    <small>CRC: ${R.hex(R.crc32(hctx.rom))}. Si no aparece el personaje correcto, no repitas la importación: revisa los detalles técnicos.</small></div></div></div>
   <h3>Capítulos disponibles (${all.length})</h3>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <button type="button" class="btn small" data-x="selectAll">Seleccionar todos</button>
    <button type="button" class="btn small" data-x="selectNone">Ninguno</button>
    ${direct?"":`<button type="button" class="btn small" data-x="selectChanged">Solo modificados</button>`}
   </div>
   <div class="romlist">${all.map(c=>`<label class="romrow"><input type="checkbox" data-ch="${c.index}" ${direct?c===all[0]?"checked":"":c.changed?"checked":""}>
     <b>${esc(c.name)}</b><span class="tag ${c.changed||""}">${direct?"FE8 original":c.changed==="new"?"nuevo":c.changed?"modificado":"sin cambios"}</span>
     <small>${c.map.width}×${c.map.height} · ${c.units.length} unidades</small></label>`).join("")}</div>
   <label class="chk"><input type="checkbox" id="riData" checked> ${direct?"Importar también todos los personajes, clases y objetos de FE8 (aunque no aparezcan en los capítulos elegidos)":"Traer también los personajes, clases y objetos que el hack cambió aunque no salgan en los capítulos"}</label>
   <label class="chk"><input type="checkbox" id="riDraw" checked> Dibujar cada mapa con su tileset (imagen del capítulo)</label>
   <div class="card"><h3>Recursos de FE8</h3>
    <label class="chk"><input type="checkbox" id="riFaces" checked> Retratos de los personajes</label>
    <label class="chk"><input type="checkbox" id="riSprites" checked> Sprites de mapa en reposo y movimiento, por equipo</label>
    <label class="chk"><input type="checkbox" id="riBattle" checked> Animaciones de batalla por clase y arma (experimental)</label>
    <label class="chk"><input type="checkbox" id="riIcons" checked> Iconos de armas y objetos</label>
    <label class="chk"><input type="checkbox" id="riNative" checked> Crear tilesets editables, sprites de eventos y caras nativas de RPG Maker MZ</label>
    <label class="chk"><input type="checkbox" id="riReplace"> Reemplazar asociaciones gráficas personalizadas existentes</label>
    <label class="chk"><input type="checkbox" id="riRepair"> Reparar/reemplazar el mapa abierto (selecciona exactamente un capítulo; se guarda una copia de seguridad)</label>
    <p class="help">Para reparar un mapa anterior, abre ese mapa, selecciona un único capítulo y marca Reparar/reemplazar el mapa abierto. Esto sustituye sus eventos. Para reparar solo la BD: selecciona Ninguno y deja activada toda la BD. Haz una copia del proyecto antes.</p></div>
   <div class="card" id="riPlan"></div>
   <details class="help"><summary>Detalles técnicos</summary>
    Tablas: personajes ${R.hex(hctx.charactersAt+0x08000000)}, clases ${R.hex(hctx.classesAt+0x08000000)}, objetos ${R.hex(hctx.itemsAt+0x08000000)}, capítulos ${R.hex(hctx.chaptersAt+0x08000000)}, textos ${R.hex(hctx.textAt+0x08000000)}.
    Textos: ${hctx.huffman?"Huffman":"sin comprimir"}. Campos del capítulo: ${esc(JSON.stringify(hctx.layout||{}))}.</details>`;
  if(face){const c=$("riFacePreview");c.width=face.width;c.height=face.height;c.getContext("2d").putImageData(new ImageData(face.data,face.width,face.height),0,0);}
  plan();
 }
 const chosen=()=>[...w.querySelectorAll("[data-ch]")].filter(i=>i.checked).map(i=>Number(i.dataset.ch));
 function plan(){
  if(!S.result)return;const data=S.result.hdata,full=$("riData").checked;
  const pl=R.plan(data,chosen(),{changedData:S.result.mode==="hack"&&full,allData:S.result.mode==="direct"&&full});
  S.plan=pl;
  const n=pl.chapters.length+pl.characters.length+pl.classes.length+pl.items.length;
  $("riPlan").innerHTML=`<b>Se importará</b>: ${pl.chapters.length} mapa${pl.chapters.length===1?"":"s"}, ${pl.characters.length} personajes, ${pl.classes.length} clases y ${pl.items.length} objetos y armas.
   <span class="help">Los datos ya importados se identifican por ROM e ID de FE8. Las entradas antiguas con un nombre único se reutilizan; las asociaciones gráficas manuales se conservan por defecto.</span>`;
  $("riGo").disabled=!n;
 }
 async function go(){
  if(S.busy||!S.plan)return;
  if(Astra.state.dirty||(Astra.dbState&&Astra.dbState.dirty.size)){Astra.ui.toast("Primero guarda los cambios del mapa y de la base de datos.");return;}
  S.busy=true;$("riGo").disabled=true;
  try{
   T.assert(!p.pluginStatus||p.pluginStatus.ok,"Pulsa Actualizar motor gráfico MZ antes de importar.");
   if($("riSprites").checked||$("riBattle").checked){const runtime=await p.backend.text("js/plugins/TacticsUI.js").catch(()=>"");T.assert(runtime.includes("entry.teamPaths")&&runtime.includes("weaponKey"),"Pulsa Actualizar motor gráfico MZ para instalar el lector de los nuevos recursos. Cierra MZ antes de hacerlo.");}
   const repair=$("riRepair").checked;let replaceMapId=0;
   if(repair){T.assert(S.plan.chapters.length===1&&Astra.state.mapId,"Selecciona un único capítulo y abre el mapa a reparar.");T.assert(window.confirm("Se sustituirán el mapa y sus eventos actuales por el capítulo FE8 seleccionado. Se guardará una copia .astra-bak. ¿Continuar?"),"Cancelado.");replaceMapId=Astra.state.mapId;}
   const pack=Astra.db.ensurePack();
   hint("Creando datos y mapas…");await pause();
   const cur=Astra.state.map||{},ctx=S.result.hctx,source=R.crc32(ctx.rom).toString(16).padStart(8,"0");
   const draw=$("riDraw").checked,native=$("riNative").checked;T.assert(!S.plan.chapters.length||draw,"Activa Dibujar cada mapa: no se crearán mapas con tiles de relleno.");const terrain=R.terrainMapping(Object.assign({},p.terrain,pack.terrain||{}),S.plan.chapters);
   // Snapshot options before any asynchronous work. Do not save JSON until all PNGs have been attempted.
   const options={faces:$("riFaces").checked,sprites:$("riSprites").checked,battle:$("riBattle").checked,icons:$("riIcons").checked,native,replace:$("riReplace").checked};
   const res=R.apply(p,S.plan,{source,terrainIds:terrain.ids,nativePreview:draw&&native,replaceMapId,repairActors:true,template:{tilesetId:cur.tilesetId,data:cur.data}});
   pack.maps=pack.maps||{};pack.terrain=terrain.terrain;
   const gr=await installGraphics(p,pack,ctx,S.result.hdata,S.plan,res,source,options,hint),written=[];
   for(const m of res.maps){
    hint("Guardando "+m.json.displayName+"…");await pause();
    if(draw){const img=R.renderMap(ctx,m.chapter);
     if(img){await png(p,m.image,img);pack.maps[m.id]={path:m.image,cell:16,width:m.json.width,height:m.json.height};written.push(m.image);
      if(native){const count=await nativeMap(p,source,m,img);gr.nativeTilesets++;m.nativeTiles=count;}}
     else {throw new Error(m.json.displayName+": no se pudo dibujar el mapa; no se guardará un mapa vacío. Revisa sus tileset y paleta.");}}
    else M.setCommand(M.missionEvent(m.json,true),"Mission",{mapGraphics:"native"});
    if(native)nativeUnits(p,pack,m.json);
    await Astra.saveFile(p,Astra.mapPath(m.id),JSON.stringify(m.json));written.push(Astra.mapPath(m.id));
   }
   if(gr.nativeTilesets)await Astra.saveFile(p,"data/Tilesets.json",D.stringifyTable(p.tilesets));
   await Astra.saveFile(p,"data/MapInfos.json",D.stringifyTable(p.mapInfos));
   for(const t of ["actors","classes","weapons","items"]){await Astra.saveFile(p,"data/"+D.TABLES[t].file+".json",D.stringifyTable(p[t]));if(Astra.dbState)Astra.dbState.dirty.delete(t);}
   await Astra.saveFile(p,"data/"+p.packName+".json",JSON.stringify(pack));
   await Astra.saveFile(p,"js/plugins.js",Astra.writePlugins(p.plugins));
   if(Astra.dbState){Astra.dbState.dirty.delete("pack");Astra.dbState.dirty.delete("plugins");}
   const r=res.report;
   const summary={source,counts:r,diagnostics:S.result.diagnostics,maps:res.maps.map(m=>({id:m.id,fe8Index:m.chapter.index,name:m.json.displayName,nativeTiles:m.nativeTiles||0,tilesetId:m.json.tilesetId,units:m.chapter.units.length})),graphics:gr,limitations:["No se traducen scripts narrativos, refuerzos, inventario de tiendas ni efectos de hechizo.","La orientación, el impacto y las secuencias especiales de batalla requieren verificar con la ROM real.","Los tiles de MZ son metatiles estáticos, sin autotiles ni animación de terreno GBA. La lógica de eventos sigue siendo aproximada."]};
   await Astra.saveFile(p,"data/FE8_Import_"+source+".json",JSON.stringify(summary,null,2));
   if(Astra.clearArtCache)Astra.clearArtCache();
   if(res.maps[0])localStorage.setItem("astra.map."+p.name,String(res.maps[0].id));
   closeWin();await Astra.open(p.backend);
   Astra.ui.modal(`<h2>🎮 Fire Emblem importado</h2><p>${r.maps} mapa${r.maps===1?"":"s"}, ${r.units} unidades, ${r.actors} personajes, ${r.classes} clases, ${r.weapons} armas y ${r.items} objetos nuevos${r.reused?` (y ${r.reused} que ya tenías, reutilizados)`:""}.</p>
    <p><b>Gráficos:</b> ${gr.portraits} retratos, ${gr.standing} sprites de reposo, ${gr.moving} sprites de movimiento, ${gr.animations} animaciones (${gr.clips} pistas), ${gr.assigned} asignaciones, ${gr.icons} iconos, ${gr.nativeTilesets} tilesets MZ y ${gr.nativeCharacters} hojas de personajes nativas.</p>
    ${gr.warnings.length?`<p class="help">⚠ ${gr.warnings.length} avisos. Informe completo: data/FE8_Import_${source}.json.</p><details><summary>Primeros avisos</summary><p class="help">${gr.warnings.slice(0,12).map(esc).join("<br>")}</p></details>`:""}
    <p class="help">Abre MZ de nuevo y prueba desde el menú táctico de TacticsMZ. Los diálogos, refuerzos, efectos especiales y recompensas de eventos requieren conversión adicional; no se han importado.</p>`,[{label:"Vale",value:0,cls:"gold"}]);
  }catch(e){hint("✖ "+e.message,true);$("riGo").disabled=false;}
  finally{S.busy=false;}
 }
 w.onchange=e=>{if(S.busy)return;const i=e.target;if(i.dataset.slot&&i.files[0]){
   S[i.dataset.slot]=i.files[0];show();if(S.clean)analyze();
  }else if(i.dataset.ch!==undefined||i.id==="riData")plan();};
 async function updateRuntime(){if(S.busy)return;if(!window.confirm("Cierra RPG Maker MZ antes de continuar. ¿Instalar los plugins TacticsMZ incluidos en esta versión de ASTRA? Se guardan copias .astra-bak."))return;
  S.busy=true;try{hint("Actualizando los plugins…");await Astra.installPlugins(p);hint("Motor gráfico actualizado. Ya puedes importar.");}catch(e){hint("✖ "+e.message,true);}finally{S.busy=false;if(S.result)plan();}}
 const body=w.querySelector(".awin");
 body.ondragover=e=>{e.preventDefault();};
 body.ondrop=async e=>{e.preventDefault();if(S.busy)return;take(await Astra.droppedFiles(e.dataTransfer));};
 w.onclick=e=>{const b=e.target.closest("[data-x]");if(!b)return;if(b.dataset.x==="close"){if(!S.busy)closeWin();return;}if(b.dataset.x==="go")return go();if(b.dataset.x==="runtime")return updateRuntime();
  if(!S.busy&&["selectAll","selectNone","selectChanged"].includes(b.dataset.x)){
   w.querySelectorAll("[data-ch]").forEach(i=>{const c=S.result&&S.result.hdata.chapters.find(c=>c.index===Number(i.dataset.ch));i.checked=b.dataset.x==="selectAll"||(b.dataset.x==="selectChanged"&&!!(c&&c.changed));});
   plan();return;
  }};
 if(initial&&initial.length)take(initial);
};
})();
