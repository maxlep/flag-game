// js/ui/explore/select.js: Picking a place on the explorable map: a tap, the selection and its card, bringing a place into view, the hatch.
// Needs before it at load time: nothing.

// The explorable map's hatch: diagonal lines 6px apart on screen, drawn only across the part in view, at 45 degrees as
// drawn (the lines sit inside the vertical correction, so their y is divided by it). They lie on a fixed grid, so a
// pan doesn't make them crawl; the stroke doesn't scale, so they are 1px at any zoom.
function lbHatch(){const fl=LB&&LB.fl,hl=fl&&fl.querySelector(".hatch .hl");if(!hl)return;
  const vb=fl.viewBox.baseVal,sy=+fl.dataset.sy||1,per=vb.width/fl.getBoundingClientRect().width,d=6*per*Math.SQRT2;
  // Lines x+y=c, rising to the right; each runs from above the view to below it.
  const y0=vb.y-vb.width,y1=vb.y+vb.height+vb.width,c0=Math.floor((vb.x+vb.y)/d)*d,c1=vb.x+vb.width+vb.y+vb.height;
  let p="";for(let c=c0;c<=c1;c+=d)p+=`M${(c-y0).toFixed(2)} ${(y0/sy).toFixed(2)}L${(c-y1).toFixed(2)} ${(y1/sy).toFixed(2)}`;
  hl.setAttribute("d",p)}

// ---------- EXPLORABLE MAP ----------
// Which shape a tap landed on. Every shape and dot under the point counts, smallest first (they are drawn on top). A
// second tap on the same spot goes to the next one under it, so a country covered by its parts can still be reached.
function exTap(x,y){if(!LB||LB.what!=="explore")return;
  const hits=[...new Set(document.elementsFromPoint(x,y).filter(n=>LB.fl.contains(n)).map(n=>n.dataset.c).filter(Boolean))];
  if(!hits.length){exSelect(null);return}
  const i=hits.indexOf(LB.sel);LB.smoothMark=true;exSelect(i>=0?hits[(i+1)%hits.length]:hits[0],hits);LB.smoothMark=false}
// Select a flag: fill its shape, mark its capital, show its card. Null clears the selection.
function exSelect(c,hits,scroll=true){if(!LB)return;const m=LB.fl,sel=m.querySelector(".sel"),marks=m.querySelector(".marks");
  LB.sel=c;LB.hits=c&&hits&&hits.length>1?hits:null;
  m.querySelectorAll(".dot.ex.on").forEach(d=>d.classList.remove("on"));
  sel.innerHTML="";marks.innerHTML="";
  if(c){const S=MAP.set[MAP.frame[LB.ex.frame].set],sy=+m.dataset.sy;
    sel.innerHTML=`<path class="hi" d="${S.shape[c]}"/>`;
    // A small place gets a ring as well, 12px out, so the selection shows past the capital marker on top of it.
    const d=m.querySelector(`.dot.ex[data-c="${c}"]`);let ring="";if(d){d.classList.add("on");const r=12*LB.vb0.w/LB.baseW;ring=`<circle class="dot ring" data-r="${r.toFixed(2)}" cx="${d.getAttribute("cx")}" cy="${d.getAttribute("cy")}" r="${(r/LB.scale).toFixed(2)}"/>`}
    if(S.cap[c]){const [cx,cy]=S.cap[c],r=3.5*LB.vb0.w/LB.baseW;
      marks.innerHTML=`<circle class="cap" data-r="${r.toFixed(2)}" cx="${cx}" cy="${(cy*sy).toFixed(1)}" r="${(r/LB.scale).toFixed(2)}"/>`}
    marks.innerHTML=ring+marks.innerHTML}
  exCaption();exCard();exMark(c,scroll,LB.smoothMark)}
function exCaption(){if(!LB)return;const c=LB.sel,S=MAP.set[MAP.frame[LB.ex.frame].set],n=LB.ex.codes.filter(x=>S.shape[x]&&LB.ex.on.has(x)).length;
  let t=n+(n===1?" place":" places");
  if(c&&LB.hits){const i=LB.hits.indexOf(c),nx=LB.hits[(i+1)%LB.hits.length];t=`Tap again for ${BY[nx].n}`}
  $("#lbSub").textContent=t;$("#lbVar").innerHTML="";}
// The card: the flag's study entry. Its flag opens the designs in the viewer; closing them comes back to the map.
// Shown only when the list can't show the place: it is folded away, or the place isn't in the scope.
function exCard(){const box=$("#exCard");if(!box)return;const c=LB.sel,inList=c&&LB.ex.on.has(c)&&!exFolded();
  LB.el.classList.toggle("picked",!!c);
  if(!c||inList){box.innerHTML="";exLayout();return}
  const mixed=WIDE.includes(LB.region)||SET.scope!=="countries";
  box.innerHTML=`<button type="button" class="exclose" onclick="exSelect(null)" aria-label="Close the card">×</button>`+studyEntry(BY[c],mixed,{noMap:true,flagClick:`exFlag('${c}',this)`,pill:LB.ex.on.has(c)?null:`<span class="pill outside">not in ${scopeLabel()}</span>`});
  if(!LB.ex.on.has(c))box.querySelector(".entry").classList.add("outside");
  box.scrollTop=0;exLayout()}
// Mark the selected entry and scroll the list so it shows.
// smooth: glide (a tap on the map); otherwise jump, so opening the list or stepping by key shows no motion.
function exMark(c,scroll,smooth){const b=$("#exBody");if(!b)return;b.querySelectorAll(".entry.sel").forEach(e=>e.classList.remove("sel"));
  const en=c&&b.querySelector(`.entry[data-c="${c}"]`);if(!en)return;en.classList.add("sel");
  if(scroll&&!exFolded()){const bt=b.getBoundingClientRect(),et=en.getBoundingClientRect();if(et.top<bt.top+grpCover(b)||et.bottom>bt.bottom){
    // Keep the entry in view: from below it comes to the bottom edge when it fits there, else to the top.
    const cov=grpCover(b),down=et.top>=bt.top+cov&&et.height<bt.height-16-cov,top=down?b.scrollTop+et.bottom-bt.bottom+8:b.scrollTop+et.top-bt.top-8-cov;
    b.scrollTo({top,behavior:smooth?"smooth":"auto"})}}}
// From the list: select, and bring the place into view in the part of the map that shows. The zoom changes only when
// it must: out, if the place doesn't fit; in, if it is under 24px on screen, but never so far that less than 60
// units (about 2,300 km) of map show across, so an island keeps some land around it.
function exPick(c,instant){if(!LB)return;exSelect(c,null,true);const S=MAP.set[MAP.frame[LB.ex.frame].set],b=S.box[c];if(!b)return;
  const fl=LB.fl,sy=+fl.dataset.sy||1,v=LB.vb0,u=v.w/LB.baseW,C=lbCenter(),V=exVis(),vw=V.right-V.left,vh=V.bottom-V.top;
  const bw=(b[2]-b[0])/u,bh=(b[3]-b[1])*sy/u; // the place at scale 1, in px
  const fitS=Math.min(vw*0.8/Math.max(bw,1e-6),vh*0.8/Math.max(bh,1e-6)),size=Math.max(bw,bh),ctxS=vw*u/60;
  let s=LB.scale;
  if(s>fitS)s=fitS;else if(size*s<24)s=Math.max(s,Math.min(ctxS,24/Math.max(size,1e-6)));
  s=Math.max(1,Math.min(lbMax(),s));
  const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2*sy,P={x:(V.left+V.right)/2,y:(V.top+V.bottom)/2};
  const tx=(P.x-C.x)-s*(cx-(v.x+v.w/2))/u,ty=(P.y-C.y)-s*(cy-(v.y+v.h/2))/u;
  if(instant){LB.scale=s;LB.x=tx;LB.y=ty;lbApply()}else lbAnimate(s,tx,ty)}
