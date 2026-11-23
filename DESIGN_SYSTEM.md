# DESIGN_SYSTEM.md: Block 69 Pilates QMODSIM

Design system for the Block 69 Pilates booking-resilience lab (SCENARIOS · LAB · CODEX). The look is grounded in the client's domain: a small café that runs Pilates in the morning. The palette is café amber on warm stone (light) and espresso (dark), not a generic dark-gray/purple AI dashboard.

Source of truth: the `:root` token blocks in `src/index.template.html`.

## 1. Design intent
- **Domain:** Block 69 Cafe, Comembo, Taguig. Mat Pilates, Thu–Sat, 9:00 and 10:15 AM, 3–4 clients per session.
- **Tone:** an engineering instrument that feels warm, not clinical. Telemetry reads like a lab readout on a café order board.
- **Anti-slop rules (Taste Skill):** no purple or neon gradients, no drop shadows, no glassmorphism. Surfaces are flat, borders are 1px, and live numbers are monospace with tabular numerals.

## 2. Color tokens
Defined as CSS custom properties. Light is the default; dark applies through `[data-theme="dark"]`, or automatically through `prefers-color-scheme: dark` unless the user has chosen light.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--bg` | Page background | #f4f1ec | #12100e |
| `--surface` | Cards, top bar, drawer | #fffdf9 | #1a1815 |
| `--sunk` | Table headers, inset areas, equation blocks | #ece7df | #221f1b |
| `--ink` | Primary text | #1d1a16 | #efeae3 |
| `--muted` | Labels, captions, axes | #6a6158 | #a69d91 |
| `--line` | 1px borders and dividers | #dbd3c7 | #35302a |
| `--grid` | Canvas gridlines | #e9e3da | #26231f |
| `--accent` | Selection, primary action, key series | #b05a0c | #f0a23a |
| `--accent-ink` | Text on accent fills | #ffffff | #1b1206 |
| `--sage` | Secondary series and accent | #47755a | #8cbc98 |
| `--ok` | PASS, positive change | #2b7a4b | #5cc58a |
| `--warn` | Caution | #9a6410 | #e2a748 |
| `--bad` | Failure, loss, incident | #b3341f | #f2775f |

Rules:
- **Contrast:** `--accent` on `--surface` is about 4.8:1 in light mode, and white text on the accent button is about the same. Re-check any token change in both themes.
- **Not color alone:** status always carries text (PASS / FAIL pills, "no change" labels, chart legends).
- **Accent use:** amber marks selection, primary actions and key series. It is not decorative.
- **Canvases:** the canvas redraw loops read these same tokens on every frame, so strokes and gridlines keep contrast in both themes.

## 3. Typography
| Role | Family | Notes |
|---|---|---|
| Display (headings, brand) | **Archivo**, condensed (`font-stretch` 62–100%, weights 500–800) | Fallback: Arial Narrow, system-ui |
| Body | **IBM Plex Sans** 400/500/600 | 15px / 1.5 base. Fallback: system-ui, Segoe UI |
| Telemetry | **IBM Plex Mono** 400/500/600 | `font-variant-numeric: tabular-nums` for readouts, tables, tokens, equations and chips. Fallback: ui-monospace, Menlo, Consolas |

Type scale: h2 26px, h3 17px, body 15px, labels and controls 12–13.5px, KPI values 19px mono, eyebrow labels 11.5px mono uppercase with 0.08em tracking.

Typography rules:
- Math uses clean Unicode only: λ, μ, ρ, σ, Σ, ·, ±, ≤, ≥, →, ², ⁻¹, ₙ. Raw LaTeX never appears in UI text or canvas labels.
- Money is shown as ₱. Times carry units (min, h).
- Large numbers use `10⁶` style notation, not `^`.

## 4. Layout and workspace topology
The layout follows each archetype's workflow instead of repeating identical stacked cards:
- **Top bar (sticky):** brand, SCENARIOS / LAB / CODEX tab group, a V&V checks button with a live pass/fail badge, and the Light/Dark toggle.
- **SCENARIOS:** a left list of three crisis walkthroughs, then the incident brief with a red left bar, decision forks, a before/after chart, and an engine readout table with a Change column.
- **LAB:** a 236px module rail on the left, then a two-column workspace (300px control panel + canvas stack). Each module has a KPI strip and live canvases.
- **CODEX:** a sticky 220px section index and reading-width sections (max 74ch) with equation blocks and reference tables.
- **V&V drawer:** a right-side panel (max 560px) with PASS/FAIL rows and a re-run button.
- **Max content width:** 1480px.

## 5. Components
| Component | Spec |
|---|---|
| Card | `--surface` fill, 1px `--line`, 8px radius, no shadow |
| Rail item (selected) | 1px `--accent` border plus a 3px inset accent bar on the left |
| Fork option (selected) | 1px `--accent` border and inset outline, plus a "●" marker on the title. Selection never relies on color alone |
| Module chip | Mono 11.5px, `--accent` text and 1px outline, 4px radius |
| Pill | Mono 11.5px, fully rounded, 1px outline in `--ok` / `--bad` / `--warn` / `--muted` |
| Primary button | `--accent` fill, `--accent-ink` text, 6px radius |
| Secondary button | `--surface` fill, 1px `--line` |
| Segmented control | 1px bordered group; the pressed state inverts to `--ink` fill |
| Slider | Native range input with `accent-color: var(--accent)`. The label states a Block 69 meaning, a mono symbol (λ, μ, c, K) and a live mono value readout |
| KPI tile | Muted 12px label above a 19px mono value. Value turns `--bad` for alert, `--ok` for good |
| Matrix table | Mono 12px, 1px grid, sunk header, muted near-zero cells, accent for the highest cell |
| Payoff table | Nash equilibrium cell gets a 2px inset accent outline |
| Comparison table | Left-aligned labels, right-aligned mono numbers, 1px row dividers |

Slider labels use proposal language, for example "Booking attempts at release", "Payment hold time per slot" and "Assigned session capacity (3 or 4)", not textbook terms like "Arrival Rate".

## 6. Canvas and visualization rules
- Canvases redraw every frame and read the active theme tokens, so axes, gridlines and strokes keep contrast in light and dark.
- Canvas height is set per card (`--h`, default 260px) and scales to the card width.
- Domain visuals:
  - **Live checkout floor:** 4 session slot lanes with hold timers and a waiting queue.
  - **Reservation chain:** animated six-state absorbing chain with moving tokens.
  - **Payment pipeline:** series-parallel reliability diagram.
  - **Before/after telemetry:** for each scenario fork.
- Every chart has a legend or direct labels. Series colors: baseline or "before" in neutral or amber, "after" in sage or `--ok`, failures in `--bad`.

## 7. Responsive, accessibility and motion
- **Breakpoints:** at 1100px the two-column LAB workspace and two-up chart rows collapse to one column. At 860px the side rails become static, and the CODEX index hides.
- **Keyboard:** all controls are focusable, with a 2px `--accent` focus ring (`:focus-visible`). Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"`, and the V&V drawer uses `aria-hidden` and `aria-controls`.
- **Motion:** the drawer slide is disabled under `prefers-reduced-motion: reduce`.
- **Input hygiene:** slider values are clamped in the engine (`clamp()`) so invalid input cannot reach the math.
- **Security tokens:** generated with `crypto.getRandomValues`, never `Math.random()`.
- **TEAM:** state here whether UI text is inserted with `textContent` or `innerHTML`, once you have checked `src/ui/app.js`.

## 8. Tools used
- Palette, typography and anti-slop aesthetic: **TEAM:** list the design skills you actually loaded (e.g. Taste Skill, UI/UX Pro Max, Hallmark) and cross-reference their OWASP vetting in `AI_USAGE.md`.
- Fonts are loaded from Google Fonts with local fallbacks.