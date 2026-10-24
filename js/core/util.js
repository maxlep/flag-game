// js/core/util.js: Small helpers with no DOM and no state: escaping, shuffling, normalising names, edit distance, dates.
// Needs before it at load time: nothing.

// Alternative names accepted in typed mode.
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/^the\s+/,"").replace(/[^a-z0-9]/g,"");
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
const fmtDate=t=>new Date(t).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>s.replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
