# SPEC.md: Block 69 Pilates QMODSIM artifact

Persistent anchor for the Block 69 Pilates booking-resilience simulator. Every engine, view, and test must trace back to a row here.

## 1. Scope
A single-page web app with three archetypes (SCENARIOS, LAB, CODEX) and a Verification & Validation drawer. It models the Block 69 Cafe reformer-class booking system during the Sunday 8:00 PM weekly slot drop.

## 2. Assumptions surfaced before coding
| Topic | Assumption |
|---|---|
| Time unit | Minutes for arrivals and queues; hours for reliability; 1 DTMC step = one booking-state check |
| Currency | Philippine pesos (₱), per slot drop for the game, per year for FAIR |
| Beds | 4 reformer beds per class → c = 4 concurrent bed-lock checkouts |
| Arrivals | Poisson within each instant; intensity varies with time (NHPP); queue uses the pointwise stationary approximation under λ(t) |
| Service | Exponential lock hold time, mean 90 s baseline |
| Reliability | Constant failure rate per block (exponential life); MTBF/MTTR values are planning assumptions, not vendor SLAs |
| Statute | RA 10173 (Data Privacy Act of 2012) and NPC Circular 16-03 (72-hour breach notification) |
| Randomness | Seeded mulberry32 for reproducible simulation; `crypto.getRandomValues` for any security token |

## 3. Module contracts (src/engines/qmodsim.js)
| Module | Inputs | Formula | Outputs |
|---|---|---|---|
| Mod 1·3 NHPP | λ_base, A, t_peak, σ, [T₀,T₁] | λ(t) = λ_base + A·exp(−(t−t_peak)²/(2σ²)); Λ via erf; thinning | λ(t), Λ, arrival times |
| Mod 6 M/M/c/K | λ, μ, c, K | Birth–death product form (log-space) | Pₙ, P_K = P_drop, L, L_q, W, W_q, λ_eff, ρ |
| Mod 5 DTMC | 8 transition probabilities | P = [Q R; 0 I], N = (I−Q)⁻¹, B = N·R, t = N·1 | P, N, B, t |
| Mod 7 Game | G, H, r, c_cap, c_otp, F, g, p_bed, f₁, f₂ | 2×2 bimatrix; pure-NE scan + indifference mixed NE | payoffs, p*, q*, expected values |
| Mod 2·10 Entropy | |Σ|, L, R | H = L·log₂|Σ|, S = |Σ|^L, T = S/(2R) | bits, log₁₀ S, T_crack, CSPRNG tokens |
| Mod 12 RBD | MTBF/MTTR per block, n paths, t | R = e^(−t/MTBF), series Π, parallel 1−Π(1−R), A = MTBF/(MTBF+MTTR) | R_sys(t), A_sys, block states |
| Mod 4 FAIR | PERT TEF, V, lognormal LM, P_sec, control e and cost | Compound Poisson; ALE by conditional MC (Rao–Blackwell) | ALE, P50/P90/P99, histogram, ROSI |

## 4. Views
- **SCENARIOS**: (1) Sunday 8:00 PM slot drop, (2) Scalper bot swarm, (3) Payment webhook outage. Each fork mutates engine inputs and recomputes the telemetry chart and readout table (before vs after). "Open in LAB" passes the parameters to LAB.
- **LAB**: one workspace per module, with clamped sliders labelled in Block 69 terms, theme-reactive canvases redrawn every frame, a live bed-lock animation, an animated Markov graph, fictitious play, a brute-force race, and FAIR in a Web Worker.
- **CODEX**: derivations, parameter/unit tables, Unicode equations (no LaTeX), the RA 10173 crosswalk, and V&V standards.

## 5. Verification standards
Guide §6 contract (Poisson ±2%, Little < 10⁻⁵, row sums, FAIR ±1.5%) plus 8 model checks; see CODEX › V&V standards. All must pass at baseline (currently 12/12 in-app, 18/18 unit tests).

## 6. Out of scope / known gaps
- Written in plain JavaScript with `node:test` because this build environment had no package install. Porting to strict TypeScript + Vitest (guide Phase 2–3) is a follow-up for the team repo.
- Module 11 (anomaly detection) is not part of the professor's checklist for this group and is not implemented.
