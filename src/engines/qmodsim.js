/* Block 69 Pilates · QMODSIM pure math engines.
 * No DOM access. Runs in the browser, in a Web Worker, and under Node (node --test).
 * Units: time in minutes unless stated; money in Philippine pesos (₱); reliability time in hours.
 * Domain: Block 69 Cafe mat Pilates, Thu–Sat, 9:00 & 10:15 AM sessions, assigned capacity 3 or 4 (Group 6 PBL proposal, Nov 2026).
 */
(function (root) {
  'use strict';

  // ───────────────────────── shared primitives ─────────────────────────
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(x, lo, hi) {
    const v = Number(x);
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, v));
  }
  function expSample(rate, rng) { return -Math.log(1 - rng()) / rate; }
  function normalSample(rng) {
    let u = 0; while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  }
  function poissonSample(mean, rng) {
    if (mean <= 0) return 0;
    if (mean > 60) return Math.max(0, Math.round(mean + Math.sqrt(mean) * normalSample(rng)));
    const L = Math.exp(-mean); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  // Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7)
  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }

  // ───────────────────── Mod 1 & 3 · NHPP flash crowd ─────────────────────
  // λ(t) = λ_base + A · exp(−(t − t_peak)² / (2σ²)), t in minutes relative to the weekly slot release.
  function nhppRate(t, p) {
    return p.lambdaBase + p.A * Math.exp(-((t - p.tPeak) ** 2) / (2 * p.sigma * p.sigma));
  }
  // Λ(T0,T1) = ∫ λ(t) dt (closed form via erf)
  function nhppExpected(p, T0, T1) {
    const k = p.sigma * Math.SQRT2;
    return p.lambdaBase * (T1 - T0) +
      p.A * p.sigma * Math.sqrt(Math.PI / 2) * (erf((T1 - p.tPeak) / k) - erf((T0 - p.tPeak) / k));
  }
  // Lewis–Shedler thinning
  function nhppSimulate(p, T0, T1, rng) {
    const lamMax = p.lambdaBase + p.A;
    const out = []; let t = T0;
    for (;;) {
      t += expSample(lamMax, rng);
      if (t > T1) break;
      if (rng() * lamMax <= nhppRate(t, p)) out.push(t);
    }
    return out;
  }
  function homogeneousInterArrivals(lambda, n, rng) {
    const xs = new Float64Array(n);
    for (let i = 0; i < n; i++) xs[i] = expSample(lambda, rng);
    return xs;
  }
  function binCounts(times, T0, T1, width) {
    const n = Math.ceil((T1 - T0) / width); const bins = new Array(n).fill(0);
    for (const t of times) { const i = Math.floor((t - T0) / width); if (i >= 0 && i < n) bins[i]++; }
    return bins;
  }

  // ───────────────────── Mod 6 · M/M/c/K checkout locks ─────────────────────
  // c = concurrent slot holds (assigned session capacity of 3 or 4), K = max checkout sessions holding/awaiting a hold.
  function mmck(params) {
    const lambda = params.lambda, mu = params.mu;
    const c = Math.max(1, Math.round(params.c));
    const K = Math.max(c, Math.round(params.K));
    const a = lambda / mu;
    const logT = new Array(K + 1); logT[0] = 0;
    for (let n = 1; n <= K; n++) logT[n] = logT[n - 1] + Math.log(a) - Math.log(n <= c ? n : c);
    const m = Math.max(...logT);
    const w = logT.map((v) => Math.exp(v - m));
    const sum = w.reduce((s, v) => s + v, 0);
    const P = w.map((v) => v / sum);
    let L = 0, Lq = 0;
    for (let n = 0; n <= K; n++) { L += n * P[n]; if (n > c) Lq += (n - c) * P[n]; }
    const PK = P[K];
    const lambdaEff = lambda * (1 - PK);
    const Wq = lambdaEff > 0 ? Lq / lambdaEff : 0;
    const W = Wq + 1 / mu; // computed independently of L, so Little's Law is a real check
    return { a, rho: a / c, c, K, P, P0: P[0], PK, L, Lq, W, Wq, lambdaEff, utilization: lambdaEff / (c * mu) };
  }
  // Discrete-event simulation of the same system (FIFO), for cross-checking the closed form.
  function mmckSimulate(params, horizon, rng) {
    const { lambda, mu } = params; const c = Math.round(params.c), K = Math.round(params.K);
    let t = 0, nextArr = expSample(lambda, rng);
    const svc = []; const queue = [];
    let arrivals = 0, blocked = 0, area = 0, sojournSum = 0, served = 0;
    while (t < horizon) {
      let iDep = -1, tDep = Infinity;
      for (let i = 0; i < svc.length; i++) if (svc[i].dep < tDep) { tDep = svc[i].dep; iDep = i; }
      const tNext = Math.min(nextArr, tDep);
      area += (svc.length + queue.length) * (Math.min(tNext, horizon) - t);
      t = tNext; if (t >= horizon) break;
      if (nextArr <= tDep) {
        arrivals++;
        if (svc.length + queue.length >= K) blocked++;
        else if (svc.length < c) svc.push({ arr: t, dep: t + expSample(mu, rng) });
        else queue.push(t);
        nextArr = t + expSample(lambda, rng);
      } else {
        const done = svc.splice(iDep, 1)[0];
        sojournSum += t - done.arr; served++;
        if (queue.length) { const arr = queue.shift(); svc.push({ arr, dep: t + expSample(mu, rng) }); }
      }
    }
    return { PK: arrivals ? blocked / arrivals : 0, L: area / horizon, W: served ? sojournSum / served : 0, arrivals, blocked };
  }

  // ───────────────────── Mod 5 · 6-state absorbing DTMC ─────────────────────
  const STATES = ['S0 Selecting', 'S1 Slot Held (unpaid / pending verification)', 'S2 Paid (pending / confirmed / rescheduled)', 'S3 Attended', 'S4 Expired / Rejected / Cancelled', 'S5 No-Show'];
  function normRow(row, stayIdx) {
    const others = row.reduce((s, v, i) => (i === stayIdx ? s : s + v), 0);
    if (others > 1) { for (let i = 0; i < row.length; i++) if (i !== stayIdx) row[i] /= others; row[stayIdx] = 0; }
    else row[stayIdx] = 1 - others;
    return row;
  }
  function buildReservationChain(p) {
    const P = [
      normRow([0, p.pLock, 0, 0, p.pAbandon, 0], 0),
      normRow([p.pBack, 0, p.pPay, 0, p.pTimeout, 0], 1),
      normRow([0, 0, 0, p.pAttend, p.pCancel, p.pNoShow], 2),
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ];
    return P;
  }
  function identity(n) { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))); }
  function matMul(A, B) {
    return A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
  }
  function matInv(M) {
    const n = M.length; const A = M.map((r, i) => [...r, ...identity(n)[i]]);
    for (let col = 0; col < n; col++) {
      let piv = col; for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-14) throw new Error('Matrix is singular: a transient state never leaves.');
      [A[col], A[piv]] = [A[piv], A[col]];
      const d = A[col][col]; for (let j = 0; j < 2 * n; j++) A[col][j] /= d;
      for (let r = 0; r < n; r++) if (r !== col) { const f = A[r][col]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[col][j]; }
    }
    return A.map((r) => r.slice(n));
  }
  function absorbingAnalysis(P, nTransient) {
    const T = nTransient;
    const Q = P.slice(0, T).map((r) => r.slice(0, T));
    const R = P.slice(0, T).map((r) => r.slice(T));
    const IminusQ = identity(T).map((r, i) => r.map((v, j) => v - Q[i][j]));
    const N = matInv(IminusQ);
    const B = matMul(N, R);
    const t = N.map((r) => r.reduce((s, v) => s + v, 0));
    return { Q, R, N, B, t, IminusQ };
  }
  function dtmcSimulate(P, start, nTokens, rng, maxSteps) {
    const absorbed = new Array(P.length).fill(0); let steps = 0;
    for (let k = 0; k < nTokens; k++) {
      let s = start, n = 0;
      while (P[s][s] < 1 && n < (maxSteps || 10000)) {
        let u = rng(), j = 0; while (j < P.length - 1 && u > P[s][j]) { u -= P[s][j]; j++; }
        s = j; n++;
      }
      absorbed[s]++; steps += n;
    }
    return { absorbed, meanSteps: steps / nTokens };
  }

  // ───────────────────── Mod 7 · anti-scalping normal-form game ─────────────────────
  // Defender rows: D1 Rate Limit + CAPTCHA, D2 Deposit + SMS OTP. Attacker cols: A1 Sniping, A2 Lock & Abandon DoS.
  function antiScalpPayoffs(g) {
    const A = [
      [(1 - g.r) * g.V - g.cCap, (1 - 0.4 * g.r) * g.h - g.cCap],
      [g.V - g.sOtp, g.h - g.D - g.sOtp],
    ];
    const Dm = [
      [-(1 - g.r) * g.goodwill - g.f1, -(1 - 0.4 * g.r) * g.price - g.f1],
      [-g.goodwill - g.f2, 0.5 * g.D - g.f2],
    ];
    return { attacker: A, defender: Dm };
  }
  function solve2x2(Dm, A) {
    const pure = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const defBest = Dm[i][j] >= Dm[1 - i][j];
      const attBest = A[i][j] >= A[i][1 - j];
      if (defBest && attBest) pure.push([i, j]);
    }
    const den1 = A[0][0] - A[1][0] - A[0][1] + A[1][1];
    const den2 = Dm[0][0] - Dm[0][1] - Dm[1][0] + Dm[1][1];
    let mixed = null;
    if (Math.abs(den1) > 1e-12 && Math.abs(den2) > 1e-12) {
      const p = (A[1][1] - A[1][0]) / den1; // P(defender plays D1)
      const q = (Dm[1][1] - Dm[0][1]) / den2; // P(attacker plays A1)
      if (p > 0 && p < 1 && q > 0 && q < 1) {
        const EUd = q * Dm[0][0] + (1 - q) * Dm[0][1];
        const EUa = p * A[0][0] + (1 - p) * A[1][0];
        mixed = { p, q, EUd, EUa };
      }
    }
    return { pure, mixed };
  }
  function attackerBestResponse(A, p) {
    const u1 = p * A[0][0] + (1 - p) * A[1][0];
    const u2 = p * A[0][1] + (1 - p) * A[1][1];
    return { snipe: u1, dos: u2, best: Math.abs(u1 - u2) < 1e-9 ? 'indifferent' : (u1 > u2 ? 'snipe' : 'dos') };
  }

  // ───────────────────── Mod 2 & 10 · entropy and keyspace ─────────────────────
  function entropyBits(alphabet, length) { return length * Math.log2(alphabet); }
  function log10Keyspace(alphabet, length) { return length * Math.log10(alphabet); }
  // T_crack = S / (2 · R), expected seconds; returned as log10 to survive huge keyspaces.
  function log10CrackSeconds(alphabet, length, ratePerSec) {
    return log10Keyspace(alphabet, length) - Math.log10(2 * ratePerSec);
  }
  function humanizeLog10Seconds(l) {
    if (l < Math.log10(60)) return (10 ** l).toFixed(l < 0 ? 3 : 1) + ' s';
    const units = [['min', 60], ['h', 3600], ['days', 86400], ['years', 31557600]];
    let label = 'years', div = 31557600;
    for (const [u, d] of units) if (l >= Math.log10(d)) { label = u; div = d; }
    const v = l - Math.log10(div);
    if (v > 6) return '10^' + v.toFixed(1).replace(/\.0$/, '') + ' ' + label;
    return (10 ** v).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' ' + label;
  }
  const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  // Unbiased token generation with rejection sampling over a CSPRNG (crypto.getRandomValues).
  function generateToken(alphabet, length, getRandomValues) {
    const n = alphabet.length; const limit = 256 - (256 % n); let out = '';
    const buf = new Uint8Array(length * 2);
    while (out.length < length) {
      getRandomValues(buf);
      for (let i = 0; i < buf.length && out.length < length; i++) if (buf[i] < limit) out += alphabet[buf[i] % n];
    }
    return out;
  }
  function empiricalEntropyPerChar(strings) {
    const f = new Map(); let total = 0;
    for (const s of strings) for (const ch of s) { f.set(ch, (f.get(ch) || 0) + 1); total++; }
    let H = 0; for (const c of f.values()) { const p = c / total; H -= p * Math.log2(p); }
    return H;
  }

  // ───────────────────── Mod 12 · series-parallel RBD ─────────────────────
  // Recursive tree: leaf {id, name, mtbf, mttr} | {type: 'series'|'parallel', items}.
  // Payment recording has two independent routes (proposal: gateway OR GCash proof verified by an admin).
  const PIPELINE = { type: 'series', id: 'sys', name: 'Booking pipeline', items: [
    { id: 'edge', name: 'Edge / CDN', mtbf: 8760, mttr: 0.5 },
    { id: 'app', name: 'Booking web app & API', mtbf: 2200, mttr: 1 },
    { id: 'lock', name: 'Slot-hold service', mtbf: 3000, mttr: 0.5 },
    { id: 'db', name: 'Reservations database', mtbf: 5000, mttr: 2 },
    { id: 'payment', name: 'Payment recording', type: 'parallel', items: [
      { id: 'online', name: 'Online gateway route', type: 'series', items: [
        { id: 'pay', name: 'Payment gateway', mtbf: 1500, mttr: 1 },
        { id: 'hooks', name: 'Gateway status', type: 'parallel', items: [
          { id: 'wh', name: 'Primary webhook', mtbf: 400, mttr: 2 },
          { id: 'poll', name: 'Polling reconciler', mtbf: 900, mttr: 1 },
          { id: 'queue', name: 'Durable retry queue', mtbf: 1200, mttr: 1 },
        ] },
      ] },
      { id: 'gcash', name: 'GCash proof route', type: 'series', items: [
        { id: 'upload', name: 'Proof upload & storage', mtbf: 4000, mttr: 1 },
        { id: 'verify', name: 'Admin verification', mtbf: 336, mttr: 12 },
      ] },
    ] },
    { id: 'notify', name: 'Email notifications', mtbf: 1800, mttr: 1 },
  ] };
  function relExp(t, mtbf) { return Math.exp(-t / mtbf); }
  function availability(mtbf, mttr) { return mtbf / (mtbf + mttr); }
  function seriesR(rs) { return rs.reduce((s, r) => s * r, 1); }
  function parallelR(rs) { return 1 - rs.reduce((s, r) => s * (1 - r), 1); }
  // cfg: { nFallback: 1–3 gateway-status paths, gcash: include the GCash proof route, overrides: { id: {mtbf, mttr} } }
  function rbdConfigure(node, cfg) {
    if (node.items) {
      let items = node.items;
      if (node.id === 'hooks') items = items.slice(0, Math.max(1, Math.min(3, Math.round(cfg.nFallback || 1))));
      if (node.id === 'payment' && !cfg.gcash) items = items.filter((i) => i.id !== 'gcash');
      return { ...node, items: items.map((i) => rbdConfigure(i, cfg)) };
    }
    return { ...node, ...((cfg.overrides || {})[node.id] || {}) };
  }
  function rbdEval(node, t) {
    if (node.items) {
      const items = node.items.map((i) => rbdEval(i, t));
      const f = node.type === 'parallel' ? parallelR : seriesR;
      return { ...node, items, R: f(items.map((i) => i.R)), A: f(items.map((i) => i.A)) };
    }
    return { ...node, R: relExp(t, node.mtbf), A: availability(node.mtbf, node.mttr) };
  }
  function rbdEvaluate(pipeline, cfg, t) {
    const tree = rbdEval(rbdConfigure(pipeline, cfg || {}), t);
    const nodes = {}, leaves = [];
    (function walk(n) { nodes[n.id] = n; if (n.items) n.items.forEach(walk); else leaves.push(n); })(tree);
    return { tree, nodes, leaves, R: tree.R, A: tree.A };
  }

  // ───────────────────── Mod 4 · FAIR Monte Carlo (V&V support) ─────────────────────
  function gammaSample(k, rng) { // Marsaglia–Tsang
    if (k < 1) return gammaSample(k + 1, rng) * Math.pow(rng(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v; do { x = normalSample(rng); v = 1 + c * x; } while (v <= 0);
      v = v * v * v; const u = rng();
      if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function betaPertSample(a, m, b, rng) {
    const al = 1 + 4 * (m - a) / (b - a), be = 1 + 4 * (b - m) / (b - a);
    const x = gammaSample(al, rng), y = gammaSample(be, rng);
    return a + (b - a) * x / (x + y);
  }
  function lognormalSample(median, sigma, rng) { return median * Math.exp(sigma * normalSample(rng)); }
  // Mean loss per loss event: E[LM_primary] + P(secondary) · E[LM_secondary], with E[Lognormal] = median · e^(σ²/2).
  function fairMeanSeverity(f) {
    return f.lmMedian * Math.exp(f.lmSigma ** 2 / 2) + f.secProb * f.secMedian * Math.exp(f.secSigma ** 2 / 2);
  }
  function fairSimulate(f, trials, seed, vulnMultiplier) {
    const rng = mulberry32(seed); const losses = new Float64Array(trials); let sumRaw = 0, sumEvents = 0;
    const vuln = f.vuln * (vulnMultiplier == null ? 1 : vulnMultiplier);
    for (let i = 0; i < trials; i++) {
      const tef = betaPertSample(f.tefMin, f.tefMode, f.tefMax, rng);
      const events = poissonSample(tef * vuln, rng); let L = 0;
      for (let e = 0; e < events; e++) {
        L += lognormalSample(f.lmMedian, f.lmSigma, rng);
        if (rng() < f.secProb) L += lognormalSample(f.secMedian, f.secSigma, rng);
      }
      losses[i] = L; sumRaw += L; sumEvents += events;
    }
    const sorted = Float64Array.from(losses).sort();
    // ALE via conditional Monte Carlo (Rao–Blackwell): E[Loss | N] = N · E[severity]. Unbiased, lower variance.
    const ale = (sumEvents / trials) * fairMeanSeverity(f);
    return { ale, aleRaw: sumRaw / trials, p50: sorted[Math.floor(trials * 0.5)], p90: sorted[Math.floor(trials * 0.9)], p99: sorted[Math.floor(trials * 0.99)], losses };
  }
  function rosi(aleBase, aleMit, cost) { return ((aleBase - aleMit) - cost) / cost; }

  // ───────────────────── V&V (guide §6 contract + model checks) ─────────────────────
  function runInvariantChecks(params) {
    const expectedInterArrival = 1 / params.lambda;
    const poissonError = Math.abs(params.simulatedMeanInterArrival - expectedInterArrival) / expectedInterArrival;
    const littlesLawDiff = Math.abs(params.meanQueueLength - params.lambdaEff * params.meanWaitTime);
    const isRowStochastic = params.transitionMatrix.every((row) => Math.abs(row.reduce((s, v) => s + v, 0) - 1.0) < 1e-5);
    const fairConvergenceDiff = Math.abs(params.aleSeedA - params.aleSeedB) / (params.aleSeedA || 1);
    return [
      { target: 'Poisson Arrival Invariant', standard: 'Mean inter-arrival matches 1/λ within ±2.0%', measured: `Error: ${(poissonError * 100).toFixed(2)}%`, passed: poissonError < 0.02 },
      { target: "Little's Law Conservation", standard: '|L − (λ_eff · W)| < 10⁻⁵ across buffer states', measured: `Diff: ${littlesLawDiff.toExponential(2)}`, passed: littlesLawDiff < 1e-5 },
      { target: 'Markov Row-Stochasticity', standard: 'Σ P_ij = 1.0 for all states i in S', measured: isRowStochastic ? 'All rows = 1.0000' : 'Row sum mismatch', passed: isRowStochastic },
      { target: 'FAIR Monte Carlo Convergence', standard: 'ALE converges within ±1.5% across 10,000 trials', measured: `Variance: ${(fairConvergenceDiff * 100).toFixed(2)}%`, passed: fairConvergenceDiff < 0.015 },
    ];
  }
  function runModelChecks(m) {
    const out = [];
    const sumP = m.queue.P.reduce((s, v) => s + v, 0);
    out.push({ target: 'M/M/c/K Normalisation', standard: 'Σ Pₙ = 1 for n = 0…K', measured: `Σ = ${sumP.toFixed(10)}`, passed: Math.abs(sumP - 1) < 1e-9 });
    const simGap = Math.abs(m.queueSim.PK - m.queue.PK);
    out.push({ target: 'P_drop Closed Form vs Simulation', standard: '|P_K(sim) − P_K| < 0.02', measured: `sim ${m.queueSim.PK.toFixed(4)} vs ${m.queue.PK.toFixed(4)}`, passed: simGap < 0.02 });
    const I = matMul(m.dtmc.N, m.dtmc.IminusQ); let err = 0;
    I.forEach((r, i) => r.forEach((v, j) => { err = Math.max(err, Math.abs(v - (i === j ? 1 : 0))); }));
    out.push({ target: 'Fundamental Matrix Inverse', standard: 'N · (I − Q) = I, max error < 10⁻⁹', measured: `max err ${err.toExponential(2)}`, passed: err < 1e-9 });
    const bOk = m.dtmc.B.every((r) => Math.abs(r.reduce((s, v) => s + v, 0) - 1) < 1e-9);
    out.push({ target: 'Absorption Certainty', standard: 'Each row of B = N · R sums to 1', measured: bOk ? 'All rows = 1.0000' : 'Row sum mismatch', passed: bOk });
    const g = m.game; let ok = true, msg = 'pure NE only';
    if (g.solution.mixed) {
      const br = attackerBestResponse(g.payoffs.attacker, g.solution.mixed.p);
      const q = g.solution.mixed.q, D = g.payoffs.defender;
      const d1 = q * D[0][0] + (1 - q) * D[0][1], d2 = q * D[1][0] + (1 - q) * D[1][1];
      const gap = Math.max(Math.abs(br.snipe - br.dos), Math.abs(d1 - d2));
      ok = gap < 1e-6; msg = `max gap ₱${gap.toExponential(1)}`;
    } else ok = g.solution.pure.length > 0;
    out.push({ target: 'Nash Indifference', standard: 'At (p*, q*) each player is indifferent between pure strategies', measured: msg, passed: ok });
    const h4 = entropyBits(10, 4), h12 = entropyBits(62, 12);
    out.push({ target: 'Token Entropy Reference', standard: '4-digit ≈ 13.3 bits, 12-char alphanumeric ≈ 71.4 bits', measured: `${h4.toFixed(2)} / ${h12.toFixed(2)} bits`, passed: Math.abs(h4 - 13.29) < 0.01 && Math.abs(h12 - 71.45) < 0.01 });
    const par = Object.values(m.rbd.nodes).filter((n) => n.type === 'parallel');
    const domOk = par.every((n) => n.R >= Math.max(...n.items.map((i) => i.R)) - 1e-12);
    const top = m.rbd.tree.items; const serOk = m.rbd.R <= Math.min(...top.map((b) => b.R)) + 1e-12;
    const pay = m.rbd.nodes.payment;
    out.push({ target: 'Redundancy Dominance', standard: 'Every parallel group ≥ its best path; R_sys ≤ weakest series block', measured: `payment ${pay.R.toFixed(4)} ≥ ${Math.max(...pay.items.map((i) => i.R)).toFixed(4)}`, passed: domOk && serOk });
    const nh = m.nhpp; const rel = Math.abs(nh.simCount - nh.expected) / nh.expected;
    out.push({ target: 'NHPP Expected Count', standard: 'Thinning count within ±3·√Λ of Λ = ∫λ(t)dt', measured: `${nh.simCount} vs Λ = ${nh.expected.toFixed(1)}`, passed: Math.abs(nh.simCount - nh.expected) <= 3 * Math.sqrt(nh.expected), rel });
    return out;
  }

  // Baseline parameters. Proposal facts: Thu–Sat, 2 sessions/day (9:00, 10:15 AM), capacity 3 or 4 (max 4), ₱500 fee + ₱50 mat.
  // Release timing, arrival rates, hold time and probabilities are modelling assumptions (see CODEX › Proposal grounding).
  const DEFAULTS = {
    nhpp: { lambdaBase: 0.3, A: 6, tPeak: 2, sigma: 4, T0: -10, T1: 40 }, // attempts/min, minutes after the weekly release
    queue: { lambda: 4, mu: 1 / 2, c: 4, K: 8 }, // attempts/min, 1/(payment hold min), c = 4-client session cap
    dtmc: { pLock: 0.55, pAbandon: 0.10, pBack: 0.05, pPay: 0.60, pTimeout: 0.12, pAttend: 0.30, pCancel: 0.03, pNoShow: 0.05 },
    game: { V: 200, h: 250, r: 0.6, cCap: 20, sOtp: 80, D: 200, goodwill: 250, price: 500, f1: 30, f2: 100 }, // ₱ per weekly release; price = ₱500 session fee
    entropy: { rate: 10 }, // guesses per second
    rbd: { nFallback: 1, gcash: 1, t: 168, whMtbf: 400 }, // hours (one week between session openings); gcash 1 = route enabled
    // Loss events per year from abuse of the 52 weekly session openings; ₱ per event; secondary = RA 10173 cost (client health disclosures are sensitive personal information).
    fair: { tefMin: 12, tefMode: 26, tefMax: 52, vuln: 0.4, lmMedian: 4000, lmSigma: 0.5, secProb: 0.05, secMedian: 100000, secSigma: 0.5, controlEff: 0.6, controlCost: 40000 },
  };

  const api = {
    DEFAULTS, mulberry32, clamp, expSample, normalSample, poissonSample, erf,
    nhppRate, nhppExpected, nhppSimulate, homogeneousInterArrivals, binCounts,
    mmck, mmckSimulate,
    STATES, buildReservationChain, absorbingAnalysis, dtmcSimulate, matMul, matInv, identity,
    antiScalpPayoffs, solve2x2, attackerBestResponse,
    entropyBits, log10Keyspace, log10CrackSeconds, humanizeLog10Seconds, ALNUM, generateToken, empiricalEntropyPerChar,
    PIPELINE, relExp, availability, seriesR, parallelR, rbdConfigure, rbdEvaluate,
    betaPertSample, lognormalSample, fairMeanSeverity, fairSimulate, rosi,
    runInvariantChecks, runModelChecks,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QM = api;
})(typeof self !== 'undefined' ? self : this);
