// js/core/match.js: Typed answers: matching a name or alias, exactly or with typos, and the suggestions.
// Needs before it at load time: core/util.js (norm), the data files (FLAGS, ALIASES).

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
