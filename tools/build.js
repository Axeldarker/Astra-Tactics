#!/usr/bin/env node
// Genera los 3 plugins de dist/ a partir de src/.
//   dist/TacticsEngine.js  núcleo (reglas, comandos, notas, comandos rápidos). Sin dependencias de MZ: se prueba en Node.
//   dist/TacticsUI.js      interfaz (vista, gráficos, presentación, escenas).
//   dist/TacticsMZ.js      puente con RPG Maker MZ + cabecera de comandos generada desde el catálogo.
// Uso: node tools/build.js          (escribe dist/)
//      node tools/build.js --check  (falla si dist/ no está al día; útil en CI)
"use strict";
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,".."),SRC=path.join(ROOT,"src"),DIST=path.join(ROOT,"dist");
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,"package.json"),"utf8"));
const read=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const files=dir=>fs.readdirSync(path.join(SRC,dir)).filter(f=>f.endsWith(".js")).sort().map(f=>path.join(SRC,dir,f));
// Quita cabeceras de anotación /*: ... */ de los módulos: en un plugin MZ solo debe haber una.
const strip=code=>code.replace(/\/\*:[\s\S]*?\*\/\n?/g,"").replace(/^\/\* TacticsMZ \| Copyright[^\n]*\n/m,"");
const LICENSE="/* TacticsMZ v"+pkg.version+" | Copyright (c) 2026 TacticsMZ contributors | MIT License */\n/* Archivo generado por tools/build.js desde src/. No lo edites a mano. */\n";

function header(lines){return "/*:\n"+lines.map(l=>l===""?" *":" * "+l).join("\n")+"\n */\n";}

// ---------- anotaciones de comandos ----------
function argLines(f,tag){
 const out=[tag+" "+f.id,"@text "+f.label];
 const def=Array.isArray(f.value)?"[]":f.value===undefined||f.value===null?"":String(f.value);
 if(f.type==="number"||f.type==="map")out.push("@type number","@min -999999","@max 999999");
 else if(f.type==="file")out.push("@type file","@dir audio/bgm/");
 else if(f.type==="select"){out.push("@type select");Object.keys(f.options).forEach(k=>out.push("@option "+f.options[k],"@value "+k));}
 else out.push("@type "+f.type);
 out.push("@default "+def);return out;
}
function commandLines(c){const out=["@command "+c.id,"@text "+c.label,"@desc "+c.help];c.fields.forEach(f=>out.push(...argLines(f,"@arg")));return out;}
function structBlock(name,fields){return "/*~struct~"+name+":\n"+fields.map(f=>argLines(f,"@param").map(l=>" * "+l).join("\n")).join("\n")+"\n */\n";}

function loadEngine(code){
 const sandbox={};sandbox.globalThis=sandbox;
 new Function("globalThis","module",code)(sandbox,undefined);
 return sandbox.Tactics;
}

function build(){
 const core=files("core"),ui=files("ui");
 const engineBody=core.map(f=>"// ===== "+path.relative(ROOT,f).replace(/\\/g,"/")+" =====\n"+strip(read(f))).join("\n");
 const guard='(function(root){if(root.Tactics&&root.Tactics.Engine)throw new Error("TacticsEngine: hay plugins antiguos de TacticsMZ activos (TacticsSystem, TacticsCommands, TacticsRules, TacticsView, TacticsGraphics, TacticsPresentation, TacticsScenes, TacticsData). Desactívalos: TacticsEngine los sustituye.");})(typeof globalThis!=="undefined"?globalThis:this);\n';
 const engine=LICENSE+header(["@target MZ","@plugindesc v"+pkg.version+" TacticsMZ · Núcleo: reglas, comandos, notas F9 y comandos rápidos.","@author TacticsMZ contributors","@url https://opensource.org/license/mit","@orderBefore TacticsUI","@orderBefore TacticsMZ","@help","Librería núcleo de TacticsMZ. No tiene comandos propios: los muestra TacticsMZ.","Orden: TacticsEngine, TacticsUI, TacticsMZ.","Sustituye a TacticsSystem, TacticsCommands, TacticsRules y TacticsData."])+guard+engineBody;
 const uiCode=LICENSE+header(["@target MZ","@plugindesc v"+pkg.version+" TacticsMZ · Interfaz: vista, gráficos, presentación y escenas.","@author TacticsMZ contributors","@url https://opensource.org/license/mit","@base TacticsEngine","@orderAfter TacticsEngine","@orderBefore TacticsMZ","@help","Interfaz de TacticsMZ. Diseño de 960 x 640.","Sustituye a TacticsView, TacticsGraphics, TacticsPresentation y TacticsScenes."])+ui.map(f=>"// ===== "+path.relative(ROOT,f).replace(/\\/g,"/")+" =====\n"+strip(read(f))).join("\n");

 const T=loadEngine(engineBody);
 const quick=T.catalog.filter(c=>c.quick),classic=T.catalog.filter(c=>!c.quick);
 const presetFields=[{id:"name",label:"Nombre de la plantilla (lo escribes en ★ Enemigo)",type:"string",value:"Soldado"},{id:"classId",label:"Clase",type:"class",value:0},{id:"level",label:"Nivel",type:"number",value:1},
  {id:"role",label:"Rol",type:"select",value:"soldier",options:Object.fromEntries(Object.keys(T.roles).map(k=>[k,T.roles[k].label]))},
  {id:"weaponId",label:"Arma (0 = la de la clase)",type:"weapon",value:0},{id:"itemId",label:"Objeto (0 = ninguno)",type:"item",value:0},{id:"loot",label:"Suelta lo que lleva al caer",type:"boolean",value:false}];
 const helpLines=read(path.join(SRC,"mz","help.txt")).trimEnd().split("\n");
 const mzLines=["@target MZ","@plugindesc v"+pkg.version+" TacticsMZ: crea campañas tácticas con comandos de evento.","@author TacticsMZ contributors","@url https://opensource.org/license/mit","@base TacticsEngine","@base TacticsUI","@orderAfter TacticsUI",
  "@param ResourcePack","@text Paquete de gráficos externo (JSON)","@type string","@default","",
  "@param EnemyPresets","@text Plantillas de enemigo","@desc Define cada tipo de enemigo una vez (clase, nivel, rol, arma) y úsalo por nombre en ★ Enemigo.","@type struct<EnemyPreset>[]","@default []",
  "@help",...helpLines,""];
 quick.concat(classic).forEach(c=>{mzLines.push(...commandLines(c),"");});
 const structs=Object.keys(T.structures).map(k=>structBlock(k,T.structures[k])).join("")+structBlock("EnemyPreset",presetFields);
 const mz=LICENSE+header(mzLines)+structs+strip(read(path.join(SRC,"mz","Bridge.js")));
 return {"TacticsEngine.js":engine,"TacticsUI.js":uiCode,"TacticsMZ.js":mz};
}

// Astra Editor: un solo HTML con el motor, el modelo del editor y los 3 plugins (para instalarlos/actualizarlos).
function buildEditor(plugins){
 const safe=code=>code.replace(/<\/script/gi,"<\\/script");
 const engine=plugins["TacticsEngine.js"].replace(/^\/\*:[\s\S]*?\*\/\n/m,"");
 const editor=files("editor").map(f=>strip(read(f))).join("\n");
 const app=["project.js","tilemap.js","app.js"].map(f=>read(path.join(SRC,"app",f))).join("\n");
 const bundle="window.ASTRA_PLUGINS="+JSON.stringify(plugins)+";\nwindow.ASTRA_VERSION="+JSON.stringify(pkg.version)+";\n";
 return read(path.join(SRC,"app","shell.html")).replace("/*CSS*/",()=>read(path.join(SRC,"app","style.css")))
  .replace("/*ENGINE*/",()=>safe(engine)).replace("/*EDITOR*/",()=>safe(editor)).replace("/*APP*/",()=>safe(bundle+app));
}
const out=build();out["AstraEditor.html"]=buildEditor(Object.assign({},out));let stale=false;const check=process.argv.includes("--check");
if(!check&&!fs.existsSync(DIST))fs.mkdirSync(DIST);
Object.keys(out).forEach(name=>{const file=path.join(DIST,name),old=fs.existsSync(file)?fs.readFileSync(file,"utf8"):null;
 if(check){if(old!==out[name]){stale=true;console.error("Desactualizado: dist/"+name);}}
 else{fs.writeFileSync(file,out[name]);console.log("dist/"+name+"  "+(out[name].length/1024).toFixed(1)+" KB");}
});
if(stale){console.error("Ejecuta: node tools/build.js");process.exit(1);}
module.exports={build};
