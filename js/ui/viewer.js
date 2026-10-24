// js/ui/viewer.js: The viewer, the only zoom: a flag's designs, a map, or the explorable map. LB lives here.
// Needs before it at load time: nothing.

window.addEventListener("resize",()=>{if(LB&&LB.scale===1){lbFit();LB.baseW=LB.fl.getBoundingClientRect().width}});

// ---------- FLAG VIEWER ----------
let LB=null; // {c, scale, x, y, pts:Map, last:{...}}
// openFlag shows a flag's designs as slides; openMap shows its map alone. Both use the same overlay and gestures,
// and the chip row switches between them. Dragging always pans; nothing swipes.
// o.from opens with the flag at a rect on the page (the question flag), so a pinch there carries straight on in the
// viewer: that size is then the floor, and pinching back down to it closes the viewer. o.quiet hides the name and
// the chips, for a flag that hasn't been named yet.
function openFlag(c,vi=0,o){openViewer(c,{what:"flag",vi,...(o||{})})}
function openMap(c,chips=true){openViewer(c,{what:"map",chips})}
function openViewer(c,o){
  closeFlag(true);
  const ex=o.what==="explore";
  // noanim: the list, tab and bars take their places at once; only later changes are animated (a redraw for a new
  // scope used to slide the tab in from the edge).
  const el=document.createElement("div");el.className="lb noanim"+(o.quiet?" quiet":"")+(ex?" exploring":"");el.id="lb";
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove("noanim")));
  el.innerHTML=`<div class="lb-stage" id="lbStage"><div class="lb-track" id="lbTrack"></div></div>
    <div class="lb-top">${ex?`<button type="button" class="lb-back" onclick="closeFlag()" title="Back to ${esc(exBackTo())}" aria-label="Back to ${esc(exBackTo())}"><i aria-hidden="true"></i></button>`:""}<div class="title">${ex?exRegionSel(o.region):`<span class="nm">${esc(BY[c].n)}</span>`}<span class="sub" id="lbSub"></span>${ex?`${scopeChips("lb-scope","exScope")}`:""}</div><div class="ctl">
    <button type="button" onclick="lbZoom(1/1.5)" aria-label="Zoom out">−</button><button type="button" onclick="lbZoom(1.5)" aria-label="Zoom in">+</button>${ex?"":`<button type="button" onclick="closeFlag()" aria-label="Close">×</button>`}</div></div>
    <div class="lb-foot">${ex?`<div class="excard" id="exCard"></div>`:""}<div class="lb-var" id="lbVar"></div><p class="lb-hint" id="lbHint"></p></div>
    ${ex?`<div class="exlist${SET.exFold?" folded":""}" id="exList" aria-label="Places"><div class="exsort" id="exSort"></div><div class="exwrap"><div class="exbody" id="exBody"></div><div class="alpha" id="exAlpha"></div></div></div>
    <div class="extab" id="exTab" role="group" aria-label="The list"><button type="button" class="exup" onclick="exStep(1)" aria-controls="exList"><i aria-hidden="true"></i></button><button type="button" class="exdown" onclick="exStep(-1)" aria-controls="exList"><i aria-hidden="true"></i></button></div>`:""}`;
  // The page behind stops scrolling: locked at the root, since the root's own overflow setting keeps a lock on the
  // body from reaching the window (the hidden list kept its scrollbar and scrolled).
  document.body.appendChild(el);document.documentElement.classList.add("locked");
  // The cursor only changes when the mouse moves, so the element it is over takes the viewer's cursor meanwhile.
  const under=[...document.querySelectorAll(":hover")].pop();if(under&&!el.contains(under)){under.style.cursor="grab";el._under=under}
  const stage=el.querySelector("#lbStage"),track=el.querySelector("#lbTrack");
  // Typing waits: the keyboard goes away so the whole screen is free, and the box gets its focus back on close.
  const inp=$("#typeIn"),refocus=!!inp&&document.activeElement===inp;if(refocus)inp.blur();
  LB={c,noMap:!!o.noMap,where:whereShown(c),chips:o.chips!==false&&!o.quiet&&!ex,refocus,min:1,scale:1,x:0,y:0,pts:new Map(),el,stage,track};
  if(ex){LB.region=o.region;LB.ex=o.ex;LB.sel=null;exListBuild();exTabWire();exTabSync();exLayout()}
  lbShow(o.what,o.vi||0);
  if(ex&&o.at&&!o.keep){const b=$("#exBody"),en=b&&b.querySelector(`.entry[data-c="${o.at}"]`);if(en)b.scrollTop+=en.getBoundingClientRect().top-b.getBoundingClientRect().top-8-grpCover(b)}
  if(ex&&o.keep){const k=o.keep;LB.scale=k.scale;LB.x=k.x;LB.y=k.y;lbApply();if(k.top!==undefined)$("#exBody").scrollTop=k.top;if(k.sel)exSelect(k.sel,null,k.top===undefined)}
  if(o.from&&LB.what==="flag"){const r=o.from,C=lbCenter(),s=r.width/LB.baseW;LB.from={s,x:r.left+r.width/2-C.x,y:r.top+r.height/2-C.y};LB.min=Math.min(1,s);LB.scale=s;LB.x=LB.from.x;LB.y=LB.from.y;lbApply()}
  const st=stage;
  st.addEventListener("pointerdown",e=>{capture(st,e);lbDown(e)});
  st.addEventListener("pointermove",lbMove);
  st.addEventListener("pointerup",lbUp);st.addEventListener("pointercancel",lbUp);
  st.addEventListener("wheel",e=>{e.preventDefault();lbZoom(Math.exp(-e.deltaY*0.0015),{x:e.clientX,y:e.clientY})},{passive:false});
  st.addEventListener("dblclick",e=>{if(e.pointerType==="touch"||e.sourceCapabilities?.firesTouchEvents)return;lbToggle({x:e.clientX,y:e.clientY})});
  el.addEventListener("mousedown",e=>{if(!e.target.closest("select"))e.preventDefault()}); // a click here must not move focus (the region picker needs it)
  el.addEventListener("click",e=>{if(LB&&LB.what!=="explore"&&(e.target===st||e.target.classList.contains("lb-slide"))&&!LB.moved)closeFlag()});
}
// The pointer handlers, shared with the question flag, which hands its own pointers over once the viewer is open.
function lbDown(e){if(!LB)return;LB.pts.set(e.pointerId,{x:e.clientX,y:e.clientY,t:Date.now()});LB.start={scale:LB.scale,x:LB.x,y:LB.y,pts:[...LB.pts.values()],at:Date.now()};LB.moved=false;LB.stage.classList.add("drag")}
function lbMove(e){if(!LB||!LB.pts.has(e.pointerId))return;LB.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const cur=[...LB.pts.values()],s0=LB.start,st=LB.stage;
  if(cur.length===1&&s0.pts.length===1){
    const dx=cur[0].x-s0.pts[0].x,dy=cur[0].y-s0.pts[0].y;
    if(Math.abs(dx)+Math.abs(dy)>6)LB.moved=true;
    if(LB.scale>LB.min||LB.from){LB.x=s0.x+dx;LB.y=s0.y+dy;lbApply()}
  }
  else if(cur.length>=2&&s0.pts.length>=2){const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const want=s0.scale*d(cur[0],cur[1])/Math.max(1,d(s0.pts[0],s0.pts[1]));
    if(LB.from&&want<=LB.min){closeFlag();return} // pinched back down to its own size
    const ns=Math.min(lbMax(),Math.max(LB.min,want)),r=ns/s0.scale;
    const m0={x:(s0.pts[0].x+s0.pts[1].x)/2,y:(s0.pts[0].y+s0.pts[1].y)/2},m1={x:(cur[0].x+cur[1].x)/2,y:(cur[0].y+cur[1].y)/2},C=lbCenter();
    // keep the point under the fingers' midpoint fixed while scaling, then follow the midpoint
    LB.scale=ns;LB.x=m1.x-C.x-r*(m0.x-C.x-s0.x);LB.y=m1.y-C.y-r*(m0.y-C.y-s0.y);LB.moved=true;lbApply()}
}
// Double tap by hand: touch devices don't send dblclick. Two quick taps near the same spot, with no drag between.
function lbUp(e){if(!LB)return;LB.pts.delete(e.pointerId);const st=LB.stage;
  if(!LB.pts.size){st.classList.remove("drag");lbSettle(true)}
  LB.start={scale:LB.scale,x:LB.x,y:LB.y,pts:[...LB.pts.values()],at:Date.now()};
  // On the explorable map a tap selects; the second tap of a double tap zooms instead (a mouse's goes to dblclick).
  if(LB.what==="explore"&&!LB.moved&&!LB.pts.size){const now=Date.now(),t=LB.lastTap,dbl=t&&now-t.at<320&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<30;
    if(!dbl){exTap(e.clientX,e.clientY);LB.lastTap={at:now,x:e.clientX,y:e.clientY}}
    else{LB.lastTap=null;if(e.pointerType==="touch")lbToggle({x:e.clientX,y:e.clientY})}
    return}
  if(e.pointerType==="touch"&&!LB.moved&&!LB.pts.size){const now=Date.now(),t=LB.lastTap;
    if(t&&now-t.at<320&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<30){LB.lastTap=null;lbToggle({x:e.clientX,y:e.clientY})}else LB.lastTap={at:now,x:e.clientX,y:e.clientY}}}
// The flag is centred in the stage and transformed as translate(x,y) scale(s) about its own centre C, so a local
// offset q shows at C+t+s·q. Zooming by f about a screen point P keeps the point under P fixed: t' = (1-f)(P-C) + f·t.
// A double tap goes between 2.5x and the size it opened at (its place on the page, when it came from there).
function lbToggle(P){if(!LB)return;
  // The explorable map goes between where it opened and 2.5 times closer.
  if(LB.what==="explore"){if(Math.abs(LB.scale-LB.home)<0.01)lbZoom(2.5,P);else lbExHome();return}
  if(LB.scale>LB.min+0.01){LB.scale=LB.min;LB.x=LB.from?LB.from.x:0;LB.y=LB.from?LB.from.y:0;lbApply()}else lbZoom(2.5/LB.min,P)}
// The stage's content box (its padding leaves room for the bar at the top): where the flag is centred.
function lbBox(){const st=LB.stage,cs=getComputedStyle(st),pt=parseFloat(cs.paddingTop),pb=parseFloat(cs.paddingBottom),pl=parseFloat(cs.paddingLeft),pr=parseFloat(cs.paddingRight),r=st.getBoundingClientRect();
  return {left:r.left+pl,top:r.top+pt,w:r.width-pl-pr,h:r.height-pt-pb}}
function lbCenter(){const b=lbBox();return {x:b.left+b.w/2,y:b.top+b.h/2}}
// The flag zooms to 8x. The map zooms by its viewBox, so it can go much further and still be sharp.
const lbMax=()=>LB.fl.tagName==="svg"?80:8;
function lbZoom(f,P){if(!LB)return;const want=LB.scale*f;if(LB.from&&want<=LB.min){closeFlag();return}
  const ns=Math.min(lbMax(),Math.max(LB.min,want));f=ns/LB.scale;if(f===1)return;
  const C=lbCenter();P=P||C;LB.x=(1-f)*(P.x-C.x)+f*LB.x;LB.y=(1-f)*(P.y-C.y)+f*LB.y;LB.scale=ns;
  if(ns===1&&!LB.from){LB.x=0;LB.y=0}lbApply();lbSettle(false)}
// Once the fingers lift, or after a zoom from the buttons or the wheel, the flag settles within the stage: wholly on
// it where it is smaller than the stage, leaving no gap at an edge where it is larger. Animated after a gesture.
function lbSettle(anim){if(!LB||LB.fl.tagName==="svg")return;const b=lbBox(),W=LB.baseW*LB.scale,H=W*LB.fl.offsetHeight/Math.max(1,LB.fl.offsetWidth),sw=b.w,sh=b.h;
  const lim=(size,span,p)=>{const m=Math.abs(span-size)/2;return Math.max(-m,Math.min(m,p))};
  const x=lim(W,sw,LB.x),y=lim(H,sh,LB.y);if(x===LB.x&&y===LB.y)return;
  LB.x=x;LB.y=y;if(anim){LB.fl.classList.add("snap");clearTimeout(LB.snapT);LB.snapT=setTimeout(()=>LB&&LB.fl.classList.remove("snap"),300)}lbApply()}
// Zoom by resizing the element rather than transform:scale, so the SVG is re-rendered sharp at every level.
function lbApply(){if(!LB)return;const fl=LB.fl;
  if(fl.tagName!=="svg"){fl.style.width=(LB.baseW*LB.scale).toFixed(1)+"px";fl.style.transform=`translate(${LB.x}px,${LB.y}px)`;return}
  // The map keeps its size and shows the window the same transform would: a point q of it shows at C+t+s·q, so the
  // window is the element's box pulled back through that. Markers are shrunk back so they keep their size on screen.
  if(!LB.vb0){const b=fl.viewBox.baseVal;LB.vb0={x:b.x,y:b.y,w:b.width,h:b.height}}
  const v=LB.vb0,W=LB.baseW,H=W*v.h/v.w,u=v.w/W,s=LB.scale;
  // The window stays inside the frame: the map carries no land beyond it.
  // On the explorable map the list, the card and the title cover part of the stage, so the map may be pulled out from
  // under them by as much.
  const mx=(s-1)*W/2,my=(s-1)*H/2,I=LB.what==="explore"&&LB.ins||{l:0,t:0,b:0};
  LB.x=Math.max(-mx,Math.min(mx+I.l,LB.x));LB.y=Math.max(-my-I.b,Math.min(my+I.t,LB.y));
  fl.setAttribute("viewBox",`${(v.x+v.w/2-(W/2+LB.x)*u/s).toFixed(2)} ${(v.y+v.h/2-(H/2+LB.y)*u/s).toFixed(2)} ${(v.w/s).toFixed(2)} ${(v.h/s).toFixed(2)}`);
  fl.querySelectorAll("circle").forEach(k=>{if(!k.dataset.r)k.dataset.r=k.getAttribute("r");k.setAttribute("r",(k.dataset.r/s).toFixed(2))});
  lbHatch()}
// Entering the map: remember its full frame and open zoomed to the country's close frame (data-fit), so zooming
// out reaches the region and a double tap resets to it.
function lbMapHome(){if(!LB||LB.fl.tagName!=="svg")return;const fl=LB.fl;
  if(!LB.vb0){const b=fl.viewBox.baseVal;LB.vb0={x:b.x,y:b.y,w:b.width,h:b.height}}
  const f=(fl.dataset.fit||"").split(" ").map(Number);if(f.length!==4)return;
  const v=LB.vb0,u=v.w/LB.baseW,s=Math.min(lbMax(),Math.max(1,Math.min(v.w/f[2],v.h/f[3])));
  LB.scale=s;LB.x=-s*((f[0]+f[2]/2)-(v.x+v.w/2))/u;LB.y=-s*((f[1]+f[3]/2)-(v.y+v.h/2))/u;lbApply()}
// The strip of designs: slide vi is in view. The chips move it (animated); there is no swiping, so a drag is always a pan.
function lbTrack(anim){if(!LB)return;LB.track.classList.toggle("anim",!!anim);LB.track.style.transform=`translateX(${-100*LB.vi}%)`}
function lbGo(i){if(!LB)return;i=Math.min(LB.n-1,Math.max(0,i));if(i!==LB.vi){LB.scale=1;LB.x=0;LB.y=0;lbApply();LB.vi=i;LB.fl=LB.fls[i];LB.baseW=LB.fl.getBoundingClientRect().width;lbApply();lbCaption()}lbTrack(true)}
// Fill the stage with the designs (slide vi in view) or the map, from rest.
function lbShow(what,vi=0){if(!LB)return;const c=LB.c,v=VARS(c),nd=v?v.length:1;
  LB.what=what;LB.scale=1;LB.x=0;LB.y=0;LB.vb0=null;LB.from=null;LB.min=1;
  if(what==="explore"){LB.track.innerHTML=`<div class="lb-slide">${mapExploreSVG({...LB.ex,cls:"lbmap",aspect:lbBox().w/lbBox().h})}</div>`;LB.n=1;LB.vi=0;LB.fls=[LB.track.querySelector(".map")];lbFit()}
  else if(what==="map"){LB.track.innerHTML=`<div class="lb-slide">${mapSVG({code:c,cls:"lbmap",aspect:lbBox().w/lbBox().h,pad:0})}</div>`;LB.n=1;LB.vi=0;LB.fls=[LB.track.querySelector(".map")];lbFit()}
  else{LB.track.innerHTML=Array.from({length:nd},(_,i)=>`<div class="lb-slide">${img(c,"flag",i).replace('loading="lazy"','')}</div>`).join("");LB.n=nd;LB.vi=Math.min(nd-1,vi);LB.fls=[...LB.track.querySelectorAll(".lb-slide .flag .fl:not([hidden])")]}
  LB.fl=LB.fls[LB.vi];LB.baseW=LB.fl.getBoundingClientRect().width;lbApply();lbTrack(false);lbCaption();if(what==="map")lbMapHome();
  // The explorable map's dots are a fixed size on screen, whatever the frame: radius 5px in the scope, 3px outside it,
  // and a tap ring of 14px for both.
  if(what==="explore"){const u=LB.vb0.w/LB.baseW;LB.fl.querySelectorAll(".dot.ex").forEach(k=>k.dataset.r=((k.classList.contains("out")?3:5)*u).toFixed(3));LB.fl.querySelectorAll(".hit").forEach(k=>k.dataset.r=(14*u).toFixed(3));lbExHome()}
  // The words follow the device: a mouse clicks and scrolls, a finger taps and pinches.
  const mouse=matchMedia("(hover: hover) and (pointer: fine)").matches;
  $("#lbHint").textContent=what==="explore"?(mouse?"Click a place to see its flag · scroll to zoom":"Tap a place to see its flag · pinch to zoom"):(mouse?"Scroll to zoom · drag to pan · double-click to reset":"Pinch to zoom · drag to pan · double-tap to reset")}
// The arrow keys walk the chips: designs, then the map.
function lbStep(d){if(!LB||!LB.chips)return;const v=VARS(LB.c),nd=v?v.length:1,n=nd+(lbMapChip()?1:0),cur=LB.what==="map"?nd:LB.vi,k=cur+d;if(k>=0&&k<n)lbPick(k)}
// The Map chip, except for designs opened from the explorable map: a map inside the map would only confuse.
const lbMapChip=()=>mapHas(LB.c)&&!LB.noMap;
// A chip: a design (by index) or the map.
function lbPick(k){if(!LB)return;const v=VARS(LB.c),nd=v?v.length:1;if(k>=nd)lbShow("map");else if(LB.what==="flag")lbGo(k);else lbShow("flag",k)}
// The map is sized to fit the stage at scale 1 (an SVG with a viewBox takes its height from its width).
function lbFit(){const m=LB.el.querySelector(".lb-slide .map");if(!m)return;const vb=m.viewBox.baseVal,b=lbBox();m.style.width=Math.min(b.w,b.h*vb.width/vb.height).toFixed(1)+"px"}
// Under the stage: a line naming what's shown (the design, or the capital and region on the map) and one row of
// chips: the designs by name, then Map. Neither before the flag has been named in a round.
function lbCaption(){if(!LB)return;if(LB.what==="explore")return exCaption();const c=LB.c,f=BY[c],onMap=LB.what==="map",v=VARS(c);
  const names=v?v.map(x=>x.k[0].toUpperCase()+x.k.slice(1)):["Flag"];if(lbMapChip())names.push("Map");
  const cur=onMap?names.length-1:LB.vi;
  const chips=LB.chips&&names.length>1?`<div class="vchips">${names.map((t,k)=>`<button type="button" class="chipbtn${k===cur?" on":""}" onmousedown="event.preventDefault()" onclick="lbPick(${k})">${esc(t)}</button>`).join("")}</div>`:"";
  const d=v&&v[LB.vi];
  // On the map the region sits beside the name, small and muted as on the cards (when the cards show it), and the line
  // under it is the capital alone.
  const nm=LB.el.querySelector(".lb-top .nm");if(nm)nm.innerHTML=esc(f.n)+(onMap&&LB.where?`<span class="where">${esc(whereOf(c))}</span>`:"");
  $("#lbSub").innerHTML=onMap?`${f.cap==="None"?"No capital":`<span class="capdot"></span>${esc(f.cap)}`}`:esc(d?d.l+(d.d?" · "+d.d:""):useLabel(c));
  $("#lbVar").innerHTML=chips}
// replacing: another view is about to open in its place. A flag opened from the explorable map goes back to the map.
function closeFlag(replacing){if(!LB)return;const {el,refocus,what}=LB;if(el._under)el._under.style.cursor="";el.remove();document.documentElement.classList.remove("locked");LB=null;
  if(replacing)return;
  if(what==="explore")EXRET=null;
  else if(EXRET){const k=EXRET;EXRET=null;openExplore(k.region,k);return}
  if(refocus){const inp=$("#typeIn");if(inp)inp.focus({preventScroll:true})}}
// Ease the map to a scale and offset over a quarter of a second.
function lbAnimate(s1,x1,y1){const s0=LB.scale,x0=LB.x,y0=LB.y,t0=performance.now(),me=LB;
  const step=t=>{if(LB!==me)return;const k=Math.min(1,(t-t0)/250),e=1-Math.pow(1-k,3);
    LB.scale=s0+(s1-s0)*e;LB.x=x0+(x1-x0)*e;LB.y=y0+(y1-y0)*e;lbApply();if(k<1)requestAnimationFrame(step)};
  requestAnimationFrame(step)}
