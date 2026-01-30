# MoodReader — UI Implementation Prompt Package (EN)
For **Google Antigravity** (Opus) to implement the **UI layer** of MoodReader MVP, aligned with the final design decisions:
- Style: **Minimal (Linear/Notion-like)**, **neutral grayscale**, **line icons (stroke 1.5px)**.
- Content page Control Bar: **draggable (snap to 4 corners) + saved position**.
- Play toggles **Play ↔ Pause**.
- Tag chips (tempo/genre) are **always visible**.
- No autoplay: **auto-ready (paused)** + explicit Play.

Use each prompt as a separate Antigravity task. Keep outputs **code-first**, copy-pastable, and list exact file paths.

---

## Prompt 0 — Global UI Constraints (Paste into every task)
You are implementing MoodReader MVP UI for a Chrome Extension MV3.
UI constraints:
- Neutral grayscale theme (no colorful accents). Only danger hover tint on Quit.
- Line icons, stroke=1.5px, round caps/joins.
- Control Bar height 44px, radius 12px, subtle shadow.
- Draggable handle area is ONLY the left section (status dot + status text + tag chips); action buttons must NOT initiate dragging.
- Dragging snaps to 4 corners with 12px safe margin; persist `{anchor, offsetX, offsetY}` under `MR_UI_BAR_POS`.
- States: LOADING, READY, PLAYING, FALLBACK, ERROR (error via toast).
- LOADING disables Play/Next/Stop but Quit is always enabled.
- READY: Play button has slightly brighter outline (“primary by luminance only”).
- PLAYING: Play becomes Pause; Next swaps track and continues playing; Stop returns to READY (paused).
- Tag chips (tempo/genre) always visible (muted).
Deliverables:
- Vanilla TS/JS + CSS (no frameworks unless explicitly requested).
- Accessible buttons (aria-labels), keyboard focus styles.
- No sensitive data in logs.

---

## Prompt 1 — Content Page: Control Bar (HTML/CSS/TS) + State Rendering
Goal: Implement the floating Control Bar UI injected by the content script.
Requirements:
1) Create UI root container with shadow DOM (preferred) to avoid site CSS collisions.
2) Implement HTML structure:
   - Left handle: status dot, status text, chips container
   - Right actions: Play/Pause, Next, Stop, Quit, Volume, Open Player link
3) Implement CSS tokens as variables:
   - bg/surface/surface2/text/muted/line/shadow/danger, radius=12, height=44
   - status dot colors: ready/playing/fallback/error
4) Implement render function:
   - `renderBar(state, tags, volume, canNext, canStop, canQuit)`
5) Buttons are icon-only; hit-area 32x32; hover is surface2; Quit danger only on hover.
6) Provide file outputs:
   - /extension/src/content/ui/bar.ts
   - /extension/src/content/ui/bar.css
   - /extension/src/content/ui/icons.ts (inline SVGs)

Output:
- Full code for the above files.
- A short note on how to mount/unmount the bar.

---

## Prompt 2 — Control Bar Drag & Snap + Persistence
Goal: Add drag + snap behavior per spec.
Requirements:
1) Drag handle area is ONLY the left section (status dot + text + chips).
2) Drag start threshold:
   - enter dragging after 150ms hold OR 6px movement
3) While dragging: update position in real time.
4) On drop: snap to nearest corner (TL/TR/BL/BR) with 12px margin.
5) Persist position in chrome.storage under key `MR_UI_BAR_POS`:
   - `{ anchor: "TL"|"TR"|"BL"|"BR", offsetX: number, offsetY: number }`
6) On mount: restore position; if invalid (window resized) clamp to viewport.
7) Provide file outputs:
   - /extension/src/content/ui/drag.ts
   - integrate into /extension/src/content/ui/bar.ts
8) Add optional “Reset position” method callable from options.

Output:
- Full code and integration notes.

---

## Prompt 3 — Toast System (Neutral Minimal)
Goal: Implement toasts for fallback/limit/errors.
Requirements:
1) Toast container in shadow root (same UI root).
2) Neutral style (no color except danger for fatal).
3) API:
   - `toast.info(msg, {ttl})`
   - `toast.warn(msg, {ttl})`
   - `toast.error(msg, {ttl})`
4) Ensure multiple toasts stack; auto-dismiss; pause on hover.
5) Provide files:
   - /extension/src/content/ui/toast.ts
   - /extension/src/content/ui/toast.css

Output:
- Full code and example usage from bar state changes.

---

## Prompt 4 — Consent Modal (C-Modal) UI + Interactions
Goal: Implement the domain consent modal (minimal and fast).
Requirements:
1) Center modal with 20% dim overlay.
2) Copy:
   - Title: “Enable MoodReader on this site?”
   - Body line 1: “We analyze a short excerpt to pick background music.”
   - Body line 2: “We don’t store the page text.”
3) Checkbox: “Auto-ready next time on this site”
4) Buttons (no colorful accent):
   - Allow (filled, brighter neutral)
   - This time (outline)
   - Cancel (text)
5) Interaction:
   - ESC closes as Cancel
   - Click outside closes as Cancel
   - Focus trap within modal
6) Provide files:
   - /extension/src/content/ui/consent_modal.ts
   - /extension/src/content/ui/consent_modal.css
   - minimal wiring hooks: `openConsentModal()` returns a Promise with result

Output:
- Full code and a usage snippet.

---

## Prompt 5 — Toolbar Popup UI (Action-first + Weekly Summary)
Goal: Build popup UI with the same token system.
Requirements:
1) Top section:
   - Play/Pause, Next, Stop, Quit (icon-only)
   - Mode segmented control: Vocal / Inst
   - Intensity segmented: Low / Med / High
   - Volume slider
2) Bottom section: “Last 7 days”
   - KPI cards: Play time, Sessions, Auto-stops
   - Top tags chips (3)
   - Link: “View details”
3) Ensure layout fits 360px width.
4) Provide files:
   - /extension/src/popup/index.html
   - /extension/src/popup/popup.ts
   - /extension/src/popup/popup.css
   - /extension/src/popup/components/segmented.ts
   - /extension/src/popup/components/kpi.ts

Output:
- Full code and messaging contract to background (message types only, no backend implementation).

---

## Prompt 6 — Options Page UI (Allowlist + Privacy + Reset Position)
Goal: Minimal options page for MVP.
Requirements:
1) Sections:
   - Allowlist: list domains (string display) with remove button; add domain input.
   - Telemetry: toggle ON/OFF with short privacy note.
   - UI: “Reset Control Bar position” button.
   - Data: “Clear local data” (confirm dialog).
2) Same neutral theme tokens.
3) Provide files:
   - /extension/src/options/index.html
   - /extension/src/options/options.ts
   - /extension/src/options/options.css

Output:
- Full code, storage keys used, and validation rules for domain input.

---

## Prompt 7 — Icon Set (Line Icons) & Accessibility
Goal: Ensure icon consistency and accessibility.
Requirements:
1) Provide inline SVG icons with stroke 1.5, round caps/joins:
   - play, pause, next, stop, quit(x), volume
2) Each button must include:
   - `aria-label`
   - focus ring (neutral)
3) Provide:
   - /extension/src/common/ui/icons.ts
   - update imports in bar/popup/options as needed

Output:
- Full code + a short accessibility checklist.

---

## Prompt 8 — UI Integration Wiring (Content ↔ Background)
Goal: Wire UI events to the existing message bus.
Requirements:
1) Define message types used by UI:
   - CONTROL_PLAY, CONTROL_PAUSE, CONTROL_NEXT, CONTROL_STOP, CONTROL_QUIT, CONTROL_OPEN_PLAYER
   - CONSENT_DECISION
   - UI_POSITION_UPDATED
2) Content script:
   - emits UI events to background
   - receives PLAYER_STATE updates and re-renders bar
3) Background:
   - responds with state updates without sending sensitive data
4) Provide files:
   - /extension/src/content/index.ts updates
   - /extension/src/common/messages.ts additions (types only)
   - small glue code snippets

Output:
- Code diffs or full file contents.

---

## Prompt 9 — Visual QA Checklist + Screens
Goal: Provide a QA checklist focused on UI correctness.
Requirements:
- Verify drag handle only on left region
- Snap corners + persistence works
- Ready state highlights Play outline by luminance only
- Tag chips always visible
- Play ↔ Pause toggles correctly across states
- Consent modal focus trap + ESC + outside click behavior
- Popup fits 360px and is readable
- Options page allowlist validation and reset position works
Output:
- /QA_UI_CHECKLIST.md

---

## How to Use This Package
1) Run Prompt 1 → 2 → 3 → 4 to complete content-page UI.
2) Run Prompt 5 → 6 for popup and options pages.
3) Run Prompt 7 to unify icons and accessibility.
4) Run Prompt 8 to wire UI to background.
5) Run Prompt 9 before shipping.
