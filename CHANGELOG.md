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
