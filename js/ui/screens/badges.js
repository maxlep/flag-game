// js/ui/screens/badges.js: The badges page.
// Needs before it at load time: nothing.

function viewBadges(){
  const nb=BADGES.filter(b=>badges[b.id]).length;
  return `${shell({title:"Badges",stat:nb+" of "+BADGES.length+" earned"})}
  <div class="badges">${BADGES.filter(b=>!b.title).map(b=>`<div class="badge${badges[b.id]?" on":""}${b.big?" big":""}"><span class="be">${b.e}</span><span class="bn">${b.n}</span>${badges[b.id]?`<span class="bw">${fmtDate(badges[b.id])}</span>`:""}<span class="bh">${b.h}</span></div>`).join("")}</div>
  <p class="eyebrow" style="padding-top:6px">Titles</p>
  <p class="small muted">One for each region and scope: Lord for Countries, Warden for Territories, Emperor for All. A full round on Master, typed, with no misses.</p>
  <div class="titles">${REGIONS.map(r=>`<div class="trow"><span class="tr">${esc(r)}</span>${["lord","warden","emperor"].map(k=>{const b=BADGE[k+"-"+r],on=badges[b.id];return `<span class="tcell${on?" on":""}" title="${esc(b.n)}${on?" · "+fmtDate(on):""}"><span class="be">${b.e}</span><span class="tn">${k[0].toUpperCase()+k.slice(1)}</span></span>`}).join("")}</div>`).join("")}</div>
  <p class="small muted">A flag counts as learned at 4 points: a correct answer earns 0 on Easy, 1 on Medium, 2 on Hard, 3 on Expert, 4 on Master (3 when picking the flag); a miss costs 2. Badges are kept once earned.</p>`;
}
