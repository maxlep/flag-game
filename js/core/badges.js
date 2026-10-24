// js/core/badges.js: The badges and the titles, and awarding them at the end of a round.
// Needs before it at load time: nothing.

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
 // Titles: one per region per scope. Lord is Countries, Warden is Territories, Emperor is All; the same three on the world card.
 ...REGIONS.flatMap(r=>[
   {id:"lord-"+r,n:"Lord of "+r,e:"🛡️",h:"A full "+r+" round (Countries) on Master, typed, with no misses.",title:1},
   {id:"warden-"+r,n:"Warden of "+r,e:"🏰",h:"A full "+r+" round (Territories) on Master, typed, with no misses.",title:1},
   {id:"emperor-"+r,n:"Emperor of "+r,e:"⚜️",h:"A full "+r+" round (All) on Master, typed, with no misses.",title:1}]),
 {id:"lord",n:"Flag Lord",e:"🛡️",h:"A full Whole World round on Master, typed, with no misses. All 197 names exact, no mistakes.",big:1},
 {id:"warden",n:"Flag Warden",e:"🏰",h:"A full All-territories round on Master, typed, with no misses.",big:1},
 {id:"emperor",e:"👑",n:"Flag Emperor",h:"A full Everything round on Master, typed, with no misses. Every flag, names exact, no mistakes.",big:1}
];
const TITLE={countries:{k:"lord"},territories:{k:"warden"},all:{k:"emperor"}};
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
  if(S.mode==="region"&&S.full&&perfect&&strict&&REGIONS.includes(S.arg)&&TITLE[S.scope])award(TITLE[S.scope].k+"-"+S.arg);
  if(S.mode==="all"&&S.full&&perfect&&strict&&TITLE[S.scope])award(TITLE[S.scope].k);
  saveB();return earned;
}
