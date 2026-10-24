#!/usr/bin/env node
// Builds js/data/map.js from Natural Earth (public domain): one simplified SVG path per flag, projected with Equal
// Earth onto a 1000-wide canvas, plus a centre point, a bounding box, the capital, and a frame per region.
//
// Needs the Natural Earth geojson folder and a few npm packages, neither of which the app itself uses:
//   git clone --filter=blob:none --sparse --depth 1 https://github.com/nvkelso/natural-earth-vector.git ne
//   (cd ne && git sparse-checkout set geojson)
//   npm install d3-geo topojson-server topojson-client topojson-simplify   (anywhere; set NODE_PATH to its node_modules)
//   node tools/build_map.js ne/geojson
//
// Base shapes: ne_50m_admin_0_countries (one per country). Extra shapes for flags that aren't countries there:
// the UK's four nations (50m map units), Spain's regions and the Canaries (10m admin-1), Saint Helena's three parts
// (10m subunits). Capitals: ne_10m_populated_places_simple, Admin-0 capitals, matched to the capital field in
// js/data/flags.js. Borders are Natural Earth's de-facto drawing.
const fs=require("fs"),path=require("path"),vm=require("vm");
const d3=require("d3-geo"),topo=require("topojson-server"),tc=require("topojson-client"),ts=require("topojson-simplify");
const NE=process.argv[2];if(!NE){console.error("usage: build_map.js <natural-earth geojson dir>");process.exit(1)}
const root=path.resolve(__dirname,"..");
const load=f=>JSON.parse(fs.readFileSync(path.join(NE,f),"utf8")).features;
// The app's own flag list and regions.
const ctx=vm.runInNewContext(fs.readFileSync(path.join(root,"js/data/flags.js"),"utf8")+fs.readFileSync(path.join(root,"js/data/names.js"),"utf8")+";({FLAGS,GEO,REGIONS})");
const FLAGS=ctx.FLAGS,geoOf=f=>f.sov?f.r:ctx.GEO[f.c];

// ---- 1. shapes ----
const feats=[]; // {c, geometry, base:true|false}
const byIso={};
// Several features can carry one ISO code (Australia and its Ashmore and Cartier Islands both say AU): keep the largest.
for(const f of load("ne_50m_admin_0_countries.geojson")){const p=f.properties;let iso=p.ISO_A2_EH&&p.ISO_A2_EH!=="-99"?p.ISO_A2_EH:p.ISO_A2;if(!iso||iso==="-99")continue;iso=iso.toLowerCase();
  if(!byIso[iso]||d3.geoArea(f)>d3.geoArea(byIso[iso]))byIso[iso]=f}
// Features with no ISO code. Somaliland and Northern Cyprus are joined to the country they are recognised as part of
// (left out, they were holes: a chunk of Somalia missing). The Siachen Glacier, held by India and claimed by
// Pakistan, is drawn as plain land.
const JOIN={SOL:"so",CYN:"cy"},joins={},plain=[];
for(const f of load("ne_50m_admin_0_countries.geojson")){const a3=f.properties.ADM0_A3;if(JOIN[a3])(joins[JOIN[a3]]=joins[JOIN[a3]]||[]).push(f);else if(a3==="KAS")plain.push(f)}
for(const [iso,parts] of Object.entries(joins)){const t=topo.topology({p:{type:"FeatureCollection",features:[byIso[iso],...parts]}},1e6);
  byIso[iso]={type:"Feature",properties:byIso[iso].properties,geometry:tc.merge(t,t.objects.p.geometries)};console.error("joined to",iso+":",parts.map(f=>f.properties.NAME).join(", "))}
const FIX={ // our code -> Natural Earth ISO when they differ
  "xk":"xk","ps":"ps","tw":"tw","eh":"eh"};
const want=new Set(FLAGS.map(f=>f.c));
const used=new Set();
for(const f of FLAGS){const iso=FIX[f.c]||f.c;const ne=byIso[iso];if(ne){feats.push({c:f.c,geometry:ne.geometry,base:true,name:ne.properties.NAME});used.add(f.c)}}
// Everything else on the base map (countries we don't quiz, the Siachen Glacier) is drawn as plain land.
for(const [iso,ne] of Object.entries(byIso)){if(!want.has(iso))feats.push({c:null,geometry:ne.geometry,base:true,name:ne.properties.NAME})}
for(const ne of plain)feats.push({c:null,geometry:ne.geometry,base:true,name:ne.properties.NAME});
// UK nations, and territories folded into their sovereign at the country level, from the 50m map units
const MU={ENG:"gb-eng",SCT:"gb-sct",WLS:"gb-wls",NIR:"gb-nir",MTQ:"mq",TKL:"tk",CXR:"cx",CCK:"cc"};
for(const f of load("ne_50m_admin_0_map_units.geojson")){const k=MU[f.properties.SU_A3];if(k){feats.push({c:k,geometry:f.geometry,base:false,name:f.properties.NAME});used.add(k)}}
// Gibraltar only exists at 10m
for(const f of load("ne_10m_admin_0_map_units.geojson")){if(f.properties.SU_A3==="GIB"){feats.push({c:"gi",geometry:f.geometry,base:false,name:"Gibraltar"});used.add("gi")}}
// Saint Helena's parts from the 10m subunits
const SU={SHS:"sh-hl",BAC:"sh-ac",SHT:"sh-ta"};
for(const f of load("ne_10m_admin_0_map_subunits.geojson")){const k=SU[f.properties.SU_A3];if(k){feats.push({c:k,geometry:f.geometry,base:false,name:f.properties.NAME});used.add(k)}}
// Spain's regions and the Canary Islands from the 10m admin-1 layer (the Canaries are two provinces)
// A region is all its provinces merged into one outline (keeping only the first province gave Catalonia as Lleida
// alone, with Barcelona outside it).
const A1={"Cataluña":"es-ct","Galicia":"es-ga","País Vasco":"es-pv"};const canary=[],regionParts={};
for(const f of load("ne_10m_admin_1_states_provinces.geojson")){const p=f.properties;if(p.adm0_a3!=="ESP")continue;
  if(p.region==="Canarias"||["Las Palmas","Santa Cruz de Tenerife"].includes(p.name))canary.push(f.geometry);
  const k=A1[p.region]||A1[p.name];if(k)(regionParts[k]=regionParts[k]||[]).push(f)}
for(const [k,parts] of Object.entries(regionParts)){const t=topo.topology({p:{type:"FeatureCollection",features:parts}},1e6);
  feats.push({c:k,geometry:tc.merge(t,t.objects.p.geometries),base:false,name:k});used.add(k)}
if(canary.length){feats.push({c:"ic",geometry:{type:"MultiPolygon",coordinates:canary.flatMap(g=>g.type==="Polygon"?[g.coordinates]:g.coordinates)},base:false,name:"Canary Islands"});used.add("ic")}
const missing=FLAGS.filter(f=>!used.has(f.c)).map(f=>f.c);
console.error("shapes:",feats.length,"flags without a shape:",missing.join(" ")||"none");

// ---- 2. simplify as one topology so shared borders stay shared, then project ----
const fc={type:"FeatureCollection",features:feats.map((f,i)=>({type:"Feature",id:i,properties:{},geometry:f.geometry}))};
let topology=topo.topology({shapes:fc},1e5);
topology=ts.presimplify(topology);
const weight=ts.quantile(topology,0.08); // keep the 8% most significant points
topology=ts.simplify(topology,weight);
let simplified=tc.feature(topology,topology.objects.shapes).features;
// Simplification eats small islands whole, so the small places keep their original outline (few points anyway).
const SMALL=2e-5; // steradians, about 800 km²
simplified=simplified.map((f,i)=>d3.geoArea(fc.features[i])<SMALL?fc.features[i]:f);
// Larger places lose their small islands the same way (Sao Tome, Bioko, Cabo Verde, the Comoros, Mauritius were left as
// single points, and the place's centre fell on whichever island came first). Any polygon under about 20,000 km² that
// simplification shrank by more than half, or turned inside out, gets its original ring back. Islands share no
// borders, so this can't open gaps between neighbours.
// A restored island is simplified on its own (Douglas-Peucker, 0.03° ≈ 3 km), enough to stay recognisable, without
// the full detail that would double the file.
const dp=(pts,eps)=>{if(pts.length<3)return pts;const [a,b]=[pts[0],pts[pts.length-1]];let k=0,dm=0;
  for(let i=1;i<pts.length-1;i++){const p=pts[i],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1e-12,d=Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L;if(d>dm){dm=d;k=i}}
  return dm>eps?[...dp(pts.slice(0,k+1),eps).slice(0,-1),...dp(pts.slice(k),eps)]:[a,b]};
const thin=ring=>{const h=Math.floor(ring.length/2);let r=[...dp(ring.slice(0,h+1),0.03).slice(0,-1),...dp(ring.slice(h),0.03)];return r.length>=4?r:ring};
const ISLE=5e-4,polys=g=>!g?[]:g.type==="Polygon"?[g.coordinates]:g.type==="MultiPolygon"?g.coordinates:[];
let restored=[];
simplified=simplified.map((f,i)=>{const o=polys(fc.features[i].geometry),sp=polys(f.geometry);if(o.length<2&&d3.geoArea(fc.features[i])<SMALL)return f;
  if(!sp.length||o.length!==sp.length)return f;let n=0;
  const out=sp.map((co,j)=>{const ao=d3.geoArea({type:"Polygon",coordinates:o[j]});if(ao>=ISLE)return co;const as=d3.geoArea({type:"Polygon",coordinates:co});
    // Thinning a tiny ring can turn it inside out, which on a sphere means everything but the island (Kiribati covered
    // the ocean): the thinned ring is kept only when its area still agrees with the original's.
    if(as<ao*0.5||as>ao*2){n++;const t=o[j].map(thin),at=d3.geoArea({type:"Polygon",coordinates:t});return at>ao*0.5&&at<ao*1.5?t:o[j]}return co});
  if(!n)return f;restored.push((feats[i].c||feats[i].name)+"×"+n);
  return {...f,geometry:out.length===1?{type:"Polygon",coordinates:out[0]}:{type:"MultiPolygon",coordinates:out}}});
console.error("islands kept whole:",restored.join(" ")||"none");
const W=1000;
const r1=n=>Math.round(n*10)/10;
const fmt=d=>d.replace(/(\d+\.\d{2,})/g,m=>String(r1(+m)));
// Frames are lon/lat boxes; each is drawn from a projection centred on it, so nothing in it is cut at the seam.
// The Americas' box is centred between the United States and Brazil (about 75°W): its west edge reaches mainland
// Alaska where the projection draws it at its latitude, and its east edge Greenland; the Aleutians fall outside.
// Oceania straddles the antimeridian, so it gets its own Pacific-centred set of shapes ("pac").
const FRAMES={World:{box:[-180,-90,180,90],set:"world"},Europe:{box:[-25,34,45,72],set:"world"},Africa:{box:[-26,-36,58,38],set:"world"},
  Asia:{box:[25,-12,150,78],set:"world"},Americas:{box:[-136,-58,-3,84],set:"world"},Antarctic:{box:[-180,-90,180,-35],set:"world"},Oceania:{box:[110,-50,235,25],set:"pac"}};
const SETS={world:{center:10},pac:{center:160}};
const out={w:W,h:0,set:{},frame:{}};
const movedPts=[];
for(const [name,cfg] of Object.entries(SETS)){
  const projection=d3.geoEqualEarth().rotate([-cfg.center,0]);projection.fitWidth(W,{type:"Sphere"});
  const pathGen=d3.geoPath(projection);const H=Math.ceil(pathGen.bounds({type:"Sphere"})[1][1]);out.h=H;
  const frames=Object.entries(FRAMES).filter(([,f])=>f.set===name);
  // A lon/lat box becomes a pixel box by projecting its edges.
  const pixBox=b=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<=40;i++){const t=i/40;for(const [lo,la] of [[b[0]+(b[2]-b[0])*t,b[1]],[b[0]+(b[2]-b[0])*t,b[3]],[b[0],b[1]+(b[3]-b[1])*t],[b[2],b[1]+(b[3]-b[1])*t]]){
    const p=projection([((lo+180)%360+360)%360-180,la]);if(!p)continue;x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])}}
    return [r1(Math.max(0,x0)),r1(Math.max(0,y0)),r1(Math.min(W,x1)),r1(Math.min(H,y1))]};
  const boxes=frames.map(([n,f])=>{const b=n==="World"?[0,0,W,H]:pixBox(f.box);out.frame[n]={set:name,box:b};return b});
  const inFrames=b=>name==="world"||boxes.some(x=>b[0][0]<x[2]&&b[1][0]>x[0]&&b[0][1]<x[3]&&b[1][1]>x[1]);
  const mainPoly=f=>{const g=f.geometry;if(g.type!=="MultiPolygon")return f;let best=null,ba=-1;for(const co of g.coordinates){const a=pathGen.area({type:"Polygon",coordinates:co});if(a>ba){ba=a;best=co}}return {type:"Feature",geometry:{type:"Polygon",coordinates:best}}};
  const S={land:[],lbox:[],shape:{},pt:{},box:{},area:{},cap:{}};
  simplified.forEach((f,i)=>{const meta=feats[i];const d=pathGen(f);if(!d)return;const b=pathGen.bounds(f);if(!inFrames(b))return;
    if(meta.base){S.land.push(fmt(d));S.lbox.push([r1(b[0][0]),r1(b[0][1]),r1(b[1][0]),r1(b[1][1])])}
    if(!meta.c)return;
    S.shape[meta.c]=fmt(d);
    // The box and centre come from the largest polygon alone, so an outlying island (the Aleutians, French Guiana) doesn't pull them away from the body.
    const main=mainPoly(f),mb=pathGen.bounds(main);let cen=pathGen.centroid(main);
    // A bent shape's centroid can fall outside it (Norway's lands in Sweden). Then the centre is the middle of the
    // widest stretch inside the shape along a level line, trying the centroid's line first and then lines further out.
    {const rings=main.geometry.coordinates.map(r=>r.map(ll=>projection(ll)).filter(Boolean));
      const inside=([x,y])=>{let k=false;for(const r of rings)for(let a=0,b=r.length-1;a<r.length;b=a++){const [xa,ya]=r[a],[xb,yb]=r[b];
        if((ya>y)!==(yb>y)&&x<(xb-xa)*(y-ya)/(yb-ya)+xa)k=!k}return k};
      if(!inside(cen)){const h=mb[1][1]-mb[0][1];let best=null;
        for(let j=0;j<=40&&!best;j++){const y=cen[1]+(j%2?1:-1)*Math.ceil(j/2)*h/40;const xs=[];
          for(const r of rings)for(let a=0,b=r.length-1;a<r.length;b=a++){const [xa,ya]=r[a],[xb,yb]=r[b];if((ya>y)!==(yb>y))xs.push(xa+(y-ya)*(xb-xa)/(yb-ya))}
          xs.sort((p,q)=>p-q);for(let i=0;i+1<xs.length;i+=2){const w=xs[i+1]-xs[i];if(w>0&&(!best||w>best.w))best={w,x:(xs[i]+xs[i+1])/2,y}}}
        if(best){if(name==="world")movedPts.push(meta.c);cen=[best.x,best.y]}}}
    S.box[meta.c]=[r1(mb[0][0]),r1(mb[0][1]),r1(mb[1][0]),r1(mb[1][1])];S.pt[meta.c]=[r1(cen[0]),r1(cen[1])];S.area[meta.c]=Math.round(pathGen.area(f))});
  out.set[name]=S;out.set[name]._projection=projection;
}

console.error("centres moved inside their shape:",[...new Set(movedPts)].join(" ")||"none");

// ---- 3. capitals: the populated place whose name matches our capital field, nearest the flag's centre ----
const places=load("ne_10m_populated_places_simple.geojson").map(f=>({name:f.properties.name,alt:f.properties.namealt||"",a3:f.properties.adm0_a3,cla:f.properties.featurecla,ll:f.geometry.coordinates}));
const a3ByCode={};for(const f of load("ne_50m_admin_0_countries.geojson")){const p=f.properties;const iso=p.ISO_A2_EH&&p.ISO_A2_EH!=="-99"?p.ISO_A2_EH:p.ISO_A2;if(iso&&iso!=="-99")a3ByCode[iso.toLowerCase()]=p.ADM0_A3}
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\bsaint\b/g,"st").replace(/[^a-z0-9]+/g," ").trim();
const nocap=[],approx=[];
const world=out.set.world,wp=world._projection;
// A place matches when its whole name is among the words of our capital field: a substring match let "Pô" (Burkina
// Faso) stand in for Porto-Novo. Of the matches near the flag, one inside its own outline wins, then the nearest.
// Places the file lacks are given here: Tifariti, the provisional capital of Western Sahara, the only one of its two
// capitals inside Natural Earth's de-facto outline (Laayoune falls outside it).
const CAPLL={eh:[-10.567,26.158]};
const featOf={};feats.forEach(x=>{if(x.c&&!featOf[x.c])featOf[x.c]=x});
const word=(w,n)=>!!n&&(" "+w+" ").includes(" "+n+" ");
for(const f of FLAGS){if(!f.cap||f.cap==="None"||!world.pt[f.c])continue;const want=norm(f.cap);const c0=world.pt[f.c];
  const dist=pl=>{const p=wp(pl.ll);return p?Math.hypot(p[0]-c0[0],p[1]-c0[1]):1e9};
  const inside=pl=>featOf[f.c]&&d3.geoContains({type:"Feature",geometry:featOf[f.c].geometry},pl.ll)?0:1;
  let cands=CAPLL[f.c]?[{name:f.cap,ll:CAPLL[f.c]}]:places.filter(pl=>word(want,norm(pl.name))||word(want,norm(pl.alt)));
  const bx=world.box[f.c],reach=Math.max(40,Math.hypot(bx[2]-bx[0],bx[3]-bx[1]));
  cands=cands.filter(pl=>dist(pl)<reach).sort((a,b)=>inside(a)-inside(b)||dist(a)-dist(b));
  let pick=cands[0];
  if(!pick){const own=places.filter(pl=>pl.a3===a3ByCode[f.c]&&pl.cla==="Admin-0 capital");pick=own[0]}
  if(!pick){approx.push(f.c);continue}
  for(const [name,S] of Object.entries(out.set)){if(!S.shape[f.c])continue;const xy=S._projection(pick.ll);if(xy)S.cap[f.c]=[r1(xy[0]),r1(xy[1])]}}
console.error("capitals: approximated (no place found, centre used):",approx.join(" ")||"none");
for(const c of approx)for(const S of Object.values(out.set))if(S.pt[c])S.cap[c]=S.pt[c];
// A coastal capital can fall just off a simplified coast (Dakar sits on a peninsula the simplification drops). One
// outside its own drawn outline is moved to just inside the nearest edge, by the least it takes; the build says which.
{const firstOf={};simplified.forEach((f,i)=>{const c=feats[i].c;if(c&&firstOf[c]===undefined)firstOf[c]=i});
  const snapped=[];
  for(const [name,S] of Object.entries(out.set)){const P=S._projection;
    for(const [c,cp] of Object.entries(S.cap)){const i=firstOf[c];if(i===undefined)continue;
      const rings=polys(simplified[i].geometry).flat().map(r=>r.map(ll=>P(ll)).filter(Boolean));
      let inside=false;for(const r of rings)for(let a=0,b=r.length-1;a<r.length;b=a++){const [xa,ya]=r[a],[xb,yb]=r[b];
        if((ya>cp[1])!==(yb>cp[1])&&cp[0]<(xb-xa)*(cp[1]-ya)/(yb-ya)+xa)inside=!inside}
      if(inside)continue;
      let best=null,bd=1e9;for(const r of rings)for(let a=0;a<r.length-1;a++){const [x1,y1]=r[a],[x2,y2]=r[a+1],dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy||1e-12;
        const t=Math.max(0,Math.min(1,((cp[0]-x1)*dx+(cp[1]-y1)*dy)/L)),q=[x1+t*dx,y1+t*dy],d=Math.hypot(q[0]-cp[0],q[1]-cp[1]);if(d<bd){bd=d;best=q}}
      if(!best||bd>3)continue; // far off means a wrong match, not a coast: leave it to be seen
      const k=(bd+0.15)/Math.max(bd,1e-6);S.cap[c]=[r1(cp[0]+(best[0]-cp[0])*k),r1(cp[1]+(best[1]-cp[1])*k)];if(name==="world")snapped.push(c+" "+bd.toFixed(2))}}
  console.error("capitals moved onto their coast (units off):",snapped.join(", ")||"none")}
// Equal Earth stretches shapes taller near the equator and flatter near the poles (a pseudocylindrical projection, so it
// depends on y alone). ky[i] is that stretch at y = 10·i: the app divides a frame's height by it so a region looks as it
// does on a globe.
{const P=out.set.world._projection,inv=P.invert,e=0.01;out.ky=[];
  for(let y=0;y<=out.h;y+=10){const ll=inv([W/2,Math.min(out.h-0.01,y)]);const lat=Math.max(-89,Math.min(89,ll[1]));const a=P([10,lat]),b=P([10+e,lat]),c=P([10,lat+e]);
    out.ky.push(Math.round(((a[1]-c[1])/e)/((b[0]-a[0])/e)*Math.cos(lat*Math.PI/180)*1000)/1000)}}
for(const S of Object.values(out.set))delete S._projection;
console.error("sizes:",Object.entries(out.set).map(([n,S])=>n+" land "+S.land.length+" shapes "+Object.keys(S.shape).length).join("; "));

// A last check: no piece of any outline may span most of the canvas (an inside-out ring draws the whole world).
for(const [n,S] of Object.entries(out.set))for(const [c,d] of Object.entries(S.shape))for(const sub of d.match(/M[^M]*/g)||[]){
  const v=sub.match(/-?\d+(\.\d+)?/g).map(Number),xs=v.filter((_,i)=>i%2===0);if(Math.max(...xs)-Math.min(...xs)>W*0.9&&!["aq","ru","ki","fj","us"].includes(c)||Math.max(...xs)-Math.min(...xs)>W*0.99){
    console.error("an outline of",c,"in",n,"spans the whole map: a ring is inside out");process.exit(1)}}
const js=`// Built by tools/build_map.js from Natural Earth (public domain). Equal Earth projection on a ${W}x${out.h} canvas.
// set.world is centred on 10°E, set.pac on 160°E for the Pacific. In each set: land = every country outline;
// shape = the outline per flag code; pt = a centre point; box = bounds; area = projected area; cap = the capital.
// frame = a pixel box per region and the set it is drawn from. ky = the projection's vertical stretch, sampled every
// 10 units of y. Edit the script, not this file.
const MAP=${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(root,"js/data/map.js"),js);
console.error("wrote js/data/map.js",Math.round(js.length/1024)+" KB");
