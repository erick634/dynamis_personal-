# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- feat(backend): Profile REST layer — `profiles` repo + GET/POST/PATCH `/profiles` (multi-profile per user, single primary)
- feat(backend): on explicit user confirmation, extract and create multi-Profiles via `enqueueProfileUpdate` (cheap confirm-signal guard; skip duplicate titles)
- feat(profiles): frontend data layer — `listProfiles` / `updateProfile` / `setPrimaryProfile` (`src/features/profiles/`)
- feat(backend): Portfolio REST layer — `portfolio` repo + GET/POST/PATCH/DELETE `/portfolio`
- feat(backend): shareable Profile pages — generate/revoke token + public `GET /share/:token` (whitelist payload)

### Changed

- feat(backend): Discovery assumes professional focus by default — no personal-vs-professional fork in MUST #0 or first welcome
- feat(backend): Discovery agent commits to helping organize life (anti passive interview loop; Watchtower may be named once)
- feat(discovery): identity gate speaks the “complete a few details” line via Cartesia (`POST /tts`)
- feat(chat-history): Old chats list + session transcript (`/chats`, continue in Chat, new chat)
- feat(discovery): returning-user intent picker — refine / new Watchtower / advance
- feat(watchtowers): single Watchtower detail card with objectives, check-in calendar, and in-app reminder/alarm toggles (localStorage)
- feat(nav): replace Live with Chat — opens Discovery (`/guide`); `/welcome` and `/live` redirect there
- feat(discovery): chat-first identity — start Discovery without onboarding; after the first message, inline card collects name, email, and birth year then continues
- feat(app): gate main shell behind `RequireCurrentUser` — first visit / incognito redirects to `/onboarding` before Discovery chat
- feat(discovery): Speak opens immersive live stage with full voice (`mode: full` + TTS) so the Lead Guide speaks again; mic stays STT-only dictation
- feat(discovery): Speak opens immersive live stage — animated full-screen starfield + large “D” orb, Live badge, close to end (ChatGPT/Claude-style transition)
- feat(ui): reusable `StarField` background (dark gradient + scrolling stars) shared by Awakening, Welcome, and Discovery chat
- feat(app): `/` is Discovery chat inside AppLayout (starfield behind); Awakening lives at `/awakening`; `/guide` remains a chat alias
- feat(backend): turn-based closing pressure (`buildClosingPressureSystemBlock`) for first-pass profile — soft at 5th user turn, hard at 6th (text `runAgentTurn` path)
- fix(live): text-only sessions ignore voice WebSocket events; voice activates only via explicit switch
- feat(welcome): mode choice before live session — voice or writing, with text-only path via `startTextSession`
- feat(welcome): text input during active live session on `/welcome` (primary live route)
- feat(live): text input during active voice session — sends via `POST /chat` reusing the same `sessionId`
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

- fix(backend): voice path applies profile checkpoint pressure; Intent Profile extraction on voice defaults ON (`PROFILE_UPDATE_ON_VOICE`)
- feat(backend): Discovery first-pass is 3–4 turns with early personal/professional axis, profile checkpoint (pause vs continue), then enrichment mode
- feat(backend): `POST /watchtower-recommendations` generates exactly one Watchtower (with suggested reminder time) instead of 2–5
- feat(watchtowers): `/watchtowers` shows one actionable Watchtower instead of a list of recommendations
- feat(ui): brand mark uses open padlock (`BrandIcon` / Lucide `Unlock`) instead of letter D — BrandMark, LiveOrb, Discovery empty state
- feat(ui): favicon + document title use Unlock (open padlock replaces letter R; `<title>` Dynamis → Unlock)
- feat(ui): brand blue softened to night navy (`#1c4a7e`) so sidebar Unlock/active nav pair with the starfield chat
- feat(nav): desktop sidebar collapses to icon rail by default — open padlock brand mark; expand/collapse toggle
- feat(ui): hyperspace transition accelerates the starfield and opens the Unlock mark before primary navigation and immersive Speak
- fix(ui): hyperspace shackle now rotates counter-clockwise so the padlock visibly opens (was closing)
- feat(ui): Intent Profile restyled to match editorial mock — narrower column, softer cards, value pills without chrome, Current focus without red tint, Guide Notes nest
- feat(you): Profile hero card — open padlock with glow, completeness/updated/conversations metrics, Refresh Analysis (part 1 of profile redesign)
- feat(you): Profile clarity card — large overall ring + dimension bars with descriptions (replaces “What we know so far”)
- feat(you): Profile insight grid — Who you are / Aspirations / Strengths / Growth areas with themed icons and colors
- feat(you): Values card — heart mark + soft pink pills with contextual icons
- feat(you): Current focus card — flame mark on a soft amber tint
- feat(you): Synthesis card — sparkles mark, check list, and unlock orb with orbital rings
- feat(you): Profile footer — Refresh Analysis + Continue Unlocking actions beside Guide note tip
- feat(i18n): product brand name in Awakening UI copy is Unlock (`brand.name`, `bootstrap.title`, `awakening.description`, `awakening.benefits.sectionLabel`) — Dynamis kept for agent/concept/tree terms
- feat(discovery): agent chat auto-scrolls to latest message; dark thin scrollbar (`scrollbar-on-dark`) on the message list
- feat(discovery): agent chat is full-width over starfield — centered empty state + floating input; Intent Profile signals panel out of the chat shell (component kept; profile on `/you`)
- feat(you): profile completeness rings/bars + empty fields CTA to continue conversation
- feat(backend): profile-first close pressure soft@5 / hard@6 — MUST essentials + specificity, stay-on-topic, strengths/focus as SHOULD only
- feat(backend): Unlock chat is profile-only first pass (~5 exchanges) — unlock-plan transition, no in-conversation Watchtower; voice prompt aligned
- feat(onboarding): capture year of birth only (privacy) — approximate age via `birthYear`
- feat(backend): Discovery stop rule is turn-based (close by 3rd reply; never a 4th question) + top-of-prompt IMPORTANT
- feat(backend): Discovery closing stop rule — close after ≥3/5 areas or ~6 questions; no further questions
- feat(backend): Discovery closing prompt — save Watchtower recommendation to gallery, gentle finish-below nudge (voice + text)
- feat(live): message timestamps in welcome and live transcripts (`Intl` time format, locale-aware)
- feat(live): mobile-friendly text input — touch targets, `text-base` (no iOS zoom), send icon button aligned with Discovery
- feat(voice): barge-in via local mic VAD while the agent speaks (stop TTS + listen); endpointing silence raised to 2800 ms
- feat(awakening): remove the decorative orange door graphic from The Awakening screen
- feat(awakening): premium landing redesign — nav, cinematic hero (~45% width), glass benefit strip; starfield/background preserved
- feat(onboarding): email is required on profile creation (validation + `CurrentUser.email`)
- feat(auth): `/login` screen (email-only) + Sign In entry; Create profile CTA; `GET /profile/by-email` and email persisted on signup
- feat(welcome): returning-user copy — last conversation topic + continue CTA (`GET /profile/:userId/return-context`)
- feat(voice): agent speaks first on session open (`VOICE_AGENT_OPENS`, default true); kickoff not saved as a user message
- feat(welcome): returning conversations stay on `/welcome` (Live nav and continue CTAs redirect there)
- fix(backend): register `GET /profile/by-email` before `/profile/:userId` so login lookup is not treated as a UUID
- fix(auth): login lookup uses `POST /auth/lookup-by-email` (avoids conflict with `/profile/:userId`)
- feat(app): Log out control in app nav clears session and returns to `/login`
- feat(live): Screen Wake Lock during voice sessions to reduce mobile lock-screen interruptions
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

- fix(ui): responsive layout across app screens — bottom nav overflow, profile/other pages with min-w-0, break-words, and fluid padding
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
