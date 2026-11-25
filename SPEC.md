# Block 69 Pilates QMODSIM specification

- Source of business rules: Group 6 PBL proposal, Chapters 1–2.
- Source of presentation and verification requirements: QMODSIM Student Guide.
- Real parameters: three or four mats, 15-minute hold, Thu–Sat 9:00 and 10:15 AM PHT sessions, ₱500 / optional ₱50 mat.
- Synthetic parameters: Poisson arrivals, exponential payment times, checkout lanes, manual routing and approval percentages, annual incident frequency, and loss magnitude. No fitted operational dataset was provided.
- Scenario forks: reduce modeled repeat arrivals, activate modeled manual payment fallback, or distribute two transfers across eligible sessions. Each fork recalculates deterministic seeded telemetry.
- Queue model is finite M/M/c/K steady state. The booking replay separately models the finite hour, hold expiry, and persistent confirmations. Checkout lanes affect the queue approximation. Hold duration affects the replay and lifecycle.
- Markov lifecycle uses absorbing Confirmed and Released states. The annual loss model uses compound Poisson-lognormal assumptions. All risk runs have 10,000 annual trials per seed.
- Scope is a demonstration of proposal behavior. The app uses synthetic events, no user accounts, and no payment, receipt, email or real health data.
