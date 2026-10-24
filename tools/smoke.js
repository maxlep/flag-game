#!/usr/bin/env node
// Smoke test: opens the app in a headless browser and goes through it the way a person would, failing on any page
// error or on a step that doesn't land where it should. Run it before merging anything larger than a small change.
//
// Needs Playwright, which the app itself never loads:
//   npm install playwright   (anywhere; set NODE_PATH to its node_modules)   then   npx playwright install chromium
//   node tools/smoke.js
// The core package alone (playwright-core) also works, with a Chromium of its own version installed.
//
// It goes through: home; a study list; the explorable map (list entry, map tap, hiding and showing the list, a design
// from the list, back); a Learn round with the viewer from the question flag and from the card's map, through to the
// results; a Drill round; a typed (Expert) round answered from the suggestions; map rounds asked with the flag and with the name; the badges
// page. On a phone-sized
// touch screen and on a desktop-sized one.
const path=require("path");
let pw;try{pw=require("playwright")}catch(e){pw=require("playwright-core")}
const URL="file://"+path.resolve(__dirname,"..","index.html");

(async()=>{
  const browser=await pw.chromium.launch();
  const errors=[];let step="";
  // Errors a page opened from disk always shows, and the fonts the sandbox may not reach, aren't the app's.
  const ignore=/ERR_TUNNEL|ERR_INTERNET|ERR_NAME|ERR_CONNECTION|Fetch API cannot load file|URL scheme "file"|fonts\.g/;
  const fail=(what,detail)=>{throw new Error(`${step}: ${what}${detail!==undefined?" ("+JSON.stringify(detail)+")":""}`)};
  const expect=(cond,what,detail)=>{if(!cond)fail(what,detail)};

  async function open(opts){
    const p=await browser.newPage(opts);
    p.on("pageerror",e=>errors.push(`${step}: ${e.message}`));
    p.on("console",m=>{if(m.type()==="error"&&!ignore.test(m.text()))errors.push(`${step}: console: ${m.text()}`)});
    await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.reload();
    await p.waitForSelector(".tile");return p;
  }
  const js=(p,f,a)=>p.evaluate(f,a);
  const tap=async(p,sel)=>{const el=p.locator(sel).first();await el.waitFor();await el.click();await p.waitForTimeout(150)};

  // A round from a region card: settings by clicking them, as on the setup screen, then answered to the end.
  async function round(p,{pace,diff,typed}){
    step=`${pace} ${diff} round: setup`;
    await js(p,()=>goHome());
    await tap(p,'.tile:has-text("Europe") .tmain');
    expect(await js(p,()=>S.view)==="setup","setup screen");
    await tap(p,'.seg button:text-is("10")');
    await tap(p,`.seg button:text-is("${diff[0].toUpperCase()+diff.slice(1)}")`);
    await tap(p,'#dirSeg button:text-is("Name")');
    await tap(p,`.seg button:text-is("${pace[0].toUpperCase()+pace.slice(1)}")`);
    await tap(p,"#startBtn");
    expect(await js(p,()=>S.view)==="quiz","round started");
    for(let n=0;n<10;n++){
      step=`${pace} ${diff} round: question ${n+1}`;
      const q=await js(p,()=>({c:S.qs[S.i].c,name:BY[S.qs[S.i].c].n,opts:S.qs[S.i].opts||null,i:S.i}));
      if(n===0){ // the viewer from the question flag: quiet before the answer, closed by Esc
        await tap(p,".flag.big");
        expect(await js(p,()=>LB&&LB.what==="flag"&&LB.el.classList.contains("quiet")),"viewer opens quiet from the question flag");
        await p.keyboard.press("Escape");await p.waitForTimeout(150);
        expect(await js(p,()=>LB===null),"Esc closes the viewer");
      }
      if(typed){
        const box=p.locator("#typeIn");await box.click();
        await box.pressSequentially(q.name.slice(0,3),{delay:20});await p.waitForTimeout(150);
        const chips=p.locator("#sugg button");expect(await chips.count()>0,"suggestions appear",q.name.slice(0,3));
        const want=chips.filter({hasText:new RegExp("^"+q.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"$")});
        await ((await want.count())?want.first():chips.first()).click();await p.waitForTimeout(200);
      }else{
        // Learn answers wrong on the first question, to see the card; otherwise the right option.
        const pick=pace==="learn"&&n===0?q.opts.find(c=>c!==q.c):q.c;
        await tap(p,`.opts .opt >> nth=${q.opts.indexOf(pick)}`);
      }
      expect(await js(p,()=>!!S.qs[S.i].ans),"answered");
      if(pace==="learn"&&n===0){ // the card's map opens the viewer on the map
        await tap(p,".card .mapbtn");
        expect(await js(p,()=>LB&&LB.what==="map"),"the card's map opens the viewer on the map");
        await p.keyboard.press("Escape");await p.waitForTimeout(150);
      }
      if(pace==="drill"&&(await js(p,()=>S.qs[S.i].ans===S.qs[S.i].c))){await p.waitForTimeout(700)} // moves on by itself
      else if(n%2){await tap(p,"#nextBtn")} // the Next button, and on alternate questions the Enter key
      else{await p.evaluate(()=>document.activeElement&&document.activeElement.blur&&document.activeElement.blur());await p.keyboard.press("Enter");await p.waitForTimeout(150)}
      if(n<9)expect(await js(p,i=>S.view==="quiz"&&S.i===i+1,q.i),"next question");
    }
    step=`${pace} ${diff} round: results`;
    expect(await js(p,()=>S.view)==="done","results screen");
  }

  // A round answered on the map, asked with the flag or the name: the first question tapped wrong, the rest right,
  // each tap on the place's centre, then Check (by its button, or the Enter key). Panned and zoomed on the way.
  async function mapRound(p,ask){
    step=`map round asked with the ${ask}: setup`;
    await js(p,()=>goHome());
    await tap(p,'.tile:has-text("Europe") .tmain');
    await tap(p,'.seg button:text-is("10")');
    await tap(p,'.seg button:text-is("Medium")');
    await tap(p,'#dirSeg button:text-is("Map")');
    await tap(p,`#askSeg button:text-is("${ask==="flag"?"Flag":"Name"}")`);
    await tap(p,'.seg button:text-is("Learn")');
    await tap(p,"#startBtn");
    expect(await js(p,()=>S.view==="quiz"&&S.dir==="map"&&!!document.querySelector(".qmap svg")),"map round started");
    for(let n=0;n<10;n++){
      step=`map round asked with the ${ask}: question ${n+1}`;
      const q=await js(p,()=>({c:S.qs[S.i].c,i:S.i}));
      if(n===0){
        const vb0=await js(p,()=>document.querySelector(".qmap svg").getAttribute("viewBox"));
        await tap(p,'.qmctl button[aria-label="Zoom in"]');
        const box=await js(p,()=>{const r=document.querySelector(".qmap").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
        await p.mouse.move(box.x,box.y);await p.mouse.down();await p.mouse.move(box.x+40,box.y+20,{steps:4});await p.mouse.up();
        expect(await js(p,v=>document.querySelector(".qmap svg").getAttribute("viewBox")!==v,vb0),"zoom and pan move the map");
        expect(await js(p,()=>!S.qs[S.i].sel),"a drag selects nothing");
        await p.mouse.dblclick(box.x,box.y);await p.waitForTimeout(150);
      }
      // A wrong place on the first question: the first place in the round that isn't the answer.
      const want=n===0?await js(p,c=>S.qs.map(x=>x.c).find(x=>x!==c),q.c):q.c;
      // The place's centre, or where that falls outside it (Norway's lands in Sweden) the nearest point on screen that
      // is in it.
      const pt=await js(p,c=>{const s=document.querySelector(".qmap svg"),M=MAP.set[MAP.frame[qmFrame(c)].set],[x,y]=M.pt[c];qmSet(s,[x-30,y*(+s.dataset.sy)-30,60,60]);const P=s.createSVGPoint();P.x=x;P.y=y*(+s.dataset.sy);const r=P.matrixTransform(s.getScreenCTM()),B=s.getBoundingClientRect();
        r.x=Math.min(B.right-50,Math.max(B.left+10,r.x));r.y=Math.min(B.bottom-10,Math.max(B.top+10,r.y)); // a centre beyond the frame (Russia's)
        const at=(px,py)=>document.elementsFromPoint(px,py).some(e=>e.dataset&&e.dataset.c===c);
        for(let d=0;d<240;d+=4)for(let a=0;a<16;a++){const px=r.x+d*Math.cos(a*Math.PI/8),py=r.y+d*Math.sin(a*Math.PI/8);if(at(px,py))return {x:px,y:py}}
        return {x:r.x,y:r.y}},want);
      for(let k=0;k<4&&(await js(p,()=>S.qs[S.i].sel))!==want;k++){await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(380)} // overlapping places cycle
      expect(await js(p,c=>S.qs[S.i].sel===c,want),"a tap selects the place",want);
      expect(await js(p,()=>!S.qs[S.i].ans&&!$("#qmCheck").disabled),"selected, not yet answered");
      if(n%2)await tap(p,"#qmCheck");
      else{await p.evaluate(()=>document.activeElement&&document.activeElement.blur&&document.activeElement.blur());await p.keyboard.press("Enter");await p.waitForTimeout(150)}
      expect(await js(p,c=>S.qs[S.i].ans===c,want),"Check answers with the place selected",await js(p,()=>({ans:S.qs[S.i].ans,sel:S.qs[S.i].sel,act:document.activeElement&&document.activeElement.tagName})));
      expect(await js(p,()=>!!document.querySelector(".qmap .sel .right")),"the right place is marked");
      await tap(p,"#nextBtn");
      if(n<9)expect(await js(p,i=>S.view==="quiz"&&S.i===i+1,q.i),"next question");
    }
    step=`map round asked with the ${ask}: results`;
    expect(await js(p,()=>S.view)==="done","results screen");
    expect(await js(p,a=>a==="name"?Object.keys(located).length>0:true,ask),"name to map counts as located");
  }

  async function run(name,opts){
    const p=await open(opts);
    step=`${name}: home`;
    expect(await p.locator(".tile").count()>5,"home cards");

    step=`${name}: study list`;
    await tap(p,'.tile:has-text("Europe") .tico[title="Study as a list"]');
    expect(await js(p,()=>S.view==="study"&&document.querySelectorAll(".study .entry").length>20),"Europe's study list");
    await tap(p,'.studysort .chipbtn:text-is("Area")');
    expect(await js(p,()=>document.querySelectorAll(".study .grp").length===4),"sorted by area");
    await tap(p,'.studysort .chipbtn:text-is("A–Z")');

    step=`${name}: explorable map`;
    await tap(p,".mapopen");
    expect(await js(p,()=>LB&&LB.what==="explore"),"map opens");
    await tap(p,'#exBody .entry[data-c="fr"] .t p');
    expect(await js(p,()=>LB.sel==="fr"),"a list entry selects its place");
    const de=await js(p,()=>{const r=document.querySelector('#lb .ct[data-c="de"]').getBoundingClientRect();return {x:r.x+r.width*0.5,y:r.y+r.height*0.55}});
    await p.mouse.click(de.x,de.y);await p.waitForTimeout(150);
    expect(await js(p,()=>LB.sel==="de"&&document.querySelector("#exBody .entry.sel").dataset.c==="de"),"a tap on the map selects and marks its entry");
    await tap(p,"#exTab .exdown");
    expect(await js(p,()=>SET.exFold&&!!document.querySelector("#exCard .entry")),"hiding the list shows the card");
    await tap(p,"#exTab .exup");
    expect(await js(p,()=>!SET.exFold),"the list shows again");
    await tap(p,'#exBody .entry.sel .flink');
    expect(await js(p,()=>LB.what==="flag"),"an entry's flag opens its designs");
    await p.keyboard.press("Escape");await p.waitForTimeout(200);
    expect(await js(p,()=>LB&&LB.what==="explore"&&LB.sel==="de"),"closing the designs comes back to the map");
    await tap(p,"#lb .lb-back");
    expect(await js(p,()=>LB===null&&S.view==="study"),"back to the study list");

    await round(p,{pace:"learn",diff:"medium"});
    await round(p,{pace:"drill",diff:"hard"});
    await round(p,{pace:"learn",diff:"expert",typed:true});
    await mapRound(p,"flag");
    await mapRound(p,"name");

    step=`${name}: badges`;
    await js(p,()=>goHome());
    await tap(p,".tile.gold .tmain");
    expect(await js(p,()=>S.view)==="badges","badges page");
    await p.close();
  }

  try{
    await run("phone",{viewport:{width:390,height:844},hasTouch:true});
    await run("desktop",{viewport:{width:1280,height:800}});
  }catch(e){errors.push(e.message)}
  await browser.close();
  if(errors.length){console.error("smoke test failed:\n  "+errors.join("\n  "));process.exit(1)}
  console.log("smoke test passed");
})();
