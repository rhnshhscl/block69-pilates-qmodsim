# AI_USAGE.md

> Draft written by the AI agent from the actual build session. Sections marked **TEAM** must be completed or confirmed by the group before submission.

## 1. Agentic environment & model rationale
- **Agent / model:** Claude (Anthropic), model Claude Opus 5.5, in the Claude app's agentic workspace (Claude Code-based harness with shell, file tools, and a headless Chrome for browser audits).
- **Why:** It could run the engine unit tests (`node --test`) and a headless browser audit in the same session that wrote the code, so every claim in the UI was checked against executable tests before publishing.
- **TEAM:** add the agent(s) you use for further work in your own repo and why.

## 2. Skills activated & OWASP Agentic Skills Top 10 vetting log
| Skill / playbook | Source | Used for | OWASP Agentic Top 10 vetting |
|---|---|---|---|
| Superpowers (using-superpowers) | obra/superpowers, preinstalled in the agent | Gate discipline: spec → tests → implementation → verification | **TEAM:** confirm inspection |
| Artifact design & pages guide | Built into the agent's publishing tool | Theme tokens, layout, and CSP rules for the published page | Platform-provided |
| **TEAM** | e.g. Taste Skill, Hallmark, mattpocock/skills, cloudflare/security-audit-skill | | Inspect each SKILL.md for prompt injection, shell commands, and secret exfiltration before installing |

## 3. Phase-by-phase prompt & refinement log

### Refinement Iteration 01: FAIR convergence failed the ±1.5% invariant
- **SE phase:** Phase 3 (TDD)
- **Flaw detected:** The unit test `FAIR ALE converges within 1.5% across two 10,000-trial seeds` failed: seed 101 gave ₱75,067 and seed 202 gave ₱73,683, a 1.84% gap. Rare, large secondary (RA 10173) losses dominated the variance.
- **Surgical refinement:** "Keep the per-trial loss simulation for the histogram and percentiles, but estimate ALE by conditional Monte Carlo: average N · E[severity] using the closed-form lognormal mean. Rebase TEF on 52 weekly drops. Add tests for unbiasedness against the analytic E[TEF]·V·E[S] and for ≥ 98/100 seed pairs passing."
- **Verification outcome:** 18/18 tests pass. The in-app gap is 0.71% at baseline. The Rao–Blackwell ALE agrees with the analytic value within 0.5% at 200,000 trials.

### Refinement Iteration 02: CODEX claim did not match the tested game convention
- **SE phase:** Phase 3 / Phase 5 (review)
- **Flaw detected:** The CODEX text said the general 2×2 solver reproduces the guide's p* = C/(G+F), q* = G/(G+F). The unit test, with the defender losing only G to undetected cheating, returned P(cheat) = C/G.
- **Surgical refinement:** "Make the special case explicit: undetected cheating costs the defender G + F. Change the test to assert P(cheat) = C/(G+F) and P(audit) = G/(G+F), and rewrite the CODEX sentence to state the mapping to the guide's p*/q* labels."
- **Verification outcome:** The test passes with exact equality (< 10⁻¹²). CODEX and the tests now state the same thing.

### Refinement Iteration 03: Browser audit found clipped telemetry labels
- **SE phase:** Phase 5 (browser & theme audit)
- **Flaw detected:** Headless Chrome screenshots of every view showed four problems. Entropy-bar names were truncated inside short bars ("4-digit booking P…"). The RBD "member" label was hidden under the first block. The Σ column of the DTMC P table was cut off. The DTMC Monte Carlo bars showed 100% Expired after only 4 absorbed tokens.
- **Surgical refinement:** "Put the entropy row labels above the bars and flip the stats label inside the bar only when it would overflow. Add a 58 px gutter to the RBD for the endpoint labels. Tighten matrix cell padding. Hide the empirical bars until 50 tokens have been absorbed."
- **Verification outcome:** Re-rendered with no console errors and 12/12 V&V checks passing in light and dark themes.

### Refinement Iteration 04: Parameters not grounded in the proposal
- **SE phase:** Phase 1 (requirements) revisited
- **Flaw detected:** A review against Group 6's Chapters 1–2 found the first build had invented domain facts. It assumed reformer beds (the proposal is mat Pilates), a Sunday 8:00 PM release, a ₱950 class price (the proposal says ₱500 + ₱50 mat), SMS confirmations (the proposal uses email and in-app notifications) and guest booking lookups (the proposal requires client accounts). It also omitted the admin-review step and the health disclosures, which are sensitive personal information under RA 10173.
- **Surgical refinement:** "Rebase DEFAULTS on proposal facts (c = 4, p_slot = ₱500, Thu–Sun 2×/day). Relabel states S1 Slot Held, S2 Paid (pending/confirmed), S4 Expired/Cancelled (incl. admin decline). Rename pipeline blocks. Add a CODEX 'Proposal grounding' table that marks every value as Proposal or Assumption. Add RA 10173 Sec. 3(l)/13 rows for health data."
- **Verification outcome:** 18/18 unit tests pass with the new defaults. The game keeps an interior mixed equilibrium (p* ≈ 0.577, q* ≈ 0.651). V&V is 12/12, and no stale terms remain in the built page.

### Refinement Iteration 05: Proposal revision changed the domain model
- **SE phase:** Phase 1 (requirements change)
- **Flaw detected:** The group's November proposal changed several rules the simulator depended on. Sessions now run Thu–Sat (6 per week, not 8). Clients can pay through the gateway or by uploading GCash proof that an admin verifies. Payment status is unpaid / pending verification / paid. Booking status adds rescheduled and rejected. Admins open sessions in advance and mark attendance. Notifications are email only. The simulator still showed Thu–Sun, a single payment route and in-app notifications, and allowed c up to 8.
- **Surgical refinement:** "Turn the RBD into a recursive series-parallel tree with payment recording = [gateway → (webhook ∥ polling ∥ queue)] ∥ [proof upload → admin verification]. Add a GCash route control and a Scenario 3 fork for it. Relabel the DTMC states to the new payment and booking statuses, with admin-marked attendance for S3/S5. Limit the c slider to 3–4. Update CODEX grounding with section citations, and add RA 10173 rows for GCash screenshots."
- **Verification outcome:** 18 unit tests pass, including new checks that R_payment = 1 − (1 − R_online)(1 − R_gcash) and that adding the GCash route raises R_sys. V&V is 12/12 with the updated redundancy-dominance check across all parallel groups.

**TEAM:** add your own iterations from further development (TypeScript compiler errors, Vitest failures, security audit findings).

## 4. Code attribution matrix
| File | Origin | Team refactor | Notes |
|---|---|---|---|
| `src/engines/qmodsim.js` | Agent-generated | **TEAM** | Pure math, no DOM |
| `tests/qmodsim.test.js` | Agent-generated | **TEAM** | 18 invariant tests |
| `src/ui/app.js` | Agent-generated | **TEAM** | Views, canvases, V&V drawer |
| `src/index.template.html`, `src/codex.html` | Agent-generated | **TEAM** | Layout, design tokens, CODEX |
| `build.py` | Agent-generated | | Inlines everything into `dist/index.html` |
| Hand-authored verification routines | **TEAM** | | List any checks you write or re-derive by hand |
