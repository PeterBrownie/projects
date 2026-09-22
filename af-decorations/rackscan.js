// Ribbon rack scanner. Runs entirely in the browser: finds each ribbon in a rack image,
// matches its stripe pattern against the AFPC ribbon images, and counts bronze devices
// (oak leaf clusters and service stars) sitting on top of it.
//
// Works on ImageData-like objects: { width, height, data: RGBA bytes }.
(function (root) {
  const BINS = 48;
  const ASPECT = 3.5; // ribbon width / height (1 3/8" x 3/8" is 3.67; racks with seams run a little lower)

  // ── Color helpers ──────────────────────────────────
  function toLab(r, g, b) {
    const f = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    const R = f(r), G = f(g), B = f(b);
    let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
    let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const g3 = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    x = g3(x); y = g3(y); z = g3(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  // Lightness counts for less than hue: scans and screenshots shift brightness far more than color.
  function dE(a, b) {
    const dl = (a[0] - b[0]) * 0.5, da = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dl * dl + da * da + db * db);
  }
  function hsv(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx / 255];
  }
  const px = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };
  const median = (arr) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };

  // ── Stripe profile ─────────────────────────────────
  // Median Lab color of each vertical slice of a region. Medians ignore small devices and texture.
  function profile(img, x0, y0, w, h, margin, skip) {
    const mx = Math.round(w * (margin ? 0.04 : 0)), my = Math.round(h * (margin ? 0.18 : 0.1));
    const xs = x0 + mx, xe = x0 + w - mx, ys = y0 + my, ye = y0 + h - my;
    const out = [];
    for (let b = 0; b < BINS; b++) {
      const a = Math.floor(xs + (xe - xs) * b / BINS), e = Math.max(a + 1, Math.floor(xs + (xe - xs) * (b + 1) / BINS));
      const R = [], G = [], B = [];
      for (let x = a; x < e; x++) for (let y = ys; y < ye; y += 1) {
        if (skip && skip[(y - y0) * w + (x - x0)]) continue;
        const p = px(img, x, y); if (p[3] < 128) continue;
        R.push(p[0]); G.push(p[1]); B.push(p[2]);
      }
      out.push(R.length ? toLab(median(R), median(G), median(B)) : [50, 0, 0]);
    }
    return out;
  }

  // Distance between an observed profile and a reference: dynamic time warping within a small band,
  // so stripes that are a little wider or narrower in one image source still line up. Ribbons are
  // symmetric, so the reversed profile is tried too (covers flipped or partly covered ribbons).
  function dtw(p, ref) {
    const n = p.length, band = 3, INF = 1e9;
    let prev = new Float64Array(n + 1).fill(INF), cur = new Float64Array(n + 1);
    prev[0] = 0;
    for (let i = 1; i <= n; i++) {
      cur.fill(INF);
      for (let j = Math.max(1, i - band); j <= Math.min(n, i + band); j++) {
        cur[j] = dE(p[i - 1], ref[j - 1]) + Math.min(prev[j], prev[j - 1], cur[j - 1]);
      }
      [prev, cur] = [cur, prev];
    }
    return prev[n] / n;
  }
  // Screenshots and photos are often washed out, so the observed colors are also tried with boosted saturation.
  const BOOSTS = [1, 1.4, 1.8];
  function distance(p, ref) {
    let best = Infinity;
    for (const k of BOOSTS) {
      const q = k === 1 ? p : p.map(([L, a, b]) => [L, a * k, b * k]);
      best = Math.min(best, dtw(q, ref), dtw(q.slice().reverse(), ref));
    }
    return best;
  }

  // ── Layout: rows and ribbons ───────────────────────
  function background(img) {
    const R = [], G = [], B = [], A = [];
    const add = (x, y) => { const p = px(img, x, y); R.push(p[0]); G.push(p[1]); B.push(p[2]); A.push(p[3]); };
    for (let x = 0; x < img.width; x += 2) { add(x, 0); add(x, img.height - 1); }
    for (let y = 0; y < img.height; y += 2) { add(0, y); add(img.width - 1, y); }
    return { rgb: [median(R), median(G), median(B)], alpha: median(A) };
  }
  // Background palette: colors that fill the image border, plus any plain color covering a large share of
  // the image (the white page around a rack in a screenshot, a uniform shirt).
  function backgroundPalette(img, tex) {
    const W = img.width, H = img.height, border = new Map(), plain = new Map();
    let nb = 0, np = 0;
    const key = (p) => (p[0] >> 4) << 8 | (p[1] >> 4) << 4 | (p[2] >> 4);
    const bump = (map, k, p) => { const e = map.get(k) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += p[0]; e.g += p[1]; e.b += p[2]; map.set(k, e); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = px(img, x, y); if (p[3] < 128) continue;
      // Only plain border pixels count: in a tight crop the border cuts through ribbons, and those are textured.
      if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) { nb++; if (!tex[y * W + x]) bump(border, key(p), p); }
      if (!tex[y * W + x]) { bump(plain, key(p), p); np++; }
    }
    const pal = [];
    for (const [k, e] of border) if (e.n > nb * 0.05) pal.push([e.r / e.n, e.g / e.n, e.b / e.n]);
    // A plain color filling a big share of the image is background too, unless the image is a tight crop
    // (little plain border), where big plain areas are more likely wide ribbon stripes.
    let plainBorder = 0; for (const e of border.values()) plainBorder += e.n;
    if (plainBorder > nb * 0.3) for (const [k, e] of plain) if (e.n > np * 0.1 && !border.has(k)) pal.push([e.r / e.n, e.g / e.n, e.b / e.n]);
    return pal;
  }

  // Ribbon pixels: either textured (ribbons are dense with vertical stripes, so color changes quickly
  // left to right) or a color that isn't part of the background palette.
  function foregroundMask(img, winOverride) {
    const W = img.width, H = img.height, m = new Uint8Array(W * H), tex = new Uint8Array(W * H);
    const win = winOverride || Math.max(4, Math.round(Math.min(W, H) / 40));
    const gx = new Float32Array(W);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = px(img, Math.max(0, x - 1), y), b = px(img, Math.min(W - 1, x + 1), y);
        gx[x] = a[3] < 128 || b[3] < 128 ? 0 : Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      }
      // Sliding-window mean of the horizontal gradient
      let sum = 0;
      for (let x = 0; x < Math.min(W, win * 2 + 1); x++) sum += gx[x];
      for (let x = 0; x < W; x++) {
        const lo = x - win - 1, hi = x + win;
        if (x > 0) { if (lo >= 0) sum -= gx[lo]; if (hi < W) sum += gx[hi]; }
        const n = Math.min(W - 1, x + win) - Math.max(0, x - win) + 1;
        if (sum / n > 18) tex[y * W + x] = 1;
      }
    }
    const pal = backgroundPalette(img, tex);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, p = px(img, x, y);
        if (p[3] < 128) continue;
        if (tex[i]) { m[i] = 1; continue; }
        let near = Infinity;
        for (const c of pal) near = Math.min(near, Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]));
        if (near > 60) m[i] = 1;
      }
      // Clean the row: drop short runs (page edges, text, noise), undo the window's smear at each end
      // of a run, then close short gaps left by wide plain stripes.
      const row = m.subarray(y * W, (y + 1) * W);
      for (let x = 0; x < W;) {
        if (!row[x]) { x++; continue; }
        let e = x; while (e < W && row[e]) e++;
        row.fill(0, x, e);
        if (e - x >= win * 5) row.fill(1, x + win, e - win);
        x = e;
      }
      let last = -1;
      for (let x = 0; x < W; x++) if (row[x]) { if (last >= 0 && x - last > 1 && x - last <= win * 2) row.fill(1, last + 1, x); last = x; }
    }
    return m;
  }
  function runs(values, thresh) {
    const out = []; let s = -1;
    values.forEach((v, i) => {
      if (v >= thresh && s < 0) s = i;
      if ((v < thresh || i === values.length - 1) && s >= 0) { out.push([s, v >= thresh ? i : i - 1]); s = -1; }
    });
    return out;
  }

  // Splits a band of stacked rows at the strongest horizontal color edges.
  function splitBand(img, mask, y0, y1, x0, x1) {
    const W = img.width, E = [];
    for (let y = y0; y < y1; y++) {
      let s = 0, n = 0;
      for (let x = x0; x <= x1; x += 2) {
        if (!mask[y * W + x] || !mask[(y + 1) * W + x]) continue;
        const a = px(img, x, y), b = px(img, x, y + 1);
        s += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); n++;
      }
      E.push(n ? s / n : 0);
    }
    const h = y1 - y0 + 1, base = E.reduce((a, b) => a + b, 0) / Math.max(1, E.length);
    const edgeAt = (y, tol) => { let m = 0; for (let d = -tol; d <= tol; d++) m = Math.max(m, E[y - y0 + d - 1] || 0); return m; };
    // Search row height and offset so the cut lines land on strong horizontal edges. Rows at either end
    // may be partial (a tight crop), so cuts don't have to start at the band edge.
    const cands = [];
    for (let rowH = 8; rowH <= h * 0.75; rowH++) {
      const tol = Math.max(1, Math.round(rowH / 25));
      for (let off = 0; off < rowH; off++) {
        const cuts = [];
        for (let c = y0 + off; c < y1; c += rowH) if (c - y0 > rowH * 0.3 && y1 - c > rowH * 0.3) cuts.push(c);
        if (!cuts.length) continue;
        const score = cuts.reduce((s, c) => s + edgeAt(c, tol), 0) / cuts.length;
        if (score > base * 2.2) cands.push({ rowH, cuts, score });
      }
    }
    if (!cands.length) return [[y0, y1]];
    const top = Math.max(...cands.map((c) => c.score));
    // Among strong candidates, prefer the one with the most cuts (a coarser grid also scores well).
    const best = cands.filter((c) => c.score >= top * 0.8).sort((a, b) => b.cuts.length - a.cuts.length || b.score - a.score)[0];
    const edges = [y0, ...best.cuts, y1 + 1];
    const rows = [];
    for (let i = 0; i < edges.length - 1; i++) rows.push([edges[i], edges[i + 1] - 1]);
    return rows;
  }

  // Two passes: a rough pass measures the ribbon height, then the texture window is sized to the ribbons
  // rather than the image, which matters when the rack is small inside a large screenshot.
  function findRibbons(img) {
    const first = findRibbonsWith(img);
    if (!first.length) return first;
    const hs = first.map((r) => r.h).sort((a, b) => a - b), h = hs[hs.length >> 1];
    const second = findRibbonsWith(img, Math.max(3, Math.round(h / 8)));
    return second.length >= first.length ? second : first;
  }
  function findRibbonsWith(img, win) {
    const W = img.width, H = img.height, mask = foregroundMask(img, win);
    const rowFill = [];
    for (let y = 0; y < H; y++) { let c = 0; for (let x = 0; x < W; x++) c += mask[y * W + x]; rowFill.push(c); }
    const bands = runs(rowFill, Math.max(4, W * 0.05));
    const rows = [];
    for (const [y0, y1] of bands) {
      if (y1 - y0 < 6) continue;
      // Horizontal extent of this band
      const colFill = [];
      for (let x = 0; x < W; x++) { let c = 0; for (let y = y0; y <= y1; y++) c += mask[y * W + x]; colFill.push(c); }
      const span = runs(colFill, (y1 - y0 + 1) * 0.5);
      if (!span.length) continue;
      const x0 = span[0][0], x1 = span[span.length - 1][1];
      for (const [ry0, ry1] of splitBand(img, mask, y0, y1, x0, x1)) {
        // Each row may be narrower than the band (a centered top row)
        const cf = [];
        for (let x = 0; x < W; x++) { let c = 0; for (let y = ry0; y <= ry1; y++) c += mask[y * W + x]; cf.push(c); }
        const sp = runs(cf, (ry1 - ry0 + 1) * 0.5);
        if (!sp.length) continue;
        const rx0 = sp[0][0], rx1 = sp[sp.length - 1][1];
        rows.push({ y: ry0, h: ry1 - ry0 + 1, x: rx0, w: rx1 - rx0 + 1 });
      }
    }
    const ribbons = [];
    // Typical ribbon aspect, measured from rows that aren't clipped by the image edge.
    const free = rows.filter((r) => r.x > 2 && r.x + r.w < W - 2);
    // A row cut off at the top or bottom of the image is shorter than the rest; size its ribbons by the typical height.
    const hs = rows.map((r) => r.h).sort((a, b) => a - b), typH = hs[hs.length >> 1] || 1;
    rows.forEach((r, ri) => {
      const rh = r.h < typH * 0.85 ? typH : r.h;
      const clipL = r.x <= 2, clipR = r.x + r.w >= W - 2;
      if (!clipL && !clipR) {
        const n = Math.max(1, Math.round(r.w / (rh * ASPECT)));
        for (let i = 0; i < n; i++) ribbons.push({ row: ri, col: i, x: r.x + Math.round(i * r.w / n), y: r.y, w: Math.round(r.w / n), h: r.h });
        return;
      }
      // Clipped row: lay ribbons out at the standard width from the uncut side (or the center).
      let rw = rh * ASPECT;
      if (free.length) { const f = free[0], n = Math.max(1, Math.round(f.w / (f.h * ASPECT))); rw = f.w / n * (rh / f.h); }
      const n = Math.max(1, Math.round(r.w / rw));
      const start = clipL && clipR ? r.x + (r.w - n * rw) / 2 : clipL ? r.x + r.w - n * rw : r.x;
      for (let i = 0; i < n; i++) {
        const x = Math.max(0, Math.round(start + i * rw)), e = Math.min(W, Math.round(start + (i + 1) * rw));
        if (e - x > rw * 0.5) ribbons.push({ row: ri, col: i, x, y: r.y, w: e - x, h: r.h, clipped: e - x < rw * 0.95 });
      }
    });
    return ribbons;
  }

  // ── Devices ────────────────────────────────────────
  // Bronze pixels that don't belong to the matched ribbon's own stripes, grouped into blobs.
  // allows: { olc, star } from the matched award's authorized devices; shape decides only when both are allowed.
  function devices(img, rb, ref, allows) {
    const { x: X, y: Y, w, h } = rb;
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = px(img, X + x, Y + y);
      const [hu, s, v] = hsv(p[0], p[1], p[2]);
      if (!(hu >= 12 && hu <= 42 && s >= 0.3 && v >= 0.3 && v <= 0.95)) continue;
      const bin = Math.min(BINS - 1, Math.floor(x / w * BINS));
      const lab = toLab(p[0], p[1], p[2]);
      if (ref) {
        let near = Infinity;
        for (let k = -2; k <= 2; k++) for (const bb of [bin + k, BINS - 1 - bin + k]) if (ref[bb]) near = Math.min(near, dE(lab, ref[bb]));
        if (near < 25) continue;
      }
      m[y * w + x] = 1;
    }
    // Connected components
    const seen = new Uint8Array(w * h), blobs = [];
    for (let i = 0; i < w * h; i++) {
      if (!m[i] || seen[i]) continue;
      const q = [i]; seen[i] = 1; let area = 0, minx = w, maxx = 0, miny = h, maxy = 0;
      while (q.length) {
        const j = q.pop(), x = j % w, y = (j / w) | 0; area++;
        minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
        for (const k of [j - 1, j + 1, j - w, j + w]) {
          if (k < 0 || k >= w * h || seen[k] || !m[k]) continue;
          if ((k === j - 1 && x === 0) || (k === j + 1 && x === w - 1)) continue;
          seen[k] = 1; q.push(k);
        }
      }
      if (area >= h * h * 0.07) blobs.push({ area, bw: maxx - minx + 1, bh: maxy - miny + 1 });
    }
    let olc = 0, stars = 0;
    allows = allows || { olc: true, star: true };
    for (const b of blobs) {
      const n = Math.max(1, Math.round(b.bw / (h * 0.62)));
      const leafShaped = b.bw / b.bh >= 1.25;
      if (allows.olc && (!allows.star || leafShaped)) olc += n;
      else if (allows.star) stars += Math.max(1, Math.round(b.bw / (h * 0.7)));
    }
    return { olc, stars };
  }

  // Pixels that look like a bronze device (not a gold or orange stripe, which runs the full height).
  function deviceMask(img, rb) {
    const { x: X, y: Y, w, h } = rb, m = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) {
      let n = 0; const col = [];
      for (let y = 0; y < h; y++) {
        const p = px(img, X + x, Y + y), [hu, s, v] = hsv(p[0], p[1], p[2]);
        const bronze = hu >= 12 && hu <= 42 && s >= 0.3 && v >= 0.3 && v <= 0.95;
        col.push(bronze); if (bronze) n++;
      }
      if (n > h * 0.8) continue;
      col.forEach((b, y) => { if (b) m[y * w + x] = 1; });
    }
    return m;
  }

  // ── Public API ─────────────────────────────────────
  // refs: [{ id, img }] of reference ribbon images. Returns reference profiles to reuse across scans.
  function buildRefs(refs) {
    return refs.map((r) => ({ id: r.id, allows: r.allows, prof: profile(r.img, 0, 0, r.img.width, r.img.height, false) }));
  }

  // refProfiles may carry allows: { olc, star } per award.
  function scan(img, refProfiles) {
    return findRibbons(img).map((rb) => {
      const p = profile(img, rb.x, rb.y, rb.w, rb.h, true, deviceMask(img, rb));
      const ranked = refProfiles.map((r) => ({ id: r.id, d: distance(p, r.prof) })).sort((a, b) => a.d - b.d);
      const top = ranked[0];
      const match = refProfiles.find((r) => r.id === top.id);
      const dev = devices(img, rb, match.prof, match.allows);
      // Confidence: how clearly the best match beats the runner-up. On test racks, wrong picks had a
      // runner-up within 10% of the best; right picks led by 28% or more.
      const ratio = ranked[1] ? ranked[1].d / Math.max(0.1, top.d) : 9;
      const confidence = ratio >= 1.4 ? 'high' : ratio >= 1.2 ? 'medium' : 'low';
      return Object.assign({}, rb, { id: top.id, d: top.d, confidence, candidates: ranked.slice(0, 6), all: ranked, olc: dev.olc, stars: dev.stars });
    });
  }

  const api = { scan, buildRefs, findRibbons, profile, distance, foregroundMask, devices };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RackScan = api;
})(typeof window !== 'undefined' ? window : this);
