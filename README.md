# Block 69 Pilates · QMODSIM booking-resilience lab

Interactive single-page simulator for the Block 69 Cafe Pilates booking system: SCENARIOS, LAB, CODEX, and an in-app Verification & Validation drawer.

- **Live app:** _add your GitHub Pages / Vercel URL here_ (deploy `dist/index.html`; it is fully self-contained)
- **AI usage log:** [AI_USAGE.md](AI_USAGE.md) · **Spec:** [SPEC.md](SPEC.md)
- **Team:** _add roster_

## Run and test
```bash
node --test tests/          # 18 engine invariant tests, no dependencies
python3 build.py            # writes dist/index.html
open dist/index.html        # or serve it with any static host
```

## Proposal-to-module mapping
| Module | Block 69 stressor | Model |
|---|---|---|
| Mod 1 · 3 | Sunday 8:00 PM slot-drop burst | NHPP, Gaussian intensity peak, exponential inter-arrivals |
| Mod 6 | Bed-lock checkout saturation | M/M/c/K, c = 4 reformer beds, P_drop = P_K, lock hold latency W |
| Mod 5 | Reservation lifecycle | 6-state absorbing DTMC (S0 Selecting … S5 No-Show), N = (I − Q)⁻¹ |
| Mod 7 | Scalpers vs studio controls | 2 × 2 game: Sniping / Lock & Abandon DoS vs Rate Limit + CAPTCHA / Deposit + SMS OTP; mixed Nash |
| Mod 2 · 10 | Booking-code enumeration | Shannon entropy: 4-digit ≈ 13.3 bits vs 12-char alphanumeric ≈ 71.4 bits |
| Mod 12 | Payment confirmation failure | Series RBD with redundant webhook fallbacks |
| Mod 4 | Annual abuse loss (V&V) | FAIR Monte Carlo, 10,000 trials in a Web Worker |

## Layout
```
src/engines/qmodsim.js   pure math engines (browser, worker, Node)
src/ui/app.js            views, canvases, scenarios, V&V drawer
src/index.template.html  shell + design tokens (light/dark)
src/codex.html           CODEX reference content
tests/qmodsim.test.js    node:test invariant suite
dist/index.html          built single-file app
```
