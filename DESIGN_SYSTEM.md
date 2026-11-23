# DESIGN_SYSTEM.md: Block 69 Pilates QMODSIM

Design system for the Block 69 Pilates booking-resilience lab (SCENARIOS · LAB · CODEX). It is grounded in the client's domain: a small café that runs Pilates in the morning, so the palette is warm café amber on stone and espresso, not a generic dark-gray/purple AI dashboard.

## 1. Design intent
- **Domain:** Block 69 Cafe, Comembo, Taguig. Mat Pilates, Thu–Sat, 9:00 and 10:15 AM, 3–4 clients per session.
- **Tone:** an engineering instrument that is warm rather than clinical. Telemetry reads like a café order board and a lab readout.
- **Anti-slop rules (Taste Skill):** no purple or neon gradients, no heavy drop shadows, no glassmorphism. Surfaces are flat, borders are 1px, and numbers are monospace.

## 2. Color tokens
Colors are defined as CSS custom properties on `:root` (light) and redefined for dark mode. Canvases read the same tokens on every frame.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--bg` | Page background | #F6F1E9 (warm stone) | #17130F (espresso) |
| `--surface` | Cards, panels | #FFFDF8 | #1F1A15 |
| `--surface-2` | Tables, inset areas | #EFE8DC | #2A231C |
| `--border` | 1px card and table borders | #D9CFBF | #3A3128 |
| `--text` | Primary text | #2A2118 | #EFE6D8 |
| `--text-muted` | Labels, captions, axes | #7A6C5B | #A39682 |
| `--accent` | Primary action, selected state, "before" series | #C8651B (café amber) | #E8993E |
| `--accent-soft` | Selected-card tint | #F6E3CF | #3A2A1A |
| `--ok` | PASS, Attended, "after" series | #3E8E5A | #5CC083 |
| `--bad` | Expired, No-Show, failed check | #C0452F | #E8745E |
| `--neutral-series` | Baseline or "before" bars | #8C8173 | #8C8173 |

Rules:
- Meaning never relies on color alone. Status pills carry text (PASS, no change) and chart series have legends.
- Text/background pairs must meet WCAG AA (4.5:1) in both themes. Check any change to a token.
- Amber is reserved for selection, primary actions and the baseline series. Do not use it decoratively.

## 3. Typography
| Use | Style |
|---|---|
| Headings, body | Clean humanist sans-serif, 400/600 weights |
| Telemetry, readouts, tables, equations, chips | Monospace with `font-variant-numeric: tabular-nums`, so live numbers do not jitter |
| Module tags (e.g. "MOD 6") | Small monospace, uppercase, letter-spaced, 1px amber outline |
| Scale | 11 / 12 / 14 / 16 / 20 / 28 px |

Typographic rules:
- Math uses clean Unicode only: λ, μ, ρ, σ, Σ, ·, ±, ≤, ≥, →, superscripts (², ⁻¹) and subscripts (ₙ, ₖ). Raw LaTeX (`\lambda`, `\rightarrow`) never appears in UI text or canvas labels.
- Money is shown as ₱ with thousands separators. Time is shown with units (min, h).
- Use `×` and `10⁶` for large numbers, not `^` carets.

## 4. Layout and workspace topology
The layout follows the system's operational workflow rather than identical stacked cards:
- **Top bar:** brand, SCENARIOS / LAB / CODEX tabs, V&V check button, Light/Dark switcher. It is always visible.
- **SCENARIOS:** a left rail of three crisis walkthroughs. Each has an incident brief, two decision forks (selectable cards), a before/after telemetry chart, an engine readout table with a Change column, and "Reset forks" and "Open these parameters in LAB" actions.
- **LAB:** a left module rail (Mod 1·3, 6, 5, 7, 2·10, 12, 4), a parameter panel with clamped sliders, a KPI strip, and a canvas area.
- **CODEX:** a sticky section index, derivations, parameter/unit tables, a proposal-grounding table, an RA 10173 crosswalk and the V&V standards.
- **V&V drawer:** a right-side panel with PASS/FAIL rows and a "Re-run all checks" button.

## 5. Components
| Component | Spec |
|---|---|
| Card | `--surface`, 1px `--border`, 4–6 px radius, no shadow |
| Fork option | Card; selected state has a 2px `--accent` outline and `--accent-soft` fill |
| Module chip | Monospace, uppercase, 1px `--accent` outline, transparent fill |
| Primary button | `--accent` fill, white text, flat |
| Secondary button | 1px `--border`, `--text` |
| Status pill | PASS = `--ok` outline; no change = neutral outline; FAIL = `--bad` outline |
| Slider | Labeled in Block 69 terms (e.g. "Assigned session capacity", "Payment hold time per slot"), clamped to its valid range, with a live monospace value readout |
| Table | 1px row dividers, monospace numerals, right-aligned numbers |
| KPI tile | Small muted label above a large monospace value |

Domain parameter labels use proposal language instead of textbook labels, for example "Booking attempts at release (λ)" and "Assigned session capacity (c) = 3 or 4".

## 6. Canvas and visualization rules
- Canvas redraw loops read the active theme tokens on every frame, so axes, gridlines and strokes keep contrast in light and dark.
- Domain-specific canvases:
  - Slot-hold checkout floor: 3–4 mat lanes with hold timers and a waiting queue.
  - Animated six-state reservation chain with moving tokens.
  - Series-parallel payment pipeline (RBD).
- Series colors: before = `--neutral-series` or `--accent`, after = `--ok`, and failure/expiry = `--bad`. Every chart has a legend.
- Target 60 FPS. Avoid per-frame array allocation.

## 7. Accessibility and security hygiene
- Every interactive control is keyboard-focusable with a visible focus ring (2px `--accent`).
- Sliders clamp numeric input (`clamp()` in the engine) so invalid values cannot reach the engines.
- UI text is inserted with `textContent` where possible. Avoid `innerHTML` with dynamic data.
- Security tokens use `crypto.getRandomValues`, never `Math.random()`.

## 8. Tools used
Taste Skill and UI/UX Pro Max for the palette and anti-slop rules; Hallmark for tokens. **TEAM:** confirm which skills you loaded and record their OWASP vetting in `AI_USAGE.md`.