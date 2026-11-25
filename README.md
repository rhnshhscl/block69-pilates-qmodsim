# Block 69 Pilates · QMODSIM

An interactive defense artifact by Group 6, III-CINS, University of Makati.

**Roster:** Rona De Leon, Jemlyn Kizzeah Delariman, Rheneshia Crystel Escalo, James Bon Soriano

| Proposal workflow | QMODSIM model |
| --- | --- |
| Rush for limited mats | Poisson arrivals and finite M/M/c/K checkout |
| Payment and hold expiry | Discrete-event replay and absorbing Markov lifecycle |
| PayMongo interruption and manual review | Changed checkout rates and a compound annual loss model |
| Administrator cancellation and client transfers | Scenario replay initialized with transferred confirmations |
| Account, receipt, and health data | RA 10173 crosswalk in Codex |

Serve the static site with `python3 -m http.server 8000 --directory dist` and visit http://localhost:8000. Run `node verify.mjs` for model checks. No build or package installation is required. See [SPEC.md](SPEC.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), and [AI_USAGE.md](AI_USAGE.md).

Assumptions are synthetic. Checkout timing and annual losses are illustrative. The site is a simulation of proposal operations.

Hosted application: https://block69-qmodsim-group6-umak.miniaturebolt5.chatgpt.site

Browser QA covered choosing the Saturday rush mitigation, adjusting capacity, playing the booking replay, switching theme, running the reduced-frequency annual loss simulation, opening verification, and reaching the Codex privacy table. Terminal checks cover 162 parameter combinations and all three scenario comparisons.
