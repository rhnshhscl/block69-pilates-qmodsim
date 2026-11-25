# Security and Skill Audit Results

**Project:** Block 69 Pilates QMODSIM · Group 6 · University of Makati  
**Review date:** November 25, 2026 (Philippine time)  
**Scope:** Static simulator source archive at commit `420037e69b74f628d1bb6777a8bf77e0d3d2e6b2`. This was a manual source review of the exported files, assisted by Codex. GitHub account settings, deployment headers, repository history, and subsequent changes were outside the review.

## Application security review

| Check | Evidence and result |
| --- | --- |
| DOM rendering | Reviewed the seven `innerHTML` assignments in `dist/app.mjs`. Their interpolated values come from fixed strings, bounded numeric inputs, and local calculations. No path from free-form input or externally fetched data to these assignments was identified in this snapshot. |
| Numeric inputs | Range inputs define minimum and maximum values. JavaScript checks finiteness, clamps the numbers, and falls back to the default for nonfinite values. The loss scenario selector limits the worker input to two fixed factors. |
| Client data and browser storage | The only application-written browser storage value is the light/dark theme. The source has no account form, payment collection, file upload, or health disclosure form. Booking and payment scenarios use synthetic data. |
| Network and dependencies | The application loads same-origin JavaScript, CSS, and a Web Worker. Worker messages stay in the browser. The Codex reference links are fixed external destinations. The source archive has no package manifest or lockfile and no third-party runtime library imports were identified. |
| Randomness | The model uses a seeded generator so simulation results can be reproduced. The source does not use it for credentials or security tokens. |
| Supporting regression checks | Re-ran `node verify.mjs`. Both risk configurations, 162 parameter combinations, and all three scenario comparisons passed. This suite verifies the simulation and is supplemental to the security review. |

## Findings

**Low — HTML rendering depends on trusted values.** The current templates use `innerHTML` for markup that combines constants and calculated values. If a future revision introduces client-entered booking descriptions or remote content, use DOM APIs and `textContent` for that data and repeat the data-flow review.

No high or critical findings were identified within the reviewed snapshot and scope. No independent penetration test, automated vulnerability scan, or Cloudflare audit was performed.

## Skill and development workflow review

[AI_USAGE.md](AI_USAGE.md) records the development workflow. The project used built-in Sites guidance for hosting and presentation. The archived source contains no third-party agent skill packages, copied skill scripts, or runtime skill installation steps. There is consequently no third-party skill version or installation to record for this snapshot.

The [OWASP Agentic Skills Top 10 checklist](https://owasp.github.io/www-project-agentic-skills-top-10/) informed this retrospective review of skill provenance, permissions, and dependencies. This review does not establish that a pre-installation OWASP vetting process or the guide’s named Cloudflare audit took place. Those formal checks remain open if required for grading.
