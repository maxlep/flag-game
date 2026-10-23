// The map: Natural Earth outlines from js/data/map.js drawn as plain SVG. One function builds a map of a frame (a region
// or the world) with one flag's country filled in and its capital marked. Places too small to see at the frame's scale
// get a dot as well as their outline. Zooming is done by changing the viewBox, so lines stay crisp.

// The frame a flag is best seen in: its region, or the world for the organisations.
function mapFrameFor(c){const f=BY[c],r=f.sov?f.r:GEO[c];return MAP.frame[r]?r:"World"}
// Is there a shape for this flag? (The organisations have none.)
const mapHas=c=>!!MAP.set[MAP.frame[mapFrameFor(c)].set].shape[c];
// The frame's box, widened to take in a flag whose centre lies outside it (a far-flung territory).
function mapBox(frame,code){
  const fr=MAP.frame[frame],S=MAP.set[fr.set];let [x0,y0,x1,y1]=fr.box;
  if(code&&S.pt[code]){const [px,py]=S.pt[code];
    if(px<x0||px>x1||py<y0||py>y1){const b=S.box[code];x0=Math.min(x0,b[0]-8);y0=Math.min(y0,b[1]-8);x1=Math.max(x1,b[2]+8);y1=Math.max(y1,b[3]+8)}}
  return [x0,y0,x1,y1];
}

// The projection's vertical stretch at canvas height y (1 = as on a globe). A frame is drawn with its height divided
// by the stretch at its centre, so South America isn't tall and Scandinavia isn't flat. Mild at the poles: past 0.4 the
// correction would blow up, and the World frame is drawn as projected.
function mapKy(y){const t=Math.max(0,Math.min(MAP.ky.length-1.001,y/10)),i=Math.floor(t),f=t-i;return Math.max(0.4,MAP.ky[i]+(MAP.ky[i+1]-MAP.ky[i])*f)}

// A close frame around one flag: about three times the country's size, never narrower than a sub-continent (130 units,
// about 5,000 km) and never wider than the region, at the aspect ratio given (width over height, as drawn, so the
// stretch sy is allowed for). Kept inside the region's frame in the Pacific set, whose edges are empty.
function mapFit(frame,code,aspect,sy){
  const fr=MAP.frame[frame],S=MAP.set[fr.set],Rg=mapBox(frame,code),b=S.box[code];
  // The world set has land everywhere, so the frame may leave the region; the Pacific set is empty outside Oceania.
  const R=fr.set==="world"?[0,0,MAP.w,MAP.h]:Rg;
  const rw=Rg[2]-Rg[0],rh=Rg[3]-Rg[1],bw=b[2]-b[0],bh=b[3]-b[1],asp=aspect*sy;
  let w=Math.min(rw,Math.max(130,bw*3.2,bh*3.2*asp)),h=w/asp;
  if(h>rh){h=rh;w=Math.min(rw,h*asp)}
  const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;
  const place=()=>{let x0=cx-w/2,y0=cy-h/2;x0=Math.max(R[0],Math.min(R[2]-w,x0));y0=Math.max(R[1],Math.min(R[3]-h,y0));return [x0,y0,x0+w,y0+h]};
  // A speck in mid-ocean would frame nothing but sea: widen until some other land shows.
  let box=place();
  const land=([x0,y0,x1,y1])=>S.lbox.some(l=>l[0]<x1&&l[2]>x0&&l[1]<y1&&l[3]>y0&&Math.hypot(l[2]-l[0],l[3]-l[1])>w*0.05);
  for(let i=0;i<4&&w<rw&&!land(box);i++){w=Math.min(rw,w*1.6);h=Math.min(rh,w/asp);box=place()}
  return box;
}

// o: {frame, code, fit:aspect, cap:true|false, pad:0.04, cls:"", id:""}. Returns the SVG markup.
function mapSVG(o){
  const frame=o.frame||(o.code?mapFrameFor(o.code):"World"),S=MAP.set[MAP.frame[frame].set];
  const fit=o.fit&&o.code&&S.box[o.code];
  let sy=1;
  if(frame!=="World"){const b=fit?S.box[o.code]:mapBox(frame,o.code);sy=1/mapKy((b[1]+b[3])/2)}
  let [x0,y0,x1,y1]=fit?mapFit(frame,o.code,o.fit,sy):mapBox(frame,o.code);
  const pad=(o.pad===undefined?0.04:o.pad)*Math.max(x1-x0,y1-y0);x0-=pad;y0-=pad;x1+=pad;y1+=pad;
  const w=x1-x0,h=y1-y0,dot=Math.max(1.5,w*0.011),Y=y=>(y*sy).toFixed(1);
  // Only the land that falls in the frame; a region map doesn't carry the whole world's outlines.
  const land=S.land.map((d,i)=>{const b=S.lbox[i];return b[0]<x1&&b[2]>x0&&b[1]<y1&&b[3]>y0?`<path d="${d}"/>`:""}).join("");
  let hi="",marks="";
  if(o.code&&S.shape[o.code]){
    const [px,py]=S.pt[o.code],b=S.box[o.code],tiny=Math.hypot(b[2]-b[0],(b[3]-b[1])*sy)<w*0.04;
    hi=`<path class="hi" d="${S.shape[o.code]}"/>`;
    if(tiny)marks+=`<circle class="dot" cx="${px}" cy="${Y(py)}" r="${dot.toFixed(1)}"/><circle class="dot ring" cx="${px}" cy="${Y(py)}" r="${(dot*2.2).toFixed(1)}"/>`;
    if(o.cap!==false&&S.cap[o.code]){const [cx,cy]=S.cap[o.code];marks+=`<circle class="cap" cx="${cx}" cy="${Y(cy)}" r="${(dot*0.8).toFixed(1)}"/>`}
  }
  // Outlines are drawn through the vertical correction; the markers sit outside it so they stay round.
  return `<svg class="map${o.cls?" "+o.cls:""}"${o.id?` id="${o.id}"`:""} viewBox="${x0.toFixed(1)} ${Y(y0)} ${w.toFixed(1)}  ${Y(h)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect class="sea" x="${x0.toFixed(1)}" y="${Y(y0)}" width="${w.toFixed(1)}" height="${Y(h)}"/><g transform="scale(1,${sy.toFixed(4)})"><g class="land">${land}</g>${hi}</g>${marks}</svg>`;
}
