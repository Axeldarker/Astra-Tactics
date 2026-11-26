// Astra Editor · iconos grandes (32×32) de la paleta de herramientas, dibujados por capas.
// Cada capa se rellena con figuras simples (rectángulos, elipses, polígonos, líneas), se sombrea
// según sus bordes y recibe un contorno oscuro; al apilarlas, el contorno de una capa separa
// las piezas de la de abajo. El resultado son filas de letras como Astra.PIXEL, con su propia
// paleta (Astra.PAL32) y nombres "big:<herramienta>".
"use strict";
(function(){
const Astra=window.Astra;
const N=32;
Astra.PAL32={
 k:"#170f1c",
 y:"#fff3a8",g:"#f4c544",G:"#c08a2a",h:"#7d5317",            // oro
 R:"#ff8270",r:"#d8403a",D:"#8e2025",                          // rojo
 U:"#9fd0ff",u:"#4286e6",N:"#24509f",M:"#16316c",              // azul
 o:"#f6f8fa",s:"#bfc8d2",S:"#808b98",T:"#4c5462",              // acero
 n:"#e6ad6a",B:"#b5743c",b:"#7e4824",c:"#4f2b15",              // madera
 V:"#a6e57a",v:"#55b54c",F:"#2f7d38",                          // hierba
 w:"#f5e7c4",W:"#d4b98a",                                      // muro
 a:"#d2ccbf",A:"#968e81",Z:"#625c53",                          // piedra
 x:"#fffaf0",l:"#ffe680"                                       // tela blanca, luz
};
const inside=(p,x,y)=>{let r=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)r=!r;}return r;};
function layer(opt){
 const g=Array.from({length:N},()=>Array(N).fill(".")),o={g,raw:!!(opt&&opt.raw)};
 const each=fn=>{for(let j=0;j<N;j++)for(let i=0;i<N;i++)fn(i,j);};
 o.set=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<N&&y<N)g[y][x]=c;return o;};
 o.rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)o.set(i,j,c);return o;};
 o.ell=(cx,cy,rx,ry,c,clip)=>{each((i,j)=>{const dx=(i+.5-cx)/rx,dy=(j+.5-cy)/ry;if(dx*dx+dy*dy<=1&&(!clip||clip(i,j)))g[j][i]=c;});return o;};
 o.poly=(pts,c)=>{each((i,j)=>{if(inside(pts,i+.5,j+.5))g[j][i]=c;});return o;};
 o.line=(x0,y0,x1,y1,c,w)=>{w=w||1;const n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))*2)+1;
  for(let t=0;t<=n;t++){const x=x0+(x1-x0)*t/n,y=y0+(y1-y0)*t/n;o.rect(Math.round(x-(w-1)/2),Math.round(y-(w-1)/2),w,w,c);}return o;};
 o.px=(list,c)=>{list.forEach(p=>o.set(p[0],p[1],c));return o;};
 // Sustituye un color por otro donde se cumpla la condición.
 o.recolor=(from,to,cond)=>{each((i,j)=>{if(g[j][i]===from&&(!cond||cond(i,j)))g[j][i]=to;});return o;};
 // Luz arriba/izquierda y sombra abajo/derecha en los bordes de la figura (o de un color concreto).
 o.shade=(c,lt,dk,sides)=>{const s=g.map(r=>r.slice()),out=(i,j)=>!(s[j]&&s[j][i]===c);
  each((i,j)=>{if(s[j][i]!==c)return;
   if(dk&&out(i,j+1))g[j][i]=dk;else if(lt&&out(i,j-1))g[j][i]=lt;
   else if(sides&&dk&&out(i+1,j))g[j][i]=dk;else if(sides&&lt&&out(i-1,j))g[j][i]=lt;});return o;};
 return o;
}
function outline(g){const s=g.map(r=>r.slice());
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){if(s[j][i]!==".")continue;
  if([[1,0],[-1,0],[0,1],[0,-1]].some(d=>{const v=s[j+d[1]]&&s[j+d[1]][i+d[0]];return v&&v!=="."&&v!=="k";}))g[j][i]="k";}}
function compose(){const g=Array.from({length:N},()=>Array(N).fill("."));
 [].forEach.call(arguments,l=>{if(!l.raw)outline(l.g);l.g.forEach((r,j)=>r.forEach((c,i)=>{if(c!==".")g[j][i]=c;}));});
 return g.map(r=>r.join(""));}

// ---------- diseños ----------
function select(){
 const a=layer().poly([[7,3],[7,26],[12.5,21],[16.5,29.5],[21,27.5],[17,19.5],[24.5,19.5]],"g").shade("g","y","G",true);
 a.line(9,7,9,20,"y");
 const spark=layer({raw:true}).px([[25,4],[25,5],[25,7],[25,8],[23,6],[24,6],[26,6],[27,6]],"y").px([[25,6]],"x");
 return compose(a,spark);
}
function knight(team){
 const red=team==="enemy",C=red?{l:"R",m:"r",d:"D"}:{l:"U",m:"u",d:"N"};
 const body=layer().ell(14,30,12,9,C.m).shade(C.m,C.l,C.d);                    // hombros y tabardo
 body.ell(5.5,24,4.5,3.5,"s").ell(22.5,24,4.5,3.5,"s").shade("s","o","S");    // hombreras
 body.rect(13,22,2,8,"g");                                                     // franja dorada
 const neck=layer().rect(10,18,9,5,"S");
 const helm=layer().ell(14.5,12,7.5,8.5,"s").rect(7,12,15,7,"s").shade("s","o","S",true);
 helm.rect(8,13,13,2,"k").rect(13.5,15,2,4,"k");                               // visera
 helm.line(11,5,11,10,"o");
 const crest=layer();
 if(red){crest.poly([[7,8],[3,2],[5,1],[9,6]],"x").poly([[22,8],[26,2],[24,1],[20,6]],"x").shade("x",null,"a");}   // cuernos
 else crest.ell(14.5,3.5,2.5,3,C.m).rect(13,3,3,3,C.m).shade(C.m,C.l,C.d);    // penacho
 const front=layer();
 if(red){front.line(27,6,22,24,"s",2).line(27,6,22,24,"o").rect(19,22,7,2,"G").rect(21,24,3,4,"b");}            // espada
 else{front.poly([[19,15],[30,15],[30,23],[24.5,30],[19,23]],C.m).shade(C.m,C.l,C.d,true);
  front.poly([[20.5,16.5],[28.5,16.5],[28.5,22.5],[24.5,28],[20.5,22.5]],C.m).recolor(C.m,C.m);
  front.rect(24,17,1,10,"g").rect(21,20,7,1,"g");}                            // escudo con cruz
 return compose(body,neck,helm,crest,front);
}
function chest(){
 const body=layer().rect(3,15,26,13,"B").shade("B","n","b",true);
 for(let y=19;y<27;y+=4)body.rect(4,y,24,1,"b");
 body.rect(6,15,3,13,"g").rect(23,15,3,13,"g").shade("g","y","G");
 const lid=layer().rect(3,10,26,6,"B").ell(16,11,13,5,"B",(i,j)=>j<11).shade("B","n","b",true);
 lid.rect(6,7,3,9,"g").rect(23,7,3,9,"g").recolor("g","y",(i,j)=>j<9).recolor("B","b",(i,j)=>j===15);
 const lock=layer().rect(13,13,6,7,"g").shade("g","y","G",true).rect(15,15,2,3,"k");
 return compose(body,lid,lock);
}
function door(){
 const arch=layer().rect(4,10,24,20,"a").ell(16,11,12,8.5,"a",(i,j)=>j<11).shade("a","x","A",true);
 [[4,15],[4,21],[4,27]].forEach(p=>arch.rect(p[0],p[1],3,1,"A").rect(25,p[1]-3,3,1,"A"));
 const wood=layer().rect(8,12,16,18,"B").ell(16,13,8,6,"B",(i,j)=>j<13);
 [12,16,20].forEach(x=>wood.rect(x,6,1,24,"b"));
 wood.recolor("b","B",(i,j)=>!inside([[8,30],[8,12.5],[16,7],[24,12.5],[24,30]],i+.5,j+.5));
 wood.shade("B","n",null);
 wood.rect(8,15,16,2,"S").rect(8,24,16,2,"S").recolor("S","s",(i,j)=>j===15||j===24);
 wood.px([[9,15],[22,15],[9,24],[22,24]],"T");
 const ring=layer({raw:true}).ell(20.5,20,2,2,"g").ell(20.5,20,1,1,".").px([[20,18]],"y");
 const step=layer().rect(3,29,26,2,"A").shade("A","a","Z");
 return compose(arch,wood,ring,step);
}
function village(){
 const walls=layer().rect(5,15,22,14,"w").shade("w",null,"W",true);
 walls.rect(5,21,22,1,"b").rect(5,15,1,14,"b").rect(26,15,1,14,"b");          // entramado
 const chim=layer().rect(21,4,4,8,"a").shade("a","x","A",true).rect(20,3,6,2,"A");
 const roof=layer().poly([[1,16.5],[16,3],[31,16.5]],"r");
 for(let y=7;y<16;y+=3)roof.recolor("r","D",(i,j)=>j===y);
 roof.shade("r","R",null,true).recolor("r","D",(i,j)=>j===16);
 const door=layer().rect(14,20,5,9,"B").shade("B","n","b").px([[17,24]],"g");
 const win=layer().rect(8,18,4,4,"l").rect(21,18,4,4,"l").shade("l","x","G");
 win.rect(10,18,1,4,"b").rect(23,18,1,4,"b");
 const ground=layer().rect(3,29,26,2,"v").shade("v","V","F");
 return compose(walls,chim,roof,door,win,ground);
}
function shop(){
 const posts=layer().rect(4,12,3,17,"B").rect(25,12,3,17,"B").shade("B","n","b",true);
 const back=layer().rect(7,13,18,9,"b").shade("b",null,"c");
 const goods=layer().ell(10.5,19.5,2.5,2.5,"r").ell(15,19.5,2.5,2.5,"v").shade("r","R","D").shade("v","V","F");
 goods.rect(19,16,5,5,"g").shade("g","y","G").rect(19,18,5,1,"G");             // monedas apiladas
 const counter=layer().rect(2,21,28,8,"B").shade("B","n","b",true).rect(2,24,28,1,"b");
 const awn=layer().poly([[3,4],[29,4],[31.5,11.5],[0.5,11.5]],"r");
 const stripe=(x,y)=>Math.floor(((x+.5-16)*26/(26+(Math.min(y,11)-4)*.7)+13)/3.25)%2===1;
 awn.recolor("r","x",stripe);
 for(let i=0;i<8;i++){const cx=.5+3.875*(i+.5);awn.ell(cx,11.5,1.95,2.2,i%2?"x":"r",(x,y)=>y>=11);}
 awn.shade("r",null,"D").shade("x",null,"a").rect(3,3,26,1,"G");
 return compose(posts,back,goods,counter,awn);
}
function flag(){
 const pole=layer().rect(6,4,3,26,"B").shade("B","n","b",true);
 const knob=layer().ell(7.5,3.5,2.5,2.5,"g").shade("g","y","G");
 const cloth=layer().poly([[9,5],[15,4],[21,6],[29,4.5],[26.5,11],[29.5,17.5],[21,18.5],[15,17],[9,18]],"r").shade("r","R","D");
 cloth.recolor("r","D",(i,j)=>(i===15||i===16)&&j>5&&j<17);                   // pliegue
 cloth.px([[20,10],[21,9],[21,10],[21,11],[22,10],[19,10],[23,10],[21,8],[21,12]],"g").px([[21,10]],"y");
 const base=layer().ell(7.5,30,6,3,"A",(i,j)=>j<30).shade("A","a","Z");
 return compose(pole,cloth,knob,base);
}
function banner(){
 const cloth=layer().poly([[7,6],[25,6],[25,29],[16,23.5],[7,29]],"u").shade("u","U","N",true);
 cloth.poly([[9.5,7],[22.5,7],[22.5,25.5],[16,21],[9.5,25.5]],"N").poly([[10.5,7],[21.5,7],[21.5,23.5],[16,19.5],[10.5,23.5]],"u");
 cloth.recolor("N","g").recolor("u","U",(i,j)=>i===11&&j<20);
 const star=[];for(let k=0;k<10;k++){const r=k%2?2.3:5.2,a=-Math.PI/2+k*Math.PI/5;star.push([16+r*Math.cos(a),13.5+r*Math.sin(a)]);}
 const emb=layer({raw:true}).poly(star,"g").px([[15,12],[16,12],[15,13]],"y");
 const bar=layer().rect(3,3,26,3,"B").shade("B","n","b").ell(3.5,4.5,2,2,"g").ell(28.5,4.5,2,2,"g");
 const cord=layer({raw:true}).line(9,3,16,0,"G").line(23,3,16,0,"G");
 return compose(cloth,emb,bar,cord);
}
function terrain(){
 const top=[[16,3],[30,10],[16,17],[2,10]],L=[[2,10],[16,17],[16,30],[2,23]],R=[[16,17],[30,10],[30,23],[16,30]];
 const dirt=layer().poly(L,"B").poly(R,"b");
 dirt.px([[6,19],[7,19],[10,23],[11,22],[21,22],[22,22],[25,18],[19,26]],"c").px([[5,22],[13,26],[24,24]],"n");
 const grass=layer().poly(top,"v");
 // borde de hierba que cae por los lados, irregular
 for(let x=2;x<30;x++){const base=x<16?10+(x-2)/2:17-(x-16)/2,d=2+((x*7)%3===0?2:(x%4===1?1:0));
  for(let k=0;k<=d;k++)grass.set(x,Math.floor(base)+k,x<16?"v":"F");}
 grass.recolor("v","V",(i,j)=>inside(top,i+.5,j+.5)&&j<9).px([[9,8],[12,6],[19,7],[22,10],[15,11],[11,11]],"F");
 const edge=layer({raw:true}).line(16,17,16,29,"c");
 return compose(dirt,grass,edge);
}
function erase(){
 const a=layer().line(7,7,25,25,"r",5).line(25,7,7,25,"r",5).shade("r","R","D",true);
 a.line(8,7,13,12,"R").line(24,7,19,12,"R");
 return compose(a);
}
const ICONS={select,ally:()=>knight("ally"),enemy:()=>knight("enemy"),chest,door,village,shop,goal:flag,deploy:banner,terrain,erase};
Object.keys(ICONS).forEach(k=>{Astra.PIXEL["big:"+k]=ICONS[k]();});
})();
