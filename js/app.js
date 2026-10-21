// Flags of the World: state, quiz logic and views. Data lives in js/data/.
// ---------- STORAGE ----------
const KEY="flaglore.v1";
let prog={}; // code -> {c,w}
function load(){try{const s=localStorage.getItem(KEY);if(s)prog=JSON.parse(s)||{}}catch(e){prog={}}
  // migrate records from before scoring by difficulty
  Object.values(prog).forEach(r=>{if(r.s===undefined)r.s=Math.max(-4,Math.min(8,(r.c-r.w)*2))})}
function save(){try{localStorage.setItem(KEY,JSON.stringify(prog))}catch(e){}}
const rec=c=>prog[c]||{c:0,w:0,s:0};
const PTS={easy:0,medium:1,hard:2,expert:3,master:4},MASTER=4; // typed Master: one unaided correct answer = learned
const mastered=c=>rec(c).s>=MASTER;
const seen=c=>{const r=rec(c);return r.c+r.w>0};

// Alternative names accepted in typed mode.
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/^the\s+/,"").replace(/[^a-z0-9]/g,"");
const NAMES=FLAGS.map(f=>({c:f.c,n:norm(f.n),d:f.n}));
const ALIASN=Object.fromEntries(Object.entries(ALIASES).map(([c,a])=>[c,a.map(norm)]));
// Master: the name or an alias, nothing less. Case, accents and punctuation are still ignored.
function matchStrict(text){const t=norm(text);if(!t)return null;const exact=NAMES.find(x=>x.n===t);if(exact)return exact.c;for(const [c,a] of Object.entries(ALIASN))if(a.includes(t))return c;return null}
function matchTyped(text){
  const t=norm(text);if(!t)return null;
  const exact=NAMES.find(x=>x.n===t);if(exact)return exact.c;
  for(const [c,a] of Object.entries(ALIASN))if(a.includes(t))return c;
  // If what you've typed narrows the exact suggestions to one name, that name is the answer; several means keep typing.
  const sg=suggestAll(t);if(sg.length===1)return sg[0];if(sg.length>1)return null;
  // Nothing matches exactly: a unique typo-tolerant suggestion counts, as shown in the list.
  const fz=suggestAll(t,true);if(fz.length===1)return fz[0];
  // Otherwise the nearest whole name wins if it is within its allowance and no other country ties it.: the closest candidate wins if it is within its allowance and no other country ties it.
  let best=Infinity,who=new Set();
  for(const x of CANDS){if(Math.abs(x.n.length-t.length)>2)continue;const d=editDist(t,x.n);if(d>allowed(x.n.length))continue;
    if(d<best){best=d;who=new Set([x.c])}else if(d===best)who.add(x.c)}
  return who.size===1?[...who][0]:null;
}
// Optimal string alignment distance (insert, delete, substitute, transpose adjacent).
function editDist(a,b){
  const m=a.length,n=b.length;if(!m)return n;if(!n)return m;
  const d=[];for(let i=0;i<=m;i++){d[i]=[i]}for(let j=1;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    const cost=a[i-1]===b[j-1]?0:1;
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+cost);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  }
  return d[m][n];
}
const CANDS=[...NAMES.map(x=>({c:x.c,n:x.n})),...Object.entries(ALIASN).flatMap(([c,a])=>a.map(n=>({c,n})))];
const allowed=len=>len>=9?2:len>=5?1:0;
function suggestAll(t,fuzzy=false){
  const out=[];
  NAMES.forEach(x=>{if(x.n.startsWith(t))out.push(x.c)});
  NAMES.forEach(x=>{if(!out.includes(x.c)&&x.n.includes(t))out.push(x.c)});
  Object.entries(ALIASN).forEach(([c,a])=>{if(!out.includes(c)&&a.some(y=>y.startsWith(t)))out.push(c)});
  // Typo-tolerant extras only when nothing matches exactly, ranked by distance: whole names, then the same-length start of longer names.
  const tol=allowed(t.length),ptol=t.length>=7?2:tol;
  if(fuzzy&&!out.length&&tol){const fz=[];
    for(const x of CANDS){if(out.includes(x.c))continue;
      const dw=Math.abs(x.n.length-t.length)<=tol?editDist(t,x.n):9,dp=x.n.length>t.length?editDist(t,x.n.slice(0,t.length)):9;
      const d=Math.min(dw<=tol?dw:9,dp<=ptol?dp:9);
      if(d<9)fz.push([d,x.c])}
    fz.sort((a,b)=>a[0]-b[0]);fz.forEach(([d,c])=>{if(!out.includes(c))out.push(c)})}
  return out;
}
function suggest(text){const t=norm(text);return t.length<2?[]:suggestAll(t,true).slice(0,5)}

// ---------- SETTINGS ----------
const SKEY="flaglore.settings";
let SET={len:10,diff:"medium",dir:"name",pace:"learn",shape:"true"};
function loadSet(){try{const s=localStorage.getItem(SKEY);if(s)SET=Object.assign(SET,JSON.parse(s))}catch(e){}}
const TYPED=d=>d==="expert"||d==="master";
function setOpt(k,v){SET[k]=v;try{localStorage.setItem(SKEY,JSON.stringify(SET))}catch(e){}render()}
const DIFF={easy:"Options come from anywhere in the world. Good for a first pass; earns no points.",medium:"Options come from the same region. +1 point per correct answer.",hard:"Options are the flags most often confused with this one. +2 per correct answer.",expert:"No options. Type the country; close spellings and common names count. +3 per correct answer.",master:"Type the exact name, with no suggestions or typo help. Common names still count. +4: one correct answer marks the flag learned."};

// ---------- BADGES ----------
const BKEY="flaglore.badges";let badges={};
function loadB(){try{badges=JSON.parse(localStorage.getItem(BKEY))||{}}catch(e){badges={}}}
function saveB(){try{localStorage.setItem(BKEY,JSON.stringify(badges))}catch(e){}}
const BADGES=[ // roughly in the order people earn them
 {id:"first",e:"🚩",n:"First Steps",h:"Finish a round."},
 {id:"clean10",e:"✨",n:"Clean Sheet",h:"A perfect round of 10 or more on Medium or harder."},
 {id:"streak25",e:"🔥",n:"On a Roll",h:"25 correct in a row."},
 {id:"m50",e:"🎖️",n:"Collector",h:"50 flags learned."},
 {id:"tour",e:"🌍",n:"World Tour",h:"Finish a full Whole World round at any difficulty."},
 {id:"explorer",e:"🧭",n:"Explorer",h:"Finish a full round of each of the five sets beyond the countries."},
 {id:"sharp25",e:"🎯",n:"Sharp Eye",h:"A perfect round of 25 or more on Hard or harder."},
 {id:"mirror",e:"🪞",n:"Mirror Image",h:"A perfect round of 25 or more in Pick-the-flag on Hard."},
 {id:"twins",e:"👯",n:"Twin Spotter",h:"Perfect rounds in 10 different look-alike sets."},
 {id:"streak50",e:"⚡",n:"Unstoppable",h:"50 correct in a row."},
 {id:"typed25",e:"🐝",n:"Spelling Bee",h:"A perfect typed round of 25 or more."},
 {id:"m100",e:"📚",n:"Vexillologist",h:"100 flags learned."},
 {id:"purist",e:"🧠",n:"Purist",h:"A perfect round of 25 or more on Master: exact names, no help."},
 {id:"carto",e:"🗺️",n:"Cartographer",h:"Every territory, region and organisation flag learned."},
 {id:"streak100",e:"💯",n:"Centurion",h:"100 correct in a row."},
 {id:"m197",e:"🏆",n:"Completionist",h:"Every country's flag learned."},
 ...REGIONS.map(r=>({id:"lord-"+r,n:"Lord of "+r,e:"🛡️",h:"A full "+r+" round on Master with no misses."})),
 {id:"lord",n:"Flag Lord",e:"👑",h:"A full Whole World round on Master with no misses. All 197, typed exactly, no mistakes.",big:1},
 {id:"emperor",e:"🌐",n:"Flag Emperor",h:"A full Everything round on Master with no misses. All 252, typed exactly, no mistakes.",big:1}
];
const BADGE=Object.fromEntries(BADGES.map(b=>[b.id,b]));
function checkBadges(){
  const n=S.qs.length,right=S.qs.filter(q=>q.ans===q.c).length,perfect=right===n;
  const D={easy:0,medium:1,hard:2,expert:3,master:4}[S.diff]||0,typed=TYPED(S.diff)&&S.dir==="name",strict=S.diff==="master"&&S.dir==="name";
  const mc=COUNTRIES.filter(f=>mastered(f.c)).length,earned=[];
  const award=id=>{if(!badges[id]){badges[id]=Date.now();earned.push(id)}};
  award("first");
  if(perfect&&n>=10&&D>=1)award("clean10");
  if(perfect&&n>=25&&D>=2)award("sharp25");
  if(perfect&&n>=25&&typed)award("typed25");
  if(perfect&&n>=25&&S.diff==="master"&&S.dir==="name")award("purist");
  if(perfect&&n>=25&&S.dir==="flag"&&D>=2)award("mirror");
  if(S.mode==="all"&&S.full)award("tour");
  if(S.mode==="group"&&perfect){const t=badges._twins=badges._twins||[];if(!t.includes(S.arg))t.push(S.arg);if(t.length>=10)award("twins")}
  if(S.best>=25)award("streak25");if(S.best>=50)award("streak50");if(S.best>=100)award("streak100");
  if(mc>=50)award("m50");if(mc>=100)award("m100");if(mc>=COUNTRIES.length)award("m197");
  if(FLAGS.filter(f=>!f.sov).every(f=>mastered(f.c)))award("carto");
  if(S.mode==="region"&&S.full&&perfect&&strict)award("lord-"+S.arg);
  if(S.mode==="all"&&S.full&&perfect&&strict)award("lord");
  if(S.mode==="everything"&&S.full&&perfect&&strict)award("emperor");
  if(S.mode==="region"&&S.full&&SETS.includes(S.arg)){const d=badges._sets=badges._sets||[];if(!d.includes(S.arg))d.push(S.arg);if(SETS.every(x=>d.includes(x)))award("explorer")}
  saveB();return earned;
}
// Wikipedia article names where they differ from the display name; THE marks "Flag of the …".
function links(c){
  const name=(WIKI[c]||BY[c].n).replace(/ /g,"_");
  const flag="https://en.wikipedia.org/wiki/"+(FLAGWIKI[c]||"Flag_of_"+(THE.has(c)?"the_":"")+name);
  const country="https://en.wikipedia.org/wiki/"+name;
  const capName=BY[c].cap.split(" (")[0],cap="https://en.wikipedia.org/wiki/"+encodeURIComponent((CAPWIKI[c]||capName).replace(/ /g,"_"));
  return {flag,country,cap,sameCap:capName===BY[c].n};
}
const wl=(url,text,title="Wikipedia")=>`<a class="wl" href="${url}" target="_blank" rel="noopener" title="${title}">${text}</a>`;
// Country name as a quiet link; capital line carries the capital and flag-article links.
function nameLink(c){return wl(links(c).country,esc(BY[c].n))}
function capLine(c,showRegion=true){const L=links(c),f=BY[c];const plain=L.sameCap||f.cap==="None";const y=typeof ADOPTED==="object"&&ADOPTED[c];
  return `${plain?esc(f.cap):wl(L.cap,esc(f.cap))}${showRegion?" · "+f.r:""} · ${wl(L.flag,y?"Flag adopted "+y:"Flag","The flag on Wikipedia")}`}
const fmtDate=t=>new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

// ---------- STATE ----------
let S={view:"home"};
const $=s=>document.querySelector(s);
const app=$("#app");
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
// Official width:height ratios of the true-proportion artwork (flags-true/). Flags missing there fall back to the 4:3 set.
// Each flag sits in a 4:3 slot. Uniform mode fills it. True mode sizes flags to roughly equal area, capped by the slot,
// so a wide flag like Qatar reads as wider rather than merely shorter.
const img=(c,cls="flag")=>{
  const tru=SET.shape==="true"&&TRUER[c];const r=tru?TRUER[c]:4/3;const src=tru?"flags-true":"flags";
  const w=tru?Math.min(100,75*r,100*Math.sqrt(0.62*r)):100;
  return `<div class="${cls}"><div class="fl${BARE.has(c)?" bare":""}" style="--r:${r};--w:${w.toFixed(1)}%"><img src="${src}/${c}.svg" alt="Flag of ${BY[c].n}" loading="lazy"></div></div>`};
const esc=s=>s.replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));

// Look-alike filter: a region name, a set name, "countries", or null for everything.
const inFilter=(c,flt)=>!flt||(flt==="countries"?BY[c].sov:BY[c].r===flt);
const filterLabel=flt=>!flt?"":flt==="countries"?"Countries":flt;
function poolFor(mode,arg,flt){
  if(mode==="region")return FLAGS.filter(f=>f.r===arg).map(f=>f.c);
  if(mode==="all")return COUNTRIES.map(f=>f.c);
  if(mode==="everything")return FLAGS.map(f=>f.c);
  if(mode==="weak")return FLAGS.map(f=>f.c).filter(c=>rec(c).w>0&&!mastered(c));
  if(mode==="group")return GROUPS[arg].f.filter(c=>inFilter(c,flt));
  if(mode==="lookmix")return [...new Set(GROUPS.flatMap(g=>g.f))].filter(c=>inFilter(c,flt));
  return [];
}
function pickOrder(pool,n){
  // unseen first, then weakest, then random; take n
  const w=pool.map(c=>{const r=rec(c);let s=Math.random();if(!seen(c))s+=3;else s+=Math.max(0,r.w*1.5-r.c);if(mastered(c))s-=1;return [s,c]});
  w.sort((a,b)=>b[0]-a[0]);
  return w.slice(0,n).map(x=>x[1]);
}
// Pick-the-flag grows the grid instead of removing options: 4 flags up to Hard, 9 on Expert, 16 on Master.
const optCount=(diff,dir)=>dir==="flag"&&diff==="master"?16:dir==="flag"&&diff==="expert"?9:4;
function distractors(c,diff,mode,n=3){
  const f=BY[c];const out=new Set();
  const add=list=>list.forEach(x=>{if(out.size<n)out.add(x)});
  const groups=GROUP_OF[c]||[];
  const gm=shuffle(groups.flatMap(i=>GROUPS[i].f).filter(x=>x!==c));
  const same=shuffle(FLAGS.filter(x=>x.r===f.r&&x.c!==c).map(x=>x.c));
  const any=shuffle(FLAGS.map(x=>x.c).filter(x=>x!==c));
  if(mode==="group"||mode==="lookmix"||diff==="hard"||TYPED(diff)){add(gm);add(same)}
  else if(diff==="medium"){add(same)}
  add(any);
  return [...out];
}
const here=()=>({view:S.view,region:S.region,pick:S.pick,flt:S.flt,scroll:window.scrollY});
// The round in progress (and its results screen) is kept in localStorage so a refresh resumes it.
const RKEY="flaglore.round";
function saveRound(){try{if(S.view==="quiz"||S.view==="done"){const {timer,...rest}=S;localStorage.setItem(RKEY,JSON.stringify(rest))}else localStorage.removeItem(RKEY)}catch(e){}}
function loadRound(){try{const s=localStorage.getItem(RKEY);if(!s)return null;const r=JSON.parse(s);return r&&r.qs&&r.qs.length?r:null}catch(e){return null}}
// Leaving mid-round asks first; a second Esc or the Leave button confirms.
function goBack(){
  if(S.view==="quiz"&&S.qs.some(q=>q.ans)&&!S.confirmLeave){S.confirmLeave=true;render();return}
  clearTimeout(S.timer);
  const f=S.from||{view:"home"};
  S={view:f.view,region:f.region,pick:f.pick,flt:f.flt};saveRound();render();
  window.scrollTo(0,f.scroll||0);
}
function stayInRound(){S.confirmLeave=false;render()}
let HOME_Y=0;
function goHome(){clearTimeout(S.timer);S={view:"home"};saveRound();render();window.scrollTo(0,HOME_Y)}
function leaveHome(){if(S.view==="home")HOME_Y=window.scrollY}
function openSetup(mode,arg,label,flt=null){leaveHome();const from=here();S={view:"setup",pick:{mode,arg,label:flt?label+" · "+filterLabel(flt):label,flt},from};render();window.scrollTo(0,0)}
function openStudy(r){leaveHome();const from=here();S={view:"study",region:r,from};render();window.scrollTo(0,0)}
function openLook(flt=null){leaveHome();const from=here();S={view:"look",from,flt};render();window.scrollTo(0,0)}
function openBadges(){leaveHome();const from=here();S={view:"badges",from};render();window.scrollTo(0,0)}
function startRound(mode,arg,label,flt=null){
  const pool=poolFor(mode,arg,flt);
  if(!pool.length)return;
  const from=S.view==="quiz"||S.view==="done"||S.view==="setup"?S.from:here();
  const diff=SET.diff;
  let order,full;
  const grp=mode==="group"||mode==="lookmix";
  if(mode==="group"){full=SET.len==="all";
    const n=SET.len==="all"?pool.length*2:SET.len;
    order=[];while(order.length<n){let sh=shuffle(pool);if(pool.length>1&&order.length&&sh[0]===order[order.length-1])sh.push(sh.shift());order.push(...sh)}order=order.slice(0,n);
  } else {
    const n=SET.len==="all"?pool.length:Math.min(SET.len,pool.length);full=n===pool.length;
    order=pickOrder(pool,n);
  }
  const nOpt=optCount(diff,SET.dir);
  const qs=order.map(c=>({c,opts:shuffle([c,...distractors(c,diff,mode,nOpt-1)]),ans:null,typed:""}));
  S={view:"quiz",mode,arg,label,flt,qs,i:0,streak:0,best:0,diff:grp&&!TYPED(diff)?"hard":diff,dir:SET.dir,nOpt,pace:SET.pace,from,full};
  saveRound();render();window.scrollTo(0,0);
}
function submitTyped(){
  const inp=$("#typeIn");if(!inp)return;
  const text=inp.value.trim();if(!text)return;
  const k=S.diff==="master"?matchStrict(text):matchTyped(text);
  const q=S.qs[S.i];q.typed=text;
  answer(k||"__wrong__");
}
function typeInput(v){
  const q=S.qs[S.i];q.typed=v;
  const box=$("#sugg");if(!box)return;
  box.innerHTML=suggest(v).map(c=>`<button type="button" onclick="pickSugg('${c}')">${esc(BY[c].n)}</button>`).join("");
}
function pickSugg(c){const inp=$("#typeIn");if(inp)inp.value=BY[c].n;submitTyped()}
function answer(k){
  const q=S.qs[S.i];if(q.ans)return;
  q.ans=k;const ok=k===q.c;
  const r=rec(q.c);const pts=S.diff==="master"&&S.dir==="flag"?3:(PTS[S.diff]||0);
  if(ok){r.c++;r.s=Math.min(8,(r.s||0)+pts);q.pts=pts}else{r.w++;r.s=Math.max(-4,(r.s||0)-2);q.pts=-2}
  q.nowMastered=ok&&r.s>=MASTER&&r.s-pts<MASTER;
  prog[q.c]=r;save();
  S.streak=ok?S.streak+1:0;S.best=Math.max(S.best,S.streak);
  saveRound();render();
  if(S.pace==="drill"&&ok){clearTimeout(S.timer);S.timer=setTimeout(next,650);return}
  requestAnimationFrame(()=>{const btns=app.querySelectorAll(".btn");const b=btns[btns.length-1];if(b)b.scrollIntoView({block:"end",behavior:"smooth"})});
}
function next(){ clearTimeout(S.timer);S.timer=null; if(S.i+1<S.qs.length){S.i++;saveRound();render();window.scrollTo(0,0)} else {S.earned=checkBadges();S.view="done";saveRound();render();window.scrollTo(0,0)} }
function showLore(){const q=S.qs[S.i];q.lore=true;render()}
// Keyboard: A-D or 1-4 pick an option, Enter moves on.
document.addEventListener("keydown",e=>{
  if(LB){if(e.key==="Escape")closeFlag();return}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==="Tab"&&S.view==="quiz"){e.preventDefault();const inp=$("#typeIn");if(inp&&document.activeElement!==inp)inp.focus();return}
  const t=e.target.tagName;if(t==="INPUT"||t==="SELECT"||t==="TEXTAREA"||t==="BUTTON")return;
  if(S.view==="setup"){if(e.key==="Enter"){e.preventDefault();startRound(S.pick.mode,S.pick.arg,S.pick.label,S.pick.flt)}else if(e.key==="Escape")goBack();return}
  if(S.view==="study"||S.view==="look"||S.view==="badges"){if(e.key==="Escape")goBack();return}
  if(S.view!=="quiz")return;
  const q=S.qs[S.i];
  if(e.key==="Escape"){goBack();return}
  if(e.key==="Enter"){if(q.ans){e.preventDefault();next()}return}
  if(q.ans)return;
  const k=e.key.toLowerCase();let i=-1;
  if(k>="a"&&k<="p")i=k.charCodeAt(0)-97;else if(k>="1"&&k<="9")i=+k-1;
  if(i>=0&&q.opts&&q.opts[i]){e.preventDefault();answer(q.opts[i])}
});

// ---------- VIEWS ----------
function render(){
  if(S.view==="quiz"){app.innerHTML=viewQuiz();const t=$("#typeIn");if(t&&!S.qs[S.i].ans)t.focus();return}
  if(S.view==="done")return app.innerHTML=viewDone();
  if(S.view==="setup")return app.innerHTML=viewSetup();
  if(S.view==="study"){app.innerHTML=viewStudy();wireAlpha();return}
  if(S.view==="look")return app.innerHTML=viewLook();
  if(S.view==="badges")return app.innerHTML=viewBadges();
  app.innerHTML=viewHome();checkVersion();
}
function shell(sub){
  const total=FLAGS.length,m=FLAGS.filter(f=>mastered(f.c)).length,lord=!!badges.lord;
  if(!sub)return `<div class="sticky"><div class="top"><div><h1 class="brand">Flags of the world</h1>${lord?`<p class="eyebrow" style="color:var(--gold)">Flag Lord · since ${fmtDate(badges.lord)}</p>`:""}</div><span class="stat">${m}/${total}</span></div></div>`;
  return `<div class="sticky"><div class="top"><button class="back" onclick="goBack()">‹ ${esc(sub.back||"Home")}</button><span class="stat">${esc(sub.stat||"")}</span></div><h2 class="subtitle">${esc(sub.title)}</h2>${sub.extra||""}</div>`;
}
// A home card: the card itself starts a round; the trailing link opens the study list.
const BOOK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>`;
function card(o){
  const main=`<button class="tmain" onclick="${o.go}"><span class="name${o.name.length>14?" sm":""}">${esc(o.name)}</span><span class="count">${o.count}</span>${o.bar!==undefined?`<span class="bar"><i style="width:${o.bar}%"></i></span>`:""}</button>`;
  const study=o.study?`<button class="tstudy" onclick="${o.study}" aria-label="Study ${esc(o.name)}">${BOOK}Study</button>`:"";
  return `<div class="tile${o.wide?" wide":""}">${main}${study}</div>`;
}
function setCards(list){
  return list.map(r=>{const all=FLAGS.filter(f=>f.r===r),m=all.filter(f=>mastered(f.c)).length;
    return card({name:r,count:badges["lord-"+r]?"Lord of "+r+" · "+m+" / "+all.length:m+" / "+all.length+" learned",bar:Math.round(100*m/all.length),go:`openSetup('region','${r}','${r}')`,study:`openStudy('${r}')`})}).join("");
}
function viewHome(){
  const total=FLAGS.length,weak=poolFor("weak").length,nb=BADGES.filter(b=>badges[b.id]).length;
  const learned=l=>l.filter(f=>mastered(f.c)).length;
  return `${shell()}
  <p class="muted small">Name the flag, then read what it stands for. Tap a set to play it, or Study to read through it. Flags you miss come back sooner.</p>
  <div class="kbd"><span class="eyebrow">Keyboard</span><span><kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> answer</span><span><kbd>Enter</kbd> starts and continues</span><span><kbd>Esc</kbd> goes back</span></div>
  <p class="eyebrow">Countries</p>
  <div class="tiles">${setCards(REGIONS)}
    ${card({wide:true,name:"Whole world",count:learned(COUNTRIES)+" / "+COUNTRIES.length+" learned",go:"openSetup('all',null,'Whole world')",study:"openStudy('Whole world')"})}
  </div>
  <p class="eyebrow" style="padding-top:4px">Beyond the countries</p>
  <div class="tiles">${setCards(SETS)}
    ${card({wide:true,name:"Everything",count:learned(FLAGS)+" / "+total+" learned",go:"openSetup('everything',null,'Everything')",study:"openStudy('Everything')"})}
  </div>
  <p class="eyebrow" style="padding-top:4px">Practice</p>
  <div class="tiles">
    ${card({wide:true,name:"Look-alikes",count:GROUPS.length+" sets · mixed round",go:"openSetup('lookmix',null,'Look-alikes')",study:"openLook()"})}
    ${weak?card({wide:true,name:"Weak spots",count:weak+" to fix",go:"openSetup('weak',null,'Weak spots')"}):`<div class="tile wide dim"><span class="tmain"><span class="name">Weak spots</span><span class="count">nothing missed yet</span></span></div>`}
    ${card({wide:true,name:"Badges",count:nb+" / "+BADGES.length+" earned ›",go:"openBadges()"})}
  </div>
  <div class="foot"><span class="small muted">Progress is saved on this device.</span><button class="link" onclick="resetAsk()">Reset progress</button></div>
  <p class="ver" id="ver"><span class="stamp">${typeof VERSION==="object"?"updated "+VERSION.at:""}<button class="refresh" onclick="location.reload()" title="Reload the page" aria-label="Reload">↻</button></span></p>`;
}
// Compare this build with the one on GitHub; say so if a newer one exists. Fails silently where the network is blocked.
let VER_CHECKED=null;
async function checkVersion(){
  if(typeof VERSION!=="object"||VER_CHECKED!==null)return;VER_CHECKED=false;
  try{const r=await fetch("https://raw.githubusercontent.com/maxlep/flag-game/main/js/version.js?"+Date.now(),{cache:"no-store"});
    const m=(await r.text()).match(/at:"([^"]+)"/);if(!m)return;VER_CHECKED=m[1];
    const el=$("#ver");if(el&&VER_CHECKED>VERSION.at)el.innerHTML=`<a class="stale" href="javascript:location.reload(true)">A newer version is available, reload</a>`+el.innerHTML;
  }catch(e){}
}
function resetAsk(){
  const f=app.querySelector(".foot");
  f.innerHTML=`<span class="small">Clear all progress?</span><span class="row" style="flex:none"><button class="link" onclick="prog={};badges={};save();saveB();render()">Yes, clear</button><button class="link" onclick="render()">Keep</button></span>`;
}
function viewSetup(){
  const p=S.pick,pool=poolFor(p.mode,p.arg,p.flt),grp=p.mode==="group"||p.mode==="lookmix";
  const n=p.mode==="group"?(SET.len==="all"?pool.length*2:SET.len):SET.len==="all"?pool.length:Math.min(SET.len,pool.length);
  const eff=grp&&!TYPED(SET.diff)?"hard":SET.diff;
  const PICK={expert:"Find the flag among nine, drawn from its look-alikes and region. +3 per correct answer.",master:"Find the flag among sixteen look-alikes and neighbours. +3 per correct answer."};
  const diffNote=grp&&!TYPED(SET.diff)?"Options always come from the look-alike set itself (Hard); Expert and Master "+(SET.dir==="flag"?"show more of them.":"ask you to type."):SET.dir==="flag"&&PICK[SET.diff]?PICK[SET.diff]:DIFF[SET.diff];
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
    <div class="seg"><span class="label">Flag shapes</span><div class="btns">
      <button class="${SET.shape==="true"?"on":""}" onclick="setOpt('shape','true')">True</button>
      <button class="${SET.shape==="uniform"?"on":""}" onclick="setOpt('shape','uniform')">Uniform</button></div>
      <span class="note">${SET.shape==="true"?"Each flag in its official proportions, sized to roughly equal area. Applies everywhere in the app.":"Every flag drawn at 4:3, the same size."}</span></div>
    <div class="seg"><span class="label">Pace</span><div class="btns">
      <button class="${SET.pace==="learn"?"on":""}" onclick="setOpt('pace','learn')">Learn</button>
      <button class="${SET.pace==="drill"?"on":""}" onclick="setOpt('pace','drill')">Drill</button></div>
      <span class="note">${SET.pace==="drill"?"Correct answers advance automatically.":"Shows what the flag means after each answer."}</span></div>
  </div>
  <button class="btn" id="startBtn" onclick="startRound(S.pick.mode,S.pick.arg,S.pick.label,S.pick.flt)">Start · ${n} questions</button>`;
}
function viewBadges(){
  const nb=BADGES.filter(b=>badges[b.id]).length;
  return `${shell({title:"Badges",stat:nb+" of "+BADGES.length+" earned"})}
  <div class="badges">${BADGES.map(b=>`<div class="badge${badges[b.id]?" on":""}${b.big?" big":""}"><span class="be">${b.e}</span><span class="bn">${b.n}</span><span class="bh">${b.h}${badges[b.id]?" Earned "+fmtDate(badges[b.id])+".":""}</span></div>`).join("")}</div>
  <p class="small muted">A flag counts as learned at 4 points: a correct answer earns 0 on Easy, 1 on Medium, 2 on Hard, 3 on Expert, 4 on Master (3 when picking the flag); a miss costs 2. Badges are kept once earned.</p>`;
}
function viewQuiz(){
  const q=S.qs[S.i],f=BY[q.c],n=S.qs.length;
  const dots=n>30?`<i class="now" style="flex:${S.i+1} 1 0"></i><i style="flex:${n-S.i-1} 1 0"></i>`:S.qs.map((x,i)=>`<i class="${x.ans?(x.ans===x.c?"ok":"bad"):(i===S.i?"now":"")}"></i>`).join("");
  const letters="ABCDEFGHIJKLMNOP";
  const reverse=S.dir==="flag",typed=TYPED(S.diff)&&!reverse,strict=S.diff==="master";
  let prompt,opts;
  if(reverse){
    prompt=`<p class="eyebrow">Which flag?</p><p class="ask">${esc(f.n)}</p>`;
    opts=`<div class="flagopts n${q.opts.length}">${q.opts.map((c,i)=>{
      let cls="fopt";if(q.ans){if(c===q.c)cls+=" right";else if(c===q.ans)cls+=" wrong";else cls+=" dim"}
      return `<button class="${cls}" ${q.ans?"disabled":""} onclick="answer('${c}')">${img(c,"flag sm")}<span class="key">${letters[i]}${q.ans?" · "+esc(BY[c].n):""}</span></button>`}).join("")}</div>`;
  } else if(typed){
    prompt=`${img(q.c)}<p class="eyebrow">Which country? Type it.</p>`;
    opts=q.ans?"":`<form class="typebox" onsubmit="event.preventDefault();submitTyped()">
      <input id="typeIn" type="text" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" placeholder="${strict?"Exact name":"Country name"}" value="${esc(q.typed||"")}" oninput="typeInput(this.value)" onkeydown="if(event.key==='Tab'){event.preventDefault();${strict?"":"const sg=suggest(this.value);if(sg.length){this.value=BY[sg[0]].n;typeInput(this.value)}"}}">
      ${strict?"":'<div class="sugg" id="sugg"></div>'}
      <div class="row"><button type="submit" class="btn">Check</button><button type="button" class="btn line" onclick="answer('__wrong__')">Reveal</button></div></form>`;
  } else {
    prompt=`${img(q.c)}<p class="eyebrow">Which country?</p>`;
    opts=`<div class="opts">${q.opts.map((c,i)=>{
      let cls="opt";if(q.ans){if(c===q.c)cls+=" right";else if(c===q.ans)cls+=" wrong";else cls+=" dim"}
      return `<button class="${cls}" ${q.ans?"disabled":""} onclick="answer('${c}')"><span class="key">${letters[i]}</span><span>${esc(BY[c].n)}</span></button>`}).join("")}</div>`;
  }
  let reveal="";
  if(q.ans){
    const ok=q.ans===q.c,picked=BY[q.ans];
    let miss="";
    if(!ok){
      const gi=GROUP_OF[q.c]&&GROUP_OF[q.c].find(i=>GROUPS[i].f.includes(q.ans));
      const hint=gi!==undefined&&gi!==null?esc(GROUPS[gi].h):"";
      if(picked)miss=`<div class="row" style="align-items:center"><div style="flex:0 0 72px">${img(q.ans,"flag sm")}</div><p class="small muted">You picked ${esc(picked.n)}. ${hint}</p></div>`;
      else miss=`<p class="small muted">${q.typed?`"${esc(q.typed)}" didn't match a country.`:"Revealed."}</p>`;
    }
    const pill=`<span class="pill ${ok?(q.pts?"ok":""):"bad"}" style="font-family:var(--mono);font-size:12px;vertical-align:middle">${q.nowMastered?"learned":q.pts>0?"+"+q.pts:q.pts===0?"no points on easy":q.pts}</span>`;
    if(S.pace==="drill"&&!q.lore){
      reveal=ok?`<div class="card lore" style="padding:12px 16px"><p class="verdict ok">Correct · ${esc(f.n)} ${pill}</p></div>`
      :`<div class="card lore">
        <p class="verdict bad">Not quite ${pill}</p>
        <div><h2>${nameLink(q.c)}</h2><p class="capital">${capLine(q.c)}</p></div>
        ${reverse?img(q.c):""}${miss}
        <button class="link" style="text-align:left" onclick="showLore()">Show the story</button>
      </div>
      <button class="btn" onclick="next()">${S.i+1<n?"Next":"See results"}</button>`;
    } else
    reveal=`<div class="card lore">
      <p class="verdict ${ok?"ok":"bad"}">${ok?"Correct":"Not quite"}${S.streak>=3?` · ${S.streak} in a row`:""} ${pill}</p>
      ${reverse?img(q.c):""}
      <div><h2>${nameLink(q.c)}</h2><p class="capital">${capLine(q.c)}</p></div>
      <p>${esc(f.m)}</p>
      ${miss}
    </div>
    <button class="btn" onclick="next()">${S.i+1<n?"Next":"See results"}</button>`;
  }
  const right=S.qs.filter(x=>x.ans===x.c).length;
  return `
  <div class="sticky"><div class="top"><button class="back" onclick="goBack()">‹ ${esc(S.label)}</button><span class="stat">${right} right · ${S.i+1} / ${n}</span></div>
  ${S.confirmLeave?`<div class="leave"><span>Leave this round? Its score won't be kept.</span><span class="row" style="flex:none"><button class="btn line sm" onclick="goBack()">Leave</button><button class="btn sm" onclick="stayInRound()">Stay</button></span></div>`:""}
  <div class="progress">${dots}</div></div>
  ${prompt}
  ${opts}
  ${reveal}`;
}
const SITE="https://maxlep.github.io/flag-game/";
// Flag emoji: regional-indicator pairs for ISO codes; tag sequences for England, Scotland, Wales. Others have none.
function flagEmoji(c){if(EMOJI_EXTRA[c])return EMOJI_EXTRA[c];if(!/^[a-z]{2}$/.test(c))return "";return [...c.toUpperCase()].map(ch=>String.fromCodePoint(0x1F1E6+ch.charCodeAt(0)-65)).join("")}
function shareGrid(){
  const n=S.qs.length;if(n>25)return "";
  const sq=S.qs.map(q=>q.ans===q.c?"🟩":"🟥");const rows=[];for(let i=0;i<n;i+=10)rows.push(sq.slice(i,i+10).join(""));return rows.join("\n");
}
function shareMissed(){
  const seen=new Set(),m=S.qs.filter(q=>q.ans!==q.c&&!seen.has(q.c)&&seen.add(q.c)).map(q=>q.c);
  if(!m.length)return (S.earned||[]).includes("lord")?"Perfect round 👑":"Perfect round";
  const show=m.slice(0,6).map(c=>flagEmoji(c)||BY[c].n),more=m.length>6?` +${m.length-6} more`:"";
  return "Missed "+show.join(" ")+more;
}
function shareText(){
  const n=S.qs.length,right=S.qs.filter(q=>q.ans===q.c).length;
  const diff=S.diff[0].toUpperCase()+S.diff.slice(1),mode=S.dir==="flag"?" · pick the flag":"";
  const grid=shareGrid();
  return `Flags of the World · ${S.label} · ${diff}${mode}\n${right}/${n}${S.best>=5?` · streak ${S.best}`:""}${grid?"\n"+grid:""}\n${shareMissed()}\n${SITE}`;
}
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
    <p class="small">${esc(shareMissed())}</p>
    <div class="row" style="flex-wrap:nowrap"><button class="btn line" id="shareBtn" onclick="share()">Share result</button><button class="btn line icon" id="copyBtn" onclick="copyResult()" title="Copy result text" aria-label="Copy result text">${CLIP}</button></div>
    <textarea class="sharebox" id="shareTa" hidden readonly aria-label="Result text to copy"></textarea>
  </div>
  ${missed.length?`<div class="card"><h3>Missed</h3><div class="missed">${missed.map(q=>`<span class="chip">${img(q.c,"flag")}${esc(BY[q.c].n)}</span>`).join("")}</div></div>`:""}
  <button class="btn" onclick="startRound(S.mode,S.arg,S.label,S.flt)">Play again</button>
  <button class="btn ghost" onclick="goBack()">Choose another set</button>`;
}
function viewStudy(){
  const r=S.region;
  const base=r==="Whole world"?COUNTRIES:r==="Everything"?FLAGS:FLAGS.filter(f=>f.r===r);
  const list=base.slice().sort((a,b)=>a.n.localeCompare(b.n));
  const letter=f=>f.n.normalize("NFD").replace(/[\u0300-\u036f]/g,"")[0].toUpperCase();
  const letters=[...new Set(list.map(letter))];
  const index=list.length>15?`<div class="alpha" id="alpha">${letters.map(l=>`<span data-l="${l}">${l}</span>`).join("")}</div>`:"";
  let lastL="";
  const mixed=r==="Whole world"||r==="Everything";
  const status=f=>mastered(f.c)?'<span class="pill ok">learned</span>':rec(f.c).s>0?'<span class="pill">'+rec(f.c).s+' / '+MASTER+'</span>':rec(f.c).w>0?'<span class="pill bad">missed '+rec(f.c).w+'</span>':"";
  const body=list.map(f=>`<div class="entry"${(l=>l!==lastL?` data-l="${lastL=l}"`:"")(letter(f))}><button class="flink" type="button" onclick="openFlag('${f.c}')" title="View large">${img(f.c,"flag sm")}</button><div class="t"><span class="head"><span class="name">${nameLink(f.c)}</span>${status(f)}</span><span class="capital">${capLine(f.c,mixed)}</span><p>${esc(f.m)}</p></div></div>`).join("");
  const mode=r==="Whole world"?"all":r==="Everything"?"everything":"region",arg=mode==="region"?r:null;
  return `${shell({title:r,stat:list.length+" flags"})}${index}
  <div class="study${index?" indexed":""}">${body}</div>
  <button class="btn" onclick="openSetup('${mode}',${arg?`'${arg}'`:"null"},'${r}')">Quiz me on ${esc(r)}</button>`;
}
// Alphabet index: tap or drag along the letters to jump the list, like a phone's contacts list.
function wireAlpha(){
  const a=$("#alpha");if(!a)return;let bubble=null;
  const jump=(x,y)=>{const el=document.elementFromPoint(x,y);const l=el&&el.dataset&&el.dataset.l;if(!l)return;
    const target=app.querySelector(`.entry[data-l="${l}"]`);if(!target)return;
    const head=app.querySelector(".sticky");const off=(head?head.getBoundingClientRect().height:0)+8;
    window.scrollTo(0,target.getBoundingClientRect().top+window.scrollY-off);
    if(!bubble){bubble=document.createElement("div");bubble.className="alpha-bubble";document.body.appendChild(bubble)}bubble.textContent=l};
  const end=()=>{a.classList.remove("hot");if(bubble){bubble.remove();bubble=null}};
  a.addEventListener("pointerdown",e=>{a.setPointerCapture(e.pointerId);a.classList.add("hot");jump(e.clientX,e.clientY);e.preventDefault()});
  a.addEventListener("pointermove",e=>{if(a.classList.contains("hot"))jump(e.clientX,e.clientY)});
  a.addEventListener("pointerup",end);a.addEventListener("pointercancel",end);
}
function viewLook(){
  const flt=S.flt||null;
  const order=["Horizontal stripes","Vertical stripes","Cantons & crosses","Discs & stars","Triangles & serrations"];
  const sorted=GROUPS.map((g,i)=>({g,i,r:g.k,f:g.f.filter(c=>inFilter(c,flt))})).filter(x=>x.f.length>=2).sort((a,b)=>order.indexOf(a.r)-order.indexOf(b.r)||a.g.t.localeCompare(b.g.t));
  let lastR="";
  const body=sorted.map(({g,i,r,f})=>(r!==lastR?`<p class="eyebrow" style="padding-top:6px">${esc(lastR=r)}</p>`:"")+`<div class="group"><h3>${esc(g.t)}</h3><div class="flags">${f.map(c=>`<figure><button class="flink" type="button" onclick="openFlag('${c}')" title="View large">${img(c,"flag sm")}</button><figcaption>${esc(BY[c].n)}</figcaption></figure>`).join("")}</div><p class="hint">${esc(g.h)}</p><button class="btn line" onclick="openSetup('group',${i},GROUPS[${i}].t,S.flt||null)">Quiz me on this set</button></div>`).join("");
  const opt=(v,l)=>`<option value="${v}" ${(flt||"")===v?"selected":""}>${l}</option>`;
  const sel=`<select id="lookSel" onchange="S.flt=this.value||null;render();window.scrollTo(0,0)">${opt("","All flags")}<optgroup label="Countries">${REGIONS.map(r=>opt(r,r)).join("")}${opt("countries","All countries")}</optgroup><optgroup label="Beyond the countries">${SETS.map(x=>opt(x,x)).join("")}</optgroup></select>`;
  return `${shell({title:"Look-alikes",stat:sorted.length+" sets",extra:sel})}
  <div class="study">${body||'<p class="muted small">No look-alike sets have two or more flags in this filter.</p>'}</div>
  ${sorted.length?`<button class="btn" onclick="openSetup('lookmix',null,'Look-alikes',S.flt||null)">Mixed round across ${flt?"these":"all"} sets</button>`:""}`;
}

// ---------- FLAG VIEWER ----------
let LB=null; // {c, scale, x, y, pts:Map, last:{...}}
function openFlag(c){
  closeFlag();
  const el=document.createElement("div");el.className="lb";el.id="lb";
  el.innerHTML=`<div class="lb-top"><span class="nm">${esc(BY[c].n)}</span><div class="ctl">
    <button type="button" onclick="lbZoom(1/1.5)" aria-label="Zoom out">−</button><button type="button" onclick="lbZoom(1.5)" aria-label="Zoom in">+</button><button type="button" onclick="closeFlag()" aria-label="Close">×</button></div></div>
    <div class="lb-stage" id="lbStage">${img(c,"flag").replace('loading="lazy"','')}</div>
    <p class="lb-hint">Pinch or scroll to zoom · drag to pan · double-tap to reset</p>`;
  document.body.appendChild(el);document.body.style.overflow="hidden";
  LB={c,scale:1,x:0,y:0,pts:new Map(),el,fl:el.querySelector(".flag .fl"),stage:el.querySelector("#lbStage")};
  LB.baseW=LB.fl.getBoundingClientRect().width;
  const st=LB.stage;
  st.addEventListener("pointerdown",e=>{st.setPointerCapture(e.pointerId);LB.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});LB.start={scale:LB.scale,x:LB.x,y:LB.y,pts:[...LB.pts.values()]};LB.moved=false;st.classList.add("drag")});
  st.addEventListener("pointermove",e=>{if(!LB.pts.has(e.pointerId))return;LB.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const cur=[...LB.pts.values()],s0=LB.start;
    if(cur.length===1&&s0.pts.length===1){LB.x=s0.x+(cur[0].x-s0.pts[0].x);LB.y=s0.y+(cur[0].y-s0.pts[0].y)}
    else if(cur.length>=2&&s0.pts.length>=2){const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const want=s0.scale*d(cur[0],cur[1])/Math.max(1,d(s0.pts[0],s0.pts[1]));const ns=Math.min(8,Math.max(1,want)),r=ns/s0.scale;
      const m0={x:(s0.pts[0].x+s0.pts[1].x)/2,y:(s0.pts[0].y+s0.pts[1].y)/2},m1={x:(cur[0].x+cur[1].x)/2,y:(cur[0].y+cur[1].y)/2},C=lbCenter();
      // keep the point under the fingers' midpoint fixed while scaling, then follow the midpoint
      LB.scale=ns;LB.x=m1.x-C.x-r*(m0.x-C.x-s0.x);LB.y=m1.y-C.y-r*(m0.y-C.y-s0.y)}
    if(Math.abs(LB.x-s0.x)+Math.abs(LB.y-s0.y)>6||LB.scale!==s0.scale)LB.moved=true;
    lbApply()});
  const up=e=>{LB.pts.delete(e.pointerId);LB.start={scale:LB.scale,x:LB.x,y:LB.y,pts:[...LB.pts.values()]};if(!LB.pts.size)st.classList.remove("drag")};
  st.addEventListener("pointerup",up);st.addEventListener("pointercancel",up);
  st.addEventListener("wheel",e=>{e.preventDefault();lbZoom(Math.exp(-e.deltaY*0.0015),{x:e.clientX,y:e.clientY})},{passive:false});
  st.addEventListener("dblclick",e=>{if(LB.scale>1){LB.scale=1;LB.x=0;LB.y=0;lbApply()}else lbZoom(2.5,{x:e.clientX,y:e.clientY})});
  el.addEventListener("click",e=>{if(e.target===st&&!LB.moved)closeFlag()});
}
// The flag is centred in the stage and transformed as translate(x,y) scale(s) about its own centre C, so a local
// offset q shows at C+t+s·q. Zooming by f about a screen point P keeps the point under P fixed: t' = (1-f)(P-C) + f·t.
function lbCenter(){const r=LB.stage.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}
function lbZoom(f,P){if(!LB)return;const ns=Math.min(8,Math.max(1,LB.scale*f));f=ns/LB.scale;if(f===1)return;
  const C=lbCenter();P=P||C;LB.x=(1-f)*(P.x-C.x)+f*LB.x;LB.y=(1-f)*(P.y-C.y)+f*LB.y;LB.scale=ns;
  if(ns===1){LB.x=0;LB.y=0}lbApply()}
// Zoom by resizing the element rather than transform:scale, so the SVG is re-rendered sharp at every level.
function lbApply(){if(!LB)return;LB.fl.style.width=(LB.baseW*LB.scale).toFixed(1)+"px";LB.fl.style.transform=`translate(${LB.x}px,${LB.y}px)`}
function closeFlag(){if(!LB)return;LB.el.remove();document.body.style.overflow="";LB=null}

// ---------- BOOT ----------
load();loadSet();loadB();
function start(data){
  if(data&&data.S)S=data.S;
  else{const r=loadRound();if(r){S=r;S.confirmLeave=false;S.timer=null;
    // a Drill round saved right after a correct answer should move on as it would have
    if(S.view==="quiz"&&S.pace==="drill"){const q=S.qs[S.i];if(q.ans&&q.ans===q.c)S.timer=setTimeout(next,400)}}}
  render();
}
if(window.claude?.hot?.snapshot)window.claude.hot.snapshot(()=>({S}));
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
