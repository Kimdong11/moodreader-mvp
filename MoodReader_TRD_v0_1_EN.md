# MoodReader TRD v0.1 (EN)
**Based on**: MoodReader PRD v2.2  
**Architecture**: Chrome Extension (MV3) + Player Tab (YouTube IFrame) + Backend Proxy (Cloud Run) + Antigravity (Opus)  
**Date**: 2026-01-30 (KST)

---

## Table of Contents
1. Scope  
2. System Overview  
3. Key Decisions (from PRD)  
4. Chrome Extension Design (MV3)  
5. Player Tab Design (YouTube IFrame)  
6. Backend Proxy Design (Cloud Run)  
7. Data Model (Local Storage)  
8. Algorithms  
9. Error Handling  
10. Security & Privacy  
11. Test Plan  
12. Rollout Plan  

---

## 1) Scope
### In scope (MVP)
- Allowlist-based activation (consent modal + checkbox)
- Scroll-triggered **auto-ready (paused)** + explicit Play to start
- Playback in dedicated Player tab using YouTube IFrame
- Next policy (reuse Top10 up to 3 times, re-search on 4th)
- Auto-stop after 15 minutes of reading inactivity
- Daily analysis soft limit (20/day) + midnight local reset
- (domain_hash, url_hash) 30-min analysis cache
- Weekly report (rolling 7 days) in toolbar popup

### Out of scope (MVP)
- Payments/subscriptions
- Advanced personalization (skip-learning)
- Multiple music providers (Spotify, etc.)
- Cross-device sync / account login

---

## 2) System Overview
### Components
1) **Chrome Extension (Manifest V3)**
- `content_script`: text extraction + Control Bar + reading activity detection
- `service_worker` (background): state machine + storage + proxy calls + player tab lifecycle
- `player_tab`: YouTube IFrame playback + queue control
- `popup`: action-first controls + weekly summary
- `options`: settings (allowlist, preset, intensity, telemetry opt-out)

2) **Backend Proxy (Cloud Run)**
- `POST /v1/analyze`: calls Antigravity/Opus, enforces cache/limits/fallback
- `POST /v1/events`: receives anonymous events (if telemetry enabled)

3) **Antigravity Gateway**
- Primary model: Opus (Thinking)  
- Output schema: JSON only `{ tempo, genres }`

---

## 3) Key Decisions (from PRD)
- No autoplay: **auto-ready (paused)** + explicit Play
- Playback in **Player tab** only
- Auto-stop: 15 minutes inactivity
- Next: Top10 candidate reuse up to 3 times, re-search on 4th
- De-dup: exclude track_id played within 30 minutes per (domain_hash, url_hash)
- LLM: Opus primary; fallback = Last Known Good → default preset
- Cost control: 20 analyses/day, midnight reset + 30-min cache
- Logging ban: never log text/raw URL/domain/auth/cookies/raw IP/raw prompts

---

## 4) Chrome Extension Design (MV3)
### 4.1 Manifest & Permissions (minimal)
- `permissions`: `storage`, `activeTab`, `scripting`, `tabs`
- `host_permissions`: prefer allowlisted domains; avoid `<all_urls>` if possible (review risk)
- Optional: commands (keyboard shortcut) to open/close popup or player

### 4.2 Content Script
**Responsibilities**
- Detect reading activity (scroll is sufficient for MVP)
- Render Control Bar UI (floating)
- Extract text:
  - Primary: viewport-visible paragraphs
  - Fallback: `article/main/p` leading text
  - Trim to 800–1500 chars (hard cap 2000)
- Compute `domain_hash` and `url_hash` (sha256 of normalized strings)
- Send `ANALYZE_REQUEST` to background

**Messages**
- To background: `ANALYZE_REQUEST`, `READING_ACTIVITY`, `CONTROL_ACTION`
- From background: `ANALYZE_RESULT`, `PLAYER_STATE`, `TOAST`

### 4.3 Background Service Worker
**Responsibilities**
- Maintain a global state machine
- Manage allowlist + first-run onboarding
- Call Proxy `/v1/analyze` with cache/limit checks
- Create/restore Player tab (single instance)
- Enforce auto-stop timer
- Write weekly report data to local storage
- Send analytics events to Proxy (telemetry ON only)

**State**
- `playerTabId?: number`
- `activeContext?: { sourceTabId, domainHash, urlHash }`
- `analysisCache`: TTL 30 min
- `lastKnownGood`: last successful analysis (global)
- `dailyUsage`: { dateKey, count }
- `recentTracks`: per (domain_hash, url_hash), track_id list with timestamps (30 min)

### 4.4 Popup
- Top: Play / Stop / Quit / Next, volume, mode toggle (Vocal/Inst), intensity slider
- Bottom: rolling 7-day summary + “View details”

### 4.5 Options Page
- Allowlist management (add/remove domains)
- Telemetry ON/OFF
- Default mode, preset, intensity
- “Clear local data” (with explicit warnings)

---

## 5) Player Tab Design (YouTube IFrame)
**Responsibilities**
- Create YT IFrame Player
- Load selected track with `autoplay=0` (Ready)
- Handle commands from background:
  - `PLAYER_LOAD(trackId, startPaused=true)`
  - `PLAYER_PLAY`, `PLAYER_PAUSE/STOP`, `PLAYER_SET_VOLUME`, `PLAYER_NEXT(trackId)`
  - `PLAYER_QUIT` (tab close)
- Emit events back to background:
  - `PLAYER_READY`, `PLAYER_PLAYING`, `PLAYER_PAUSED`, `PLAYER_ERROR`, `PLAYER_ENDED`

**Resilience**
- If the player tab is closed/discarded, background recreates it and restores Ready state.

---

## 6) Backend Proxy Design (Cloud Run)
### 6.1 Endpoint: POST /v1/analyze
**Request**
- install_id (client-generated UUID)
- domain_hash, url_hash
- category enum
- text (800–1500 chars, hard cap 2000)

**Response**
- tempo, genres
- source: `cache|opus|fallback_last|fallback_default`

**Server rules**
- Enforce request size limit
- Server-side cache lookup (optional but recommended)
- Enforce daily limit (20/day) and midnight reset (local time policy; server should treat as KST for MVP)
- Timeout Opus call (2–3s recommended)
- Apply fallback if:
  - timeout, 5xx, rate limit, or over daily limit

### 6.2 Endpoint: POST /v1/events
- Accept only allowed event names
- Reject payloads containing text/url fields
- Store aggregate metrics (log sink or DB later)

---

## 7) Data Model (Local Storage)
### Keys
- `MR_ALLOWLIST`: list of allowlisted domains (store domain strings or hashes; prefer hashes)
- `MR_SETTINGS`: `{ mode, vocalPreset, intensity, volume, telemetryEnabled }`
- `MR_ANALYSIS_CACHE`: `{ key: { tempo, genres, savedAt } }` where key = `${domainHash}:${urlHash}`
- `MR_LKG`: `{ tempo, genres, savedAt }`
- `MR_DAILY_USAGE`: `{ dateKey, count }`
- `MR_RECENT_TRACKS`: `{ key: [{ trackId, playedAt }] }` with 30-min TTL cleanup
- `MR_WEEKLY_SESSIONS`: session records for 7-day rolling report

### Session definition
- Start: `play_clicked`
- End: `stop_clicked` OR `quit_clicked` OR `auto_stop_triggered`

---

## 8) Algorithms
### 8.1 Candidate selection (Top10)
- Build search query from:
  - analysis (`genres`, `tempo`)
  - user mode (Vocal/Inst), preset, intensity templates
- Fetch Top10 results
- Score each candidate:
  - Penalty: disruptive keywords
  - Bonus: mode match
  - Weak bonus: recency
- Weighted random pick
- Exclude recent trackIds (30 min) per (domainHash, urlHash)

### 8.2 Next policy
- Reuse current candidate set up to 3 Next
- On 4th Next, refresh candidate set via re-search

### 8.3 Auto-stop
- Track last reading activity timestamp
- Check every 30–60 seconds
- If playing and inactivity ≥ 15 min → stop + emit `auto_stop_triggered`

---

## 9) Error Handling
- Proxy timeout/unavailable:
  - use LKG else default preset
  - emit `fallback_used` with reason code
- YouTube player error:
  - retry once
  - if fail → toast + remain Ready
- Storage corruption:
  - reset only affected keys (avoid full wipe)

---

## 10) Security & Privacy
- Never log: text, raw URL/domain, auth/cookies, raw IP, full prompts
- Hash keys for domain/url in storage and analytics
- Telemetry opt-out enforced client-side before sending events
- Proxy: CORS allowlist (extension ID), rate limiting, request size caps

---

## 11) Test Plan
### Unit
- Hashing & normalization
- TTL cache and cleanup
- Daily usage counter reset at midnight
- De-dup window behavior
- Scoring and weighted random

### Integration
- Extraction across sites (article vs docs vs infinite scroll)
- Proxy analyze success/timeout/over-limit
- Player tab lifecycle (create/recover)
- Auto-stop behavior

### E2E
- Consent modal + allowlist + auto-ready
- Play → Next×3 → re-search on 4th
- Auto-stop after inactivity
- Weekly report aggregation and display

---

## 12) Rollout Plan
- Alpha: personal test (10–30 installs)
- Beta: unlisted Chrome Web Store
- Public launch: telemetry ON by default with clear opt-out; monitor fallback spikes and p95 latency
