// Astra Editor · animaciones de batalla y sprites de mapa:
//   - reproductor (dibuja igual que TacticsUI en la batalla),
//   - importador: hoja de sprites en rejilla o paquete de FE Essentials / FEBuilder (script .txt + PNG, carpeta o .zip),
//   - importador de sprites de mapa (formato GBA de 3 fotogramas en vertical o rejilla).
"use strict";
(function(){
const Astra=window.Astra,T=window.Tactics,D=T.Editor.Db;
const esc=s=>Astra.ui.esc(s);
const $=id=>document.getElementById(id);

// ---------- dibujo (copia de Tactics.Graphics.layer) ----------
Astra.drawLayer=function(c,image,rect,tr,x,y,scale,facing){
 if(!image||!rect)return;const s=scale*(tr.zoom===undefined?1:tr.zoom);
 c.save();c.translate(x+(tr.x||0)*scale*facing,y+(tr.y||0)*scale);c.scale(facing*(tr.mirror?-1:1)*s,s);c.rotate(-(tr.angle||0)*Math.PI/180);
 c.globalAlpha=tr.opacity===undefined?1:tr.opacity;c.globalCompositeOperation=tr.blend===1?"lighter":"source-over";
 c.imageSmoothingEnabled=false;c.drawImage(image,rect.x,rect.y,rect.w,rect.h,-rect.ox,-rect.oy,rect.w,rect.h);c.restore();
};
// Escala fija (2×) para que todas las animaciones se comparen al mismo tamaño, como en el juego.
// Igual que la batalla del motor: el atacante a la izquierda (dibujado tal cual, debe mirar a la derecha)
// y el rival a la derecha (volteado). Si una animación mira hacia fuera, se arregla con ↔ Voltear.
class Player{
 constructor(canvas){this.c=canvas;this.ctx=canvas.getContext("2d");this.t=0;this.playing=true;this.speed=1;this.src=null;this.rival=null;this.raf=0;this.onTick=null;this.scale=2;}
 load(src){this.src=src;this.t=0;}
 setRival(src){this.rival=src;}
 start(){cancelAnimationFrame(this.raf);const step=()=>{this.draw();if(this.playing&&this.src){this.t+=this.speed;if(this.t>=this.src.frames.length+40)this.t=0;}if(this.onTick)this.onTick(this);this.raf=requestAnimationFrame(step);};step();}
 stop(){cancelAnimationFrame(this.raf);this.raf=0;}
 frameIndex(){return this.src?Math.min(this.src.frames.length-1,Math.floor(this.t)):0;}
 draw(){
  const c=this.ctx,W=this.c.width,H=this.c.height,ground=H-46,S=this.scale||2,ax=W*.3,ex=W*.74;
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1b3a4a");g.addColorStop(.62,"#2c5568");g.addColorStop(.63,"#3e5b3a");g.addColorStop(1,"#22331f");c.fillStyle=g;c.fillRect(0,0,W,H);
  // plataformas
  [[ex,"#6f8f5c"],[ax,"#7d9c69"]].forEach(([x,col])=>{c.fillStyle=col;c.beginPath();c.ellipse(x,ground+4,W*.17,12,0,0,Math.PI*2);c.fill();c.fillStyle="#0004";c.beginPath();c.ellipse(x,ground+8,W*.17,10,0,0,Math.PI);c.fill();});
  // rival de referencia: otra animación (mirando hacia el atacante) o una silueta de 32 px
  const rf=this.rival&&this.rival.frames[0];
  if(rf&&rf.length)rf.forEach(l=>{const a=this.rival.atlases[l.atlas];if(a&&a.image)Astra.drawLayer(c,a.image,a.rects[l.rect],l,ex,ground-24*S,S,-1);});
  else{c.fillStyle="#00000055";c.fillRect(ex-6*S,ground-32*S,12*S,32*S);}
  c.fillStyle="#ffffff44";c.font="11px sans-serif";c.textAlign="center";c.fillText(this.rival&&this.rival.name||"rival",ex,ground+28);
  if(!this.src||!this.src.frames.length){c.fillStyle="#cfdada";c.font="14px sans-serif";c.fillText("Sin fotogramas",W/2,H/2);return;}
  const i=this.frameIndex(),frame=this.src.frames[i]||[];
  frame.forEach(l=>{const a=this.src.atlases[l.atlas];if(a&&a.image)Astra.drawLayer(c,a.image,a.rects[l.rect],l,ax,ground-24*S,S,1);});
  const sinceHit=this.t-this.src.impact;if(sinceHit>=0&&sinceHit<8){c.fillStyle=`rgba(255,240,200,${.6-sinceHit*.07})`;c.beginPath();c.arc(ex,ground-16*S,(10+sinceHit*3)*S/2,0,Math.PI*2);c.fill();}
  c.fillStyle="#081419cc";c.fillRect(8,8,170,22);c.fillStyle="#eee8d5";c.font="12px monospace";c.textAlign="left";c.fillText(`${i+1}/${this.src.frames.length} · ${(this.src.frames.length/60).toFixed(2)} s${i>=this.src.impact&&i<this.src.impact+8?"  ⚡":""}`,14,23);
  // barra de tiempo con la marca de impacto
  const bw=W-16;c.fillStyle="#0008";c.fillRect(8,H-10,bw,4);c.fillStyle="#d2b567";c.fillRect(8,H-10,bw*Math.min(1,i/Math.max(1,this.src.frames.length-1)),4);c.fillStyle="#ff8a8a";c.fillRect(8+bw*this.src.impact/Math.max(1,this.src.frames.length-1)-1,H-14,3,12);
 }
}
Astra.Player=Player;
// Fuente para el reproductor a partir de una pista del paquete de gráficos.
Astra.clipSource=async function(p,clip){
 const atlases={};const names=new Set();(clip.frames||[]).forEach(f=>(f||[]).forEach(l=>names.add(l.atlas)));
 await Promise.all([...names].map(async n=>{const a=p.pack.atlases[n];if(a)atlases[n]={image:await Astra.image(p,a.path),rects:a.rects};}));
 return {frames:clip.frames||[],impact:clip.impact||0,atlases};
};

// Rival de referencia: primer fotograma de la animación elegida ("" = silueta).
Astra.rivalSource=async function(p,name){
 const a=name&&D.animations(p.pack)[name],clip=a&&p.pack.clips[a.modes.normal||Object.values(a.modes)[0]];if(!clip)return null;
 const src=await Astra.clipSource(p,{frames:[clip.frames[0]||[]],impact:0});src.name=name;return src;
};
Astra.rivalOptions=(p,cur)=>`<option value="">Rival: silueta</option>`+Object.keys(D.animations(p.pack)).sort().map(n=>`<option value="${esc(n)}"${n===cur?" selected":""}>Rival: ${esc(n)}</option>`).join("");
Astra.rivalName=()=>localStorage.getItem("astra.rival")||"";

// ---------- utilidades de imagen ----------
const loadImage=async blob=>{const bmp=await createImageBitmap(blob),c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;c.getContext("2d").drawImage(bmp,0,0);return c;};
const pixels=c=>c.getContext("2d").getImageData(0,0,c.width,c.height);
// Color de fondo: el píxel de la esquina, si es opaco.
const cornerKey=c=>{const d=c.getContext("2d").getImageData(0,0,1,1).data;return d[3]>8?[d[0],d[1],d[2]]:null;};
function removeKey(c,key){if(!key)return c;const x=c.getContext("2d"),img=x.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4)if(d[i]===key[0]&&d[i+1]===key[1]&&d[i+2]===key[2])d[i+3]=0;x.putImageData(img,0,0);return c;}
const hex=k=>k?"#"+k.map(v=>v.toString(16).padStart(2,"0")).join(""):"";
// .zip mínimo (los paquetes de FE Essentials suelen venir comprimidos). Usa DecompressionStream de Chrome/Edge.
Astra.unzip=async function(blob){
 const buf=new DataView(await blob.arrayBuffer()),out=[];let end=-1;
 for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65557);i--)if(buf.getUint32(i,true)===0x06054b50){end=i;break;}
 T.assert(end>=0,"El .zip está dañado o no es un zip.");
 let p=buf.getUint32(end+16,true);const count=buf.getUint16(end+10,true),dec=new TextDecoder();
 for(let n=0;n<count;n++){
  T.assert(buf.getUint32(p,true)===0x02014b50,"Directorio del .zip inválido.");
  const method=buf.getUint16(p+10,true),size=buf.getUint32(p+20,true),nameLen=buf.getUint16(p+28,true),extra=buf.getUint16(p+30,true),comment=buf.getUint16(p+32,true),local=buf.getUint32(p+42,true);
  const name=dec.decode(new Uint8Array(buf.buffer,p+46,nameLen));p+=46+nameLen+extra+comment;
  if(name.endsWith("/"))continue;
  const start=local+30+buf.getUint16(local+26,true)+buf.getUint16(local+28,true),data=new Uint8Array(buf.buffer,start,size);
  let file;if(method===0)file=new Blob([data]);else if(method===8)file=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob();else continue;
  out.push({name,blob:file});
 }
 return out;
};
const base=n=>String(n).split(/[\\/]/).pop().toLowerCase();

// Archivos soltados: también carpetas completas (se recorren).
Astra.droppedFiles=async function(dt){
 const out=[],walk=async entry=>{if(entry.isFile)out.push(await new Promise(r=>entry.file(r)));else if(entry.isDirectory){const r=entry.createReader();let batch;do{batch=await new Promise(res=>r.readEntries(res));for(const e of batch)await walk(e);}while(batch.length);}};
 const items=[...dt.items].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);if(items.length){for(const e of items)await walk(e);return out;}return [...dt.files];
};
// ---------- ventana del importador ----------
function win(html){
 let w=$("animWin");if(!w){w=document.createElement("div");w.id="animWin";w.className="overlay dim";document.body.appendChild(w);}
 w.innerHTML=`<div class="awin">${html}</div>`;w.classList.remove("hidden");return w;
}
const closeWin=()=>{const w=$("animWin");if(w){w.classList.add("hidden");w.innerHTML="";}};
Astra.imgTools={loadImage,pixels,cornerKey,removeKey,win,closeWin};

// opts: {project, pack(): devuelve el paquete (lo crea si falta), done(nombre)}
Astra.importAnimation=function(opts){
 const p=opts.project;
 const I={mirror:false,name:"",frames:[],cell:{w:0,h:0},anchor:{x:0,y:0},zoom:1,mode:"normal",tracks:{normal:{steps:[],impact:0},critical:null,miss:null},ranged:null,sheet:null,key:null,source:null,assign:{classId:0,wtype:""}};
 let player=null;
 const shell=()=>{const w=win(`<header><h2>🎞 Importar animación de batalla</h2><span class="grow"></span><button class="btn small" data-x="close">✕</button></header>
  <div class="awbody"><div class="awleft" id="awLeft"></div><div class="awright" id="awRight"></div></div>
  <footer><span class="help" id="awHint">Elige de dónde viene la animación.</span><span class="grow"></span><button class="btn" data-x="close">Cancelar</button><button class="btn gold" data-x="save" disabled id="awSave">💾 Guardar animación</button></footer>`);
  w.onclick=onClick;w.onchange=onChange;w.oninput=onInput;return w;};
 shell();
 pickSource();
 // Archivos que ya trae el menú 📥 Importar (arrastrados o descargados de un enlace).
 if(opts.files&&opts.files.length){const f=opts.files;if(f.length===1&&/\.png$/i.test(f[0].name))loadSheet(f[0]);else loadFE(f);}
 function pickSource(){
  $("awLeft").innerHTML=`<div class="drop" id="awDrop"><div class="big">🎞</div><p><b>Arrastra aquí</b> la hoja PNG, el .zip o la carpeta de la animación</p>
   <div class="srcs"><label class="src"><input type="file" accept="image/png" data-in="sheet" hidden><b>📄 Hoja de sprites</b><span>Un PNG con todos los fotogramas en rejilla.</span></label>
   <label class="src"><input type="file" accept=".zip,.txt,.png" multiple data-in="fe" hidden><b>📦 FE Essentials / FEBuilder</b><span>El .zip descargado, o el script .txt junto con sus PNG.</span></label>
   <label class="src"><input type="file" webkitdirectory data-in="fe" hidden><b>📁 Carpeta</b><span>La carpeta descomprimida de una animación.</span></label></div>
   <p class="help">Formato FE Essentials (feessentials.com), FE Repo y FEBuilder: fotogramas PNG de 240×160 y un script con <code>/// - Mode 1</code>, <code>3 p- frame.png</code>, <code>C1A</code>…</p></div>`;
  $("awRight").innerHTML=`<div class="card"><h3>¿Cómo funciona?</h3><ol class="help"><li>Carga la animación.</li><li>Revisa la vista previa: los pies deben quedar sobre la plataforma.</li><li>Elige el orden de fotogramas (los paquetes de FE ya lo traen) y el momento del golpe ⚡.</li><li>Asígnala a una clase y guarda.</li></ol></div>`;
  const drop=$("awDrop");drop.ondragover=e=>{e.preventDefault();drop.classList.add("over");};drop.ondragleave=()=>drop.classList.remove("over");
  drop.ondrop=async e=>{e.preventDefault();drop.classList.remove("over");const files=await Astra.droppedFiles(e.dataTransfer);if(files.length===1&&/\.png$/i.test(files[0].name))loadSheet(files[0]);else loadFE(files);};
 }
 // --- hoja en rejilla ---
 async function loadSheet(file){
  try{
   const c=await loadImage(file);I.source="sheet";I.name=I.name||file.name.replace(/\.png$/i,"");I.key=cornerKey(c);I.sheet={raw:c};
   // tamaño de celda: 192 (FE Essentials RMXP), si no un tercio/quinto que divida exacto
   const guess=n=>[192,240,128,96,64,48,32].find(s=>n%s===0&&n/s<=12)||n;I.cell={w:guess(c.width),h:guess(c.height)};
   sliceSheet();I.tracks={normal:{steps:I.frames.slice(0,8).map((f,i)=>({frame:i,ticks:5})),impact:Math.min(3,Math.max(0,I.frames.length-1))},critical:null,miss:null};
   ready();
  }catch(e){hint("✖ "+e.message,true);}
 }
 function sliceSheet(){
  const c=document.createElement("canvas");c.width=I.sheet.raw.width;c.height=I.sheet.raw.height;c.getContext("2d").drawImage(I.sheet.raw,0,0);removeKey(c,I.key);I.sheet.keyed=c;
  const img=pixels(c),cells=D.grid(c.width,c.height,I.cell.w,I.cell.h);I.sheet.cellToFrame={};I.frames=[];
  cells.forEach((cell,ci)=>{const t=D.trim(img,cell,null);if(!t)return;I.sheet.cellToFrame[ci]=I.frames.length;I.frames.push({img:c,sx:t.x,sy:t.y,w:t.w,h:t.h,dx:t.dx,dy:t.dy,cell:ci,label:"#"+ci});});
  const first=cells.find((c,i)=>I.sheet.cellToFrame[i]!==undefined);I.anchor=first?D.guessAnchor(img,first,null):{x:I.cell.w/2,y:I.cell.h};I.sheet.cells=cells;
 }
 // --- FE Essentials / FEBuilder ---
 async function loadFE(list){
  try{
   let files=[];for(const f of list){if(/\.zip$/i.test(f.name))(await Astra.unzip(f)).forEach(z=>files.push({name:z.name,blob:z.blob}));else files.push({name:f.webkitRelativePath||f.name,blob:f});}
   const scripts=[];for(const f of files.filter(f=>/\.txt$/i.test(f.name))){const text=await f.blob.text();if(/\bp-\s*\S/.test(text)&&/mode/i.test(text))scripts.push({name:f.name,text});}
   T.assert(scripts.length,"No encontré el script de la animación (.txt con «/// - Mode 1» y líneas «3 p- frame.png»). Incluye el .txt junto a los PNG.");
   const script=scripts.sort((a,b)=>b.text.length-a.text.length)[0],modes=D.parseFEScript(script.text);
   T.assert(modes[1]||modes[5],"El script no tiene modo de ataque (Mode 1 o Mode 5).");
   const pngs={};files.filter(f=>/\.png$/i.test(f.name)).forEach(f=>{pngs[base(f.name)]=f.blob;});
   const used=[...new Set(Object.values(modes).flatMap(m=>m.steps.map(s=>s.file)))],index={},missing=[];I.frames=[];
   for(const name of used){const blob=pngs[base(name)]||pngs[base(name)+".png"];if(!blob){missing.push(name);continue;}
    let c=await loadImage(blob);
    // Fotogramas "perforantes": dos mitades; la izquierda va encima del rival y la derecha debajo. Aquí se combinan.
    if(c.width>=480){const half=Math.floor(c.width/2),m=document.createElement("canvas");m.width=half;m.height=c.height;const x=m.getContext("2d");x.drawImage(removeKey(c,cornerKey(c)),half,0,half,c.height,0,0,half,c.height);x.drawImage(c,0,0,half,c.height,0,0,half,c.height);c=m;}
    else removeKey(c,cornerKey(c));
    const t=D.trim(pixels(c),{x:0,y:0,w:c.width,h:c.height},null);index[name]=I.frames.length;
    I.frames.push(t?{img:c,sx:t.x,sy:t.y,w:t.w,h:t.h,dx:t.dx,dy:t.dy,label:name}:{img:c,sx:0,sy:0,w:1,h:1,dx:0,dy:0,label:name,empty:true});}
   T.assert(I.frames.length,"No encontré los PNG de los fotogramas. Faltan: "+missing.slice(0,4).join(", "));
   // En GBA el jugador está a la derecha mirando a la izquierda; en Astra el atacante mira a la derecha.
   I.source="fe";I.mirror=true;I.cell={w:I.frames[0].img.width,h:I.frames[0].img.height};
   const stand=(modes[9]||modes[1]||modes[5]).steps[0],sf=I.frames[index[stand.file]]||I.frames[0];I.anchor=D.guessAnchor(pixels(sf.img),{x:0,y:0,w:sf.img.width,h:sf.img.height},null);
   const conv=m=>m?{steps:m.steps.filter(s=>index[s.file]!==undefined).map(s=>({frame:index[s.file],ticks:s.ticks})),impact:m.impact}:null;
   const melee=D.feTracks(modes,false),far=D.feTracks(modes,true);
   I.tracks={normal:conv(melee.normal),critical:conv(melee.critical),miss:conv(melee.miss)};
   I.ranged=modes[5]&&modes[1]?{normal:conv(far.normal),critical:conv(far.critical),miss:conv(far.miss)}:null;
   I.name=I.name||D.fileName(script.name.split(/[\\/]/).pop().replace(/\.txt$/i,"").replace(/\s*\[.*?\]/g,"").replace(/\bscript\b/ig,"").trim()).slice(0,40);
   I.modesFound=Object.keys(modes).map(Number);ready();
   if(missing.length)hint("⚠ Faltan "+missing.length+" PNG del script: "+missing.slice(0,3).join(", ")+(missing.length>3?"…":""),true);
  }catch(e){hint("✖ "+e.message,true);}
 }
 // --- edición ---
 function hint(t,bad){const h=$("awHint");if(h){h.textContent=t;h.classList.toggle("error",!!bad);}}
 const rect=f=>({x:f.sx,y:f.sy,w:f.w,h:f.h,ox:I.anchor.x-f.dx,oy:I.anchor.y-f.dy-24/I.zoom});
 function source(track){
  const atlases={},frames=[];I.frames.forEach((f,i)=>{atlases["f"+i]={image:f.img,rects:[rect(f)]};});
  let impact=0;(track?track.steps:[]).forEach((s,j)=>{if(j===track.impact)impact=frames.length;for(let t=0;t<s.ticks;t++)frames.push([{atlas:"f"+s.frame,rect:0,zoom:I.zoom,mirror:I.mirror}]);});
  return {frames,impact,atlases};
 }
 const track=()=>I.tracks[I.mode];
 function ready(){
  $("awSave").disabled=false;
  hint(I.source==="fe"?`Paquete de FE: modos ${I.modesFound.join(", ")}. Ya trae el orden y el golpe ⚡ y va volteada para mirar al rival; solo revisa los pies y asígnala.`:"Haz clic en las celdas para añadirlas a la pista, en orden. Marca con ⚡ el fotograma del golpe.");
  renderLeft();renderRight();
 }
 function renderLeft(){
  const L=$("awLeft");
  if(I.source==="sheet"){const c=I.sheet.keyed,s=Math.max(.25,Math.min(2,(L.clientWidth-30)/c.width));
   L.innerHTML=`<p class="help">Hoja ${c.width}×${c.height} · celdas ${I.cell.w}×${I.cell.h} · ${I.frames.length} fotogramas con dibujo. <b>Clic</b> = añadir a la pista.</p><div class="sheetwrap"><canvas id="awSheet" width="${Math.round(c.width*s)}" height="${Math.round(c.height*s)}" data-s="${s}"></canvas></div>`;
   drawSheet();}
  else L.innerHTML=`<p class="help">${I.frames.length} fotogramas. <b>Clic</b> = añadir a la pista.</p><div class="frames">${I.frames.map((f,i)=>`<button class="fr" data-add="${i}" title="${esc(f.label)}"><canvas width="64" height="64" data-thumb="${i}"></canvas><small>${i}</small></button>`).join("")}</div>`;
  paintThumbs(L);
 }
 function drawSheet(){
  const cv=$("awSheet");if(!cv)return;const s=Number(cv.dataset.s),x=cv.getContext("2d"),c=I.sheet.keyed;x.imageSmoothingEnabled=false;
  x.fillStyle="#0b1a1f";x.fillRect(0,0,cv.width,cv.height);x.drawImage(c,0,0,cv.width,cv.height);
  const inTrack=new Set((track()||{steps:[]}).steps.map(st=>I.frames[st.frame]&&I.frames[st.frame].cell));
  I.sheet.cells.forEach((cell,ci)=>{const f=I.sheet.cellToFrame[ci];x.strokeStyle=inTrack.has(ci)?"#d2b567":"#ffffff22";x.lineWidth=inTrack.has(ci)?2:1;x.strokeRect(cell.x*s+.5,cell.y*s+.5,cell.w*s-1,cell.h*s-1);
   if(f===undefined){x.fillStyle="#00000066";x.fillRect(cell.x*s,cell.y*s,cell.w*s,cell.h*s);}else{x.fillStyle="#ffffffaa";x.font="10px sans-serif";x.fillText(String(f),cell.x*s+3,cell.y*s+11);
    x.strokeStyle="#ff8a8a88";x.beginPath();x.moveTo((cell.x+I.anchor.x)*s-4,(cell.y+I.anchor.y)*s);x.lineTo((cell.x+I.anchor.x)*s+4,(cell.y+I.anchor.y)*s);x.stroke();}});
 }
 function paintThumbs(root){root.querySelectorAll("canvas[data-thumb]").forEach(cv=>{const f=I.frames[Number(cv.dataset.thumb)];if(!f)return;const x=cv.getContext("2d"),s=Math.min(cv.width/f.w,cv.height/f.h,3);x.imageSmoothingEnabled=false;x.clearRect(0,0,cv.width,cv.height);x.drawImage(f.img,f.sx,f.sy,f.w,f.h,(cv.width-f.w*s)/2,(cv.height-f.h*s)/2,f.w*s,f.h*s);});}
 function renderRight(){
  const R=$("awRight"),t=track(),classes=(p.classes||[]).filter(r=>r&&r.name),cls=p.db.classes[I.assign.classId];
  const wtypes=cls?(cls.weaponTypes||[]):[];if(cls&&wtypes.indexOf(I.assign.wtype)<0)I.assign.wtype=wtypes[0]||"";
  R.innerHTML=`<div class="row2"><label class="field wide">Nombre<input data-v="name" value="${esc(I.name)}" placeholder="Mirmidon_espada"></label></div>
  <canvas id="awPlayer" class="player" width="420" height="250"></canvas>
  <div class="row3">
   <label class="field">Pies X<input type="number" data-v="ax" value="${I.anchor.x}"></label>
   <label class="field">Pies Y<input type="number" data-v="ay" value="${I.anchor.y}"></label>
   <label class="field">Escala<input type="number" step="0.25" min="0.25" data-v="zoom" value="${I.zoom}"></label>
  </div>
  <div class="row2"><label class="field check2"><input type="checkbox" data-v="mirror"${I.mirror?" checked":""}> ↔ Voltear (debe mirar a la derecha, hacia el rival)</label><label class="field"><select data-v="rival">${Astra.rivalOptions(p,Astra.rivalName())}</select></label></div>
  ${I.source==="sheet"?`<div class="row3"><label class="field">Celda ancho<input type="number" data-v="cw" value="${I.cell.w}"></label><label class="field">Celda alto<input type="number" data-v="ch" value="${I.cell.h}"></label><label class="field">Fondo<input type="color" data-v="key" value="${hex(I.key)||"#000000"}" ${I.key?"":"disabled"}></label></div>`:""}
  <p class="help">La línea roja en la hoja marca los pies. Si el personaje flota o se hunde en la plataforma, ajusta <b>Pies Y</b>.</p>
  <div class="tabs">${Object.keys(D.MODES).map(m=>`<button class="${I.mode===m?"on":""}" data-mode="${m}">${D.MODES[m]} <small>${I.tracks[m]?I.tracks[m].steps.length:"= Normal"}</small></button>`).join("")}</div>
  <div class="timeline">${t&&t.steps.length?t.steps.map((s,j)=>`<div class="step${j===t.impact?" hit":""}"><canvas width="40" height="40" data-thumb="${s.frame}"></canvas><input type="number" min="1" value="${s.ticks}" data-ticks="${j}" title="Duración en 1/60 s"><button data-impact="${j}" title="El golpe ocurre aquí">⚡</button><button data-rm="${j}" title="Quitar">✕</button></div>`).join(""):`<p class="help">${I.mode==="normal"?"Pista vacía: haz clic en los fotogramas de la izquierda.":"Vacía: usará la misma que Normal. Haz clic en fotogramas para hacer una propia."}</p>`}</div>
  <div class="chips"><button class="btn small" data-x="all">Todos en orden</button>${I.mode!=="normal"?`<button class="btn small" data-x="copy">Copiar de Normal</button>`:""}<button class="btn small" data-x="clear">Vaciar</button>${I.ranged?`<span class="help">También se creará <b>${esc(I.name)}-distancia</b> (modos 5/6).</span>`:""}</div>
  <div class="card assign"><h3>Asignar a una clase (opcional)</h3><div class="row2"><label class="field">Clase<select data-v="cls"><option value="0">— ninguna —</option>${classes.map(c=>`<option value="${c.id}"${c.id===I.assign.classId?" selected":""}>${c.id} · ${esc(c.name)}</option>`).join("")}</select></label>
   <label class="field">Con arma<select data-v="wt">${wtypes.map(w=>`<option value="${esc(w)}"${w===I.assign.wtype?" selected":""}>${esc(D.WEAPON_TYPES[w]||w)}</option>`).join("")||`<option value="">—</option>`}</select></label></div></div>`;
  paintThumbs(R);
  if(player)player.stop();player=new Player($("awPlayer"));player.load(source(t&&t.steps.length?t:I.tracks.normal));player.start();
  Astra.rivalSource(p,Astra.rivalName()).then(r=>{if(player)player.setRival(r);});
 }
 function refresh(){if(player){const t=track();player.load(source(t&&t.steps.length?t:I.tracks.normal));}if(I.source==="sheet")drawSheet();}
 function onInput(e){const v=e.target.dataset.v;if(v==="name")I.name=e.target.value;}
 function onChange(e){
  const el=e.target;
  if(el.dataset.in){const files=[...el.files];if(!files.length)return;if(el.dataset.in==="sheet")loadSheet(files[0]);else loadFE(files);return;}
  const v=el.dataset.v,n=Number(el.value);
  if(v==="ax"||v==="ay"){I.anchor[v==="ax"?"x":"y"]=n;refresh();}
  else if(v==="zoom"&&n>0){I.zoom=n;refresh();}
  else if((v==="cw"||v==="ch")&&n>=8){I.cell[v==="cw"?"w":"h"]=n;sliceSheet();I.tracks={normal:{steps:[],impact:0},critical:null,miss:null};renderLeft();renderRight();}
  else if(v==="key"){const h=el.value;I.key=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));sliceSheet();renderLeft();renderRight();}
  else if(v==="mirror"){I.mirror=el.checked;refresh();}
  else if(v==="rival"){localStorage.setItem("astra.rival",el.value);Astra.rivalSource(p,el.value).then(r=>{if(player)player.setRival(r);});}
  else if(v==="cls"){I.assign.classId=n;renderRight();}else if(v==="wt")I.assign.wtype=el.value;
  else if(el.dataset.ticks!==undefined){track().steps[Number(el.dataset.ticks)].ticks=Math.max(1,n||1);refresh();}
 }
 function addFrame(i){if(!I.tracks[I.mode])I.tracks[I.mode]={steps:[],impact:0};I.tracks[I.mode].steps.push({frame:i,ticks:5});renderRight();if(I.source==="sheet")drawSheet();}
 async function onClick(e){
  const b=e.target.closest("[data-x],[data-add],[data-mode],[data-impact],[data-rm],#awSheet");if(!b)return;
  if(b.id==="awSheet"){const r=b.getBoundingClientRect(),s=Number(b.dataset.s)*(r.width/b.width),x=(e.clientX-r.left)/s,y=(e.clientY-r.top)/s;
   const ci=I.sheet.cells.findIndex(c=>x>=c.x&&x<c.x+c.w&&y>=c.y&&y<c.y+c.h),f=I.sheet.cellToFrame[ci];if(f!==undefined)addFrame(f);return;}
  if(b.dataset.add!==undefined)return addFrame(Number(b.dataset.add));
  if(b.dataset.mode){I.mode=b.dataset.mode;renderRight();if(I.source==="sheet")drawSheet();return;}
  if(b.dataset.impact!==undefined){track().impact=Number(b.dataset.impact);renderRight();return;}
  if(b.dataset.rm!==undefined){const t=track();t.steps.splice(Number(b.dataset.rm),1);if(t.impact>=t.steps.length)t.impact=Math.max(0,t.steps.length-1);if(!t.steps.length&&I.mode!=="normal")I.tracks[I.mode]=null;renderRight();if(I.source==="sheet")drawSheet();return;}
  const x=b.dataset.x;
  if(x==="close"){if(player)player.stop();closeWin();return;}
  if(x==="all"){I.tracks[I.mode]={steps:I.frames.map((f,i)=>({frame:i,ticks:5})).filter(s=>!I.frames[s.frame].empty),impact:Math.floor(I.frames.length/2)};renderRight();if(I.source==="sheet")drawSheet();return;}
  if(x==="copy"){I.tracks[I.mode]=JSON.parse(JSON.stringify(I.tracks.normal));renderRight();return;}
  if(x==="clear"){I.tracks[I.mode]=I.mode==="normal"?{steps:[],impact:0}:null;renderRight();if(I.source==="sheet")drawSheet();return;}
  if(x==="save")save();
 }
 async function save(){
  try{
   const name=String(I.name||"").trim();T.assert(name&&!/:/.test(name),"Ponle un nombre a la animación (sin dos puntos).");
   T.assert(I.tracks.normal&&I.tracks.normal.steps.length,"La pista Normal está vacía.");
   const pack=opts.pack();T.assert(!(pack.atlases||{})[name]||await Astra.ui.modal(`<h2>Reemplazar</h2><p>Ya existe «${esc(name)}». ¿La reemplazo?</p>`,[{label:"Cancelar",value:false},{label:"Reemplazar",value:true,cls:"danger"}]),"Cancelado.");
   // Solo los fotogramas usados, recortados y colocados en un atlas compacto.
   const groups=[[name,I.tracks]].concat(I.ranged?[[name+"-distancia",I.ranged]]:[]);
   const usedIdx=[...new Set(groups.flatMap(([n,t])=>Object.values(t).filter(Boolean).flatMap(tr=>tr.steps.map(s=>s.frame))))].sort((a,b)=>a-b),remap={};usedIdx.forEach((f,i)=>remap[f]=i);
   const frames=usedIdx.map(i=>I.frames[i]),shelf=D.shelf(frames,1024),atlas=document.createElement("canvas");atlas.width=shelf.width;atlas.height=shelf.height;
   const ax=atlas.getContext("2d");frames.forEach((f,i)=>ax.drawImage(f.img,f.sx,f.sy,f.w,f.h,shelf.pos[i].x,shelf.pos[i].y,f.w,f.h));
   const path="img/astra/battle/"+D.fileName(name)+".png",blob=await new Promise(r=>atlas.toBlob(r,"image/png"));
   await p.backend.write(path,blob);p.images[path]=createImageBitmap(atlas);
   const assigned=[];
   groups.forEach(([n,t],gi)=>{
    const modes={};Object.keys(t).forEach(m=>{if(t[m]&&t[m].steps.length)modes[m]={steps:t[m].steps.map(s=>({frame:remap[s.frame],ticks:s.ticks})),impact:t[m].impact};});
    const built=D.buildAnimation({name:n,path,frames:frames.map(f=>({w:f.w,h:f.h,dx:f.dx,dy:f.dy})),pos:shelf.pos,anchor:I.anchor,zoom:I.zoom,mirror:I.mirror,modes});
    D.installAnimation(pack,n,built,true);
    if(I.assign.classId&&I.assign.wtype){const row=p.classes[I.assign.classId],cur=Object.assign({},D.get("classes",row,"battleAnimations")||{}),key=I.assign.wtype+(gi?":far":"");
     cur[key]={normal:n+":normal",critical:n+":critical",miss:n+":miss"};D.set("classes",row,"battleAnimations",cur);assigned.push(key);}
   });
   if(player)player.stop();closeWin();opts.done(name,assigned.length>0);
  }catch(e){if(e.message!=="Cancelado.")hint("✖ "+e.message,true);}
 }
};

// ---------- sprite de mapa ----------
// GBA (FE Essentials): 16×48 o 32×96 = 3 fotogramas en vertical. Se convierte al formato del motor:
// columnas = fotogramas (0,1,2,1) y filas = direcciones (las 4 iguales). Rejillas de 3 columnas se usan tal cual.
Astra.importMapSprite=function(opts){
 const p=opts.project;let S=null;const pickClass=opts.classId===undefined;
 const w=win(`<header><h2>🧍 Sprite de mapa</h2><span class="grow"></span><button class="btn small" data-x="close">✕</button></header>
  <div class="awbody single"><div id="msBody"><label class="drop"><input type="file" accept="image/png" hidden><div class="big">🧍</div><p><b>Elige el PNG del sprite de mapa</b></p><p class="help">FE Essentials / GBA: tira vertical de 3 fotogramas (16×48 o 32×96). También rejillas de 3 columnas (como las de tu proyecto, 192×144).</p></label></div></div>
  <footer><span class="help" id="msHint"></span><span class="grow"></span><button class="btn" data-x="close">Cancelar</button><button class="btn gold" data-x="save" disabled id="msSave">💾 Guardar sprite</button></footer>`);
 w.onchange=async e=>{if(e.target.id==="msClass")return;const f=e.target.files&&e.target.files[0];if(f)try{await load(f);}catch(err){$("msHint").textContent="✖ "+err.message;}};
 if(opts.file)load(opts.file).catch(err=>{$("msHint").textContent="✖ "+err.message;});
 w.onclick=async e=>{const b=e.target.closest("[data-x]");if(!b)return;if(b.dataset.x==="close")return closeWin();if(b.dataset.x==="save")save();};
 async function load(file){
  const raw=await loadImage(file);removeKey(raw,cornerKey(raw));const vertical=raw.width<=64&&raw.height>=raw.width*2.5;
  let sheet=raw,fw,fh;
  if(vertical){fw=raw.width;fh=Math.floor(raw.height/3);sheet=document.createElement("canvas");sheet.width=fw*4;sheet.height=fh*4;const x=sheet.getContext("2d");
   for(let row=0;row<4;row++)[0,1,2,1].forEach((f,col)=>x.drawImage(raw,0,f*fh,fw,fh,col*fw,row*fh,fw,fh));}
  else{fw=Math.floor(raw.width/3);fh=Math.floor(raw.height/(raw.height%3===0&&raw.height/3<=fw*1.5?3:4));}
  const anchor=D.guessAnchor(pixels(sheet),{x:0,y:0,w:fw,h:fh},null);
  S={name:file.name.replace(/\.png$/i,"").replace(/^Map/,""),sheet,fw,fh,anchorY:anchor.y};
  $("msBody").innerHTML=`<div class="row2"><label class="field wide">Nombre<input id="msName" value="${esc(S.name)}"></label>${pickClass?`<label class="field">Usarlo en la clase<select id="msClass"><option value="0">— ninguna —</option>${(p.classes||[]).filter(r=>r&&r.name).map(r=>`<option value="${r.id}">${r.id} · ${esc(r.name)}</option>`).join("")}</select></label>`:""}</div><div class="msprev"><canvas id="msCanvas" width="360" height="140"></canvas></div><p class="help">Fotograma ${fw}×${fh}${vertical?" (convertido del formato GBA)":""}. Así se verá en el mapa con los colores de cada equipo.</p>`;
  const cv=$("msCanvas"),x=cv.getContext("2d");x.imageSmoothingEnabled=false;x.fillStyle="#2c4a3a";x.fillRect(0,0,cv.width,cv.height);
  const pal=p.pack&&p.pack.palette;[1,2,3].forEach((team,i)=>{const s=Astra.crop({im:sheet,sx:0,sy:0,w:fw,h:fh},pal,team),k=Math.min(80/s.w,80/s.h,4);x.drawImage(s.im,s.sx,s.sy,s.w,s.h,40+i*110,110-s.h*k,s.w*k,s.h*k);});
  $("msSave").disabled=false;
 }
 async function save(){
  try{const name=String($("msName").value||"").trim();T.assert(name,"Ponle un nombre.");const pack=opts.pack();pack.units=pack.units||{};
   const path="img/astra/map/"+D.fileName(name)+".png",blob=await new Promise(r=>S.sheet.toBlob(r,"image/png"));await p.backend.write(path,blob);p.images[path]=createImageBitmap(S.sheet);
   pack.units[name]=Object.assign({name,clips:{}},pack.units[name]||{},{map:{path,width:S.fw,height:S.fh,anchorY:S.anchorY}});
   const classId=pickClass?Number($("msClass").value)||0:opts.classId;closeWin();opts.done(name,classId);
  }catch(e){$("msHint").textContent="✖ "+e.message;}
 }
};
})();
