// The map: Natural Earth outlines from js/data/map.js drawn as plain SVG. One function builds a map of a frame (a region
// or the world) with one flag's country filled in and its capital marked. Places too small to see at the frame's scale
// get a dot as well as their outline. Zooming is done by changing the viewBox, so lines stay crisp.

// The frame a flag is best seen in: its region, or the world for the organisations.
function mapFrameFor(c){const f=BY[c],r=f.sov?f.r:GEO[c];return MAP.frame[r]?r:"World"}
// The frame's box, widened to take in a flag whose centre lies outside it (a far-flung territory).
function mapBox(frame,code){
  const fr=MAP.frame[frame],S=MAP.set[fr.set];let [x0,y0,x1,y1]=fr.box;
  if(code&&S.pt[code]){const [px,py]=S.pt[code];
    if(px<x0||px>x1||py<y0||py>y1){const b=S.box[code];x0=Math.min(x0,b[0]-8);y0=Math.min(y0,b[1]-8);x1=Math.max(x1,b[2]+8);y1=Math.max(y1,b[3]+8)}}
  return [x0,y0,x1,y1];
}

// o: {frame, code, cap:true|false, pad:0.04, cls:"", id:""}. Returns the SVG markup.
function mapSVG(o){
  const frame=o.frame||(o.code?mapFrameFor(o.code):"World"),S=MAP.set[MAP.frame[frame].set];
  let [x0,y0,x1,y1]=mapBox(frame,o.code);
  const pad=(o.pad===undefined?0.04:o.pad)*Math.max(x1-x0,y1-y0);x0-=pad;y0-=pad;x1+=pad;y1+=pad;
  const w=x1-x0,h=y1-y0,dot=Math.max(1.5,w*0.011);
  const land=S.land.map(d=>`<path d="${d}"/>`).join("");
  let hi="";
  if(o.code&&S.shape[o.code]){
    const [px,py]=S.pt[o.code],b=S.box[o.code],tiny=Math.hypot(b[2]-b[0],b[3]-b[1])<w*0.04;
    hi=`<path class="hi" d="${S.shape[o.code]}"/>`+(tiny?`<circle class="dot" cx="${px}" cy="${py}" r="${dot.toFixed(1)}"/><circle class="dot ring" cx="${px}" cy="${py}" r="${(dot*2.2).toFixed(1)}"/>`:"");
    if(o.cap!==false&&S.cap[o.code]){const [cx,cy]=S.cap[o.code];hi+=`<circle class="cap" cx="${cx}" cy="${cy}" r="${(dot*0.8).toFixed(1)}"/>`}
  }
  return `<svg class="map${o.cls?" "+o.cls:""}"${o.id?` id="${o.id}"`:""} viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect class="sea" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/><g class="land">${land}</g>${hi}</svg>`;
}
