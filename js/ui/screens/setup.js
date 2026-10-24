// js/ui/screens/setup.js: The setup screen before a round.
// Needs before it at load time: nothing.

function viewSetup(){
  const p=S.pick,pool=poolFor(p.mode,p.arg,p.flt),grp=p.mode==="group"||p.mode==="lookmix",nVar=pool.filter(c=>VARS(c)).length;
  const n=p.mode==="group"?(SET.len==="all"?pool.length*2:SET.len):SET.len==="all"?pool.length:Math.min(SET.len,pool.length);
  const eff=grp&&!TYPED(SET.diff)?"hard":SET.diff;
  const PICK={expert:"Find the flag among nine, drawn from its look-alikes and region. +3 per correct answer.",master:"Find the flag among sixteen look-alikes and neighbours. +3 per correct answer."};
  const diffNote=grp&&!TYPED(SET.diff)?"Options always come from the look-alike set itself (Hard); Expert and Master "+(SET.dir==="flag"?"show more of them.":"ask you to type."):SET.dir==="flag"&&PICK[SET.diff]?PICK[SET.diff]:DIFF[SET.diff];
  if(p.mode==="all")p.label=scopeName();
  // Settings that change which flags and designs you see sit under "More"; the summary line says what they are set to.
  const more=[],sumParts=[];
  if(p.mode!=="weak"){more.push(scopeSeg("The same setting as on the home screen; changing it here changes it there.",true));sumParts.push(SCOPES.find(x=>x[0]===SET.scope)[1])}
  if(nVar){more.push(`<div class="seg"><span class="label">Design</span><div class="btns">
      ${[["national","National"],["civil","Civil"],["state","State"],["random","Random"]].map(([v,l])=>`<button class="${SET.variant===v?"on":""}" onclick="setOpt('variant','${v}')">${l}</button>`).join("")}</div>
      <span class="note">${nVar} of these flags have more than one official design, usually a civil version without the arms and a state version with them. ${{national:"National shows the everyday version.",civil:"Civil shows the version citizens fly.",state:"State shows the version government buildings fly.",random:"Random mixes them from question to question."}[SET.variant]}</span></div>`);sumParts.push(SET.variant+" designs")}
  const summary=sumParts.join(" · ");
  return `${shell({title:p.label,stat:pool.length+(p.mode==="group"?" flags in the set":" flags"),back:S.from&&S.from.view==="look"?"Look-alikes":"Home"})}
  <div class="card">
    <div class="seg"><span class="label">Round length</span><div class="btns">
      ${[[10,"10"],[25,"25"],["all","Full set"]].map(([v,l])=>`<button class="${SET.len===v?"on":""}" onclick="setOpt('len',${typeof v==="string"?"'all'":v})">${l}</button>`).join("")}</div></div>
    <div class="seg"><span class="label">Difficulty</span><div class="btns">
      ${["easy","medium","hard","expert","master"].map(d=>`<button class="${eff===d?"on":""}${grp&&!TYPED(d)&&d!=="hard"?" off":""}" onclick="setOpt('diff','${d}')">${d[0].toUpperCase()+d.slice(1)}</button>`).join("")}</div>
      <span class="note">${diffNote}</span></div>
    <div class="seg"><span class="label">Answer with</span><div class="btns">
      <button class="${SET.dir==="name"?"on":""}" onclick="setOpt('dir','name')">Country name</button>
      <button class="${SET.dir==="flag"?"on":""}" onclick="setOpt('dir','flag')">Pick the flag</button></div>
      <span class="note">${SET.dir==="flag"?"You see the name and choose among four flags.":"You see the flag and choose or type the name."}</span></div>
    <div class="seg"><span class="label">Pace</span><div class="btns">
      <button class="${SET.pace==="learn"?"on":""}" onclick="setOpt('pace','learn')">Learn</button>
      <button class="${SET.pace==="drill"?"on":""}" onclick="setOpt('pace','drill')">Drill</button></div>
      <span class="note">${SET.pace==="drill"?"Correct answers advance automatically.":"Shows what the flag means after each answer."}</span></div>
    ${more.length?`<details class="more"${S.more?" open":""} ontoggle="S.more=this.open"><summary><span class="label">More</span><span class="sum">${esc(summary)}</span></summary>${more.join("")}</details>`:""}
  </div>
  <div class="dock">${n?`<button class="btn" id="startBtn" onclick="startRound(S.pick.mode,S.pick.arg,S.pick.label,S.pick.flt)">Start · ${n} questions</button>`:`<p class="muted small" style="text-align:center">No flags here for this scope. Pick another scope under More.</p>`}</div>`;
}
