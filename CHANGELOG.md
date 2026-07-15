# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- feat(backend): `GET /profile/:userId` returns Intent Profile from Prisma/Mongo (`{ profile }` or `{ profile: null }` when not ready)
- feat(you): `/you` Intent Profile hook reads from `GET /profile/:userId` instead of abandoned Supabase
- feat(backend): `POST /profile/email` upserts optional `email` on `UserProfile` (schema field + route; no frontend yet)
- feat(watchtowers): success-state CTA invites continuing the Live conversation for more Watchtowers
- feat(watchtowers): read-only `/watchtowers` screen fetches and displays LLM Watchtower recommendations (React Query, nav entry, i18n)
- feat(backend): `POST /watchtower-recommendations` generates 2–5 personalized Watchtower recommendations from the Intent Profile (LLM, no persistence yet)
- feat(backend): `POST /livekit/token` issues a LiveKit access token (identity = `userId`, `roomJoin`/`canPublish`/`canSubscribe` on the requested room) and returns it with `LIVEKIT_URL` — scaffolding for the planned voice-pipeline migration to LiveKit
- feat(backend): Discovery-focused agent prompt (Level 1) — Intent Profile gathering, pause/continue check-ins, and verbal Watchtower recommendations via system prompt
- feat(copy): Discovery and Welcome i18n aligned with Intent Profile and Watchtower framing
- feat(onboarding): multi-user profile flow with `/onboarding` and `/welcome` routes, persisted `CurrentUser` fields (date of birth, age, email), and Awakening CTA routing
- feat(live): voice WebSocket uses `userId` from `useCurrentUser` instead of hardcoded demo UUID; `/live` guarded when no profile


### Changed

- feat(watchtowers): success-state "Refresh recommendations" button forces a manual refetch (keeps `staleTime: Infinity` on mount)
- feat(live): End button on `/live` awaits session teardown then navigates to `/watchtowers` (new `live.controls.endAndWatchtowers` i18n; Welcome keeps `live.controls.end`)
- feat(welcome): End button awaits session teardown then navigates to `/watchtowers` (new `welcome.finishAndWatchtowers` i18n)

- feat(backend): first-interaction intro reframed as personal copilot (goals/growth); no Watchtowers or Intent Profile in the opening
- fix(backend): tighten voice agent prompts for shorter, more natural replies; reduce default `VOICE_MAX_TOKENS` from 700 to 280
- feat(backend): replace native MongoDB driver with Prisma Client (`ChatHistory`, `UserProfile` models); uses `DATABASE_URL`
- feat(copy): PRD vocabulary — Journey → Unlock Plan; Daily Reflection (feature labels) → Captain's Log / Diário de Bordo (i18n values only)
- feat(onboarding): Ready to Begin asks for date of birth instead of age; age is derived on submit and stored with `dateOfBirth`; styled date field with calendar icon and empty-state hint
- feat(today): proactive nudge driven by plan, Intent Profile, and Council — Mark Energeia action and deep links to plan/discovery
- feat(ui): prominent shared End the day button on Discovery and Today (links to reflection check-in)
- feat(discovery): microphone uses Live voice stack (`VoiceService` + AssemblyAI) in `stt_only` mode — transcribes into the chat input and sends via `/chat`
- feat(discovery): Intent Profile signals and emerging insight driven by profile + chat history (`GET /discovery-signals`, returned on `POST /chat`)
- feat(possibility-map): comparison cards layout (Dynamis ↔ Energeia), dimension cards with icon badges and leverage line per mockup v2
- feat(possibility-map): map generated from Intent Profile (LLM + derived fallback), localStorage cache keyed by profile fingerprint, dynamic constellations and regenerate control
- feat(today): dashboard wired to plan storage, streak, weekly Energeia, dynamic nudge, today agenda, and reflection completion state
- feat(transformation-plan): reflection check-in `did_today` items appear under Today filter as completed activities (localStorage per day)
- feat(discovery): reflection mode uses real `/chat`; `POST /reflection-summary` for end-of-day recap; Discovery → Reflection navigation
- feat(ui): reusable `ConfirmDialog` replaces `window.confirm` on Transformation Plan "New plan"
- feat(transformation-plan): persist plan per user in localStorage (`dynamis.plan.{userId}`), Duolingo-style streak, and "New plan" reset with LLM regen
- feat(transformation-plan): replace Dynamis tree with goal-based constellation (dynamic stars, journey path, streak halo) on light background
- feat(transformation-plan): `POST /transformation-plan` generates 5 LLM goals from Intent Profile; inline title edit (session-only); React Query cache `staleTime: Infinity`
- feat(possibility-map): `POST /possibility-map` now asks Claude for per-dimension `leveragePercent` (120–400) with defensive parsing and fixed fallbacks
- feat(possibility-map): `POST /possibility-map` backend endpoint generates dimension copy via Claude; frontend caches with React Query (`staleTime: Infinity`)
- feat(possibility-map): derive dimension cards from Supabase Intent Profile (pure TS, no LLM); climate mock remains fallback when profile is absent
- feat(discovery): personalized opening greeting with user name and today's objectives prompt; removed scripted seed messages
- feat(you): `/you` now loads the real Intent Profile from Supabase `user_profiles` with loading, processing, error, and manual refresh states
- feat(transformation-plan): polish Dynamis tree with depth layers, sway animation, falling leaves, sparkles, and Energeia fruit pulse — all CSS-only, respects prefers-reduced-motion
- feat(transformation-plan): add subtle CSS animations to Dynamis tree — falling leaves background, gentle leaf sway, soft fruit pulse
- feat(transformation-plan): redesigned Dynamis tree as illustrated SVG with semantic branches/leaves/fruits mapping to journeys/actions/Energeia
- fix(transformation-plan): redesign Dynamis tree using a cleaner single-file SVG component adapted from a designer reference — branches/leaves/fruits parametrized by props, fruits use var(--color-red) for Energeia semantics

### Fixed

- fix(lint): resolve 18 ESLint strict-type errors across discovery, possibility-map, today, and transformation-plan features (non-null assertions, unnecessary conditionals, async handlers)
- fix(transformation-plan): restructure Dynamis tree visual hierarchy — trunk widens at base, branches rise from the crown, leaves form dense clusters at branch tips, fruits sit inside clusters

### Added

- Local dev mode for Live: when the backend runs with `DEV_AUTH_BYPASS=true`, the web app connects to `/voice/realtime` without WorkOS sign-in. Toggled via `VITE_ALLOW_EMPTY_TOKEN=true` in `.env`. Defaults now point at `http://localhost:8000`.
- Lead Guide voice (backend TTS): English male “Carson” via Cartesia; live agent replies instructed to speak in English with warm mentor tone.
- Live screen now connects to backend `/voice/realtime` over WebSocket: PCM 16k mic capture via AudioWorklet, MP3 streaming TTS playback (one sentence per chunk), half-duplex pause/resume and barge-in interrupt — mirrors the `app-live-kit` Flutter protocol. JWT supplied via `VITE_DYNAMIS_JWT` (no in-app auth yet).
- Live transcript panel (user/assistant bubbles + live partial) and animated guide orb reflecting `ready/listening/thinking/speaking/error` states
- Live screen at `/live` with mock real-time session UI (video stage, controls, side panel) and bottom nav item beside Discovery
- `.gitattributes` enforcing LF line endings cross-platform
- feat(possibility-map): implement hero screen with dynamis/energeia constellations, dramatic reveal animation, and 4 dimension cards (Climate Adaptation mock)
- feat(tooling): add husky + lint-staged pre-commit hooks
- Daily Reflection stretch: card on Today → `/guide?mode=reflection`, three agent questions, journal/Energeia TODO hook
- Today screen at `/today` (proactive nudge, stats, Council cards, `getTodayCouncil` mock)
- App layout with 5-tab navigation (Today / Plan / Map / Guide / You) on all routes except Awakening
- Transformation Plan at `/plan` (Dynamis tree SVG, plan items, filters, Energeia checkbox stub)
- Intent Profile read-only view at `/you` (mission hero card, attribute grid, `useQuery` + mock service)
- Discovery Chat at `/guide` (mock session, side panel rings + insight, mic/input UI, `useDiscoverySession` ready for LiveKit)
- Possibility Map hero screen at `/map` (Dynamis/Energeia constellations, dimension leverage cards, `useQuery` + mock fallback)
- The Awakening screen at `/` (dark gradient, stars, spark, red door, BrandMark, i18n via `Trans`)
- `BrandMark` UI component and awakening feature module (`awakening-screen`, `awakening-cta`, `awakening-door`)
- Web app bootstrap: Vite 5, React 18, TypeScript strict, Tailwind v4 with semantic tokens
- React Router stubs for demo routes (Awakening, Discovery, Profile, Possibility Map, Plan, Today)
- TanStack Query, Zustand, react-i18next, LiveKit typed event stub, ESLint + Prettier

## [0.1.0] - 2026-05-21

### Added

- Initial repository with Cursor rules, skills, and project documentation scaffold
