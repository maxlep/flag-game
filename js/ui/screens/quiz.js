// js/ui/screens/quiz.js: The quiz screen, and the question flag's way into the viewer.
// Needs before it at load time: nothing.

// The map asked about is square on a tall screen and wider on a wide one.
const QASP = () => (innerWidth / innerHeight < 0.75 ? 1 : 1.5);
function viewQuiz() {
  const q = S.qs[S.i],
    f = BY[q.c],
    n = S.qs.length;
  const dots =
    n > 30
      ? `<i class="now" style="flex:${S.i + 1} 1 0"></i><i style="flex:${n - S.i - 1} 1 0"></i>`
      : S.qs
          .map((x, i) => `<i class="${x.ans ? (x.ans === x.c ? "ok" : "bad") : i === S.i ? "now" : ""}"></i>`)
          .join("");
  const letters = "ABCDEFGHIJKLMNOP";
  const reverse = S.dir === "flag",
    mapq = S.dir === "map",
    typed = TYPED(S.diff) && !reverse && !mapq,
    strict = S.diff === "master";
  // When a card is shown the keyboard is closed and the drawer condenses; when it isn't (Drill, correct) the drawer keeps
  // its height so the flag doesn't resize between answers.
  const compact = !!q.ans && !(S.pace === "drill" && q.ans === q.c);
  // Asked with the map: the place filled in on its region's map, where the flag would be (smaller over a grid of flags).
  // A tap opens it in the viewer, unnamed until answered. Master draws no borders.
  const askMap = S.ask === "map",
    shown = askMap
      ? `<div class="qaskmap" style="--qa:${QASP()}"><button type="button" class="mapbtn" onmousedown="event.preventDefault()" onclick="openMap('${q.c}',false,${!q.ans})" aria-label="The map, larger">${mapSVG({code: q.c, cap: false, aspect: QASP(), cls: "qask" + (strict ? " noborder" : "")})}</button></div>`
      : `<div class="qflag">${img(q.c, "flag big", q.v || 0)}</div>`;
  let prompt,
    opts,
    ask = "";
  const steady = mapq && !!q.ans && S.pace === "drill" && q.ans === q.c;
  if (mapq) {
    // Found on the map: the question (the flag, or the name) above, the map under it filling the band.
    // Easy names the part of the region it is in, beside the name as regions are on the cards (under the flag when the
    // question is the flag); only that part can be tapped.
    const area = S.diff === "easy" && AREA_OF[q.c] ? `<span class="where">in ${esc(AREA_OF[q.c])}</span>` : "";
    prompt = `<div class="qprompt">${S.ask === "name" ? `<p class="ask">${esc(f.n)}${area}</p>` : `<div class="qflag">${img(q.c, "flag big", q.v || 0)}</div>${area ? `<p class="qarea">${area}</p>` : ""}`}</div><div class="qmap">${qmSVG(q)}${QMCTL}</div>`;
    ask = `<p class="eyebrow">Select it on the map.</p>`;
    // In Drill a right answer moves on by itself with no card. As in the other Drill rounds, Next appears so you can move
    // on sooner; it takes the place of the Check row, under the same instruction, so the drawer and the map keep their
    // size from question to question.
    opts = steady
      ? `<div class="row"><button class="btn" id="nextBtn" onmousedown="event.preventDefault()" onclick="next()">${S.i + 1 < n ? "Next" : "See results"}</button></div>`
      : q.ans
        ? ""
        : `<div class="row"><button type="button" class="btn" id="qmCheck" ${q.sel ? "" : "disabled"} onmousedown="event.preventDefault()" onclick="qmCheck()">Check</button><button type="button" class="btn line reveal" onmousedown="event.preventDefault()" onclick="answer('__wrong__')">Reveal</button></div>`;
  } else if (reverse) {
    // The name (or the map) in the band, as the flag is in the other rounds; the flags to pick from ride in the drawer
    // like the other rounds' answers, and with a card on screen only the right one and the one picked stay.
    prompt = askMap ? shown : `<div class="qprompt big"><p class="ask">${esc(f.n)}</p></div>`;
    ask = `<p class="eyebrow">Which flag?</p>`;
    opts = `<div class="flagopts n${q.opts.length}">${q.opts
      .map((c, i) => {
        if (compact && c !== q.c && c !== q.ans) return "";
        let cls = "fopt";
        if (q.ans) {
          if (c === q.c) cls += " right";
          else if (c === q.ans) cls += " wrong";
          else cls += " dim";
        }
        return `<button class="${cls}" ${q.ans ? "disabled" : ""} onclick="answer('${c}')">${img(c, "flag sm", q.ov ? q.ov[i] : 0)}<span class="key${q.ans ? "" : " one"}">${letters[i]}${q.ans ? " · " + esc(BY[c].n) : ""}</span></button>`;
      })
      .join("")}</div>`;
  } else if (typed) {
    prompt = shown;
    ask = `<p class="eyebrow">${askMap ? "Which place? Type it." : "Which country? Type it."}</p>`;
    // After the answer the box stays, read-only, so the keyboard stays open; Enter in it moves on.
    opts = `<form class="typebox" onsubmit="event.preventDefault();submitTyped()">
      <input id="typeIn" name="q" type="text" inputmode="text" enterkeyhint="${q.ans ? "next" : "go"}" ${q.ans ? "readonly" : ""} autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" placeholder="${q.ans ? "Enter for next" : strict ? "Spell it exactly" : "Your answer"}" value="${esc(q.typed || "")}" oninput="typeInput(this.value)" onkeydown="if(event.key==='Tab'){event.preventDefault();${strict ? "" : "const sg=suggest(this.value);if(sg.length){this.value=BY[sg[0]].n;typeInput(this.value)}"}}">
      ${strict || compact ? "" : '<div class="sugg" id="sugg"></div>'}
      <div class="row">${q.ans ? `<button type="button" class="btn" id="nextBtn" onmousedown="event.preventDefault()" onclick="next()">${S.i + 1 < n ? "Next" : "See results"}</button>` : `<button type="submit" class="btn" onmousedown="event.preventDefault()">Check</button><button type="button" class="btn line reveal" onmousedown="event.preventDefault()" onclick="answer('__wrong__')">Reveal</button>`}</div></form>`;
  } else {
    prompt = shown;
    ask = `<p class="eyebrow">${askMap ? "Which place?" : "Which country?"}</p>`;
    // With a card on screen only the right answer, and the wrong one picked, stay; the rest would take room from it.
    opts = `<div class="opts">${q.opts
      .map((c, i) => {
        if (compact && c !== q.c && c !== q.ans) return "";
        let cls = "opt";
        if (q.ans) {
          if (c === q.c) cls += " right";
          else if (c === q.ans) cls += " wrong";
          else cls += " dim";
        }
        return `<button class="${cls}" ${q.ans ? "disabled" : ""} onclick="answer('${c}')"><span class="key">${letters[i]}</span><span>${esc(BY[c].n)}</span></button>`;
      })
      .join("")}</div>`;
  }
  let reveal = "";
  if (q.ans) {
    const ok = q.ans === q.c,
      picked = BY[q.ans],
      showFlag = S.ask !== "flag";
    let miss = "";
    if (!ok) {
      const gi = GROUP_OF[q.c] && GROUP_OF[q.c].find(i => GROUPS[i].f.includes(q.ans));
      const hint = gi !== undefined && gi !== null ? esc(GROUPS[gi].h) : "";
      if (picked)
        miss = `<div class="row" style="align-items:center"><button type="button" class="flink" style="flex:0 0 72px" onclick="openFlag('${q.ans}')" title="View large">${img(q.ans, "flag sm")}</button><p class="small muted">You picked ${esc(picked.n)}. ${hint}</p></div>`;
      else miss = `<p class="small muted">${q.typed ? `"${esc(q.typed)}" didn't match a country.` : "Revealed."}</p>`;
    }
    // Where the flag and the place now stand, for the meters this round fills: the same standing as on the
    // study cards: full and green once learned, else the meter with what this answer filled or emptied. Nothing on Easy,
    // which changes nothing. Rounds saved before the place meter fill only the flag's (q.s0, q.s1) or, with q.place,
    // only the place's in q.s0, q.s1.
    const one = (s0, s1, full, place) => standing(s1, s0, place);
    const pill =
      q.pts === null || q.pts === undefined || !q.pts
        ? ""
        : q.p1 !== undefined
          ? (q.s1 !== undefined ? one(q.s0, q.s1, q.nowMastered, false) : "") + one(q.p0, q.p1, q.nowLocated, true)
          : q.s1 !== undefined
            ? one(q.s0, q.s1, q.nowMastered, !!q.place)
            : `<span class="pill ${ok ? "ok" : "bad"}">${q.pts > 0 ? "+" + q.pts : q.pts}</span>`;
    // Stacked at the card's top right, as on the study cards, so a long verdict never pushes them onto a line of their
    // own.
    const meters = pill ? `<span class="meters">${pill}</span>` : "";
    if (S.pace === "drill" && !q.lore) {
      reveal = ok
        ? `<div class="card lore toast"><div class="vrow"><p class="verdict ok">Correct · ${esc(f.n)}</p>${meters}</div></div>`
        : `<div class="card lore">
        <div class="vrow"><p class="verdict bad">Not quite</p>${meters}</div>
        <div><h2>${nameLine(q.c, mixedRound())}</h2><div class="facts">${facts(q.c)}</div></div>
        ${showFlag ? cardFlag(q.c, q.v || 0) : ""}${miss}
        <button class="link" style="text-align:left" onclick="showLore()">Show the story</button>
      </div>
`;
    } else
      reveal = `<div class="card lore">
      <div class="vrow"><p class="verdict ${ok ? "ok" : "bad"}">${ok ? "Correct" : "Not quite"}${S.streak >= 3 ? ` · ${S.streak} in a row` : ""}</p>${meters}</div>
      ${showFlag ? cardFlag(q.c, q.v || 0) + vchips(q.c, q.v || 0, "setQVar(%i)") : ""}
      <div><h2>${nameLine(q.c, mixedRound())}</h2><div class="facts">${facts(q.c)}</div>${useLine(q.c, q.v || 0)}${showFlag ? "" : vchips(q.c, q.v || 0, "setQVar(%i)")}</div>
      <p>${esc(f.m)}</p>
      ${mapq || askMap ? "" : cardMap(q.c)}
      ${miss}
    </div>`;
  }
  const nextBtn =
    q.ans && !typed && !steady
      ? `<button class="btn" id="nextBtn" onmousedown="event.preventDefault()" onclick="next()">${S.i + 1 < n ? "Next" : "See results"}</button>`
      : "";
  const right = S.qs.filter(x => x.ans === x.c).length;
  return `<div class="qscreen">
  <div class="sticky"><div class="top"><button class="back" onclick="goBack()">‹ Exit</button><span class="stat">${esc(S.label)} · ${right} right · ${S.i + 1} / ${n}</span></div>
  <div class="progress">${dots}</div>
  ${S.confirmLeave ? `<div class="leave"><span>Leave this round? Its score won't be kept.</span><span class="row" style="flex:none"><button class="btn line sm" onclick="goBack()">Leave</button><button class="btn sm" onclick="stayInRound()">Stay</button></span></div>` : ""}</div>
  <div class="qmid${mapq ? " mapq" : ""}" id="qmid" data-i="${S.i}">${prompt}${reveal}</div>
  <div class="qdrawer${q.ans ? " answered" : ""}${compact ? " compact" : ""}${!typed && !mapq && S.pace === "drill" ? " hold" : ""}">${q.ans && (!typed || compact) && !steady ? "" : ask}${opts}${nextBtn}</div>
  </div>`;
}

// The question flag opens the viewer with the flag where it is: a tap, a pinch, a double click or the wheel. A
// pinch's pointers are captured by the flag's box, so their moves and lifts are passed on to the viewer.
function wireZoom() {
  app.querySelectorAll(".flag.big").forEach(box => {
    if (box._z) return;
    box._z = true;
    const c = box.dataset.c,
      vi = () => +(box.querySelector(".fl:not([hidden])") || {dataset: {v: 0}}).dataset.v;
    const open = () => {
      if (LB) return;
      const q = S.qs && S.qs[S.i];
      openFlag(c, vi(), {from: box.querySelector(".fl:not([hidden])").getBoundingClientRect(), quiet: !(q && q.ans)});
    };
    // A tap opens the viewer as the study list does, the flag growing from its place on the page to its full size
    // (never smaller than it was on the page).
    const openFull = () => {
      if (LB) return;
      open();
      if (!LB) return;
      const fl = LB.fl;
      void fl.offsetWidth;
      fl.classList.add("snap");
      const s0 = LB.from.s;
      LB.from = null;
      LB.min = 1;
      LB.scale = Math.max(1, s0);
      LB.x = 0;
      LB.y = 0;
      lbApply();
      clearTimeout(LB.snapT);
      LB.snapT = setTimeout(() => LB && fl.classList.remove("snap"), 300);
    };
    const pts = new Map();
    box.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse") return;
      capture(box, e);
      if (LB) {
        lbDown(e);
        return;
      }
      pts.set(e.pointerId, e);
      if (pts.size >= 2) {
        open();
        for (const p of pts.values()) lbDown(p);
        pts.clear();
      }
    });
    box.addEventListener("pointermove", e => {
      if (LB) lbMove(e);
    });
    const end = e => {
      pts.delete(e.pointerId);
      if (LB) lbUp(e);
    };
    box.addEventListener("pointerup", end);
    box.addEventListener("pointercancel", end);
    // A tap opens the viewer too. The mousedown is swallowed so the tap doesn't take focus from the answer box.
    box.addEventListener("mousedown", e => e.preventDefault());
    box.addEventListener("click", () => {
      if (!LB) openFull();
    });
    box.addEventListener(
      "wheel",
      e => {
        e.preventDefault();
        if (e.deltaY > 0 && !LB) return;
        open();
        lbZoom(Math.exp(-e.deltaY * 0.0015), {x: e.clientX, y: e.clientY});
      },
      {passive: false}
    );
    box.addEventListener("dblclick", e => {
      if (e.sourceCapabilities?.firesTouchEvents) return;
      open();
      lbToggle({x: e.clientX, y: e.clientY});
    });
  });
}
