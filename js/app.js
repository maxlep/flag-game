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
function suggest(text){const t=norm(text);return t.length<2?[]:suggestAll(t,true).slice(0,6)}

// ---------- SETTINGS ----------
const SKEY="flaglore.settings";
let SET={len:10,diff:"medium",dir:"name",pace:"learn",scope:"countries",variant:"national"};
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
 {id:"explorer",e:"🧭",n:"Explorer",h:"Finish a full All-territories round at any difficulty."},
 {id:"sharp25",e:"🎯",n:"Sharp Eye",h:"A perfect round of 25 or more on Hard or harder."},
 {id:"mirror",e:"🪞",n:"Mirror Image",h:"A perfect round of 25 or more in Pick-the-flag on Hard."},
 {id:"twins",e:"👯",n:"Twin Spotter",h:"Perfect rounds in 10 different look-alike sets."},
 {id:"streak50",e:"⚡",n:"Unstoppable",h:"50 correct in a row."},
 {id:"typed25",e:"🐝",n:"Spelling Bee",h:"A perfect typed round of 25 or more."},
 {id:"m100",e:"📚",n:"Vexillologist",h:"100 flags learned."},
 {id:"purist",e:"🧠",n:"Purist",h:"A perfect typed round of 25 or more on Master: exact names, no help."},
 {id:"hawk",e:"🦅",n:"Hawkeye",h:"A perfect Pick-the-flag round of 25 or more on Master: the right flag among sixteen."},
 {id:"carto",e:"🗺️",n:"Cartographer",h:"Every territory, region and organisation flag learned."},
 {id:"streak100",e:"💯",n:"Centurion",h:"100 correct in a row."},
 {id:"m197",e:"🏆",n:"Completionist",h:"Every country's flag learned."},
 ...REGIONS.map(r=>({id:"lord-"+r,n:"Lord of "+r,e:"🛡️",h:"A full "+r+" round on Master, typed, with no misses."})),
 {id:"lord",n:"Flag Lord",e:"👑",h:"A full Whole World round on Master, typed, with no misses. All 197 names exact, no mistakes.",big:1},
 {id:"emperor",e:"🌐",n:"Flag Emperor",h:"A full Everything round on Master, typed, with no misses. Every flag, names exact, no mistakes.",big:1}
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
  if(perfect&&n>=25&&S.dir==="flag"&&S.diff==="master")award("hawk");
  if(S.mode==="all"&&S.full&&S.scope==="countries")award("tour");
  if(S.mode==="all"&&S.full&&S.scope==="territories")award("explorer");
  if(S.mode==="group"&&perfect){const t=badges._twins=badges._twins||[];if(!t.includes(S.arg))t.push(S.arg);if(t.length>=10)award("twins")}
  if(S.best>=25)award("streak25");if(S.best>=50)award("streak50");if(S.best>=100)award("streak100");
  if(mc>=50)award("m50");if(mc>=100)award("m100");if(mc>=COUNTRIES.length)award("m197");
  if(QUIZ.filter(f=>!f.sov).every(f=>mastered(f.c)))award("carto");
  if(S.mode==="region"&&S.full&&perfect&&strict&&REGIONS.includes(S.arg)&&S.scope!=="territories")award("lord-"+S.arg);
  if(S.mode==="all"&&S.full&&perfect&&strict&&S.scope==="countries")award("lord");
  if(S.mode==="all"&&S.full&&perfect&&strict&&S.scope==="all")award("emperor");
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
  const where=f.sov?f.r:geoOf(f)+" · territory";
  return `${plain?esc(f.cap):wl(L.cap,esc(f.cap))}${showRegion?" · "+where:""} · ${wl(L.flag,y?"Flag adopted "+y:"Flag","The flag on Wikipedia")}`}
const fmtDate=t=>new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

// ---------- STATE ----------
let S={view:"home"};
const $=s=>document.querySelector(s);
const app=$("#app");
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
// Variants: VARIANTS[c] lists a flag's official designs for use on land (civil, state, reverse). Entry 0 is the
// artwork at flags-true/<c>.svg, the rest at flags-true/<c>-<k>.svg. Most flags have one design and no entry.
const VARS=c=>(typeof VARIANTS==="object"&&VARIANTS[c])||null;
const useLabel=(c,vi=0)=>{const v=VARS(c);if(v)return v[vi].l;return (typeof USE==="object"&&USE[c])||(BY[c].sov?"National flag":"Flag")};
// Which variant a round shows: the setting names a kind; a flag without that kind shows its main design.
function variantIdx(c,how){const v=VARS(c);if(!v)return 0;if(how==="random")return Math.floor(Math.random()*v.length);const i=v.findIndex(x=>x.k===how);return i<0?0:i}
// Official width:height ratios (TRUER); a variant can carry its own ratio. Flags without true-proportion artwork fall
// back to the 4:3 set. Each flag sits in a 4:3 slot and is sized to roughly equal area, capped by the slot, so a wide
// flag like Qatar reads as wider rather than merely shorter.
// A flag with several designs carries all of them, one visible; switching designs then only toggles a hidden
// attribute, so nothing reloads or flickers.
const img=(c,cls="flag",vi=0)=>{
  const v=VARS(c)||[null],tru=TRUER[c],src=tru?"flags-true":"flags";
  const one=(ve,i)=>{const stem=ve&&i?c+"-"+ve.k:c,r=ve&&ve.r||(tru?TRUER[c]:4/3),w=tru?Math.min(100,75*r,100*Math.sqrt(0.62*r)):100;
    return `<div class="fl${BARE.has(c)||ve&&ve.bare?" bare":""}" data-v="${i}" style="--r:${r};--w:${w.toFixed(1)}%"${i===vi?"":" hidden"}><img src="${src}/${stem}.svg" alt="Flag of ${BY[c].n}"${i===vi?' loading="lazy"':""}></div>`};
  return `<div class="${cls}" data-c="${c}">${v.map(one).join("")}</div>`};
// Switch every rendered copy of flag c to design i, in place.
function showVariant(c,i){
  app.querySelectorAll(`.flag[data-c="${c}"] .fl`).forEach(fl=>{fl.hidden=+fl.dataset.v!==i});
  app.querySelectorAll(`.vchips[data-c="${c}"]`).forEach(ch=>[...ch.children].forEach((b,j)=>b.classList.toggle("on",j===i)));
  app.querySelectorAll(`.vline[data-c="${c}"]`).forEach(p=>p.outerHTML=useLine(c,i));
}
// One line naming the design on screen (text only), and a separate row of chips to switch designs. Keeping them apart
// means the chips sit in a fixed spot under the flag and never move with the length of the label.
function useLine(c,vi){const v=VARS(c),cur=v&&v[vi];return `<p class="vline" data-c="${c}">${cur?esc(cur.l)+(cur.d?" · "+esc(cur.d):""):esc(useLabel(c))}</p>`}
function vchips(c,vi,onpick,hidden){const v=VARS(c);if(!v)return "";return `<div class="vchips${hidden?" hide":""}" data-c="${c}">${v.map((x,i)=>`<button type="button" class="chipbtn${i===vi?" on":""}" onmousedown="event.preventDefault()" onclick="${onpick.replace("%i",i)}">${esc(x.k[0].toUpperCase()+x.k.slice(1))}</button>`).join("")}</div>`}
const esc=s=>s.replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));

// Look-alike filter: a region name or null for all regions. The scope setting applies on top.
// Scope (Countries / All / Territories) is one saved setting that filters every list and round. geoOf places every flag in a region.
const geoOf=f=>f.sov?f.r:GEO[f.c];
const inScope=f=>SET.scope==="all"||(SET.scope==="countries"?f.sov:!f.sov);
// Pools leave out study-only flags (NOQUIZ); study lists ask for them with all=true.
const QUIZ=FLAGS.filter(f=>!NOQUIZ.has(f.c));
const SCOPED=all=>(all?FLAGS:QUIZ).filter(inScope);
const ALLREGIONS=[...REGIONS,"Antarctic","Organisations"];
const regionFlags=(r,all)=>SCOPED(all).filter(f=>geoOf(f)===r);
const scopeName=()=>SET.scope==="countries"?"Whole world":SET.scope==="all"?"Everything":"All territories";
const inFilter=(c,flt)=>!flt||geoOf(BY[c])===flt;
const filterLabel=flt=>!flt?"":flt==="countries"?"Countries":flt;
function poolFor(mode,arg,flt){
  if(mode==="region")return regionFlags(arg).map(f=>f.c);
  if(mode==="all")return SCOPED().map(f=>f.c);
  if(mode==="weak")return SCOPED().map(f=>f.c).filter(c=>rec(c).w>0&&!mastered(c));
  if(mode==="group")return GROUPS[arg].f.filter(c=>inScope(BY[c])&&inFilter(c,flt));
  if(mode==="lookmix")return [...new Set(GROUPS.flatMap(g=>g.f))].filter(c=>inScope(BY[c])&&inFilter(c,flt));
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
  const same=shuffle(QUIZ.filter(x=>geoOf(x)===geoOf(f)&&x.c!==c).map(x=>x.c));
  const any=shuffle(QUIZ.map(x=>x.c).filter(x=>x!==c));
  if(mode==="group"||mode==="lookmix"||diff==="hard"||TYPED(diff)){add(gm);add(same)}
  else if(diff==="medium"){add(same)}
  add(any);
  return [...out];
}
const here=()=>({view:S.view,region:S.region,pick:S.pick,flt:S.flt,scroll:window.scrollY});
// The round in progress (and its results screen) is kept in localStorage so a refresh resumes it.
const RKEY="flaglore.round";
function saveRound(){try{if(S.view==="quiz"||S.view==="done"){const {timer,...rest}=S;localStorage.setItem(RKEY,JSON.stringify(rest))}else localStorage.removeItem(RKEY)}catch(e){}}
function loadRound(){try{const s=localStorage.getItem(RKEY);if(!s)return null;const r=JSON.parse(s);if(r&&r.mode==="everything"){r.mode="all";r.scope="all"}if(r&&!r.scope)r.scope=r.mode==="region"&&!REGIONS.includes(r.arg)?"all":"countries";return r&&r.qs&&r.qs.length?r:null}catch(e){return null}}
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
  const qs=order.map(c=>{const opts=shuffle([c,...distractors(c,diff,mode,nOpt-1)]);return {c,opts,v:variantIdx(c,SET.variant),ov:opts.map(o=>variantIdx(o,SET.variant)),ans:null,typed:""}});
  S={view:"quiz",mode,arg,label,flt,scope:SET.scope,qs,i:0,streak:0,best:0,diff:grp&&!TYPED(diff)?"hard":diff,dir:SET.dir,nOpt,pace:SET.pace,variant:SET.variant,from,full};
  saveRound();render();window.scrollTo(0,0);
}
function submitTyped(){
  const inp=$("#typeIn");if(!inp)return;
  if(S.qs[S.i].ans){next();return}
  const text=inp.value.trim();if(!text)return;
  const k=S.diff==="master"?matchStrict(text):matchTyped(text);
  const q=S.qs[S.i];q.typed=text;
  answer(k||"__wrong__");
}
function typeInput(v){
  const q=S.qs[S.i];q.typed=v;
  const box=$("#sugg");if(!box)return;
  box.innerHTML=suggest(v).map(c=>`<button type="button" onmousedown="event.preventDefault()" onclick="pickSugg('${c}')">${esc(BY[c].n)}</button>`).join("");
}
function pickSugg(c){const inp=$("#typeIn");if(inp)inp.value=BY[c].n;submitTyped()}
function answer(k){
  const q=S.qs[S.i];if(q.ans)return;
  q.ans=k;const ok=k===q.c;S.confirmLeave=false; // carrying on answers the "leave this round?" question
  const r=rec(q.c);const pts=S.diff==="master"&&S.dir==="flag"?3:(PTS[S.diff]||0);
  if(ok){r.c++;r.s=Math.min(8,(r.s||0)+pts);q.pts=pts}else{r.w++;r.s=Math.max(-4,(r.s||0)-2);q.pts=-2}
  q.nowMastered=ok&&r.s>=MASTER&&r.s-pts<MASTER;
  prog[q.c]=r;save();
  S.streak=ok?S.streak+1:0;S.best=Math.max(S.best,S.streak);
  saveRound();render();
  if(S.pace==="drill"&&ok){clearTimeout(S.timer);S.timer=setTimeout(next,650);return}
  requestAnimationFrame(()=>{const mid=$("#qmid"),card=mid&&mid.querySelector(".card.lore");if(!card)return;
    // The whole card if it fits under the flag, otherwise its top.
    card.scrollIntoView({block:card.offsetHeight<mid.clientHeight*0.6?"end":"start",behavior:"smooth"})});
}
function next(){ clearTimeout(S.timer);S.timer=null;S.confirmLeave=false; if(S.i+1<S.qs.length){S.i++;saveRound();render();window.scrollTo(0,0);wake()} else {S.earned=checkBadges();S.view="done";saveRound();render();window.scrollTo(0,0)} }
function showLore(){const q=S.qs[S.i];q.lore=true;render()}
// A phone can hide its keyboard while the box keeps focus; a blur and focus during the tap brings it back.
function wake(){const t=$("#typeIn");if(t&&document.activeElement===t&&!document.body.classList.contains("kb")){t.blur();t.focus({preventScroll:true})}}
function setQVar(i){const q=S.qs[S.i];q.v=i;saveRound();showVariant(q.c,i)}
// Keyboard: A-D or 1-4 pick an option, Enter moves on.
document.addEventListener("keydown",e=>{
  if(ZS&&e.key==="Escape"){if(ZBOX)ZBOX._z.drop(true);return}
  if(LB){if(e.key==="Escape")closeFlag();else if(e.key==="ArrowLeft"||e.key==="ArrowRight")lbGo(LB.vi+(e.key==="ArrowRight"?1:-1));return}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==="Tab"&&S.view==="quiz"){e.preventDefault();const inp=$("#typeIn");if(inp&&document.activeElement!==inp)inp.focus();return}
  const t=e.target.tagName;if(t==="INPUT"||t==="SELECT"||t==="TEXTAREA"||t==="BUTTON")return;
  if(S.view==="setup"){if(e.key==="Enter"&&$("#startBtn")){e.preventDefault();startRound(S.pick.mode,S.pick.arg,S.pick.label,S.pick.flt)}else if(e.key==="Escape")goBack();return}
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
// Pinned bars get an edge once content scrolls under them.
function shade(){const st=app.querySelector(".sticky"),dk=app.querySelector(".dock,.qdrawer"),mid=$("#qmid");
  const y=mid?mid.scrollTop:window.scrollY,left=mid?mid.scrollHeight-mid.clientHeight-mid.scrollTop:document.documentElement.scrollHeight-window.innerHeight-window.scrollY;
  if(st)st.classList.toggle("scrolled",y>4);
  if(dk)dk.classList.toggle("lift",left>4)}
window.addEventListener("scroll",shade,{passive:true});window.addEventListener("resize",shade);app.addEventListener("scroll",shade,true);
// On the quiz screen only the middle band scrolls, and only when it has something to scroll; any other touch drag is
// swallowed so a phone can't scroll the page beneath (iOS does that even with the body locked).
app.addEventListener("touchmove",e=>{if(S.view!=="quiz")return;const m=$("#qmid");if(!(m&&m.contains(e.target)&&m.scrollHeight>m.clientHeight))e.preventDefault()},{passive:false});
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
function fitFlag(){const mid=$("#qmid");if(!mid)return;const cs=getComputedStyle(mid),chips=mid.querySelector(".flag.big + .vchips");
  const h=mid.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-(chips?chips.offsetHeight+parseFloat(cs.rowGap||cs.gap||0):0);
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
document.addEventListener("focusin",e=>{if(e.target.id==="typeIn")[100,350,700].forEach(t=>setTimeout(keyboard,t))});
document.addEventListener("pointerdown",e=>{if(e.target.id==="typeIn"&&e.pointerType==="touch")preKeyboard()},{capture:true}); // touch only: a mouse brings no keyboard
// Rebuild the screen around one element that must survive (the focused answer box): walk up from it, and at each
// level keep the old ancestor, copy the new one's attributes onto it, and swap all its other children for the new ones.
function patchAround(oldLeaf,newLeaf){
  let o=oldLeaf,n=newLeaf;
  while(o!==app){
    const op=o.parentNode,np=n.parentNode,top=op===app;
    if(!top){[...op.attributes].forEach(a=>{if(!np.hasAttribute(a.name))op.removeAttribute(a.name)});[...np.attributes].forEach(a=>op.setAttribute(a.name,a.value))}
    [...op.childNodes].forEach(c=>{if(c!==o)c.remove()});
    const kids=[...np.childNodes],i=kids.indexOf(n);
    kids.slice(0,i).forEach(k=>op.insertBefore(k,o));kids.slice(i+1).forEach(k=>op.appendChild(k));
    o=op;n=np;
  }
}
function render(){
  requestAnimationFrame(shade);
  document.body.classList.toggle("quiz",S.view==="quiz");
  if(S.view==="quiz"){window.scrollTo(0,0);keyboard();requestAnimationFrame(fitFlag)} // the screen's height must be right before it is drawn
  if(S.view==="quiz"){
    const old=document.activeElement,oldForm=old&&old.id==="typeIn"&&app.contains(old)?old.closest("form.typebox"):null;
    const html=viewQuiz();
    if(!oldForm){app.innerHTML=html;const t=$("#typeIn");if(t)t.focus({preventScroll:true});wireZoom();return}
    // A focused answer box is never replaced: phones close the keyboard, or scroll, when focus moves. The box is
    // patched in place (read-only, placeholder, value) and everything around it is swapped for the new screen.
    const tmp=document.createElement("template");tmp.innerHTML=html;
    const newForm=tmp.content.querySelector("form.typebox");
    if(!newForm){app.innerHTML=html;return}
    const ni=newForm.querySelector("#typeIn");
    for(const a of ["readonly","placeholder","enterkeyhint"]){if(ni.hasAttribute(a))old.setAttribute(a,ni.getAttribute(a));else old.removeAttribute(a)}
    if(old.value!==ni.value)old.value=ni.value;
    patchAround(old,ni);
    wireZoom();return}
  if(S.view==="done")return app.innerHTML=viewDone();
  if(S.view==="setup")return app.innerHTML=viewSetup();
  if(S.view==="study"){app.innerHTML=viewStudy();wireAlpha();return}
  if(S.view==="look")return app.innerHTML=viewLook();
  if(S.view==="badges")return app.innerHTML=viewBadges();
  app.innerHTML=viewHome();checkVersion();
}
function shell(sub){
  const total=QUIZ.length,m=QUIZ.filter(f=>mastered(f.c)).length,lord=!!badges.lord;
  if(!sub)return `<div class="sticky"><div class="top"><div><h1 class="brand">Flags of the world</h1>${lord?`<p class="eyebrow" style="color:var(--gold)">Flag Lord · since ${fmtDate(badges.lord)}</p>`:""}</div><span class="stat">${m}/${total}</span></div></div>`;
  return `<div class="sticky"><div class="top"><button class="back" onclick="goBack()">‹ ${esc(sub.back||"Home")}</button><span class="stat">${esc(sub.stat||"")}</span></div>${sub.extra?`<div class="top titlerow"><h2 class="subtitle">${esc(sub.title)}</h2>${sub.extra}</div>`:`<h2 class="subtitle">${esc(sub.title)}</h2>`}</div>`;
}
// A home card: the card itself starts a round; the trailing link opens the study list.
const BOOK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>`;
function card(o){
  const main=`<button class="tmain" onclick="${o.go}"><span class="name${o.name.length>14?" sm":""}">${esc(o.name)}${o.mark?`<span class="mark" title="${esc(o.mark)}" aria-label="${esc(o.mark)}">🛡️</span>`:""}</span><span class="count">${o.count}</span>${o.bar!==undefined?`<span class="bar"><i style="width:${o.bar}%"></i></span>`:""}</button>`;
  const study=o.study?`<button class="tstudy" onclick="${o.study}" aria-label="Study ${esc(o.name)}">${BOOK}Study</button>`:"";
  return `<div class="tile${o.wide?" wide":""}">${main}${study}</div>`;
}
function setCards(list){
  return list.map(r=>{const all=regionFlags(r);if(!all.length)return "";const m=all.filter(f=>mastered(f.c)).length;
    return card({name:r,mark:badges["lord-"+r]&&SET.scope==="countries"?"Lord of "+r:"",count:m+" / "+all.length+" learned",bar:Math.round(100*m/all.length),go:`openSetup('region','${r}','${r}')`,study:`openStudy('${r}')`})}).join("");
}
const SCOPES=[["countries","Countries"],["territories","Territories"],["all","All"]];
const scopeSeg=(note,label)=>`<div class="seg">${label?'<span class="label">Flags</span>':""}<div class="btns">${SCOPES.map(([v,l])=>`<button class="${SET.scope===v?"on":""}" onclick="setOpt('scope','${v}')">${l}</button>`).join("")}</div>${note?`<span class="note">${note}</span>`:""}</div>`;
function viewHome(){
  const weak=poolFor("weak").length,nb=BADGES.filter(b=>badges[b.id]).length;
  const learned=l=>l.filter(f=>mastered(f.c)).length;
  return `${shell()}
  <p class="muted small">Name the flag, then read what it stands for. Tap a set to play it, or Study to read through it. Flags you miss come back sooner.</p>
  <div class="kbd"><span class="eyebrow">Keyboard</span><span><kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> answer</span><span><kbd>Enter</kbd> starts and continues</span><span><kbd>Esc</kbd> goes back</span></div>
  ${scopeSeg()}
  <p class="eyebrow">Regions</p>
  <div class="tiles">${setCards(ALLREGIONS)}
    ${card({wide:true,name:scopeName(),count:learned(SCOPED())+" / "+SCOPED().length+" learned",go:`openSetup('all',null,'${scopeName()}')`,study:`openStudy('${scopeName()}')`})}
  </div>
  <p class="eyebrow" style="padding-top:4px">Practice</p>
  <div class="tiles">
    ${card({wide:true,name:"Look-alikes",count:GROUPS.filter(g=>g.f.filter(c=>inScope(BY[c])).length>=2).length+" sets · mixed round",go:"openSetup('lookmix',null,'Look-alikes')",study:"openLook()"})}
    ${weak?card({wide:true,name:"Weak spots",count:weak+" to fix",go:"openSetup('weak',null,'Weak spots')"}):`<div class="tile wide dim"><span class="tmain"><span class="name">Weak spots</span><span class="count">nothing missed yet</span></span></div>`}
    ${card({wide:true,name:"Badges",count:nb+" / "+BADGES.length+" earned ›",go:"openBadges()"})}
  </div>
  <div class="foot"><span class="small muted">Progress is saved on this device.</span><button class="link" onclick="resetAsk()">Reset progress</button></div>
  <p class="ver" id="ver"><span class="stamp">${location.pathname.includes("/preview/")?"preview · ":""}${typeof VERSION==="object"?"updated "+VERSION.at:""}<button class="refresh" onclick="hardReload()" title="Reload the page" aria-label="Reload">↻</button></span></p>`;
}
// Compare this build with the one the site is serving; say so if that one is newer. Fails silently from a local file.
// A hard reload fetches a fresh index.html (whose asset links carry the version), so the browser can't mix old and new.
function hardReload(){location.replace(location.pathname+"?r="+Date.now())}
let VER_CHECKED=null;
async function checkVersion(){
  if(typeof VERSION!=="object"||VER_CHECKED!==null)return;VER_CHECKED=false;
  try{const r=await fetch("js/version.js?"+Date.now(),{cache:"no-store"});
    const m=(await r.text()).match(/at:"([^"]+)"/);if(!m)return;VER_CHECKED=m[1];
    const el=$("#ver");if(el&&VER_CHECKED>VERSION.at)el.innerHTML=`<button class="stale" onclick="hardReload()">A newer version is available, reload</button>`+el.innerHTML;
  }catch(e){}
}
function resetAsk(){
  const f=app.querySelector(".foot");
  f.innerHTML=`<span class="small">Clear all progress?</span><span class="row" style="flex:none"><button class="link" onclick="prog={};badges={};save();saveB();render()">Yes, clear</button><button class="link" onclick="render()">Keep</button></span>`;
}
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
  let prompt,opts,ask="";
  if(reverse){
    prompt=`<p class="eyebrow">Which flag?</p><p class="ask">${esc(f.n)}</p>`;
    opts=`<div class="flagopts n${q.opts.length}">${q.opts.map((c,i)=>{
      let cls="fopt";if(q.ans){if(c===q.c)cls+=" right";else if(c===q.ans)cls+=" wrong";else cls+=" dim"}
      return `<button class="${cls}" ${q.ans?"disabled":""} onclick="answer('${c}')">${img(c,"flag sm",q.ov?q.ov[i]:0)}<span class="key">${letters[i]}${q.ans?" · "+esc(BY[c].n):""}</span></button>`}).join("")}</div>`;
  } else if(typed){
    prompt=`${img(q.c,"flag big",q.v||0)}${vchips(q.c,q.v||0,"setQVar(%i)",!q.ans)}`;ask=`<p class="eyebrow">Which country? Type it.</p>`;
    // After the answer the box stays, read-only, so the keyboard stays open; Enter in it moves on.
    opts=`<form class="typebox" onsubmit="event.preventDefault();submitTyped()">
      <input id="typeIn" name="q" type="text" inputmode="text" enterkeyhint="${q.ans?"next":"go"}" ${q.ans?"readonly":""} autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" placeholder="${q.ans?"Enter for next":strict?"Spell it exactly":"Your answer"}" value="${esc(q.typed||"")}" oninput="typeInput(this.value)" onkeydown="if(event.key==='Tab'){event.preventDefault();${strict?"":"const sg=suggest(this.value);if(sg.length){this.value=BY[sg[0]].n;typeInput(this.value)}"}}">
      ${strict||q.ans?"":'<div class="sugg" id="sugg"></div>'}
      ${q.ans?"":`<div class="row"><button type="submit" class="btn" onmousedown="event.preventDefault()">Check</button><button type="button" class="btn line" onmousedown="event.preventDefault()" onclick="answer('__wrong__')">Reveal</button></div>`}</form>`;
  } else {
    prompt=`${img(q.c,"flag big",q.v||0)}${vchips(q.c,q.v||0,"setQVar(%i)",!q.ans)}`;ask=`<p class="eyebrow">Which country?</p>`;
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
        ${reverse?img(q.c,"flag",q.v||0):""}${miss}
        <button class="link" style="text-align:left" onclick="showLore()">Show the story</button>
      </div>
`;
    } else
    reveal=`<div class="card lore">
      <p class="verdict ${ok?"ok":"bad"}">${ok?"Correct":"Not quite"}${S.streak>=3?` · ${S.streak} in a row`:""} ${pill}</p>
      ${reverse?img(q.c,"flag",q.v||0)+vchips(q.c,q.v||0,"setQVar(%i)"):""}
      <div><h2>${nameLink(q.c)}</h2><p class="capital">${capLine(q.c)}</p>${useLine(q.c,q.v||0)}</div>
      <p>${esc(f.m)}</p>
      ${miss}
    </div>`;
  }
  const nextBtn=q.ans?`<button class="btn" id="nextBtn" onmousedown="event.preventDefault()" onclick="next()">${S.i+1<n?"Next":"See results"}</button>`:"";
  const right=S.qs.filter(x=>x.ans===x.c).length;
  return `<div class="qscreen">
  <div class="sticky"><div class="top"><button class="back" onclick="goBack()">‹ Exit</button><span class="stat">${location.hash==="#debug"?`vv ${VVH} full ${FULLH} in ${innerHeight} off ${getComputedStyle(document.documentElement).getPropertyValue("--vvt")} flag ${getComputedStyle(document.documentElement).getPropertyValue("--flagh")} ${document.body.classList.contains("kb")?"kb":""}`:`${esc(S.label)} · ${right} right · ${S.i+1} / ${n}`}</span></div>
  ${S.confirmLeave?`<div class="leave"><span>Leave this round? Its score won't be kept.</span><span class="row" style="flex:none"><button class="btn line sm" onclick="goBack()">Leave</button><button class="btn sm" onclick="stayInRound()">Stay</button></span></div>`:""}
  <div class="progress">${dots}</div></div>
  <div class="qmid" id="qmid">${prompt}${reverse?opts:""}${reveal}</div>
  <div class="qdrawer${q.ans?" answered":""}${reverse&&!q.ans?" empty":""}">${q.ans?"":ask}${reverse?"":opts}${nextBtn}</div>
  </div>`;
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
  const diff=S.diff[0].toUpperCase()+S.diff.slice(1),mode=S.dir==="flag"?"pick the flag":"name the flag";
  const scope=S.mode==="region"&&S.scope==="all"?" with territories":S.mode==="region"&&S.scope==="territories"?" territories":"";
  const variant=S.variant&&S.variant!=="national"?` · ${S.variant} designs`:"";
  const grid=shareGrid();
  return `Flags of the World · ${S.label}${scope}\n${right}/${n} · ${diff} · ${mode}${variant}${S.best>=5?` · streak ${S.best}`:""}${grid?"\n"+grid:""}\n${shareMissed()}\n${SITE}`;
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
    <div class="row" style="flex-wrap:nowrap"><button class="btn line" id="shareBtn" onclick="share()">Share result</button><button class="btn line icon" id="copyBtn" onclick="copyResult()" title="Copy result text" aria-label="Copy result text">${CLIP}</button></div>
    <textarea class="sharebox" id="shareTa" hidden readonly aria-label="Result text to copy"></textarea>
  </div>
  ${missed.length?`<div class="card"><h3>Missed</h3><div class="missed">${missed.map(q=>`<span class="chip">${img(q.c,"flag")}${esc(BY[q.c].n)}</span>`).join("")}</div></div>`:""}
  <button class="btn" onclick="startRound(S.mode,S.arg,S.label,S.flt)">Play again</button>
  <button class="btn ghost" onclick="goBack()">Choose another set</button>`;
}
function studyVar(btn,i){const en=btn.closest(".entry");en.dataset.v=i;showVariant(en.dataset.c,i)}
function viewStudy(){
  const r=S.region;
  const wide=["Whole world","Everything","All territories"].includes(r);
  const base=wide?SCOPED(true):regionFlags(r,true);
  const list=base.slice().sort((a,b)=>a.n.localeCompare(b.n));
  const letter=f=>f.n.normalize("NFD").replace(/[\u0300-\u036f]/g,"")[0].toUpperCase();
  const letters=[...new Set(list.map(letter))];
  const index=list.length?`<div class="alpha" id="alpha">${letters.map(l=>`<span data-l="${l}">${l}</span>`).join("")}</div>`:"";
  let lastL="";
  const mixed=wide||SET.scope!=="countries";
  const status=f=>NOQUIZ.has(f.c)?'<span class="pill">not quizzed</span>':mastered(f.c)?'<span class="pill ok">learned</span>':rec(f.c).s>0?'<span class="pill">'+rec(f.c).s+' / '+MASTER+'</span>':rec(f.c).w>0?'<span class="pill bad">missed '+rec(f.c).w+'</span>':"";
  const body=list.map(f=>{const l=letter(f),head=l!==lastL?`<p class="eyebrow letter" data-l="${lastL=l}">${l}</p>`:"";if(l!==lastL)lastL=l;return head+`<div class="entry" data-c="${f.c}" data-v="0"><div class="fcol"><button class="flink" type="button" onclick="openFlag('${f.c}',+this.closest('.entry').dataset.v)" title="View large">${img(f.c,"flag sm")}</button>${vchips(f.c,0,"studyVar(this,%i)")}</div><div class="t"><span class="head"><span class="name">${nameLink(f.c)}</span>${status(f)}</span><span class="capital">${capLine(f.c,mixed)}</span>${VARS(f.c)||NOQUIZ.has(f.c)?useLine(f.c,0):""}<p>${esc(f.m)}</p></div></div>`}).join("");
  const mode=wide?"all":"region",arg=mode==="region"?r:null;
  const sel=`<select id="scopeSel" onchange="if(['Whole world','Everything','All territories'].includes(S.region))S.region={countries:'Whole world',all:'Everything',territories:'All territories'}[this.value];setOpt('scope',this.value)">${SCOPES.map(([v,l])=>`<option value="${v}" ${SET.scope===v?"selected":""}>${l}</option>`).join("")}</select>`;
  return `${shell({title:wide?scopeName():r,stat:list.length+" flags",extra:sel})}${index}
  <div class="study${index?" indexed":""}">${body}</div>
  ${list.length?`<button class="btn" onclick="openSetup('${mode}',${arg?`'${arg}'`:"null"},'${wide?scopeName():r}')">Quiz me on ${esc(wide?scopeName():r)}</button>`:'<p class="muted small">No flags in this region for the current scope.</p>'}`;
}
// Alphabet index: tap or drag along the letters to jump the list, like a phone's contacts list.
function wireAlpha(){
  const a=$("#alpha");if(!a)return;let bubble=null,active=false,lastL="";
  const spans=[...a.querySelectorAll("span")];
  // Letter from the finger's vertical position only, so sideways drift during a fast scrub doesn't lose it.
  const letterAt=y=>{const r=a.getBoundingClientRect();const i=Math.min(spans.length-1,Math.max(0,Math.floor((y-r.top)/(r.height/spans.length))));return spans[i].dataset.l};
  const jump=y=>{const l=letterAt(y);if(!l||l===lastL)return;lastL=l;
    const target=app.querySelector(`.study [data-l="${l}"]`);if(!target)return;
    const head=app.querySelector(".sticky");const off=(head?head.getBoundingClientRect().height:0)+8;
    window.scrollTo(0,target.getBoundingClientRect().top+window.scrollY-off);
    if(!bubble){bubble=document.createElement("div");bubble.className="alpha-bubble";document.body.appendChild(bubble)}bubble.textContent=l};
  const end=()=>{active=false;lastL="";a.classList.remove("hot");if(bubble){bubble.remove();bubble=null}};
  a.addEventListener("pointerdown",e=>{active=true;a.classList.add("hot");try{a.setPointerCapture(e.pointerId)}catch(x){}jump(e.clientY);e.preventDefault()});
  a.addEventListener("pointermove",e=>{if(active)jump(e.clientY)});
  // Touch events as a fallback: iOS may cancel pointer events once the page scrolls under the finger.
  a.addEventListener("touchmove",e=>{if(active){e.preventDefault();jump(e.touches[0].clientY)}},{passive:false});
  a.addEventListener("pointerup",end);a.addEventListener("touchend",end);a.addEventListener("touchcancel",end);
  a.addEventListener("pointercancel",e=>{if(e.pointerType!=="touch")end()});
}
function viewLook(){
  const flt=S.flt||null;
  const order=["Horizontal stripes","Vertical stripes","Cantons & crosses","Discs & stars","Triangles & serrations"];
  const sorted=GROUPS.map((g,i)=>({g,i,r:g.k,f:g.f.filter(c=>inScope(BY[c])&&inFilter(c,flt))})).filter(x=>x.f.length>=2).sort((a,b)=>order.indexOf(a.r)-order.indexOf(b.r)||a.g.t.localeCompare(b.g.t));
  let lastR="";
  const body=sorted.map(({g,i,r,f})=>(r!==lastR?`<p class="eyebrow" style="padding-top:6px">${esc(lastR=r)}</p>`:"")+`<div class="group"><h3>${esc(g.t)}</h3><div class="flags">${f.map(c=>`<figure><button class="flink" type="button" onclick="openFlag('${c}')" title="View large">${img(c,"flag sm")}</button><figcaption>${esc(BY[c].n)}</figcaption></figure>`).join("")}</div><p class="hint">${esc(g.h)}</p><button class="btn line" onclick="openSetup('group',${i},GROUPS[${i}].t,S.flt||null)">Quiz me on this set</button></div>`).join("");
  const opt=(v,l)=>`<option value="${v}" ${(flt||"")===v?"selected":""}>${l}</option>`;
  const sel=`<select id="lookSel" onchange="S.flt=this.value||null;render();window.scrollTo(0,0)">${opt("","All regions")}${ALLREGIONS.map(r=>opt(r,r)).join("")}</select>`;
  return `${shell({title:"Look-alikes",stat:sorted.length+" sets",extra:sel})}
  ${scopeSeg()}
  <div class="study">${body||'<p class="muted small">No look-alike sets have two or more flags in this filter.</p>'}</div>
  ${sorted.length?`<button class="btn" onclick="openSetup('lookmix',null,'Look-alikes',S.flt||null)">Mixed round across ${flt?"these":"all"} sets</button>`:""}`;
}

// Swipe in from the left edge = back. Matters in the home-screen app, which has no browser chrome.
(()=>{let sx=null,sy=null,fired=false;
  document.addEventListener("touchstart",e=>{const t=e.touches[0];if(e.touches.length===1&&t.clientX<=24){sx=t.clientX;sy=t.clientY;fired=false}else sx=null},{passive:true});
  document.addEventListener("touchmove",e=>{if(sx===null||fired)return;const t=e.touches[0],dx=t.clientX-sx,dy=Math.abs(t.clientY-sy);
    if(dx>70&&dy<60){fired=true;if(LB)closeFlag();else if(S.view!=="home")goBack()}else if(dy>60)sx=null},{passive:true});
  document.addEventListener("touchend",()=>{sx=null},{passive:true});
})();

// ---------- FLAG VIEWER ----------
let LB=null; // {c, scale, x, y, pts:Map, last:{...}}
function openFlag(c,vi=0){
  closeFlag();
  const el=document.createElement("div");el.className="lb";el.id="lb";
  const v=VARS(c),n=v?v.length:1;
  el.innerHTML=`<div class="lb-top"><span class="nm">${esc(BY[c].n)}</span><div class="ctl">
    <button type="button" onclick="lbZoom(1/1.5)" aria-label="Zoom out">−</button><button type="button" onclick="lbZoom(1.5)" aria-label="Zoom in">+</button><button type="button" onclick="closeFlag()" aria-label="Close">×</button></div></div>
    <div class="lb-stage" id="lbStage"><div class="lb-track" id="lbTrack">${Array.from({length:n},(_,i)=>`<div class="lb-slide">${img(c,"flag",i).replace('loading="lazy"','')}</div>`).join("")}</div></div>
    <div class="lb-var" id="lbVar">${useLine(c,vi)}${vchips(c,vi,"lbGo(%i)")}</div>
    <p class="lb-hint">Pinch or scroll to zoom · drag to pan · double-tap to reset${v?" · swipe for the other design":""}</p>`;
  document.body.appendChild(el);document.body.style.overflow="hidden";
  const stage=el.querySelector("#lbStage"),track=el.querySelector("#lbTrack");
  LB={c,vi,n,scale:1,x:0,y:0,sx:0,pts:new Map(),el,stage,track,fls:[...el.querySelectorAll(".lb-slide .flag .fl:not([hidden])")]};
  LB.fl=LB.fls[vi];LB.baseW=LB.fl.getBoundingClientRect().width;
  lbTrack(false);
  const st=stage;
  st.addEventListener("pointerdown",e=>{st.setPointerCapture(e.pointerId);LB.pts.set(e.pointerId,{x:e.clientX,y:e.clientY,t:Date.now()});LB.start={scale:LB.scale,x:LB.x,y:LB.y,pts:[...LB.pts.values()],at:Date.now()};LB.moved=false;st.classList.add("drag")});
  st.addEventListener("pointermove",e=>{if(!LB.pts.has(e.pointerId))return;LB.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const cur=[...LB.pts.values()],s0=LB.start;
    if(cur.length===1&&s0.pts.length===1){
      const dx=cur[0].x-s0.pts[0].x,dy=cur[0].y-s0.pts[0].y;
      if(LB.scale===1&&LB.n>1){
        // At normal size the strip of designs follows the finger; it resists past the first and last.
        const W=st.clientWidth,atEnd=(LB.vi===0&&dx>0)||(LB.vi===LB.n-1&&dx<0);LB.sx=atEnd?dx*0.3:dx;lbTrack(false);if(Math.abs(dx)>6)LB.moved=true}
      else if(LB.scale>1){LB.x=s0.x+dx;LB.y=s0.y+dy;if(Math.abs(dx)+Math.abs(dy)>6)LB.moved=true;lbApply()}
    }
    else if(cur.length>=2&&s0.pts.length>=2){const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const want=s0.scale*d(cur[0],cur[1])/Math.max(1,d(s0.pts[0],s0.pts[1]));const ns=Math.min(8,Math.max(1,want)),r=ns/s0.scale;
      const m0={x:(s0.pts[0].x+s0.pts[1].x)/2,y:(s0.pts[0].y+s0.pts[1].y)/2},m1={x:(cur[0].x+cur[1].x)/2,y:(cur[0].y+cur[1].y)/2},C=lbCenter();
      // keep the point under the fingers' midpoint fixed while scaling, then follow the midpoint
      LB.scale=ns;LB.x=m1.x-C.x-r*(m0.x-C.x-s0.x);LB.y=m1.y-C.y-r*(m0.y-C.y-s0.y);LB.sx=0;LB.moved=true;lbApply();lbTrack(false)}
  });
  // Double tap by hand: touch devices don't send dblclick. Two quick taps near the same spot, with no drag between.
  const up=e=>{LB.pts.delete(e.pointerId);const s0=LB.start;
    if(LB.sx){const W=st.clientWidth,dt=Math.max(1,Date.now()-s0.at),fast=Math.abs(LB.sx)/dt>0.5;
      const go=(Math.abs(LB.sx)>W*0.2||fast)?(LB.sx<0?1:-1):0;LB.sx=0;lbGo(Math.min(LB.n-1,Math.max(0,LB.vi+go)))}
    LB.start={scale:LB.scale,x:LB.x,y:LB.y,pts:[...LB.pts.values()],at:Date.now()};if(!LB.pts.size)st.classList.remove("drag");
    if(e.pointerType==="touch"&&!LB.moved&&!LB.pts.size){const now=Date.now(),t=LB.lastTap;
      if(t&&now-t.at<320&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<30){LB.lastTap=null;lbToggle({x:e.clientX,y:e.clientY})}else LB.lastTap={at:now,x:e.clientX,y:e.clientY}}};
  st.addEventListener("pointerup",up);st.addEventListener("pointercancel",up);
  st.addEventListener("wheel",e=>{e.preventDefault();lbZoom(Math.exp(-e.deltaY*0.0015),{x:e.clientX,y:e.clientY})},{passive:false});
  st.addEventListener("dblclick",e=>{if(e.pointerType==="touch"||e.sourceCapabilities?.firesTouchEvents)return;lbToggle({x:e.clientX,y:e.clientY})});
  el.addEventListener("click",e=>{if((e.target===st||e.target.classList.contains("lb-slide"))&&!LB.moved)closeFlag()});
}
// The flag is centred in the stage and transformed as translate(x,y) scale(s) about its own centre C, so a local
// offset q shows at C+t+s·q. Zooming by f about a screen point P keeps the point under P fixed: t' = (1-f)(P-C) + f·t.
function lbToggle(P){if(!LB)return;if(LB.scale>1){LB.scale=1;LB.x=0;LB.y=0;lbApply()}else lbZoom(2.5,P)}
function lbCenter(){const r=LB.stage.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}
function lbZoom(f,P){if(!LB)return;const ns=Math.min(8,Math.max(1,LB.scale*f));f=ns/LB.scale;if(f===1)return;
  const C=lbCenter();P=P||C;LB.x=(1-f)*(P.x-C.x)+f*LB.x;LB.y=(1-f)*(P.y-C.y)+f*LB.y;LB.scale=ns;
  if(ns===1){LB.x=0;LB.y=0}lbApply()}
// Zoom by resizing the element rather than transform:scale, so the SVG is re-rendered sharp at every level.
function lbApply(){if(!LB)return;LB.fl.style.width=(LB.baseW*LB.scale).toFixed(1)+"px";LB.fl.style.transform=`translate(${LB.x}px,${LB.y}px)`}
// The strip of designs: slide vi is in view, offset by the finger while dragging. Animated only when snapping.
function lbTrack(anim){if(!LB)return;LB.track.classList.toggle("anim",!!anim);LB.track.style.transform=`translateX(calc(${-100*LB.vi}% + ${LB.sx}px))`}
function lbGo(i){if(!LB)return;i=Math.min(LB.n-1,Math.max(0,i));if(i!==LB.vi){LB.scale=1;LB.x=0;LB.y=0;lbApply();LB.vi=i;LB.fl=LB.fls[i];LB.baseW=LB.fl.getBoundingClientRect().width;lbApply();$("#lbVar").innerHTML=useLine(LB.c,i)+vchips(LB.c,i,"lbGo(%i)")}LB.sx=0;lbTrack(true)}
function closeFlag(){if(!LB)return;LB.el.remove();document.body.style.overflow="";LB=null}

// Zoom on the question flag. Desktop: scroll over it to zoom; as it grows it drifts from its place toward the middle of
// the screen (centred by 3x), and you drag to pan. Phone: a pinch scales it where it is, about its own centre, and the
// fingers' midpoint pans it. While enlarged the flag is moved out of the page into a dimming layer that covers the quiz
// screen and takes every touch, so it always paints on top and every gesture reaches it. It eases back after a short
// rest, or at once on a tap on the dimmed page or Esc. Resized rather than transform-scaled, so the SVG stays sharp.
const ZOOM_REST=1500;
let ZS=null,ZS_T=null,ZBOX=null; // the dimming layer and the box whose flag is in it
function scrimOn(box){clearTimeout(ZS_T);ZBOX=box;
  if(!ZS){const sc=ZS=document.createElement("div");sc.className="zscrim";(app.querySelector(".qscreen")||document.body).appendChild(sc);
    const z=()=>ZBOX&&ZBOX._z;
    sc.addEventListener("mousedown",e=>e.preventDefault()); // a click here must not move focus
    sc.addEventListener("click",e=>{if(e.target===sc&&z()&&!z().moved())z().drop(true)});
    sc.addEventListener("dblclick",e=>{if(z())z().drop(true)});
    sc.addEventListener("wheel",e=>{e.preventDefault();if(z())z().wheel(e)},{passive:false});
    sc.addEventListener("pointerdown",e=>{if(z()){sc.setPointerCapture(e.pointerId);z().down(e)}});
    sc.addEventListener("pointermove",e=>{if(z())z().move(e)});
    sc.addEventListener("pointerup",e=>{if(!z())return;z().end(e);
      // Two quick taps in the same place (touch devices send no dblclick) put the flag back.
      if(e.pointerType==="touch"&&!z().moved()){const now=Date.now(),t=sc._tap;if(t&&now-t.at<320&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<30){sc._tap=null;z().drop(true)}else sc._tap={at:now,x:e.clientX,y:e.clientY}}});
    sc.addEventListener("pointercancel",e=>{if(z())z().end(e)})}
  requestAnimationFrame(()=>ZS&&ZS.classList.add("on"))}
function scrimOff(){if(!ZS)return;const sc=ZS;sc.classList.remove("on");ZS_T=setTimeout(()=>{sc.remove();if(ZS===sc){ZS=null;ZBOX=null}},260)}
function wireZoom(){
  app.querySelectorAll(".flag.big").forEach(box=>{
    if(box._z)return;
    const Z={scale:1,px:0,py:0,lift:0,pts:new Map(),timer:null,finishT:null,fl:null,moved:false};
    const F=()=>Z.fl||box.querySelector(".fl:not([hidden])");
    const Q=()=>{const q=app.querySelector(".qscreen");return q?q.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight}};
    const C=()=>{const q=Q();return {x:q.width/2,y:q.height/2}};
    // Lift: measure the flag where it sits and put a copy of it into the dimming layer at the same spot, in pixels.
    // The original stays where it is (dimmed under the layer), so nothing in the page changes or repaints; the copy is
    // shown once its image has decoded, so it doesn't blink in.
    const up=()=>{if(Z.fl)return;const fl=box.querySelector(".fl:not([hidden])"),r=fl.getBoundingClientRect(),q=Q();
      Z.baseW=r.width;Z.r=r.width/r.height;Z.c0={x:r.left-q.left+r.width/2,y:r.top-q.top+r.height/2};
      scrimOn(box);const cp=fl.cloneNode(true);cp.classList.add("z");ZS.appendChild(cp);Z.fl=cp;
      // Typing waits: the keyboard goes away so the whole screen is free. A tap on the field brings it back afterwards
      // (a tap that drops the flag refocuses the field itself; a timer can't open a keyboard).
      const inp=$("#typeIn");Z.refocus=inp&&document.activeElement===inp;if(Z.refocus)inp.blur();
      cp.classList.add("in"); // shown at once: the pinch or the wheel is what moves it
      Z.scale=1;Z.px=Z.py=0;apply();void cp.offsetWidth};
    const apply=()=>{const fl=F(),c=C(),k=Z.lift?Math.min(1,(Z.scale-1)/2):0,w=Z.baseW*Z.scale,h=w/Z.r;
      const cx=c.x+(Z.c0.x-c.x)*(1-k)+Z.px,cy=c.y+(Z.c0.y-c.y)*(1-k)+Z.py;
      fl.style.width=w.toFixed(1)+"px";fl.style.left=(cx-w/2).toFixed(1)+"px";fl.style.top=(cy-h/2).toFixed(1)+"px"};
    const live=()=>{clearTimeout(Z.timer);clearTimeout(Z.finishT);F().classList.remove("anim")};
    const drop=(anim,byTimer)=>{live();const fl=Z.fl;if(!fl)return;scrimOff();
      const finish=()=>{fl.remove();Z.fl=null;Z.scale=1;Z.px=Z.py=0};
      if(Z.refocus){Z.refocus=false;const inp=$("#typeIn");if(inp&&!byTimer)inp.focus({preventScroll:true})}
      if(!anim){finish();return}
      fl.classList.add("anim");Z.scale=1;Z.px=Z.py=0;apply();Z.finishT=setTimeout(finish,260)};
    const rest=()=>{clearTimeout(Z.timer);Z.timer=setTimeout(()=>drop(true,true),ZOOM_REST)};
    const zoomTo=(ns,lift)=>{ns=Math.min(6,Math.max(1,ns));if(ns===Z.scale&&Z.fl)return;live();up();Z.lift=lift;Z.scale=ns;apply()};
    // Every step follows the wheel directly; only the way back is animated.
    const wheel=e=>{const ns=Z.scale*Math.exp(-e.deltaY*0.0015);if(!Z.fl&&ns<=1)return;zoomTo(ns,1);rest()};
    const down=e=>{Z.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});Z.start={scale:Z.scale,px:Z.px,py:Z.py,pts:[...Z.pts.values()]};Z.moved=false;live()};
    const move=e=>{if(!Z.pts.has(e.pointerId))return;Z.pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const cur=[...Z.pts.values()],s0=Z.start;
      if(cur.length===1&&s0.pts.length===1&&Z.scale>1){Z.px=s0.px+cur[0].x-s0.pts[0].x;Z.py=s0.py+cur[0].y-s0.pts[0].y;if(Math.abs(Z.px-s0.px)+Math.abs(Z.py-s0.py)>6)Z.moved=true;apply()}
      else if(cur.length>=2&&s0.pts.length>=2){const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);const ns=s0.scale*d(cur[0],cur[1])/Math.max(1,d(s0.pts[0],s0.pts[1]));
        if(!Z.fl&&ns<=1)return;const m0={x:(s0.pts[0].x+s0.pts[1].x)/2,y:(s0.pts[0].y+s0.pts[1].y)/2},m1={x:(cur[0].x+cur[1].x)/2,y:(cur[0].y+cur[1].y)/2};
        zoomTo(ns,0);Z.px=s0.px+m1.x-m0.x;Z.py=s0.py+m1.y-m0.y;Z.moved=true;apply()}};
    const end=e=>{Z.pts.delete(e.pointerId);Z.start={scale:Z.scale,px:Z.px,py:Z.py,pts:[...Z.pts.values()]};if(!Z.pts.size)rest()};
    // Until the flag is lifted, gestures start on the box itself; after that the dimming layer takes them.
    box.addEventListener("wheel",e=>{e.preventDefault();wheel(e)},{passive:false});
    box.addEventListener("dblclick",()=>{if(Z.fl)drop(true);else{zoomTo(3,1);rest()}});
    box.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;box.setPointerCapture(e.pointerId);down(e)});
    box.addEventListener("pointermove",move);box.addEventListener("pointerup",end);box.addEventListener("pointercancel",end);
    box._z={drop,wheel,down,move,end,moved:()=>Z.moved};
  });
}

// ---------- BOOT ----------
load();loadSet();loadB();
function start(data){
  if(location.search.startsWith("?r="))history.replaceState(null,"",location.pathname);
  keyboard();
  if(data&&data.S)S=data.S;
  else{const r=loadRound();if(r){S=r;S.confirmLeave=false;S.timer=null;
    // a Drill round saved right after a correct answer should move on as it would have
    if(S.view==="quiz"&&S.pace==="drill"){const q=S.qs[S.i];if(q.ans&&q.ans===q.c)S.timer=setTimeout(next,400)}}}
  render();
}
if(window.claude?.hot?.snapshot)window.claude.hot.snapshot(()=>({S}));
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
