// js/ui/parts/card.js: Home and region cards, their icons and buttons, the scope control on the home screen, and the pinned header of every screen.
// Needs before it at load time: nothing.

function shell(sub){
  const total=QUIZ.length,m=QUIZ.filter(f=>mastered(f.c)).length,lord=!!badges.lord;
  if(!sub)return `<div class="sticky"><div class="top"><div><h1 class="brand">Flags of the world</h1>${lord?`<p class="eyebrow" style="color:var(--gold)">Flag Lord · since ${fmtDate(badges.lord)}</p>`:""}</div><span class="stat">${m}/${total}</span></div></div>`;
  return `<div class="sticky"><div class="top"><button class="back" onclick="goBack()">‹ ${esc(sub.back||"Home")}</button><span class="stat">${esc(sub.stat||"")}</span></div>${sub.extra?`<div class="top titlerow"><h2 class="subtitle">${esc(sub.title)}</h2>${sub.extra}</div>`:`<h2 class="subtitle">${esc(sub.title)}</h2>`}${sub.below||""}</div>`;
}
// A home card: the card itself starts a round; the trailing link opens the study list.
const BOOK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>`;
// A card's three actions, as icons joined in one bordered control: quiz (the play mark, the same as tapping the card),
// study as a list (the book), study on the map. The group is named for the set; each button has a name, a tooltip
// and a description (hidden text, by aria-describedby) of what it opens.
const CARDN={n:0};
const PLAYICON=`<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>`;
function card(o){
  const id="tc"+(++CARDN.n),d=(k,t)=>`<span hidden id="${id}-${k}">${t}</span>`;
  const main=`<button class="tmain" onclick="${o.go}"${o.study||o.map?` aria-describedby="${id}-q"`:""}><span class="name${o.name.length>14?" sm":""}">${esc(o.name)}${(o.marks||[]).map(m=>`<span class="mark" title="${esc(m.n)}" aria-label="${esc(m.n)}">${m.e}</span>`).join("")}</span><span class="count">${o.count}</span>${o.bar!==undefined?`<span class="bar"><i style="width:${o.bar}%"></i></span>`:""}</button>`;
  const nm=esc(o.name);
  const quiz=`<button type="button" class="tico tq" onclick="${o.go}" title="Quiz" aria-label="Quiz" aria-describedby="${id}-q">${PLAYICON}</button>`;
  const study=o.study?`<button type="button" class="tico" onclick="${o.study}" title="Study as a list" aria-label="Study as a list" aria-describedby="${id}-l">${BOOK}</button>`:"";
  const map=o.map?`<button type="button" class="tico" onclick="${o.map}" title="Study on the map" aria-label="Study on the map" aria-describedby="${id}-m">${MAPICON}</button>`:"";
  const desc=d("q",o.dq||`Choose the settings and start a round on ${nm}.`)+(study?d("l",o.dl||`Every flag in ${nm} in name order, with its capital and what it stands for.`):"")+(map?d("m",o.dm||`A map of ${nm}: tap a place to see its flag.`):"");
  const ctl=map||study?`<div class="tlinks"><span class="tseg" role="group" aria-label="${nm}">${quiz}${study}${map}</span>${desc}</div>`:"";
  return `<div class="tile${o.wide?" wide":""}${o.cls?" "+o.cls:""}">${main}${ctl}</div>`;
}
function setCards(list){
  return list.map(r=>{const all=regionFlags(r);if(!all.length)return "";const m=all.filter(f=>mastered(f.c)).length;
    const held=["lord","warden","emperor"].filter(k=>badges[k+"-"+r]),marks=held.map(k=>({e:BADGE[k+"-"+r].e,n:BADGE[k+"-"+r].n}));
    return card({name:r,marks,count:m+" / "+all.length+" learned",bar:Math.round(100*m/all.length),go:`openSetup('region','${r}','${r}')`,study:`openStudy('${r}')`,map:exploreOf(r,regionAll(r).map(f=>f.c))?`openExplore('${r}')`:null})}).join("");
}
const scopeSeg=(note,label)=>`<div class="seg">${label?'<span class="label">Flags</span>':""}<div class="btns">${SCOPES.map(([v,l])=>`<button class="${SET.scope===v?"on":""}" onclick="setOpt('scope','${v}')">${l}</button>`).join("")}</div>${note?`<span class="note">${note}</span>`:""}</div>`;
// The wide card's descriptions, for the scope it covers.
function wideDesc(){const w={countries:"every country",all:"every flag",territories:"every territory"}[SET.scope];
  return {dq:`Choose the settings and start a round on ${w}.`,dl:`${w[0].toUpperCase()+w.slice(1)} in name order, with its capital and what its flag stands for.`,dm:"A map of the world: tap a place to see its flag."}}
const MAPICON=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>`;
