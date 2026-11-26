/* TacticsMZ v0.3.0 | Copyright (c) 2026 TacticsMZ contributors | MIT License */
/* Archivo generado por tools/build.js desde src/. No lo edites a mano. */
/*:
 * @target MZ
 * @plugindesc v0.3.0 TacticsMZ · Interfaz: vista, gráficos, presentación y escenas.
 * @author TacticsMZ contributors
 * @url https://opensource.org/license/mit
 * @base TacticsEngine
 * @orderAfter TacticsEngine
 * @orderBefore TacticsMZ
 * @help
 * Interfaz de TacticsMZ. Diseño de 960 x 640.
 * Sustituye a TacticsView, TacticsGraphics, TacticsPresentation y TacticsScenes.
 */
// ===== src/ui/01_View.js =====
(function(root){
"use strict";
const T=root.Tactics;
T.audioBuffers=T.audioBuffers||new Map();
const palette={ink:"#0c1d25",panel:"#132c34",paper:"#f0ebda",muted:"#9eb5b8",gold:"#c9af71",blue:"#51bdde",red:"#e37879",green:"#76c49b"};
const teamColor=t=>t===1?palette.blue:t===2?palette.red:palette.green;
T.spellDefaults={fire:{name:'Fuego',color:'#ff9a48',delivery:'projectile'},ice:{name:'Escarcha',color:'#98e5ff',delivery:'target',travel:0,recovery:120,hitDelay:82},wind:{name:'Viento',color:'#99f6a8',delivery:'target',travel:0,recovery:64,hitDelay:30},thunder:{name:'Rayo',color:'#89c9ff',delivery:'target',travel:0,recovery:48,hitDelay:8},light:{name:'Luz',color:'#ffe69b',delivery:'target',travel:0,recovery:78,hitDelay:38},dark:{name:'Oscuridad',color:'#c38af5',delivery:'ground',travel:32,recovery:96,hitDelay:35}};
function download(name,blob){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
T.download=download;
// Uncompressed ZIP: the template remains usable without an additional dependency.
T.zip=function(files){
 const enc=new TextEncoder(),parts=[],central=[];let offset=0;
 const crc=bytes=>{let c=-1;for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^-1)>>>0;};
 Object.keys(files).forEach(name=>{
  const data=typeof files[name]==="string"?enc.encode(files[name]):files[name],n=enc.encode(name),check=crc(data);
  const h=new Uint8Array(30+n.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,check,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);h.set(n,30);parts.push(h,data);
  const c=new Uint8Array(46+n.length),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,check,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);c.set(n,46);central.push(c);offset+=h.length+data.length;
 });
 const end=new Uint8Array(22),d=new DataView(end.buffer),size=central.reduce((n,a)=>n+a.length,0);d.setUint32(0,0x06054b50,true);d.setUint16(8,central.length,true);d.setUint16(10,central.length,true);d.setUint32(12,size,true);d.setUint32(16,offset,true);return new Blob(parts.concat(central,[end]),{type:"application/zip"});
};
class View {
 constructor(canvas,engine,hooks){
  this.canvas=canvas;this.ctx=canvas.getContext("2d");this.engine=engine;this.hooks=hooks||{};this.buttons=[];this.cursor={x:2,y:7};this.mode="move";this.frame=0;this.menu=null;this.gallery=null;this.images={};this.danger=false;this.offset={x:0,y:0};this.form=null;this.error="";this.resultDismissed=false;
 }
 attach(source){
  this.inputCanvas=source||this.canvas;
  this.prepareAudio();
  const ui=this.engine.db.graphics&&this.engine.db.graphics.ui;Object.keys(ui||{}).forEach(key=>this.image(ui[key].path));
  const faces=this.engine.db.graphics&&this.engine.db.graphics.faces;Object.keys(faces||{}).forEach(key=>this.image(faces[key].path));
  const icons=this.engine.db.graphics&&this.engine.db.graphics.itemIcons;Object.keys(icons||{}).forEach(group=>Object.keys(icons[group]||{}).forEach(key=>{const icon=icons[group][key];if(icon&&icon.path)this.image(icon.path);}));
  const spells=this.engine.db.graphics&&this.engine.db.graphics.spells;Object.keys(spells&&spells.atlases||{}).forEach(key=>this.image(spells.atlases[key].path));
  this.engine.s.units.forEach(u=>{if(u.face)this.image(u.face);});
  this.handlers={click:e=>{const r=this.canvas.getBoundingClientRect();this.click((e.clientX-r.left)*this.canvas.width/r.width,(e.clientY-r.top)*this.canvas.height/r.height);},move:e=>{const r=this.canvas.getBoundingClientRect();this.hover((e.clientX-r.left)*this.canvas.width/r.width,(e.clientY-r.top)*this.canvas.height/r.height);},key:e=>{if(this.form)return;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter","Escape"," "].indexOf(e.key)>=0)e.preventDefault();this.key(e.key);}};
  this.handlers.click=e=>{if(e.target.closest&&e.target.closest('form,input,select,button'))return;const r=this.inputCanvas.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom){this.unlockAudio();this.inputSound('click',()=>this.click((e.clientX-r.left)*this.canvas.width/r.width,(e.clientY-r.top)*this.canvas.height/r.height));}};
  this.handlers.move=e=>{if(this.form)return;const r=this.inputCanvas.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom)this.hover((e.clientX-r.left)*this.canvas.width/r.width,(e.clientY-r.top)*this.canvas.height/r.height);};
  // MZ's transparent video element sits above its canvas, so native pointer events bubble through the document.
  const keyHandler=this.handlers.key;this.handlers.key=e=>{if(!this.form){this.unlockAudio();this.inputSound(e.key,()=>keyHandler(e));}};
  this.pointerTarget=source?document:this.inputCanvas;this.pointerTarget.addEventListener("click",this.handlers.click);this.pointerTarget.addEventListener("mousemove",this.handlers.move);document.addEventListener("keydown",this.handlers.key);
 }
 destroy(){if(this.handlers){this.pointerTarget.removeEventListener("click",this.handlers.click);this.pointerTarget.removeEventListener("mousemove",this.handlers.move);document.removeEventListener("keydown",this.handlers.key);}if(this.form)this.form.remove();this.form=null;this.audioDisposed=true;this.stopSamples(false);}
 safe(fn){try{fn();this.error="";}catch(e){this.error=e.message;this.errorUntil=this.frame+240;}}
 rect(x,y,w,h,color,stroke){const c=this.ctx;c.fillStyle=color;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.strokeRect(x+0.5,y+0.5,w-1,h-1);}}
 text(text,x,y,size,color,align,font){const c=this.ctx;c.font=(size||16)+"px "+(font||"Arial, sans-serif");c.textAlign=align||"left";c.textBaseline="middle";c.fillStyle=color||palette.paper;c.fillText(String(text),x,y);}
 line(x,y,w,color){this.rect(x,y,w,1,color||palette.gold);}
 panel(x,y,w,h){this.rect(x,y,w,h,palette.panel,palette.gold);this.line(x+8,y+5,w-16,"#526259");}
 button(label,x,y,w,fn,enabled){const active=enabled!==false;this.rect(x,y,w,32,active?"#26434b":"#1d3036",active?"#667977":"#36474a");this.text(label,x+12,y+16,14,active?palette.paper:"#6b8084");if(active)this.buttons.push({x,y,w,h:32,fn});}
 wrap(text,x,y,width,size,line,max){const c=this.ctx;c.font=size+"px Arial";let row="",lines=[];String(text).split(/\n/).forEach(paragraph=>{paragraph.split(/\s+/).forEach(word=>{if(c.measureText(row+word).width>width&&row){lines.push(row.trim());row="";}row+=word+" ";});lines.push(row.trim());row="";});lines.slice(0,max||999).forEach((l,i)=>this.text(l,x,y+i*line,size));return lines;}
 unlockAudio(){
  if(this.engine.s.options.mute)return;
  try{if(!this.audio){if(!T.audioContext||T.audioContext.state==='closed')T.audioContext=new (root.AudioContext||root.webkitAudioContext)();this.audio=T.audioContext;}if(this.audio.state==='suspended')this.audio.resume().catch(()=>{});}catch(e){/* Platforms without Web Audio may still render the game. */}
 }
 soundPack(){return this.engine.db.graphics&&this.engine.db.graphics.audio;}
 soundEntry(key){const p=this.soundPack(),entry=p&&p.effects&&p.effects[key];return typeof entry==='string'?{path:entry}:entry;}
 loadSound(key){
  const entry=this.soundEntry(key);if(!entry||!entry.path)return Promise.resolve(null);const path=entry.path,old=T.audioBuffers.get(path);if(old)return old.promise;
  this.unlockAudio();if(!this.audio)return Promise.resolve(null);
  const cached={buffer:null,error:null};T.audioBuffers.set(path,cached);
  cached.promise=new Promise(resolve=>{const fail=error=>{cached.error=String(error&&error.message||error);resolve(null);};try{const xhr=new XMLHttpRequest();xhr.open('GET',encodeURI(path));xhr.responseType='arraybuffer';xhr.timeout=10000;xhr.onerror=()=>fail('No se pudo cargar '+path);xhr.ontimeout=()=>fail('Tiempo de carga agotado: '+path);xhr.onload=()=>{if(xhr.status>=400||!xhr.response)return fail('Audio no encontrado: '+path);try{const pending=this.audio.decodeAudioData(xhr.response,buffer=>{cached.buffer=buffer;resolve(buffer);},fail);if(pending&&pending.catch)pending.catch(fail);}catch(error){fail(error);}};xhr.send();}catch(error){fail(error);}});
  return cached.promise;
 }
 prepareAudio(){const p=this.soundPack();return Promise.all(Object.keys(p&&p.effects||{}).map(key=>this.loadSound(key)));}
 stopSamples(includeUi){(this.sampleSources||[]).slice().forEach(row=>{if(includeUi||!row.ui)try{row.source.stop();}catch(error){/* Already stopped. */}});}
 playSample(key,options){
  if(this.engine.s.options.mute||this.audioDisposed)return false;const entry=this.soundEntry(key);if(!entry||!entry.path)return false;this.unlockAudio();if(!this.audio)return false;
  const settings=options||{},now=this.audio.currentTime;
  if(settings.throttle){this.sampleTimes=this.sampleTimes||{};if(this.sampleTimes[key]!==undefined&&now-this.sampleTimes[key]<settings.throttle)return true;this.sampleTimes[key]=now;}
  const play=buffer=>{if(!buffer||this.audioDisposed||this.engine.s.options.mute||this.audio.currentTime-now>.3)return;try{const ac=this.audio,source=ac.createBufferSource(),gain=ac.createGain(),volume=root.AudioManager?AudioManager.seVolume/100:1;source.buffer=buffer;gain.gain.value=T.clamp((entry.volume===undefined?75:entry.volume)/100,0,1)*T.clamp(volume,0,1);source.connect(gain);gain.connect(this.audioOutput||ac.destination);const row={source,ui:!!settings.ui};this.sampleSources=this.sampleSources||[];this.sampleSources.push(row);source.onended=()=>{source.disconnect();gain.disconnect();const i=this.sampleSources.indexOf(row);if(i>=0)this.sampleSources.splice(i,1);};source.start();}catch(error){/* A missing audio device must not interrupt the game. */}};
  const cached=T.audioBuffers.get(entry.path);if(cached&&cached.error)return false;if(cached&&cached.buffer)play(cached.buffer);else this.loadSound(key).then(play);return true;
 }
 inputSound(key,action){
  const state=()=>JSON.stringify([this.engine.s.selected,this.actionUnit,this.mode,this.cursor,this.menu&&[this.menu.type,this.menu.choice,this.menu.slot,this.menu.page],this.gallery&&[this.gallery.index,this.gallery.mode],this.engine.s.preparation&&this.engine.s.preparation.selectedKey,this.engine.s.presentations[0]&&[this.engine.s.presentations[0].type,this.engine.s.presentations[0].page]]),before=state(),selected=this.engine.s.selected,menu=this.menu,error=this.errorUntil,p=this.engine.s.presentations[0],muted=this.engine.s.options.mute;
  action();if(!muted&&this.engine.s.options.mute){this.stopSamples(true);return;}if(this.errorUntil!==error){this.playSample('buzzer',{ui:true});return;}
  if(p&&p.type==='combat')return;
  if(/^Arrow/.test(key)){if(before!==state()||this.engine.s.map.id===0)this.playSample(this.menu||this.gallery||this.engine.s.map.id===0?'menuMove':'cursorMove',{ui:true,throttle:.055});}
  else if(key==='Escape'){if(before!==state())this.playSample('cancel',{ui:true});}
  else if(this.engine.s.selected&&this.engine.s.selected!==selected)this.playSample('unitSelect',{ui:true});
  else if(this.menu&&!menu)this.playSample('menuOpen',{ui:true});
  else if(['click','Enter',' ','z','Z'].indexOf(key)>=0)this.playSample('confirm',{ui:true,throttle:.04});
 }
 attackSound(strike){
  const p=this.soundPack();if(!p)return;const u=this.engine.unit(strike.attacker),weapon=Object.values(this.engine.db.weapons).find(w=>w.name===strike.weapon),category=strike.weaponCategory||weapon&&weapon.category||u&&(this.engine.cls(u).weaponTypes||[])[0];
  const spell=this.spellFor(strike);this.playSample(strike.magic?spell&&spell.castSound||'cast':(p.attacks||{})[category]||'swing');
 }
 movementSound(u,index){const p=this.soundPack();if(!p||!u)return;const type=this.engine.cls(u).moveType||'foot',keys=(p.steps||{})[type]||(p.steps||{}).foot||[];if(keys.length)this.playSample(keys[index%keys.length],{throttle:.075});}
 audioFeedback(){
  if(!this.soundPack())return;const s=this.engine.s,levels=Object.fromEntries(s.units.filter(u=>u.team===1).map(u=>[u.id,u.level])),current={map:s.map.id,team:s.team,turn:s.turn,levels,result:s.result};
  if(!this.audioState||this.audioState.map!==current.map){this.audioState=current;this.feedbackQueue=[];return;}
  const old=this.audioState;this.audioState=current;if(!s.preparation&&(old.team!==s.team||old.turn!==s.turn))this.playSample('phase');
  if(Object.keys(levels).some(id=>old.levels[id]!==undefined&&levels[id]>old.levels[id]))this.feedbackQueue.push('levelUp');
  if(s.result&&!old.result)this.feedbackQueue.push(s.result==='victory'?'victory':'defeat');
  if(!s.presentations.length&&!s.queue.length&&this.feedbackQueue.length&&(!this.feedbackUntil||this.frame>=this.feedbackUntil)){const key=this.feedbackQueue.shift();this.playSample(key);const entry=this.soundEntry(key),cached=entry&&T.audioBuffers.get(entry.path);this.feedbackUntil=this.frame+Math.ceil((cached&&cached.buffer?cached.buffer.duration:1)*60)+12;}
 }
 sound(magic,critical,miss,strike){
  const spell=magic&&strike&&this.spellFor(strike),key=miss?'miss':critical?'critical':strike&&strike.damage===0?'noDamage':strike&&strike.hp===0?'death':magic?spell&&spell.hitSound||'magicHit':'hit';if(this.playSample(key))return;
  if(this.engine.s.options.mute)return;this.unlockAudio();const ac=this.audio;if(!ac)return;
  try{
   const start=ac.currentTime,duration=miss?.19:critical?.34:magic?.29:.21,output=this.audioOutput||ac.destination;
   const envelope=(volume)=>{const gain=ac.createGain();gain.gain.setValueAtTime(.001,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+duration);gain.connect(output);return gain;};
   // Original synthesized effects: a filtered sweep for misses, body + transient for impacts.
   const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);let seed=73517;
   for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1);}
   const noise=ac.createBufferSource(),filter=ac.createBiquadFilter();noise.buffer=buffer;filter.type=miss?'bandpass':magic?'highpass':'lowpass';filter.frequency.setValueAtTime(miss?2400:magic?1800:critical?2600:1800,start);filter.frequency.exponentialRampToValueAtTime(miss?420:magic?700:220,start+duration);filter.Q.value=miss?.65:.8;noise.connect(filter);filter.connect(envelope(miss?.13:critical?.28:.2));noise.start(start);noise.stop(start+duration);
   if(!miss){const tone=ac.createOscillator();tone.type=magic?'sine':'triangle';tone.frequency.setValueAtTime(magic?880:critical?145:190,start);tone.frequency.exponentialRampToValueAtTime(magic?260:48,start+duration);tone.connect(envelope(magic?.2:critical?.25:.19));tone.start(start);tone.stop(start+duration);}
  }catch(e){/* Audio failures must not interrupt a combat or consume additional actions. */}
 }
 image(src){let image=this.images[src];if(!image){image=new Image();image.src=src;this.images[src]=image;}return image.complete&&image.naturalWidth?image:null;}
 recolored(img,u,flash){
  const cls=this.engine.cls(u),colors=u.colors||{},source=cls.palette||{cloth:"#61adcf",hair:"#392d35",skin:"#dfb797"},id=img.src+JSON.stringify(colors)+String(flash);
  this.tinted=this.tinted||{};if(this.tinted[id])return this.tinted[id];
  const canvas=document.createElement("canvas");canvas.width=img.width;canvas.height=img.height;const c=canvas.getContext("2d");c.drawImage(img,0,0);
  try{const pixels=c.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;const values=Object.keys(source).filter(k=>/^#[0-9a-f]{6}$/i.test(source[k])&&/^#[0-9a-f]{6}$/i.test(colors[k]||"")).map(k=>({from:parseInt(source[k].slice(1),16),to:parseInt(colors[k].slice(1),16)}));for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;if(flash){d[i]=255;d[i+1]=244;d[i+2]=219;continue;}const value=(d[i]<<16)|(d[i+1]<<8)|d[i+2],match=values.find(p=>p.from===value);if(match){d[i]=match.to>>16&255;d[i+1]=match.to>>8&255;d[i+2]=match.to&255;}}c.putImageData(pixels,0,0);}catch(e){return img;}
  if(Object.keys(this.tinted).length>64)this.tinted={};this.tinted[id]=canvas;return canvas;
 }
 mapSprite(u,x,y,tile,pose,flash){
  if(T.Graphics&&T.Graphics.map(this,u,x,y,tile,pose,flash))return;
  if(!u.graphic){this.sprite(u,x,y,tile/52,1,pose,flash);return;}
  const src=/\.png$/i.test(u.graphic)?u.graphic:"img/characters/"+u.graphic+".png",img=this.image(src);if(!img){this.sprite(u,x,y,tile/52,1,pose,flash);return;}
  const single=/(^|\/)\$/.test(u.graphic),fw=img.width/(single?3:12),fh=img.height/(single?4:8),index=u.characterIndex||0,col=(single?0:index%4*3)+(pose?Math.floor(pose)%3:1),row=single?0:Math.floor(index/4)*4;this.ctx.imageSmoothingEnabled=false;this.ctx.drawImage(this.recolored(img,u,flash),col*fw,row*fh,fw,fh,x-tile*.45,y-tile*.95,tile*.9,tile*.95);
 }
 spellFor(strike){
  if(!strike||!strike.magic||strike.spell==='none')return null;
  const db=this.engine.db,p=db.graphics&&db.graphics.spells||{},w=db.weapons[strike.weaponId]||Object.values(db.weapons).find(w=>w.name===strike.weapon)||{};
  let key=strike.spell||w.spell||(p.weapons||{})[w.id]||p.default||'fire';if(key==='none')return null;
  const definitions=p.definitions||{};if(!definitions[key]&&!T.spellDefaults[key])key=p.default&&definitions[p.default]?p.default:'fire';
  return Object.assign({key,travel:24,recovery:36},T.spellDefaults[key]||T.spellDefaults.fire,definitions[key]||{});
 }
 strikeTiming(strike,u,animation,index,start){
  const a=animation||{},count=Math.max(1,(a.frames||[0,1,2,3,4,5]).length),fps=Math.max(1,a.fps||12),release=Math.floor(T.clamp(a.impact===undefined?3:a.impact,0,count-1)*60/fps),spell=this.spellFor(strike);
  const numeric=(value,fallback,min,max)=>T.clamp(Number.isFinite(Number(value))?Number(value):fallback,min,max),travel=spell?numeric(spell.travel,24,0,120):0,recovery=spell?numeric(spell.recovery,36,12,240):0,charge=spell?numeric(spell.chargeFrames,18,0,120):12,effectStart=release+travel,hitDelay=spell?numeric(spell.hitDelay,0,0,recovery-1):0,impact=effectStart+hitDelay,duration=Math.ceil(count*60/fps)+travel+recovery+24;
  start=start||0;return {index:index||0,strike,start,end:start+duration,attackAt:start+Math.max(0,release-charge),impactAt:start+impact,release,effectStart,impact,hitDelay,charge,duration,count,fps,spell,travel,recovery};
 }
 strikeFrame(row,phase){const actorTime=row.spell&&phase>row.release?row.release+Math.max(0,phase-row.release-row.travel-row.recovery):phase;return Object.assign({},row,{phase,pose:Math.min(row.count-1,Math.max(0,Math.floor(actorTime*row.fps/60)))});}
 combatTimeline(p){
  let start=0;return p.strikes.map((strike,index)=>{const u=this.engine.unit(strike.attacker),external=T.Graphics&&T.Graphics.clip(this,u,strike.critical?'critical':strike.hit?'normal':'miss',strike),entry=this.strikeTiming(strike,u,external||this.engine.cls(u).animation,index,start);start=entry.end;return entry;});
 }
 combatTime(p){
  const timeline=this.combatTimeline(p),t=p.t||0,row=timeline.find(a=>t<a.end);
  if(row)return this.strikeFrame(row,t-row.start);
  return {index:p.strikes.length,strike:null,phase:0,pose:0,impact:0,duration:0,total:timeline.length?timeline[timeline.length-1].end:0};
 }
 combatSounds(p){
  const last=p.soundIndex===undefined?-1:p.soundIndex,attackLast=p.attackSoundIndex===undefined?last:p.attackSoundIndex;this.combatTimeline(p).forEach(row=>{if(row.index>attackLast&&(p.t||0)>=row.attackAt){this.attackSound(row.strike);p.attackSoundIndex=row.index;}if(row.index>last&&(p.t||0)>=row.impactAt){const hit=row.strike;this.sound(hit.magic,hit.critical,!hit.hit,hit);p.soundIndex=row.index;}});
 }
 spellParts(t,fromX,toX,ground,scale){
  if(!t||!t.spell)return [];const s=t.spell,p=t.phase,release=t.release,effect=t.effectStart,delivery=s.delivery||'projectile',facing=toX>=fromX?1:-1,body=ground-25*scale,parts=[];
  const add=(stage,progress,x,y,opacity)=>{const def=s[stage];if(def===null)return;parts.push({stage,progress:T.clamp(progress,0,1),x,y:def&&def.anchor==='ground'?ground:y,facing,opacity:opacity===undefined?1:opacity});};
  const chargeStart=Math.max(0,release-t.charge);
  if(p>=chargeStart&&p<release&&t.charge>0)add('charge',(p-chargeStart)/Math.max(1,release-chargeStart),s.charge&&s.charge.anchor==='ground'?fromX:fromX+12*scale*facing,body);
  if(p>=release&&p<effect&&delivery!=='target'){
   const progress=(p-release)/Math.max(1,t.travel),x=fromX+16*scale*facing+(toX-fromX-16*scale*facing)*progress;
   add('projectile',progress,x,delivery==='ground'?ground:body-Math.sin(progress*Math.PI)*(s.arc===undefined?8:s.arc)*scale);
  }
  if(s.launch&&p>=release&&p<release+18)add('launch',(p-release)/18,fromX+16*scale*facing,body);
  if(p>=effect&&p<effect+t.recovery){
   const progress=(p-effect)/t.recovery;
   if(!t.strike.hit&&delivery==='projectile')add('projectile',progress,toX+facing*progress*80*scale,body-progress*12*scale,1-progress);
   else {const duration=Number.isFinite(s.impactDuration)?T.clamp(s.impactDuration,1,t.recovery):t.recovery;if(p<effect+duration)add('impact',(p-effect)/duration,toX,body,Math.min(1,(1-progress)*5));}
  }
  return parts;
 }
 drawSpellBackdrop(t,x,y,w,h,foreground,facing){
  if(!t||!t.spell)return;const s=t.spell,age=t.phase-(t.release-t.charge),remaining=t.effectStart+t.recovery-t.phase;
  if(age<0||remaining<=0)return;
  const part=foreground?'burst':'backdrop',definition=s[part],elapsed=t.phase-t.effectStart-(definition&&definition.delay||0),duration=t.recovery-(definition&&definition.delay||0);
  if(!foreground&&s.dim)this.rect(x,y,w,h,'rgba(0,0,0,'+(s.dim*Math.min(1,age/12,remaining/16))+')');
  if(definition&&elapsed>=0&&elapsed<duration&&T.Graphics)T.Graphics.spellEffect(this,s,part,elapsed/duration,x,y,1,foreground?-(facing||1):1,definition.opacity===undefined?1:definition.opacity,false,0,{w,h});
  if(foreground){const flash=t.phase-t.impact;if(s.flash&&t.strike.hit&&flash>=0&&flash<5)this.rect(x,y,w,h,'rgba(255,255,255,'+(s.flash*(1-flash/5))+')');}
 }
 spellDodge(t){if(!t||!t.spell||t.strike.hit||t.phase<=t.impact-12||t.phase>=t.impact+24)return 0;return Math.sin((t.phase-t.impact+12)/36*Math.PI)*26;}
 drawSpell(timing,fromX,toX,ground,scale){
  if(!timing||!timing.spell)return;const spell=timing.spell,c=this.ctx;
  this.spellParts(timing,fromX,toX,ground,scale).forEach(part=>{const {stage,progress,x,y,facing,opacity}=part;c.save();
   if(!(T.Graphics&&T.Graphics.spellEffect(this,spell,stage,progress,x,y,scale,facing,opacity,timing.strike.critical,ground))){
    c.globalAlpha=opacity;c.fillStyle=spell.color||'#98dbff';const radius=(stage==='impact'?18+progress*20:stage==='charge'?4+progress*9:9)*scale;c.beginPath();c.arc(x,y-(spell[stage]&&spell[stage].anchor==='ground'?radius:0),radius,0,Math.PI*2);c.fill();c.fillStyle='#fff3d1';c.beginPath();c.arc(x,y,radius*.45,0,Math.PI*2);c.fill();
   }c.restore();
  });
  if(spell.snow&&timing.phase>=timing.effectStart&&timing.phase<timing.impact){const tick=timing.phase-timing.effectStart;c.save();c.fillStyle='#e6faff';for(let i=0;i<22;i++){const x=toX+Math.sin(i*13.7+tick/17)*49*scale,y=ground-((i*23+tick*1.8)%115)*scale;c.fillRect(Math.round(x),Math.round(y),scale,scale);}c.restore();}
 }
 sprite(u,x,y,scale,facing,pose,flash){
  if(!this.originalExample&&T.Graphics&&T.Graphics.battle(this,u,x,y,scale,facing||1,pose,flash))return;
  const e=this.engine,c=this.ctx,cls=e.db.classes[u.classId]||{},colors=u.colors||{cloth:u.color,hair:"#392d35",skin:"#dfb797"};
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale*(facing||1),scale);c.imageSmoothingEnabled=false;
  if(cls.sprite){
   const img=this.image(cls.sprite);
   if(img){const a=cls.animation||{},fw=a.frameWidth||64,fh=a.frameHeight||64,cols=a.columns||Math.floor(img.width/fw),frames=a.frames||[0],index=frames[Math.floor(pose||0)%frames.length];c.drawImage(this.recolored(img,u,flash),index%cols*fw,Math.floor(index/cols)*fh,fw,fh,-24,-48,48,48);c.restore();return;}
  }
  const moving=pose>0,step=moving?Math.sin(pose*1.8)*3:0,hitPose=pose>=2&&pose<5;
  const fill=(x,y,w,h,color)=>{c.fillStyle=flash?"#fff4db":color;c.fillRect(x,y,w,h);};
  fill(-9,-14,7,14+step,"#293840");fill(3,-14,7,14-step,"#293840");
  if(cls.moveType==="mounted"){fill(-17,-13,34,11,"#745b47");fill(-15,-4,4,8,"#493f36");fill(11,-4,4,8,"#493f36");fill(12,-24,9,14,"#8b7258");}
  if(cls.moveType==="flying"){fill(-23,-24,15,5,"#dddccc");fill(-28,-28,18,4,"#bbbcae");fill(9,-24,18,5,"#dddccc");}
  fill(-10,-31,20,21,colors.cloth);fill(-7,-28,3,15,"rgba(255,255,255,.2)");fill(-10,-12,20,4,palette.gold);
  fill(-7,-45,14,14,colors.skin);fill(-8,-46,16,6,colors.hair);fill(-8,-41,4,8,colors.hair);fill(3,-39,3,2,"#192a31");
  const type=(cls.weaponTypes||[])[0];
  if(type==="arcane"||type==="staff"){fill(13,-37,3,34,"#90784a");fill(10,-43,9,8,"#93d6e4");if(hitPose){fill(21,-31,8,8,"#b5ebed");fill(28,-27,5,5,"#f9eac1");}}
  else if(type==="bow"){fill(15,-33,3,30,"#c9ab78");fill(18,-30,3,24,"#806b48");fill(12,-19,18,2,"#d5d9d1");}
  else{const offset=hitPose?8:0;fill(8,-28,7+offset,6,colors.skin);fill(17+offset,-39,3,29,"#dce1d7");fill(12+offset,-15,12,3,palette.gold);if(type==="axe")fill(19+offset,-37,9,12,"#b5c4c2");}
  c.restore();
 }
 selected(){return this.engine.unit(this.engine.s.selected);}
 mapMetrics(){const s=this.engine.s,w=this.canvas.width,h=this.canvas.height;const area={x:24,y:102,w:w-334,h:h-164};const tile=Math.min(48,Math.max(24,Math.floor(Math.min(area.w/s.map.width,area.h/s.map.height))));return {x:area.x,y:area.y,w:area.w,h:area.h,tile,cols:Math.floor(area.w/tile),rows:Math.floor(area.h/tile)};}
 hover(x,y){const m=this.mapMetrics();if(x>=m.x&&x<m.x+m.w&&y>=m.y&&y<m.y+m.h)this.cursor={x:Math.floor((x-m.x)/m.tile)+this.offset.x,y:Math.floor((y-m.y)/m.tile)+this.offset.y};}
 click(x,y){if(this.form)return;const button=this.buttons.slice().reverse().find(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h);if(button){this.safe(button.fn);return;}
  const p=this.engine.s.presentations[0];if(p&&p.type==="dialogue"){this.advanceDialogue(p);return;}if(p&&p.type==="combat"){p.fast=true;return;}
  if(this.gallery||this.menu||this.engine.s.presentations.length||this.engine.s.team!==1||this.engine.s.result)return;
  const m=this.mapMetrics();if(x>=m.x&&x<m.x+m.w&&y>=m.y&&y<m.y+m.h){this.hover(x,y);this.safe(()=>this.chooseTile());}
 }
 key(k){
  if(this.form)return;
  if(k==="Escape"){if(this.gallery){this.gallery=null;return;}if(this.menu){this.menu=null;return;}this.mode="move";this.engine.s.selected=null;return;}
  if(k==="Enter"||k===" "){const p=this.engine.s.presentations[0];if(p&&p.type==="dialogue")this.advanceDialogue(p);else if(p&&p.type==="combat")p.fast=true;else this.safe(()=>this.chooseTile());return;}
  const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(deltas[k]){this.cursor.x=T.clamp(this.cursor.x+deltas[k][0],0,this.engine.s.map.width-1);this.cursor.y=T.clamp(this.cursor.y+deltas[k][1],0,this.engine.s.map.height-1);this.focus(this.cursor);}
 }
 focus(p){const m=this.mapMetrics();this.offset.x=T.clamp(p.x-Math.floor(m.cols/2),0,Math.max(0,this.engine.s.map.width-m.cols));this.offset.y=T.clamp(p.y-Math.floor(m.rows/2),0,Math.max(0,this.engine.s.map.height-m.rows));}
 chooseTile(){
  const e=this.engine,s=e.s,u=this.selected(),v=e.at(this.cursor.x,this.cursor.y);
  if(s.team!==1||s.presentations.length||s.result||this.menu||this.gallery)return;
  if(u&&this.mode==="attack"){if(v&&e.visible(v.x,v.y)&&!e.allies(u,v)&&e.forecast(u,v).can){this.menu={type:"forecast",a:u.id,b:v.id};}return;}
  if(u&&this.mode==="item"){if(v){e.useItem(u,this.itemSlot,v);this.mode="move";if(u.acted)s.selected=null;}return;}
  const targeted=["rescue","give","take","cover","drop","talk","support","trade","steal"];
  if(u&&targeted.indexOf(this.mode)>=0&&!e.actionTargets(u,this.mode).some(target=>this.mode==="drop"?target.x===this.cursor.x&&target.y===this.cursor.y:target===v)){this.error="Elige un objetivo válido en una casilla contigua.";this.errorUntil=this.frame+180;return;}
  if(u&&["rescue","give","take","cover"].indexOf(this.mode)>=0){e.rescue(u,v,this.mode);this.mode="move";s.selected=u.acted?null:u.id;this.actionUnit=u.acted?null:u.id;return;}
  if(u&&this.mode==="drop"){e.rescue(u,null,"drop",this.cursor.x,this.cursor.y);this.mode="move";s.selected=null;return;}
  if(u&&this.mode==="talk"){e.talk(u,v);this.mode="move";s.selected=null;return;}
  if(u&&this.mode==="support"){e.support(u,v);this.mode="move";return;}
  if(u&&this.mode==="trade"){this.menu={type:"trade",unit:u.id,target:v.id};return;}
  if(u&&this.mode==="steal"){this.menu={type:"steal",unit:u.id,target:v.id};return;}
  if(v&&v.team===1&&!v.acted){if(u&&u!==v&&s.moveOrigin&&!u.committed)e.undoMove(u);s.selected=v.id;this.mode="move";return;}
  if(u&&!u.acted){e.move(u,this.cursor.x,this.cursor.y,false);this.mode="move";}
 }
 update(){
  this.frame++;this.audioFeedback();if(this.form)return;
  const e=this.engine,s=e.s;
  if(s.map.creator&&!s.creatorDone){s.creatorDone=true;this.creator(e.unit(s.map.protagonist||1));return;}
  if(s.preparation){if(this.preparationState!==s.preparation){this.preparationState=s.preparation;const leader=e.unit(s.map.leader)||s.units.find(u=>u.team===1);if(leader){this.cursor={x:leader.x,y:leader.y};this.focus(leader);}}return;}
  if(this.gallery||this.menu)return;
  const p=s.presentations[0];
  if(p){
   if(p.type==="move"){p.t=(p.t||0)+1;const step=Math.floor((p.t-1)/7);if(p.t%7===1)this.movementSound(e.unit(p.id),step);this.focus(p.path[Math.min(p.path.length-1,Math.floor(p.t/7))]||p.from);if(p.t>=Math.max(1,p.path.length)*7)s.presentations.shift();}
   else if(p.type==="combat"){
    p.t=(p.t||0)+(p.fast?6:1);this.combatSounds(p);const timing=this.combatTime(p);
    if(!timing.strike)s.presentations.shift();
   }else if(p.type==="heal"){p.t=(p.t||0)+1;if(p.t===1&&!this.playSample('heal'))this.sound(true,false);if(p.t>24)s.presentations.shift();}
   else if(p.type==="dialogue"){if(!p.audioStarted){p.audioStarted=true;this.playSample('dialogue',{ui:true});}}
   else if(p.type==="shop"||p.type==="arena"){this.menu=T.copy(p);s.presentations.shift();}
   else if(p.type==="save"){s.presentations.shift();this.save(p.slot);}
   else if(p.type==="next"){s.presentations.shift();this.next(p.mapId);}
   else if(p.type==="menu"){s.presentations.shift();if(p.menu==="creator")this.creator(e.unit(p.unit));else if(p.menu==="animations")this.openGallery();else if(p.menu==="workshop")this.workshop();else this.menu={type:p.menu,unit:p.unit};}
   else if(p.type==="music"){s.presentations.shift();if(this.hooks.music)this.hooks.music(p);}
   else s.presentations.shift();
   return;
  }
  e.tick();if(s.queue.length||s.presentations.length)return;
  if(s.camera.x||s.camera.y){this.focus(s.camera);s.camera={x:0,y:0};}
  if(s.team!==1&&!s.result&&!s.phasePending){const u=s.units.filter(u=>T.alive(u)&&!u.carrier&&!u.acted&&u.team===s.team).sort((a,b)=>b.priority-a.priority)[0];if(u)this.safe(()=>e.runAI(u));else e.endPhase();}
 }
 openSave(){this.menu=null;if(this.hooks.saveMenu)this.hooks.saveMenu();else this.save(1);}
 save(slot){if(this.hooks.save)this.hooks.save(this.engine.save(),slot||1);else localStorage.setItem("TacticsMZ.save",JSON.stringify({db:this.engine.db,state:this.engine.save()}));this.engine.notice("Partida guardada");}
 next(id){if(this.hooks.next){this.hooks.next(id,this);return;}const m=T.exampleMissions[id];if(m){this.engine.nextMission(m);this.resultDismissed=false;this.menu=null;this.focus({x:3,y:7});}else this.engine.notice("Campaña terminada");}
 draw(){
  const c=this.ctx,w=this.canvas.width,h=this.canvas.height,e=this.engine,s=e.s;this.buttons=[];c.globalAlpha=1;c.globalCompositeOperation="source-over";this.rect(0,0,w,h,palette.ink);
  if(this.gallery){this.drawGallery();return;}
  this.text("TACTICS / "+s.map.title,24,32,23,palette.paper,"left","Georgia, serif");this.text("TURNO "+s.turn+"   ·   "+s.teamNames[s.team],w-26,32,15,teamColor(s.team),"right");this.line(24,57,w-48);
  this.text(s.objective==="boss"?"OBJETIVO  Derrota a los jefes":s.objective==="seize"?"OBJETIVO  Conquista el santuario":s.objective==="survive"?"OBJETIVO  Sobrevive hasta el turno "+s.map.surviveTurns:s.objective==="manual"?"OBJETIVO  Completa la misión":"OBJETIVO  Elimina a los enemigos",24,78,14,palette.gold);
  this.text(s.gold+" G",w-26,77,16,palette.gold,"right");this.drawMap();this.drawSidebar();
  this.text(this.error&&this.frame<(this.errorUntil||0)?this.error:s.log[s.log.length-1]||"Selecciona una unidad y elige una casilla.",24,h-23,14,this.error&&this.frame<(this.errorUntil||0)?palette.red:palette.muted);
  const p=s.presentations[0];if(p&&p.type==="combat")this.drawCombat(p);if(p&&p.type==="dialogue")this.drawDialogue(p);
  if(this.menu)this.drawMenu();if(this.gallery)this.drawGallery();
  if(s.result&&!s.queue.length&&!s.presentations.length&&!this.menu&&!this.gallery&&!this.resultDismissed)this.drawResult();
 }
 drawMap(){
  const e=this.engine,s=e.s,c=this.ctx,m=this.mapMetrics(),u=this.selected(),t=m.tile,px=x=>m.x+(x-this.offset.x)*t,py=y=>m.y+(y-this.offset.y)*t;
  c.save();c.beginPath();c.rect(m.x,m.y,m.cols*t,m.rows*t);c.clip();
  const externalMap=T.Graphics&&T.Graphics.background(this,m);
  for(let y=this.offset.y;y<Math.min(s.map.height,this.offset.y+m.rows);y++)for(let x=this.offset.x;x<Math.min(s.map.width,this.offset.x+m.cols);x++){
   if(externalMap){if(!s.preparation&&!e.visible(x,y))this.rect(px(x),py(y),t,t,"rgba(6,17,25,.76)");continue;}
   const terrain=e.terrain(x,y),a=px(x),b=py(y);this.rect(a,b,t,t,terrain.color);this.rect(a+2,b+2,t-4,t-4,"rgba(255,255,255,.035)","rgba(14,39,38,.18)");
   const type=(s.map.tiles||[])[y*s.map.width+x];if(type===1){c.fillStyle="#214b3e";c.beginPath();c.moveTo(a+t/2,b+5);c.lineTo(a+t-5,b+t-8);c.lineTo(a+5,b+t-8);c.fill();}if(type===2)this.line(a+6,b+t/2,t-12,"#81b5bf");if(type===3)this.rect(a+4,b+5,t-8,t-10,"#7b8586","#3a494f");if(type===5){c.strokeStyle=palette.gold;c.beginPath();c.arc(a+t/2,b+t/2,t/3,0,Math.PI*2);c.stroke();}
   if(!s.preparation&&!e.visible(x,y))this.rect(a,b,t,t,"rgba(6,17,25,.76)");
  }
  const overlay=(x,y,color)=>{if(e.inside(x,y))this.rect(px(x)+1,py(y)+1,t-2,t-2,color);};
  if(this.danger){const danger=new Set();s.units.filter(v=>T.alive(v)&&v.team===2&&!v.carrier&&e.visible(v.x,v.y)).forEach(v=>{const w=e.weapon(v);if(!w||w.staff)return;const range=e.weaponRange(v,w);Object.keys(e.paths(v,e.value(v,"move")).costs).forEach(k=>{const p=k.split(",").map(Number);for(let dx=-range.max;dx<=range.max;dx++)for(let dy=-range.max;dy<=range.max;dy++){const d=Math.abs(dx)+Math.abs(dy);if(d>=range.min&&d<=range.max)danger.add(T.key(p[0]+dx,p[1]+dy));}});});danger.forEach(k=>{const p=k.split(",").map(Number);overlay(p[0],p[1],"rgba(217,66,96,.23)");});}
  if(u&&!u.acted&&!s.presentations.length&&s.team===1){
   if(this.mode==="attack"||this.mode==="item"){const w=this.mode==="item"?e.itemData(u.inventory[this.itemSlot]):e.weapon(u);if(w){const range=e.weaponRange(u,w),max=range.max,min=this.mode==="item"&&!w.staff?0:range.min;for(let dx=-max;dx<=max;dx++)for(let dy=-max;dy<=max;dy++){const d=Math.abs(dx)+Math.abs(dy);if(d>=min&&d<=max)overlay(u.x+dx,u.y+dy,this.mode==="attack"?"rgba(250,75,90,.5)":"rgba(69,214,171,.4)");}}}
   else if(this.mode!=="move")e.actionTargets(u,this.mode).forEach(v=>overlay(v.x,v.y,"rgba(69,214,171,.45)"));
   else {
    const current=this.actionUnit===u.id||!!(s.moveOrigin&&s.moveOrigin.id===u.id),range=e.selectionRange(u,current),movement=new Set(range.move.map(p=>T.key(p.x,p.y)));
    range.attack.forEach(p=>{if(!movement.has(T.key(p.x,p.y))){overlay(p.x,p.y,"rgba(244,53,73,.46)");c.strokeStyle="rgba(255,118,122,.72)";c.lineWidth=1;c.strokeRect(px(p.x)+1.5,py(p.y)+1.5,t-3,t-3);}});
    if(!current)range.move.forEach(p=>overlay(p.x,p.y,"rgba(46,161,220,.3)"));
    e.conversationTargets(u).forEach(v=>{overlay(v.x,v.y,"rgba(12,117,61,.82)");c.strokeStyle="#85ff99";c.lineWidth=2;c.strokeRect(px(v.x)+2,py(v.y)+2,t-4,t-4);});
   }
  }
  if(T.Graphics&&T.Graphics.events)T.Graphics.events(this,m,false);
  const motion=s.presentations[0],healthBars=[];
  s.units.filter(v=>T.alive(v)&&!v.carrier&&e.visible(v.x,v.y)).forEach(v=>{
   let x=v.x,y=v.y,pose=0;
   if(motion&&motion.type==="move"&&motion.id===v.id&&motion.path.length){const progress=(motion.t||0)/7,i=Math.min(motion.path.length-1,Math.floor(progress)),to=motion.path[i],from=i?motion.path[i-1]:motion.from,f=progress-i;x=from.x+(to.x-from.x)*f;y=from.y+(to.y-from.y)*f;pose=progress*2;v.direction=to.x>from.x?6:to.x<from.x?4:to.y>from.y?2:8;}
   const a=px(x)+t/2,b=py(y)+t-9;c.globalAlpha=v.acted?.5:1;
   this.mapSprite(v,a,b,t,pose,motion&&motion.type==="heal"&&motion.id===v.id);
   healthBars.push({unit:v,x:px(x),y:py(y)});
   if(v.boss)this.text("◆",a+10,b-33,10,palette.gold);if(v.passenger)this.text("+",a+13,b-14,12,palette.paper);c.globalAlpha=1;
  });
  if(T.Graphics&&T.Graphics.events)T.Graphics.events(this,m,true);
  healthBars.forEach(bar=>this.drawMapHealth(bar.unit,bar.x,bar.y,t));
  if(s.tone)this.rect(m.x,m.y,m.w,m.h,this.alpha(s.tone.color,s.tone.opacity));
  c.strokeStyle=palette.paper;c.lineWidth=2;c.strokeRect(px(this.cursor.x)+2,py(this.cursor.y)+2,t-4,t-4);c.restore();
 }
 mapHealth(u,x,y,tile){
  const total=Number(this.engine.value(u,"health")),raw=Number(u.hp),max=Number.isFinite(total)&&total>0?total:1,hp=Number.isFinite(raw)?T.clamp(raw,0,max):0,ratio=hp/max;
  const width=Math.max(10,Math.min(34,Math.floor(tile)-6)),inner=width-4;
  return {x:Math.round(x+(tile-width)/2),y:Math.round(y+tile-8),w:width,h:7,fill:hp>0?Math.max(1,Math.round(inner*ratio)):0,ratio,tone:ratio<=.25?'critical':ratio<=.5?'wounded':'healthy'};
 }
 drawMapHealth(u,x,y,tile){
  const g=this.mapHealth(u,x,y,tile),c=this.ctx,focused=this.engine.s.selected===u.id||this.cursor.x===u.x&&this.cursor.y===u.y;
  const shades={healthy:['#c3f3a2','#68c878','#328257'],wounded:['#fff0a6','#e6b94e','#a67829'],critical:['#ffc0a9','#f06e62','#ac354e']}[g.tone];
  c.save();c.globalAlpha=1;
  const border=g.tone==='critical'?'#ee9c88':focused?'#efd68f':g.tone==='wounded'?'#d5bc83':'#abb7b1';
  this.rect(g.x,g.y,g.w,g.h,'#07131c');this.rect(g.x+1,g.y+1,g.w-2,g.h-2,border);this.rect(g.x+2,g.y+2,g.w-4,3,'#24343c');
  if(g.fill)shades.forEach((shade,i)=>this.rect(g.x+2,g.y+2+i,g.fill,1,shade));
  // Team end caps stay distinct from the green / amber / red health fill.
  this.rect(g.x,g.y+2,1,3,teamColor(u.team));this.rect(g.x+g.w-1,g.y+2,1,3,teamColor(u.team));c.restore();
 }
 interactionAtCursor(){return (this.engine.s.map.interactions||[]).find(i=>i.x===this.cursor.x&&i.y===this.cursor.y&&this.engine.visible(i.x,i.y));}
 interactionDescription(i){return i.pillaged?'Saqueado':i.used&&!i.repeat?(i.type==='door'?'Puerta abierta':i.type==='chest'?'Cofre abierto':'Ya visitado'):{shop:'Comprar / vender',arena:'Coliseo de práctica',door:'Requiere llave o ganzúa',chest:'Requiere llave o ganzúa',house:'Visitar y conversar',village:'Visitar el poblado'}[i.type]||'Interactuar';}
 alpha(hex,a){const s=/^#[0-9a-f]{6}$/i.test(hex)?hex:"#202020";return "rgba("+parseInt(s.slice(1,3),16)+","+parseInt(s.slice(3,5),16)+","+parseInt(s.slice(5,7),16)+","+a+")";}
 drawSidebar(){
  const e=this.engine,s=e.s,w=this.canvas.width,h=this.canvas.height,x=w-288,u=this.selected(),busy=s.presentations.length||s.queue.length||s.team!==1||s.result;
  this.panel(x,102,264,h-164);
  if(u){this.text(u.name,x+16,132,22,palette.paper,"left","Georgia, serif");this.text(e.cls(u).name+" · Nv "+u.level+" · EXP "+u.exp,x+16,161,13,palette.muted);this.sprite(u,x+216,205,1,1,0);this.text("PV "+u.hp+" / "+e.value(u,"health"),x+16,191,17,teamColor(u.team));this.rect(x+16,212,232,7,"#0b1a23");this.rect(x+16,212,232*u.hp/e.value(u,"health"),7,teamColor(u.team));
   this.text("MOV "+Math.max(0,e.value(u,"move")-u.moved)+"   FUE "+e.value(u,"power")+"   MAG "+e.value(u,"magic"),x+16,239,13,palette.muted);
   this.text(this.mode!=="move"?"Elige un objetivo: "+this.mode:e.weapon(u)?e.weapon(u).name:"Sin arma equipada",x+16,263,13,palette.gold);
   let y=288;const action=(label,fn,enabled)=>{this.button(label,x+14,y,236,fn,enabled!==false&&!busy);y+=38;};
   if(!u.canto){action("Atacar",()=>{this.mode="attack";},!!e.weapon(u)&&!e.weapon(u).staff);action("Inventario y habilidades",()=>this.menu={type:"inventory",unit:u.id});if(e.contextActions(u).length)action("Acciones cercanas",()=>this.menu={type:"allies",unit:u.id});
    const interaction=e.availableInteractions(u)[0];if(interaction)action(interaction.name||"Interactuar",()=>e.interact(u,interaction.id));
    if(s.objective==="seize"&&(s.map.goals||[]).some(p=>T.distance(p,u)===0))action("Conquistar",()=>e.seize(u));
   }else this.text("Puedes usar el movimiento restante.",x+16,y,13,palette.gold);
   action("Esperar",()=>{e.waitUnit(u);s.selected=null;});
   if(s.moveOrigin&&!u.committed)action("Deshacer movimiento",()=>e.undoMove(u));
  }else{
   this.text("ESTADO DE MISIÓN",x+16,131,14,palette.gold);this.wrap("Protege a "+s.protectedIds.map(id=>{const v=e.unit(id);return v?v.name:id;}).join(", ")+".",x+16,164,230,16,23);
   this.text("Aliados disponibles",x+16,229,14,palette.muted);this.text(s.units.filter(u=>u.team===1&&T.alive(u)&&!u.acted&&!u.carrier).length,x+229,230,24,palette.blue,"right");
   this.text("Enemigos visibles",x+16,267,14,palette.muted);this.text(s.units.filter(u=>u.team===2&&T.alive(u)&&e.visible(u.x,u.y)).length,x+229,268,24,palette.red,"right");
   this.wrap("Clic: seleccionar / mover\nEnter: confirmar\nEsc: cancelar\nFlechas: mover cursor",x+16,321,230,14,26);
  }
  const by=h-178;this.button("Menú",x+14,by,112,()=>this.menu={type:"system"},!busy);this.button("Fin de fase",x+134,by,116,()=>e.endPhase(),!busy);
 }
 drawDialogue(p){
  const w=this.canvas.width,h=this.canvas.height,x=44,y=h-221,e=this.engine,u=e.unit(p.unit),width=w-88;
  this.rect(0,0,w,h,"rgba(4,15,23,.32)");this.panel(x,y,width,168);if(u&&!(T.Graphics&&T.Graphics.face(this,u,x+8,y+14,140,149))){const face=u.face&&this.image(u.face);if(face){const index=u.faceIndex||0;this.ctx.drawImage(this.recolored(face,u,false),index%4*144,Math.floor(index/4)*144,144,144,x+8,y+20,144,144);}else this.sprite(u,x+83,y+146,2.25,1,0);}
  const tx=x+(u?157:25);this.panel(tx,y-32,245,37);this.text(p.name||u&&u.name||"",tx+14,y-13,20,palette.gold,"left","Georgia, serif");
  const lines=this.wrap(p.text,tx,-10000,width-(tx-x)-30,18,28),page=p.page||0,total=Math.ceil(lines.length/4);lines.slice(page*4,page*4+4).forEach((line,i)=>this.text(line,tx,y+34+i*27,18));
  this.text((page+1)+" / "+Math.max(1,total)+"   ↠",x+width-25,y+147,14,palette.gold,"right");p.pages=total;
 }
 advanceDialogue(p){p.page=(p.page||0)+1;if(p.page>=Math.max(1,p.pages||1))this.engine.s.presentations.shift();}
 drawCombat(p){
  const e=this.engine,w=this.canvas.width,h=this.canvas.height,x=60,y=95,bw=w-120,bh=h-175,a=e.unit(p.a),b=e.unit(p.b),timing=this.combatTime(p),step=timing.index,strike=timing.strike,phase=timing.phase,impact=timing.impact;
  this.rect(0,0,w,h,"rgba(2,11,19,.84)");this.panel(x,y,bw,bh);
  this.text(a.name,x+30,y+32,24,palette.blue,"left","Georgia, serif");this.text(b.name,x+bw-30,y+32,24,palette.red,"right","Georgia, serif");this.line(x+25,y+59,bw-50);
  const gradient=this.ctx.createLinearGradient(0,y+66,0,y+bh-125);gradient.addColorStop(0,"#3b6570");gradient.addColorStop(.65,"#849282");gradient.addColorStop(.66,"#627158");gradient.addColorStop(1,"#1f403b");this.rect(x+16,y+66,bw-32,bh-197,gradient);
  if(T.Graphics)T.Graphics.battleBackground(this,x+16,y+66,bw-32,bh-197);
  const ground=y+bh-143,left=x+bw*.28,right=x+bw*.72;
  let hpA=p.start[a.id],hpB=p.start[b.id];
  p.strikes.forEach((s,i)=>{if(i<step||i===step&&phase>=impact){if(s.target===a.id)hpA=s.hp;else hpB=s.hp;if(s.attacker===a.id)hpA=s.attackerHp;else hpB=s.attackerHp;}});
  const lunge=strike&&!timing.spell?Math.sin(Math.min(1,phase/26)*Math.PI)*35:0,dodge=this.spellDodge(timing);
  this.ctx.save();this.ctx.beginPath();this.ctx.rect(x+16,y+66,bw-32,bh-197);this.ctx.clip();
  this.drawSpellBackdrop(timing,x+16,y+66,bw-32,bh-197,false);
  if(T.Graphics){T.Graphics.platform(this,left,ground,3,false);T.Graphics.platform(this,right,ground,3,true);this.resourceClip=strike?{unit:e.unit(strike.attacker),clip:T.Graphics.clip(this,e.unit(strike.attacker),strike.critical?"critical":strike.hit?"normal":"miss",strike)}:null;}
  this.sprite(a,left+(strike&&strike.attacker===a.id?lunge:0)-(strike&&strike.target===a.id?dodge:0),ground,3,1,strike&&strike.attacker===a.id?timing.pose:0,!!strike&&strike.target===a.id&&strike.hit&&phase>=impact&&phase<impact+7);
  this.sprite(b,right-(strike&&strike.attacker===b.id?lunge:0)+(strike&&strike.target===b.id?dodge:0),ground,3,-1,strike&&strike.attacker===b.id?timing.pose:0,!!strike&&strike.target===b.id&&strike.hit&&phase>=impact&&phase<impact+7);
  this.resourceClip=null;
  this.drawSpell(timing,strike&&strike.attacker===a.id?left:right,strike&&strike.target===a.id?left:right,ground,3);
  this.drawSpellBackdrop(timing,x+16,y+66,bw-32,bh-197,true,strike&&strike.target===a.id?-1:1);
  if(strike&&phase>=impact&&phase<impact+18){const hitX=strike.target===a.id?left:right;this.text(strike.hit?(strike.critical?"CRÍTICO ":"")+strike.damage:"FALLO",hitX,ground-155-(phase-impact),strike.critical?30:25,strike.hit?palette.paper:palette.gold,"center");}
  this.ctx.restore();
  const bar=(u,hp,bx,color)=>{this.text("PV "+hp+" / "+e.value(u,"health"),bx,y+bh-94,19,color);this.rect(bx,y+bh-71,bw*.37,12,"#0a1d25",palette.gold);this.rect(bx+2,y+bh-69,(bw*.37-4)*hp/e.value(u,"health"),8,color);};bar(a,hpA,x+30,palette.blue);bar(b,hpB,x+bw*.59,palette.red);
  this.text(strike?strike.weapon+(strike.label?" · "+strike.label:""):"",x+bw/2,y+bh-34,15,palette.gold,"center");this.text("Enter / clic: acelerar",x+bw-20,y+bh-12,11,palette.muted,"right");
 }
 drawMenu(){
  const e=this.engine,s=e.s,m=this.menu,w=this.canvas.width,h=this.canvas.height,x=w/2-285,y=95,u=e.unit(m.unit)||this.selected()||s.units.find(u=>u.team===1);
  this.rect(0,0,w,h,"rgba(2,11,19,.78)");this.panel(x,y,570,h-160);let row=y+81;
  const title={system:"Cuaderno de campaña",inventory:"Inventario",allies:"Acciones con aliados",forecast:"Previsión de combate",shop:"Comerciante",arena:"Círculo de práctica",convoy:"Almacén",status:"Estado de unidad",trade:"Intercambiar",steal:"Robar"}[m.type]||"Menú";
  this.text(title,x+24,y+34,25,palette.gold,"left","Georgia, serif");this.button("Cerrar",x+452,y+19,95,()=>this.menu=null);this.line(x+24,y+60,522);
  const option=(label,fn,enabled)=>{this.button(label,x+24,row,522,fn,enabled);row+=39;};
  if(m.type==="system"){
   option("Animaciones · clases y personajes",()=>{this.menu=null;this.openGallery();});option("Taller · crear una clase",()=>{this.menu=null;this.workshop();});option("Almacén",()=>this.menu={type:"convoy",unit:u&&u.id});option("Guardar partida",()=>{this.menu=null;this.openSave();});option(this.danger?"Ocultar alcance enemigo":"Mostrar alcance enemigo",()=>{this.danger=!this.danger;this.menu=null;});option("Condiciones de misión",()=>{this.menu=null;this.resultDismissed=false;if(!s.result)this.menu={type:"objectives"};});
  }else if(m.type==="objectives"){
   this.wrap("Victoria: "+s.objective+"\nDerrota: pérdida de "+s.protectedIds.map(id=>e.unit(id)?e.unit(id).name:id).join(", ")+".\nLímite de turnos: "+(s.map.turnLimit||"ninguno"),x+24,row,500,18,34);
  }else if(m.type==="forecast"){
   const a=e.unit(m.a),b=e.unit(m.b),fa=e.forecast(a,b),fb=e.counterForecast(b,a);this.text(a.name,x+35,row,22,palette.blue);this.text(b.name,x+535,row,22,palette.red,"right");row+=45;
   this.text("DAÑO       ACIERTO       CRÍTICO",x+285,row,16,palette.muted,"center");row+=35;this.text(fa.damage+" × "+fa.strikes+"           "+fa.hit+"%           "+fa.crit+"%",x+285,row,22,palette.blue,"center");row+=37;this.text(fb.can?fb.damage+" × "+fb.strikes+"           "+fb.hit+"%           "+fb.crit+"%":"Sin contraataque",x+285,row,22,palette.red,"center");row+=60;
   option("Confirmar ataque",()=>{this.menu=null;e.combat(a,b,true);this.mode="move";if(a.acted)s.selected=null;});option("Elegir otro objetivo",()=>this.menu=null);
  }else if(m.type==="inventory"){
   u.inventory.forEach((i,slot)=>{const d=e.itemData(i);option((slot===u.equipped?"◆ ":"")+d.name+"  "+(d.uses?i.uses+" / "+d.uses:"∞"),()=>{
    if(i.kind==="weapon"&&!d.staff){T.assert(e.canEquip(u,i),"Rango o tipo de arma incompatible");u.equipped=slot;this.menu=null;this.mode="attack";}
    else{T.assert(["key","passive"].indexOf(d.effect)<0,"Se utiliza al interactuar en el mapa");this.itemSlot=slot;this.menu=null;this.mode="item";}
   });});this.wrap("Habilidades: "+u.skills.map(id=>(e.db.skills[id]||{}).name||id).join(", "),x+24,row+12,510,14,22);
  }else if(m.type==="allies"){
   e.contextActions(u).forEach(a=>option(a.label,()=>{this.mode=a.mode;this.menu=null;}));
  }else if(m.type==="shop"){
   const shop=s.map.interactions.find(i=>i.id===m.id);(shop.stock||[]).forEach((g,index)=>{const d=e.itemData(g),price=g.price===undefined?d.price:g.price;option("Comprar "+d.name+" · "+price+" G · "+(g.count<0?"∞":g.count),()=>e.buy(u,m.id,index),g.count!==0);});option("Vender objetos",()=>this.menu={type:"sell",unit:u.id,id:m.id});
  }else if(m.type==="sell")u.inventory.forEach((i,slot)=>option("Vender "+e.itemData(i).name,()=>e.sell(u,m.id,slot),!e.itemData(i).bound));
  else if(m.type==="arena"){
   this.wrap("Apuesta 100 G. Hasta tres intercambios. Victoria: recuperas 200 G. Derrota o retirada: pierdes la apuesta. La práctica nunca elimina a tu unidad.",x+24,row,510,17,27);row+=125;
   option("Participar",()=>{e.arena(u,100,3);this.menu=null;},s.gold>=100&&!!e.weapon(u)&&!e.weapon(u).staff);option("Retirarse sin apostar",()=>this.menu=null);
  }else if(m.type==="convoy"){
   this.text(u.name+" · "+s.convoy.length+" / "+s.options.convoy+" en almacén",x+24,row,15,palette.muted);row+=30;
   const page=m.page||0,rows=m.withdraw?s.convoy:u.inventory;rows.slice(page*6,page*6+6).forEach((i,k)=>option((m.withdraw?"Retirar ":"Depositar ")+e.itemData(i).name,()=>e.convoy(u,page*6+k,!m.withdraw)));
   option(m.withdraw?"Ver inventario de unidad":"Ver almacén",()=>{m.withdraw=!m.withdraw;m.page=0;});if(rows.length>6)option("Página siguiente",()=>m.page=((m.page||0)+1)%Math.ceil(rows.length/6));
  }else if(m.type==="trade"||m.type==="steal"){
   const v=e.unit(m.target);T.assert(v,"Selecciona una unidad");if(m.type==="trade"){u.inventory.forEach((i,k)=>option("Entregar "+e.itemData(i).name+" a "+v.name,()=>{e.trade(u,v,k,v.inventory.length);this.menu=null;}));}
   else v.inventory.forEach((i,k)=>option("Robar "+e.itemData(i).name,()=>{e.steal(u,v,k);this.menu=null;},i.kind==="item"));
  }else if(m.type==="status")T.stats.forEach(k=>{this.text(k+": "+e.value(u,k),x+24,row,16);row+=25;});
 }
 drawResult(){const s=this.engine.s,w=this.canvas.width,h=this.canvas.height,x=w/2-285,y=h/2-160;this.rect(0,0,w,h,"rgba(3,15,20,.75)");this.panel(x,y,570,300);this.text(s.result==="victory"?"MISIÓN CUMPLIDA":"MISIÓN PERDIDA",w/2,y+66,32,palette.gold,"center","Georgia, serif");this.text(s.map.title,w/2,y+115,18,palette.paper,"center");if(s.result==="victory"&&s.map.nextMapId)this.button("Continuar al siguiente capítulo",x+80,y+168,410,()=>this.next(s.map.nextMapId));this.button("Revisar el campo",x+80,y+215,410,()=>this.resultDismissed=true);}
 openGallery(){this.gallery={index:0,actor:false,speed:1,pause:false,side:1,distance:1,mode:"normal",tick:0};}
 drawGallery(){
  const g=this.gallery,e=this.engine,w=this.canvas.width,h=this.canvas.height,x=45,y=75,entries=g.actor?Object.values(e.db.actors):Object.values(e.db.classes);g.index=T.clamp(g.index,0,Math.max(0,entries.length-1));const entry=entries[g.index];if(!entry)return;const cls=g.actor?e.db.classes[entry.classId]:entry;
  const custom=e.s.units.find(u=>u.actorId===entry.id&&g.actor);const u=custom||{classId:cls.id,colors:entry.colors||{cloth:entry.color||"#61adcf",hair:"#392d35",skin:"#dfb797"}};
  this.rect(0,0,w,h,palette.ink);this.panel(x,y,w-90,h-135);this.text("ARCHIVO DE ANIMACIONES",x+24,y+32,25,palette.gold,"left","Georgia, serif");this.button("Volver",w-177,y+17,105,()=>this.gallery=null);
  this.text((g.actor?"Personaje":"Clase")+" "+entry.id+" · "+(custom?custom.name:entry.name),w/2,y+108,26,palette.paper,"center");this.text((g.index+1)+" / "+entries.length,w/2,y+146,14,palette.muted,"center");
  const external=T.Graphics&&T.Graphics.clip(this,u,g.mode),animation=external||cls.animation||{};
  if(!g.pause)g.tick+=g.speed;const frames=animation.frames||[0,1,2,3,4,5],frame=Math.floor(g.tick*(animation.fps||12)/60)%frames.length;
  this.rect(x+25,y+180,w-140,255,"#34555a");if(T.Graphics)T.Graphics.battleBackground(this,x+25,y+180,w-140,255);this.line(x+25,y+403,w-140,palette.gold);this.resourceClip=external?{unit:u,clip:external}:null;this.sprite(u,w/2-135*g.distance/1.5,y+403,g.mode==="critical"?4.7:4,g.side,frame,false);this.resourceClip=null;
  const dummy={classId:2,colors:{cloth:"#bf767c",hair:"#413640",skin:"#dfb797"}};this.sprite(dummy,w/2+170,y+403,3.5,-g.side,0,g.mode!=="miss"&&frame===(animation.impact||3));
  this.text("Fotograma "+frame+" · impacto "+(animation.impact||3)+" · "+g.speed+"×",w/2,y+455,15,palette.muted,"center");
  const by=h-112;this.button("Anterior",x+20,by,100,()=>g.index=(g.index-1+entries.length)%entries.length);this.button("Siguiente",x+128,by,100,()=>g.index=(g.index+1)%entries.length);this.button(g.actor?"Ver clases":"Ver personajes",x+236,by,143,()=>{g.actor=!g.actor;g.index=0;});this.button(g.pause?"Reproducir":"Pausar",x+387,by,109,()=>g.pause=!g.pause);this.button("Velocidad",x+504,by,100,()=>g.speed=g.speed===2?.5:g.speed*2);this.button("Girar",x+612,by,75,()=>g.side*=-1);this.button(g.mode,x+695,by,97,()=>g.mode=g.mode==="normal"?"critical":g.mode==="critical"?"miss":"normal");this.button("Taller",x+800,by,100,()=>this.workshop(cls));
 }
 formShell(title){
  if(this.form)this.form.remove();const wrap=document.createElement("div");wrap.style.cssText="position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#061820dc;color:#f0ebda;font:16px Arial;";
  const form=document.createElement("form");form.style.cssText="width:min(600px,88vw);max-height:84vh;overflow:auto;background:#132c34;border:1px solid #c9af71;padding:26px;box-shadow:0 20px 70px #0009";
  const heading=document.createElement("h2");heading.textContent=title;heading.style.cssText="font:26px Georgia;color:#c9af71;margin:0 0 22px";form.appendChild(heading);wrap.appendChild(form);document.body.appendChild(wrap);this.form=wrap;
  const note=document.createElement("p");note.style.cssText="color:#f4a2a2;font-size:14px";
  const add=(label,type,value,options)=>{const row=document.createElement("label");row.style.cssText="display:grid;grid-template-columns:1fr 1.3fr;gap:16px;margin:13px 0;align-items:center";const text=document.createElement("span");text.textContent=label;row.appendChild(text);const input=document.createElement(options?"select":"input");if(options)options.forEach(o=>{const op=document.createElement("option");op.value=o.value;op.textContent=o.label;input.appendChild(op);});else input.type=type;input.setAttribute("aria-label",label);input.value=value===undefined?"":value;input.style.cssText="min-width:0;padding:9px;background:#233f49;color:#f4eedc;border:1px solid #748177;";row.appendChild(input);form.appendChild(row);return input;};
  const button=(label,fn)=>{const button=document.createElement("button");button.type="button";button.textContent=label;button.style.cssText="padding:12px 17px;margin:14px 10px 0 0;background:#c9af71;color:#112730;border:0;cursor:pointer";button.onclick=()=>{try{fn();note.textContent="";}catch(e){note.textContent=e.message;}};form.appendChild(button);return button;};
  form.onsubmit=e=>e.preventDefault();form.appendChild(note);return {form,add,button,note,close:()=>{wrap.remove();this.form=null;}};
 }
 creator(u){
  T.assert(u,"No existe la unidad protagonista");const e=this.engine,f=this.formShell("Capítulo "+e.s.map.id+" · Tu protagonista"),name=f.add("Nombre","text",u.name),cls=f.add("Clase","",u.classId,Object.values(e.db.classes).map(c=>({value:c.id,label:c.name})));
  name.maxLength=24;
  const controls={};["cloth","hair","skin"].forEach(k=>{const label={cloth:"Vestimenta",hair:"Cabello",skin:"Piel"}[k];controls[k]=f.add(label+" RGB","color",u.colors[k]);});
  const preview=document.createElement("canvas");preview.width=160;preview.height=120;preview.style.cssText="display:block;margin:10px auto;background:#294852;image-rendering:pixelated";f.form.appendChild(preview);
  const repaint=()=>{const old=this.ctx;this.ctx=preview.getContext("2d");this.ctx.clearRect(0,0,160,120);this.sprite({classId:Number(cls.value),colors:Object.fromEntries(Object.keys(controls).map(k=>[k,controls[k].value]))},80,104,2,1,0);this.ctx=old;};Object.values(controls).concat([cls]).forEach(el=>el.oninput=repaint);repaint();
  f.button("Comenzar",()=>{
   const c=e.db.classes[Number(cls.value)];T.assert(c,"Clase inválida");u.name=name.value.trim()||"Ari";u.classId=c.id;u.stats=Object.assign({},u.stats,c.stats);u.growth=T.copy(c.growth);u.ranks=T.copy(c.ranks);u.skills=Array.from(new Set((c.skills||[]).concat((e.db.actors[u.actorId]||{}).skills||[])));u.inventory=e.protagonistInventory(u);u.colors=Object.fromEntries(Object.keys(controls).map(k=>[k,controls[k].value]));u.customColors=true;u.color=u.colors.cloth;u.hp=e.value(u,"health");e.autoEquip(u);e.s.creatorDone=true;e.rememberParty();f.close();
  });
 }
 async exportTemplate(cls){
  const canvas=document.createElement("canvas");canvas.width=384;canvas.height=64;const old=this.ctx;this.ctx=canvas.getContext("2d");this.originalExample=true;for(let i=0;i<6;i++)this.sprite({classId:1,colors:{cloth:"#61adcf",hair:"#392d35",skin:"#dfb797"}},i*64+27,57,1,1,i);this.ctx=old;this.originalExample=false;
  const blob=await new Promise(resolve=>canvas.toBlob(resolve)),data=new Uint8Array(await blob.arrayBuffer());const dataClass=T.copy(cls||this.engine.db.classes[1]);delete dataClass.art;dataClass.id=101;dataClass.name="Mi clase";dataClass.sprite="img/tactics/MiClase.png";dataClass.animation={frameWidth:64,frameHeight:64,columns:6,rows:1,frames:[0,1,2,3,4,5],impact:3,fps:12};
  download("Plantilla-clase.zip",T.zip({"MiClase.png":data,"MiClase.json":JSON.stringify(dataClass,null,2),"LEEME.txt":"Contenido MIT. Cada celda mide 64 x 64. Conserva fondo transparente. La figura mira a la derecha. Dibuja seis poses. El fotograma 3 marca el impacto. Importa JSON y PNG en el Taller para probar. Para MZ guarda la imagen en img/tactics y configura la clase en F9.\n"}));
 }
 workshop(selected){
  const e=this.engine,base=T.copy(selected||e.db.classes[1]),f=this.formShell("Taller de clases y animaciones"),id=f.add("ID nuevo","number",Math.max(100,...Object.keys(e.db.classes).map(Number))+1),name=f.add("Nombre","text","Mi clase"),image=f.add("Hoja PNG propia","file",""),json=f.add("Clase JSON opcional","file",""),fw=f.add("Ancho de celda","number",64),fh=f.add("Alto de celda","number",64),cols=f.add("Columnas","number",6),sequence=f.add("Secuencia (índices desde 0)","text","0,1,2,3,4,5"),impact=f.add("Posición de impacto","number",3),fps=f.add("Fotogramas / segundo","number",12);
  image.accept="image/png";json.accept=".json,application/json";let png=null,imported=base;
  image.onchange=()=>{const file=image.files[0];if(!file)return;if(file.size>8*1024*1024){f.note.textContent="Usa una imagen de menos de 8 MB.";return;}const reader=new FileReader();reader.onload=()=>png=reader.result;reader.readAsDataURL(file);};
  json.onchange=()=>{const file=json.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(reader.result);T.assert(d&&d.name&&d.stats&&Array.isArray(d.weaponTypes),"JSON de clase incompleto");imported=d;name.value=d.name;const a=d.animation||{};fw.value=a.frameWidth||64;fh.value=a.frameHeight||64;cols.value=a.columns||6;sequence.value=(a.frames||[0,1,2,3,4,5]).join(",");impact.value=a.impact||0;fps.value=a.fps||12;}catch(error){f.note.textContent=error.message;}};reader.readAsText(file);};
  f.button("Descargar ejemplo PNG + JSON",()=>this.exportTemplate(base));
  f.button("Añadir y previsualizar",()=>{
   const classId=Number(id.value),frames=sequence.value.split(",").map(Number),width=Number(fw.value),height=Number(fh.value),columns=Number(cols.value),rate=Number(fps.value),hit=Number(impact.value);
   T.assert(Number.isInteger(classId)&&classId>0&&!e.db.classes[classId],"Elige un ID entero que no exista");T.assert(frames.length&&frames.every(n=>Number.isInteger(n)&&n>=0)&&hit>=0&&hit<frames.length,"Secuencia o impacto inválidos");T.assert(width>0&&height>0&&columns>0&&rate>0,"Tamaño, columnas y velocidad deben ser positivos");
   const d=Object.assign({},imported,{id:classId,name:name.value.trim()||"Mi clase",sprite:png||imported.sprite||"",animation:{frameWidth:width,frameHeight:height,columns,frames,impact:hit,fps:rate}});
   if(d.sprite)delete d.art;
   e.db.classes[classId]=d;e.s.customClasses=e.s.customClasses||{};e.s.customClasses[classId]=T.copy(d);download("Clase-"+classId+".json",new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));f.close();this.openGallery();this.gallery.index=Object.values(e.db.classes).findIndex(c=>c.id===classId);
  });f.button("Volver",f.close);
 }
}
T.View=View;
})(typeof globalThis!=="undefined"?globalThis:this);

// ===== src/ui/02_Graphics.js =====
(function(root){
"use strict";
const T=root.Tactics,G=T.Graphics={};
G.pack=view=>view.engine.db.graphics;
G.spellEffect=function(view,spell,stage,progress,x,y,scale,facing,opacity,critical,ground,bounds){
 const p=G.pack(view),part=spell&&spell[stage],atlas=part&&p&&p.spells&&p.spells.atlases&&p.spells.atlases[part.atlas];if(!atlas||!Array.isArray(part.frames)||!part.frames.length||!Number.isFinite(progress)||!Number.isFinite(scale)||scale<=0)return false;
 const index=part.frames[Math.min(part.frames.length-1,Math.floor(T.clamp(progress,0,1)*part.frames.length))],r=atlas.rects&&atlas.rects[index],original=view.image(atlas.path);if(!r||!original||![r.x,r.y,r.w,r.h].every(Number.isFinite)||r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>original.width||r.y+r.h>original.height)return false;
 if((r.ox!==undefined&&!Number.isFinite(r.ox))||(r.oy!==undefined&&!Number.isFinite(r.oy)))return false;
 const key=atlas.path+':'+index+':'+(spell.tint||'')+':'+JSON.stringify(atlas.key||null),cache=view.spellImages||(view.spellImages={});let bitmap=cache[key];
 if(!bitmap){bitmap=document.createElement('canvas');bitmap.width=r.w;bitmap.height=r.h;const ctx=bitmap.getContext('2d');ctx.drawImage(original,r.x,r.y,r.w,r.h,0,0,r.w,r.h);const pixels=ctx.getImageData(0,0,bitmap.width,bitmap.height),data=pixels.data,tint=/^#[0-9a-f]{6}$/i.test(spell.tint||'')?parseInt(spell.tint.slice(1),16):null,keyColor=atlas.key==='corner'?Array.from(data.slice(data.length-4,data.length-1)):Array.isArray(atlas.key)?atlas.key:[0,128,255];
  for(let i=0;i<data.length;i+=4){if(data[i]===keyColor[0]&&data[i+1]===keyColor[1]&&data[i+2]===keyColor[2]){data[i+3]=0;continue;}if(tint!==null&&data[i+3]){const light=Math.max(data[i],data[i+1],data[i+2])/255;data[i]=(tint>>16&255)*light;data[i+1]=(tint>>8&255)*light;data[i+2]=(tint&255)*light;}}
  ctx.putImageData(pixels,0,0);cache[key]=bitmap;
 }
 const c=view.ctx,s=scale*(part.scale||1),ox=r.ox===undefined?r.w/2:r.ox,oy=r.oy===undefined?(part.anchor==='ground'?r.h:r.h/2):r.oy;c.save();c.globalAlpha=T.clamp(opacity,0,1);c.imageSmoothingEnabled=false;c.translate(x+(bounds&&facing<0?bounds.w:0),y);c.scale(part.mirror===false?1:facing,1);if(bounds)c.drawImage(bitmap,0,0,r.w,r.h,0,0,bounds.w,bounds.h);else c.drawImage(bitmap,0,0,r.w,r.h,-ox*s,-oy*s,r.w*s,r.h*s);c.restore();return true;
};
G.itemIconAsset=function(view,item){
 const pack=G.pack(view),icons=pack&&pack.itemIcons,d=item&&view.engine.itemData(item);if(!icons||!d)return null;
 const group=item.kind==='weapon'?'weapons':'items',exact=icons[group]&&icons[group][item.id];
 return exact||(item.kind==='weapon'?icons.categories&&icons.categories[d.staff?'staff':d.category]:icons.effects&&icons.effects[d.effect])||null;
};
G.itemIcon=function(view,item,x,y,size){
 const asset=G.itemIconAsset(view,item),image=asset&&view.image(asset.path),r=asset&&asset.rect;if(!image||!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>image.width||r[1]+r[3]>image.height||!Number.isFinite(size)||size<=0)return false;
 let bitmap=image;
 if(Array.isArray(asset.key)&&asset.key.length===3&&asset.key.every(Number.isFinite)){
  const key=asset.path+':'+asset.key.join(','),cache=view.iconImages||(view.iconImages={});bitmap=cache[key];
  if(!bitmap){bitmap=document.createElement('canvas');bitmap.width=image.width;bitmap.height=image.height;const ctx=bitmap.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height),data=pixels.data;
   for(let i=0;i<data.length;i+=4)if(data[i]===asset.key[0]&&data[i+1]===asset.key[1]&&data[i+2]===asset.key[2])data[i+3]=0;
   ctx.putImageData(pixels,0,0);cache[key]=bitmap;
  }
 }
 const c=view.ctx;c.save();c.imageSmoothingEnabled=false;c.drawImage(bitmap,r[0],r[1],r[2],r[3],Math.round(x),Math.round(y),size,size);c.restore();return true;
};
G.uiReady=function(view,names){const p=G.pack(view),ui=p&&p.ui;if(!ui)return false;let ready=true;names.forEach(name=>{const asset=ui[name];if(!asset||!view.image(asset.path))ready=false;});return ready;};
G.ui=function(view,name,x,y,w,h,flip){
 const p=G.pack(view),asset=p&&p.ui&&p.ui[name],image=asset&&view.image(asset.path);if(!image||!(w>0&&h>0))return false;
 const r=asset.rect||[0,0,image.width,image.height],c=view.ctx;c.save();c.imageSmoothingEnabled=true;c.translate(flip?x+w:x,y);if(flip)c.scale(-1,1);
 if(asset.border){
  const b=asset.border,scale=Math.min(1,w/r[2],h/r[3]),left=b[0]*scale,right=b[1]*scale,top=b[2]*scale,bottom=b[3]*scale;
  const sx=[r[0],r[0]+b[0],r[0]+r[2]-b[1]],sy=[r[1],r[1]+b[2],r[1]+r[3]-b[3]],sw=[b[0],r[2]-b[0]-b[1],b[1]],sh=[b[2],r[3]-b[2]-b[3],b[3]],dx=[0,left,w-right],dy=[0,top,h-bottom],dw=[left,w-left-right,right],dh=[top,h-top-bottom,bottom];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(sw[col]>0&&sh[row]>0&&dw[col]>0&&dh[row]>0)c.drawImage(image,sx[col],sy[row],sw[col],sh[row],dx[col],dy[row],dw[col],dh[row]);
 }else c.drawImage(image,r[0],r[1],r[2],r[3],0,0,w,h);
 c.restore();return true;
};
G.art=(view,u)=>{const p=G.pack(view),c=view.engine.db.classes[u.classId]||{};return p&&p.units&&p.units[c.art];};
G.clip=(view,u,mode)=>{const art=G.art(view,u),p=G.pack(view);return art&&p.clips&&p.clips[(art.clips||{})[mode||"normal"]||(art.clips||{}).normal];};
G.bitmap=function(view,path,u,flash,paletteMode){
 const original=view.image(path);if(!original)return null;const pack=G.pack(view),colors=u&&u.customColors?u.colors:null,team=paletteMode==="map"&&u?(u.acted?0:u.team):1;
 const id=path+":"+team+":"+JSON.stringify(colors)+":"+!!flash;view.resourceImages=view.resourceImages||{};if(view.resourceImages[id])return view.resourceImages[id];
 const canvas=document.createElement("canvas");canvas.width=original.width;canvas.height=original.height;const c=canvas.getContext("2d");c.drawImage(original,0,0);
 const im=c.getImageData(0,0,canvas.width,canvas.height),d=im.data;const key=d[3]>0&&d[0]<24&&d[1]<150&&d[2]>200?[d[0],d[1],d[2]]:null;
 const replacements={};if(pack.palette&&paletteMode==="map")pack.palette.source.forEach((rgb,i)=>{const to=(pack.palette.teams[team]||pack.palette.source)[i]||rgb;replacements[(rgb[0]<<16)|(rgb[1]<<8)|rgb[2]]=to;});
 for(let i=0;i<d.length;i+=4){if(key&&d[i]===key[0]&&d[i+1]===key[1]&&d[i+2]===key[2]){d[i+3]=0;continue;}if(!d[i+3])continue;
  if(flash){d[i]=255;d[i+1]=248;d[i+2]=230;continue;}
  const replacement=replacements[(d[i]<<16)|(d[i+1]<<8)|d[i+2]];if(replacement){d[i]=replacement[0];d[i+1]=replacement[1];d[i+2]=replacement[2];}
  if(colors){const blue=d[i+2]>d[i]*1.25&&d[i+2]>d[i+1]*1.1;if(blue&&colors.cloth){const value=parseInt(colors.cloth.slice(1),16),light=Math.max(d[i],d[i+1],d[i+2])/240;d[i]=Math.min(255,(value>>16&255)*light);d[i+1]=Math.min(255,(value>>8&255)*light);d[i+2]=Math.min(255,(value&255)*light);}}
 }
 c.putImageData(im,0,0);if(Object.keys(view.resourceImages).length>160)view.resourceImages={};view.resourceImages[id]=canvas;return canvas;
};
G.layer=function(view,image,rect,transform,x,y,scale,facing){
 if(!image||!rect)return;const c=view.ctx,s=scale*(transform.zoom===undefined?1:transform.zoom);
 c.save();c.translate(x+(transform.x||0)*scale*facing,y+(transform.y||0)*scale);c.scale(facing*(transform.mirror?-1:1)*s,s);c.rotate(-(transform.angle||0)*Math.PI/180);c.globalAlpha=transform.opacity===undefined?1:transform.opacity;c.globalCompositeOperation=transform.blend===1?"lighter":"source-over";
 c.imageSmoothingEnabled=false;c.drawImage(image,rect.x,rect.y,rect.w,rect.h,-rect.ox,-rect.oy,rect.w,rect.h);c.restore();
};
G.battle=function(view,u,x,y,scale,facing,pose,flash){
 if((view.engine.db.classes[u.classId]||{}).sprite)return false;
 const art=G.art(view,u);if(!art)return false;const pack=G.pack(view),chosen=view.resourceClip;
 const clip=chosen&&chosen.unit===u?chosen.clip:art.idleClip?pack.clips[art.idleClip]:null;
 if(clip){const frame=clip.frames[Math.max(0,Math.min(clip.frames.length-1,Math.floor(pose||0)))];
  (frame||[]).forEach(layer=>{const atlas=pack.atlases[layer.atlas];if(!atlas)return;const img=G.bitmap(view,atlas.path,u,flash,"battle");G.layer(view,img,atlas.rects[layer.rect],layer,x,y-24*scale,scale,facing);});
 }else{
  const idle=art.idle;if(!idle){if(art.map)G.map(view,u,x,y,16*scale,0,flash);return true;}const image=G.bitmap(view,idle.path,u,flash,"battle");if(!image)return true;
  const frame=Math.floor(view.frame/30)%Math.max(1,(idle.frames||[0]).length),index=(idle.frames||[0])[frame],columns=idle.columns||3;
  G.layer(view,image,{x:index%columns*192,y:Math.floor(index/columns)*192+4,w:192,h:188,ox:96,oy:116},{},x,y,scale,facing);
 }
 return true;
};
G.map=function(view,u,x,y,size,pose,flash){
 if(u.graphic)return false;
 const art=G.art(view,u);if(!art)return false;const moving=pose>0,entry=moving&&art.walk?art.walk:art.map;if(!entry)return true;
 const image=G.bitmap(view,entry.path,u,flash,"map");if(!image)return true;
 const scale=size/16,pattern=moving?Math.floor(pose)%4:[0,1,2,1][Math.floor(view.frame/16)%4],width=entry.width,height=entry.height;
 const direction=u.direction||2,row=moving?Math.max(0,Math.min(3,(direction-2)/2)):view.selected()===u?2:0;
 view.ctx.save();view.ctx.imageSmoothingEnabled=false;view.ctx.drawImage(image,pattern*width,row*height,width,height,x-width*scale/2,y-(entry.anchorY||height)*scale,width*scale,height*scale);view.ctx.restore();return true;
};
// Fit the visible bust, not the transparent margins of its sheet. Compose facial
// features before measuring so eyes and mouth keep their original alignment.
G.alphaBounds=function(data,w,h){
 if(!data||!Number.isInteger(w)||!Number.isInteger(h)||w<=0||h<=0||data.length<w*h*4)return null;
 let left=w,top=h,right=-1,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 return right<0?null:{x:left,y:top,w:right-left+1,h:bottom-top+1};
};
G.portraitFit=function(rect,x,y,w,h){
 if(!rect||![rect.w,rect.h,w,h].every(n=>Number.isFinite(n)&&n>0)||![x,y].every(Number.isFinite))return null;
 const scale=Math.min(w/rect.w,h/rect.h);return {x:x+(w-rect.w*scale)/2,y:y+h-rect.h*scale,w:rect.w*scale,h:rect.h*scale};
};
G.portraitFrame=function(view,image,rect,features){
 view.portraitFrames=view.portraitFrames||new WeakMap();let entries=view.portraitFrames.get(image);
 if(!entries){entries={};view.portraitFrames.set(image,entries);}const key=JSON.stringify([rect,features||[]]);if(entries[key])return entries[key];
 const canvas=document.createElement('canvas');canvas.width=rect.w;canvas.height=rect.h;const c=canvas.getContext('2d');c.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,rect.w,rect.h);
 (features||[]).forEach(f=>c.drawImage(image,f.sx,f.sy,f.w,f.h,f.x,f.y,f.w,f.h));
 return entries[key]={image:canvas,bounds:G.alphaBounds(c.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)};
};
G.drawPortrait=function(view,frame,x,y,w,h){
 const r=frame.bounds,d=G.portraitFit(r,x,y,w,h);if(!d)return;
 const c=view.ctx;c.save();c.imageSmoothingEnabled=false;c.drawImage(frame.image,r.x,r.y,r.w,r.h,d.x,d.y,d.w,d.h);c.restore();
};
G.face=function(view,u,x,y,w,h){
 if(u.face)return false;
 const p=G.pack(view),a=p&&p.faces&&(p.faces[u.faceKey||u.actorId]||p.faces.default);if(!a)return false;const img=G.bitmap(view,a.path,u,false,"face");if(!img)return true;
 G.drawPortrait(view,G.portraitFrame(view,img,{x:0,y:0,w:a.width,h:a.height},a.features),x,y,w,h);return true;
};
G.background=function(view,m){
 const pack=G.pack(view),back=pack&&pack.maps[view.engine.s.map.id];if(!back)return false;const img=view.image(back.path);if(!img)return true;const c=view.ctx;c.imageSmoothingEnabled=false;
 c.drawImage(img,view.offset.x*back.cell,view.offset.y*back.cell,m.cols*back.cell,m.rows*back.cell,m.x,m.y,m.cols*m.tile,m.rows*m.tile);return true;
};
// Native MZ event images: the editor owns their appearance, the commands own their behavior.
G.eventFrame=function(image,sheet,phase,tileWidth,tileHeight){
 if(!image||!sheet||!(sheet.width>0&&sheet.height>0))return null;
 if(image.tileId>0){const id=image.tileId,tw=tileWidth||48,th=tileHeight||48;if(!Number.isInteger(id)||id>=1024)return null;return {sx:(Math.floor(id/128)%2*8+id%8)*tw,sy:Math.floor(id%128/8)*th,sw:tw,sh:th,base:tw,object:true};}
 if(!image.characterName)return null;
 const name=image.characterName,big=/^[!$]*\$/.test(name),sw=sheet.width/(big?3:12),sh=sheet.height/(big?4:8),index=big?0:T.clamp(Number(image.characterIndex)||0,0,7),pattern=T.clamp(Number.isFinite(phase)?phase:Number(image.pattern)||0,0,2),row=[2,4,6,8].indexOf(image.direction);
 return {sx:(index%4*3+pattern)*sw,sy:(Math.floor(index/4)*4+Math.max(0,row))*sh,sw,sh,base:tileWidth||48,object:name.indexOf('!')===0};
};
G.events=function(view,m,above){
 const e=view.engine,t=m.tile,map=e.s.map;
 (map.events||[]).filter(event=>!e.unit(event.id)&&!(map.templates||{})[event.id]&&e.inside(event.x,event.y)&&e.visible(event.x,event.y)).sort((a,b)=>a.y-b.y||a.id-b.id).forEach(event=>{
  const page=e.eventPage(event),img=page&&page.image;if(!img||!!(page.priorityType===2)!==above)return;
  let path;if(img.tileId){const set=(e.db.tilesets||[])[map.tilesetId],name=set&&set.tilesetNames[5+Math.floor(img.tileId/256)];if(name)path='img/tilesets/'+name+'.png';}else if(img.characterName)path='img/characters/'+img.characterName+'.png';
  if(!path)return;const bitmap=view.image(path),frame=G.eventFrame(img,bitmap,page.stepAnime?[0,1,2,1][Math.floor(view.frame/16)%4]:undefined,map.tileWidth,map.tileHeight);if(!frame)return;
  const scale=t/frame.base,w=frame.sw*scale,h=frame.sh*scale,x=m.x+(event.x-view.offset.x+.5)*t-w/2,y=m.y+(event.y-view.offset.y+1)*t-h-(frame.object?0:6*scale);
  view.ctx.save();view.ctx.imageSmoothingEnabled=false;view.ctx.drawImage(bitmap,frame.sx,frame.sy,frame.sw,frame.sh,x,y,w,h);view.ctx.restore();
 });
};
G.battleBackground=function(view,x,y,w,h){const p=G.pack(view),src=p&&p.battleBackground;if(!src)return false;const image=view.image(src);if(image){view.ctx.imageSmoothingEnabled=false;view.ctx.drawImage(image,0,0,image.width,Math.min(image.height,160),x,y,w,h);}return true;};
G.platform=function(view,x,y,scale,right){const p=G.pack(view),src=p&&p.platform;if(!src)return;const image=G.bitmap(view,src,null,false,"platform");if(!image)return;const c=view.ctx;c.save();c.translate(x,y);c.scale(right?-scale:scale,scale);c.imageSmoothingEnabled=false;c.drawImage(image,-image.width/2,-15);c.restore();};
})(typeof globalThis!=="undefined"?globalThis:this);

// ===== src/ui/03_Presentation.js =====
(function(root){
"use strict";
const T=root.Tactics,V=T.View.prototype;
const C={bg:'#06151b',text:'#eee8d5',muted:'#b6c2c2',gold:'#d2b567',line:'#897b51',blue:'#62d7ed',red:'#e78e91',green:'#9de1b1'};
const color=u=>u&&u.team===2?C.red:u&&u.team===3?C.green:C.blue;
const number=n=>String(n).padStart(2,'0');
const base={update:V.update,chooseTile:V.chooseTile,key:V.key,click:V.click,drawMenu:V.drawMenu,drawMap:V.drawMap,sound:V.sound};
T.presentation={width:960,height:640,colors:C};
V.shape=function(x,y,w,h,cut){const c=this.ctx,k=Math.min(cut||9,h/3);c.beginPath();c.moveTo(x+k,y);c.lineTo(x+w-k,y);c.lineTo(x+w,y+k);c.lineTo(x+w,y+h-k);c.lineTo(x+w-k,y+h);c.lineTo(x+k,y+h);c.lineTo(x,y+h-k);c.lineTo(x,y+k);c.closePath();};
V.crest=function(x,y,r){const c=this.ctx;c.save();c.strokeStyle=C.gold;c.globalAlpha=.075;c.lineWidth=1;[.35,.68,1].forEach(k=>{c.beginPath();c.arc(x,y,r*k,0,Math.PI*2);c.stroke();});for(let i=0;i<8;i++){c.save();c.translate(x,y);c.rotate(i*Math.PI/4);c.beginPath();c.moveTo(0,-r*.4);c.lineTo(-r*.09,-r*.82);c.lineTo(0,-r*.98);c.lineTo(r*.09,-r*.82);c.closePath();c.stroke();c.restore();}c.beginPath();c.moveTo(x,y-r*.3);c.lineTo(x+r*.3,y);c.lineTo(x,y+r*.3);c.lineTo(x-r*.3,y);c.closePath();c.stroke();c.restore();};
V.panel=function(x,y,w,h,tone,seal){
 const c=this.ctx;c.save();this.shape(x,y,w,h);c.clip();const g=c.createLinearGradient(x,y,x+w,y+h);const stops=tone==='gold'?['#806b36','#34342a']:tone==='enemy'?['#442d37','#172128']:['#19343a','#081b22'];g.addColorStop(0,stops[0]);g.addColorStop(1,stops[1]);c.fillStyle=g;c.fillRect(x,y,w,h);c.fillStyle='rgba(220,230,208,.025)';for(let a=y+4;a<y+h;a+=7)c.fillRect(x,a,w,1);if(seal!==false&&w>130&&h>95)this.crest(x+w*.81,y+h*.56,Math.min(w,h)*.48);c.restore();
 c.save();c.lineWidth=1;c.strokeStyle=C.line;this.shape(x+.5,y+.5,w-1,h-1);c.stroke();c.strokeStyle='#446168';this.shape(x+4.5,y+4.5,w-9,h-9,6);c.stroke();c.strokeStyle=C.line;if(h>48)[[x+10,y+10,1,1],[x+w-10,y+10,-1,1],[x+10,y+h-10,1,-1],[x+w-10,y+h-10,-1,-1]].forEach(p=>{c.beginPath();c.moveTo(p[0]+p[2]*13,p[1]);c.lineTo(p[0],p[1]);c.lineTo(p[0],p[1]+p[3]*7);c.stroke();});c.restore();
};
V.fitText=function(text,x,y,width,size,color,align,font){const c=this.ctx;let value=String(text==null?'':text);c.font=size+'px '+(font||'Arial');if(c.measureText(value).width>width){let chars=Array.from(value);while(chars.length&&c.measureText(chars.join('')+'…').width>width)chars.pop();value=chars.join('')+'…';}this.text(value,x,y,size,color,align,font);};
V.textLines=function(text,width,size,font){
 this.ctx.font=size+'px '+(font||'Arial');const lines=[],measure=s=>this.ctx.measureText(s).width;
 String(text==null?'':text).split('\n').forEach(paragraph=>{let row='';paragraph.split(/\s+/).filter(Boolean).forEach(word=>{if(row&&measure(row+' '+word)>width){lines.push(row);row='';}if(measure(word)>width){Array.from(word).forEach(char=>{if(row&&measure(row+char)>width){lines.push(row);row='';}row+=char;});}else row+=(row?' ':'')+word;});lines.push(row);});return lines;
};
V.button=function(label,x,y,w,fn,enabled,accent){const active=enabled!==false,focused=active&&this.menu&&(this.menu.choice||0)===this.buttons.length;accent=accent||focused;this.panel(x,y,w,36,accent?'gold':undefined,false);this.ctx.save();this.ctx.globalAlpha=active?1:.4;this.fitText((accent?'◆ ':'')+label,x+12,y+18,w-24,16,C.text);this.ctx.restore();if(active)this.buttons.push({label,x,y,w,h:36,fn});};
V.assetPanel=function(name,x,y,w,h,tone){this.panel(x,y,w,h,tone);this.ctx.save();this.ctx.globalAlpha=.12;if(T.Graphics)T.Graphics.ui(this,name,x,y,w,h);this.ctx.restore();};
V.itemIcon=function(item,x,y,size){return !!(T.Graphics&&T.Graphics.itemIcon(this,item,x,y,size));};
V.hpBar=function(u,hp,x,y,w,h,previous){const max=Math.max(1,this.engine.value(u,'health')),ratio=T.clamp(hp/max,0,1);this.rect(x,y,w,h||11,'#07171d',C.line);if(previous>hp)this.rect(x+1,y+1,(w-2)*T.clamp(previous/max,0,1),(h||11)-2,'#b99b57');const g=this.ctx.createLinearGradient(x,y,x+w,y);g.addColorStop(0,color(u));g.addColorStop(1,u.team===2?'#984d60':'#218da3');this.rect(x+1,y+1,(w-2)*ratio,(h||11)-2,g);for(let i=1;i<5;i++)this.rect(x+w*i/5,y+1,1,(h||11)-2,'#ffffff22');};
V.portrait=function(u,x,y,w,h){
 if(!u)return;this.panel(x,y,w,h,u.team===2?'enemy':undefined,false);this.ctx.save();this.shape(x+5,y+5,w-10,h-10,4);this.ctx.clip();
 this.portraitArt(u,x+6,y+6,w-12,h-12);
 this.ctx.restore();
};
V.portraitArt=function(u,x,y,w,h){
 if(!u)return;if(T.Graphics&&T.Graphics.face(this,u,x,y,w,h))return;
 if(u.face){const image=this.image(u.face);if(image){const sw=image.width/4,sh=image.height/2,index=T.clamp(Number(u.faceIndex)||0,0,7),G=T.Graphics;G.drawPortrait(this,G.portraitFrame(this,this.recolored(image,u,false),{x:index%4*sw,y:Math.floor(index/4)*sh,w:sw,h:sh}),x,y,w,h);return;}}
 this.mapSprite(u,x+w/2,y+h,Math.min(54,w*.6),0,false);
};
V.skinGauge=function(u,hp,x,y,w,h,previous){
 const G=T.Graphics,max=this.engine.value(u,'health'),ratio=T.clamp(hp/max,0,1),side=u.team===2?2:u.team===3?3:1;
 this.rect(x,y,w,h,'#393544','#a79b7d');if(previous>hp)this.rect(x+1,y+1,(w-2)*T.clamp(previous/max,0,1),h-2,'#e0cc8a');
 this.ctx.save();this.ctx.beginPath();this.ctx.rect(x,y,w*ratio,h);this.ctx.clip();G.ui(this,'battleGauge'+side,x,y,w,h);this.ctx.restore();
};
V.skinDialogue=function(p){
 const G=T.Graphics;if(!G||!G.uiReady(this,['dialogue','dialogueName','dialogueNext']))return false;this.dialogueCard(p,true);return true;
};
V.dialogueCard=function(p,skin){
 const w=this.canvas.width,h=this.canvas.height,u=this.engine.unit(p.unit),x=u?238:28,width=w-x-24,top=h-222;
 this.rect(0,0,w,h,'rgba(0,9,14,.45)');if(skin)this.assetPanel('dialogue',x,top,width,198);else this.panel(x,top,width,198);
 if(skin)this.assetPanel('dialogueName',x+20,top-48,Math.min(340,width-40),43);else this.panel(x+20,top-48,Math.min(340,width-40),43,undefined,false);
 this.fitText(p.name||u&&u.name||'Información',x+40,top-26,Math.min(296,width-80),24,C.gold,'left','Georgia');
 if(u)this.portraitArt(u,16,top-64,224,250);
 const tx=x+34,lines=this.textLines(p.text,width-68,21,'Georgia'),total=Math.max(1,Math.ceil(lines.length/4)),page=T.clamp(p.page||0,0,total-1);p.pages=total;
 lines.slice(page*4,page*4+4).forEach((line,i)=>this.text(line,tx,top+37+i*29,21,C.text,'left','Georgia'));
 this.line(tx,top+159,width-68,'#8c855466');this.text((page+1)+' / '+total,tx,top+178,12,C.muted);this.text('Z / Enter / Clic',x+width-62,top+178,12,C.muted,'right');
 if(skin)T.Graphics.ui(this,'dialogueNext',x+width-47,top+165,25,25);else this.text('▸',x+width-35,top+178,24,C.gold);
};
V.skinBattleCard=function(u,v,hp,x,previous){
 const e=this.engine,G=T.Graphics,w=(this.canvas.width-84)/2,y=this.canvas.height-221,weapon=e.weapon(u),f=e.forecast(u,v),side=u.team===2?2:u.team===3?3:1;
 this.assetPanel('battlePanel',x,y,w,184,u.team===2?'enemy':undefined);G.ui(this,'battleName'+side,x+4,y+3,w-8,44);this.fitText(weapon?weapon.name:'Sin arma',x+22,y+26,w-44,20,C.text,'left','Georgia');this.portraitArt(u,x+12,y+55,92,114);
 this.fitText(e.cls(u).name,x+118,y+70,w-136,14,C.muted);this.text('PV',x+118,y+94,11,C.muted);this.text(hp+' / '+e.value(u,'health'),x+w-18,y+94,29,C.text,'right','Georgia');this.skinGauge(u,hp,x+118,y+112,w-136,14,previous);
 ['DAÑO','ACIERTO','CRÍTICO'].forEach((label,i)=>this.text(label,x+118+i*(w-130)/3,y+146,10,C.gold));const values=f.can?[f.damage+' × '+f.strikes,f.hit+'%',f.crit+'%']:['—','—','—'];values.forEach((value,i)=>this.text(value,x+118+i*(w-130)/3,y+169,22,C.text,'left','Georgia'));
};
V.skinForecast=function(m){
 const G=T.Graphics;if(!G||!G.uiReady(this,['battlePanel','battleName1','battleName2','battleName3','battleGauge1','battleGauge2','battleGauge3']))return false;
 const e=this.engine,x=this.canvas.width-192,y=86,h=this.canvas.height-160,w=180,a=e.unit(m.a),b=e.unit(m.b);this.panel(x,y,w,h);this.text('PREVISIÓN',x+w/2,y+21,16,C.gold,'center','Georgia');
 const row=(u,v,top)=>{const f=u===b?e.counterForecast(u,v):e.forecast(u,v),weapon=e.weapon(u),side=u.team===2?2:u.team===3?3:1;this.assetPanel('battlePanel',x+7,top,w-14,169,u.team===2?'enemy':undefined);G.ui(this,'battleName'+side,x+8,top+2,w-16,33);this.fitText(u.name,x+18,top+18,w-36,16,C.text,'left','Georgia');this.portraitArt(u,x+17,top+39,46,48);this.text(u.hp+' / '+e.value(u,'health'),x+w-18,top+53,20,C.text,'right','Georgia');this.skinGauge(u,u.hp,x+74,top+72,w-94,8);this.fitText(weapon?weapon.name:'Sin arma',x+17,top+101,w-34,13,C.gold);['DAÑO','ACIERTO','CRÍT.'].forEach((label,i)=>this.text(label,x+37+i*52,top+121,9,C.muted,'center'));const values=f.can?[f.damage+'×'+f.strikes,f.hit+'%',f.crit+'%']:['—','—','—'];values.forEach((value,i)=>this.text(value,x+37+i*52,top+141,18,C.text,'center','Georgia'));if(!f.can)this.text('Sin contraataque',x+w/2,top+158,10,C.muted,'center');};
 row(a,b,y+36);row(b,a,y+213);this.button('Atacar',x+13,y+h-78,154,()=>{this.menu=null;this.actionUnit=null;e.combat(a,b,true);this.mode='move';if(a.acted)e.s.selected=null;},true,true);this.button('Cancelar',x+13,y+h-37,154,()=>this.menu=null);return true;
};
V.drawPreparation=function(){
 const e=this.engine,s=e.s,p=s.preparation,w=this.canvas.width,h=this.canvas.height,x=w-192,m=this.mapMetrics(),keys=Object.keys(s.roster).filter(k=>s.roster[k].hp>0),selected=p.selectedKey&&(e.deploymentMember(p.selectedKey)||s.roster[p.selectedKey]);
 this.panel(12,10,w-24,62,undefined,false);this.text('PREPARACIÓN · '+s.map.title,28,33,22,C.gold,'left','Georgia');this.text(s.units.filter(u=>u.team===1).length+' / '+p.slots.length+' desplegados · '+keys.length+' reclutas',28,56,13,C.muted);this.button('Guardar',w-158,23,130,()=>this.openSave());
 this.panel(m.x-2,m.y-2,m.w+4,m.h+4,undefined,false);this.drawMap();
 this.ctx.save();this.ctx.beginPath();this.ctx.rect(m.x,m.y,m.w,m.h);this.ctx.clip();p.slots.forEach((slot,i)=>{const px=m.x+(slot.x-this.offset.x)*m.tile,py=m.y+(slot.y-this.offset.y)*m.tile,u=e.at(slot.x,slot.y),chosen=u&&u.rosterKey===p.selectedKey;this.rect(px+1,py+1,m.tile-2,m.tile-2,chosen?'rgba(221,187,92,.16)':'rgba(72,193,242,.12)',chosen?C.gold:C.blue);this.text(i+1,px+5,py+7,10,chosen?C.gold:C.text);});this.ctx.restore();
 this.panel(x,86,180,h-160);this.text('RECLUTAS',x+90,104,15,C.gold,'center');const pages=Math.max(1,Math.ceil(keys.length/5)),page=T.clamp(this.preparationPage||0,0,pages-1);this.preparationPage=page;
 keys.slice(page*5,page*5+5).forEach((key,i)=>{const u=e.deploymentMember(key)||s.roster[key],active=!!e.deploymentMember(key),y=120+i*46;this.button(u.name,x+9,y,162,()=>{p.selectedKey=key;const unit=e.deploymentMember(key);if(unit){this.cursor={x:unit.x,y:unit.y};this.focus(unit);}},true,key===p.selectedKey);this.text('Nv. '+u.level+' · EXP '+u.exp+' · '+(active?'En mapa':'Reserva'),x+18,y+40,10,C.muted);});
 if(pages>1){this.button('Anterior',x+9,354,79,()=>this.preparationPage=(page+pages-1)%pages);this.button('Más',x+93,354,78,()=>this.preparationPage=(page+1)%pages);}
 if(selected){this.text(e.cls(selected).name,x+14,391,14,C.gold);this.text('PV '+selected.hp+' / '+e.value(selected,'health'),x+14,412,13,C.text);selected.inventory.slice(0,4).forEach((item,i)=>this.text((e.itemData(item)||{}).name||'—',x+14,433+i*15,12,C.muted));this.button('A reserva',x+9,490,162,()=>this.safe(()=>e.reserveMember(p.selectedKey)),!!e.deploymentMember(p.selectedKey)&&p.required.indexOf(p.selectedKey)<0);}
 this.button('Comenzar misión',x+9,h-111,162,()=>this.safe(()=>{e.beginMission();this.mode='move';this.actionUnit=null;this.cursor={x:(e.unit(s.map.leader)||s.units[0]).x,y:(e.unit(s.map.leader)||s.units[0]).y};}),true,true);
 this.panel(12,h-62,w-24,52,undefined,false);this.text(this.error&&this.frame<(this.errorUntil||0)?this.error:'Elige un recluta y una casilla azul. Puedes intercambiar sus posiciones.',26,h-44,14,this.error&&this.frame<(this.errorUntil||0)?C.red:C.text);this.text('Clic / Enter: colocar    A: siguiente recluta    X: reserva    Espacio: comenzar',26,h-23,12,C.muted);
};
V.chooseDeployment=function(){const e=this.engine,p=e.s.preparation,index=p.slots.findIndex(s=>s.x===this.cursor.x&&s.y===this.cursor.y),unit=e.at(this.cursor.x,this.cursor.y);if(!p.selectedKey&&unit&&unit.team===1){p.selectedKey=unit.rosterKey;return;}T.assert(index>=0,'Elige una casilla azul de despliegue');T.assert(p.selectedKey,'Elige primero un recluta de la lista');e.setDeployment(p.selectedKey,index);};
V.mapMetrics=function(){const s=this.engine.s,w=this.canvas.width,h=this.canvas.height,area={x:12,y:86,w:w-224,h:h-160},tile=Math.min(40,Math.max(20,Math.floor(area.w/Math.min(23,s.map.width))));return {x:area.x,y:area.y,w:area.w,h:area.h,tile,cols:Math.floor(area.w/tile),rows:Math.floor(area.h/tile)};};
V.inspected=function(){const e=this.engine,u=e.at(this.cursor.x,this.cursor.y);return this.selected()||(u&&e.visible(u.x,u.y)?u:null)||e.unit(e.s.map.protagonist||e.s.map.leader||1)||e.s.units.find(v=>v.team===1&&T.alive(v));};
V.objectiveText=function(){const e=this.engine,s=e.s,bosses=s.units.filter(u=>u.boss&&u.team===2),protectedUnits=s.protectedIds.map(id=>e.unit(id)).filter(Boolean);let victory={eliminate:'Derrota a todos los enemigos.',boss:'Derrota al comandante enemigo: '+bosses.map(u=>u.name).join(', ')+'.',seize:'Conquista la casilla objetivo con '+((e.unit(s.map.leader)||{}).name||'el protagonista')+'.',survive:'Sobrevive hasta el turno '+s.map.surviveTurns+'.',manual:'Cumple el objetivo indicado por la misión.'}[s.objective];return {victory,defeat:protectedUnits.length?'Si cae '+protectedUnits.map(u=>u.name).join(' o ')+' en batalla.':'Si no quedan aliados en batalla.',bosses,protectedUnits};};
V.draw=function(){
 const c=this.ctx,e=this.engine,s=e.s,w=this.canvas.width,h=this.canvas.height;this.buttons=[];c.globalAlpha=1;c.globalCompositeOperation='source-over';this.rect(0,0,w,h,C.bg);
 if(this.gallery){this.drawGallery();return;}
 if(s.preparation){this.drawPreparation();return;}
 this.panel(12,10,w-224,62,undefined,false);this.text('CAPÍTULO '+(s.map.id===1?'I':s.map.id===2?'II':s.map.id),28,25,10,C.gold);this.text(s.map.title,28,49,25,C.text,'left','Georgia');this.text('TURNO '+number(s.turn),w-480,25,12,C.gold);this.text(s.team===1?'Fase aliada':s.team===2?'Fase enemiga':'Fase independiente',w-480,48,15,color({team:s.team}));
 const busy=!!(s.presentations.length||s.queue.length||s.team!==1||s.result);this.button('Objetivo',w-334,24,110,()=>this.menu={type:'objectives'},!busy);this.panel(w-192,10,180,62,undefined,false);this.button('Menú',w-174,24,144,()=>this.menu={type:'system'},!busy);
 const m=this.mapMetrics();this.panel(m.x-2,m.y-2,m.w+4,m.h+4,undefined,false);this.drawMap();this.drawSidebar();
 this.panel(12,h-62,w-24,52,undefined,false);const p=s.presentations[0],err=this.error&&this.frame<(this.errorUntil||0);const help=p&&p.type==='move'?'En movimiento…':this.mode==='attack'?'Elige un objetivo · Consulta el daño y los posibles contraataques':this.mode!=='move'?'Elige una casilla verde válida · Esc para cancelar':this.actionUnit?'Elige una acción para esta unidad.':this.selected()?(e.conversationTargets(this.selected()).length?'Azul: movimiento · Rojo: ataque · Verde: conversación (acércate para hablar).':'Azul: movimiento · Rojo: alcance de ataque.'):'Selecciona una unidad aliada para comenzar.';
 const location=this.interactionAtCursor();this.text(err?this.error:location&&!busy?(location.name||{shop:'Tienda',arena:'Coliseo',chest:'Cofre',door:'Puerta',house:'Casa',village:'Poblado'}[location.type]||'Interacción')+' · '+this.interactionDescription(location):help,26,h-45,13,err?C.red:C.text);this.text('Z / Enter  Aceptar     Esc  Menú     A  Siguiente unidad     S  Estado     C  Peligro',26,h-23,11,C.muted);
 if(this.actionUnit&&!busy&&!this.menu&&!this.gallery&&this.mode==='move')this.drawActions();
 if(p&&p.type==='combat'){this.buttons=[];this.drawCombat(p);}if(p&&p.type==='dialogue'){this.buttons=[];this.drawDialogue(p);}if(this.menu){this.buttons=[];this.drawMenu();}if(this.gallery){this.buttons=[];this.drawGallery();}
 if(s.result&&!s.queue.length&&!s.presentations.length&&!this.menu&&!this.gallery&&!this.resultDismissed){this.buttons=[];this.drawResult();}
};
V.drawSidebar=function(){
 if(this.menu&&this.menu.type==='forecast')return;
 const e=this.engine,s=e.s,x=this.canvas.width-192,y=86,w=180,h=this.canvas.height-160,u=this.inspected();this.panel(x,y,w,h);
 if(u){const weapon=e.weapon(u),i=u.inventory[u.equipped],moving=s.presentations.some(p=>p.type==='move'&&p.id===u.id);
  this.text(u.id===(s.map.protagonist||1)?'PROTAGONISTA':u.team===1?'ALIADO':u.team===2?'ENEMIGO':'INDEPENDIENTE',x+12,y+20,10,color(u));this.fitText(u.name,x+12,y+44,w-24,20,C.text,'left','Georgia');this.fitText(e.cls(u).name,x+12,y+69,w-24,13,C.muted);
  this.portrait(u,x+32,y+92,116,112);this.text('NV. '+u.level,x+12,y+226,12,C.gold);this.text('EXP '+u.exp,x+w-12,y+226,12,C.muted,'right');
  this.text('PV',x+12,y+253,11,C.muted);this.text(u.hp+' / '+e.value(u,'health'),x+w-14,y+255,27,C.text,'right','Georgia');this.hpBar(u,u.hp,x+12,y+270,w-24,11);
  const icon=weapon&&this.itemIcon(i,x+12,y+296,16);this.fitText(weapon?weapon.name:'Sin arma',x+(icon?36:12),y+306,w-(icon?48:24),16,C.gold,'left','Georgia');this.text('Usos '+(i&&weapon?i.uses:'—')+'  ·  Mov '+Math.max(0,e.value(u,'move')-u.moved),x+12,y+329,12,C.muted);this.text(moving?'En movimiento':u.acted?'Acción terminada':'Listo para actuar',x+12,y+355,12,moving?C.gold:u.acted?C.muted:C.green);
 }
 const p=u||this.cursor,terrain=e.terrain(p.x,p.y),location=this.interactionAtCursor();this.line(x+12,y+h-91,w-24,'#557075');const name=location?location.name||{shop:'Tienda',arena:'Coliseo',chest:'Cofre',door:'Puerta',house:'Casa',village:'Poblado'}[location.type]:terrain.name;this.text(name.length>20?name.slice(0,19)+'…':name,x+12,y+h-72,location?13:16,C.gold,'left','Georgia');this.text(location?this.interactionDescription(location):'Def '+(terrain.defense||0)+'   Eva '+(terrain.avoid||0),x+12,y+h-49,location?10:12,C.muted);this.text('ORO',x+12,y+h-16,10,C.muted);this.text(s.gold+' G',x+w-12,y+h-17,20,C.gold,'right','Georgia');
};
V.drawActions=function(){const e=this.engine,s=e.s,u=e.unit(this.actionUnit);if(!u||u.acted){this.actionUnit=null;return;}const actions=[];const add=(label,fn,enabled)=>actions.push({label,fn,enabled});
 if(u.actionLock==='take')e.contextActions(u).forEach(a=>add(a.label,()=>{this.mode=a.mode;this.actionUnit=null;}));
 else if(!u.canto){if(e.s.units.some(v=>T.alive(v)&&!v.carrier&&!e.allies(u,v)&&e.visible(v.x,v.y)&&e.forecast(u,v).can))add('Atacar',()=>{this.mode='attack';this.actionUnit=null;});add('Objetos',()=>{this.menu={type:'inventory',unit:u.id};this.actionUnit=null;});e.contextActions(u).forEach(a=>add(a.label,()=>{this.mode=a.mode;this.actionUnit=null;}));e.availableInteractions(u).forEach(i=>add(i.name||'Interactuar',()=>{e.interact(u,i.id);this.actionUnit=null;}));if(s.objective==='seize'&&(!s.map.leader||s.map.leader===u.id)&&(s.map.goals||[]).some(p=>T.distance(p,u)===0))add('Conquistar',()=>e.seize(u));}
 add('Esperar',()=>{e.waitUnit(u);s.selected=null;this.actionUnit=null;});if(s.moveOrigin&&!u.committed)add('Deshacer',()=>{e.undoMove(u);this.actionUnit=null;});
 const m=this.mapMetrics(),x=m.x+m.w-177,height=actions.length*39+16,y=Math.max(m.y+8,Math.min(m.y+(u.y-this.offset.y)*m.tile,this.canvas.height-76-height));this.panel(x,y,168,height);let activeIndex=0;const count=actions.filter(a=>a.enabled!==false).length;actions.forEach((a,i)=>this.button(a.label,x+9,y+8+i*39,150,a.fn,a.enabled,a.enabled!==false&&activeIndex++===(this.actionIndex||0)%Math.max(1,count))); 
};
V.chooseTile=function(){const e=this.engine,s=e.s,u=this.selected();if(s.preparation)return this.chooseDeployment();if(this.actionUnit)return;if(u&&u.x===this.cursor.x&&u.y===this.cursor.y&&this.mode==='move'&&!s.presentations.length){this.actionUnit=u.id;this.actionIndex=0;return;}return base.chooseTile.call(this);};
V.update=function(){const p=this.engine.s.presentations[0];base.update.call(this);if(p&&p.type==='move'&&this.engine.s.presentations.indexOf(p)<0&&!p.scripted&&this.engine.s.team===1){this.actionUnit=p.id;this.actionIndex=0;this.mode='move';}if(this.actionUnit&&(!this.engine.unit(this.actionUnit)||this.engine.unit(this.actionUnit).acted))this.actionUnit=null;};
V.key=function(k){
 if(this.form)return;if(k==='z'||k==='Z')k='Enter';const e=this.engine,s=e.s;
 if(s.preparation){if(k==='Escape')s.preparation.selectedKey=null;else if(k===' ')this.safe(()=>e.beginMission());else if(k==='Enter')this.safe(()=>this.chooseDeployment());else if(k.toLowerCase()==='x')this.safe(()=>e.reserveMember(s.preparation.selectedKey));else if(k.toLowerCase()==='a'){const keys=Object.keys(s.roster).filter(k=>s.roster[k].hp>0),index=keys.indexOf(s.preparation.selectedKey);s.preparation.selectedKey=keys[(index+1)%keys.length];this.preparationPage=Math.floor(((index+1)%keys.length)/5);}else if(/^Arrow/.test(k))base.key.call(this,k);return;}
 if(k==='Escape'){if(this.menu){this.menu=null;return;}if(this.gallery){this.gallery=null;return;}if(s.presentations.length)return;if(this.actionUnit){const u=e.unit(this.actionUnit);if(s.moveOrigin&&!u.committed)e.undoMove(u);this.actionUnit=null;return;}if(this.mode!=='move'){this.mode='move';this.actionUnit=s.selected;return;}if(s.selected){s.selected=null;return;}this.menu={type:'system'};return;}
 if(this.menu){const count=this.buttons.length;if(k==='ArrowDown'||k==='ArrowUp')this.menu.choice=((this.menu.choice||0)+(k==='ArrowDown'?1:count-1))%Math.max(1,count);if(k==='Enter'||k===' '){if(this.menu.type==='objectives')this.menu=null;else{const b=this.buttons[(this.menu.choice||0)%Math.max(1,count)];if(b)this.safe(b.fn);}}return;}
 if(this.gallery){const g=this.gallery,count=Object.keys(g.actor?e.db.actors:e.db.classes).length;if(k==='ArrowDown'||k==='ArrowRight')g.index=(g.index+1)%count;if(k==='ArrowUp'||k==='ArrowLeft')g.index=(g.index+count-1)%count;if(k==='Enter'||k===' ')g.pause=!g.pause;return;}
 if(this.actionUnit){if(k==='ArrowDown'||k==='ArrowUp'){this.actionIndex=Math.max(0,(this.actionIndex||0)+(k==='ArrowDown'?1:-1));return;}if(k==='Enter'||k===' '){const rows=this.buttons.filter(b=>b.x<this.canvas.width-210&&b.y>84);const b=rows[(this.actionIndex||0)%rows.length];if(b)this.safe(b.fn);return;}return;}
 if(!s.presentations.length&&!this.gallery){if(k.toLowerCase()==='c'){this.danger=!this.danger;return;}if(k.toLowerCase()==='s'){const u=this.inspected();if(u)this.menu={type:'status',unit:u.id};return;}if(k.toLowerCase()==='a'){const rows=s.units.filter(u=>u.team===1&&T.alive(u)&&!u.acted&&!u.carrier&&e.cls(u).selectable!==false),index=rows.findIndex(u=>u.id===s.selected),u=rows[(index+1)%rows.length];if(u){s.selected=u.id;this.cursor={x:u.x,y:u.y};this.focus(u);}return;}}
 return base.key.call(this,k);
};
V.drawObjectives=function(){const e=this.engine,w=this.canvas.width,h=this.canvas.height,o=this.objectiveText(),x=86,bw=w-172;this.rect(0,0,w,h,'rgba(0,8,13,.77)');this.text('CONDICIONES DEL CAPÍTULO',w/2,62,14,C.gold,'center');this.text(e.s.map.title,w/2,94,26,C.text,'center','Georgia');
 const card=(y,title,text,gold,units)=>{this.panel(x,y,bw,182,gold?'gold':undefined);this.crest(x+62,y+91,38);this.text(title,x+128,y+39,30,C.text,'left','Georgia');this.wrap(text,x+128,y+95,bw-290,20,28,3);const u=units[0];if(u)this.portrait(u,x+bw-155,y+32,124,121);};
 card(132,'Victoria',o.victory,true,o.bosses);card(333,'Derrota',o.defeat,false,o.protectedUnits);this.text('Enter / Esc · Cerrar condiciones',x,h-73,12,C.muted);this.button('Volver',x+bw-169,h-92,169,()=>this.menu=null,true,true);
};
V.drawForecast=function(m){if(this.skinForecast(m))return;const e=this.engine,x=this.canvas.width-192,y=86,h=this.canvas.height-160,w=180,a=e.unit(m.a),b=e.unit(m.b);this.panel(x,y,w,h);this.text('PREVISIÓN',x+w/2,y+23,17,C.gold,'center','Georgia');
 const row=(u,v,top)=>{const f=u===b?e.counterForecast(u,v):e.forecast(u,v),weapon=e.weapon(u);this.portrait(u,x+12,top,36,42);this.text(u.name,x+57,top+14,14,color(u));this.text(u.hp+' / '+e.value(u,'health')+' PV',x+57,top+34,12,C.text);this.hpBar(u,u.hp,x+12,top+50,w-24,7);this.text(weapon?weapon.name:'Sin arma',x+12,top+76,14,C.gold,'left','Georgia');['DAÑO','PREC.','CRÍT.'].forEach((t,i)=>this.text(t,x+39+i*51,top+100,10,C.muted,'center'));const values=f.can?[f.damage+'×'+f.strikes,f.hit+'%',f.crit+'%']:['—','—','—'];values.forEach((t,i)=>this.text(t,x+39+i*51,top+122,21,C.text,'center','Georgia'));if(!f.can)this.text('Sin contraataque',x+12,top+147,11,C.muted);};
 row(a,b,y+40);row(b,a,y+232);this.button('Atacar',x+13,y+h-110,154,()=>{this.menu=null;this.actionUnit=null;e.combat(a,b,true);this.mode='move';if(a.acted)e.s.selected=null;},true,true);this.button('Cancelar',x+13,y+h-59,154,()=>this.menu=null);
};
V.drawDialogue=function(p){if(!this.skinDialogue(p))this.dialogueCard(p,false);};
V.drawCombat=function(p){
 const e=this.engine,w=this.canvas.width,h=this.canvas.height,a=e.unit(p.a),b=e.unit(p.b),t=this.combatTime(p),hit=t.strike,phase=t.phase,impact=t.impact,stage={x:25,y:100,w:w-50,h:h-334},G=T.Graphics,skin=G&&G.uiReady(this,['battleStage','battlePanel','battleName1','battleName2','battleName3','battleGauge1','battleGauge2','battleGauge3','battleCrest']);this.rect(0,0,w,h,C.bg);if(skin){G.ui(this,'battleName'+(a.team===2?2:a.team===3?3:1),24,24,w/2-72,55);G.ui(this,'battleName'+(b.team===2?2:b.team===3?3:1),w/2+48,24,w/2-72,55,true);G.ui(this,'battleCrest',w/2-36,14,72,72);this.text('VS',w/2,50,20,C.text,'center','Georgia');this.text(a.name,52,51,25,C.text,'left','Georgia');this.text(b.name,w-52,51,25,C.text,'right','Georgia');G.ui(this,'battleStage',stage.x,stage.y,stage.w,stage.h);}else{this.panel(24,22,w-48,61,undefined,false);this.text('ENFRENTAMIENTO',w/2,40,11,C.gold,'center');this.text(a.name+' / '+b.name,w/2,64,24,C.text,'center','Georgia');this.panel(stage.x,stage.y,stage.w,stage.h,undefined,false);}
 this.ctx.save();this.ctx.beginPath();this.ctx.rect(stage.x+6,stage.y+6,stage.w-12,stage.h-12);this.ctx.clip();if(T.Graphics)T.Graphics.battleBackground(this,stage.x+6,stage.y+6,stage.w-12,stage.h-12);else this.rect(stage.x+6,stage.y+6,stage.w-12,stage.h-12,'#35514a');
 this.drawSpellBackdrop(t,stage.x+6,stage.y+6,stage.w-12,stage.h-12,false);
 const close=(!hit||T.distance(a,b)<=1)&&!t.spell,left=close?w*.425:w*.30,right=close?w*.575:w*.70,ground=stage.y+stage.h-30,scale=2,attacker=hit&&e.unit(hit.attacker);if(T.Graphics){T.Graphics.platform(this,left,ground,2,false);T.Graphics.platform(this,right,ground,2,true);this.resourceClip=hit?{unit:attacker,clip:T.Graphics.clip(this,attacker,hit.critical?'critical':hit.hit?'normal':'miss',hit)}:null;}
 const dodge=this.spellDodge(t),lunge=hit&&!t.spell?Math.sin(Math.min(1,phase/Math.max(1,impact))*Math.PI)*17:0;this.sprite(a,left+(attacker===a?lunge:0)-(hit&&hit.target===a.id?dodge:0),ground,scale,1,attacker===a?t.pose:0,!!hit&&hit.target===a.id&&hit.hit&&phase>=impact&&phase<impact+8);this.sprite(b,right-(attacker===b?lunge:0)+(hit&&hit.target===b.id?dodge:0),ground,scale,-1,attacker===b?t.pose:0,!!hit&&hit.target===b.id&&hit.hit&&phase>=impact&&phase<impact+8);this.resourceClip=null;this.drawSpell(t,attacker===a?left:right,hit&&hit.target===a.id?left:right,ground,scale);this.drawSpellBackdrop(t,stage.x+6,stage.y+6,stage.w-12,stage.h-12,true,hit&&hit.target===a.id?-1:1);
 if(hit&&phase>=impact&&phase<impact+24)this.text(hit.hit?(hit.critical?'¡'+hit.damage+'!':hit.damage):'Fallo',hit.target===a.id?left:right,ground-118-(phase-impact)*.5,hit.critical?36:29,C.text,'center','Georgia');this.ctx.restore();
 let hpA=p.start[a.id],hpB=p.start[b.id];p.strikes.forEach((s,i)=>{if(i<t.index||i===t.index&&phase>=impact){if(s.target===a.id)hpA=s.hp;else hpB=s.hp;if(s.attacker===a.id)hpA=s.attackerHp;else hpB=s.attackerHp;}});
 const card=(u,v,hp,x)=>{if(skin){this.skinBattleCard(u,v,hp,x,p.start[u.id]);return;}const y=h-219,width=(w-84)/2,weapon=e.weapon(u),f=e.forecast(u,v);this.panel(x,y,width,173,u.team===2?'enemy':undefined);this.portrait(u,x+12,y+15,86,122);this.text(u.name,x+112,y+26,24,color(u),'left','Georgia');this.text(weapon?weapon.name:'Sin arma',x+112,y+53,15,C.gold);this.text('PV',x+112,y+78,10,C.muted);this.text(hp+' / '+e.value(u,'health'),x+width-18,y+79,30,C.text,'right','Georgia');this.hpBar(u,hp,x+112,y+99,width-130,12,p.start[u.id]);['ATAQUE','PRECISIÓN','CRÍTICO'].forEach((label,i)=>this.text(label,x+112+i*(width-128)/3,y+135,9,C.muted));const values=f.can?[f.damage+' × '+f.strikes,f.hit+'%',f.crit+'%']:['—','—','—'];values.forEach((v,i)=>this.text(v,x+112+i*(width-128)/3,y+156,21,C.text,'left','Georgia'));};card(a,b,hpA,24);card(b,a,hpB,w/2+18);this.text(hit?(hit.critical?'¡Golpe crítico!  ':'')+e.unit(hit.attacker).name+' → '+e.unit(hit.target).name+': '+(hit.hit?hit.damage+' de daño.':'Fallo.'):'',28,h-25,13,C.muted);this.text('Z / Enter / Clic · Omitir',w-28,h-25,13,C.gold,'right');
};
V.drawStatus=function(m){const e=this.engine,u=e.unit(m.unit)||this.inspected(),w=this.canvas.width,h=this.canvas.height,x=110,y=80,width=w-220;this.panel(x,y,width,h-160);this.text(u.name+' · '+e.cls(u).name,x+24,y+34,29,C.gold,'left','Georgia');this.portrait(u,x+28,y+78,188,162);this.text('Nivel '+u.level+'   EXP '+u.exp+'   PV '+u.hp+'/'+e.value(u,'health'),x+242,y+92,21,C.text);
 const rows=[['Poder','power'],['Habilidad','skill'],['Velocidad','speed'],['Suerte','luck'],['Defensa','defense'],['Resistencia','resistance'],['Constitución','build'],['Movimiento','move']];rows.forEach((r,i)=>this.text(r[0]+'   '+e.value(u,r[1]),x+242+i%2*218,y+145+Math.floor(i/2)*35,19,C.text));
 if(m.details){this.text('HABILIDADES',x+32,y+273,12,C.gold);this.wrap(u.skills.map(id=>(e.db.skills[id]||{}).name||id).join(' · ')||'Sin habilidades',x+32,y+300,width-65,17,24,2);this.text('DOMINIO DE ARMAS',x+32,y+360,12,C.gold);this.text(Object.keys(u.ranks).map(k=>k+': '+u.ranks[k]).join('   '),x+32,y+385,16,C.text);}
 else u.inventory.forEach((i,k)=>{const icon=this.itemIcon(i,x+32,y+270+k*25,16);this.text((k===u.equipped?'◆ ':'· ')+e.itemData(i).name+'   '+i.uses,x+(icon?56:32),y+278+k*25,18,C.text);});
 this.button(m.details?'Inventario':'Rangos / Habilidades',x+30,h-130,280,()=>m.details=!m.details);this.button('Cerrar',x+width-200,h-130,170,()=>this.menu=null);
};
V.useInventoryItem=function(u,slot){
 const e=this.engine,item=u&&u.inventory[slot],d=item&&e.itemData(item);T.assert(d,'Objeto no disponible');
 if(item.kind==='weapon'&&!d.staff){T.assert(e.canEquip(u,item),'Rango o tipo de arma incompatible');u.equipped=slot;this.mode='attack';}
 else{T.assert(['key','passive'].indexOf(d.effect)<0,'Se utiliza al interactuar en el mapa');T.assert(!(d.uses>0)||item.uses>0,'No quedan usos');if(d.staff)T.assert(e.canEquip(u,item),'Rango o tipo de bastón incompatible');this.itemSlot=slot;this.mode='item';}
 this.menu=null;
};
V.drawInventory=function(m){
 const e=this.engine,u=e.unit(m.unit);if(!u){this.menu=null;return;}const w=this.canvas.width,h=this.canvas.height,x=72,y=78,width=w-144,pages=Math.max(1,Math.ceil(u.inventory.length/6)),page=T.clamp(m.page||0,0,pages-1);m.page=page;
 const slot=T.clamp(m.slot===undefined?page*6:m.slot,0,Math.max(0,u.inventory.length-1)),item=u.inventory[slot],d=item&&e.itemData(item),right=x+440;
 this.rect(0,0,w,h,'rgba(0,8,13,.75)');this.panel(x,y,width,h-156);this.portraitArt(u,x+22,y+12,72,80);this.fitText(u.name,x+114,y+34,width-266,27,C.text,'left','Georgia');this.text(e.cls(u).name+' · Nv. '+u.level,x+114,y+64,14,C.muted);this.button('Volver',x+width-134,y+24,112,()=>{this.menu=null;this.mode='move';this.actionUnit=u.id;});
 this.line(x+22,y+104,width-44,C.line);this.text('INVENTARIO',x+28,y+130,12,C.gold);this.text('USOS',x+390,y+130,11,C.muted,'right');this.text(u.inventory.length+' / '+e.s.options.inventory+' espacios',x+28,h-115,13,C.muted);
 u.inventory.slice(page*6,page*6+6).forEach((entry,k)=>{const index=page*6+k,data=e.itemData(entry),top=y+151+k*43,label=(data||{}).name||'Objeto desconocido',active=index===slot,focus=(m.choice||0)===this.buttons.length;this.panel(x+22,top,384,37,active||focus?'gold':undefined,false);this.rect(x+29,top+10,3,17,active?C.gold:'#48646a');const icon=this.itemIcon(entry,x+37,top+2,32);this.fitText((index===u.equipped?'◆ ':'')+label,x+(icon?77:42),top+18,icon?236:264,16,C.text);this.text(data&&data.uses?entry.uses+' / '+data.uses:'∞',x+391,top+18,13,C.muted,'right');this.buttons.push({label,x:x+22,y:top,w:384,h:37,fn:()=>{m.slot=index;}});});
 if(!u.inventory.length)this.text('Inventario vacío',x+28,y+179,18,C.muted);
 if(pages>1){this.button('Anterior',x+22,h-169,125,()=>{m.page=(page+pages-1)%pages;m.slot=m.page*6;});this.text((page+1)+' / '+pages,x+213,h-151,13,C.muted,'center');this.button('Siguiente',x+275,h-169,131,()=>{m.page=(page+1)%pages;m.slot=m.page*6;});}
 this.panel(right,y+120,width-464,h-303,undefined,false);if(d){const action=item.kind==='weapon'&&!d.staff,passive=['key','passive'].indexOf(d.effect)>=0,usable=item.kind==='weapon'?e.canEquip(u,item):!(d.uses>0)||item.uses>0;
  this.text(action?'ARMA':d.staff?'BASTÓN':'OBJETO',right+20,y+144,11,C.gold);this.itemIcon(item,x+width-72,y+126,32);this.textLines(d.name,width-504,23,'Georgia').slice(0,2).forEach((line,i)=>this.text(line,right+20,y+178+i*28,23,C.text,'left','Georgia'));
  const lines=action||d.staff?[['Poder',d.might||0],['Acierto',(d.hit||0)+'%'],['Crítico',(d.crit||0)+'%'],['Alcance',(d.minRange||1)+' – '+(d.maxRange||1)]]:[['Usos',item.uses],['Valor',(d.price||0)+' G']];lines.forEach((row,i)=>{this.text(row[0],right+20,y+246+i*29,13,C.muted);this.text(row[1],x+width-44,y+246+i*29,18,C.text,'right');});
  const hint=passive?'Se utiliza al interactuar con su casilla en el mapa.':!usable?'No disponible: revisa usos, clase y rango.':action?'Equipar y elegir un objetivo.':'Elige después una casilla de destino.';this.textLines(hint,width-504,13).slice(0,3).forEach((line,i)=>this.text(line,right+20,h-192+i*18,13,C.muted));
  this.button(action?'Equipar y atacar':'Usar objeto',right+16,h-139,width-496,()=>this.useInventoryItem(u,slot),!passive&&usable);
 }else this.text('Selecciona un objeto',right+20,y+168,16,C.muted);
};
V.drawMenu=function(){const m=this.menu,w=this.canvas.width,h=this.canvas.height,e=this.engine;if(m.type==='inventory'){this.drawInventory(m);return;}if(m.type==='forecast'){this.drawForecast(m);return;}if(m.type==='objectives'){this.drawObjectives();return;}if(m.type==='status'){this.drawStatus(m);return;}
 if(m.type==='trade'||m.type==='steal'){
  const a=e.unit(m.unit),b=e.unit(m.target);if(!a||!b||!e.actionTargets(a,m.type).some(u=>u===b)){this.menu=null;this.mode='move';return;}
  const x=124,y=120;this.rect(0,0,w,h,'rgba(0,8,13,.72)');this.panel(x,y,w-248,394);this.text(m.type==='trade'?'Intercambiar objetos':'Robar objeto',x+22,y+30,25,C.gold);this.button('Volver',w-263,y+12,116,()=>{this.menu=null;this.mode='move';this.actionUnit=a.id;});
  if(m.type==='trade'){
   [a,b].forEach((u,side)=>{const left=x+22+side*338;this.text(u.name,left,y+80,21,color(u));for(let slot=0;slot<e.s.options.inventory;slot++){const item=u.inventory[slot],other=side?a:b,selection=m.selection,label=item?e.itemData(item).name+' · '+item.uses:'— Vacío —',valid=selection?selection.side!==side&&(item||slot===u.inventory.length)&&!!(item||other.inventory[selection.slot]):!!item;this.button(label,left,y+99+slot*39,316,()=>{if(!m.selection){m.selection={side,slot};m.choice=0;}else{const selected=m.selection;e.trade(a,b,side?selected.slot:slot,side?slot:selected.slot);m.selection=null;m.choice=0;}},valid,selection&&selection.side===side&&selection.slot===slot);}});
   this.text(m.selection?'Elige un espacio en el otro inventario.':'Elige un objeto de cualquiera de las dos unidades.',x+22,y+368,13,C.muted);
  }else e.stealSlots(a,b).forEach((slot,i)=>this.button(e.itemData(b.inventory[slot]).name,x+22,y+99+i*39,w-292,()=>{e.steal(a,b,slot);this.menu=null;this.mode='move';e.s.selected=a.acted?null:a.id;}));
  return;
 }
 if(m.type==='system'||m.type==='options'||m.type==='controls'){
  const x=w/2-250,y=88;this.rect(0,0,w,h,'rgba(0,8,13,.65)');this.panel(x,y,500,h-160);this.text(m.type==='system'?'Menú de campaña':m.type==='options'?'Opciones':'Controles',x+24,y+33,26,C.gold,'left','Georgia');let at=y+71;const add=(label,fn)=>{this.button(label,x+25,at,450,fn);at+=40;};
  if(m.type==='system'){
   add('Objetivo',()=>this.menu={type:'objectives'});add('Estado',()=>this.menu={type:'status',unit:this.inspected().id});add('Animaciones',()=>{this.menu=null;this.openGallery();});add('Taller de clases',()=>{this.menu=null;this.workshop();});add('Almacén',()=>this.menu={type:'convoy',unit:this.inspected().id});add('Guardar partida',()=>{this.openSave();this.menu=null;});add('Opciones',()=>this.menu={type:'options'});add('Fin de fase',()=>{this.actionUnit=null;this.menu=null;e.endPhase();});add('Volver',()=>this.menu=null);
  }else if(m.type==='options'){
   add('Velocidad rápida: '+(e.s.options.fastMovement?'Sí':'No'),()=>e.s.options.fastMovement=!e.s.options.fastMovement);add('Animaciones de combate: '+(e.s.options.skipCombat?'No':'Sí'),()=>e.s.options.skipCombat=!e.s.options.skipCombat);add('Efectos de sonido: '+(e.s.options.mute?'No':'Sí'),()=>e.s.options.mute=!e.s.options.mute);add('Peligro enemigo: '+(this.danger?'Visible':'Oculto'),()=>this.danger=!this.danger);add('Controles',()=>this.menu={type:'controls'});add('Volver',()=>this.menu={type:'system'});
  }else{this.wrap('Z / Enter / Clic: seleccionar y confirmar.\nFlechas: mover el cursor.\nEsc: cancelar o abrir el menú.\nA: siguiente aliado disponible.\nS: ficha de la unidad.\nC: mostrar el alcance enemigo.\nEl menú de acciones aparece al llegar a la casilla.',x+28,at+10,440,17,31);this.button('Volver',x+25,y+h-240,450,()=>this.menu={type:'system'});}
  return;
 }
 return base.drawMenu.call(this);
};
V.drawResult=function(){const s=this.engine.s,w=this.canvas.width,h=this.canvas.height,x=w/2-290,y=h/2-171,victory=s.result==='victory';this.rect(0,0,w,h,'rgba(0,8,13,.73)');this.panel(x,y,580,299,victory?'gold':'enemy');this.text(victory?'VICTORIA':'DERROTA',w/2,y+59,43,C.text,'center','Georgia');this.line(x+28,y+95,524,C.line);this.text(victory?'Has cumplido el objetivo del capítulo.':'Tu expedición debe retirarse.',w/2,y+125,21,C.text,'center','Georgia');if(victory&&s.map.nextMapId)this.button('Continuar al siguiente capítulo',x+55,y+183,470,()=>{this.actionUnit=null;this.next(s.map.nextMapId);},true,true);this.button('Revisar el campo',x+55,y+231,470,()=>this.resultDismissed=true);};
V.drawGallery=function(){
 const g=this.gallery,e=this.engine,w=this.canvas.width,h=this.canvas.height,entries=g.actor?Object.values(e.db.actors):Object.values(e.db.classes);g.index=T.clamp(Number.isFinite(g.index)?Math.floor(g.index):0,0,Math.max(0,entries.length-1));const entry=entries[g.index],cls=entry&&(g.actor?e.db.classes[entry.classId]:entry);if(!cls){this.rect(0,0,w,h,C.bg);this.text(entry?'El personaje no tiene una clase válida.':'No hay entradas en esta lista.',24,100,22,C.text);this.button('Volver',w-144,22,120,()=>this.gallery=null);this.button(g.actor?'Ver clases':'Ver personajes',24,148,220,()=>{g.actor=!g.actor;g.index=0;});return;}const custom=g.actor&&e.s.units.find(u=>u.actorId===entry.id),u=custom||Object.assign({},g.actor?entry:{},{classId:cls.id});
 this.rect(0,0,w,h,C.bg);this.text('ANIMACIONES',24,34,29,C.gold);this.text('Clases, personajes y plantillas para crear tus propios sprites.',25,65,15,C.muted);this.button('Volver',w-144,22,120,()=>this.gallery=null);
 this.panel(16,91,235,h-110);this.button(g.actor?'Personajes':'Clases',28,103,210,()=>{g.actor=!g.actor;g.index=0;});const start=Math.floor(g.index/9)*9;entries.slice(start,start+9).forEach((row,i)=>{const active=start+i===g.index;this.button(row.name,28,150+i*39,210,()=>{g.index=start+i;g.tick=0;},true,active);});this.button('‹',28,h-68,54,()=>g.index=(g.index-1+entries.length)%entries.length);this.text((g.index+1)+' / '+entries.length,131,h-49,13,C.muted,'center');this.button('›',184,h-68,54,()=>g.index=(g.index+1)%entries.length);
 const x=270,bw=w-294,y=125,bh=266,magicWeapons=Object.values(e.db.weapons).filter(item=>item.magic&&!item.staff&&(cls.weaponTypes||[]).indexOf(item.category)>=0),inventory=custom?custom.inventory:entry.inventory||cls.inventory||[],initial=inventory.find(item=>item.kind==='weapon'&&magicWeapons.some(w=>w.id===item.id)),weapon=magicWeapons.find(w=>w.id===g.weaponId)||magicWeapons.find(w=>initial&&w.id===initial.id)||magicWeapons[0];
 this.fitText((custom?custom.name:entry.name)+' · '+cls.name,x+6,103,bw-(weapon?234:12),22,C.gold);if(weapon)this.button(weapon.name+' ›',x+bw-218,82,218,()=>{g.weaponId=magicWeapons[(magicWeapons.indexOf(weapon)+1)%magicWeapons.length].id;g.tick=0;});
 this.panel(x-4,y-4,bw+8,bh+8,undefined,false);this.ctx.save();this.ctx.beginPath();this.ctx.rect(x,y,bw,bh);this.ctx.clip();if(T.Graphics)T.Graphics.battleBackground(this,x,y,bw,bh);else this.rect(x,y,bw,bh,'#35514a');
 const external=T.Graphics&&T.Graphics.clip(this,u,g.mode,{weaponId:weapon&&weapon.id,distance:g.distance}),anim=external||cls.animation||{},frames=Array.isArray(anim.frames)&&anim.frames.length?anim.frames:[0,1,2,3,4,5],strike={attacker:u.id,weaponId:weapon&&weapon.id,weapon:weapon&&weapon.name,spell:weapon&&weapon.spell,weaponCategory:weapon?weapon.category:(cls.weaponTypes||[])[0],magic:!!weapon,critical:g.mode==='critical',hit:g.mode!=='miss',damage:1},row=this.strikeTiming(strike,u,Object.assign({},anim,{frames}));if(!row.spell)row.duration-=24;
 if(!g.pause)g.tick+=g.speed;const timing=this.strikeFrame(row,g.tick%row.duration),frame=timing.pose,impact=anim.impact===undefined?3:anim.impact,left=x+bw*(g.distance>1||row.spell?.28:.40),right=x+bw*(g.distance>1||row.spell?.72:.60),from=g.side<0?right:left,to=g.side<0?left:right,ground=y+bh-31;
 this.drawSpellBackdrop(timing,x,y,bw,bh,false);const dummy={classId:cls.id,team:2};if(T.Graphics){T.Graphics.platform(this,left,ground,2,false);T.Graphics.platform(this,right,ground,2,true);this.resourceClip=external?{unit:u,clip:external}:null;}this.sprite(u,from,ground,2,g.side,frame,false);this.resourceClip=null;this.sprite(dummy,to+(to>=from?1:-1)*this.spellDodge(timing),ground,2,-g.side,0,strike.hit&&timing.phase>=timing.impact&&timing.phase<timing.impact+5);this.drawSpell(timing,from,to,ground,2);this.drawSpellBackdrop(timing,x,y,bw,bh,true,g.side);this.ctx.restore();
 if(!g.pause){const key=(g.actor?'actor:':'class:')+entry.id+':'+g.mode+':'+(weapon&&weapon.id||0),ordinal=Math.floor((g.tick-row.impact)/row.duration),windup=Math.floor((g.tick-row.attackAt)/row.duration);if(g.audioKey!==key){g.audioKey=key;g.audioOrdinal=-1;g.windupOrdinal=-1;}if(windup>=0&&windup>g.windupOrdinal){g.windupOrdinal=windup;if(!g.mute)this.attackSound(strike);}if(ordinal>=0&&ordinal>g.audioOrdinal){g.audioOrdinal=ordinal;if(!g.mute)this.sound(strike.magic,strike.critical,!strike.hit,strike);}}
 const phaseLabel=row.spell?row.spell.name+' · '+(timing.phase<row.release?'Carga':timing.phase<row.effectStart?'En vuelo':timing.phase<row.impact?'Formación':timing.phase<row.effectStart+row.recovery?(strike.hit?'Impacto':'Fallo'):'Recuperación'):'Impacto '+impact;this.text('Fotograma '+frame+' / '+(frames.length-1)+'   ·   '+phaseLabel+'   ·   '+g.speed+'×',x+5,421,13,C.muted);const btn=(label,col,row,fn)=>this.button(label,x+col*(bw/3+2),443+row*43,bw/3-7,fn);btn(g.pause?'Reproducir':'Pausar',0,0,()=>g.pause=!g.pause);btn('Velocidad',1,0,()=>g.speed=g.speed===2?.5:g.speed*2);btn('Girar',2,0,()=>g.side*=-1);btn({normal:'Normal',critical:'Crítico',miss:'Fallo'}[g.mode],0,1,()=>g.mode=g.mode==='normal'?'critical':g.mode==='critical'?'miss':'normal');btn(g.distance===1?'Cerca':'Lejos',1,1,()=>g.distance=g.distance===1?2:1);btn('Fotograma +',2,1,()=>{g.pause=true;g.tick+=60/(anim.fps||12);});this.button('Taller · Crear una clase',x,544,bw*2/3-7,()=>this.workshop(cls));this.button(g.mute?'Sonido: No':'Sonido: Sí',x+bw*2/3+3,544,bw/3-3,()=>g.mute=!g.mute);
};
V.formShell=function(title){
 if(this.form)this.form.remove();const wrap=document.createElement('div');wrap.className='tactics-form';wrap.style.cssText='position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#06151bf5;color:#eee8d5;font:15px Arial';const form=document.createElement('form');form.style.cssText='box-sizing:border-box;width:min(850px,94vw);max-height:95vh;overflow:auto;padding:24px;background:repeating-linear-gradient(0deg,#ffffff04 0px,#ffffff04 1px,transparent 1px,transparent 7px),linear-gradient(125deg,#19343a,#081b22);border:1px solid #897b51;outline:1px solid #355059;outline-offset:-5px;box-shadow:0 12px 60px #0009';const heading=document.createElement('h2');heading.textContent=title;heading.style.cssText='font:27px Georgia;margin:0 0 20px;color:#dfbf74';form.appendChild(heading);wrap.appendChild(form);document.body.appendChild(wrap);this.form=wrap;const note=document.createElement('p');note.style.cssText='color:#efa5a5;font-size:13px';const add=(label,type,value,options)=>{const row=document.createElement('label');row.style.cssText='display:grid;grid-template-columns:1fr 1.3fr;align-items:center;gap:12px;margin:9px 0';const text=document.createElement('span');text.textContent=label;row.appendChild(text);const input=document.createElement(options?'select':'input');if(options)options.forEach(o=>{const el=document.createElement('option');el.value=o.value;el.textContent=o.label;input.appendChild(el);});else input.type=type;input.setAttribute('aria-label',label);input.value=value===undefined?'':value;input.style.cssText='box-sizing:border-box;min-width:0;width:100%;padding:8px;background:#102831;color:#eee8d5;border:1px solid #897b51';if(type==='color'){input.style.height='36px';input.style.padding='3px';}row.appendChild(input);form.appendChild(row);return input;};const button=(label,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.style.cssText='padding:10px 16px;margin:12px 8px 0 0;background:linear-gradient(120deg,#786237,#353c2c);color:#fff3d5;border:1px solid #b39a62;cursor:pointer;font:16px Georgia';el.onclick=()=>{try{fn();note.textContent='';}catch(err){note.textContent=err.message;}};form.appendChild(el);return el;};form.onsubmit=e=>e.preventDefault();form.appendChild(note);return {form,add,button,note,close:()=>{wrap.remove();this.form=null;}};
};
V.creator=function(u){
 T.assert(u,'No existe la unidad protagonista');const e=this.engine,f=this.formShell('Capítulo '+e.s.map.id+' · Tu protagonista');const body=document.createElement('div');body.style.cssText='display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:22px';f.form.appendChild(body);const left=document.createElement('div'),right=document.createElement('div');body.append(left,right);const preview=document.createElement('canvas');preview.width=430;preview.height=410;preview.setAttribute('aria-label','Vista previa del personaje');preview.style.cssText='display:block;width:100%;height:auto;image-rendering:pixelated';left.appendChild(preview);const inputs=[];const add=(...args)=>{const el=f.add.apply(null,args);right.appendChild(el.parentElement);inputs.push(el);return el;};const name=add('Nombre','text',u.name);name.maxLength=24;const cls=add('Clase','',u.classId,Object.values(e.db.classes).map(c=>({value:c.id,label:c.name})));const faces=e.db.graphics&&e.db.graphics.faces,faceKeys=faces?Object.keys(faces).filter(k=>!/^\d+$/.test(k)&&k!=='default'):[];const face=faceKeys.length?add('Retrato','',u.faceKey||faceKeys[0],faceKeys.map(k=>({value:k,label:(faces[k].name||k)}))):null;const controls={};['cloth','hair','skin'].forEach(k=>controls[k]=add({cloth:'Vestimenta',hair:'Cabello',skin:'Piel'}[k]+' RGB','color',(u.colors||{})[k]||'#61adcf'));
 const rgb=document.createElement('p');rgb.style.cssText='font-size:12px;color:#b6c2c2;line-height:1.5';rgb.textContent='Elige clase, retrato y colores. La vista previa muestra el mapa, el movimiento y el ataque.';right.appendChild(rgb);let tick=0;
 const paint=()=>{if(!preview.isConnected)return;tick++;const c=e.db.classes[Number(cls.value)],v={classId:c.id,actorId:u.actorId,faceKey:face?face.value:u.faceKey,colors:Object.fromEntries(Object.keys(controls).map(k=>[k,controls[k].value])),customColors:true,name:name.value,team:1};const old=this.ctx;this.ctx=preview.getContext('2d');this.rect(0,0,430,410,C.bg);this.text(v.name,16,28,23,C.gold,'left','Georgia');this.text(c.name+' · Nivel 1',16,55,14,C.muted);this.mapSprite(v,65,144,32,0,false);this.mapSprite(v,160,144,32,(tick/8)%4,false);this.portrait(v,265,62,130,102);this.text('Mapa',42,180,12,C.muted);this.text('Movimiento',125,180,12,C.muted);this.text('Retrato',302,180,12,C.muted);this.text('PV '+c.stats.health+'   Fuerza '+c.stats.power+'   Velocidad '+c.stats.speed+'   Mov. '+c.stats.move,15,210,13,C.text);this.text('VISTA PREVIA DEL ATAQUE',15,242,13,C.gold);
 this.ctx.save();this.ctx.beginPath();this.ctx.rect(12,260,406,140);this.ctx.clip();if(T.Graphics)T.Graphics.battleBackground(this,12,260,406,140);else this.rect(12,260,406,140,'#35514a');const clip=T.Graphics&&T.Graphics.clip(this,v,'normal'),a=clip||c.animation||{},weapon=Object.values(e.db.weapons).find(w=>w.magic&&!w.staff&&(c.weaponTypes||[]).indexOf(w.category)>=0),strike={magic:!!weapon,weaponId:weapon&&weapon.id,spell:weapon&&weapon.spell,hit:true},row=this.strikeTiming(strike,v,a),timing=this.strikeFrame(row,tick%row.duration),frame=timing.pose,from=row.spell?118:179,to=row.spell?310:251;this.drawSpellBackdrop(timing,12,260,406,140,false);if(T.Graphics){T.Graphics.platform(this,from,388,1.1,false);T.Graphics.platform(this,to,388,1.1,true);}this.resourceClip=clip?{unit:v,clip}:null;this.sprite(v,from,388,1.1,1,frame,false);this.resourceClip=null;this.sprite({classId:c.id,team:2},to,388,1.1,-1,0,!!row.spell&&timing.phase>=row.impact&&timing.phase<row.impact+5);this.drawSpell(timing,from,to,388,1.1);this.drawSpellBackdrop(timing,12,260,406,140,true,1);this.ctx.restore();this.ctx=old;requestAnimationFrame(paint);};requestAnimationFrame(paint);
 f.button('Comenzar',()=>{const c=e.db.classes[Number(cls.value)];T.assert(c,'Clase inválida');u.name=name.value.trim()||u.name;u.classId=c.id;u.stats=Object.assign({},u.stats,c.stats);u.growth=T.copy(c.growth);u.ranks=T.copy(c.ranks);u.skills=Array.from(new Set((c.skills||[]).concat((e.db.actors[u.actorId]||{}).skills||[])));u.inventory=e.protagonistInventory(u);u.colors=Object.fromEntries(Object.keys(controls).map(k=>[k,controls[k].value]));u.customColors=true;if(face)u.faceKey=face.value;u.color=u.colors.cloth;u.hp=e.value(u,'health');e.autoEquip(u);e.s.creatorDone=true;e.rememberParty();f.close();});
};
V.drawTitle=function(title,items,index){const w=this.canvas.width,h=this.canvas.height;this.buttons=[];this.rect(0,0,w,h,C.bg);this.crest(w*.25,h*.44,190);this.text('CRÓNICAS TÁCTICAS',54,105,13,C.gold);this.text(title||'TacticsMZ',50,206,52,C.text,'left','Georgia');this.text('Forja a tu protagonista.',54,310,25,C.text,'left','Georgia');this.text('Escribe tu próxima batalla.',54,344,25,C.text,'left','Georgia');this.text('RPG MAKER MZ',55,415,13,C.muted);const x=w-438,y=140;this.panel(x,y,382,362);this.text('COMENZAR LA HISTORIA',x+191,y+33,17,C.gold,'center','Georgia');items.forEach((item,i)=>this.button(item.label,x+26,y+79+i*51,330,item.fn,item.enabled,i===index));this.text('Dos capítulos · Personajes RGB · Taller de clases',w/2,h-83,17,C.muted,'center');};
V.sound=function(magic,critical,miss,strike){if(!this.engine.s.options.mute)base.sound.call(this,magic,critical,miss,strike);};
const restoredUpdate=V.update;V.update=function(){const p=this.engine.s.presentations[0];if(p&&!this.form&&!this.menu&&!this.gallery){if(p.type==='move'&&this.engine.s.options.fastMovement)p.t=(p.t||0)+1;if(p.type==='combat'&&this.engine.s.options.skipCombat)p.fast=true;}restoredUpdate.call(this);};
})(typeof globalThis!=="undefined"?globalThis:this);

// ===== src/ui/04_Scenes.js =====
(function(root){
'use strict';
const T=root.Tactics,V=T.View.prototype,G=T.Graphics,C=T.presentation.colors;
const old={update:V.update,draw:V.draw,menu:V.drawMenu,dialogue:V.drawDialogue,choose:V.chooseTile,key:V.key,click:V.click,destroy:V.destroy,art:G.art,clip:G.clip,face:G.face,bitmap:G.bitmap,background:G.background,events:G.events};
V.syncThemes=function(){const e=this.engine,s=e.s,p=s.presentations[0],combat=p&&p.type==='combat'?p:null;if(this.musicCombat&&this.musicCombat!==combat){if(this.hooks.battleEnd)this.hooks.battleEnd(this.musicCombat);this.musicCombat=null;}if(combat&&s.themes&&s.themes.battle&&this.musicCombat!==combat){if(this.hooks.battleStart)this.hooks.battleStart(combat,s.themes.battle);this.musicCombat=combat;}if(s.victoryMusicPending&&!s.presentations.length&&!s.queue.length){s.victoryMusicPending=false;if(this.hooks.victory)this.hooks.victory(s.themes.victory);}};
V.update=function(){const e=this.engine,s=e.s,p=s.presentations[0];this.syncThemes();if(this.form||this.menu||this.gallery)return old.update.call(this);
 if(p&&p.type==='menu'&&(p.menu==='tracks'||p.menu==='palette')){s.presentations.shift();const u=e.unit(p.unit)||s.units[0];if(p.menu==='tracks')this.trackEditor(u&&u.classId);else this.paletteEditor(u&&u.classId);return;}
 if(p&&['chapter','camera','portraitMotion','experience','level','promotion','itemMiss','promoteChoice'].indexOf(p.type)>=0){this.frame++;p.t=(p.t||0)+1;
  if(p.type==='promoteChoice'){this.menu={type:'promotion',unit:p.unit,target:p.target,slot:p.slot,ignoreLevel:p.ignoreLevel};s.presentations.shift();return;}
  if(p.type==='camera'){if(!p.from)p.from=T.copy(this.offset);const previous=T.copy(this.offset);this.focus(p);const target=T.copy(this.offset),ratio=Math.min(1,p.t/p.duration);this.offset={x:Math.round(p.from.x+(target.x-p.from.x)*ratio),y:Math.round(p.from.y+(target.y-p.from.y)*ratio)};if(!Number.isFinite(this.offset.x))this.offset=previous;}
  const duration=p.duration||({experience:65,level:150,promotion:150,itemMiss:40}[p.type]||30);if(p.t>=duration||p.dismiss&&p.t>12){s.presentations.shift();if(p.type==='camera')s.camera={x:0,y:0};}return;
 }
 if(s.map.mode==='story'&&!p&&!s.queue.length){this.frame++;return;}
 old.update.call(this);if(p&&p.type==='combat')this.trackCues(p);this.syncThemes();
};
V.key=function(key){const s=this.engine.s,p=s.presentations[0];if(key==='Shift'&&(s.story&&s.story.skippable||s.queue[0]&&s.queue[0].skippable)){this.safe(()=>this.engine.skipScene());return;}if(p&&['experience','level','promotion','chapter','itemMiss'].indexOf(p.type)>=0&&(key==='Enter'||key==='z'||key===' ')){p.dismiss=true;return;}if(key==='Escape'&&(this.mode==='teleport'||this.mode==='repair')){this.mode='item';this.itemTarget=null;return;}return old.key.call(this,key);};
V.click=function(x,y){const p=this.engine.s.presentations[0];if(p&&['experience','level','promotion','chapter','itemMiss'].indexOf(p.type)>=0){p.dismiss=true;return;}return old.click.call(this,x,y);};
V.chooseTile=function(){const e=this.engine,s=e.s,u=this.selected(),v=e.at(this.cursor.x,this.cursor.y);if(this.menu||this.gallery||s.presentations.length||s.team!==1||s.result)return old.choose.call(this);if(v&&e.cls(v).selectable===false&&this.mode==='move'&&!u){this.error='Esta unidad permanece fija.';this.errorUntil=this.frame+120;return;}
 if(u&&this.mode==='teleport'){e.useItem(u,this.itemSlot,e.unit(this.itemTarget),this.cursor);this.itemTarget=null;this.mode='move';this.actionUnit=null;s.selected=u.acted?null:u.id;return;}
 if(u&&this.mode==='item'&&v){const d=e.itemData(u.inventory[this.itemSlot]);if(d.effect==='teleport'){T.assert(e.allies(u,v)&&e.reach(u,v,d),'Elige un aliado al alcance');this.itemTarget=v.id;this.mode='teleport';return;}if(d.effect==='repair'){T.assert(e.allies(u,v)&&e.reach(u,v,d),'Elige un aliado al alcance');this.menu={type:'repair',unit:u.id,target:v.id,slot:this.itemSlot};return;}}
 return old.choose.call(this);
};
V.storyUnit=function(p){return this.engine.unit(p.unit)||Object.assign({classId:1},this.engine.db.actors[p.actorId]||{},{actorId:p.actorId,faceKey:p.faceKey||undefined});};
V.drawStory=function(speaker,motion){const s=this.engine.s,story=s.story;if(!story)return;const w=this.canvas.width,h=this.canvas.height,bg=story.background&&this.image(story.background);if(bg)this.ctx.drawImage(bg,0,0,w,h);else this.rect(0,0,w,h,'rgba(0,8,14,.5)');const slots=motion&&motion.mode==='remove'?motion.before:story.slots||{},positions=[.12,.29,.42,.58,.71,.88];
 Object.keys(slots).forEach(k=>{const p=slots[k],slot=Number(k),u=this.storyUnit(p),duration=motion&&motion.duration||1,t=motion?T.clamp((motion.t||0)/duration,0,1):1;let x=positions[slot-1]*w-100,y=h-455,alpha=1;
  if(motion){if(motion.mode==='enter'&&slot===motion.slot){alpha=t;x+=(slot<4?-80:80)*(1-t);}if(motion.mode==='remove'&&slot===motion.slot)alpha=1-t;if(motion.mode==='jump'&&slot===motion.slot)y-=Math.sin(t*Math.PI)*30;if((motion.mode==='move'||motion.mode==='swap')&&(slot===motion.targetSlot||motion.mode==='swap'&&slot===motion.slot)){const start=slot===motion.targetSlot?motion.slot:motion.targetSlot;x=(positions[start-1]+(positions[slot-1]-positions[start-1])*t)*w-100;}}
  this.ctx.save();this.ctx.globalAlpha=alpha*(speaker&&speaker!==slot?.55:1);if(p.mirror){this.ctx.translate(x+200,y);this.ctx.scale(-1,1);x=0;y=0;}this.dialogueActor={expression:p.expression,talking:speaker===slot};this.portraitArt(u,x,y,200,255);this.dialogueActor=null;this.ctx.restore();
 });
};
V.drawDialogue=function(p){if(!this.engine.s.story||!Object.keys(this.engine.s.story.slots||{}).length){this.dialogueActor={talking:p.animate!==false,expression:'normal'};old.dialogue.call(this,p);this.dialogueActor=null;return;}
 const w=this.canvas.width,h=this.canvas.height,slot=p.speakerSlot||Number(Object.keys(this.engine.s.story.slots).find(k=>this.engine.s.story.slots[k].unit===p.unit))||0,entry=this.engine.s.story.slots[slot],u=entry&&this.storyUnit(entry);this.drawStory(p.animate===false?0:slot);
 this.panel(28,h-196,w-56,172);this.panel(w/2-170,h-238,340,39,undefined,false);this.fitText(p.name||u&&u.name||'Información',w/2-153,h-218,307,23,C.gold,'left','Georgia');const lines=this.textLines(p.text,w-124,20,'Georgia'),page=p.page||0;p.pages=Math.max(1,Math.ceil(lines.length/4));lines.slice(page*4,page*4+4).forEach((line,i)=>this.text(line,62,h-166+i*27,20,C.text,'left','Georgia'));this.text((page+1)+' / '+p.pages+'   ·   Enter: continuar'+(this.engine.s.story.skippable?'   ·   Mayús: saltar escena':''),62,h-44,12,C.muted);
};
V.draw=function(){old.draw.call(this);const p=this.engine.s.presentations[0];if(this.engine.s.story&&!this.menu&&!this.gallery&&(!p||p.type!=='dialogue'))this.drawStory(0,p&&p.type==='portraitMotion'?p:null);if(!p)return;if(p.type==='portraitMotion'){this.drawStory(0,p);return;}if(['chapter','experience','level','promotion','itemMiss'].indexOf(p.type)<0)return;this.buttons=[];const w=this.canvas.width,h=this.canvas.height,u=this.engine.unit(p.unit),x=w/2-290,y=126;this.rect(0,0,w,h,'rgba(0,8,14,.75)');this.panel(x,y,580,380);if(p.type==='chapter'){this.text(p.title,w/2,y+120,32,C.gold,'center','Georgia');this.wrap(p.subtitle,x+48,y+174,480,20,28,4);}else if(p.type==='experience'){this.portraitArt(u,x+24,y+40,148,168);this.text(u.name,x+206,y+67,28,C.gold);const shown=Math.min(p.amount,Math.floor(p.amount*(p.t||0)/48));this.text('EXP +'+shown,x+206,y+120,32,C.text);this.rect(x+206,y+161,326,13,'#09232c');this.rect(x+206,y+161,326*((p.from+shown)%100)/100,13,C.blue);}else if(p.type==='itemMiss'){this.text('El efecto ha fallado',w/2,y+150,30,C.gold,'center');}else{this.text(u.name+' · '+(p.type==='level'?'Nivel '+p.level:p.newClass),x+30,y+41,27,C.gold);this.portraitArt(u,x+28,y+90,158,200);T.stats.forEach((stat,i)=>{const left=x+219+(i%2)*166,top=y+98+Math.floor(i/2)*41;this.text(T.statLabels[stat],left,top,14,C.muted);this.text('+'+(p.gains[stat]||0),left+123,top,20,p.gains[stat]?C.green:C.text,'right');});}this.text('Enter / clic para continuar',w/2,y+347,13,C.muted,'center');};
T.statLabels={health:'PV',power:'Fuerza',magic:'Magia',skill:'Habilidad',speed:'Velocidad',luck:'Suerte',defense:'Defensa',resistance:'Resistencia',move:'Movimiento',build:'Constitución'};
V.helpWindow=function(title,text){const form=this.formShell(title),body=document.createElement('div');body.style.cssText='white-space:pre-wrap;line-height:1.6;max-height:55vh;overflow:auto';body.textContent=text||'No hay descripción en F9.';form.form.appendChild(body);form.button('Volver',form.close);};
const status=V.drawStatus,inventory=V.drawInventory;
V.drawStatus=function(m){const e=this.engine,u=e.unit(m.unit)||this.inspected();if(!u)return;const w=this.canvas.width,h=this.canvas.height,x=92,y=68;this.panel(x,y,w-184,h-136);this.text(u.name+' · '+e.cls(u).name,x+25,y+36,27,C.gold);this.portrait(u,x+24,y+74,182,177);this.text('Nivel '+u.level+' · EXP '+u.exp+' · PV '+u.hp+'/'+e.value(u,'health'),x+233,y+81,19,C.text);T.stats.filter(k=>k!=='health').forEach((stat,i)=>{const sx=x+236+i%3*172,sy=y+131+Math.floor(i/3)*46;this.text(T.statLabels[stat],sx,sy,12,C.muted);this.text(e.value(u,stat),sx,sy+21,22,C.text);});
 if(m.details){this.text('HABILIDADES ACTIVAS',x+25,y+289,13,C.gold);this.wrap(e.skillIds(u).map(id=>(e.db.skills[id]||{}).name||id).join(' · ')||'Sin habilidades',x+25,y+318,w-250,16,23,2);this.text('DOMINIO: '+Object.keys(u.ranks).map(k=>k+' '+u.ranks[k]).join(' · '),x+25,y+382,15,C.muted);}else u.inventory.slice(0,6).forEach((i,k)=>this.text((k===u.equipped?'◆ ':'· ')+e.itemData(i).name+' · '+i.uses,x+25+Math.floor(k/3)*338,y+290+(k%3)*32,18,C.text));
 this.button(m.details?'Inventario':'Rangos / Habilidades',x+24,h-127,240,()=>m.details=!m.details);this.button('Biografía / Ayuda',x+279,h-127,235,()=>{const skills=e.skillIds(u).map(id=>{const d=e.db.skills[id];return d?d.name+': '+(d.description||'Sin descripción'):'';}).join('\n\n');this.helpWindow(u.name,(u.profile||'Sin biografía en F9.')+'\n\nHABILIDADES ACTIVAS\n'+skills);});this.button('Cerrar',w-x-185,h-127,160,()=>this.menu=null);
};
V.drawInventory=function(m){inventory.call(this,m);const u=this.engine.unit(m.unit),item=u&&u.inventory[m.slot||0],d=item&&this.engine.itemData(item);if(d)this.button('Descripción',this.canvas.width-344,this.canvas.height-65,210,()=>this.helpWindow(d.name,d.description));};
V.drawMenu=function(){const e=this.engine,s=e.s,m=this.menu,u=e.unit(m.unit)||this.inspected(),w=this.canvas.width,h=this.canvas.height;
 if(m.type==='arena'){this.drawTournament(m);return;}
 if(['pending','groups','promotion','repair'].indexOf(m.type)<0){old.menu.call(this);if(m.type==='convoy'){this.button('Entregas pendientes ('+s.pendingItems.length+')',w/2-245,h-66,310,()=>this.menu={type:'pending',unit:u&&u.id});}if(m.type==='system')this.button('Datos de ejércitos',w/2-225,h-55,450,()=>this.menu={type:'groups'});return;}
 const title={pending:'Entregas pendientes',groups:'Datos de ejércitos',promotion:'Elegir promoción',repair:'Elegir arma a reparar'}[m.type],x=118,y=92;this.rect(0,0,w,h,'rgba(0,8,14,.8)');this.panel(x,y,w-236,h-184);this.text(title,x+24,y+34,28,C.gold);this.button('Volver',w-260,y+17,116,()=>this.menu=null);let top=y+86;
 if(m.type==='groups'){e.armyGroups().slice(0,8).forEach(row=>{this.text((s.teamNames[row.team]||row.team)+' · '+row.name,x+24,top,19,C.text);this.text('En campo '+row.alive+' · Caídos '+row.defeated+' · Retirados '+row.retreated,x+24,top+23,13,C.muted);top+=47;});return;}
 if(m.type==='pending'){const page=m.page||0;this.text('Destino: '+(u?u.name:'almacén'),x+24,top,15,C.muted);top+=30;s.pendingItems.slice(page*5,page*5+5).forEach((item,i)=>{const slot=page*5+i,d=e.itemData(item);this.fitText(d.name+' · '+item.uses+' usos',x+24,top,280,17,C.text);this.button('Recibir',x+316,top-18,106,()=>e.claimPending(slot,'unit',u),!!u&&u.inventory.length<s.options.inventory);this.button('Almacén',x+427,top-18,110,()=>e.claimPending(slot,'convoy'),s.convoy.length<s.options.convoy);this.button('×',x+543,top-18,58,()=>{this.menu={type:'pendingDiscard',slot,unit:u&&u.id};this.helpConfirm('Descartar '+d.name+'?',()=>{e.claimPending(slot,'discard');this.menu={type:'pending',unit:u&&u.id};},()=>this.menu={type:'pending',unit:u&&u.id});});top+=49;});if(!s.pendingItems.length)this.text('No hay entregas pendientes.',x+24,top,20,C.text);if(s.pendingItems.length>5)this.button('Página siguiente',x+24,h-149,220,()=>m.page=(page+1)%Math.ceil(s.pendingItems.length/5));return;}
 const target=e.unit(m.target)||u;
 if(m.type==='promotion'){const options=e.cls(target).promotions||[];options.forEach(id=>{const cls=e.db.classes[id];this.button(cls.name,x+24,top,340,()=>{if(m.slot===undefined)e.promote(target,id,m.ignoreLevel);else e.useItem(u,m.slot,target,{classId:id});this.menu=null;this.mode='move';},m.ignoreLevel||target.level>=(e.cls(target).promoteLevel||10));this.text(Object.keys(cls.promotionBonus||{}).map(k=>T.statLabels[k]+' +'+cls.promotionBonus[k]).join(' · '),x+24,top+52,13,C.muted);top+=88;});if(!options.length)this.text('No hay promociones para esta clase.',x+24,top,20,C.text);return;}
 if(m.type==='repair'){target.inventory.forEach((item,slot)=>{const d=e.itemData(item);if(item.kind!=='weapon')return;this.button(d.name+' · '+item.uses+'/'+d.uses+'  (1 uso del bastón)',x+24,top,w-284,()=>{e.useItem(u,m.slot,target,{slot});this.menu=null;this.mode='move';this.actionUnit=null;s.selected=u.acted?null:u.id;},d.uses>0&&item.uses<d.uses);top+=45;});}
};
V.helpConfirm=function(title,yes,no){const f=this.formShell(title);f.button('Confirmar',()=>{yes();f.close();});f.button('Cancelar',()=>{if(no)no();f.close();});};
G.art=function(view,u){const cls=view.engine.cls(u),variant=(cls.variants||{})[u.variant];if(variant&&variant.art){const pack=G.pack(view);return pack&&pack.units[variant.art]||old.art(view,u);}return old.art(view,u);};
G.clip=function(view,u,mode,strike){const e=view.engine,cls=e.cls(u),w=strike?e.db.weapons[strike.weaponId]:e.weapon(u),category=w&&w.category||'',distance=strike&&strike.distance>1?'far':'near',tracks=e.s.battleTracks||{},key=tracks[cls.id+':'+category+':'+distance]||tracks[cls.id+':'+category+':any']||tracks[cls.id+'::'+distance]||tracks[cls.id+'::any'];if(key&&(e.s.customTracks||{})[key])return e.s.customTracks[key];const variants=((cls.variants||{})[u.variant]||{}).battleAnimations||cls.battleAnimations||{},entry=variants[category+':'+distance]||variants[category]||variants[distance];if(entry){const chosen=entry[mode]||entry.normal||entry;if(typeof chosen==='string')return (e.db.graphics&&e.db.graphics.clips||{})[chosen]||old.clip(view,u,mode);if(chosen.frames)return chosen;}return old.clip(view,u,mode);};
G.face=function(view,u,x,y,w,h){const pack=G.pack(view),face=pack&&pack.faces&&(pack.faces[u.faceKey||u.actorId]||pack.faces.default),state=view.dialogueActor;if(!face||!state||u.face)return old.face(view,u,x,y,w,h);const expression=(face.expressions||{})[state.expression]||{},asset=Object.assign({},face,expression),image=G.bitmap(view,asset.path,u,false,'face');if(!image)return true;const features=T.copy(asset.features||[]),blink=view.frame%180;features.forEach((f,i)=>{if(f.frames){const frame=i===0?(blink>171?Math.min(f.frames.length-1,2):0):state.talking?Math.floor(view.frame/8)%f.frames.length:0;Object.assign(f,f.frames[frame]);}else if(image.width>=f.w*3){const frame=i===0?(blink>174?2:blink>170?1:0):state.talking?Math.floor(view.frame/8)%3:0;f.sx=frame*f.w;}});G.drawPortrait(view,G.portraitFrame(view,image,asset.rect||{x:0,y:0,w:asset.width,h:asset.height},features),x,y,w,h);return true;};
V.destroy=function(){if(this.nativeMap){if(this.nativeMap.lower)this.nativeMap.lower.destroy();if(this.nativeMap.upper)this.nativeMap.upper.destroy();this.nativeMap.stage.destroy({children:true});this.nativeMap=null;}old.destroy.call(this);};
G.nativeMap=function(view,m,above){const map=view.engine.s.map;if(map.mapGraphics!=='native'||!root.Tilemap||!root.Bitmap||!root.Stage)return false;const set=(view.engine.db.tilesets||[])[map.tilesetId];if(!set)return false;let state=view.nativeMap;if(!state||state.map!==map){if(state){state.stage.destroy({children:true});if(state.lower)state.lower.destroy();if(state.upper)state.upper.destroy();}const stage=new Stage(),tilemap=new Tilemap();tilemap.tileWidth=map.tileWidth||48;tilemap.tileHeight=map.tileHeight||48;tilemap.flags=set.flags||[];tilemap.setData(map.width,map.height,map.nativeData||[]);const bitmaps=(set.tilesetNames||[]).map(name=>name?ImageManager.loadTileset(name):new Bitmap(1,1));tilemap.setBitmaps(bitmaps);stage.addChild(tilemap);state=view.nativeMap={map,stage,tilemap,bitmaps};}
 if(!state.bitmaps.every(b=>b.isReady()))return true;const id=[view.offset.x,view.offset.y,m.tile,map.tileRevision||0,Math.floor(view.frame/30)].join(':');if(id!==state.id){state.id=id;const t=state.tilemap;t.width=m.cols*t.tileWidth;t.height=m.rows*t.tileHeight;t.scale.set(m.tile/t.tileWidth,m.tile/t.tileHeight);t.origin.set(view.offset.x*t.tileWidth,view.offset.y*t.tileHeight);t.animationCount=view.frame;t.animationFrame=Math.floor(view.frame/30);t.refresh();if(state.lower)state.lower.destroy();if(state.upper)state.upper.destroy();t._upperLayer.visible=false;t._lowerLayer.visible=true;state.lower=Bitmap.snap(state.stage);t._upperLayer.visible=true;t._lowerLayer.visible=false;state.upper=Bitmap.snap(state.stage);t._lowerLayer.visible=true;}
 const bitmap=above?state.upper:state.lower;if(bitmap)view.ctx.drawImage(bitmap.canvas,0,0,m.cols*m.tile,m.rows*m.tile,m.x,m.y,m.cols*m.tile,m.rows*m.tile);return true;
};
G.background=function(view,m){return G.nativeMap(view,m,false)||old.background(view,m);};
G.events=function(view,m,above){if(above)G.nativeMap(view,m,true);return old.events(view,m,above);};
V.drawTournament=function(m){const e=this.engine,s=e.s,t=s.tournament,u=e.unit(m.unit),w=this.canvas.width,h=this.canvas.height,x=150,y=104;this.panel(x,y,w-300,h-208);this.text('COLISEO',w/2,y+37,30,C.gold,'center');if(!t){const shop=(s.map.interactions||[]).find(i=>i.id===m.id)||{},wager=shop.wager||100,rounds=shop.rounds||3;this.wrap('Apuesta '+wager+' G y disputa hasta '+rounds+' rondas contra rivales de distintas clases. Entre rondas puedes cobrar y retirarte. Si pierdes una ronda, pierdes la apuesta. La práctica conserva la vida y el inventario del personaje.',x+34,y+101,w-368,18,29,6);this.button('Participar',x+34,h-220,w-368,()=>{e.startTournament(u,wager,rounds);e.tournamentRound();this.menu=null;},s.gold>=wager&&!!e.weapon(u)&&!e.weapon(u).staff);this.button('Salir',x+34,h-173,w-368,()=>this.menu=null);return;}
 this.text(u.name+' · '+t.wins+' / '+t.rounds+' victorias',w/2,y+94,23,C.text,'center');this.text('Último rival: '+t.lastRival,w/2,y+143,19,C.muted,'center');this.text({won:'Ronda ganada',lost:'Derrota',draw:'Empate: límite de intercambios',ready:'Listo'}[t.status],w/2,y+197,26,t.status==='lost'?C.red:C.gold,'center');if(t.status==='won'&&t.wins<t.rounds)this.button('Siguiente ronda',x+34,h-220,w-368,()=>{t.status='ready';e.tournamentRound();this.menu=null;});this.button(t.status==='lost'?'Terminar':t.wins>=t.rounds?'Cobrar premio':'Cobrar y retirarse',x+34,h-173,w-368,()=>{const gold=e.finishTournament();this.menu=null;e.notice('Coliseo: recibes '+gold+' G.');});
};
V.trackCues=function(p){p.trackPlayed=p.trackPlayed||{};this.combatTimeline(p).forEach(row=>{const u=this.engine.unit(row.strike.attacker),clip=G.clip(this,u,row.strike.critical?'critical':row.strike.hit?'normal':'miss',row.strike);(clip&&clip.cues||[]).forEach((cue,index)=>{const at=row.start+Math.floor(cue.frame*60/(clip.fps||60)),id=row.index+':'+index;if(p.trackPlayed[id]||(p.t||0)<at)return;p.trackPlayed[id]=true;if(cue.sound)this.playSample(cue.sound);if(cue.shake)p.shakeUntil={until:(p.t||0)+12,power:Math.min(15,Math.max(0,cue.shake))};if(cue.animationId&&this.hooks.animation)this.hooks.animation(cue.animationId,this.canvas.width*(row.strike.target===p.a?.30:.70),this.canvas.height-365);});});};
const combat=V.drawCombat;
V.drawCombat=function(p){this.ctx.save();if(p.shakeUntil&&p.t<p.shakeUntil.until)this.ctx.translate(Math.sin(p.t*2.3)*p.shakeUntil.power,0);combat.call(this,p);this.ctx.restore();};
const gallery=V.drawGallery;
V.drawGallery=function(){gallery.call(this);const list=this.gallery.actor?Object.values(this.engine.db.actors):Object.values(this.engine.db.classes),entry=list[this.gallery.index],classId=entry&&(this.gallery.actor?entry.classId:entry.id);this.button('Editor de pistas',270,this.canvas.height-46,316,()=>this.trackEditor(classId));this.button('Paletas RGB',600,this.canvas.height-46,this.canvas.width-624,()=>this.paletteEditor(classId));};
T.validateTrack=function(track,pack){T.assert(track&&Array.isArray(track.frames)&&track.frames.length&&track.frames.length<=1200,'La pista debe tener entre 1 y 1200 fotogramas');T.assert(Number.isFinite(track.fps)&&track.fps>=1&&track.fps<=120,'Velocidad de pista inválida');T.assert(Number.isInteger(track.impact)&&track.impact>=0&&track.impact<track.frames.length,'Impacto fuera de la pista');track.frames.forEach(frame=>{T.assert(Array.isArray(frame),'Cada fotograma debe tener capas');frame.forEach(layer=>{const atlas=pack&&pack.atlases&&pack.atlases[layer.atlas];T.assert(atlas&&atlas.rects[layer.rect],'Atlas o recorte inexistente');['x','y','zoom','angle','opacity'].forEach(k=>T.assert(layer[k]===undefined||Number.isFinite(layer[k]),'Transformación inválida: '+k));T.assert(layer.zoom===undefined||layer.zoom>0,'Escala inválida');T.assert(layer.opacity===undefined||layer.opacity>=0&&layer.opacity<=1,'Opacidad inválida');});});(track.cues||[]).forEach(c=>T.assert(Number.isInteger(c.frame)&&c.frame>=0&&c.frame<track.frames.length,'Señal fuera de la pista'));return track;};
V.trackEditor=function(classId){const e=this.engine,cls=e.db.classes[classId]||Object.values(e.db.classes)[0],base=G.clip(this,{classId:cls.id},'normal'),track=T.copy(base||{frames:[[]],fps:12,impact:0}),pack=e.db.graphics||{},f=this.formShell('Pistas de animación · '+cls.name);track.cues=track.cues||[];const name=f.add('Nombre de pista','text',cls.name+' propia'),fps=f.add('Fotogramas por segundo','number',track.fps||60),impact=f.add('Fotograma de lanzamiento / impacto','number',track.impact||0),frame=f.add('Fotograma a editar','number',0),layer=f.add('Capa a editar','number',0),atlas=f.add('Atlas de la capa','','',Object.keys(pack.atlases||{}).map(k=>({value:k,label:k}))),rect=f.add('Número de recorte','number',0),x=f.add('Desplazamiento X','number',0),y=f.add('Desplazamiento Y','number',0),zoom=f.add('Escala','number',1),angle=f.add('Ángulo','number',0),opacity=f.add('Opacidad (0 a 1)','number',1),mirror=f.add('Reflejar','','false',[{value:'false',label:'No'},{value:'true',label:'Sí'}]),blend=f.add('Mezcla','','0',[{value:'0',label:'Normal'},{value:'1',label:'Luz aditiva'}]),sound=f.add('Sonido en fotograma (clave del paquete)','text',''),shake=f.add('Temblor de cámara','number',0),animationId=f.add('Animación de F9 (0 = ninguna)','number',0),category=f.add('Tipo de arma (vacío = cualquiera)','text',''),distance=f.add('Distancia','','any',[{value:'any',label:'Cualquiera'},{value:'near',label:'Adyacente'},{value:'far',label:'A distancia'}]);
 const frameIndex=()=>{const i=Number(frame.value);T.assert(Number.isInteger(i)&&i>=0&&i<track.frames.length,'Fotograma fuera de la pista');return i;};
 f.button('Cargar capa',()=>{const row=track.frames[frameIndex()][Number(layer.value)];T.assert(row,'Capa inexistente');atlas.value=row.atlas;rect.value=row.rect;x.value=row.x||0;y.value=row.y||0;zoom.value=row.zoom===undefined?1:row.zoom;angle.value=row.angle||0;opacity.value=row.opacity===undefined?1:row.opacity;mirror.value=String(!!row.mirror);blend.value=String(row.blend||0);});
 f.button('Aplicar / añadir capa',()=>{const i=frameIndex(),li=Number(layer.value);T.assert(Number.isInteger(li)&&li>=0&&li<=track.frames[i].length,'Índice de capa inválido');const row={atlas:atlas.value,rect:Number(rect.value),x:Number(x.value),y:Number(y.value),zoom:Number(zoom.value),angle:Number(angle.value),opacity:Number(opacity.value),mirror:mirror.value==='true',blend:Number(blend.value)},candidate=T.copy(track);candidate.frames[i][li]=row;candidate.fps=Number(fps.value);candidate.impact=Number(impact.value);T.validateTrack(candidate,pack);track.frames[i][li]=row;});
 f.button('Duplicar fotograma',()=>{const at=frameIndex();track.frames.splice(at+1,0,T.copy(track.frames[at]));track.cues.forEach(c=>{if(c.frame>at)c.frame++;});if(Number(impact.value)>at)impact.value=Number(impact.value)+1;frame.value=at+1;});
 f.button('Eliminar fotograma',()=>{T.assert(track.frames.length>1,'Conserva al menos un fotograma');const at=frameIndex();track.frames.splice(at,1);track.cues=track.cues.filter(c=>c.frame!==at).map(c=>Object.assign(c,{frame:c.frame>at?c.frame-1:c.frame}));frame.value=Math.min(at,track.frames.length-1);impact.value=Math.min(Number(impact.value)>at?Number(impact.value)-1:Number(impact.value),track.frames.length-1);});
 f.button('Añadir señal al fotograma',()=>track.cues.push({frame:frameIndex(),sound:sound.value,shake:Number(shake.value)||0,animationId:Number(animationId.value)||0}));
 const save=()=>{track.fps=Number(fps.value);track.impact=Number(impact.value);T.validateTrack(track,pack);T.assert(name.value.trim(),'Pon nombre a la pista');e.s.customTracks=e.s.customTracks||{};e.s.battleTracks=e.s.battleTracks||{};e.s.customTracks[name.value]=T.copy(track);e.s.battleTracks[cls.id+':'+category.value+':'+distance.value]=name.value;};
 f.button('Guardar y previsualizar',()=>{save();f.close();this.openGallery();this.gallery.index=Object.values(e.db.classes).findIndex(c=>c.id===cls.id);});f.button('Exportar JSON',()=>{save();T.download(name.value+'.json',new Blob([JSON.stringify(track,null,2)],{type:'application/json'}));});const upload=f.add('Importar pista JSON','file','');upload.accept='.json';upload.onchange=()=>{const file=upload.files[0];if(!file)return;file.text().then(text=>{try{const value=T.validateTrack(JSON.parse(text),pack);Object.assign(track,value);fps.value=track.fps;impact.value=track.impact;frame.value=0;}catch(err){f.note.textContent=err.message;}});};f.button('Cerrar',f.close);
};
T.recolorPixels=function(data,palette,colors,gray){const replacements={},rgb=hex=>{if(!/^#[0-9a-f]{6}$/i.test(hex||''))return null;const n=parseInt(hex.slice(1),16);return [n>>16&255,n>>8&255,n&255];};['cloth','hair','skin'].forEach(part=>{const target=rgb((colors||{})[part]);if(!target)return;(palette[part]||[]).forEach(source=>{if(!Array.isArray(source)||source.length!==3||!source.every(v=>Number.isInteger(v)&&v>=0&&v<=255))return;const light=Math.max(...source)/255;replacements[source.join(',')]=target.map(v=>v*light);});});Object.keys(palette.exact||{}).forEach(key=>{const to=rgb(palette.exact[key]);if(to)replacements[key]=to;});let count=0;for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;const target=replacements[[data[i],data[i+1],data[i+2]].join(',')];if(target){data[i]=target[0];data[i+1]=target[1];data[i+2]=target[2];count++;}if(gray){const light=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);data[i]=data[i+1]=data[i+2]=light;}}return count;};
G.bitmap=function(view,path,u,flash,mode){const custom=(view.engine.s.resourcePalettes||{})[path]||(G.pack(view)&&G.pack(view).resourcePalettes||{})[path];if(!custom||!u||!u.customColors&&!custom.exact||flash)return old.bitmap(view,path,u,flash,mode);const base=old.bitmap(view,path,Object.assign({},u,{customColors:false,team:1,acted:false}),flash,mode);if(!base)return null;const key=path+':rgb:'+JSON.stringify([custom,u.customColors,u.colors,u.acted,mode]),cache=view.rgbImages||(view.rgbImages={});if(cache[key])return cache[key];const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;const ctx=canvas.getContext('2d');ctx.drawImage(base,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);T.recolorPixels(pixels.data,custom,u.customColors?u.colors:{},mode==='map'&&u.acted);ctx.putImageData(pixels,0,0);if(Object.keys(cache).length>128)view.rgbImages={};view.rgbImages[key]=canvas;return canvas;};

V.paletteEditor=function(classId){const e=this.engine,pack=e.db.graphics||{},f=this.formShell('Paletas RGB por recurso'),paths=Array.from(new Set(Object.values(pack.atlases||{}).map(a=>a.path).concat(Object.values(pack.faces||{}).map(f=>f.path)).concat(Object.values(pack.units||{}).reduce((all,a)=>all.concat(['map','walk','idle'].map(k=>a[k]&&a[k].path).filter(Boolean)),[])))),path=f.add('Recurso','','',paths.map(p=>({value:p,label:p}))),part=f.add('Asignar el color a','','cloth',[{value:'cloth',label:'Vestimenta'},{value:'hair',label:'Cabello'},{value:'skin',label:'Piel'},{value:'exact',label:'Color exacto'}]),exact=f.add('Nuevo color exacto RGB','color','#e85880'),canvas=document.createElement('canvas');canvas.style.cssText='max-width:100%;max-height:320px;object-fit:contain;image-rendering:pixelated;cursor:crosshair';f.form.appendChild(canvas);const note=document.createElement('p');note.textContent='Pulsa los colores del sprite para asignarlos. Se conserva el PNG y cada tono mantiene su intensidad.';f.form.appendChild(note);
 const load=()=>{if(!f.form.isConnected||!path.value){note.textContent='No hay recursos cargados. Instala un paquete gráfico para editar sus paletas.';return;}const img=this.image(path.value);if(!img){requestAnimationFrame(load);return;}canvas.width=img.width;canvas.height=img.height;canvas.getContext('2d').drawImage(img,0,0);};path.onchange=load;load();canvas.onclick=event=>{const r=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-r.left)*canvas.width/r.width),y=Math.floor((event.clientY-r.top)*canvas.height/r.height),d=canvas.getContext('2d').getImageData(x,y,1,1).data;if(!d[3])return;const rgb=Array.from(d.slice(0,3));e.s.resourcePalettes=e.s.resourcePalettes||{};const p=e.s.resourcePalettes[path.value]||(e.s.resourcePalettes[path.value]={cloth:[],hair:[],skin:[]});['cloth','hair','skin'].forEach(k=>p[k]=(p[k]||[]).filter(c=>c.join(',')!==rgb.join(',')));if(p.exact)delete p.exact[rgb.join(',')];if(part.value==='exact'){p.exact=p.exact||{};p.exact[rgb.join(',')]=exact.value;}else p[part.value].push(rgb);note.textContent='RGB '+rgb.join(', ')+' → '+part.value;this.rgbImages={};};f.button('Quitar asignaciones del recurso',()=>{if(e.s.resourcePalettes)delete e.s.resourcePalettes[path.value];this.rgbImages={};});f.button('Exportar paletas',()=>T.download('PaletasRGB.json',new Blob([JSON.stringify(e.s.resourcePalettes||{},null,2)],{type:'application/json'})));f.button('Cerrar',f.close);
};
})(typeof globalThis!=='undefined'?globalThis:this);
