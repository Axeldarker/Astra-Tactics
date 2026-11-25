/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
(function(root){
"use strict";
const T=root.Tactics;
T.audioBridge=function(manager){return {
 battleStart:(p,name)=>{if(p.mapBgm===undefined)p.mapBgm=T.copy(manager.saveBgm());manager.playBgm({name,volume:80,pitch:100,pan:0});},
 battleEnd:p=>{if(p.mapBgm&&p.mapBgm.name)manager.replayBgm(p.mapBgm);else manager.stopBgm();},
 victory:name=>{if(name)manager.playMe({name,volume:85,pitch:100,pan:0});}
};};
if(typeof Scene_Base==="undefined")return;
T.assert(T.catalog&&T.readDatabase&&T.desugarMap,"TacticsMZ: falta TacticsEngine.js. Actívalo encima de TacticsMZ en el Administrador de plugins.");
T.assert(T.View&&T.presentation,"TacticsMZ: falta TacticsUI.js. Actívalo entre TacticsEngine y TacticsMZ en el Administrador de plugins.");
const pluginParams=PluginManager.parameters("TacticsMZ");
T.setEnemyPresets(T.decode(pluginParams.EnemyPresets||"[]"));
const resourceName=String(pluginParams.ResourcePack||"");
if(resourceName){T.assert(/^[a-zA-Z0-9_/-]+$/.test(resourceName),"Nombre de paquete gráfico inválido");DataManager._databaseFiles.push({name:"$dataTacticsGraphics",src:resourceName+".json"});}
let active=null,pending=null,opening=false,resume=false;
const database=()=>{const db=T.readDatabase({classes:$dataClasses,actors:$dataActors,weapons:$dataWeapons,items:$dataItems,skills:$dataSkills,states:$dataStates});db.tilesets=T.copy(root.$dataTilesets||[]);if(root.$dataTacticsGraphics){db.graphics=T.copy(root.$dataTacticsGraphics);if(db.graphics.terrain)db.terrain=db.graphics.terrain;}return db;};
function synchronize(){
 if(!active)return;const s=active.s;$gameParty._gold=s.gold;
 Object.keys(s.flags).forEach(k=>$gameSwitches.setValue(Number(k),s.flags[k]));Object.keys(s.vars).forEach(k=>$gameVariables.setValue(Number(k),s.vars[k]));
 Object.keys(s.self).forEach(k=>{const a=k.split(":");$gameSelfSwitches.setValue([s.map.id,Number(a[0]),a[1]],s.self[k]);});
}
function loadMap(id){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("GET","data/Map"+String(id).padStart(3,"0")+".json");xhr.onload=()=>{try{if(xhr.status>=400)throw new Error("Mapa no encontrado: "+id);resolve(T.compileMap(JSON.parse(xhr.responseText),id));}catch(e){reject(e);}};xhr.onerror=()=>reject(new Error("No se pudo leer mapa "+id));xhr.send();});}
function open(id,continuation){
 if(opening)return;opening=true;
 loadMap(id).then(map=>{
  if(continuation&&active)active.nextMission(map);else{
   active=new T.Engine(database(),map);$gameSwitches._data.forEach((v,k)=>active.s.flags[k]=v);$gameVariables._data.forEach((v,k)=>active.s.vars[k]=v);
  }
  pending=active;opening=false;SceneManager.goto(Scene_Tactics);
 }).catch(error=>{opening=false;SceneManager.catchException(error);});
}
T.openMission=open;T.activeEngine=()=>active;
T.catalog.forEach(def=>PluginManager.registerCommand("TacticsMZ",def.id,function(args){
 const a=T.args(def.id,args);
 if(def.id==="Start"){open(a.mapId||$gameMap.mapId(),false);this.setWaitMode("tactics");}
 else if(active&&!def.definition)active.command(def.id,a,{event:this.eventId(),context:{},branches:[]});
}));
const interpreterWait=Game_Interpreter.prototype.updateWaitMode;
Game_Interpreter.prototype.updateWaitMode=function(){if(this._waitMode==="tactics"){if(opening||SceneManager._scene instanceof Scene_Tactics)return true;this._waitMode="";return false;}return interpreterWait.call(this);};
class Scene_Tactics extends Scene_Base {
 create(){
  super.create();active=pending||active;pending=null;T.assert(active,"No hay misión activa");
  this._canvas=document.createElement("canvas");this._canvas.width=Graphics.width;this._canvas.height=Graphics.height;
  this._bitmap=new Bitmap(Graphics.width,Graphics.height);this._sprite=new Sprite(this._bitmap);this.addChild(this._sprite);
  this._view=new T.View(this._canvas,active,{saveMenu:()=>{synchronize();SceneManager.push(Scene_Save);},save:(state,slot)=>{synchronize();DataManager.saveGame(slot).then(()=>active.notice("Partida guardada en ranura "+slot)).catch(e=>active.notice("No se pudo guardar: "+e.message));},next:id=>{if(id)open(id,true);else active.notice("Campaña terminada");},music:p=>{if(p.kind==="stop")AudioManager.stopBgm();else if(p.name)AudioManager[p.kind==="se"?"playSe":"playBgm"]({name:p.name,volume:p.volume,pitch:p.pitch,pan:0});}});
  Object.assign(this._view.hooks,T.audioBridge(AudioManager));
  this._view.hooks.animation=(id,x,y)=>{const data=$dataAnimations[id];if(!data)return;const target=new Sprite(new Bitmap(1,1));target.x=x;target.y=y;this.addChild(target);const sprite=data.frames?new Sprite_AnimationMV():new Sprite_Animation();sprite.setup([target],data,false,0);this.addChild(sprite);this._tacticalAnimations=this._tacticalAnimations||[];this._tacticalAnimations.push({sprite,target});};
  this._view.attach(Graphics.app.view);T.currentView=this._view;
 }
 update(){super.update();this._view.update();this._view.draw();this._bitmap.context.clearRect(0,0,Graphics.width,Graphics.height);this._bitmap.context.drawImage(this._canvas,0,0);this._bitmap.baseTexture.update();this._tacticalAnimations=(this._tacticalAnimations||[]).filter(a=>{if(a.sprite.isPlaying())return true;this.removeChild(a.sprite);this.removeChild(a.target);a.sprite.destroy();a.target.bitmap.destroy();a.target.destroy();return false;});}
 terminate(){super.terminate();synchronize();this._view.destroy();this._bitmap.destroy();}
}
T.Scene=Scene_Tactics;
const make=DataManager.makeSaveContents;
DataManager.makeSaveContents=function(){const contents=make.call(this);if(active)contents.tactics=active.save();return contents;};
const extract=DataManager.extractSaveContents;
DataManager.extractSaveContents=function(contents){extract.call(this,contents);active=contents.tactics?new T.Engine(database(),null,contents.tactics):null;resume=!!active;};
const setup=DataManager.setupNewGame;
DataManager.setupNewGame=function(){active=null;pending=null;resume=false;setup.call(this);};
const mapStart=Scene_Map.prototype.start;
Scene_Map.prototype.start=function(){mapStart.call(this);if(resume&&active){resume=false;pending=active;SceneManager.goto(Scene_Tactics);}};
const titleCommands=Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList=function(){titleCommands.call(this);this.addCommand("Animaciones","tacticsAnimations");};
const titleWindow=Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow=function(){titleWindow.call(this);this._commandWindow.setHandler("tacticsAnimations",()=>SceneManager.push(Scene_TacticsGallery));};
class Scene_TacticsGallery extends Scene_Base {
 create(){super.create();const data=database(),e=new T.Engine(data,{id:0,title:"Galería",width:1,height:1,tiles:[0],objective:"manual",units:[]});
  const canvas=document.createElement("canvas");canvas.width=Graphics.width;canvas.height=Graphics.height;this._canvas=canvas;this._bitmap=new Bitmap(Graphics.width,Graphics.height);this.addChild(new Sprite(this._bitmap));this._view=new T.View(canvas,e);this._view.attach(Graphics.app.view);this._view.openGallery();}
 update(){super.update();if(!this._view.gallery&&!this._view.form){SceneManager.pop();return;}this._view.draw();this._bitmap.context.drawImage(this._canvas,0,0);this._bitmap.baseTexture.update();}
 terminate(){super.terminate();this._view.destroy();this._bitmap.destroy();}
}
// The title uses the same panels as the tactical scene. Native new/load handlers remain in charge.
if(T.presentation){
 const createTitle=Scene_Title.prototype.create,updateTitle=Scene_Title.prototype.update,endTitle=Scene_Title.prototype.terminate;
 Scene_Title.prototype.create=function(){
  createTitle.call(this);this._commandWindow.hide();this._commandWindow.deactivate();
  const canvas=document.createElement('canvas');canvas.width=Graphics.width;canvas.height=Graphics.height;
  const engine=new T.Engine(database(),{id:0,title:'',width:1,height:1,units:[],objective:'manual'}),view=this._tacticsTitle=new T.View(canvas,engine);this._tacticsTitleBitmap=new Bitmap(Graphics.width,Graphics.height);this.addChild(new Sprite(this._tacticsTitleBitmap));this._tacticsTitleIndex=0;
  const items=this._tacticsTitleItems=[{label:'Nueva partida',fn:()=>this.commandNewGame()},{label:'Continuar',enabled:DataManager.isAnySavefileExists(),fn:()=>this.commandContinue()},{label:'Animaciones',fn:()=>SceneManager.push(Scene_TacticsGallery)},{label:'Controles',fn:()=>view.menu={type:'controls'}},{label:'Misiones del editor',fn:()=>{
   const f=view.formShell('Misiones del editor'),select=f.add('Misión','',1,$dataMapInfos.filter(Boolean).map(m=>({value:m.id,label:m.name})));f.button('Abrir misión',()=>{DataManager.setupNewGame();f.close();open(Number(select.value),false);});f.button('Volver',f.close);
  }}];
  view.key=k=>{if(view.form)return;if(view.menu){if(k==='Escape'||k==='Enter'||k==='z')view.menu=null;return;}if(k==='ArrowUp'||k==='ArrowDown')this._tacticsTitleIndex=(this._tacticsTitleIndex+(k==='ArrowUp'?items.length-1:1))%items.length;if(k==='Enter'||k==='z'||k===' '){const item=items[this._tacticsTitleIndex];if(item.enabled!==false)item.fn();}};
  view.click=(x,y)=>{if(view.form)return;const button=view.buttons.slice().reverse().find(b=>x>=b.x&&y>=b.y&&x<b.x+b.w&&y<b.y+b.h);if(button)button.fn();};view.attach(Graphics.app.view);
 };
 Scene_Title.prototype.update=function(){updateTitle.call(this);const v=this._tacticsTitle;if(!v)return;v.drawTitle('TacticsMZ',this._tacticsTitleItems,this._tacticsTitleIndex);if(v.menu){if(v.menu.type==='system')v.menu=null;else v.drawMenu();}this._tacticsTitleBitmap.context.clearRect(0,0,Graphics.width,Graphics.height);this._tacticsTitleBitmap.context.drawImage(v.canvas,0,0);this._tacticsTitleBitmap.baseTexture.update();};
 Scene_Title.prototype.terminate=function(){if(this._tacticsTitle){this._tacticsTitle.destroy();this._tacticsTitleBitmap.destroy();}endTitle.call(this);};
}
})(typeof globalThis!=="undefined"?globalThis:this);
