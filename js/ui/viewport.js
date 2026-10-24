// js/ui/viewport.js: The phone keyboard and the pinned quiz layout: the viewport's height, the flag's size, the suggestion row's touches. SUG lives here.
// Needs before it at load time: ui/dom.js (app).

// ---------- VIEWS ----------
// Pinned bars get an edge once content scrolls under them.
function shade(){const st=app.querySelector(".sticky"),dk=app.querySelector(".dock,.qdrawer"),mid=$("#qmid");
  const y=mid?mid.scrollTop:window.scrollY,left=mid?mid.scrollHeight-mid.clientHeight-mid.scrollTop:document.documentElement.scrollHeight-window.innerHeight-window.scrollY;
  if(st)st.classList.toggle("scrolled",y>4);
  if(dk)dk.classList.toggle("lift",left>4)}
window.addEventListener("scroll",shade,{passive:true});window.addEventListener("resize",shade);app.addEventListener("scroll",shade,true);
// On the quiz screen only the middle band scrolls, and only when it has something to scroll; any other touch drag is
// swallowed so a phone can't scroll the page beneath (iOS does that even with the body locked).
app.addEventListener("touchmove",e=>{if(S.view!=="quiz")return;const m=$("#qmid"),sg=$("#sugg");
  if(m&&m.contains(e.target)&&m.scrollHeight>m.clientHeight)return;
  if(sg&&sg.contains(e.target)&&sg.scrollWidth>sg.clientWidth)return; // the suggestion row scrolls sideways
  e.preventDefault()},{passive:false});
// The suggestion row handles its own touches: a drag scrolls it sideways, a lift with little movement picks the chip
// under the finger. Leaving this to the browser let a slight sideways wobble turn a tap into a scroll and drop it.
let SUG=null;
app.addEventListener("pointerdown",e=>{const sg=e.target.closest&&e.target.closest("#sugg");if(!sg)return;
  sg.setPointerCapture(e.pointerId);SUG={sg,id:e.pointerId,x:e.clientX,y:e.clientY,left:sg.scrollLeft,moved:false}},{capture:true});
app.addEventListener("pointermove",e=>{if(!SUG||e.pointerId!==SUG.id)return;const dx=e.clientX-SUG.x;if(Math.abs(dx)>6||Math.abs(e.clientY-SUG.y)>12)SUG.moved=true;SUG.sg.scrollLeft=SUG.left-dx},{capture:true});
app.addEventListener("pointerup",e=>{const d=SUG;SUG=null;if(!d||e.pointerId!==d.id)return;if(d.moved)return;
  const b=document.elementFromPoint(e.clientX,e.clientY),chip=b&&b.closest&&b.closest("#sugg button");if(chip){e.preventDefault();chip.click()}},{capture:true});
app.addEventListener("pointercancel",()=>{SUG=null},{capture:true});
// On a phone the keyboard halves the screen and the browser centres the answer box, pushing the flag off the top.
// When the box has focus and the visual viewport shrinks, the flag is capped to the space left and the page is
// scrolled to the top, so flag and box share the screen.
// The state follows the viewport height alone, not focus, so tapping a button can't toggle it and resize the flag.
// Height is taken in layout pixels (vv.height × vv.scale), so pinch-zooming the page doesn't count as a keyboard.
// The quiz screen is exactly as tall as the visible viewport (--vvh) and shifted by its offset (--vvt), so with the
// keyboard up the whole layout fits above it and nothing scrolls behind it.
let VVH=0,FULLH=0;
// The question flag may use the whole middle band less its chips row; measured, since the band's height depends on
// the drawer and the keyboard.
// Computed from the screen's target height, not the band's current one, which may be mid-transition.
function fitFlag(){const mid=$("#qmid"),head=app.querySelector(".qscreen .sticky"),dr=app.querySelector(".qdrawer");if(!mid||!head||!dr)return;
  const cs=getComputedStyle(mid);
  const h=(VVH||window.innerHeight)-head.offsetHeight-dr.offsetHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
  document.documentElement.style.setProperty("--flagh",Math.round(h)+"px")}
function keyboard(){
  const vv=window.visualViewport;if(vv&&vv.scale>1.02)return; // pinch-zoomed: leave the layout alone
  // In the home-screen app innerHeight itself shrinks with the keyboard, so compare with the tallest height seen.
  FULLH=Math.max(FULLH,window.innerHeight,vv?vv.height*vv.scale:0);
  let h=vv?Math.round(vv.height*vv.scale):window.innerHeight;const open=h<FULLH-120,was=document.body.classList.contains("kb");
  if(!open&&Date.now()-PRE_T<700)return; // the keyboard was asked for a moment ago and hasn't shown yet
  // The keyboard can grow after it opens (a prediction bar on the first keystroke). Remember the smallest height seen
  // with it up and lay out for that from the start, so the screen doesn't resize mid-round next time.
  if(open){const k=+localStorage.getItem("flaglore.kbh")||0;if(!k||h<k)try{localStorage.setItem("flaglore.kbh",h)}catch(e){}if(k&&k<h&&h-k<120)h=k}
  if(Math.abs(h-VVH)>24){VVH=h;document.documentElement.style.setProperty("--vvh",h+"px")}
  document.documentElement.style.setProperty("--vvt",(vv?Math.round(vv.offsetTop):0)+"px");
  document.body.classList.toggle("kb",open);
  fitFlag();requestAnimationFrame(fitFlag); // after the drawer has taken its keyboard size
  if(open&&S.view==="quiz"&&window.scrollY)window.scrollTo(0,0);
}
if(window.visualViewport){window.visualViewport.addEventListener("resize",keyboard);window.visualViewport.addEventListener("scroll",keyboard)}
window.addEventListener("resize",keyboard);
// On focus, shrink the screen to the keyboard's remembered height before the keyboard appears, so the field is already
// above it and the phone has no reason to shove the page to reveal it. The real height refines it as the keyboard settles.
let PRE_T=0;
function preKeyboard(){if(S.view!=="quiz"||document.body.classList.contains("kb"))return;
  FULLH=Math.max(FULLH,window.innerHeight);const k=+localStorage.getItem("flaglore.kbh")||Math.round(FULLH*0.55);
  PRE_T=Date.now();VVH=k;document.documentElement.style.setProperty("--vvh",k+"px");document.body.classList.add("kb");fitFlag();requestAnimationFrame(fitFlag)}
// The layout must not move under the finger (the tap would miss), so a touch only arms it; the shrink happens on focus,
// which still comes before the keyboard. A mouse brings no keyboard, so it never arms it.
let TOUCH_T=0;
document.addEventListener("pointerdown",e=>{if(e.pointerType==="touch")TOUCH_T=Date.now()},{capture:true,passive:true});
document.addEventListener("focusin",e=>{if(e.target.id!=="typeIn")return;if(Date.now()-TOUCH_T<800&&!e.target.readOnly)preKeyboard();[100,350,700].forEach(t=>setTimeout(keyboard,t))}); // a read-only box (after an answer) brings no keyboard
