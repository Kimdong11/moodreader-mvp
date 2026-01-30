# MoodReader PRD v2.2 (EN)
**Product**: MoodReader  
**One-liner**: When the user starts reading (scroll trigger), analyze the page tone to **prepare** BGM (paused), then play in a dedicated Player tab when the user presses **Play**.  
**Version/Date**: v2.2 / 2026-01-30 (KST)

---

## Table of Contents
1. Overview  
2. Problem & Goals  
3. Target Users  
4. Core UX Principles  
5. User Flow  
6. UI Surfaces  
7. Music Matching (YouTube)  
8. AI Analysis (Antigravity + Opus)  
9. Architecture (Backend Proxy + Player Tab)  
10. Proxy API (Recommended)  
11. Cost / Quota Control  
12. Privacy / Trust / Logging  
13. Weekly Report (Rolling 7 Days)  
14. Metrics & Analytics Events  
15. Risks & Mitigations  
16. Appendix: Deployment Recommendation (Cloud Run)

---

## 1. Overview
- **Purpose**: Improve immersion for long-form reading by removing music search friction.
- **North Star**: **D7 Retention** (used at least once on day 7 after install)

---

## 2. Problem & Goals
### 2.1 Problem
Users often leave the reading page to find music on YouTube (search → pick playlist → ads → return), taking 3+ minutes and breaking flow.

### 2.2 MVP Goal
Keep the user in the reading flow by **auto-ready (paused)** music, then start playback with a single click.

### 2.3 Non-goals
No medical/therapeutic claims, no identity-based recommendations, and no copyright-infringing extraction.

---

## 3. Target Users
- Heavy text consumers (blogs, docs, news, web novels)
- Needs: reduce boredom, reduce selection friction, closer-to-taste BGM automation

---

## 4. Core UX Principles
- **No autoplay**: default is auto-ready (paused) + explicit Play click
- **Trust first**: never store raw text on server; avoid raw URL/domain storage (hash only)
- **Minimal disruption**: Control Bar on content page; playback in Player tab

---

## 5. User Flow
1) Visit an article page  
2) First scroll → show Control Bar  
3) New domain → consent modal (checkbox + 3 buttons)  
4) If allowed → Ready (paused)  
5) User clicks Play → playback starts in Player tab  
6) Next as needed  
7) 15 minutes inactivity → auto stop  
8) Stop / Quit anytime (Quit closes Player tab)

---

## 6. UI Surfaces
- **Content page**: Control Bar (Play/Stop/Quit/Next/Volume/Tags/Open Player)
- **Toolbar popup (primary)**: action-first controls + rolling 7-day summary
- **Onboarding (minimal)**: ask only for a Vocal preset once (≤10s); mode is toggle in popup

---

## 7. Music Matching (YouTube)
- Candidates: Top10 search results
- Selection: weighted random via a “study-friendly score”
  - penalties: live/cover/lyrics/mv/performance/dance/reaction
  - bonus: mode match (Vocal/Inst)
  - weak bonus: recency
- Next policy: reuse same Top10 up to 3 times; re-search on 4th
- De-dup: exclude track_id played within 30 minutes per (domain_hash, url_hash)

---

## 8. AI Analysis (Antigravity + Opus)
- Primary: Google Antigravity + Opus (Claude Opus 4.5 Thinking)
- Input: partial text (800–1500 chars) + category enum + domain_hash/url_hash
- Output (minimal):
```json
{
  "tempo": "slow|medium|fast",
  "genres": ["primary", "secondary"]
}
```
- Fallback: Last Known Good → default preset (focus/lo-fi/ambient)

---

## 9. Architecture (Backend Proxy + Player Tab)
- Extension: extraction + UI + messaging
- Player tab: YouTube IFrame playback + queue management
- Backend Proxy: Antigravity calls + cache/limits/fallback/observability/security

---

## 10. Proxy API (Recommended)
- Abuse prevention: CORS allowlist (extension ID), rate limit (install_id + IP), request size limit
- Endpoints:
  - `POST /v1/analyze`
  - `POST /v1/events` (anonymous, opt-out supported)

---

## 11. Cost / Quota Control
- Soft limit: **20 analyses/day**, reset at **midnight (local time)**
- Cache: (domain_hash, url_hash) **30-min TTL**
- Over limit: Last Known Good → default preset + toast

---

## 12. Privacy / Trust / Logging
- No raw text storage on server; avoid raw URL/domain storage (hash only)
- Log banned: text, raw URL/domain, auth/cookies, raw IP, raw prompts
- Minimal logs allowed: request_id, install_id_hash, domain_hash/url_hash, category, text_len, source, latency_ms, error_code
- Telemetry: default ON + opt-out

---

## 13. Weekly Report (Rolling 7 Days)
- Surface: toolbar popup summary + “View details”
- Session: Play start → Stop/Quit/Auto-stop
- Items: total play time, sessions, mode/intensity distribution, top tags
- Trust booster: show count of auto-stopped sessions

---

## 14. Metrics & Analytics Events
- North Star: D7 Retention
- Supporting: Ready→Play conversion, Next rate, fallback_used rate, weekly sessions
- MVP required events (5): play_clicked, auto_stop_triggered, next_clicked, fallback_used, settings_changed
- Recommended: consent_modal_shown, consent_allowed/denied, player_ready

---

## 15. Risks & Mitigations
- Quota/availability: proxy cache/limits/fallback + alerts when fallback spikes
- Autoplay policy: auto-ready (paused) by default; explicit Play to start
- Monetization: low WTP for auto-music alone; Pro should focus on work value (per-domain settings, advanced reports, genre packs)

---

## 16. Appendix: Deployment Recommendation (Cloud Run)
- Recommended: Google Cloud Run (asia-northeast3, Seoul)
- Network: CORS allowlist, rate limits, request size limits
- Observability: p50/p95 latency, 5xx, source distribution, limit consumption, alerts for spikes
