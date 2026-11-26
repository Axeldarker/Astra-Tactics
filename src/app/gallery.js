// Astra Editor · 🌐 Galería de FE Essentials.
// feessentials.com muestra los recursos del FE Repo de GitHub (Klokinator/FE-Repo). La galería lee ese mismo
// repositorio desde el navegador: una consulta por sección y otra por categoría (se guardan 12 h, porque GitHub
// permite 60 por hora sin cuenta). Los archivos se bajan de raw.githubusercontent.com y pasan al importador de cada tipo.
"use strict";
(function(){
const Astra=window.Astra,T=window.Tactics;
const esc=s=>Astra.ui.esc(s);
const $=id=>document.getElementById(id);
const REPO="Klokinator/FE-Repo",API="https://api.github.com/repos/"+REPO,RAW="https://raw.githubusercontent.com/"+REPO+"/main/";
const enc=p=>p.split("/").map(encodeURIComponent).join("/");
const rawUrl=p=>RAW+enc(p);
Astra.feRawUrl=rawUrl;
const SECTIONS={
 anim:{root:"Battle Animations",label:"🎞 Animaciones",kind:"anim"},
 map:{root:"Map Sprites",label:"🧍 Sprites de mapa",kind:"map"},
 portrait:{root:"Portrait Repository",label:"🙂 Retratos",kind:"portrait"},
 icon:{root:"Item Icons",label:"⚔ Iconos",kind:"icon"}
};
const PAGE={anim:60,map:120,portrait:90,icon:400};

// ---------- GitHub con caché ----------
// Las listas de nombres (para «Similares») cambian poco: se guardan 7 días; el resto, 12 horas.
async function api(url,key,days){
 const k="astra.fe:"+key;
 try{const c=JSON.parse(localStorage.getItem(k)||"null");if(c&&Date.now()-c.t<(days?days*24:12)*3600e3)return c.d;}catch(e){}
 let res;try{res=await fetch(url);}catch(e){throw new Error("No pude conectar con GitHub. ¿Hay internet?");}
 if(res.status===403||res.status===429){const reset=Number(res.headers.get("x-ratelimit-reset"))*1000;
  throw new Error("GitHub permite 60 consultas por hora sin cuenta y ya se gastaron"+(reset?"; vuelve a probar a las "+new Date(reset).toTimeString().slice(0,5):"")+". Lo que ya abriste queda guardado.");}
 T.assert(res.ok,"GitHub respondió "+res.status+".");
 const j=await res.json(),d=key.startsWith("t:")?compactTree(j):key.startsWith("l:")?{dirs:(j.tree||[]).filter(e=>e.type==="tree").map(e=>e.path)}:j.filter(x=>x.type==="dir").map(x=>({name:x.name,sha:x.sha}));
 try{localStorage.setItem(k,JSON.stringify({t:Date.now(),d}));}catch(e){}
 return d;
}
const compactTree=j=>({truncated:!!j.truncated,files:(j.tree||[]).filter(e=>e.type==="blob").map(e=>e.path)});
const categories=sec=>api(API+"/contents/"+enc(SECTIONS[sec].root)+"?ref=main","c:"+sec);
const tree=(cat,days)=>api(API+"/git/trees/"+cat.sha+"?recursive=1","t:"+cat.sha,days);
const listing=cat=>api(API+"/git/trees/"+cat.sha,"l:"+cat.sha,7);
const rootDirs=()=>api(API+"/contents?ref=main","c:root",7);

// ---------- de la lista de archivos a tarjetas ----------
const fileName=p=>p.split("/").pop();
const noExt=n=>n.replace(/\.[a-z0-9]+$/i,"");
// "[Hero-Reskin] Fox Ears [F] by UltraFenix" → "Fox Ears"; "Hero (F) Axe {Pikmin} - stand" → "Hero (F) Axe"
const clean=n=>noExt(n).replace(/\[[^\]]*\]|\{[^}]*\}/g,"").replace(/\bby\s+.*$/i,"").replace(/[-_ ]+(stand|standing|idle)\s*$/i,"").replace(/\s+/g," ").trim()||noExt(n);
const authors=n=>{const m=[...n.matchAll(/\{([^}]*)\}/g)].map(x=>x[1]),by=n.match(/\bby\s+([^[\](){}]+)/i);return m.concat(by?[by[1].trim()]:[]).join(", ");};
// Icono del arma según el nombre de la carpeta ("1. Sword (Durandal)" → espada).
const WEAPON_ICONS=[[/hand\s*axe|throw|tomahawk/i,"whandaxe"],[/knife|dagger|stiletto|kunai/i,"wknife"],[/sword|blade|katana|rapier|saber|sabre|durandal|falchion/i,"wsword"],
 [/lance|spear|javelin|pike|halberd/i,"wlance"],[/axe|hammer|devil/i,"waxe"],[/bow|ballista|arrow|crossbow/i,"wbow"],[/staff|heal|rod|rescue|warp/i,"wstaff"],
 [/magic|tome|anima|dark|light|fire|thunder|wind|elfire|spell|nature|holy|flux/i,"wtome"],[/stone|transform|revert|dragon/i,"wstone"],[/unarmed|item|refresh|dance|play|fist|brawl|claw|bite/i,"wbag"]];
const weaponIcon=label=>(WEAPON_ICONS.find(([re])=>re.test(label))||[0,"wmisc"])[1];
function assetsOf(sec,cat,files){
 const base=SECTIONS[sec].root+"/"+cat.name+"/";
 if(sec==="anim"){
  const by={};files.forEach(f=>{const i=f.indexOf("/");if(i<0)return;const a=f.slice(0,i);(by[a]=by[a]||[]).push(f.slice(i+1));});
  return Object.keys(by).sort((x,y)=>x.localeCompare(y)).map(a=>{
   const groups={};by[a].forEach(f=>{const i=f.lastIndexOf("/"),dir=i<0?"":f.slice(0,i);(groups[dir]=groups[dir]||[]).push(f);});
   const weapons=Object.keys(groups).filter(d=>groups[d].some(f=>/\.txt$/i.test(f))&&groups[d].some(f=>/\.png$/i.test(f))).sort((x,y)=>x.localeCompare(y,undefined,{numeric:true}))
    .map(d=>{const g=groups[d],gif=g.find(f=>/\.gif$/i.test(f)),first=g.filter(f=>/\.png$/i.test(f)).sort()[0];
     const label=(d.split("/").pop()||"Animación").replace(/^\d+\s*[.)-]\s*/,"");
     return {dir:d,label,icon:weaponIcon(label),files:g.filter(f=>/\.(png|txt)$/i.test(f)&&!/sheet\s*\d*\.png$|_without_comment\.txt$/i.test(f)).map(f=>base+a+"/"+f),preview:base+a+"/"+(gif||first)};});
   return {sec,name:a,title:clean(a),author:authors(a),path:base+a,weapons};
  }).filter(a=>a.weapons.length);
 }
 return files.filter(f=>/\.png$/i.test(f)&&!(sec==="map"&&/[-_ ](walk|move|moving)\s*$/i.test(noExt(fileName(f))))).sort((x,y)=>x.localeCompare(y))
  .map(f=>({sec,name:fileName(f),title:clean(fileName(f)),author:authors(f),path:base+f,group:f.includes("/")?f.slice(0,f.lastIndexOf("/")):""}));
}

// ---------- descargar ----------
async function download(paths,hint){
 const out=new Array(paths.length);let next=0,done=0;
 const worker=async()=>{while(next<paths.length){const i=next++,p=paths[i];
  let res;try{res=await fetch(rawUrl(p));}catch(e){throw new Error("No pude descargar "+fileName(p)+".");}
  T.assert(res.ok,"No pude descargar "+fileName(p)+" ("+res.status+").");out[i]=new File([await res.blob()],fileName(p));hint("Descargando "+(++done)+"/"+paths.length+"…");}};
 await Promise.all([...Array(Math.min(8,paths.length))].map(worker));
 return out;
}

// ---------- ventana ----------
const G=Astra.galleryState={sec:"anim",cat:{},find:"",limit:0,assets:[],pick:{}};
Astra.openGallery=function(sec,ctx){
 const p=Astra.state.project;if(!p)return Astra.ui.toast("Primero abre tu proyecto.");
 const {win,closeWin}=Astra.imgTools;
 if(sec&&SECTIONS[sec])G.sec=sec;G.ctx=ctx||{};G.find="";G.view="";
 const w=win(`<header><h2>🌐 Galería · FE Essentials</h2><span class="grow"></span><a class="btn small" href="https://feessentials.com/" target="_blank" rel="noopener">Abrir feessentials.com ↗</a><button class="btn small" data-x="close">✕</button></header>
  <div class="gbar"><div class="tabs" id="gTabs"></div><select id="gCat"></select><input id="gFind" type="search" placeholder="Buscar…"><span class="help" id="gCount"></span></div>
  <div class="gbody" id="gBody"></div>
  <footer><span class="help" id="gHint">Recursos del FE Repo, los mismos de feessentials.com. Son F2U: gratis para fangames, sin uso comercial y dando crédito (Astra apunta los créditos de lo que importas).</span><span class="grow"></span><button class="btn" data-x="close">Cerrar</button></footer>`);
 w.querySelector(".awin").classList.add("gallery");
 const hint=(t,bad)=>{const h=$("gHint");if(h){h.textContent=t;h.classList.toggle("error",!!bad);}};
 const tabs=()=>{$("gTabs").innerHTML=Object.keys(SECTIONS).map(k=>`<button class="${G.sec===k?"on":""}" data-sec="${k}">${SECTIONS[k].label}</button>`).join("");};
 async function loadSection(){
  tabs();$("gCat").innerHTML=`<option>Cargando categorías…</option>`;$("gBody").innerHTML=`<p class="help gwait">Cargando…</p>`;
  try{const cats=await categories(G.sec);T.assert(cats.length,"La sección está vacía.");
   const cur=G.cat[G.sec]&&cats.find(c=>c.name===G.cat[G.sec])||cats[0];G.cat[G.sec]=cur.name;
   $("gCat").innerHTML=cats.map(c=>`<option value="${esc(c.name)}"${c===cur?" selected":""}>${esc(c.name)}</option>`).join("");
   G.cats=cats;await loadCat(cur);
  }catch(e){$("gBody").innerHTML=`<p class="error gwait">✖ ${esc(e.message)}</p>`;}
 }
 async function loadCat(cat){
  $("gBody").innerHTML=`<p class="help gwait">Cargando ${esc(cat.name)}…</p>`;
  try{const t=await tree(cat);G.assets=assetsOf(G.sec,cat,t.files);G.limit=PAGE[G.sec];G.pick={};render();if(t.truncated)hint("⚠ Esta categoría es enorme y GitHub solo devolvió una parte.",true);}
  catch(e){$("gBody").innerHTML=`<p class="error gwait">✖ ${esc(e.message)}</p>`;}
 }
 const visible=()=>{const q=G.find.trim().toLowerCase();return G.assets.map((a,i)=>[a,i]).filter(([a])=>!q||(a.name+" "+(a.group||"")).toLowerCase().includes(q));};
 function card(a,i){
  const sim=a.sec==="icon"?"":`<button class="btn small" data-sim="${i}" title="Similares: retratos y animaciones del mismo personaje">🔍</button>`;
  const imp=`<button class="btn small gold" data-imp="${i}">📥 Importar</button>${sim}<button class="btn small" data-credit="${i}" title="Copiar créditos">📋</button>`;
  if(a.sec==="anim"){const k=G.pick[i]||0,wp=a.weapons[k];
   return `<div class="gcard"><div class="gname" title="${esc(a.name)}"><b>${esc(a.title)}</b><small>${esc(a.author||a.name)}</small></div>
    <div class="gprev anim"><img src="${esc(rawUrl(wp.preview))}" loading="lazy" alt=""></div>
    <div class="gw">${a.weapons.map((x,j)=>`<button class="wi${j===k?" on":""}" data-w="${i}:${j}" title="${esc(x.label)}"><canvas width="16" height="16" data-pix="${x.icon}"></canvas></button>`).join("")}<span class="wl">${esc(wp.label)}</span></div><div class="gact">${imp}</div></div>`;}
  const cls=a.sec==="icon"?"icon":a.sec==="map"?"map":"portrait";
  return `<div class="gcard ${cls}"><div class="gname" title="${esc(a.path)}"><b>${esc(a.title)}</b>${a.sec==="icon"?"":`<small>${esc(a.author||a.group||"")}</small>`}</div>
   <div class="gprev ${cls}"><img src="${esc(rawUrl(a.path))}" loading="lazy" alt="" crossorigin="anonymous" data-fit="${cls}"></div><div class="gact">${imp}</div></div>`;
 }
 function render(){
  if(G.view==="similar")return renderSimilar();
  const list=visible();$("gCount").textContent=list.length+" recursos";
  $("gBody").innerHTML=`<div class="ggrid ${G.sec}">${list.slice(0,G.limit).map(([a,i])=>card(a,i)).join("")}</div>`+(list.length>G.limit?`<div class="gmore"><button class="btn" data-x="more">Mostrar más (${list.length-G.limit})</button></div>`:"")+(list.length?"":`<p class="help gwait">Nada por aquí.</p>`);
  Astra.paintIcons($("gBody"));
 }
 // ---------- 🔍 Similares: retratos y animaciones del mismo personaje ----------
 function renderSimilar(){
  const S=G.similar,groups=[["portrait","🙂 Retratos"],["anim","🎞 Animaciones de batalla"],["map","🧍 Sprites de mapa"]];
  const head=`<div class="simbar"><button class="btn small" data-x="back">← Volver</button><b>🔍 Similares a</b><input id="gSim" value="${esc(S.q)}" placeholder="Nombre del personaje"><button class="btn small" data-x="simgo">Buscar</button><span class="help">${esc(S.status||"")}</span></div>`;
  $("gCount").textContent="";
  $("gBody").innerHTML=head+groups.map(([sec,label])=>{const list=G.assets.map((a,i)=>[a,i]).filter(([a])=>a.sec===sec);if(sec==="map"&&!list.length)return "";
   return `<h3 class="simh">${label} <small>${list.length}</small></h3>`+(list.length?`<div class="ggrid ${sec}">${list.slice(0,60).map(([a,i])=>card(a,i)).join("")}</div>`:`<p class="help">${S.loading&&S.loading[sec]?"Buscando…":"No encontré ninguno con ese nombre."}</p>`);}).join("");
  Astra.paintIcons($("gBody"));
 }
 const STOP=new Set("the and with for from custom reskin base vanilla edit edited ver version style portrait portraits mug mugs sprite sprites generic male female alt alternate variant recolor recolour palette fix fixed new old full body mounted unmounted armor armour shield basic weapons sword lance axe bow tome staff".split(" "));
 const words=n=>clean(n).toLowerCase().replace(/[()+_.,!&'-]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)&&!/^fe\d|^\d/.test(w));
 const matcher=q=>{const ws=q.toLowerCase().split(/\s+/).filter(Boolean).map(w=>new RegExp("(^|[^a-z])"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^a-z])","i"));return n=>ws.length&&ws.every(r=>r.test(clean(n)));};
 async function similar(q){
  q=String(q||"").trim();if(!q)return;
  G.view="similar";G.assets=[];G.pick={};G.similar={q,loading:{portrait:1,anim:1},status:"Buscando…"};render();
  const ok=matcher(q),hits=[];let done=0,failed="";
  const status=t=>{G.similar.status=t;const el=$("gBody")&&$("gBody").querySelector(".simbar .help");if(el)el.textContent=t;};
  try{
   const roots=await rootDirs(),sec=n=>roots.find(r=>r.name===SECTIONS[n].root);
   // Retratos: toda la sección en una consulta.
   const pr=sec("portrait");if(pr){const t=await tree(pr,7);t.files.filter(f=>/\.png$/i.test(f)&&ok(fileName(f))).forEach(f=>hits.push({sec:"portrait",name:fileName(f),title:clean(fileName(f)),author:authors(f),path:SECTIONS.portrait.root+"/"+f,group:f.includes("/")?f.slice(0,f.lastIndexOf("/")):""}));}
   G.similar.loading.portrait=0;G.assets=hits.slice();if(G.view==="similar")render();
   // Animaciones: los nombres de cada categoría (una consulta por categoría, guardadas 7 días).
   const cats=await categories("anim"),found=[];
   for(const cat of cats){status("Revisando animaciones "+(++done)+"/"+cats.length+"…");const l=await listing(cat);l.dirs.filter(ok).forEach(d=>found.push([cat,d]));}
   for(const cat of [...new Set(found.map(f=>f[0]))]){const names=new Set(found.filter(f=>f[0]===cat).map(f=>f[1])),t=await tree(cat);assetsOf("anim",cat,t.files).filter(a=>names.has(a.name)).forEach(a=>hits.push(a));}
  }catch(e){failed=e.message;}
  G.similar.loading={};
  if(G.view!=="similar"||G.similar.q!==q)return;
  G.assets=hits;G.similar.status=failed?"⚠ "+failed:hits.length+" resultados";render();
 }
 // Encaja la vista previa: sprites de mapa (solo el primer fotograma) y hojas de retrato GBA (la cara grande).
 if(!w.dataset.gfit)w.dataset.gfit="1",w.addEventListener("load",e=>{const im=e.target;if(im.tagName!=="IMG"||!im.dataset.fit)return;if(unkey(im))return;const W=im.naturalWidth,H=im.naturalHeight,box=im.parentNode;
  if(im.dataset.fit==="map"){const fh=W<=64&&H>=W*2.5?H/3:H,k=Math.max(1,Math.floor(Math.min(64/W,64/fh)));im.style.width=W*k+"px";box.style.height=fh*k+"px";}
  else if(im.dataset.fit==="portrait"&&W===128&&H===112){im.style.width="192px";box.classList.add("crop");}
  else if(im.dataset.fit==="icon"){const k=Math.max(1,Math.floor(48/Math.max(W,H)));im.style.width=W*k+"px";}},true);
 // El color de fondo de GBA (el del píxel de la esquina) se vuelve transparente, como al importar.
 function unkey(im){if(im.dataset.keyed)return false;im.dataset.keyed="1";
  try{const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext("2d").drawImage(im,0,0);const t=Astra.imgTools;t.removeKey(c,t.cornerKey(c));im.src=c.toDataURL();return true;}catch(err){return false;}}
 async function importAsset(i,btn){
  const a=G.assets[i],sec=a.sec,credit={name:a.name,path:a.path,url:"https://github.com/"+REPO+"/tree/main/"+enc(a.path),author:a.author};
  try{
   if(sec==="anim"){const wp=a.weapons[G.pick[i]||0],files=await download(wp.files,hint);Astra.importKind("anim",files,{name:a.title+(a.weapons.length>1?"-"+wp.label:""),credit:Object.assign(credit,{path:a.path+(wp.dir?"/"+wp.dir:"")})});return;}
   const [file]=await download([a.path],hint),named=new File([file],a.title+".png");
   Astra.importKind(SECTIONS[sec].kind,[named],Object.assign({credit},G.ctx));
  }catch(e){hint("✖ "+e.message,true);if(btn){btn.disabled=false;btn.textContent="📥 Importar";}}
 }
 w.onclick=async e=>{const b=e.target.closest("[data-x],[data-sec],[data-w],[data-imp],[data-credit],[data-sim]");if(!b)return;
  if(b.dataset.x==="close")return closeWin();
  if(b.dataset.x==="more"){G.limit+=PAGE[G.sec];return render();}
  if(b.dataset.x==="back"){G.view="";$("gFind").value="";G.find="";return loadSection();}
  if(b.dataset.x==="simgo")return similar($("gSim").value);
  if(b.dataset.sim!==undefined){const a=G.assets[Number(b.dataset.sim)],w=words(a.name);return similar(w[0]||a.title);}
  if(b.dataset.sec){G.view="";G.sec=b.dataset.sec;G.find="";$("gFind").value="";return loadSection();}
  if(b.dataset.w){const [i,j]=b.dataset.w.split(":").map(Number);G.pick[i]=j;const c=b.closest(".gcard"),a=G.assets[i];c.querySelector(".gprev img").src=rawUrl(a.weapons[j].preview);c.querySelector(".wl").textContent=a.weapons[j].label;c.querySelectorAll("[data-w]").forEach(x=>x.classList.toggle("on",x===b));return;}
  if(b.dataset.imp!==undefined){b.disabled=true;b.textContent="⏳";return importAsset(Number(b.dataset.imp),b);}
  if(b.dataset.credit!==undefined){const a=G.assets[Number(b.dataset.credit)],t=`${a.title}${a.author?" por "+a.author:""} (FE Repo: ${a.path})`;
   try{await navigator.clipboard.writeText(t);hint("📋 Copiado: "+t);}catch(err){hint(t);}}
 };
 w.onchange=e=>{if(e.target.id==="gCat"){G.view="";G.cat[G.sec]=e.target.value;G.find="";$("gFind").value="";loadCat(G.cats.find(c=>c.name===e.target.value));}};
 w.onkeydown=e=>{if(e.target.id==="gSim"&&e.key==="Enter")similar(e.target.value);};
 w.oninput=e=>{if(e.target.id==="gFind"){if(G.view==="similar"){G.view="";loadCat(G.cats.find(c=>c.name===G.cat[G.sec]));}G.find=e.target.value;G.limit=PAGE[G.sec];render();}};
 loadSection();
};
})();
