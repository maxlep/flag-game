// The map: Natural Earth outlines from js/data/map.js drawn as plain SVG. One function builds a map of a frame (a region
// or the world) with one flag's country filled in and its capital marked. Places too small to see at the frame's scale
// get a dot as well as their outline. Zooming is done by changing the viewBox, so lines stay crisp.

// The frame a flag is best seen in: its region, or the world for the organisations.
function mapFrameFor(c) {
  const f = BY[c],
    r = f.sov ? f.r : GEO[c];
  return MAP.frame[r] ? r : "World";
}
// Is there a shape for this flag? (The organisations have none.)
const mapHas = c => !!MAP.set[MAP.frame[mapFrameFor(c)].set].shape[c];
// The frame's box, widened to take in a flag whose centre lies outside it (a far-flung territory).
function mapBox(frame, code) {
  const fr = MAP.frame[frame],
    S = MAP.set[fr.set];
  let [x0, y0, x1, y1] = fr.box;
  if (code && S.pt[code]) {
    const [px, py] = S.pt[code];
    if (px < x0 || px > x1 || py < y0 || py > y1) {
      const b = S.box[code];
      x0 = Math.min(x0, b[0] - 8);
      y0 = Math.min(y0, b[1] - 8);
      x1 = Math.max(x1, b[2] + 8);
      y1 = Math.max(y1, b[3] + 8);
    }
  }
  return [x0, y0, x1, y1];
}

// The projection's vertical stretch at canvas height y (1 = as on a globe). A frame is drawn with its height divided
// by the stretch at its centre, so South America isn't tall and Scandinavia isn't flat. Mild at the poles: past 0.4 the
// correction would blow up, and the World frame is drawn as projected.
function mapKy(y) {
  const t = Math.max(0, Math.min(MAP.ky.length - 1.001, y / 10)),
    i = Math.floor(t),
    f = t - i;
  return Math.max(0.4, MAP.ky[i] + (MAP.ky[i + 1] - MAP.ky[i]) * f);
}

// A close frame around one flag: about three times the country's size, never narrower than a sub-continent (130 units,
// about 5,000 km) and never wider than the region, at the aspect ratio given (width over height, as drawn, so the
// stretch sy is allowed for). Kept inside the region's frame in the Pacific set, whose edges are empty.
function mapFit(frame, code, aspect, sy) {
  const fr = MAP.frame[frame],
    S = MAP.set[fr.set],
    Rg = mapBox(frame, code),
    b = S.box[code];
  // The world set has land everywhere, so the frame may leave the region; the Pacific set is empty outside Oceania.
  const R = fr.set === "world" ? [0, 0, MAP.w, MAP.h] : Rg;
  const rw = Rg[2] - Rg[0],
    rh = Rg[3] - Rg[1],
    bw = b[2] - b[0],
    bh = b[3] - b[1],
    asp = aspect * sy;
  let w = Math.min(rw, Math.max(130, bw * 3.2, bh * 3.2 * asp)),
    h = w / asp;
  if (h > rh) {
    h = rh;
    w = Math.min(rw, h * asp);
  }
  const cx = (b[0] + b[2]) / 2,
    cy = (b[1] + b[3]) / 2;
  const place = () => {
    let x0 = cx - w / 2,
      y0 = cy - h / 2;
    x0 = Math.max(R[0], Math.min(R[2] - w, x0));
    y0 = Math.max(R[1], Math.min(R[3] - h, y0));
    return [x0, y0, x0 + w, y0 + h];
  };
  // A speck in mid-ocean would frame nothing but sea: widen until some other land shows.
  let box = place();
  const land = ([x0, y0, x1, y1]) =>
    S.lbox.some(
      l => l[0] < x1 && l[2] > x0 && l[1] < y1 && l[3] > y0 && Math.hypot(l[2] - l[0], l[3] - l[1]) > w * 0.05
    );
  for (let i = 0; i < 4 && w < rw && !land(box); i++) {
    w = Math.min(rw, w * 1.6);
    h = Math.min(rh, w / asp);
    box = place();
  }
  return box;
}

// The explorable map: every flag in codes drawn as its own shape (data-c), over the land of the frame. Larger shapes
// go first, so where they overlap (the United Kingdom and England, a country and its territory) the smaller is on top;
// but places in the scope always go above those outside it.
// Places too small to see at the frame's scale also get a dot, with a wider invisible ring that takes the tap.
// The frame is the region's, widened to take in any flag lying wholly outside it (a far-flung territory; Russia, which
// reaches into the frame, doesn't widen it), then padded to the aspect ratio asked for. data-fit is the frame before
// that padding, in drawn units, for a viewer that opens zoomed to it.
// o.on, when given, is the set of codes in the current scope; the others are drawn hatched (.out) but stay tappable.
// Selection marks (the .hi copy of a shape and the capital) are added by the viewer.
function mapExploreSVG(o) {
  const frame = o.frame,
    S = MAP.set[MAP.frame[frame].set],
    codes = o.codes.filter(c => S.shape[c]);
  let [x0, y0, x1, y1] = MAP.frame[frame].box;
  const F = [x0, y0, x1, y1];
  for (const c of codes) {
    const b = S.box[c];
    if (b[2] < F[0] || b[0] > F[2] || b[3] < F[1] || b[1] > F[3]) {
      x0 = Math.min(x0, b[0] - 8);
      y0 = Math.min(y0, b[1] - 8);
      x1 = Math.max(x1, b[2] + 8);
      y1 = Math.max(y1, b[3] + 8);
    }
  }
  const sy = frame === "World" ? 1 : 1 / mapKy((y0 + y1) / 2);
  const pad = 0.03 * Math.max(x1 - x0, y1 - y0);
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  const fit = `${x0.toFixed(1)} ${(y0 * sy).toFixed(1)} ${(x1 - x0).toFixed(1)} ${((y1 - y0) * sy).toFixed(1)}`;
  if (o.aspect) {
    const cur = (x1 - x0) / ((y1 - y0) * sy);
    if (cur < o.aspect) {
      const d = (o.aspect * (y1 - y0) * sy - (x1 - x0)) / 2;
      x0 -= d;
      x1 += d;
    } else {
      const d = ((x1 - x0) / (o.aspect * sy) - (y1 - y0)) / 2;
      y0 -= d;
      y1 += d;
    }
  }
  const w = x1 - x0,
    h = y1 - y0,
    dot = Math.max(1.2, w * 0.006),
    Y = y => (y * sy).toFixed(1);
  const land = S.land
    .map((d, i) => {
      const b = S.lbox[i];
      return b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0 ? `<path d="${d}"/>` : "";
    })
    .join("");
  // Places in the scope go above those outside it, so a country isn't drawn hatched under its own parts.
  const isOn = c => !o.on || o.on.has(c);
  const order = codes.slice().sort((a, b) => isOn(a) - isOn(b) || S.area[b] - S.area[a]);
  const out = c => (o.on && !o.on.has(c) ? " out" : "");
  const shape = c => `<path class="ct${out(c)}" data-c="${c}" d="${S.shape[c]}"/>`;
  const offs = order.filter(c => !isOn(c)),
    ons = order.filter(isOn);
  // The hatch over the places outside the scope: real lines, clipped to those shapes, drawn by the viewer for the part
  // in view (lbHatch). A pattern fill was tried first; its tiles meet at fractional pixels and some stripes came out
  // thicker. It sits between them and the places in the scope, which may cover them.
  const hatch = offs.length
    ? `<clipPath id="exOut">${offs.map(c => `<path d="${S.shape[c]}"/>`).join("")}</clipPath><g class="hatch" clip-path="url(#exOut)"><path class="hl"/></g>`
    : "";
  const shapes = offs.map(shape).join("") + hatch + ons.map(shape).join("");
  const tiny = order.filter(c => {
    const b = S.box[c];
    return Math.hypot(b[2] - b[0], (b[3] - b[1]) * sy) < w * 0.012;
  });
  const dots =
    tiny
      .map(c => {
        const [px, py] = S.pt[c];
        return `<circle class="dot ex${out(c)}" data-c="${c}" cx="${px}" cy="${Y(py)}" r="${dot.toFixed(2)}"/>`;
      })
      .join("") +
    tiny
      .map(c => {
        const [px, py] = S.pt[c];
        return `<circle class="hit" data-c="${c}" cx="${px}" cy="${Y(py)}" r="${(dot * 3).toFixed(2)}"/>`;
      })
      .join("");
  return `<svg class="map explore${o.cls ? " " + o.cls : ""}" data-fit="${fit}" data-sy="${sy.toFixed(4)}" viewBox="${x0.toFixed(1)} ${Y(y0)} ${w.toFixed(1)} ${Y(h)}" preserveAspectRatio="xMidYMid meet"><rect class="sea" x="${x0.toFixed(1)}" y="${Y(y0)}" width="${w.toFixed(1)}" height="${Y(h)}"/><g transform="scale(1,${sy.toFixed(4)})"><g class="land">${land}</g><g class="cts">${shapes}</g><g class="sel"></g></g><g class="dots">${dots}</g><g class="marks"></g></svg>`;
}
// The flags an explorable map can show, and the frame to show them in: a region's own, the world for the wide lists.
// Null when none of them has a shape (the organisations).
function exploreOf(region, codes) {
  const frame = MAP.frame[region] ? region : "World",
    S = MAP.set[MAP.frame[frame].set];
  return codes.some(c => S.shape[c]) ? {frame, codes} : null;
}

// o: {frame, code, fit:aspect, aspect, cap:true|false, pad:0.04, cls:"", id:""}. Returns the SVG markup.
// fit frames the country closely at that aspect ratio; aspect instead widens the frame to that ratio (for a map that
// fills a screen). The SVG carries data-fit, the close frame in its own units, for a viewer that opens zoomed to it.
function mapSVG(o) {
  const frame = o.frame || (o.code ? mapFrameFor(o.code) : "World"),
    S = MAP.set[MAP.frame[frame].set];
  const fit = o.fit && o.code && S.box[o.code];
  let sy = 1;
  if (frame !== "World") {
    const b = fit ? S.box[o.code] : mapBox(frame, o.code);
    sy = 1 / mapKy((b[1] + b[3]) / 2);
  }
  let [x0, y0, x1, y1] = fit ? mapFit(frame, o.code, o.fit, sy) : mapBox(frame, o.code);
  const pad = (o.pad === undefined ? 0.04 : o.pad) * Math.max(x1 - x0, y1 - y0);
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  if (o.aspect) {
    const cur = (x1 - x0) / ((y1 - y0) * sy);
    if (cur < o.aspect) {
      const d = (o.aspect * (y1 - y0) * sy - (x1 - x0)) / 2;
      x0 -= d;
      x1 += d;
    } else {
      const d = ((x1 - x0) / (o.aspect * sy) - (y1 - y0)) / 2;
      y0 -= d;
      y1 += d;
    }
  }
  const w = x1 - x0,
    h = y1 - y0,
    dot = Math.max(1.5, w * 0.011),
    Y = y => (y * sy).toFixed(1);
  let fitAttr = "";
  if (o.code && S.box[o.code] && !fit) {
    const f = mapFit(frame, o.code, w / (h * sy), sy);
    fitAttr = ` data-fit="${f[0].toFixed(1)} ${Y(f[1])} ${(f[2] - f[0]).toFixed(1)} ${Y(f[3] - f[1])}"`;
  }
  // Only the land that falls in the frame; a region map doesn't carry the whole world's outlines.
  const land = S.land
    .map((d, i) => {
      const b = S.lbox[i];
      return b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0 ? `<path d="${d}"/>` : "";
    })
    .join("");
  let hi = "",
    marks = "";
  if (o.code && S.shape[o.code]) {
    const [px, py] = S.pt[o.code],
      b = S.box[o.code],
      tiny = Math.hypot(b[2] - b[0], (b[3] - b[1]) * sy) < w * 0.04;
    hi = `<path class="hi" d="${S.shape[o.code]}"/>`;
    if (tiny)
      marks += `<circle class="dot" cx="${px}" cy="${Y(py)}" r="${dot.toFixed(1)}"/><circle class="dot ring" cx="${px}" cy="${Y(py)}" r="${(dot * 2.2).toFixed(1)}"/>`;
    if (o.cap !== false && S.cap[o.code]) {
      const [cx, cy] = S.cap[o.code];
      marks += `<circle class="cap" cx="${cx}" cy="${Y(cy)}" r="${(dot * 0.8).toFixed(1)}"/>`;
    }
  }
  // Outlines are drawn through the vertical correction; the markers sit outside it so they stay round.
  return `<svg class="map${o.cls ? " " + o.cls : ""}"${o.id ? ` id="${o.id}"` : ""}${fitAttr} viewBox="${x0.toFixed(1)} ${Y(y0)} ${w.toFixed(1)}  ${Y(h)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect class="sea" x="${x0.toFixed(1)}" y="${Y(y0)}" width="${w.toFixed(1)}" height="${Y(h)}"/><g transform="scale(1,${sy.toFixed(4)})"><g class="land">${land}</g>${hi}</g>${marks}</svg>`;
}
