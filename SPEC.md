# SPEC.md: Block 69 Pilates QMODSIM artifact

Persistent anchor for the Block 69 Pilates booking-resilience simulator. Every engine, view, and test must trace back to a row here.

## 1. Scope
A single-page web app with three archetypes (SCENARIOS, LAB, CODEX) and a Verification & Validation drawer. It models Group 6's proposed Block 69 Cafe Pilates booking system (November 2026 proposal) during the weekly session opening. The system runs Thu–Sat, 9:00–9:50 and 10:15–11:05 AM, with an assigned capacity of 3 or 4 (max 4) and ₱500 + optional ₱50 mat. Payment is by gateway or by GCash proof verified by an admin, and payment status is separate from booking status. Admin approval, attendance marking and email notifications are part of the flow.

## 2. Assumptions surfaced before coding
| Topic | Assumption |
|---|---|
| Time unit | Minutes for arrivals and queues; hours for reliability; 1 DTMC step = one booking-state check |
| Currency | Philippine pesos (₱), per slot drop for the game, per year for FAIR |
| Capacity | Proposal: assigned capacity 3 or 4, never above 4 → c = 4 concurrent slot holds (professor's c = 4); LAB slider limited to 3–4 |
| Opening | Proposal: admin opens sessions in advance. Assumption: all 6 weekly sessions open at one time (timing not specified) |
| Payments | Proposal: online gateway OR GCash proof upload with manual admin verification → two parallel routes in the RBD |
| Fees | Proposal: ₱500 per session, ₱50 optional mat → p_slot = ₱500 |
| Lifecycle | Proposal: booking pending / confirmed / rescheduled / rejected / cancelled; payment unpaid / pending verification / paid; attendance marked by admin |
| Arrivals | Poisson within each instant; intensity varies with time (NHPP); queue uses the pointwise stationary approximation under λ(t) |
| Service | Assumption: exponential payment hold time, mean 2 min |
| Reliability | Constant failure rate per block (exponential life); MTBF/MTTR values are planning assumptions, not vendor SLAs |
| Statute | RA 10173 (Data Privacy Act of 2012), incl. Sec. 3(l)/13 for the health disclosures collected at registration; NPC Circular 16-03 (72-hour breach notification) |
| Randomness | Seeded mulberry32 for reproducible simulation; `crypto.getRandomValues` for any security token |

## 3. Module contracts (src/engines/qmodsim.js)
| Module | Inputs | Formula | Outputs |
|---|---|---|---|
| Mod 1·3 NHPP | λ_base, A, t_peak, σ, [T₀,T₁] | λ(t) = λ_base + A·exp(−(t−t_peak)²/(2σ²)); Λ via erf; thinning | λ(t), Λ, arrival times |
| Mod 6 M/M/c/K | λ, μ, c, K | Birth–death product form (log-space) | Pₙ, P_K = P_drop, L, L_q, W, W_q, λ_eff, ρ |
| Mod 5 DTMC | 8 transition probabilities | P = [Q R; 0 I], N = (I−Q)⁻¹, B = N·R, t = N·1 | P, N, B, t |
| Mod 7 Game | G, H, r, c_cap, c_otp, F, g, p_bed, f₁, f₂ | 2×2 bimatrix; pure-NE scan + indifference mixed NE | payoffs, p*, q*, expected values |
| Mod 2·10 Entropy | |Σ|, L, R | H = L·log₂|Σ|, S = |Σ|^L, T = S/(2R) | bits, log₁₀ S, T_crack, CSPRNG tokens |
| Mod 12 RBD | MTBF/MTTR per block, n status paths, GCash route on/off, t | Recursive series/parallel tree; R = e^(−t/MTBF), series Π, parallel 1−Π(1−R), A = MTBF/(MTBF+MTTR) | R_sys(t), A_sys, R_payment, node tree |
| Mod 4 FAIR | PERT TEF, V, lognormal LM, P_sec, control e and cost | Compound Poisson; ALE by conditional MC (Rao–Blackwell) | ALE, P50/P90/P99, histogram, ROSI |

## 4. Views
- **SCENARIOS**: (1) Weekly session opening, (2) Scalper bot swarm, (3) Payment webhook outage. Each fork mutates engine inputs and recomputes the telemetry chart and readout table (before vs after). "Open in LAB" passes the parameters to LAB.
- **LAB**: one workspace per module, with clamped sliders labelled in Block 69 terms, theme-reactive canvases redrawn every frame, a live slot-hold animation, an animated Markov graph, fictitious play, a brute-force race, and FAIR in a Web Worker.
- **CODEX**: derivations, parameter/unit tables, Unicode equations (no LaTeX), the RA 10173 crosswalk, and V&V standards.

## 5. Verification standards
Guide §6 contract (Poisson ±2%, Little < 10⁻⁵, row sums, FAIR ±1.5%) plus 8 model checks; see CODEX › V&V standards. All must pass at baseline (currently 12/12 in-app, 18/18 unit tests).

## 6. Out of scope / known gaps
- Written in plain JavaScript with `node:test` because this build environment had no package install. Porting to strict TypeScript + Vitest (guide Phase 2–3) is a follow-up for the team repo.
- Module 11 (anomaly detection) is not part of the professor's checklist for this group and is not implemented.
