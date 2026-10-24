// js/ui/screens/done.js: The results screen, copying and sharing a result.
// Needs before it at load time: nothing.

const CLIP=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
async function copyResult(){
  const text=shareText(),btn=$("#copyBtn");
  try{await navigator.clipboard.writeText(text);btn.classList.add("ok");btn.title="Copied";setTimeout(()=>{btn.classList.remove("ok");btn.title="Copy result text"},1500)}
  catch(e){const ta=$("#shareTa");ta.hidden=false;ta.value=text;ta.focus();ta.select()}
}
async function share(){
  const text=shareText(),btn=$("#shareBtn");
  try{if(navigator.share){await navigator.share({text});btn.textContent="Shared";return}}catch(e){if(e&&e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text);btn.textContent="Copied to clipboard"}
  catch(e){const ta=$("#shareTa");ta.hidden=false;ta.value=text;ta.focus();ta.select();btn.textContent="Copy the text below"}
}
function viewDone(){
  const right=S.qs.filter(q=>q.ans===q.c).length,n=S.qs.length;
  const missed=S.qs.filter(q=>q.ans!==q.c);
  const word=right===n?"Perfect round":right>=n*.7?"Strong round":right>=n*.4?"Getting there":"Keep at it";
  const crown=(S.earned||[]).map(id=>{const b=BADGE[id];return `<div class="card newbadge"><div class="row" style="flex-wrap:nowrap"><span class="be" style="flex:none">${b.e}</span><div><p class="eyebrow">New badge</p><h2>${id==="lord"?"You are the Flag Lord.":b.n}</h2><p class="small muted">${b.h}</p></div></div></div>`}).join("");
  return `
  <div class="top"><button class="back" onclick="goBack()">‹ Back</button><span class="stat">${esc(S.label)}</span></div>
  ${crown}
  <div class="card" style="align-items:flex-start">
    <p class="eyebrow">${word}</p>
    <p class="score">${right}<span class="muted" style="font-size:24px"> / ${n}</span></p>
    <p class="small muted">Best streak this round: ${S.best}</p>
    ${shareGrid()?`<p class="grid">${shareGrid().replace(/\n/g,"<br>")}</p>`:""}
    <div class="row" style="flex-wrap:nowrap"><button class="btn line" id="shareBtn" onclick="share()">Share result</button><button class="btn line icon" id="copyBtn" onclick="copyResult()" title="Copy result text" aria-label="Copy result text">${CLIP}</button></div>
    <textarea class="sharebox" id="shareTa" hidden readonly aria-label="Result text to copy"></textarea>
  </div>
  ${missed.length?`<div class="card"><h3>Missed</h3><div class="missed">${missed.map(q=>`<span class="chip">${img(q.c,"flag")}${esc(BY[q.c].n)}</span>`).join("")}</div></div>`:""}
  <button class="btn" onclick="startRound(S.mode,S.arg,S.label,S.flt)">Play again</button>
  <button class="btn ghost" onclick="goBack()">Choose another set</button>`;
}
