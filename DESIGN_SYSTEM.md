# DESIGN_SYSTEM.md — Block 69 Pilates QMODSIM

Design system for the Block 69 Pilates reservation simulator. The interface connects the café’s Pilates sessions with the three QMODSIM workspaces: Scenarios, Lab, and Codex.

**Source of truth:** [dist/style.css](dist/style.css) defines the visual tokens and layout. [dist/app.mjs](dist/app.mjs) defines the interactive views and Canvas rendering.

## 1. Design intent

- **Domain:** Block 69 Cafe in Comembo, Taguig. Pilates sessions run Thursday to Saturday at 9:00 AM and 10:15 AM, with three or four clients per session.
- **Tone:** A warm café-inspired interface with clear engineering readouts.
- **Visual treatment:** Flat panels, single-pixel borders, serif headings, and monospace telemetry. Amber marks selections and important values.
- **Workflow:** Scenarios introduce the operational decision. Lab exposes the model inputs and outcomes. Codex explains the assumptions and equations. The verification drawer shows the measured checks.

## 2. Color tokens

Dark mode is the initial setting. The theme control switches between light and dark, and the browser stores the selected theme when local storage is available.

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--bg` | Page and Canvas background | `#f7f4eb` | `#141512` |
| `--panel` | Cards, header, and verification drawer | `#fffdf6` | `#1c1e19` |
| `--sub` | Inset surfaces and metric tiles | `#f1ecdf` | `#22251f` |
| `--line` | Borders, dividers, and chart gridlines | `#d9d2c0` | `#363a30` |
| `--text` | Primary text | `#24241c` | `#f3efe3` |
| `--muted` | Secondary text, captions, and chart labels | `#605f51` | `#b3b4a6` |
| `--accent` | Focus outlines, selected controls, and key data | `#805214` | `#e2bc79` |
| `--fill` | Background for selected controls and held mats | `#f3e5c6` | `#433825` |
| `--green` | Passing checks and confirmed mats | `#456234` | `#bacb9e` |
| `--red` | Failing checks and the full-capacity chart bar | `#9a3c2d` | `#eeaa95` |

Charts use the same theme properties as the interface. Status labels such as **PASS**, **FAIL**, **Open**, **Held**, and **Confirmed** give color a text equivalent.

## 3. Typography

| Role | Family | Usage |
| --- | --- | --- |
| Display | Georgia, serif | Main headings and section titles |
| Body | System UI, sans-serif | Instructions, scenario descriptions, and controls |
| Telemetry | UI monospace, Consolas, monospace | Metric values, parameter outputs, and chart labels |

Body text uses a 16 px base size with 1.55 line height. The main heading and metric values scale with viewport width. Model notation uses readable symbols such as λ, μ, Σ, and 10⁻⁵. Prices use ₱, and rate and duration labels carry units.

## 4. Layout and workspace structure

The main content has a maximum width of 1310 px. The header contains the brand, workspace buttons, theme control, and **Verify model** button.

| Workspace | Layout | Purpose |
| --- | --- | --- |
| Scenarios | Incident list beside a three-step walkthrough and comparison chart | Read the incident, choose a response, and compare the outcome with the baseline. |
| Lab | Parameter controls beside the class floor, checkout plot, lifecycle graph, and loss histogram | Change model inputs and observe how the results respond. |
| Codex | Proposal inputs beside equation explanations and the privacy crosswalk | Trace which inputs came from the proposal and which were selected for simulation. |
| Verification | Modal drawer aligned to the right, up to 490 px wide | Read the tolerance, measured value, and pass or fail result for each check. |

## 5. Components

| Component | Specification |
| --- | --- |
| Card | Panel background, one-pixel border, and 8 px corner radius |
| Selected incident | Amber border and tinted background, with selection exposed through `aria-pressed` |
| Primary action | Amber text and border on a tinted background |
| Slider | Native range input with a labeled parameter, unit, and live numeric value |
| Metric tile | Prominent monospace value paired with a plain-language label |
| Transition matrix | Expandable table with state labels for rows and columns |
| Verification result | Written PASS or FAIL status paired with a measured value and tolerance |

The Lab uses booking-specific labels such as **Booking arrival rate**, **Checkout completion rate**, **Class capacity**, and **Hold duration**.

## 6. Canvas and visualization

- **Before and after:** The dashed line shows baseline occupancy. The solid line shows occupancy for the selected response.
- **Class floor:** The mat layout follows the selected capacity. Each mat is labeled Open, Held, or Confirmed.
- **Checkout occupancy:** Bars show the modeled probability of each occupancy level. The last bar represents full capacity.
- **Booking lifecycle:** The animated graph shows four states: Held, Review, Confirmed, and Released. A separate table lists transition probabilities.
- **Annual loss:** The histogram groups simulated annual losses into peso ranges. The last bin includes all higher losses.

## 7. Responsive behavior, accessibility, and motion

- At 760 px and below, the header wraps and the main two-column layout becomes a single column.
- Buttons, links, selects, and range controls use a visible focus outline.
- The selected workspace uses `aria-current`, and the selected scenario uses `aria-pressed`.
- Verification opens as a native modal dialog. Canvas elements have descriptive labels, and key results also appear as text.
- The booking lifecycle animation holds its markers in place when the browser requests reduced motion.
- The Lab checks numeric inputs for finite values and applies the configured bounds before updating the model.

## 8. Implementation and verification record

The prototype uses browser-native HTML, CSS, JavaScript, and Canvas, with system fonts. Built-in Sites guidance supported the initial presentation and hosting. For implementation attribution and the review of UI rendering, input bounds, and browser storage, see [AI_USAGE.md](AI_USAGE.md) and [SECURITY_AUDIT.md](SECURITY_AUDIT.md).

Browser checks covered all three scenario decisions, the capacity control, booking replay, theme switching, and the verification drawer. The public GitHub Pages check captured the light-theme drawer with all four checks passing. Formal contrast measurement and a 60 FPS benchmark remain outstanding.