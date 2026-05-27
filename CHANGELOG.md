# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- feat(transformation-plan): polish Dynamis tree with depth layers, sway animation, falling leaves, sparkles, and Energeia fruit pulse — all CSS-only, respects prefers-reduced-motion
- feat(transformation-plan): add subtle CSS animations to Dynamis tree — falling leaves background, gentle leaf sway, soft fruit pulse
- feat(transformation-plan): redesigned Dynamis tree as illustrated SVG with semantic branches/leaves/fruits mapping to journeys/actions/Energeia
- fix(transformation-plan): redesign Dynamis tree using a cleaner single-file SVG component adapted from a designer reference — branches/leaves/fruits parametrized by props, fruits use var(--color-red) for Energeia semantics

### Fixed

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
