/* Block 69 Pilates · QMODSIM UI. All math comes from window.QM (src/engines/qmodsim.js). */
(function () {
  'use strict';
  const QM = window.QM;
  const D = QM.DEFAULTS;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = JSON.parse(JSON.stringify(D)); // live LAB state, shared with V&V

  // ───────────── helpers ─────────────
  const $ = (s, el) => (el || document).querySelector(s);
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of kids) if (c != null) e.append(c);
    return e;
  }
  const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
  const pct = (v, d = 1) => fmt(v * 100, d) + '%';
  const peso = (v) => (v < 0 ? '−₱' : '₱') + Math.abs(Math.round(v)).toLocaleString('en-US');
  const sci = (v) => (v === 0 ? '0' : v.toExponential(2).replace('e', '×10^').replace('^+', '^').replace('^-', '^−'));
  function kpis(items) {
    return h('dl', { class: 'kpis' }, ...items.map((k) => h('div', { class: 'kpi' + (k.cls ? ' ' + k.cls : '') }, h('dt', { text: k.label }), h('dd', { id: k.id, text: k.value || '—' }))));
  }
  function setText(id, v, cls) { const e = document.getElementById(id); if (!e) return; e.textContent = v; if (cls !== undefined) e.parentElement.className = 'kpi' + (cls ? ' ' + cls : ''); }

  // ───────────── theme + canvas loop ─────────────
  function themeColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue(n).trim();
    return { bg: g('--surface'), sunk: g('--sunk'), ink: g('--ink'), muted: g('--muted'), line: g('--line'), grid: g('--grid'), accent: g('--accent'), sage: g('--sage'), ok: g('--ok'), warn: g('--warn'), bad: g('--bad'), mono: g('--mono'), body: g('--body') };
  }
  const renderers = new Set();
  function addCanvas(canvas, draw) { const r = { canvas, draw }; renderers.add(r); return r; }
  function clearCanvases(root) { for (const r of [...renderers]) if (!document.body.contains(r.canvas) || (root && root.contains(r.canvas))) renderers.delete(r); }
  function fit(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth, hh = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, hh);
    return { ctx, w, h: hh };
  }
  let lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    const C = themeColors(); // read on every frame so a theme switch repaints axes and strokes immediately
    for (const r of renderers) {
      if (!document.body.contains(r.canvas)) { renderers.delete(r); continue; }
      if (r.canvas.offsetParent === null) continue;
      const { ctx, w, h: hh } = fit(r.canvas);
      if (w < 10) continue;
      r.draw(ctx, w, hh, C, dt, now / 1000);
    }
    requestAnimationFrame(loop);
  }

  function niceTicks(a, b, n) {
    if (!(b > a)) b = a + 1;
    const step0 = (b - a) / (n || 5), mag = 10 ** Math.floor(Math.log10(step0)), f = step0 / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag; const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const tick = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k' : +v.toFixed(3) + '');
  function chart(ctx, w, hh, C, o) {
    const P = { l: o.yLabel ? 58 : 44, r: o.y2 ? (o.y2.label ? 56 : 44) : 14, t: o.legend ? 28 : 12, b: o.xLabel ? 38 : 24 };
    const iw = w - P.l - P.r, ih = hh - P.t - P.b;
    const X = (v) => P.l + ((v - o.x0) / (o.x1 - o.x0)) * iw;
    const Y = (v) => P.t + ih - ((v - o.y0) / (o.y1 - o.y0)) * ih;
    const Y2 = o.y2 ? (v) => P.t + ih - ((v - o.y2.y0) / (o.y2.y1 - o.y2.y0)) * ih : null;
    ctx.font = `11px ${C.mono}`; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const v of niceTicks(o.y0, o.y1, o.yTicks || 4)) {
      const y = Math.round(Y(v)) + 0.5; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(P.l + iw, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText((o.yFmt || tick)(v), P.l - 6, y);
    }
    if (o.y2) { ctx.textAlign = 'left'; for (const v of niceTicks(o.y2.y0, o.y2.y1, 4)) ctx.fillText((o.y2.fmt || tick)(v), P.l + iw + 6, Y2(v)); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (!o.noXTicks) for (const v of niceTicks(o.x0, o.x1, o.xTicks || 6)) {
      const x = Math.round(X(v)) + 0.5; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x, P.t); ctx.lineTo(x, P.t + ih); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText((o.xFmt || tick)(v), x, P.t + ih + 5);
    }
    ctx.strokeStyle = C.line; ctx.strokeRect(P.l + 0.5, P.t + 0.5, iw, ih);
    ctx.fillStyle = C.muted; ctx.font = `11.5px ${C.body}`;
    if (o.xLabel) ctx.fillText(o.xLabel, P.l + iw / 2, hh - 16);
    if (o.yLabel) { ctx.save(); ctx.translate(12, P.t + ih / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(o.yLabel, 0, 0); ctx.restore(); }
    if (o.y2 && o.y2.label) { ctx.save(); ctx.translate(w - 10, P.t + ih / 2); ctx.rotate(Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(o.y2.label, 0, 0); ctx.restore(); }
    if (o.legend) legend(ctx, C, o.legend, P.l, 12);
    return { X, Y, Y2, P, iw, ih };
  }
  function legend(ctx, C, items, x, y) {
    ctx.font = `11.5px ${C.body}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; let cx = x;
    for (const it of items) {
      if (it.box) { ctx.globalAlpha = 0.5; ctx.fillStyle = it.color; ctx.fillRect(cx, y - 5, 14, 10); ctx.globalAlpha = 1; }
      else { ctx.strokeStyle = it.color; ctx.lineWidth = 2; ctx.setLineDash(it.dash || []); ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 16, y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = C.muted; ctx.fillText(it.label, cx + 21, y); cx += 21 + ctx.measureText(it.label).width + 16;
    }
  }
  function line(ctx, pts, X, Y, color, width, dash) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 2; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke(); ctx.restore();
  }
  function area(ctx, pts, X, Y, y0, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.16 : alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(y0));
    pts.forEach(([x, y]) => ctx.lineTo(X(x), Y(y))); ctx.lineTo(X(pts[pts.length - 1][0]), Y(y0)); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function dot(ctx, x, y, r, color, ring) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    if (ring) { ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke(); }
  }
  function label(ctx, C, text, x, y, align, color, size) {
    ctx.font = `${size || 11}px ${C.mono}`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = color || C.muted; ctx.fillText(text, x, y);
  }
  function rgba(hex, a) {
    const m = hex.replace('#', ''); const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function relColor(C, r) { return r >= 0.95 ? C.ok : r >= 0.8 ? C.warn : C.bad; }

  // ───────────── sliders ─────────────
  function slider(def, obj, onChange) {
    const id = 'ctl-' + def.id;
    const get = () => (def.get ? def.get(obj) : obj[def.key]);
    const out = h('output', { for: id });
    const inp = h('input', { type: 'range', id, min: def.min, max: def.max, step: def.step, value: get() });
    const show = () => { out.textContent = (def.fmt || ((v) => fmt(v, 2)))(get()) + (def.unit ? ' ' + def.unit : ''); };
    inp.addEventListener('input', () => {
      const v = QM.clamp(parseFloat(inp.value), def.min, def.max);
      if (def.set) def.set(obj, v); else obj[def.key] = v;
      show(); onChange(def);
    });
    show();
    const wrap = h('div', { class: 'ctl' },
      h('label', { for: id }, h('span', { text: def.label }), h('span', { class: 'sym', text: def.sym || '' })),
      h('div', { class: 'ctl-row' }, inp, out));
    wrap.sync = () => { inp.value = get(); show(); };
    return wrap;
  }
  function seg(options, current, onPick) {
    const el = h('div', { class: 'seg', role: 'group' });
    options.forEach(([v, lab]) => el.append(h('button', { type: 'button', 'aria-pressed': String(v === current()), text: lab, onclick: () => { onPick(v); [...el.children].forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === current()))); } })));
    return el;
  }

  // ═════════════════════════ LAB MODULES ═════════════════════════
  const MODULES = [];

  // ── Mod 1 · 3 NHPP ──
  MODULES.push({
    id: 'nhpp', code: 'Mod 1 · 3', title: 'NHPP flash-crowd arrivals',
    blurb: 'Booking attempts around the Sunday 8:00 PM weekly slot drop. A Gaussian surge sits on top of background refreshes; arrivals are drawn by Lewis–Shedler thinning, and the inter-arrival gaps are exponential.',
    controls: [
      { id: 'lb', key: 'lambdaBase', label: 'Background refreshes before the drop', sym: 'λ_base', min: 0, max: 5, step: 0.1, unit: '/min', fmt: (v) => fmt(v, 1) },
      { id: 'A', key: 'A', label: 'Sunday 8:00 PM surge height', sym: 'A', min: 0, max: 40, step: 0.5, unit: '/min', fmt: (v) => fmt(v, 1) },
      { id: 'tp', key: 'tPeak', label: 'Surge peak, minutes after the drop', sym: 't_peak', min: -5, max: 15, step: 0.5, unit: 'min', fmt: (v) => fmt(v, 1) },
      { id: 'sg', key: 'sigma', label: 'Surge spread', sym: 'σ', min: 0.5, max: 15, step: 0.5, unit: 'min', fmt: (v) => fmt(v, 1) },
    ],
    state: () => S.nhpp,
    seed: 1,
    mount(body) {
      const p = S.nhpp; const self = this;
      const c1 = h('canvas', { style: '--h:300px', 'aria-label': 'Arrival intensity and simulated arrivals per minute' });
      const c2 = h('canvas', { style: '--h:220px', 'aria-label': 'Inter-arrival histogram against exponential density' });
      body.append(
        kpis([
          { id: 'n-L', label: 'Expected attempts Λ = ∫λ(t)dt' }, { id: 'n-sim', label: 'Simulated attempts (this draw)' },
          { id: 'n-peak', label: 'Peak intensity λ(t_peak)' }, { id: 'n-share', label: 'Share of attempts within t_peak ± σ' },
          { id: 'n-ia', label: 'Mean gap at peak vs 1/λ' },
        ]),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'λ(t) and simulated attempts per minute' }), h('button', { class: 'btn', type: 'button', text: 'Draw new arrivals', onclick: () => { self.seed++; self.update(); } })), c1),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Inter-arrival gaps at the peak rate' }), h('span', { class: 'muted', style: 'font-size:12.5px', text: 'Histogram of 4,000 gaps vs f(t) = λ · e^(−λt)' })), c2),
      );
      let sweep = 0;
      addCanvas(c1, (ctx, w, hh, C, dt) => {
        const m = self.m; if (!m) return;
        const ymax = Math.max(m.lamMax, ...m.bins) * 1.15;
        const g = chart(ctx, w, hh, C, { x0: p.T0, x1: p.T1, y0: 0, y1: ymax, xLabel: 'minutes after the 8:00 PM slot drop', yLabel: 'attempts / min', legend: [{ label: 'λ(t) intensity', color: C.accent }, { label: 'simulated per minute', color: C.sage, box: true }] });
        ctx.fillStyle = rgba(C.sage, 0.45);
        m.bins.forEach((b, i) => { const x0 = g.X(p.T0 + i), x1 = g.X(p.T0 + i + 1); ctx.fillRect(x0 + 1, g.Y(b), x1 - x0 - 2, g.Y(0) - g.Y(b)); });
        area(ctx, m.curve, g.X, g.Y, 0, C.accent, 0.1); line(ctx, m.curve, g.X, g.Y, C.accent, 2.2);
        if (!RM) {
          sweep = (sweep + dt * 5) % (p.T1 - p.T0); const t = p.T0 + sweep, lam = QM.nhppRate(t, p);
          ctx.strokeStyle = C.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(g.X(t), g.P.t); ctx.lineTo(g.X(t), g.Y(0)); ctx.stroke(); ctx.setLineDash([]);
          dot(ctx, g.X(t), g.Y(lam), 4, C.accent, C.bg);
          label(ctx, C, `t = ${t >= 0 ? '+' : ''}${t.toFixed(1)} min · λ = ${lam.toFixed(2)}/min`, Math.min(g.X(t) + 8, w - 220), g.P.t + 12, 'left', C.ink);
        }
      });
      addCanvas(c2, (ctx, w, hh, C) => {
        const m = self.m; if (!m) return;
        const g = chart(ctx, w, hh, C, { x0: 0, x1: m.iaMax, y0: 0, y1: m.lamMax * 1.15, xLabel: 'gap between attempts (min)', yLabel: 'density', xFmt: (v) => +v.toFixed(2) + '' });
        const bw = m.iaMax / m.iaBins.length; ctx.fillStyle = rgba(C.sage, 0.45);
        m.iaBins.forEach((d, i) => { const x0 = g.X(i * bw), x1 = g.X((i + 1) * bw); ctx.fillRect(x0 + 1, g.Y(d), x1 - x0 - 2, g.Y(0) - g.Y(d)); });
        const pts = []; for (let i = 0; i <= 80; i++) { const t = (i / 80) * m.iaMax; pts.push([t, m.lamMax * Math.exp(-m.lamMax * t)]); }
        line(ctx, pts, g.X, g.Y, C.accent, 2.2);
      });
    },
    update() {
      const p = S.nhpp; const rng = QM.mulberry32(1000 + this.seed);
      const arrivals = QM.nhppSimulate(p, p.T0, p.T1, rng);
      const bins = QM.binCounts(arrivals, p.T0, p.T1, 1);
      const curve = []; for (let t = p.T0; t <= p.T1; t += 0.2) curve.push([t, QM.nhppRate(t, p)]);
      const L = QM.nhppExpected(p, p.T0, p.T1);
      const lamMax = Math.max(p.lambdaBase + p.A, 0.05);
      const ia = QM.homogeneousInterArrivals(lamMax, 4000, QM.mulberry32(77 + this.seed));
      const iaMax = 4 / lamMax, nb = 30, iaBins = new Array(nb).fill(0);
      let iaSum = 0; ia.forEach((x) => { iaSum += x; const i = Math.floor((x / iaMax) * nb); if (i < nb) iaBins[i]++; });
      for (let i = 0; i < nb; i++) iaBins[i] = iaBins[i] / (ia.length * (iaMax / nb));
      this.m = { arrivals, bins, curve, L, lamMax, iaBins, iaMax };
      setText('n-L', fmt(L, 1));
      setText('n-sim', String(arrivals.length));
      setText('n-peak', fmt(QM.nhppRate(p.tPeak, p), 2) + ' /min');
      setText('n-share', L > 0 ? pct(QM.nhppExpected(p, p.tPeak - p.sigma, p.tPeak + p.sigma) / L) : '—');
      setText('n-ia', `${fmt(iaSum / ia.length, 3)} / ${fmt(1 / lamMax, 3)}`);
    },
  });

  // ── Mod 6 · M/M/c/K ──
  MODULES.push({
    id: 'queue', code: 'Mod 6', title: 'M/M/c/K checkout-lock queue',
    blurb: 'Each attempt that reaches checkout takes a bed lock. c locks are processed at once (one per reformer bed); up to K sessions may hold or wait for a lock. When K is full, the attempt sees "Slots busy, try again": P_drop = P_K.',
    controls: [
      { id: 'ql', key: 'lambda', label: 'Booking attempts at the drop', sym: 'λ', min: 0.2, max: 30, step: 0.1, unit: '/min', fmt: (v) => fmt(v, 1) },
      { id: 'qh', label: 'Checkout lock hold time', sym: '1/μ', min: 0.25, max: 5, step: 0.05, unit: 'min', get: (o) => 1 / o.mu, set: (o, v) => { o.mu = 1 / v; }, fmt: (v) => fmt(v, 2) },
      { id: 'qc', key: 'c', label: 'Reformer beds checking out at once', sym: 'c', min: 1, max: 8, step: 1, fmt: (v) => String(Math.round(v)) },
      { id: 'qk', key: 'K', label: 'Session cap: holding + waiting', sym: 'K', min: 1, max: 40, step: 1, fmt: (v) => String(Math.max(Math.round(v), Math.round(S.queue.c))) },
    ],
    state: () => S.queue,
    speed: 1,
    mount(body) {
      const self = this;
      const c1 = h('canvas', { style: '--h:270px', 'aria-label': 'Animated reformer bed checkout locks' });
      const c2 = h('canvas', { style: '--h:230px', 'aria-label': 'Stationary distribution of sessions' });
      const c3 = h('canvas', { style: '--h:230px', 'aria-label': 'Drop probability against arrival rate' });
      body.append(
        kpis([
          { id: 'q-rho', label: 'Offered load ρ = λ / (c · μ)' }, { id: 'q-pk', label: 'P_drop = P_K' },
          { id: 'q-W', label: 'Lock hold latency W (wait + hold)' }, { id: 'q-Wq', label: 'Wait for a free bed lock W_q' },
          { id: 'q-L', label: 'Sessions in system L' }, { id: 'q-le', label: 'Accepted rate λ_eff' },
          { id: 'q-u', label: 'Bed-lock utilisation' }, { id: 'q-p0', label: 'All beds idle P₀' },
        ]),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Live checkout floor' }),
          seg([[0.5, '×0.5'], [1, '×1'], [3, '×3']], () => self.speed, (v) => { self.speed = v; })), c1),
        h('div', { class: 'two' },
          h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Pₙ: sessions holding or waiting' })), c2),
          h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'P_drop as attempts rise' })), c3)),
      );
      addCanvas(c1, (ctx, w, hh, C, dt) => self.drawFloor(ctx, w, hh, C, dt));
      addCanvas(c2, (ctx, w, hh, C) => {
        const q = self.q; if (!q) return; const K = q.K;
        const g = chart(ctx, w, hh, C, { x0: -0.5, x1: K + 0.5, y0: 0, y1: Math.max(...q.P) * 1.15, xLabel: 'n sessions', yFmt: (v) => +v.toFixed(2) + '', xTicks: Math.min(K, 10), noXTicks: false });
        const bw = (g.X(1) - g.X(0)) * 0.7;
        q.P.forEach((v, n) => { ctx.fillStyle = n === K ? C.bad : n < q.c ? C.sage : C.accent; ctx.fillRect(g.X(n) - bw / 2, g.Y(v), bw, g.Y(0) - g.Y(v)); });
        label(ctx, C, `P_K = ${q.PK.toFixed(3)}`, g.X(K) - bw, g.Y(q.PK) - 10, 'right', C.bad);
      });
      addCanvas(c3, (ctx, w, hh, C) => {
        const p = S.queue; const K = Math.max(p.c, Math.round(p.K)), c = Math.round(p.c);
        const mk = (KK) => { const pts = []; for (let l = 0.2; l <= 30; l += 0.4) pts.push([l, QM.mmck({ ...p, lambda: l, K: KK }).PK]); return pts; };
        const g = chart(ctx, w, hh, C, { x0: 0, x1: 30, y0: 0, y1: 1, xLabel: 'λ attempts / min', yFmt: (v) => Math.round(v * 100) + '%', legend: [{ label: `K = ${K}`, color: C.accent }, { label: `K = c = ${c}`, color: C.muted, dash: [4, 3] }, { label: `K = ${2 * K}`, color: C.sage, dash: [6, 3] }] });
        line(ctx, mk(c), g.X, g.Y, C.muted, 1.5, [4, 3]); line(ctx, mk(2 * K), g.X, g.Y, C.sage, 1.5, [6, 3]); line(ctx, mk(K), g.X, g.Y, C.accent, 2.4);
        dot(ctx, g.X(p.lambda), g.Y(self.q.PK), 5, C.accent, C.bg);
      });
    },
    resetSim() {
      const p = S.queue; const c = Math.round(p.c), K = Math.max(c, Math.round(p.K));
      this.sim = { t: 0, rng: QM.mulberry32(9), next: 0, beds: new Array(c).fill(null), wait: [], drops: [], flashes: [], arrivals: 0, blocked: 0, c, K };
      this.sim.next = QM.expSample(p.lambda, this.sim.rng);
    },
    drawFloor(ctx, w, hh, C, dt) {
      const p = S.queue, sim = this.sim; if (!sim) return;
      const adv = RM ? 0 : dt * this.speed; const tEnd = sim.t + adv;
      // event-driven advance to tEnd
      for (;;) {
        let ib = -1, tb = Infinity; sim.beds.forEach((b, i) => { if (b && b.dep < tb) { tb = b.dep; ib = i; } });
        const tn = Math.min(sim.next, tb); if (tn > tEnd) break;
        sim.t = tn;
        if (sim.next <= tb) {
          sim.arrivals++;
          const inSys = sim.beds.filter(Boolean).length + sim.wait.length;
          if (inSys >= sim.K) { sim.blocked++; sim.drops.push({ age: 0 }); }
          else { const free = sim.beds.indexOf(null); if (free >= 0) sim.beds[free] = { start: tn, dep: tn + QM.expSample(p.mu, sim.rng) }; else sim.wait.push(tn); }
          sim.next = tn + QM.expSample(p.lambda, sim.rng);
        } else {
          sim.flashes.push({ i: ib, age: 0 }); sim.beds[ib] = null;
          if (sim.wait.length) { sim.wait.shift(); sim.beds[ib] = { start: tn, dep: tn + QM.expSample(p.mu, sim.rng) }; }
        }
      }
      sim.t = tEnd;
      // layout
      const pad = 14, laneW = Math.min(260, w * 0.32), bedsX = pad + laneW + 40, bedsW = w - bedsX - pad;
      ctx.font = `11.5px ${C.body}`; ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`Waiting for a bed lock (${sim.wait.length}/${sim.K - sim.c})`, pad, pad);
      ctx.fillText('Reformer beds · checkout locks', bedsX, pad);
      // waiting lane
      const slots = sim.K - sim.c, cols = Math.max(1, Math.min(10, slots)), sz = Math.min(20, (laneW - (cols - 1) * 4) / cols);
      for (let j = 0; j < slots; j++) {
        const x = pad + (j % cols) * (sz + 4), y = pad + 22 + Math.floor(j / cols) * (sz + 4);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, sz, sz);
        if (j < sim.wait.length) { ctx.fillStyle = C.accent; ctx.fillRect(x + 3, y + 3, sz - 5, sz - 5); }
      }
      if (slots === 0) label(ctx, C, 'K = c: no waiting room', pad, pad + 32);
      // beds
      const bc = sim.c > 4 ? 2 : 1, rows = Math.ceil(sim.c / bc), gap = 10;
      const bw = (bedsW - (bc - 1) * gap) / bc, bh = Math.min(42, (hh - pad - 30 - 46 - (rows - 1) * gap) / rows);
      sim.beds.forEach((b, i) => {
        const x = bedsX + (i % bc) * (bw + gap), y = pad + 22 + Math.floor(i / bc) * (bh + gap);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, bw, bh, 6); ctx.stroke();
        // reformer frame: footbar, rails, carriage
        ctx.fillStyle = C.sunk; ctx.fillRect(x + 8, y + bh / 2 - 2, bw - 16, 4);
        ctx.fillStyle = C.muted; ctx.fillRect(x + bw - 16, y + 6, 4, bh - 12);
        const fl = sim.flashes.find((f) => f.i === i);
        if (b) {
          const held = sim.t - b.start, frac = Math.min(1, held * p.mu / 2);
          ctx.fillStyle = C.accent; ctx.beginPath(); ctx.roundRect(x + 10 + frac * (bw * 0.35), y + 7, bw * 0.4, bh - 14, 4); ctx.fill();
          label(ctx, C, `locked ${held.toFixed(2)} min`, x + 14 + frac * (bw * 0.35), y + bh / 2, 'left', C.bg);
        } else {
          ctx.strokeStyle = fl ? C.ok : C.line; ctx.setLineDash([3, 3]); ctx.strokeRect(x + 10.5, y + 7.5, bw * 0.4, bh - 14); ctx.setLineDash([]);
          label(ctx, C, fl ? 'booked ✓' : `bed ${i + 1} free`, x + 16, y + bh / 2, 'left', fl ? C.ok : C.muted);
        }
      });
      sim.flashes = sim.flashes.filter((f) => (f.age += dt) < 0.6);
      // drops
      const dy = hh - 36;
      sim.drops = sim.drops.filter((d) => (d.age += dt) < 1.2);
      sim.drops.forEach((d) => { ctx.globalAlpha = 1 - d.age / 1.2; dot(ctx, pad + 30 + d.age * 180, dy - Math.sin(d.age * 3) * 10, 4, C.bad); ctx.globalAlpha = 1; });
      const sp = sim.arrivals ? sim.blocked / sim.arrivals : 0;
      label(ctx, C, `"Slots busy, try again": ${sim.blocked} of ${sim.arrivals} attempts · simulated P_drop ${sp.toFixed(3)} · closed form ${this.q.PK.toFixed(3)}`, pad, hh - 12, 'left', C.ink);
      label(ctx, C, `t = ${sim.t.toFixed(1)} sim-min`, w - pad, hh - 12, 'right');
    },
    update() {
      const p = S.queue; if (p.K < p.c) p.K = p.c;
      const q = QM.mmck(p); this.q = q;
      setText('q-rho', fmt(q.rho, 2), q.rho > 1 ? 'alert' : '');
      setText('q-pk', pct(q.PK), q.PK > 0.2 ? 'alert' : q.PK < 0.02 ? 'good' : '');
      setText('q-W', fmt(q.W, 2) + ' min'); setText('q-Wq', fmt(q.Wq, 2) + ' min');
      setText('q-L', fmt(q.L, 2)); setText('q-le', fmt(q.lambdaEff, 2) + ' /min');
      setText('q-u', pct(q.utilization)); setText('q-p0', fmt(q.P0, 4));
      this.resetSim();
    },
  });

  // ── Mod 5 · DTMC ──
  const SHORT = ['S0 Selecting', 'S1 Bed Locked', 'S2 Paid', 'S3 Attended', 'S4 Expired', 'S5 No-Show'];
  MODULES.push({
    id: 'dtmc', code: 'Mod 5', title: '6-state reservation DTMC',
    blurb: 'A reservation moves Selecting → Bed Locked → Paid and is absorbed as Attended, Expired, or No-Show. The canonical form P = [Q R; 0 I] gives N = (I − Q)⁻¹, absorption B = N · R, and mean steps t = N · 1.',
    controls: [
      { id: 'd1', key: 'pLock', label: 'Selecting → takes a bed lock', sym: 'P₀₁', min: 0, max: 0.9, step: 0.01 },
      { id: 'd2', key: 'pAbandon', label: 'Selecting → leaves (expired)', sym: 'P₀₄', min: 0, max: 0.5, step: 0.01 },
      { id: 'd3', key: 'pBack', label: 'Bed Locked → back to selecting', sym: 'P₁₀', min: 0, max: 0.4, step: 0.01 },
      { id: 'd4', key: 'pPay', label: 'Bed Locked → payment confirmed', sym: 'P₁₂', min: 0, max: 0.95, step: 0.01 },
      { id: 'd5', key: 'pTimeout', label: 'Bed Locked → lock TTL expires', sym: 'P₁₄', min: 0, max: 0.6, step: 0.01 },
      { id: 'd6', key: 'pAttend', label: 'Paid → attends class', sym: 'P₂₃', min: 0, max: 0.95, step: 0.01 },
      { id: 'd7', key: 'pCancel', label: 'Paid → late cancel (expired)', sym: 'P₂₄', min: 0, max: 0.3, step: 0.01 },
      { id: 'd8', key: 'pNoShow', label: 'Paid → no-show', sym: 'P₂₅', min: 0, max: 0.4, step: 0.01 },
    ],
    state: () => S.dtmc,
    mount(body) {
      const self = this;
      const c1 = h('canvas', { style: '--h:330px', 'aria-label': 'Animated reservation state graph' });
      const c2 = h('canvas', { style: '--h:210px', 'aria-label': 'Absorption probabilities analytic versus simulated' });
      this.tbl = h('div', { class: 'scroll-x' });
      this.nb = h('div', { class: 'scroll-x' });
      body.append(
        kpis([
          { id: 'd-att', label: 'Attended B(S0, S3)' }, { id: 'd-exp', label: 'Expired B(S0, S4)' },
          { id: 'd-ns', label: 'No-Show B(S0, S5)' }, { id: 'd-t', label: 'Mean steps to absorption t₀' },
          { id: 'd-conv', label: 'Paid → Attended conversion' },
        ]),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Reservation tokens moving through the chain' }), h('span', { class: 'muted', style: 'font-size:12.5px', text: 'one hop per tick · 40 live reservations' })), c1),
        h('div', { class: 'two' },
          h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Transition matrix P' })), this.tbl),
          h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'N = (I − Q)⁻¹ and B = N · R' })), this.nb)),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Absorption from S0: closed form vs token simulation' })), c2),
      );
      addCanvas(c1, (ctx, w, hh, C, dt) => self.drawGraph(ctx, w, hh, C, dt));
      addCanvas(c2, (ctx, w, hh, C) => {
        const B = self.a.B[0], tot = self.absorbed.reduce((s, v) => s + v, 0) || 1;
        const ready = tot >= 50; const emp = ready ? [self.absorbed[3] / tot, self.absorbed[4] / tot, self.absorbed[5] / tot] : [0, 0, 0];
        const g = chart(ctx, w, hh, C, { x0: 0, x1: 3, y0: 0, y1: 1, noXTicks: true, yFmt: (v) => Math.round(v * 100) + '%', legend: [{ label: 'B = N · R', color: C.accent, box: true }, { label: ready ? `simulated (${tot} absorbed)` : 'simulated (collecting 50 tokens…)', color: C.sage, box: true }] });
        ['Attended', 'Expired', 'No-Show'].forEach((name, i) => {
          const cx = g.X(i + 0.5), bw = (g.X(1) - g.X(0)) * 0.28;
          ctx.fillStyle = C.accent; ctx.fillRect(cx - bw - 2, g.Y(B[i]), bw, g.Y(0) - g.Y(B[i]));
          ctx.fillStyle = C.sage; ctx.fillRect(cx + 2, g.Y(emp[i]), bw, g.Y(0) - g.Y(emp[i]));
          label(ctx, C, name, cx, g.Y(0) + 12, 'center', C.ink);
          label(ctx, C, pct(B[i]), cx - bw / 2 - 2, g.Y(B[i]) - 8, 'center', C.ink);
        });
      });
    },
    drawGraph(ctx, w, hh, C, dt) {
      const P = this.P; if (!P) return;
      const pos = [[0.1, 0.3], [0.42, 0.3], [0.74, 0.3], [0.92, 0.8], [0.42, 0.8], [0.7, 0.8]].map(([x, y]) => [x * w, y * hh]);
      const R = Math.min(30, w / 22);
      const col = [C.accent, C.accent, C.accent, C.ok, C.warn, C.bad];
      const edge = (i, j, bend) => {
        const [x1, y1] = pos[i], [x2, y2] = pos[j]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        const nx = -dy / L, ny = dx / L; const mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
        const sx = x1 + (dx / L) * R, sy = y1 + (dy / L) * R, ex = x2 - (dx / L) * (R + 3), ey = y2 - (dy / L) * (R + 3);
        ctx.strokeStyle = C.muted; ctx.lineWidth = 1 + P[i][j] * 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        const ang = Math.atan2(ey - my, ex - mx); ctx.fillStyle = C.muted; ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 9 * Math.cos(ang - 0.4), ey - 9 * Math.sin(ang - 0.4)); ctx.lineTo(ex - 9 * Math.cos(ang + 0.4), ey - 9 * Math.sin(ang + 0.4)); ctx.fill();
        const lx = 0.25 * x1 + 0.5 * mx + 0.25 * x2, ly = 0.25 * y1 + 0.5 * my + 0.25 * y2;
        ctx.fillStyle = C.bg; ctx.fillRect(lx - 17, ly - 8, 34, 16); label(ctx, C, P[i][j].toFixed(2), lx, ly, 'center', C.ink);
      };
      for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) if (i !== j && P[i][j] > 1e-9) edge(i, j, (i === 0 && j === 1) ? -14 : (i === 1 && j === 0) ? -14 : 0);
      for (let i = 0; i < 6; i++) {
        const [x, y] = pos[i];
        if (i < 3 && P[i][i] > 1e-9) { ctx.strokeStyle = C.muted; ctx.lineWidth = 1 + P[i][i] * 3; ctx.beginPath(); ctx.arc(x, y - R - 12, 12, 0.7, Math.PI * 2 + 0.3); ctx.stroke(); label(ctx, C, P[i][i].toFixed(2), x + 16, y - R - 22, 'left', C.ink); }
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = i >= 3 ? 3 : 2; ctx.strokeStyle = col[i]; ctx.stroke();
        if (i >= 3) { ctx.beginPath(); ctx.arc(x, y, R - 5, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.stroke(); }
        label(ctx, C, 'S' + i, x, y - 4, 'center', C.ink, 13);
        label(ctx, C, i >= 3 ? String(this.absorbed[i]) : '', x, y + 10, 'center', col[i]);
        label(ctx, C, SHORT[i].slice(3), x, y + R + 12, 'center', C.muted);
      }
      // token animation
      const tickLen = 0.55; if (!RM) this.clock += dt;
      if (this.clock >= tickLen) {
        this.clock = 0;
        this.tokens.forEach((tk) => {
          tk.from = tk.s; let u = this.rng(), j = 0; while (j < 5 && u > P[tk.s][j]) { u -= P[tk.s][j]; j++; } tk.s = j;
          if (tk.s >= 3) { this.absorbed[tk.s]++; tk.dead = true; }
        });
        this.tokens = this.tokens.filter((t) => !t.dead || (t.fade = (t.fade || 0)) < 1);
        while (this.tokens.filter((t) => !t.dead).length < 40) this.tokens.push({ s: 0, from: 0, jit: this.rng() });
      }
      const f = Math.min(1, this.clock / (tickLen * 0.7));
      this.tokens.forEach((tk) => {
        const [x1, y1] = pos[tk.from], [x2, y2] = pos[tk.s]; const a = tk.jit * Math.PI * 2, r = R * 0.55;
        let x = x1 + (x2 - x1) * f + Math.cos(a) * r * 0.6, y = y1 + (y2 - y1) * f + Math.sin(a) * r * 0.6;
        if (tk.from === tk.s && tk.s < 3) y -= Math.sin(f * Math.PI) * (R + 14);
        if (tk.dead) { tk.fade = (tk.fade || 0) + dt * 1.5; ctx.globalAlpha = Math.max(0, 1 - tk.fade); }
        dot(ctx, x, y, 3, tk.dead ? col[tk.s] : C.ink); ctx.globalAlpha = 1;
      });
      this.tokens = this.tokens.filter((t) => !t.dead || t.fade < 1);
    },
    update() {
      const P = QM.buildReservationChain(S.dtmc); this.P = P;
      try { this.a = QM.absorbingAnalysis(P, 3); } catch (e) { this.a = null; }
      this.rng = QM.mulberry32(21); this.tokens = []; this.absorbed = [0, 0, 0, 0, 0, 0]; this.clock = 0;
      const a = this.a; if (!a) return;
      setText('d-att', pct(a.B[0][0]), a.B[0][0] > 0.6 ? 'good' : ''); setText('d-exp', pct(a.B[0][1]), a.B[0][1] > 0.4 ? 'alert' : '');
      setText('d-ns', pct(a.B[0][2])); setText('d-t', fmt(a.t[0], 2) + ' steps'); setText('d-conv', pct(a.B[2][0]));
      const mt = (rows, rh, ch, opts) => {
        const t = h('table', { class: 'mat' }); const hr = h('tr', {}, h('th', { text: '' }), ...ch.map((c) => h('th', { text: c })));
        if (opts && opts.sum) hr.append(h('th', { text: 'Σ' })); t.append(hr);
        rows.forEach((r, i) => {
          const tr = h('tr', {}, h('th', { text: rh[i] }), ...r.map((v) => h('td', { class: Math.abs(v) < 1e-12 ? 'zero' : (opts && opts.hi && v === Math.max(...r) ? 'hi' : ''), text: v.toFixed(3) })));
          if (opts && opts.sum) tr.append(h('td', { text: r.reduce((s, v) => s + v, 0).toFixed(4) })); t.append(tr);
        });
        return t;
      };
      this.tbl.replaceChildren(mt(P, ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'], ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'], { sum: true }));
      this.nb.replaceChildren(
        h('div', { class: 'eyebrow', text: 'N: expected visits before absorption' }), mt(a.N, ['S0', 'S1', 'S2'], ['S0', 'S1', 'S2']),
        h('div', { class: 'eyebrow', style: 'margin-top:8px', text: 'B: absorption probabilities' }), mt(a.B, ['S0', 'S1', 'S2'], ['Attended', 'Expired', 'No-Show'], { hi: true }),
        h('div', { class: 'mono muted', style: 'margin-top:8px;font-size:12.5px', text: 't = N · 1 = [' + a.t.map((v) => v.toFixed(2)).join(', ') + ']' }));
    },
  });

  // ── Mod 7 · Game ──
  MODULES.push({
    id: 'game', code: 'Mod 7', title: 'Anti-scalping normal-form game',
    blurb: 'Defender picks Rate Limit + CAPTCHA or Deposit + SMS OTP; the attacker picks Sniping (resell beds) or Lock & Abandon DoS (hold beds until their TTL). Payoffs in pesos per slot drop. No pure equilibrium exists at the defaults, so both sides randomise.',
    controls: [
      { id: 'gV', key: 'V', label: 'Scalper resale margin per bed', sym: 'G', min: 0, max: 2000, step: 10, fmt: peso },
      { id: 'gh', key: 'h', label: 'Value of a lock-hold DoS run to attacker', sym: 'H', min: 0, max: 1500, step: 10, fmt: peso },
      { id: 'gr', key: 'r', label: 'Rate limit + CAPTCHA block rate', sym: 'r', min: 0, max: 1, step: 0.01, fmt: (v) => pct(v, 0) },
      { id: 'gc', key: 'cCap', label: 'CAPTCHA-solving cost per attempt', sym: 'c_cap', min: 0, max: 200, step: 5, fmt: peso },
      { id: 'gs', key: 'sOtp', label: 'SIM / OTP farm cost per account', sym: 'c_otp', min: 0, max: 500, step: 5, fmt: peso },
      { id: 'gD', key: 'D', label: 'Deposit forfeited on abandon', sym: 'F', min: 0, max: 1500, step: 10, fmt: peso },
      { id: 'gg', key: 'goodwill', label: 'Member goodwill lost per sniped bed', sym: 'g', min: 0, max: 1500, step: 10, fmt: peso },
      { id: 'gp', key: 'price', label: 'Class price per reformer bed', sym: 'p_bed', min: 300, max: 2000, step: 10, fmt: peso },
      { id: 'g1', key: 'f1', label: 'Member friction: CAPTCHA', sym: 'f₁', min: 0, max: 500, step: 5, fmt: peso },
      { id: 'g2', key: 'f2', label: 'Member friction: deposit + OTP', sym: 'f₂', min: 0, max: 500, step: 5, fmt: peso },
    ],
    state: () => S.game,
    mount(body) {
      const self = this;
      this.tbl = h('div', {});
      const c1 = h('canvas', { style: '--h:340px', 'aria-label': 'Best-response curves and fictitious play path' });
      body.append(
        kpis([{ id: 'g-p', label: 'p*: P(Rate Limit + CAPTCHA)' }, { id: 'g-q', label: 'q*: P(attacker snipes)' }, { id: 'g-ud', label: 'Defender value per drop' }, { id: 'g-ua', label: 'Attacker value per drop' }]),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Payoff matrix (U_defender, U_attacker)' }), h('span', { class: 'muted', style: 'font-size:12.5px', text: 'BR = best response · outlined cell = pure equilibrium' })), this.tbl),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Best responses and fictitious play' }), h('button', { class: 'btn', type: 'button', text: 'Replay learning path', onclick: () => { self.fpStep = 0; } })), c1),
      );
      addCanvas(c1, (ctx, w, hh, C, dt) => {
        const sol = self.sol, pay = self.pay; if (!sol) return;
        const g = chart(ctx, w, hh, C, { x0: 0, x1: 1, y0: 0, y1: 1, xLabel: 'q = P(attacker snipes)', yLabel: 'p = P(defender plays rate limit + CAPTCHA)', xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1), legend: [{ label: 'defender BR', color: C.accent }, { label: 'attacker BR', color: C.sage }, { label: 'fictitious play', color: C.ink, dash: [2, 3] }] });
        const A = pay.attacker, Dm = pay.defender;
        const defBR = (q) => (q * Dm[0][0] + (1 - q) * Dm[0][1] >= q * Dm[1][0] + (1 - q) * Dm[1][1] ? 1 : 0);
        const attBR = (p) => (p * A[0][0] + (1 - p) * A[1][0] >= p * A[0][1] + (1 - p) * A[1][1] ? 1 : 0);
        const dp = []; for (let i = 0; i <= 400; i++) { const q = i / 400; dp.push([q, defBR(q)]); }
        const ap = []; for (let i = 0; i <= 400; i++) { const p = i / 400; ap.push([attBR(p), p]); }
        line(ctx, dp, g.X, g.Y, C.accent, 3); line(ctx, ap, g.X, g.Y, C.sage, 3);
        if (!RM) self.fpStep = Math.min(self.fp.length, self.fpStep + dt * 120); else self.fpStep = self.fp.length;
        line(ctx, self.fp.slice(0, Math.max(2, Math.floor(self.fpStep))), g.X, g.Y, C.ink, 1.2, [2, 3]);
        if (sol.mixed) { dot(ctx, g.X(sol.mixed.q), g.Y(sol.mixed.p), 6, C.bad, C.bg); label(ctx, C, `NE (q* ${sol.mixed.q.toFixed(3)}, p* ${sol.mixed.p.toFixed(3)})`, g.X(sol.mixed.q) - 10, g.Y(sol.mixed.p) - 14, 'right', C.ink); }
        sol.pure.forEach(([i, j]) => dot(ctx, g.X(j === 0 ? 1 : 0), g.Y(i === 0 ? 1 : 0), 7, C.bad, C.bg));
      });
    },
    update() {
      const pay = QM.antiScalpPayoffs(S.game), sol = QM.solve2x2(pay.defender, pay.attacker);
      this.pay = pay; this.sol = sol;
      // fictitious play: each side best-responds to the other's empirical frequency
      const A = pay.attacker, Dm = pay.defender; let nD1 = 1, nA1 = 1, n = 2; const fp = [];
      for (let k = 0; k < 1500; k++) {
        const p = nD1 / n, q = nA1 / n; fp.push([q, p]);
        const d = q * Dm[0][0] + (1 - q) * Dm[0][1] >= q * Dm[1][0] + (1 - q) * Dm[1][1] ? 1 : 0;
        const a = p * A[0][0] + (1 - p) * A[1][0] >= p * A[0][1] + (1 - p) * A[1][1] ? 1 : 0;
        nD1 += d; nA1 += a; n++;
      }
      this.fp = fp; this.fpStep = 0;
      const rowN = ['D1 Rate Limit + CAPTCHA', 'D2 Deposit + SMS OTP'], colN = ['A1 Sniping', 'A2 Lock & Abandon DoS'];
      const t = h('table', { class: 'payoff' }); t.append(h('tr', {}, h('th', { text: 'Defender ↓ · Attacker →' }), ...colN.map((c) => h('th', { text: c }))));
      for (let i = 0; i < 2; i++) {
        const tr = h('tr', {}, h('th', { text: rowN[i] }));
        for (let j = 0; j < 2; j++) {
          const dBR = Dm[i][j] >= Dm[1 - i][j], aBR = A[i][j] >= A[i][1 - j];
          const isNE = sol.pure.some(([a, b]) => a === i && b === j);
          tr.append(h('td', { class: isNE ? 'ne' : '' },
            h('span', { class: 'num' + (dBR ? ' br' : ''), text: 'U_D ' + peso(Dm[i][j]) + (dBR ? '  BR' : '') }),
            h('span', { class: 'num' + (aBR ? ' br' : ''), text: 'U_A ' + peso(A[i][j]) + (aBR ? '  BR' : '') })));
        }
        t.append(tr);
      }
      const note = sol.mixed
        ? `Mixed Nash equilibrium: play Rate Limit + CAPTCHA on ${pct(sol.mixed.p)} of drops and Deposit + OTP on the rest. Attackers then snipe ${pct(sol.mixed.q)} of the time and gain nothing by switching.`
        : sol.pure.length ? `Pure equilibrium at ${sol.pure.map(([i, j]) => rowN[i].slice(0, 2) + ' / ' + colN[j].slice(0, 2)).join(', ')}: neither side gains by deviating.` : 'No equilibrium found for these payoffs.';
      this.tbl.replaceChildren(t, h('p', { class: 'muted', style: 'font-size:13px;margin-top:8px', text: note }));
      setText('g-p', sol.mixed ? fmt(sol.mixed.p, 3) : (sol.pure[0] ? (sol.pure[0][0] === 0 ? '1 (pure)' : '0 (pure)') : '—'));
      setText('g-q', sol.mixed ? fmt(sol.mixed.q, 3) : (sol.pure[0] ? (sol.pure[0][1] === 0 ? '1 (pure)' : '0 (pure)') : '—'));
      const ud = sol.mixed ? sol.mixed.EUd : sol.pure[0] ? Dm[sol.pure[0][0]][sol.pure[0][1]] : NaN;
      const ua = sol.mixed ? sol.mixed.EUa : sol.pure[0] ? A[sol.pure[0][0]][sol.pure[0][1]] : NaN;
      setText('g-ud', peso(ud)); setText('g-ua', peso(ua));
    },
  });

  // ── Mod 2 · 10 Entropy ──
  const FORMATS = [
    { name: '4-digit booking PIN', a: 10, L: 4 }, { name: '6-digit OTP-style code', a: 10, L: 6 },
    { name: '8-char lowercase', a: 26, L: 8 }, { name: '12-char alphanumeric token', a: 62, L: 12 },
  ];
  MODULES.push({
    id: 'entropy', code: 'Mod 2 · 10', title: 'Booking-token entropy & keyspace',
    blurb: 'Guest booking lookups use a reference code. Entropy H = L · log₂|Σ| sets the keyspace S = |Σ|^L, and the expected enumeration time is T_crack = S / (2 · R) at R guesses per second.',
    controls: [
      { id: 'er', key: 'rate', label: 'Attacker guessing rate', sym: 'R', min: -2, max: 9, step: 0.1, get: (o) => Math.log10(o.rate), set: (o, v) => { o.rate = 10 ** v; }, fmt: (v) => { const r = 10 ** v; return r < 1 ? r.toFixed(2) : r < 1e4 ? Math.round(r).toLocaleString('en-US') : '10^' + v.toFixed(1); }, unit: 'guesses/s' },
    ],
    state: () => S.entropy,
    mount(body) {
      const self = this;
      const c1 = h('canvas', { style: '--h:250px', 'aria-label': 'Entropy bits and time to crack per token format' });
      const c2 = h('canvas', { style: '--h:170px', 'aria-label': 'Brute-force race' });
      this.tokEl = h('div', { class: 'tokens' });
      const gen = (a, L, alphabet) => {
        const tok = QM.generateToken(alphabet, L, (b) => crypto.getRandomValues(b));
        this.tokEl.prepend(h('div', { class: 'token' }, h('span', { text: tok }), h('span', { class: 'muted', style: 'font-size:12px', text: `${fmt(QM.entropyBits(a, L), 1)} bits` })));
        while (this.tokEl.children.length > 5) this.tokEl.lastChild.remove();
      };
      const sample = Array.from({ length: 1500 }, () => QM.generateToken(QM.ALNUM, 12, (b) => crypto.getRandomValues(b)));
      const Hc = QM.empiricalEntropyPerChar(sample);
      body.append(
        kpis([{ id: 'e-4', label: '4-digit PIN entropy' }, { id: 'e-12', label: '12-char token entropy' }, { id: 'e-t4', label: 'T_crack, 4-digit at R' }, { id: 'e-t12', label: 'T_crack, 12-char at R' }, { id: 'e-emp', label: 'Measured bits/char (1,500 tokens)', value: `${Hc.toFixed(3)} / ${Math.log2(62).toFixed(3)}` }]),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Entropy and expected enumeration time' })), c1),
        h('div', { class: 'two' },
          h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Generate with crypto.getRandomValues()' })),
            h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
              h('button', { class: 'btn', type: 'button', text: '4-digit PIN', onclick: () => gen(10, 4, '0123456789') }),
              h('button', { class: 'btn primary', type: 'button', text: '12-char token', onclick: () => gen(62, 12, QM.ALNUM) })),
            h('p', { class: 'muted', style: 'font-size:12.5px', text: 'Rejection sampling discards bytes ≥ 248 so every one of the 62 symbols is equally likely (no modulo bias).' }), this.tokEl),
          h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Brute-force race at rate R' }), h('button', { class: 'btn', type: 'button', text: 'Restart race', onclick: () => self.resetRace() })), c2)),
      );
      gen(10, 4, '0123456789'); gen(62, 12, QM.ALNUM);
      addCanvas(c1, (ctx, w, hh, C) => {
        const R = S.entropy.rate; const rows = FORMATS;
        const g = chart(ctx, w, hh, C, { x0: 0, x1: 80, y0: 0, y1: rows.length, noXTicks: false, xLabel: 'entropy H (bits)', yFmt: () => '', yTicks: 1 });
        const rh = (g.Y(0) - g.Y(1));
        rows.forEach((f, i) => {
          const bits = QM.entropyBits(f.a, f.L), top = g.Y(rows.length - i), y = top + rh * 0.42, bh = rh * 0.44;
          label(ctx, C, `${f.name} · |Σ| = ${f.a}, L = ${f.L}`, g.X(0) + 4, top + rh * 0.2, 'left', C.ink, 11.5);
          ctx.fillStyle = bits < 40 ? C.bad : bits < 64 ? C.warn : C.ok; ctx.globalAlpha = 0.85; ctx.fillRect(g.X(0), y, g.X(bits) - g.X(0), bh); ctx.globalAlpha = 1;
          const st = `${bits.toFixed(1)} bits · T_crack ${QM.humanizeLog10Seconds(QM.log10CrackSeconds(f.a, f.L, R))}`;
          ctx.font = `11.5px ${C.mono}`; const tw = ctx.measureText(st).width;
          if (g.X(bits) + 8 + tw < g.P.l + g.iw) label(ctx, C, st, g.X(bits) + 8, y + bh / 2, 'left', C.ink, 11.5);
          else label(ctx, C, st, g.X(bits) - 8, y + bh / 2, 'right', C.bg, 11.5);
        });
      });
      addCanvas(c2, (ctx, w, hh, C, dt) => {
        const rc = self.race; if (!rc) return; if (!RM) rc.real += dt;
        const R = S.entropy.rate, S4 = 1e4, simT = rc.real * rc.speed;
        const tracks = [{ n: '4-digit PIN', S: S4, target: rc.t4 }, { n: '12-char token', log10S: 12 * Math.log10(62) }];
        const pad = 14, tw = w - 2 * pad;
        tracks.forEach((tr, i) => {
          const y = pad + 18 + i * 56;
          let frac, txt;
          if (tr.S) { const found = simT * R >= tr.target; frac = found ? tr.target / tr.S : Math.min(1, (simT * R) / tr.S); txt = found ? `found after ${Math.round(tr.target).toLocaleString('en-US')} guesses` : `${Math.floor(simT * R).toLocaleString('en-US')} guesses`; }
          else { const l = Math.log10(Math.max(simT * R, 1e-9)) - tr.log10S; frac = 10 ** l; txt = `searched 10^${l.toFixed(1)} of keyspace`; }
          label(ctx, C, tr.n, pad, y - 9, 'left', C.ink, 12);
          ctx.strokeStyle = C.line; ctx.strokeRect(pad + 0.5, y + 0.5, tw, 14);
          ctx.fillStyle = tr.S ? C.bad : C.ok; ctx.fillRect(pad + 1, y + 1, Math.max(1.5, frac * (tw - 1)), 13);
          label(ctx, C, txt, pad + tw, y - 9, 'right');
        });
        label(ctx, C, `simulated clock ${QM.humanizeLog10Seconds(Math.log10(Math.max(simT, 1e-3)))} (×${Math.round(rc.speed).toLocaleString('en-US')} speed)`, pad, hh - 12, 'left');
      });
    },
    resetRace() {
      const R = S.entropy.rate; const t4 = 1 + Math.floor(Math.random() * 1e4);
      this.race = { real: 0, t4, speed: Math.max(1, (1e4 / R) / 8) };
    },
    update() {
      const R = S.entropy.rate;
      setText('e-4', fmt(QM.entropyBits(10, 4), 2) + ' bits'); setText('e-12', fmt(QM.entropyBits(62, 12), 2) + ' bits');
      setText('e-t4', QM.humanizeLog10Seconds(QM.log10CrackSeconds(10, 4, R)), 'alert');
      setText('e-t12', QM.humanizeLog10Seconds(QM.log10CrackSeconds(62, 12, R)), 'good');
      this.resetRace();
    },
  });

  // ── Mod 12 · RBD ──
  MODULES.push({
    id: 'rbd', code: 'Mod 12', title: 'Series-parallel booking pipeline (RBD)',
    blurb: 'A booking succeeds only if every block in the series chain works. Payment confirmation is the weak link, so it gets parallel paths: primary webhook, polling reconciler, durable retry queue. Rᵢ(t) = e^(−t / MTBFᵢ).',
    controls: [
      { id: 'rn', key: 'nFallback', label: 'Payment-confirmation paths in parallel', sym: 'n', min: 1, max: 3, step: 1, fmt: (v) => String(Math.round(v)) },
      { id: 'rt', key: 't', label: 'Mission time since last deploy', sym: 't', min: 1, max: 720, step: 1, unit: 'h', fmt: (v) => String(Math.round(v)) },
      { id: 'rw', key: 'whMtbf', label: 'Primary webhook MTBF', sym: 'MTBF_wh', min: 20, max: 3000, step: 10, unit: 'h', fmt: (v) => String(Math.round(v)) },
    ],
    state: () => S.rbd,
    mount(body) {
      const self = this; if (S.rbd.whMtbf == null) S.rbd.whMtbf = 400;
      const c1 = h('canvas', { style: '--h:250px;min-width:720px', 'aria-label': 'Reliability block diagram' });
      const c2 = h('canvas', { style: '--h:260px', 'aria-label': 'System reliability over time' });
      body.append(
        kpis([{ id: 'r-R', label: 'R_sys(t)' }, { id: 'r-A', label: 'Inherent availability A_sys' }, { id: 'r-down', label: 'Expected downtime per year' }, { id: 'r-mttf', label: 'Mean time to first failure' }, { id: 'r-weak', label: 'Weakest block at t' }]),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Reliability block diagram at mission time t' })), h('div', { class: 'scroll-x' }, c1)),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'R_sys(t) with 1, 2 or 3 confirmation paths' })), c2),
      );
      addCanvas(c1, (ctx, w, hh, C) => {
        const r = self.r; if (!r) return; const pad = 58, n = r.blocks.length, gap = 22, bw = (w - 2 * pad - (n - 1) * gap) / n, midY = hh / 2;
        ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, midY); ctx.lineTo(w - 4, midY); ctx.stroke();
        label(ctx, C, 'member', 4, midY - 10, 'left'); label(ctx, C, 'booked', w - 4, midY - 10, 'right');
        r.blocks.forEach((b, i) => {
          const x = pad + i * (bw + gap);
          const box = (bx, by, bh, item) => {
            ctx.fillStyle = C.bg; ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = rgba(relColor(C, item.R), 0.18); ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = relColor(C, item.R); ctx.lineWidth = 1.5; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
            ctx.font = `600 11.5px ${C.body}`; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            const words = item.name.split(' '); let ln = '', ly = by + 6; const lines = [];
            words.forEach((wd) => { const tst = ln ? ln + ' ' + wd : wd; if (ctx.measureText(tst).width > bw - 10 && ln) { lines.push(ln); ln = wd; } else ln = tst; }); lines.push(ln);
            lines.slice(0, 3).forEach((l) => { ctx.fillText(l, bx + bw / 2, ly); ly += 13; });
            label(ctx, C, `R ${item.R.toFixed(3)}`, bx + bw / 2, by + bh - 20, 'center', C.ink);
            label(ctx, C, `MTBF ${Math.round(item.mtbf)}h`, bx + bw / 2, by + bh - 8, 'center');
          };
          if (b.subs) {
            const k = b.subs.length, bh = Math.min(74, (hh - 30 - (k - 1) * 8) / k), tot = k * bh + (k - 1) * 8, y0 = midY - tot / 2;
            ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(x - gap / 2, y0 + bh / 2); ctx.lineTo(x - gap / 2, y0 + tot - bh / 2); ctx.moveTo(x + bw + gap / 2, y0 + bh / 2); ctx.lineTo(x + bw + gap / 2, y0 + tot - bh / 2); ctx.stroke();
            b.subs.forEach((s, j) => { const y = y0 + j * (bh + 8); ctx.beginPath(); ctx.moveTo(x - gap / 2, y + bh / 2); ctx.lineTo(x + bw + gap / 2, y + bh / 2); ctx.stroke(); box(x, y, bh, s); });
            label(ctx, C, `parallel R ${b.R.toFixed(4)}`, x + bw / 2, y0 - 10, 'center', C.ink);
          } else box(x, midY - 37, 74, b);
        });
      });
      addCanvas(c2, (ctx, w, hh, C) => {
        const p = S.rbd, ov = { wh: { mtbf: p.whMtbf } };
        const g = chart(ctx, w, hh, C, { x0: 0, x1: 720, y0: 0, y1: 1, xLabel: 'hours since last deploy', yFmt: (v) => v.toFixed(1), legend: [1, 2, 3].map((n) => ({ label: `${n} path${n > 1 ? 's' : ''}`, color: n === 1 ? C.bad : n === 2 ? C.warn : C.ok, dash: n === Math.round(p.nFallback) ? null : [5, 4] })) });
        [1, 2, 3].forEach((n) => {
          const pts = []; for (let t = 0; t <= 720; t += 6) pts.push([t, QM.rbdEvaluate(QM.PIPELINE, n, t, ov).R]);
          line(ctx, pts, g.X, g.Y, n === 1 ? C.bad : n === 2 ? C.warn : C.ok, n === Math.round(p.nFallback) ? 2.6 : 1.4, n === Math.round(p.nFallback) ? null : [5, 4]);
        });
        ctx.strokeStyle = C.ink; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(g.X(p.t), g.P.t); ctx.lineTo(g.X(p.t), g.Y(0)); ctx.stroke(); ctx.setLineDash([]);
        dot(ctx, g.X(p.t), g.Y(self.r.R), 5, C.ink, C.bg);
        label(ctx, C, `t = ${Math.round(p.t)} h · R = ${self.r.R.toFixed(3)}`, Math.min(g.X(p.t) + 8, w - 170), g.Y(self.r.R) - 12, 'left', C.ink);
      });
    },
    update() {
      const p = S.rbd, n = Math.round(p.nFallback), ov = { wh: { mtbf: p.whMtbf } };
      const r = QM.rbdEvaluate(QM.PIPELINE, n, p.t, ov); this.r = r;
      let mttf = 0; for (let t = 0; t < 30000; t += 5) mttf += QM.rbdEvaluate(QM.PIPELINE, n, t + 2.5, ov).R * 5;
      const items = r.blocks.flatMap((b) => (b.subs ? [{ name: b.name + ' (group)', R: b.R }] : [b]));
      const weak = items.reduce((m, b) => (b.R < m.R ? b : m));
      setText('r-R', fmt(r.R, 4), r.R < 0.5 ? 'alert' : r.R > 0.8 ? 'good' : '');
      setText('r-A', pct(r.A, 3)); setText('r-down', fmt((1 - r.A) * 8760, 1) + ' h');
      setText('r-mttf', fmt(mttf, 0) + ' h'); setText('r-weak', weak.name);
    },
  });

  // ── Mod 4 · FAIR ──
  let worker = null;
  function fairRun(f, cb) {
    const payload = { f, trials: 10000, seeds: [101, 202], mit: 1 - f.controlEff };
    const finish = (res) => cb(res);
    try {
      if (!worker) {
        const src = document.getElementById('engine-src').textContent + `
self.onmessage = function (e) {
  var d = e.data, t0 = Date.now();
  var A = QM.fairSimulate(d.f, d.trials, d.seeds[0]), B = QM.fairSimulate(d.f, d.trials, d.seeds[1]), M = QM.fairSimulate(d.f, d.trials, d.seeds[0], d.mit);
  var hi = A.p99 * 1.05, nb = 40, hb = new Array(nb).fill(0), hm = new Array(nb).fill(0);
  for (var i = 0; i < d.trials; i++) { var a = Math.floor(A.losses[i] / hi * nb), m = Math.floor(M.losses[i] / hi * nb); if (a < nb) hb[a]++; if (m < nb) hm[m]++; }
  self.postMessage({ aleA: A.ale, aleB: B.ale, aleRaw: A.aleRaw, p90: A.p90, p99: A.p99, aleM: M.ale, p90M: M.p90, hi: hi, hb: hb, hm: hm, ms: Date.now() - t0 });
};`;
        worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      }
      worker.onmessage = (e) => finish(e.data);
      worker.onerror = () => { worker = null; finish(fairMain(payload)); };
      worker.postMessage(payload);
    } catch (err) { finish(fairMain(payload)); }
  }
  function fairMain(d) {
    const t0 = performance.now();
    const A = QM.fairSimulate(d.f, d.trials, d.seeds[0]), B = QM.fairSimulate(d.f, d.trials, d.seeds[1]), M = QM.fairSimulate(d.f, d.trials, d.seeds[0], d.mit);
    const hi = A.p99 * 1.05, nb = 40, hb = new Array(nb).fill(0), hm = new Array(nb).fill(0);
    for (let i = 0; i < d.trials; i++) { const a = Math.floor((A.losses[i] / hi) * nb), m = Math.floor((M.losses[i] / hi) * nb); if (a < nb) hb[a]++; if (m < nb) hm[m]++; }
    return { aleA: A.ale, aleB: B.ale, aleRaw: A.aleRaw, p90: A.p90, p99: A.p99, aleM: M.ale, p90M: M.p90, hi, hb, hm, ms: Math.round(performance.now() - t0), main: true };
  }
  MODULES.push({
    id: 'fair', code: 'Mod 4', title: 'FAIR Monte Carlo: slot-drop abuse losses',
    blurb: 'Annual loss from bot abuse across 52 weekly drops: refunds, empty-bed revenue, and (rarely) RA 10173 breach-notification and regulatory cost when member data is exposed. 10,000 trials run in a Web Worker; the control is Deposit + SMS OTP.',
    controls: [
      { id: 'f1', key: 'tefMin', label: 'Abuse attempts per year, minimum', sym: 'a_min', min: 0, max: 40, step: 1, fmt: (v) => String(v) },
      { id: 'f2', key: 'tefMode', label: 'Abuse attempts per year, most likely', sym: 'm', min: 1, max: 52, step: 1, fmt: (v) => String(v) },
      { id: 'f3', key: 'tefMax', label: 'Abuse attempts per year, maximum', sym: 'b_max', min: 2, max: 104, step: 1, fmt: (v) => String(v) },
      { id: 'f4', key: 'vuln', label: 'Share of attempts that cause loss', sym: 'V', min: 0.05, max: 1, step: 0.01, fmt: (v) => pct(v, 0) },
      { id: 'f5', key: 'lmMedian', label: 'Median primary loss per event', sym: 'LM', min: 1000, max: 30000, step: 500, fmt: peso },
      { id: 'f6', key: 'secProb', label: 'Chance an event triggers RA 10173 costs', sym: 'P_sec', min: 0, max: 0.3, step: 0.01, fmt: (v) => pct(v, 0) },
      { id: 'f7', key: 'controlEff', label: 'Deposit + OTP reduction in V', sym: 'e', min: 0, max: 0.95, step: 0.01, fmt: (v) => pct(v, 0) },
      { id: 'f8', key: 'controlCost', label: 'Annual cost of the control', sym: 'C_control', min: 1000, max: 150000, step: 1000, fmt: peso },
    ],
    state: () => S.fair,
    mount(body) {
      const self = this;
      const c1 = h('canvas', { style: '--h:280px', 'aria-label': 'Annual loss histogram base versus mitigated' });
      body.append(
        kpis([{ id: 'f-ale', label: 'ALE, no control' }, { id: 'f-alem', label: 'ALE with Deposit + OTP' }, { id: 'f-p90', label: 'P90 annual loss (no control)' }, { id: 'f-rosi', label: 'ROSI' }, { id: 'f-conv', label: 'Seed A vs B ALE gap' }, { id: 'f-ms', label: 'Worker runtime' }]),
        h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Annual loss distribution, 10,000 trials' }), h('button', { class: 'btn primary', type: 'button', text: 'Run 10,000 trials', onclick: () => self.update() })), c1),
      );
      addCanvas(c1, (ctx, w, hh, C) => {
        const r = self.res; if (!r) { label(ctx, C, 'Running…', 20, 30); return; }
        const nb = r.hb.length, bw = r.hi / nb, ymax = Math.max(...r.hb, ...r.hm) / 10000 * 1.15;
        const g = chart(ctx, w, hh, C, { x0: 0, x1: r.hi, y0: 0, y1: ymax, xLabel: 'annual loss (₱)', yLabel: 'share of trials', yFmt: (v) => (v * 100).toFixed(0) + '%', legend: [{ label: 'no control', color: C.accent, box: true }, { label: 'Deposit + OTP', color: C.sage, box: true }, { label: 'ALE', color: C.ink, dash: [3, 3] }] });
        const bar = (arr, col) => { ctx.fillStyle = rgba(col, 0.45); arr.forEach((c, i) => { const v = c / 10000; ctx.fillRect(g.X(i * bw) + 1, g.Y(v), g.X(bw) - g.X(0) - 2, g.Y(0) - g.Y(v)); }); };
        bar(r.hb, C.accent); bar(r.hm, C.sage);
        [[r.aleA, C.accent], [r.aleM, C.sage]].forEach(([v, col]) => { ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g.X(v), g.P.t); ctx.lineTo(g.X(v), g.Y(0)); ctx.stroke(); ctx.setLineDash([]); label(ctx, C, 'ALE ' + peso(v), g.X(v) + 5, g.P.t + 10 + (col === C.sage ? 14 : 0), 'left', col); });
      });
    },
    update() {
      const f = S.fair; if (f.tefMode < f.tefMin) f.tefMode = f.tefMin; if (f.tefMax <= f.tefMode) f.tefMax = f.tefMode + 1;
      this.res = null;
      fairRun(f, (r) => {
        this.res = r; vvCache.fair = r;
        setText('f-ale', peso(r.aleA)); setText('f-alem', peso(r.aleM), 'good'); setText('f-p90', peso(r.p90));
        const ro = QM.rosi(r.aleA, r.aleM, f.controlCost); setText('f-rosi', pct(ro, 0), ro > 0 ? 'good' : 'alert');
        setText('f-conv', pct(Math.abs(r.aleA - r.aleB) / r.aleA, 2)); setText('f-ms', r.ms + ' ms' + (r.main ? ' (main thread)' : ''));
      });
    },
  });

  // ───────────── LAB shell ─────────────
  let currentMod = MODULES[0];
  function renderRail() {
    const rail = $('#lab-rail'); rail.replaceChildren();
    MODULES.forEach((m) => rail.append(h('button', { class: 'rail-item', type: 'button', 'aria-current': String(m === currentMod), onclick: () => { location.hash = 'lab-' + m.id; } },
      h('span', { class: 'eyebrow', text: m.code }), h('b', { text: m.title }))));
  }
  function mountModule(m) {
    currentMod = m; renderRail();
    const body = $('#lab-body'); clearCanvases(body); body.replaceChildren();
    const st = m.state();
    const ctlBox = h('div', { class: 'card controls' }, h('div', { class: 'eyebrow', text: 'Parameters' }));
    m.controls.forEach((def) => ctlBox.append(slider(def, st, () => { m.update(); scheduleVV(); })));
    ctlBox.append(h('button', { class: 'btn', type: 'button', text: 'Reset to Block 69 baseline', onclick: () => {
      const k = { nhpp: 'nhpp', queue: 'queue', dtmc: 'dtmc', game: 'game', entropy: 'entropy', rbd: 'rbd', fair: 'fair' }[m.id];
      Object.assign(S[k], JSON.parse(JSON.stringify(D[k]))); if (k === 'rbd') S.rbd.whMtbf = 400; mountModule(m); scheduleVV();
    } }));
    const inst = h('div', { class: 'stack' });
    body.append(h('div', { class: 'mod-head' }, h('div', {}, h('div', { style: 'display:flex;gap:10px;align-items:center' }, h('span', { class: 'chip', text: m.code }), h('h2', { text: m.title })), h('p', { text: m.blurb }))),
      h('div', { class: 'mod-grid' }, ctlBox, inst));
    m.mount(inst); m.update();
  }

  // ═════════════════════════ SCENARIOS ═════════════════════════
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const SCENARIOS = [
    {
      id: 'flash', tag: 'Mod 1 · 3 + Mod 6', title: 'Sunday 8:00 PM slot drop', sub: 'Flash crowd saturates bed locks',
      incident: 'The studio posts next week\'s reformer schedule every Sunday at 8:00 PM. Within two minutes, regulars hammer the booking page at 12 attempts per minute above the background. Four reformer beds can check out at once and the lock lasts 90 seconds, so most attempts hit "Slots busy, try again" and members message the café asking whether the site is down.',
      base: () => ({ nhpp: clone(D.nhpp), queue: { mu: 1 / 1.5, c: 4, K: 10 } }),
      steps: [
        { title: 'Checkout lock policy', prompt: 'How long should a member hold a bed while paying?', options: [
          { label: 'Keep the 90 s lock', detail: 'Status quo. 1/μ = 1.5 min.', apply: (p) => p },
          { label: '45 s lock + one 30 s extension', detail: 'Effective hold ≈ 0.9 min. Slower payers can extend once.', apply: (p) => { p.queue.mu = 1 / 0.9; } },
          { label: 'Saved-card express checkout, 30 s', detail: 'Returning members pay with a stored gateway token. 1/μ = 0.5 min.', apply: (p) => { p.queue.mu = 1 / 0.5; } },
        ] },
        { title: 'Release strategy', prompt: 'How should the week\'s beds be released?', options: [
          { label: 'All beds at 8:00 PM sharp', detail: 'Status quo. A = 12/min, σ = 3 min.', apply: (p) => p },
          { label: 'Add a waiting room (K = 24)', detail: 'More sessions may wait for a lock instead of being turned away.', apply: (p) => { p.queue.K = 24; } },
          { label: 'Staggered release, 8:00–8:20 PM', detail: 'One class block every few minutes. Same total demand: A ÷ 3, σ × 3, peak at +8 min.', apply: (p) => { p.nhpp.A /= 3; p.nhpp.sigma *= 3; p.nhpp.tPeak = 8; } },
        ] },
      ],
      compute(p) {
        const pts = [], pdp = []; let drops = 0, peakPd = 0, Wpk = 0, uPk = 0; const dt = 0.25;
        for (let t = p.nhpp.T0; t <= p.nhpp.T1; t += dt) {
          const lam = QM.nhppRate(t, p.nhpp), q = QM.mmck({ ...p.queue, lambda: lam });
          pts.push([t, lam]); pdp.push([t, q.PK]); drops += lam * q.PK * dt;
          if (q.PK > peakPd) { peakPd = q.PK; Wpk = q.W; uPk = q.utilization; }
        }
        const L = QM.nhppExpected(p.nhpp, p.nhpp.T0, p.nhpp.T1);
        return {
          lam: pts, pd: pdp,
          kpis: [
            { label: 'Booking attempts in the window (Λ)', v: L, f: (v) => fmt(v, 1), better: 'none' },
            { label: 'Attempts turned away ("Slots busy")', v: drops, f: (v) => fmt(v, 1), better: 'lower' },
            { label: 'Share of attempts turned away', v: drops / L, f: (v) => pct(v), better: 'lower' },
            { label: 'Peak P_drop', v: peakPd, f: (v) => pct(v), better: 'lower' },
            { label: 'Lock hold latency W at peak', v: Wpk, f: (v) => fmt(v, 2) + ' min', better: 'lower' },
            { label: 'Bed-lock utilisation at peak', v: uPk, f: (v) => pct(v), better: 'none' },
          ],
        };
      },
      draw(ctx, w, hh, C, b, c) {
        const ymax = Math.max(...b.lam.map((x) => x[1]), ...c.lam.map((x) => x[1])) * 1.15;
        const g = chart(ctx, w, hh, C, { x0: D.nhpp.T0, x1: D.nhpp.T1, y0: 0, y1: ymax, xLabel: 'minutes after the 8:00 PM drop', yLabel: 'attempts / min', y2: { y0: 0, y1: 1, fmt: (v) => Math.round(v * 100) + '%', label: 'P_drop' }, legend: [{ label: 'λ(t) before', color: C.muted, dash: [4, 3] }, { label: 'λ(t) after', color: C.accent }, { label: 'P_drop before', color: C.bad, dash: [4, 3] }, { label: 'P_drop after', color: C.bad }] });
        line(ctx, b.lam, g.X, g.Y, C.muted, 1.5, [4, 3]); area(ctx, c.lam, g.X, g.Y, 0, C.accent, 0.12); line(ctx, c.lam, g.X, g.Y, C.accent, 2.2);
        line(ctx, b.pd, g.X, g.Y2, C.bad, 1.5, [4, 3]); line(ctx, c.pd, g.X, g.Y2, C.bad, 2.4);
      },
      toLab(p) { Object.assign(S.nhpp, p.nhpp); Object.assign(S.queue, p.queue, { lambda: +QM.nhppRate(p.nhpp.tPeak, p.nhpp).toFixed(1) }); return 'queue'; },
    },
    {
      id: 'scalper', tag: 'Mod 7 + Mod 5 + Mod 2 · 10', title: 'Scalper bot swarm', sub: 'Lock & Abandon DoS and sniping',
      incident: 'A reseller group starts selling Block 69 slots in a Facebook group. Their scripts do two things: snipe beds the second they drop, and hold beds with throwaway accounts until the lock TTL expires so real members give up. Guest bookings are looked up with a 4-digit code. Expired reservations jump and no-shows climb as resold seats go unused.',
      base: () => ({ game: clone(D.game), dtmc: clone(D.dtmc), defense: 'none', token: { a: 10, L: 4, rate: 10 } }),
      steps: [
        { title: 'Anti-scalping defence', prompt: 'Which control does the booking page enforce on each drop?', options: [
          { label: 'No change', detail: 'Bots split evenly between sniping and lock-holding.', apply: (p) => p },
          { label: 'Rate limit + CAPTCHA', detail: 'Blocks a share r of scripted attempts. Attackers respond by switching strategy.', apply: (p) => { p.defense = 'D1'; } },
          { label: 'Deposit + SMS OTP', detail: 'Abandoned locks forfeit the deposit; each account needs a working SIM.', apply: (p) => { p.defense = 'D2'; } },
          { label: 'Randomise at the Nash mix p*', detail: 'Each drop picks a control at random with the equilibrium probability, so attackers cannot plan around it.', apply: (p) => { p.defense = 'mix'; } },
        ] },
        { title: 'Guest booking reference', prompt: 'What format should the booking lookup code use?', options: [
          { label: 'Keep the 4-digit code', detail: '≈ 13.3 bits. Lookup endpoint allows 10 guesses/s.', apply: (p) => p },
          { label: '6 digits + 5 tries/min lockout', detail: '≈ 19.9 bits at R = 5/60 guesses per second.', apply: (p) => { p.token = { a: 10, L: 6, rate: 5 / 60 }; } },
          { label: '12-char alphanumeric token', detail: '≈ 71.4 bits from crypto.getRandomValues().', apply: (p) => { p.token = { a: 62, L: 12, rate: 10 }; } },
        ] },
      ],
      compute(p) {
        const g = p.game, pay = QM.antiScalpPayoffs(g), sol = QM.solve2x2(pay.defender, pay.attacker), A = pay.attacker, Dm = pay.defender;
        const leakD1 = { snipe: 1 - g.r, dos: 1 - 0.4 * g.r }, leakD2 = { snipe: 1, dos: QM.clamp((g.h - g.D - g.sOtp) / g.h, 0, 1) };
        let snipe, leak, defU, pStar = sol.mixed ? sol.mixed.p : null;
        if (p.defense === 'none') { snipe = 0.5; leak = { snipe: 1, dos: 1 }; defU = -(0.5 * g.goodwill + 0.5 * g.price); }
        else {
          const pD1 = p.defense === 'D1' ? 1 : p.defense === 'D2' ? 0 : (pStar == null ? 0.5 : pStar);
          const br = QM.attackerBestResponse(A, pD1);
          snipe = br.best === 'indifferent' || (p.defense === 'mix' && sol.mixed) ? (sol.mixed ? sol.mixed.q : 0.5) : br.best === 'snipe' ? 1 : 0;
          leak = { snipe: pD1 * leakD1.snipe + (1 - pD1) * leakD2.snipe, dos: pD1 * leakD1.dos + (1 - pD1) * leakD2.dos };
          const du = (i) => snipe * Dm[i][0] + (1 - snipe) * Dm[i][1]; defU = pD1 * du(0) + (1 - pD1) * du(1);
        }
        const dos = 1 - snipe; const d = clone(p.dtmc);
        d.pTimeout = D.dtmc.pTimeout + 0.45 * dos * leak.dos;
        d.pNoShow = D.dtmc.pNoShow + 0.25 * snipe * leak.snipe;
        const a = QM.absorbingAnalysis(QM.buildReservationChain(d), 3);
        const bits = QM.entropyBits(p.token.a, p.token.L), tc = QM.log10CrackSeconds(p.token.a, p.token.L, p.token.rate);
        return {
          B: a.B[0], bits, tc,
          kpis: [
            { label: 'Reservations that end Attended', v: a.B[0][0], f: (v) => pct(v), better: 'higher' },
            { label: 'Reservations that Expire (bot locks)', v: a.B[0][1], f: (v) => pct(v), better: 'lower' },
            { label: 'No-Shows (resold seats)', v: a.B[0][2], f: (v) => pct(v), better: 'lower' },
            { label: 'Studio expected loss per drop', v: -defU, f: peso, better: 'lower' },
            { label: 'Booking-code entropy', v: bits, f: (v) => fmt(v, 1) + ' bits', better: 'higher' },
            { label: 'Expected time to enumerate a code', v: tc, f: QM.humanizeLog10Seconds, better: 'higher' },
          ],
        };
      },
      draw(ctx, w, hh, C, b, c) {
        const g = chart(ctx, w, hh, C, { x0: 0, x1: 3, y0: 0, y1: 1, noXTicks: true, yFmt: (v) => Math.round(v * 100) + '%', legend: [{ label: 'before', color: C.muted, box: true }, { label: 'after', color: C.accent, box: true }] });
        ['Attended', 'Expired', 'No-Show'].forEach((n, i) => {
          const cx = g.X(i + 0.5), bw = (g.X(1) - g.X(0)) * 0.28;
          ctx.fillStyle = rgba(C.muted, 0.5); ctx.fillRect(cx - bw - 3, g.Y(b.B[i]), bw, g.Y(0) - g.Y(b.B[i]));
          ctx.fillStyle = i === 0 ? C.ok : i === 1 ? C.warn : C.bad; ctx.fillRect(cx + 3, g.Y(c.B[i]), bw, g.Y(0) - g.Y(c.B[i]));
          label(ctx, C, n, cx, g.Y(0) + 12, 'center', C.ink);
          label(ctx, C, pct(b.B[i], 0), cx - bw / 2 - 3, g.Y(b.B[i]) - 9, 'center'); label(ctx, C, pct(c.B[i], 0), cx + bw / 2 + 3, g.Y(c.B[i]) - 9, 'center', C.ink);
        });
      },
      toLab(p) { Object.assign(S.game, p.game); return 'game'; },
    },
    {
      id: 'webhook', tag: 'Mod 12 + Mod 5', title: 'Payment webhook outage', sub: 'Paid members lose their beds',
      incident: 'During a drop the payment gateway\'s webhooks start failing. The gateway charges the member, but the booking app never hears back. The 90-second lock expires, the bed goes to someone else, and the café has to refund and apologise. The primary webhook is now failing about every 30 hours and takes 6 hours to recover.',
      base: () => ({ n: 1, whMtbf: 30, whMttr: 6, policy: 'release', dtmc: clone(D.dtmc) }),
      steps: [
        { title: 'Confirmation redundancy', prompt: 'How many independent paths confirm a payment?', options: [
          { label: 'Primary webhook only', detail: 'Status quo: one path in series.', apply: (p) => p },
          { label: '+ polling reconciler', detail: 'A job asks the gateway for payment status every minute.', apply: (p) => { p.n = 2; } },
          { label: '+ polling + durable retry queue', detail: 'Webhook payloads are stored and replayed until acknowledged.', apply: (p) => { p.n = 3; } },
        ] },
        { title: 'Lock behaviour while payment is pending', prompt: 'What happens to the bed when confirmation is late?', options: [
          { label: 'Release at TTL anyway', detail: 'Status quo. A late confirmation lands on a bed that is already gone.', apply: (p) => p },
          { label: 'Hold the bed while pending (max 10 min)', detail: 'The lock enters a "payment pending" hold instead of expiring.', apply: (p) => { p.policy = 'hold'; } },
        ] },
      ],
      compute(p) {
        const ov = { wh: { mtbf: p.whMtbf, mttr: p.whMttr } };
        const r = QM.rbdEvaluate(QM.PIPELINE, p.n, 168, ov), hooks = r.blocks.find((b) => b.parallel);
        const d = clone(p.dtmc); const late = d.pPay * (1 - hooks.A);
        d.pPay = d.pPay * hooks.A;
        if (p.policy === 'release') d.pTimeout += late; // late confirmations turn into expired, paid-but-lost bookings
        const a = QM.absorbingAnalysis(QM.buildReservationChain(d), 3);
        const curve = []; for (let t = 0; t <= 336; t += 4) curve.push([t, QM.rbdEvaluate(QM.PIPELINE, p.n, t, ov).R]);
        return {
          curve,
          kpis: [
            { label: 'R_sys over one week (168 h)', v: r.R, f: (v) => fmt(v, 4), better: 'higher' },
            { label: 'Pipeline availability A_sys', v: r.A, f: (v) => pct(v, 3), better: 'higher' },
            { label: 'Expected downtime per year', v: (1 - r.A) * 8760, f: (v) => fmt(v, 1) + ' h', better: 'lower' },
            { label: 'Confirmation path availability', v: hooks.A, f: (v) => pct(v, 3), better: 'higher' },
            { label: 'Paid-but-expired risk per lock', v: p.policy === 'release' ? late : 0, f: (v) => pct(v, 2), better: 'lower' },
            { label: 'Reservations that end Attended', v: a.B[0][0], f: (v) => pct(v), better: 'higher' },
          ],
        };
      },
      draw(ctx, w, hh, C, b, c) {
        const g = chart(ctx, w, hh, C, { x0: 0, x1: 336, y0: 0, y1: 1, xLabel: 'hours since last deploy', yLabel: 'R_sys(t)', yFmt: (v) => v.toFixed(1), legend: [{ label: 'before', color: C.bad, dash: [4, 3] }, { label: 'after', color: C.ok }] });
        line(ctx, b.curve, g.X, g.Y, C.bad, 1.6, [4, 3]); area(ctx, c.curve, g.X, g.Y, 0, C.ok, 0.1); line(ctx, c.curve, g.X, g.Y, C.ok, 2.4);
        ctx.strokeStyle = C.muted; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(g.X(168), g.P.t); ctx.lineTo(g.X(168), g.Y(0)); ctx.stroke(); ctx.setLineDash([]);
        label(ctx, C, 'next Sunday drop (168 h)', g.X(168) + 6, g.P.t + 12, 'left');
      },
      toLab(p) { Object.assign(S.rbd, { nFallback: p.n, whMtbf: p.whMtbf, t: 168 }); return 'rbd'; },
    },
  ];
  const scnChoice = {}; SCENARIOS.forEach((s) => { scnChoice[s.id] = s.steps.map(() => 0); });
  let currentScn = SCENARIOS[0];
  function scnParams(s, choices) { const p = s.base(); s.steps.forEach((st, i) => st.options[choices[i]].apply(p)); return p; }
  function renderScenarios() {
    const list = $('#scn-list'); list.replaceChildren(h('div', { class: 'eyebrow', text: 'Crisis walkthroughs' }));
    SCENARIOS.forEach((s, i) => list.append(h('button', { class: 'rail-item', type: 'button', 'aria-current': String(s === currentScn), onclick: () => { currentScn = s; renderScenarios(); } },
      h('span', { class: 'eyebrow', text: `Scenario ${i + 1} · ${s.tag}` }), h('b', { text: s.title }), h('span', { class: 'muted', style: 'font-size:12.5px', text: s.sub }))));
    const s = currentScn, body = $('#scn-body'); clearCanvases(body); body.replaceChildren();
    const choices = scnChoice[s.id];
    const before = s.compute(scnParams(s, s.steps.map(() => 0)));
    const cv = h('canvas', { style: '--h:320px', 'aria-label': 'Before and after telemetry' });
    const tbl = h('table', { class: 'cmp' });
    const refresh = () => {
      const after = s.compute(scnParams(s, choices)); state.after = after;
      tbl.replaceChildren(h('tr', {}, h('th', { text: 'Telemetry' }), h('th', { text: 'Before' }), h('th', { text: 'After' }), h('th', { text: 'Change' })));
      before.kpis.forEach((k, i) => {
        const a = after.kpis[i]; const diff = a.v - k.v; const rel = Math.abs(k.v) > 1e-12 ? diff / Math.abs(k.v) : 0;
        let cls = 'muted', txt = 'no change';
        if (Math.abs(rel) > 1e-6 || Math.abs(diff) > 1e-9) {
          const good = k.better === 'none' ? null : (k.better === 'lower' ? diff < 0 : diff > 0);
          cls = good == null ? 'muted' : good ? 'ok' : 'bad';
          txt = (diff > 0 ? '▲ ' : '▼ ') + (k.label.includes('enumerate') ? '10^' + Math.abs(diff).toFixed(1) + '×' : Math.abs(rel) < 100 ? pct(Math.abs(rel), 0) : '×' + fmt(a.v / k.v, 0));
        }
        tbl.append(h('tr', {}, h('td', { text: k.label }), h('td', { class: 'num', text: k.f(k.v) }), h('td', { class: 'num', text: a.f(a.v) }), h('td', {}, h('span', { class: 'pill ' + cls, text: txt }))));
      });
    };
    const state = { after: null }; refresh();
    body.append(h('div', { class: 'mod-head' }, h('div', {}, h('div', { style: 'display:flex;gap:10px;align-items:center' }, h('span', { class: 'chip', text: s.tag }), h('h2', { text: s.title })))),
      h('div', { class: 'card incident' }, h('div', { class: 'eyebrow', style: 'color:var(--bad)', text: 'Incident' }), h('p', { text: s.incident })));
    s.steps.forEach((st, i) => {
      const opts = h('div', { class: 'options' });
      st.options.forEach((o, j) => opts.append(h('button', { class: 'opt', type: 'button', 'aria-pressed': String(choices[i] === j), onclick: () => {
        choices[i] = j; [...opts.children].forEach((b, k) => b.setAttribute('aria-pressed', String(k === j))); refresh();
      } }, h('b', { text: o.label }), h('span', { text: o.detail }))));
      body.append(h('div', { class: 'card fork' }, h('div', { class: 'fork-head' }, h('span', { class: 'step', text: `Fork ${i + 1}` }), h('h3', { text: st.title }), h('span', { class: 'muted', style: 'font-size:13px', text: st.prompt })), opts));
    });
    body.append(
      h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Before / after telemetry' }),
        h('div', { style: 'display:flex;gap:8px' },
          h('button', { class: 'btn', type: 'button', text: 'Reset forks', onclick: () => { scnChoice[s.id] = s.steps.map(() => 0); renderScenarios(); } }),
          h('button', { class: 'btn primary', type: 'button', text: 'Open these parameters in LAB', onclick: () => { const mod = s.toLab(scnParams(s, choices)); scheduleVV(); location.hash = 'lab-' + mod; } }))), cv),
      h('div', { class: 'card canvas-card' }, h('header', {}, h('h3', { text: 'Engine readouts' }), h('span', { class: 'muted', style: 'font-size:12.5px', text: 'Every fork changes engine inputs; all numbers are recomputed.' })), h('div', { class: 'scroll-x' }, tbl)),
    );
    addCanvas(cv, (ctx, w, hh, C) => s.draw(ctx, w, hh, C, before, state.after));
  }

  // ═════════════════════════ V&V drawer ═════════════════════════
  const vvCache = { fair: null };
  let vvTimer = null;
  function scheduleVV() { clearTimeout(vvTimer); vvTimer = setTimeout(runVV, 450); }
  function runVV() {
    $('#vv-summary').textContent = 'running…';
    fairRun(S.fair, (fr) => {
      vvCache.fair = fr;
      const lam = S.queue.lambda;
      const ia = QM.homogeneousInterArrivals(lam, 50000, QM.mulberry32(42));
      const meanIA = ia.reduce((s, v) => s + v, 0) / ia.length;
      const q = QM.mmck(S.queue);
      const horizon = Math.min(40000, 300000 / lam);
      const qs = QM.mmckSimulate(S.queue, horizon, QM.mulberry32(7));
      const P = QM.buildReservationChain(S.dtmc);
      let dt; try { dt = QM.absorbingAnalysis(P, 3); } catch (e) { dt = null; }
      const pay = QM.antiScalpPayoffs(S.game);
      const rbd = QM.rbdEvaluate(QM.PIPELINE, Math.round(S.rbd.nFallback), S.rbd.t, { wh: { mtbf: S.rbd.whMtbf || 400 } });
      const nh = { simCount: QM.nhppSimulate(S.nhpp, S.nhpp.T0, S.nhpp.T1, QM.mulberry32(5)).length, expected: QM.nhppExpected(S.nhpp, S.nhpp.T0, S.nhpp.T1) };
      const guide = QM.runInvariantChecks({ lambda: lam, simulatedMeanInterArrival: meanIA, meanQueueLength: q.L, lambdaEff: q.lambdaEff, meanWaitTime: q.W, transitionMatrix: P, aleSeedA: fr.aleA, aleSeedB: fr.aleB });
      let model = [];
      if (dt) model = QM.runModelChecks({ queue: q, queueSim: qs, dtmc: dt, game: { payoffs: pay, solution: QM.solve2x2(pay.defender, pay.attacker) }, rbd, nhpp: nh });
      else model = [{ target: 'Fundamental Matrix Inverse', standard: 'I − Q must be invertible', measured: 'singular: a transient state never leaves', passed: false }];
      const all = [...guide.map((r) => ({ ...r, group: 'Guide §6' })), ...model.map((r) => ({ ...r, group: 'Block 69 model' }))];
      const pass = all.filter((r) => r.passed).length;
      const list = $('#vv-list'); list.replaceChildren();
      all.forEach((r) => list.append(h('div', { class: 'vv ' + (r.passed ? 'pass' : 'fail') },
        h('b', { text: r.target }), h('span', { class: 'pill ' + (r.passed ? 'ok' : 'bad'), text: r.passed ? 'PASS' : 'FAIL' }),
        h('span', { class: 'std', text: `${r.group} · ${r.standard}` }), h('span', { class: 'meas', text: r.measured }))));
      const badge = $('#vv-badge'); badge.textContent = `${pass}/${all.length}`; badge.className = 'pill ' + (pass === all.length ? 'ok' : 'bad');
      $('#vv-summary').textContent = `${pass} of ${all.length} passing · λ = ${fmt(lam, 1)}/min, c = ${Math.round(S.queue.c)}, K = ${Math.max(Math.round(S.queue.K), Math.round(S.queue.c))}`;
    });
  }
  function openVV(open) {
    $('#vv-drawer').classList.toggle('open', open); $('#vv-drawer').setAttribute('aria-hidden', String(!open)); $('#scrim').hidden = !open;
    if (open) { runVV(); $('#vv-close').focus(); }
  }

  // ═════════════════════════ routing + boot ═════════════════════════
  function route() {
    const hsh = (location.hash || '#scenarios').slice(1);
    const view = hsh.startsWith('lab') ? 'lab' : hsh === 'codex' ? 'codex' : 'scenarios';
    ['scenarios', 'lab', 'codex'].forEach((v) => { $('#view-' + v).hidden = v !== view; $('#tab-' + v).setAttribute('aria-selected', String(v === view)); });
    if (view === 'lab') { const id = hsh.split('-')[1]; mountModule(MODULES.find((m) => m.id === id) || currentMod); }
    if (view === 'scenarios') renderScenarios();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { location.hash = t.dataset.view === 'lab' ? 'lab-' + currentMod.id : t.dataset.view; }));
  window.addEventListener('hashchange', route);
  const tt = $('#theme-toggle');
  const isDark = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  const syncTT = () => { tt.textContent = isDark() ? 'Light' : 'Dark'; };
  tt.addEventListener('click', () => { document.documentElement.dataset.theme = isDark() ? 'light' : 'dark'; syncTT(); });
  syncTT();
  $('#vv-open').addEventListener('click', () => openVV(true));
  $('#vv-close').addEventListener('click', () => openVV(false));
  $('#scrim').addEventListener('click', () => openVV(false));
  $('#vv-run').addEventListener('click', runVV);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openVV(false); });
  // codex table of contents
  const toc = $('#codex-toc');
  document.querySelectorAll('.codex-sec').forEach((sec) => toc.append(h('button', { type: 'button', text: sec.dataset.toc, onclick: () => sec.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }) })));
  S.rbd.whMtbf = 400;
  route(); runVV(); requestAnimationFrame(loop);
})();
