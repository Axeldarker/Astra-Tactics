// Astra Editor · menú 📥 Importar:
//   - arrastra cualquier cosa (PNG, .zip, script .txt con sus PNG, carpetas) a la ventana o al editor,
//   - o pega un enlace (carpeta o archivo de GitHub, .zip o .png directo),
//   - Astra adivina qué es y abre el importador adecuado: animación de batalla, sprite de mapa, retrato o icono.
"use strict";
(function(){
const Astra=window.Astra,T=window.Tactics,D=T.Editor.Db;
const esc=s=>Astra.ui.esc(s);
const $=id=>document.getElementById(id);
const P=()=>Astra.state.project;
const tools=()=>Astra.imgTools;

const KINDS={
 anim:{icon:"🎞",label:"Animación de batalla",help:"Paquete de FE Essentials / FE Repo / FEBuilder (script .txt + PNG) u hoja de sprites."},
 map:{icon:"🧍",label:"Sprite de mapa",help:"Tira GBA de 3 fotogramas (16×48, 32×96) o rejilla de 3 columnas."},
 portrait:{icon:"🙂",label:"Retrato",help:"Cara de 96×80, hoja GBA de 128×112 o cualquier PNG."},
 icon:{icon:"⚔",label:"Icono de objeto",help:"Icono de 16×16 o una hoja de iconos para elegir uno."}
};

// ---------- descargar de un enlace ----------
const RAW_EXT=/\.(png|txt|zip|gif)$/i;
async function get(url,what){
 let res;try{res=await fetch(url);}catch(e){throw new Error("Ese sitio no deja que el editor descargue "+(what||"el archivo")+" (lo bloquea el navegador). Descárgalo tú y arrástralo aquí.");}
 if(!res.ok)throw new Error(res.status===403||res.status===429?"El sitio limitó las descargas por ahora. Prueba en un rato o descárgalo tú y arrástralo aquí.":res.status===404?"No encontré nada en ese enlace (404).":"No se pudo descargar ("+res.status+").");
 return res;
}
async function githubDir(owner,repo,ref,path,progress,depth){
 const enc=path.split("/").filter(Boolean).map(x=>encodeURIComponent(decodeURIComponent(x))).join("/");
 const res=await get(`https://api.github.com/repos/${owner}/${repo}/contents/${enc}?ref=${encodeURIComponent(ref)}`,"la carpeta");
 const list=await res.json(),entries=Array.isArray(list)?list:[list],out=[];
 const files=entries.filter(x=>x.type==="file"&&RAW_EXT.test(x.name)),dirs=entries.filter(x=>x.type==="dir");
 T.assert(files.length<=300,"Esa carpeta tiene demasiados archivos ("+files.length+"). Entra a la carpeta de un solo recurso.");
 for(const f of files){progress("Descargando "+f.name+"…");const blob=await (await get(f.download_url)).blob();out.push(new File([blob],f.path.slice(Math.max(0,path.lastIndexOf("/")+1))));}
 if((depth||0)<1)for(const d of dirs.slice(0,12))out.push(...await githubDir(owner,repo,ref,d.path,progress,(depth||0)+1));
 return out;
}
Astra.fetchImport=async function(raw,progress){
 progress=progress||(()=>{});
 let u=String(raw||"").trim(),m;T.assert(/^https?:\/\//i.test(u),"Pega un enlace completo, que empiece por https://");
 if((m=u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+?)\/?(?:[?#].*)?$/))){const files=await githubDir(m[1],m[2],m[3],m[4],progress,0);T.assert(files.length,"Esa carpeta de GitHub no tiene PNG, .txt ni .zip.");return files;}
 if((m=u.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+?)(?:[?#].*)?$/)))u=`https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}/${m[4]}`;
 else if(/^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(u))throw new Error("Ese enlace es un repositorio entero. Entra en la carpeta del recurso que quieres y copia ese enlace.");
 if((m=u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)))u="https://drive.google.com/uc?export=download&id="+m[1];
 if(/dropbox\.com/.test(u)){const x=new URL(u);x.searchParams.set("dl","1");u=x.toString();}
 progress("Descargando…");
 const res=await get(u),type=res.headers.get("content-type")||"";
 if(/text\/html/i.test(type))throw new Error("Ese enlace abre una página web, no un archivo. Busca el botón de descarga o el enlace directo al .zip o al .png.");
 const blob=await res.blob();let name="";
 const cd=res.headers.get("content-disposition")||"",cm=cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i);
 try{name=cm?decodeURIComponent(cm[1]):decodeURIComponent(new URL(res.url||u).pathname.split("/").pop()||"");}catch(e){name="";}
 name=name||"descarga";
 if(!/\.\w{2,4}$/.test(name))name+=/png/.test(type)?".png":/zip/.test(type)?".zip":/text/.test(type)?".txt":"";
 return [new File([blob],name)];
};

// ---------- adivinar qué es ----------
const nameOf=f=>f.webkitRelativePath||f.name;
async function expand(list){
 const out=[];
 for(const f of list){if(/\.zip$/i.test(f.name))(await Astra.unzip(f)).forEach(z=>out.push(new File([z.blob],z.name)));else out.push(f);}
 return out.filter(f=>!/(^|\/)(__MACOSX|\.)/.test(nameOf(f))&&!/(^|\/)thumbs\.db$/i.test(nameOf(f)));
}
// Devuelve {kind, why, sure} (kind null = no se sabe).
Astra.detectImport=async function(files){
 for(const f of files.filter(f=>/\.txt$/i.test(f.name))){const t=await f.text();if(/\bp-\s*\S/.test(t)&&/mode/i.test(t))return {kind:"anim",sure:true,why:"Animación de FE: un script con sus fotogramas."};}
 const pngs=files.filter(f=>/\.png$/i.test(f.name));
 if(!pngs.length)return {kind:null,why:"No encontré imágenes PNG."};
 if(pngs.length>1)return {kind:null,why:pngs.length+" imágenes PNG sin script de animación. Dime qué son."};
 const bmp=await createImageBitmap(pngs[0]),w=bmp.width,h=bmp.height,size=w+"×"+h;
 if(w<=64&&h>=w*2.5)return {kind:"map",sure:true,why:"Sprite de mapa GBA ("+size+")."};
 if(w<=32&&h<=32)return {kind:"icon",sure:true,why:"Icono ("+size+")."};
 if((w===96&&h===80)||(w===128&&h===112)||(w===96&&h===96))return {kind:"portrait",sure:true,why:"Retrato estilo GBA ("+size+")."};
 if((w===16||h===16)&&w%16===0&&h%16===0)return {kind:"icon",sure:true,why:"Tira de iconos de 16×16 ("+size+")."};
 if(w>=480||(w%192===0&&h%192===0))return {kind:"anim",sure:true,why:"Hoja de animación ("+size+")."};
 if(w%3===0&&h%4===0&&w/3<=64&&h/4<=64)return {kind:"map",sure:false,why:"Parece un sprite de mapa en rejilla ("+size+")."};
 if(w%16===0&&h%16===0&&w<=512&&h<=512&&w<=128)return {kind:"icon",sure:false,why:"Parece una hoja de iconos ("+size+")."};
 if(w<=200&&h<=200)return {kind:"portrait",sure:false,why:"Puede ser un retrato ("+size+")."};
 return {kind:null,why:"Imagen de "+size+". Dime qué es."};
};

// ---------- abrir el importador de cada tipo ----------
function openKind(kind,files){
 const p=P(),db=Astra.db,png=(files||[]).find(f=>/\.png$/i.test(f.name));
 if(kind==="anim")return Astra.importAnimation({project:p,pack:db.ensurePack,files,done:(name,assigned)=>{db.dirty("pack");if(assigned)db.dirty("classes");db.show("anims",name);Astra.ui.toast("🎞 Animación «"+name+"» importada. Recuerda guardar.");}});
 if(kind==="map")return Astra.importMapSprite({project:p,pack:db.ensurePack,file:png,done:(name,classId)=>{db.dirty("pack");if(classId){D.set("classes",p.classes[classId],"art",name);db.dirty("classes");}Astra.clearArtCache();db.show("classes",classId||undefined);Astra.ui.toast("🧍 Sprite «"+name+"» importado"+(classId?" y asignado a "+p.classes[classId].name:"")+". Recuerda guardar.");}});
 if(kind==="portrait")return Astra.importPortrait({project:p,pack:db.ensurePack,file:png,done:(name,actorId)=>{db.dirty("pack");db.show("actors",actorId);Astra.ui.toast("🙂 Retrato de "+((p.actors[actorId]||{}).name||"")+" importado. Recuerda guardar.");}});
 if(kind==="icon")return Astra.importItemIcon({project:p,pack:db.ensurePack,file:png,done:(target,label)=>{db.dirty("pack");const [g,id]=target.split(":");if(g==="weapon"||g==="item")db.show(g==="weapon"?"weapons":"items",Number(id));else db.show("weapons");Astra.ui.toast("⚔ Icono asignado a "+label+". Recuerda guardar.");}});
}

// ---------- ventana principal ----------
Astra.openImport=function(initial){
 const p=P();if(!p)return Astra.ui.toast("Primero abre tu proyecto.");
 const {win,closeWin}=tools();let busy=false;
 const w=win(`<header><h2>📥 Importar</h2><span class="grow"></span><button class="btn small" data-x="close">✕</button></header>
  <div class="awbody single"><div class="imphub">
   <div class="drop" id="ihDrop"><div class="big">📥</div><p><b>Arrastra aquí lo que quieras importar</b>: un PNG, un .zip, el .txt con sus PNG o una carpeta entera.</p>
    <p class="help">Astra adivina si es una animación de batalla, un sprite de mapa, un retrato o un icono.</p>
    <div class="chips center"><label class="btn small">📄 Elegir archivos<input type="file" multiple hidden data-in="1"></label><label class="btn small">📁 Elegir carpeta<input type="file" webkitdirectory hidden data-in="1"></label></div></div>
   <div class="urlrow"><input id="ihUrl" type="url" placeholder="…o pega un enlace: carpeta o archivo de GitHub, .zip o .png"><button class="btn gold" data-x="url">⬇ Descargar</button></div>
   <p class="help">Sirve con enlaces de GitHub (como el FE Repo, de donde salen muchos recursos de FE Essentials) y con enlaces directos a un .zip o .png. Si un sitio no deja descargar desde el editor, bájalo tú y arrástralo aquí.</p>
   <div id="ihFound"></div>
   <h3>…o elige qué vas a importar</h3>
   <div class="kinds">${Object.keys(KINDS).map(k=>`<button class="kind" data-kind="${k}"><span class="ki">${KINDS[k].icon}</span><b>${KINDS[k].label}</b><small>${KINDS[k].help}</small></button>`).join("")}</div>
  </div></div>
  <footer><span class="help" id="ihHint"></span><span class="grow"></span><button class="btn" data-x="close">Cerrar</button></footer>`);
 let loaded=null;
 const hint=(t,bad)=>{const h=$("ihHint");if(h){h.textContent=t;h.classList.toggle("error",!!bad);}};
 async function take(list){
  if(busy)return;busy=true;
  try{
   hint("Revisando…");const files=await expand([...list]);T.assert(files.length,"No llegó ningún archivo.");
   const d=await Astra.detectImport(files);loaded=files;
   if(d.kind&&d.sure){Astra.ui.toast("Detectado: "+KINDS[d.kind].label+". "+d.why);openKind(d.kind,files);return;}
   $("ihFound").innerHTML=`<div class="card found"><b>${files.length} archivo${files.length>1?"s":""}</b>: ${esc(files.slice(0,4).map(nameOf).join(", "))}${files.length>4?"…":""}<br><span class="help">${esc(d.why)} ${d.kind?"Te marqué el que creo que es; elige abajo.":"Elige abajo qué es."}</span></div>`;
   w.querySelectorAll(".kind").forEach(b=>b.classList.toggle("rec",b.dataset.kind===d.kind));hint("");
  }catch(e){hint("✖ "+e.message,true);}finally{busy=false;}
 }
 const drop=$("ihDrop");
 drop.ondragover=e=>{e.preventDefault();drop.classList.add("over");};drop.ondragleave=()=>drop.classList.remove("over");
 drop.ondrop=async e=>{e.preventDefault();drop.classList.remove("over");take(await Astra.droppedFiles(e.dataTransfer));};
 w.onchange=e=>{if(e.target.dataset.in&&e.target.files.length)take(e.target.files);};
 w.onkeydown=e=>{if(e.target.id==="ihUrl"&&e.key==="Enter")fromUrl();};
 async function fromUrl(){if(busy)return;const url=$("ihUrl").value;busy=true;try{const files=await Astra.fetchImport(url,t=>hint(t));busy=false;await take(files);}catch(e){busy=false;hint("✖ "+e.message,true);}}
 w.onclick=e=>{const b=e.target.closest("[data-x],[data-kind]");if(!b)return;
  if(b.dataset.kind)return openKind(b.dataset.kind,loaded||[]);
  if(b.dataset.x==="close")return closeWin();if(b.dataset.x==="url")return fromUrl();};
 if(initial&&initial.length)take(initial);
};

// ---------- retrato ----------
// GBA / FE Essentials: hoja de 128×112 → la cara grande es el recuadro 96×80 de arriba a la izquierda.
Astra.importPortrait=function(opts){
 const p=opts.project,{loadImage,removeKey,cornerKey,win,closeWin}=tools();let S=null;
 const actors=(p.actors||[]).filter(a=>a&&a.name);
 const w=win(`<header><h2>🙂 Retrato</h2><span class="grow"></span><button class="btn small" data-x="close">✕</button></header>
  <div class="awbody single"><div id="ptBody"><label class="drop"><input type="file" accept="image/png" hidden><div class="big">🙂</div><p><b>Elige el PNG del retrato</b></p><p class="help">FE Essentials / GBA: 96×80 o la hoja de 128×112 (se usa la cara grande). También cualquier PNG con fondo transparente o de un color.</p></label></div></div>
  <footer><span class="help" id="ptHint"></span><span class="grow"></span><button class="btn" data-x="close">Cancelar</button><button class="btn gold" data-x="save" disabled id="ptSave">💾 Guardar retrato</button></footer>`);
 const fail=e=>{$("ptHint").textContent="✖ "+e.message;};
 w.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)load(f).catch(fail);};
 w.onclick=e=>{const b=e.target.closest("[data-x]");if(!b)return;if(b.dataset.x==="close")return closeWin();if(b.dataset.x==="save")save().catch(fail);};
 if(opts.file)load(opts.file).catch(fail);
 async function load(file){
  const raw=await loadImage(file);removeKey(raw,cornerKey(raw));
  const r=raw.width===128&&raw.height===112?{w:96,h:80}:{w:raw.width,h:raw.height},c=document.createElement("canvas");c.width=r.w;c.height=r.h;c.getContext("2d").drawImage(raw,0,0,r.w,r.h,0,0,r.w,r.h);
  S={canvas:c,name:file.name.replace(/\.png$/i,"")};
  $("ptBody").innerHTML=`<div class="row2"><label class="field wide">Nombre<input id="ptName" value="${esc(S.name)}"></label><label class="field">Personaje<select id="ptActor">${actors.map(a=>`<option value="${a.id}"${a.id===opts.actorId?" selected":""}>${a.id} · ${esc(a.name)}</option>`).join("")}</select></label></div>
   <div class="msprev"><canvas id="ptCanvas" width="360" height="200"></canvas></div><p class="help">${r.w}×${r.h}${raw.width===128?" (cara grande de la hoja GBA)":""}. Se usa en el juego en lugar de la cara de MZ.</p>`;
  const cv=$("ptCanvas"),x=cv.getContext("2d"),k=Math.max(1,Math.floor(Math.min(340/r.w,180/r.h)));x.imageSmoothingEnabled=false;x.fillStyle="#1d3440";x.fillRect(0,0,cv.width,cv.height);x.drawImage(c,(cv.width-r.w*k)/2,cv.height-r.h*k,r.w*k,r.h*k);
  $("ptSave").disabled=!actors.length;if(!actors.length)$("ptHint").textContent="No hay personajes en la base de datos.";
 }
 async function save(){
  const name=String($("ptName").value||"").trim(),actorId=Number($("ptActor").value);T.assert(name,"Ponle un nombre.");T.assert(actorId,"Elige un personaje.");
  const pack=opts.pack(),path="img/astra/faces/"+D.fileName(name)+".png",blob=await new Promise(r=>S.canvas.toBlob(r,"image/png"));
  await p.backend.write(path,blob);p.images[path]=createImageBitmap(S.canvas);
  pack.faces=pack.faces||{};pack.faces[actorId]={path,width:S.canvas.width,height:S.canvas.height};
  closeWin();opts.done(name,actorId);
 }
};

// ---------- icono de objeto ----------
Astra.importItemIcon=function(opts){
 const p=opts.project,{loadImage,removeKey,cornerKey,win,closeWin}=tools();let S=null;
 const rows=(list,kind,label)=>(list||[]).filter(r=>r&&r.name).map(r=>`<option value="${kind}:${r.id}"${opts.target===kind+":"+r.id?" selected":""}>${label} ${r.id} · ${esc(r.name)}</option>`).join("");
 const targets=`<optgroup label="Un arma">${rows(p.weapons,"weapon","Arma")}</optgroup><optgroup label="Un objeto">${rows(p.items,"item","Objeto")}</optgroup><optgroup label="Todas las armas de un tipo">${Object.keys(D.WEAPON_TYPES).concat(["staff"]).filter((v,i,a)=>a.indexOf(v)===i).map(t=>`<option value="category:${t}">Tipo: ${esc(D.WEAPON_TYPES[t]||t)}</option>`).join("")}</optgroup>`;
 const w=win(`<header><h2>⚔ Icono de objeto</h2><span class="grow"></span><button class="btn small" data-x="close">✕</button></header>
  <div class="awbody single"><div id="icBody"><label class="drop"><input type="file" accept="image/png" hidden><div class="big">⚔</div><p><b>Elige el PNG del icono</b></p><p class="help">Un icono de 16×16 o una hoja de iconos (eliges uno con un clic).</p></label></div></div>
  <footer><span class="help" id="icHint"></span><span class="grow"></span><button class="btn" data-x="close">Cancelar</button><button class="btn gold" data-x="save" disabled id="icSave">💾 Guardar icono</button></footer>`);
 const fail=e=>{$("icHint").textContent="✖ "+e.message;};
 w.onchange=e=>{if(e.target.id==="icTarget")return;const f=e.target.files&&e.target.files[0];if(f)load(f).catch(fail);};
 w.onclick=e=>{
  const cv=e.target.closest("#icSheet");
  if(cv&&S){const r=cv.getBoundingClientRect(),k=S.k*(r.width/cv.width),cx=Math.floor((e.clientX-r.left)/k/S.cell),cy=Math.floor((e.clientY-r.top)/k/S.cell);S.pick={x:cx,y:cy};draw();return;}
  const b=e.target.closest("[data-x]");if(!b)return;if(b.dataset.x==="close")return closeWin();if(b.dataset.x==="save")save().catch(fail);};
 if(opts.file)load(opts.file).catch(fail);
 async function load(file){
  const raw=await loadImage(file);removeKey(raw,cornerKey(raw));
  const cell=raw.width%16===0&&raw.height%16===0?16:Math.min(raw.width,raw.height);
  S={raw,cell,pick:{x:0,y:0},k:Math.max(1,Math.min(8,Math.floor(560/raw.width))),name:file.name.replace(/\.png$/i,"")};
  $("icBody").innerHTML=`<div class="row2"><label class="field wide">Nombre<input id="icName" value="${esc(S.name)}"></label><label class="field">Usarlo en<select id="icTarget">${targets}</select></label></div>
   <div class="icwrap"><canvas id="icSheet" width="${raw.width*S.k}" height="${raw.height*S.k}"></canvas><canvas id="icBig" width="64" height="64"></canvas></div>
   <p class="help">${raw.width>cell||raw.height>cell?"Haz clic en el icono que quieres.":"Icono de "+cell+"×"+cell+"."}</p>`;
  draw();$("icSave").disabled=false;
 }
 function draw(){
  const cv=$("icSheet"),x=cv.getContext("2d"),k=S.k,c=S.cell;x.imageSmoothingEnabled=false;x.fillStyle="#1d3440";x.fillRect(0,0,cv.width,cv.height);x.drawImage(S.raw,0,0,cv.width,cv.height);
  x.strokeStyle="#d2b567";x.lineWidth=2;x.strokeRect(S.pick.x*c*k+1,S.pick.y*c*k+1,c*k-2,c*k-2);
  const b=$("icBig").getContext("2d");b.imageSmoothingEnabled=false;b.clearRect(0,0,64,64);b.drawImage(S.raw,S.pick.x*c,S.pick.y*c,c,c,0,0,64,64);
 }
 async function save(){
  const name=String($("icName").value||"").trim(),sel=$("icTarget"),target=sel.value,label=sel.options[sel.selectedIndex].text;T.assert(name,"Ponle un nombre.");T.assert(target,"Elige dónde usarlo.");
  const c=S.cell,out=document.createElement("canvas");out.width=c;out.height=c;out.getContext("2d").drawImage(S.raw,S.pick.x*c,S.pick.y*c,c,c,0,0,c,c);
  const pack=opts.pack(),path="img/astra/icons/"+D.fileName(name)+".png",blob=await new Promise(r=>out.toBlob(r,"image/png"));
  await p.backend.write(path,blob);p.images[path]=createImageBitmap(out);
  const [kind,id]=target.split(":"),group=kind==="weapon"?"weapons":kind==="item"?"items":"categories";
  pack.itemIcons=pack.itemIcons||{};pack.itemIcons[group]=pack.itemIcons[group]||{};pack.itemIcons[group][id]={path,rect:[0,0,c,c]};
  closeWin();opts.done(target,label);
 }
};

// ---------- botón y arrastrar archivos a cualquier parte del editor ----------
function boot(){
 const b=$("importBtn");if(b)b.onclick=()=>Astra.openImport();
 const hasFiles=e=>e.dataTransfer&&[...e.dataTransfer.types].indexOf("Files")>=0;
 window.addEventListener("dragover",e=>{if(hasFiles(e)&&P()){e.preventDefault();}});
 window.addEventListener("drop",async e=>{if(e.defaultPrevented||!hasFiles(e)||!P())return;e.preventDefault();const files=await Astra.droppedFiles(e.dataTransfer);if(files.length)Astra.openImport(files);});
}
boot();
})();
