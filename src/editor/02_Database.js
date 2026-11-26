/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
// Astra Editor · base de datos. Lógica sin interfaz (se prueba en Node):
//   - leer y escribir los campos tácticos del cuadro "Nota" de F9 sin romper lo que ya hay,
//   - crear filas nuevas válidas para RPG Maker MZ,
//   - construir animaciones de batalla a partir de una hoja de sprites,
//   - plantillas de enemigo (parámetro del plugin) y paquete de gráficos.
(function(root){
"use strict";
const T=root.Tactics,M=T.Editor,D=M.Db={};

D.TABLES={actors:{file:"Actors",label:"Personajes"},classes:{file:"Classes",label:"Clases"},weapons:{file:"Weapons",label:"Armas"},
 items:{file:"Items",label:"Objetos"},skills:{file:"Skills",label:"Habilidades"},states:{file:"States",label:"Estados"}};
// Campos que viven en la propia fila de MZ (lo demás va a la nota).
D.NATIVE={actors:["name","profile","classId","initialLevel","faceName","faceIndex","characterName","characterIndex","nickname"],classes:["name"],
 weapons:["name","description","iconIndex","price"],items:["name","description","iconIndex","price"],skills:["name","description","iconIndex"],states:["name","iconIndex"]};
const MERGE=["stats","growth","ranks","promotionBonus"];
D.STATS=["health","power","magic","skill","speed","luck","defense","resistance","move","build"];
D.STAT_LABELS={health:"PV",power:"Fue",magic:"Mag",skill:"Hab",speed:"Vel",luck:"Sue",defense:"Def",resistance:"Res",move:"Mov",build:"Con"};
D.MOVE_TYPES={foot:"A pie",mounted:"Montado",flying:"Volador",armored:"Acorazado"};
D.WEAPON_TYPES={blade:"Espada",pole:"Lanza",axe:"Hacha",bow:"Arco",arcane:"Magia",staff:"Bastón"};
D.ITEM_EFFECTS={heal:"Curar PV",restore:"Quitar estados",torch:"Antorcha (niebla)",key:"Llave",promote:"Promocionar",boost:"Subir una estadística",
 repair:"Reparar arma",rank:"Subir dominio de arma",growth:"Subir crecimiento",refresh:"Volver a actuar (baile)",passive:"Pasivo (solo llevarlo)"};
D.KEYS={chest:"Cofres",door:"Puertas",all:"Todo (maestra)"};
D.EFFECTS={steal:["Robar"],lockpick:["Cerrajería"],canto:["Paso ligero (mover tras actuar)"],cantoCombat:["Paso de reserva (mover tras combatir)"],
 firstStrike:["Iniciativa (ataca primero)"],halfDefense:["Ruptura (media defensa)","chance"],drain:["Drenar vida","chance"],cover:["Cobertura"],
 critGuard:["Anti crítico"],reduceDamage:["Reducir daño","chance"],ignoreDefense:["Ignorar defensa","chance"],extraStrike:["Ráfaga (golpe extra)","chance"],
 negateSkills:["Concentración (anula habilidades)"],cancelReply:["Interrupción (sin contraataque)","chance"],injuredPower:["Último esfuerzo","chance"],
 finisher:["Remate","chance"],poison:["Veneno (daño por turno)","value"],regenerate:["Regenerar PV por turno","value"],stat:["Modificar estadística","value"]};

// ---------- notas ----------
const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
// Campos tácticos escritos en la nota (JSON clásico + bloque por líneas + etiquetas), ya fusionados.
D.fields=function(row,table){const n=T.parseNote(row&&row.note,table,(row&&row.id)+" · "+(row&&row.name));return T.notes.merge(copy(n.json)||{},n.simple);};
// La fila tal y como la ve el juego (valores por defecto + nota).
D.effective=function(table,row){if(!row)return null;const data={};data[table]=[null,Object.assign({},row,{id:1})];const r=T.readDatabase(data)[table][1];r.id=row.id;return r;};
// Reescribe la nota: quita el bloque <Tactics> y las etiquetas sueltas que reconoce TacticsMZ,
// conserva cualquier otro texto (notas propias o de otros plugins) y añade un bloque JSON limpio.
D.writeNote=function(note,table,fields){
 const aliases=T.noteAliases[table]||{},plain=T.notes.plain;
 let rest=String(note||"").replace(/<Tactics>[\s\S]*?<\/Tactics>/ig,"").replace(/<([^<>/:]+?)(?::([^<>]*))?>/g,(all,k)=>Object.prototype.hasOwnProperty.call(aliases,plain(k))?"":all);
 rest=rest.replace(/\n{3,}/g,"\n\n").trim();
 const keys=Object.keys(fields||{}).filter(k=>fields[k]!==undefined);
 const block=keys.length?"<Tactics>\n"+JSON.stringify(Object.fromEntries(keys.map(k=>[k,fields[k]])),null,2)+"\n</Tactics>":"";
 return [rest,block].filter(Boolean).join("\n");
};
// Cambia un valor. value===undefined lo quita de la nota (vuelve al valor por defecto).
D.set=function(table,row,key,value){
 const native=D.NATIVE[table].indexOf(key)>=0,f=D.fields(row,table),eff=D.effective(table,row);
 // Las estadísticas escritas con etiquetas sueltas se fusionaban con las de la clase: se guardan completas.
 MERGE.forEach(k=>{if(f[k]!==undefined&&eff[k])f[k]=copy(eff[k]);});
 if(native){row[key]=value;if(f[key]!==undefined)f[key]=value;}
 else if(value===undefined)delete f[key];else f[key]=copy(value);
 row.note=D.writeNote(row.note,table,f);
 return row;
};
D.get=(table,row,key)=>{const eff=D.effective(table,row);return eff?eff[key]:undefined;};

// ---------- filas nuevas ----------
const params=()=>[...Array(8)].map((_,i)=>[...Array(100)].map((_,l)=>i===0?400+l*50:i===1?80+l*10:15+l*3));
const DAMAGE={critical:false,elementId:0,formula:"0",type:0,variance:20};
D.TEMPLATES={
 actors:{battlerName:"",characterIndex:0,characterName:"",classId:1,equips:[0,0,0,0,0],faceIndex:0,faceName:"",traits:[],initialLevel:1,maxLevel:99,name:"",nickname:"",note:"",profile:""},
 classes:{expParams:[30,20,30,30],traits:[{code:23,dataId:0,value:1},{code:22,dataId:0,value:0.95},{code:22,dataId:1,value:0.05},{code:22,dataId:2,value:0.04},{code:41,dataId:1,value:0},{code:51,dataId:1,value:0},{code:52,dataId:1,value:0}],learnings:[],name:"",note:"",params:null},
 weapons:{animationId:1,description:"",etypeId:1,traits:[{code:31,dataId:1,value:0},{code:22,dataId:0,value:0}],iconIndex:97,name:"",note:"",params:[0,0,0,0,0,0,0,0],price:0,wtypeId:1},
 items:{animationId:0,consumable:true,damage:DAMAGE,description:"",effects:[],hitType:0,iconIndex:176,itypeId:1,name:"",note:"",occasion:0,price:0,repeats:1,scope:7,speed:0,successRate:100,tpGain:0},
 skills:{animationId:-1,damage:DAMAGE,description:"",effects:[],hitType:0,iconIndex:64,message1:"",message2:"",messageType:1,mpCost:0,name:"",note:"",occasion:0,repeats:1,requiredWtypeId1:0,requiredWtypeId2:0,scope:1,speed:0,stypeId:1,successRate:100,tpCost:0,tpGain:0},
 states:{autoRemovalTiming:0,chanceByDamage:100,iconIndex:1,maxTurns:1,message1:"",message2:"",message3:"",message4:"",messageType:1,minTurns:1,motion:0,name:"",note:"",overlay:0,priority:50,releaseByDamage:false,removeAtBattleEnd:false,removeByDamage:false,removeByRestriction:false,removeByWalking:false,restriction:0,stepsToRemove:100,traits:[]}
};
// Añade una fila al final (MZ necesita IDs seguidos). from = fila a duplicar (opcional).
D.create=function(list,table,name,from){
 const id=list.length||1,row=from?copy(from):copy(D.TEMPLATES[table]);
 if(!list.length)list.push(null);
 row.id=id;row.name=name||(from?from.name+" (copia)":"Nuevo");
 if(table==="classes"&&!row.params)row.params=params();
 if(from){const f=D.fields(row,table);if(f.name!==undefined){f.name=row.name;row.note=D.writeNote(row.note,table,f);}if(f.id!==undefined){f.id=id;row.note=D.writeNote(row.note,table,f);}}
 list.push(row);return row;
};

// ---------- plantillas de enemigo (parámetro EnemyPresets de TacticsMZ) ----------
D.PRESET_DEFAULT={name:"",classId:0,level:1,role:"soldier",weaponId:0,itemId:0,loot:false};
D.decodePresets=text=>{const v=T.decode(text||"[]");return (Array.isArray(v)?v:[]).filter(Boolean).map(p=>Object.assign({},D.PRESET_DEFAULT,p,{classId:Number(p.classId)||0,level:Number(p.level)||1,weaponId:Number(p.weaponId)||0,itemId:Number(p.itemId)||0,loot:p.loot===true||p.loot==="true"}));};
// Formato del Administrador de plugins: una lista JSON de structs, cada struct en texto con valores de texto.
D.encodePresets=list=>JSON.stringify(list.map(p=>JSON.stringify(Object.fromEntries(Object.keys(D.PRESET_DEFAULT).map(k=>[k,String(p[k]===undefined?D.PRESET_DEFAULT[k]:p[k])])))));

// ---------- paquete de gráficos ----------
D.emptyPack=()=>({version:1,units:{},atlases:{},clips:{}});
// Agrupa las pistas "Nombre:normal / :critical / :miss" en animaciones.
D.MODES={normal:"Normal",critical:"Crítico",miss:"Fallo"};
D.animations=function(pack){
 const out={};Object.keys((pack&&pack.clips)||{}).forEach(key=>{const i=key.lastIndexOf(":"),mode=i>0?key.slice(i+1):"",name=i>0&&D.MODES[mode]?key.slice(0,i):key;
  (out[name]=out[name]||{name,modes:{}}).modes[D.MODES[mode]?mode:"normal"]=key;});
 return out;
};
// Clases que usan una animación (por arma o variante).
D.animationUsers=function(classes,name){
 const users=[],scan=(cls,label,map)=>Object.keys(map||{}).forEach(w=>{const e=map[w],keys=typeof e==="string"?[e]:Object.values(e||{});if(keys.some(k=>typeof k==="string"&&k.replace(/:(normal|critical|miss)$/,"")===name))users.push({classId:cls.id,label:label+" · "+(D.WEAPON_TYPES[w]||w)});});
 Object.values(classes||{}).forEach(c=>{if(!c)return;scan(c,c.name,c.battleAnimations);Object.keys(c.variants||{}).forEach(v=>scan(c,c.name+" ("+v+")",(c.variants[v]||{}).battleAnimations));});
 return users;
};
// Rejilla de una hoja de sprites: celdas de cw×ch en orden de lectura.
D.grid=function(width,height,cw,ch){T.assert(cw>0&&ch>0,"Tamaño de celda inválido");const cells=[];for(let y=0;y+ch<=height;y+=ch)for(let x=0;x+cw<=width;x+=cw)cells.push({x,y,w:cw,h:ch});return cells;};
// Recorte al contenido de una celda. img = {width,height,data} (RGBA). key = color de fondo [r,g,b] o null.
D.trim=function(img,cell,key){
 let x0=cell.w,y0=cell.h,x1=-1,y1=-1;
 for(let y=0;y<cell.h;y++)for(let x=0;x<cell.w;x++){const i=((cell.y+y)*img.width+cell.x+x)*4,d=img.data;
  if(d[i+3]<=8||(key&&d[i]===key[0]&&d[i+1]===key[1]&&d[i+2]===key[2]))continue;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 return x1<0?null:{x:cell.x+x0,y:cell.y+y0,w:x1-x0+1,h:y1-y0+1,dx:x0,dy:y0};
};
// Punto de los pies en la celda: centro de la fila más baja con píxeles del primer fotograma.
D.guessAnchor=function(img,cell,key){
 const t=D.trim(img,cell,key);if(!t)return {x:Math.round(cell.w/2),y:cell.h};
 const y=t.dy+t.h-1;let a=-1,b=-1;for(let x=0;x<cell.w;x++){const i=((cell.y+y)*img.width+cell.x+x)*4,d=img.data;if(d[i+3]>8&&!(key&&d[i]===key[0]&&d[i+1]===key[1]&&d[i+2]===key[2])){if(a<0)a=x;b=x;}}
 return {x:Math.round((a+b+1)/2),y:y+1};
};
// Coloca rectángulos en filas dentro de un lienzo de ancho máximo `max`. Devuelve posiciones y tamaño.
D.shelf=function(sizes,max){
 max=max||1024;let x=0,y=0,row=0,width=0;const pos=sizes.map(s=>{if(x>0&&x+s.w>max){x=0;y+=row+1;row=0;}const p={x,y};x+=s.w+1;row=Math.max(row,s.h);width=Math.max(width,x-1);return p;});
 return {pos,width:Math.max(1,width),height:Math.max(1,y+row)};
};
// Crea el atlas y las pistas de una animación.
// frames: [{w,h,dx,dy}] recortes ya colocados en el atlas (pos), anchor: pies dentro de la celda.
// modes: {normal:{steps:[{frame,ticks}],impact:paso}, critical:…, miss:…}. 60 ticks = 1 segundo.
D.buildAnimation=function(o){
 T.assert(/^[^:]+$/.test(o.name||""),"Ponle un nombre a la animación (sin dos puntos).");
 const zoom=Number(o.zoom)||1,used=[];
 const rects=o.frames.map((f,i)=>({x:o.pos[i].x,y:o.pos[i].y,w:f.w,h:f.h,ox:Math.round((o.anchor.x-f.dx)*100)/100,oy:Math.round((o.anchor.y-f.dy-24/zoom)*100)/100}));
 const clips={};
 Object.keys(o.modes).forEach(mode=>{const m=o.modes[mode];if(!m||!m.steps||!m.steps.length)return;
  const frames=[];let impact=0;
  m.steps.forEach((s,i)=>{if(i===m.impact)impact=frames.length;const ticks=Math.max(1,Math.round(Number(s.ticks)||1));T.assert(o.frames[s.frame],"Fotograma inexistente: "+s.frame);used.push(s.frame);
   for(let t=0;t<ticks;t++)frames.push([{atlas:o.name,rect:s.frame,x:0,y:0,zoom,angle:0,mirror:!!o.mirror,opacity:1,blend:0}]);});
  T.assert(frames.length<=1200,"La animación "+D.MODES[mode]+" dura más de 20 segundos.");
  clips[o.name+":"+mode]={fps:60,impact,frames};
 });
 T.assert(clips[o.name+":normal"],"La animación Normal necesita al menos un fotograma.");
 ["critical","miss"].forEach(mode=>{if(!clips[o.name+":"+mode])clips[o.name+":"+mode]=copy(clips[o.name+":normal"]);});
 return {atlas:{path:o.path,rects},clips};
};
D.installAnimation=function(pack,name,built,replace){
 pack.atlases=pack.atlases||{};pack.clips=pack.clips||{};
 T.assert(replace||!pack.atlases[name],"Ya existe una animación llamada «"+name+"».");
 pack.atlases[name]=built.atlas;Object.assign(pack.clips,built.clips);return pack;
};
// Script de animación de FE Essentials / FEBuilder / FEditor (.txt junto a los PNG de cada fotograma):
//   /// - Mode 1      cabecera de modo (1 ataque, 3 crítico, 5 a distancia, 6 crítico a distancia, 7 esquiva, 9 de pie, 12 fallo)
//   3 p- frame.png    fotograma durante 3/60 s
//   C1A / C09 / C05   golpe normal / crítico / proyectil: el impacto     C01 tras el golpe: espera a que baje la vida
//   ~~~               fin del modo
D.FE_MODES={1:"Ataque",3:"Crítico",5:"Ataque a distancia",6:"Crítico a distancia",7:"Esquiva",8:"Esquiva a distancia",9:"De pie",10:"De pie",11:"De pie (distancia)",12:"Fallo"};
D.parseFEScript=function(text){
 const modes={};let cur=null;
 String(text||"").split(/\r?\n/).forEach(raw=>{const line=raw.replace(/#.*$/,"").trim();if(!line)return;
  if(/^\/\/\//.test(line)){const m=raw.match(/mode\s*(\d+)/i);cur=m?(modes[Number(m[1])]={steps:[],impact:-1,held:false}):null;return;}
  if(line==="~~~"){cur=null;return;}if(!cur)return;
  const f=line.match(/^(\d+)\s+p-\s*(.+)$/);if(f){cur.steps.push({file:f[2].trim(),ticks:Math.max(1,Number(f[1]))});return;}
  const c=line.match(/^C([0-9A-Fa-f]{2})/);if(!c)return;const code=parseInt(c[1],16);
  if((code===0x1A||code===0x09||code===0x05)&&cur.impact<0)cur.impact=cur.steps.length;
  // El juego pausa aquí mientras baja la vida: lo imitamos alargando el último fotograma.
  else if(code===0x01&&cur.impact>=0&&!cur.held&&cur.steps.length){cur.steps[cur.steps.length-1].ticks+=20;cur.held=true;}
 });
 Object.keys(modes).forEach(k=>{const m=modes[k];delete m.held;if(!m.steps.length){delete modes[k];return;}m.impact=Math.min(Math.max(0,m.impact),m.steps.length-1);});
 return modes;
};
// Qué modos de FE usar para normal / crítico / fallo. ranged=true usa los de distancia (5 y 6).
D.feTracks=function(modes,ranged){
 const pick=list=>list.map(n=>modes[n]).find(Boolean)||null,normal=ranged?pick([5,1]):pick([1,5]);
 return {normal,critical:ranged?pick([6,3,5]):pick([3,6,1]),miss:pick([12])||normal};
};
// Voltea (espejo) todas las pistas de una animación. Devuelve el nuevo estado (true = volteada).
D.flipAnimation=function(pack,name){
 const a=D.animations(pack)[name];T.assert(a,"No existe la animación «"+name+"».");const keys=Object.values(a.modes),layers=[];
 keys.forEach(k=>(pack.clips[k].frames||[]).forEach(f=>(f||[]).forEach(l=>layers.push(l))));
 const on=!layers.some(l=>l.mirror);layers.forEach(l=>{l.mirror=on;});return on;
};
D.isFlipped=(pack,name)=>{const a=D.animations(pack)[name],c=a&&pack.clips[a.modes.normal||Object.values(a.modes)[0]],f=c&&(c.frames||[]).find(f=>f&&f.length);return !!(f&&f[0].mirror);};
// Nombre de archivo seguro para img/.
D.fileName=s=>String(s||"anim").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"")||"anim";
// Formato que usa MZ para data/*.json: una fila por línea.
D.stringifyTable=list=>"[\n"+list.map(r=>JSON.stringify(r)).join(",\n")+"\n]";

if(typeof module!=="undefined"&&module.exports)module.exports=T;
})(typeof globalThis!=="undefined"?globalThis:this);
