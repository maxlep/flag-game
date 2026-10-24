// js/ui/parts/list.js: What both lists share: the scope and sort pills, group headers, the letter index.
// Needs before it at load time: nothing.

// The scope as a pill of three, the same on the study list and the map: all three in view, the current one filled.
const scopeChips=(cls,fn)=>`<div class="vchips ${cls}" role="group" aria-label="Flags">${SCOPES.map(([v,l])=>`<button type="button" class="chipbtn${SET.scope===v?" on":""}" aria-pressed="${SET.scope===v}" onmousedown="event.preventDefault()" onclick="${fn}('${v}')">${l}</button>`).join("")}</div>`;
// ---------- SORTING THE LISTS ----------
// A group header pins just under the page's own pinned header, whose height varies with what it holds.
function stickyHeight(){const st=app.querySelector(".sticky");if(st)app.style.setProperty("--sth",(parseFloat(getComputedStyle(st).top)||0)+st.offsetHeight+"px")}
addEventListener("resize",()=>{if(S.view==="study")stickyHeight()});
// How far a group header covers the top of a list, so an entry brought into view isn't hidden under it.
const grpCover=box=>{const g=box&&box.querySelector(".grp");return g?g.offsetHeight:0};
// The group headers and entries, as HTML; the letter index only for A–Z.
// The index down the side: a letter per group, in the list's order. For A–Z that is the alphabet; grouped, the first
// letter of each header, repeats and all (S, W, C, S, E for Asia), and the bubble under the finger names the group.
const groupIndex=G=>G.groups.map(g=>`<span data-l="${esc(g.key)}">${esc(g.key[0])}</span>`).join("");
const groupHead=(g,mode)=>`<p class="eyebrow letter${mode==="az"?"":" grp"}" data-l="${esc(g.key)}">${esc(g.label)}</p>`;
const sortChips=(cls,fn,wide)=>{const cur=sortMode(wide);return `<div class="vchips ${cls}" role="group" aria-label="Sort">${sortModes(wide).map(([v,l])=>`<button type="button" class="chipbtn${cur===v?" on":""}" aria-pressed="${cur===v}" onmousedown="event.preventDefault()" onclick="${fn}('${v}')">${l}</button>`).join("")}</div>`};
// Alphabet index: tap or drag along the letters to jump the list, like a phone's contacts list.
// a: the index; box: a scrolling element holding the list (the map's drawer), or none for the page.
function wireAlpha(a=$("#alpha"),box=null){
  if(!a)return;let bubble=null,active=false,lastL="";
  // The letters are read on every move: the map's list redraws them when the sort changes, and old ones would point
  // at nothing.
  // Letter from the finger's vertical position only, so sideways drift during a fast scrub doesn't lose it.
  const letterAt=y=>{const spans=[...a.querySelectorAll("span")];if(!spans.length)return null;const r=a.getBoundingClientRect();const i=Math.min(spans.length-1,Math.max(0,Math.floor((y-r.top)/(r.height/spans.length))));return spans[i].dataset.l};
  const jump=y=>{const l=letterAt(y);if(!l||l===lastL)return;lastL=l;
    const target=(box||app).querySelector(`${box?"":".study "}[data-l="${CSS.escape(l)}"]`);if(!target)return;
    // A pinned group header reports where it is pinned, not where it sits in the list (one scrolled past stays pinned
    // at the top), so a grouped list is placed by the group's first entry, which lands just under the header.
    const grp=target.classList.contains("grp"),ref=grp&&target.nextElementSibling||target,cov=grp?target.offsetHeight:0;
    if(box)box.scrollTop+=ref.getBoundingClientRect().top-box.getBoundingClientRect().top-cov;
    else{const head=app.querySelector(".sticky");const off=(head?head.getBoundingClientRect().height:0)+8+cov;
      window.scrollTo(0,ref.getBoundingClientRect().top+window.scrollY-off)}
    if(!bubble){bubble=document.createElement("div");bubble.className="alpha-bubble";document.body.appendChild(bubble)}bubble.textContent=l;bubble.classList.toggle("long",l.length>2)};
  const end=()=>{active=false;lastL="";a.classList.remove("hot");if(bubble){bubble.remove();bubble=null}};
  a.addEventListener("pointerdown",e=>{active=true;a.classList.add("hot");try{a.setPointerCapture(e.pointerId)}catch(x){}jump(e.clientY);e.preventDefault()});
  a.addEventListener("pointermove",e=>{if(active)jump(e.clientY)});
  // Touch events as a fallback: iOS may cancel pointer events once the page scrolls under the finger.
  a.addEventListener("touchmove",e=>{if(active){e.preventDefault();jump(e.touches[0].clientY)}},{passive:false});
  a.addEventListener("pointerup",end);a.addEventListener("touchend",end);a.addEventListener("touchcancel",end);
  a.addEventListener("pointercancel",e=>{if(e.pointerType!=="touch")end()});
}
