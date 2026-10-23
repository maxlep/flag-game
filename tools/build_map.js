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
const FIX={ // our code -> Natural Earth ISO when they differ
  "xk":"xk","ps":"ps","tw":"tw","eh":"eh"};
const want=new Set(FLAGS.map(f=>f.c));
const used=new Set();
for(const f of FLAGS){const iso=FIX[f.c]||f.c;const ne=byIso[iso];if(ne){feats.push({c:f.c,geometry:ne.geometry,base:true,name:ne.properties.NAME});used.add(f.c)}}
// Everything else on the base map (countries we don't quiz, e.g. Somaliland, N. Cyprus) is drawn as plain land.
for(const [iso,ne] of Object.entries(byIso)){if(!want.has(iso))feats.push({c:null,geometry:ne.geometry,base:true,name:ne.properties.NAME})}
// UK nations, and territories folded into their sovereign at the country level, from the 50m map units
const MU={ENG:"gb-eng",SCT:"gb-sct",WLS:"gb-wls",NIR:"gb-nir",MTQ:"mq",TKL:"tk",CXR:"cx",CCK:"cc"};
for(const f of load("ne_50m_admin_0_map_units.geojson")){const k=MU[f.properties.SU_A3];if(k){feats.push({c:k,geometry:f.geometry,base:false,name:f.properties.NAME});used.add(k)}}
// Gibraltar only exists at 10m
for(const f of load("ne_10m_admin_0_map_units.geojson")){if(f.properties.SU_A3==="GIB"){feats.push({c:"gi",geometry:f.geometry,base:false,name:"Gibraltar"});used.add("gi")}}
// Saint Helena's parts from the 10m subunits
const SU={SHS:"sh-hl",BAC:"sh-ac",SHT:"sh-ta"};
for(const f of load("ne_10m_admin_0_map_subunits.geojson")){const k=SU[f.properties.SU_A3];if(k){feats.push({c:k,geometry:f.geometry,base:false,name:f.properties.NAME});used.add(k)}}
// Spain's regions and the Canary Islands from the 10m admin-1 layer (the Canaries are two provinces)
const A1={"Cataluña":"es-ct","Galicia":"es-ga","País Vasco":"es-pv"};const canary=[];
for(const f of load("ne_10m_admin_1_states_provinces.geojson")){const p=f.properties;if(p.adm0_a3!=="ESP")continue;
  if(p.region==="Canarias"||["Las Palmas","Santa Cruz de Tenerife"].includes(p.name))canary.push(f.geometry);
  const k=A1[p.region]||A1[p.name];if(k&&p.type_en!=="Province"||k&&!feats.some(x=>x.c===k)){if(!feats.some(x=>x.c===k)){feats.push({c:k,geometry:f.geometry,base:false,name:p.name});used.add(k)}}}
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
const W=1000;
const r1=n=>Math.round(n*10)/10;
const fmt=d=>d.replace(/(\d+\.\d{2,})/g,m=>String(r1(+m)));
// Frames are lon/lat boxes; each is drawn from a projection centred on it, so nothing in it is cut at the seam.
// Oceania straddles the antimeridian, so it gets its own Pacific-centred set of shapes ("pac").
const FRAMES={World:{box:[-180,-90,180,90],set:"world"},Europe:{box:[-25,34,45,72],set:"world"},Africa:{box:[-26,-36,58,38],set:"world"},
  Asia:{box:[25,-12,150,78],set:"world"},Americas:{box:[-170,-58,-30,84],set:"world"},Antarctic:{box:[-180,-90,180,-35],set:"world"},Oceania:{box:[110,-50,235,25],set:"pac"}};
const SETS={world:{center:10},pac:{center:160}};
const out={w:W,h:0,set:{},frame:{}};
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
    const main=mainPoly(f),mb=pathGen.bounds(main),cen=pathGen.centroid(main);
    S.box[meta.c]=[r1(mb[0][0]),r1(mb[0][1]),r1(mb[1][0]),r1(mb[1][1])];S.pt[meta.c]=[r1(cen[0]),r1(cen[1])];S.area[meta.c]=Math.round(pathGen.area(f))});
  out.set[name]=S;out.set[name]._projection=projection;
}

// ---- 3. capitals: the populated place whose name matches our capital field, nearest the flag's centre ----
const places=load("ne_10m_populated_places_simple.geojson").map(f=>({name:f.properties.name,alt:f.properties.namealt||"",a3:f.properties.adm0_a3,cla:f.properties.featurecla,ll:f.geometry.coordinates}));
const a3ByCode={};for(const f of load("ne_50m_admin_0_countries.geojson")){const p=f.properties;const iso=p.ISO_A2_EH&&p.ISO_A2_EH!=="-99"?p.ISO_A2_EH:p.ISO_A2;if(iso&&iso!=="-99")a3ByCode[iso.toLowerCase()]=p.ADM0_A3}
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\bsaint\b/g,"st").replace(/[^a-z0-9]+/g," ").trim();
const nocap=[],approx=[];
const world=out.set.world,wp=world._projection;
for(const f of FLAGS){if(!f.cap||f.cap==="None"||!world.pt[f.c])continue;const want=norm(f.cap);const c0=world.pt[f.c];
  const dist=pl=>{const p=wp(pl.ll);return p?Math.hypot(p[0]-c0[0],p[1]-c0[1]):1e9};
  let cands=places.filter(pl=>want.includes(norm(pl.name))||(pl.alt&&want.includes(norm(pl.alt))));
  const bx=world.box[f.c],reach=Math.max(40,Math.hypot(bx[2]-bx[0],bx[3]-bx[1]));
  cands=cands.filter(pl=>dist(pl)<reach).sort((a,b)=>dist(a)-dist(b));
  let pick=cands[0];
  if(!pick){const own=places.filter(pl=>pl.a3===a3ByCode[f.c]&&pl.cla==="Admin-0 capital");pick=own[0]}
  if(!pick){approx.push(f.c);continue}
  for(const [name,S] of Object.entries(out.set)){if(!S.shape[f.c])continue;const xy=S._projection(pick.ll);if(xy)S.cap[f.c]=[r1(xy[0]),r1(xy[1])]}}
console.error("capitals: approximated (no place found, centre used):",approx.join(" ")||"none");
for(const c of approx)for(const S of Object.values(out.set))if(S.pt[c])S.cap[c]=S.pt[c];
for(const S of Object.values(out.set))delete S._projection;
console.error("sizes:",Object.entries(out.set).map(([n,S])=>n+" land "+S.land.length+" shapes "+Object.keys(S.shape).length).join("; "));

const js=`// Built by tools/build_map.js from Natural Earth (public domain). Equal Earth projection on a ${W}x${out.h} canvas.
// set.world is centred on 10°E, set.pac on 160°E for the Pacific. In each set: land = every country outline;
// shape = the outline per flag code; pt = a centre point; box = bounds; area = projected area; cap = the capital.
// frame = a pixel box per region and the set it is drawn from. Edit the script, not this file.
const MAP=${JSON.stringify(out)};
`;
fs.writeFileSync(path.join(root,"js/data/map.js"),js);
console.error("wrote js/data/map.js",Math.round(js.length/1024)+" KB");
