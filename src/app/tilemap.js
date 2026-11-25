// Astra Editor · dibujo del mapa tal como lo ve el editor de MZ (capas 0-3, sombras y autotiles).
// Sigue las mismas reglas que Tilemap de rmmz_core.js; las tablas de autotiles se leen del proyecto.
"use strict";
(function(){
const Astra=window.Astra;
const ID={B:0,C:256,D:512,E:768,A5:1536,A1:2048,A2:2816,A3:4352,A4:5888,MAX:8192};
const isAutotile=id=>id>=ID.A1;
const isA1=id=>id>=ID.A1&&id<ID.A2,isA2=id=>id>=ID.A2&&id<ID.A3,isA3=id=>id>=ID.A3&&id<ID.A4,isA4=id=>id>=ID.A4&&id<ID.MAX,isA5=id=>id>=ID.A5&&id<ID.A1;
const kindOf=id=>Math.floor((id-ID.A1)/48),shapeOf=id=>(id-ID.A1)%48;
const isShadowing=id=>isA3(id)||isA4(id);

// Carga las 9 imágenes del tileset (A1..A5, B..E).
Astra.loadTileset=async function(p,tilesetId){
 const ts=(p.tilesets||[])[tilesetId];if(!ts)return {ts:null,images:[]};
 const images=await Promise.all((ts.tilesetNames||[]).map(n=>n?Astra.image(p,"img/tilesets/"+n+".png"):null));
 return {ts,images};
};

Astra.drawTilemap=function(ctx,map,tileset,tables,tw,th,frame){
 const W=map.width,H=map.height,data=map.data||[],flags=(tileset.ts&&tileset.ts.flags)||[],img=tileset.images||[];
 const read=(x,y,z)=>x>=0&&y>=0&&x<W&&y<H?data[(z*H+y)*W+x]||0:0;
 const isTable=id=>isA2(id)&&(flags[id]&0x80);
 const rect=(set,sx,sy,dx,dy,w,h)=>{const im=img[set];if(im)ctx.drawImage(im,sx,sy,w,h,dx,dy,w,h);};
 const normal=(id,dx,dy)=>{const set=isA5(id)?4:5+Math.floor(id/256);const sx=(Math.floor(id/128)%2*8+id%8)*tw,sy=Math.floor(id%256/8)%16*th;rect(set,sx,sy,dx,dy,tw,th);};
 const auto=(id,dx,dy)=>{
  const kind=kindOf(id),shape=shapeOf(id),tx=kind%8,ty=Math.floor(kind/8);let set=0,bx=0,by=0,table=tables&&tables.FLOOR,tableTile=false;
  if(!tables){ctx.fillStyle="#5b7a5a";ctx.fillRect(dx,dy,tw,th);return;}
  if(isA1(id)){const water=[0,1,2,1][(frame||0)%4];set=0;
   if(kind===0){bx=water*2;by=0;}else if(kind===1){bx=water*2;by=3;}else if(kind===2){bx=6;by=0;}else if(kind===3){bx=6;by=3;}
   else{bx=Math.floor(tx/4)*8;by=ty*6+Math.floor(tx/2)%2*3;if(kind%2===0)bx+=water*2;else{bx+=6;table=tables.WATERFALL;by+=(frame||0)%3;}}}
  else if(isA2(id)){set=1;bx=tx*2;by=(ty-2)*3;tableTile=isTable(id);}
  else if(isA3(id)){set=2;bx=tx*2;by=(ty-6)*2;table=tables.WALL;}
  else if(isA4(id)){set=3;bx=tx*2;by=Math.floor((ty-10)*2.5+(ty%2===1?0.5:0));if(ty%2===1)table=tables.WALL;}
  const q=table[shape],w1=tw/2,h1=th/2;if(!q)return;
  for(let i=0;i<4;i++){const qsx=q[i][0],qsy=q[i][1],sx1=(bx*2+qsx)*w1,sy1=(by*2+qsy)*h1,dx1=dx+(i%2)*w1,dy1=dy+Math.floor(i/2)*h1;
   if(tableTile&&(qsy===1||qsy===5)){const qsx2=qsy===1?(4-qsx)%4:qsx;rect(set,(bx*2+qsx2)*w1,(by*2+3)*h1,dx1,dy1,w1,h1);rect(set,sx1,sy1,dx1,dy1+h1/2,w1,h1/2);}
   else rect(set,sx1,sy1,dx1,dy1,w1,h1);}
 };
 const tile=(id,dx,dy)=>{if(id<=0||id>=ID.MAX)return;if(isAutotile(id))auto(id,dx,dy);else normal(id,dx,dy);};
 const tableEdge=(id,dx,dy)=>{if(!isA2(id)||!tables)return;const kind=kindOf(id),q=tables.FLOOR[shapeOf(id)],tx=kind%8,ty=Math.floor(kind/8),bx=tx*2,by=(ty-2)*3,w1=tw/2,h1=th/2;
  for(let i=0;i<2;i++){const qsx=q[2+i][0],qsy=q[2+i][1];rect(1,(bx*2+qsx)*w1,(by*2+qsy)*h1+h1/2,dx+(i%2)*w1,dy,w1,h1/2);}};
 const shadow=(bits,dx,dy)=>{if(!(bits&0x0f))return;ctx.fillStyle="rgba(0,0,0,0.5)";const w1=tw/2,h1=th/2;for(let i=0;i<4;i++)if(bits&(1<<i))ctx.fillRect(dx+(i%2)*w1,dy+Math.floor(i/2)*h1,w1,h1);};
 // Capa inferior (0, 1, sombras, bordes de mesa) y luego superior (2, 3), como hace MZ con lo que no es "estrella".
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const dx=x*tw,dy=y*th,t0=read(x,y,0),t1=read(x,y,1);
  tile(t0,dx,dy);tile(t1,dx,dy);shadow(read(x,y,4),dx,dy);
  const up=read(x,y-1,1);if(isTable(up)&&!isTable(t1)&&!isShadowing(t0))tableEdge(up,dx,dy);}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){tile(read(x,y,2),x*tw,y*th);tile(read(x,y,3),x*tw,y*th);}
};
Astra.regionAt=(map,x,y)=>(map.data||[])[(5*map.height+y)*map.width+x]||0;
Astra.setRegion=(map,x,y,r)=>{map.data[(5*map.height+y)*map.width+x]=r;};
})();
