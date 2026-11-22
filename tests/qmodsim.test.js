// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const QM = require('../src/engines/qmodsim.js');
const D = QM.DEFAULTS;

test('Mod 1/3: homogeneous inter-arrival mean matches 1/λ within 2%', () => {
  const xs = QM.homogeneousInterArrivals(4, 50000, QM.mulberry32(7));
  const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
  assert.ok(Math.abs(mean - 0.25) / 0.25 < 0.02, `mean ${mean}`);
});

test('Mod 1/3: NHPP closed-form Λ matches numeric integral and thinning', () => {
  const p = D.nhpp; let num = 0; const dt = 0.001;
  for (let t = p.T0; t < p.T1; t += dt) num += QM.nhppRate(t + dt / 2, p) * dt;
  const L = QM.nhppExpected(p, p.T0, p.T1);
  assert.ok(Math.abs(num - L) < 1e-3, `${num} vs ${L}`);
  let tot = 0; const runs = 400; const rng = QM.mulberry32(3);
  for (let i = 0; i < runs; i++) tot += QM.nhppSimulate(p, p.T0, p.T1, rng).length;
  assert.ok(Math.abs(tot / runs - L) / L < 0.02);
});

test('Mod 6: M/M/c/K probabilities sum to 1 and Little holds', () => {
  for (const K of [4, 6, 10, 30]) for (const lambda of [0.5, 2.5, 6, 40]) {
    const q = QM.mmck({ ...D.queue, lambda, K });
    assert.ok(Math.abs(q.P.reduce((s, v) => s + v, 0) - 1) < 1e-12);
    assert.ok(Math.abs(q.L - q.lambdaEff * q.W) < 1e-9, `K=${K} λ=${lambda}`);
  }
});

test('Mod 6: M/M/c/c reduces to Erlang-B', () => {
  const a = 3, c = 4; let B = 1; for (let k = 1; k <= c; k++) B = (a * B) / (k + a * B);
  const q = QM.mmck({ lambda: 3, mu: 1, c, K: c });
  assert.ok(Math.abs(q.PK - B) < 1e-12);
});

test('Mod 6: closed form agrees with discrete-event simulation', () => {
  const q = QM.mmck(D.queue);
  const s = QM.mmckSimulate(D.queue, 60000, QM.mulberry32(11));
  assert.ok(Math.abs(s.PK - q.PK) < 0.01, `${s.PK} vs ${q.PK}`);
  assert.ok(Math.abs(s.L - q.L) / q.L < 0.03);
});

test('Mod 6: overflow-safe at extreme load', () => {
  const q = QM.mmck({ lambda: 500, mu: 0.1, c: 4, K: 200 });
  assert.ok(Number.isFinite(q.PK) && q.PK > 0.99);
});

test('Mod 5: chain is row-stochastic, N(I−Q)=I, B rows sum to 1', () => {
  const P = QM.buildReservationChain(D.dtmc);
  P.forEach((r) => assert.ok(Math.abs(r.reduce((s, v) => s + v, 0) - 1) < 1e-12));
  const a = QM.absorbingAnalysis(P, 3);
  a.B.forEach((r) => assert.ok(Math.abs(r.reduce((s, v) => s + v, 0) - 1) < 1e-12));
  const I = QM.matMul(a.N, a.IminusQ);
  I.forEach((r, i) => r.forEach((v, j) => assert.ok(Math.abs(v - (i === j ? 1 : 0)) < 1e-12)));
});

test('Mod 5: Monte Carlo absorption matches B', () => {
  const P = QM.buildReservationChain(D.dtmc); const a = QM.absorbingAnalysis(P, 3);
  const n = 40000; const s = QM.dtmcSimulate(P, 0, n, QM.mulberry32(5));
  [3, 4, 5].forEach((k, j) => assert.ok(Math.abs(s.absorbed[k] / n - a.B[0][j]) < 0.01));
  assert.ok(Math.abs(s.meanSteps - a.t[0]) / a.t[0] < 0.02);
});

test('Mod 5: oversized exits are renormalised, never negative', () => {
  const P = QM.buildReservationChain({ ...D.dtmc, pLock: 0.9, pAbandon: 0.5 });
  assert.ok(P[0].every((v) => v >= 0));
  assert.ok(Math.abs(P[0].reduce((s, v) => s + v, 0) - 1) < 1e-12);
});

test('Mod 7: default anti-scalping game has an interior mixed NE with indifference', () => {
  const pay = QM.antiScalpPayoffs(D.game); const sol = QM.solve2x2(pay.defender, pay.attacker);
  assert.equal(sol.pure.length, 0);
  assert.ok(sol.mixed);
  const br = QM.attackerBestResponse(pay.attacker, sol.mixed.p);
  assert.ok(Math.abs(br.snipe - br.dos) < 1e-9);
});

test('Mod 7: inspection-game special case gives P(cheat) = C/(G+F), P(audit) = G/(G+F)', () => {
  // Attacker: cheat vs honest; defender: audit vs not. G gain, F fine, C audit cost; undetected cheating costs G + F.
  const G = 50, F = 150, C = 40;
  const A = [[-F, 0], [G, 0]]; // rows: audit, no audit ; cols: cheat, honest
  const Dm = [[-C, -C], [-(G + F), 0]];
  const sol = QM.solve2x2(Dm, A);
  assert.ok(Math.abs(sol.mixed.p - G / (G + F)) < 1e-12); // guide's q*: P(audit)
  assert.ok(Math.abs(sol.mixed.q - C / (G + F)) < 1e-12); // guide's p*: P(cheat)
});

test('Mod 2/10: entropy references', () => {
  assert.ok(Math.abs(QM.entropyBits(10, 4) - 13.2877) < 1e-3);
  assert.ok(Math.abs(QM.entropyBits(62, 12) - 71.45) < 1e-2);
  assert.ok(Math.abs(QM.log10CrackSeconds(10, 4, 10) - Math.log10(500)) < 1e-12);
});

test('Mod 2/10: token generator is unbiased and uses the alphabet only', () => {
  const crypto = require('node:crypto');
  const toks = Array.from({ length: 4000 }, () => QM.generateToken(QM.ALNUM, 12, (b) => crypto.getRandomValues(b)));
  assert.ok(toks.every((t) => t.length === 12 && /^[A-Za-z0-9]+$/.test(t)));
  const H = QM.empiricalEntropyPerChar(toks);
  assert.ok(Math.abs(H - Math.log2(62)) < 0.01, `H/char ${H}`);
});

test('Mod 12: series/parallel algebra and redundancy benefit', () => {
  assert.ok(Math.abs(QM.parallelR([0.9, 0.9]) - 0.99) < 1e-12);
  assert.ok(Math.abs(QM.seriesR([0.9, 0.9]) - 0.81) < 1e-12);
  const r1 = QM.rbdEvaluate(QM.PIPELINE, 1, 168), r3 = QM.rbdEvaluate(QM.PIPELINE, 3, 168);
  assert.ok(r3.R > r1.R && r3.A > r1.A);
});

test('Mod 4: FAIR ALE converges within 1.5% across two 10,000-trial seeds', () => {
  const a = QM.fairSimulate(D.fair, 10000, 101).ale, b = QM.fairSimulate(D.fair, 10000, 202).ale;
  assert.ok(Math.abs(a - b) / a < 0.015, `${a} vs ${b}`);
});

test('Mod 4: Rao–Blackwell ALE is unbiased vs raw mean and analytic E[TEF]·V·E[S]', () => {
  const f = D.fair; const r = QM.fairSimulate(f, 200000, 9);
  const analytic = ((f.tefMin + 4 * f.tefMode + f.tefMax) / 6) * f.vuln * QM.fairMeanSeverity(f);
  assert.ok(Math.abs(r.ale - analytic) / analytic < 0.005, `${r.ale} vs ${analytic}`);
  assert.ok(Math.abs(r.aleRaw - analytic) / analytic < 0.01);
});

test('Mod 4: convergence holds for ≥ 98% of 100 independent seed pairs', () => {
  let pass = 0;
  for (let s = 1; s <= 100; s++) {
    const a = QM.fairSimulate(D.fair, 10000, s).ale, b = QM.fairSimulate(D.fair, 10000, s + 5000).ale;
    if (Math.abs(a - b) / a < 0.015) pass++;
  }
  assert.ok(pass >= 98, `passed ${pass}/100`);
});

test('V&V: guide contract returns four passing results at defaults', () => {
  const xs = QM.homogeneousInterArrivals(D.queue.lambda, 50000, QM.mulberry32(42));
  const q = QM.mmck(D.queue);
  const res = QM.runInvariantChecks({
    lambda: D.queue.lambda, simulatedMeanInterArrival: xs.reduce((s, v) => s + v, 0) / xs.length,
    meanQueueLength: q.L, lambdaEff: q.lambdaEff, meanWaitTime: q.W,
    transitionMatrix: QM.buildReservationChain(D.dtmc),
    aleSeedA: QM.fairSimulate(D.fair, 10000, 101).ale, aleSeedB: QM.fairSimulate(D.fair, 10000, 202).ale,
  });
  assert.equal(res.length, 4);
  res.forEach((r) => assert.ok(r.passed, r.target + ' ' + r.measured));
});
