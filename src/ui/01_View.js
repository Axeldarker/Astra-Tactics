/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
/*:
 * @target MZ
 * @plugindesc TacticsMZ: interfaz, creador RGB, galería y taller. Cargar antes de TacticsMZ.
 * @author TacticsMZ contributors
 * @help Los gráficos geométricos y sonidos sintetizados de ejemplo se generan con este código MIT.
 */
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
