# MoodReader — Antigravity Implementation Prompt Package (EN)
This package is designed for **Google Antigravity** workflows using Gemini 3 Pro.  
Use each prompt as a separate Antigravity task. Keep outputs **code-first**, with **copy-pastable files**, and prefer incremental commits.

---

## Prompt 0 — Global Constraints (Paste into every task)
You are a senior engineer implementing the MoodReader MVP (Chrome Extension MV3 + Backend Proxy on Cloud Run).
Hard constraints:
- No autoplay: default is “auto-ready (paused)” + explicit Play click.
- Playback runs only in a dedicated Player tab via YouTube IFrame.
- Auto-stop after 15 minutes of reading inactivity.
- Next policy: reuse Top10 candidates up to 3 Next clicks; re-search on 4th.
- De-dup: exclude track_id played in last 30 minutes per (domain_hash,url_hash).
- LLM: Opus via Backend Proxy. If analysis fails/slow: Last Known Good → default preset fallback.
- Cost control: 20 analyses/day per install; reset at midnight (local time). Cache analysis by (domain_hash,url_hash) for 30 minutes.
- Privacy/logging: NEVER store raw text server-side. Never log text/raw URL/domain/auth/cookies/raw IP/raw prompts.
Deliverables:
- TypeScript for extension; Node.js/TypeScript for backend proxy.
- Include tests where practical and a minimal README.
- Provide exact file paths and final code blocks.

---

## Prompt 1 — Repo Skeleton & Tooling
Goal: Create a monorepo with:
- /extension (MV3 + TS + Vite or plain TS build)
- /server (Node/TS Cloud Run API)
- shared lint/format configs
Requirements:
- Provide a working build for extension and server.
- Add scripts: dev/build/test.
- Add README with local setup steps.
Output:
- Folder tree + key config files (package.json, tsconfig, vite config if used).
- Minimal runnable “hello” endpoint in server and a minimal extension that injects a Control Bar.

---

## Prompt 2 — Extension: Message Bus + State Machine
Goal: Implement a robust internal message protocol.
Requirements:
- Define message types (enum) and payload schemas.
- Implement a background state machine with states:
  - IDLE, READY, PLAYING, PAUSED/STOPPED
- Track activeContext: {sourceTabId, domainHash, urlHash}.
- Persist settings to chrome.storage.
Output:
- /extension/src/common/messages.ts
- /extension/src/background/state.ts
- /extension/src/background/index.ts
- Basic logging (client-side only) without sensitive data.

---

## Prompt 3 — Content Script: Reading Activity + Text Extraction
Goal: Implement content script.
Requirements:
- Detect first scroll and subsequent scroll activity timestamps.
- Render a minimal floating Control Bar with buttons:
  Play / Stop / Quit / Next / Open Player
- Extract text:
  - viewport paragraphs (prefer)
  - fallback: article/main/p
  - trim 800–1500 chars, hard cap 2000
- Compute sha256 hashes for domain+url (normalize URL by stripping fragments and tracking params).
- Send ANALYZE_REQUEST to background only when:
  - domain is allowlisted OR user allowed this time.
Output:
- /extension/src/content/index.ts
- /extension/src/content/extract.ts
- /extension/src/content/ui.ts

---

## Prompt 4 — Consent Modal + Allowlist UX (C-Modal)
Goal: Implement “first-run on a domain” consent.
Requirements:
- Modal with checkbox “Auto-ready next time on this domain”
- Buttons: This time / Allow / Cancel
- Store allowlist by domainHash (or normalized domain string + hash)
- Do not block page scrolling.
Output:
- /extension/src/content/consent.tsx (or vanilla)
- storage schema update + migrations if needed

---

## Prompt 5 — Player Tab: YouTube IFrame + Command Handling
Goal: Build the Player tab app.
Requirements:
- A dedicated HTML page that hosts the YouTube IFrame player.
- Accept commands from background via runtime messaging:
  PLAYER_LOAD(trackId, paused=true), PLAY, STOP, SET_VOLUME, QUIT
- Emit PLAYER_READY / PLAYER_ERROR / PLAYER_STATE updates back to background.
- Ensure default load is paused.
Output:
- /extension/player/index.html
- /extension/player/player.ts
- /extension/player/bridge.ts

---

## Prompt 6 — YouTube Search + Candidate Scoring + De-dup + Next Policy
Goal: Implement search and selection in background.
Requirements:
- Given analysis {tempo, genres} and settings {mode, preset, intensity}, build a search query string.
- Fetch Top10 candidates (use a safe method; if official API not used, document limitations).
- Score candidates:
  - penalty: live/cover/lyrics/mv/performance/dance/reaction
  - bonus: mode match keywords
  - weak bonus: recency if available
- Weighted random pick with 30-min de-dup per context.
- Maintain candidate set and nextCount; re-search on 4th Next.
Output:
- /extension/src/background/youtube_search.ts
- /extension/src/background/selector.ts
- /extension/src/background/next_policy.ts

---

## Prompt 7 — Backend Proxy (Cloud Run): /v1/analyze + /v1/events
Goal: Build the server.
Requirements:
- Node/TS (Express/Fastify).
- /v1/analyze:
  - validate input and cap text length
  - enforce 20/day soft limit (KST midnight reset)
  - 30-min cache (in-memory acceptable for MVP; design for Redis later)
  - call Antigravity (Opus) with strict JSON-only prompt
  - implement 2–3s timeout
  - fallback: lastKnownGood or default preset
- /v1/events:
  - accept only allowed events; reject text/url fields
  - structured logs without banned fields
Output:
- /server/src/index.ts
- /server/src/analyze.ts
- /server/src/events.ts
- /server/src/policy/logging.ts
- Dockerfile + Cloud Run deploy notes

---

## Prompt 8 — Opus Prompt Engineering (JSON-only)
Goal: Write the production prompt used by /v1/analyze.
Requirements:
- Input: text + category enum
- Output: JSON only with:
  - tempo: slow|medium|fast
  - genres: [primary, secondary]
- Add minimal examples (1-shot max).
- Add strict refusal: never include extra keys; never include explanation.
Output:
- /server/src/llm/prompt.ts with a single function buildPrompt(input)

---

## Prompt 9 — Daily Limit + Cache + LKG (Client + Server)
Goal: Implement the full cost-control policy.
Requirements:
- Client:
  - maintain dailyUsage in storage (YYYY-MM-DD key)
  - reset at local midnight
  - block extra analyze calls and use LKG/default locally
- Server:
  - enforce soft limit again (defense in depth)
  - cache by (domain_hash,url_hash) for 30 minutes
Output:
- Code changes in extension + server + tests for reset/counters.

---

## Prompt 10 — Weekly Report (Rolling 7 days)
Goal: Implement session tracking and popup summary.
Requirements:
- Session start: Play click
- Session end: Stop/Quit/Auto-stop
- Store sessions locally with timestamps
- Build rolling 7-day aggregation:
  - total play time, sessions, mode/intensity distribution, top tags
  - count of auto-stopped sessions
- Render in popup bottom section.
Output:
- /extension/src/background/report.ts
- /extension/src/popup/report.tsx (or vanilla)
- storage schema + cleanup

---

## Prompt 11 — Test Suite & QA Checklist
Goal: Add tests and a QA script.
Requirements:
- Unit tests: hashing, TTL, daily reset, de-dup, scoring weights
- Integration tests: /v1/analyze policy (limit/cache/timeout)
- Manual QA checklist: consent flow, player lifecycle, auto-stop, next policy, report.
Output:
- /server/test/*.spec.ts
- /extension/test/*.spec.ts (where feasible)
- /QA_CHECKLIST.md

---

## Prompt 12 — Production Hardening (MVP-ready)
Goal: Make it store-ready.
Requirements:
- Reduce permissions to the minimum.
- Inject content script only on allowlisted domains (preferred).
- Add clear privacy statement in options page.
- Handle error toasts and “Re-analyze” button.
- Ensure telemetry opt-out is respected everywhere.
Output:
- Manifest updates + options UI + README “Privacy & Data” section.

---

## Notes for Antigravity Runs
- Run prompts in order (0 → 12).
- After each task, ensure the result compiles and tests pass.
- Keep each task small; do not attempt to implement everything at once.
