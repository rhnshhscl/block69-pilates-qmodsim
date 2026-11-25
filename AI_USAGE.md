# Agentic AI usage

Codex in ChatGPT Work Mode generated the initial source, model checks, and documentation. A browser-native stack was selected for the small, self-contained simulation and minimal dependency surface.

## Skill use and local review

Built-in Sites guidance was used for hosting and presentation. No third-party skills or executable dependencies from the student guide were installed. The standalone simulation uses browser APIs and Node's built-in assertions. Input bounds, data flow, and network behavior were reviewed locally. An external Cloudflare audit and a formal OWASP Agentic Skills vetting report were not run.

## Refinement evidence

The terminal verification script exercises model bounds and convergence. Browser checks and observed fixes are recorded in README when available. The group should add its own review iterations and actual prompts as it validates this draft.

## Attribution

Codex generated all initial implementation, verification code, and documentation. The proposal and business rules are attributable to Group 6. Team edits and independent verification may be recorded here after review.

- Capacity regression: the transfer scenario test caught opening telemetry that initialized with zero occupied mats even when clients had transferred. The revision populated the opening frame from the transferred confirmation count. The regression now passes.
