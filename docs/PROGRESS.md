# Project Progress

## Current phase

Phase 5 — Backend wiring (LiveKit token, REST APIs) for June 1 demo

## Completed

- [x] Phase 1 — Web bootstrap (Vite + React + Tailwind tokens + router stubs) (2026-05-21)
- [x] The Awakening screen at `/` (2026-05-21)
- [x] Possibility Map hero screen at `/map` — dual Dynamis/Energeia constellations, sequential reveal animation, Climate Adaptation dimension cards (2026-05-27)
- [x] Discovery Chat at `/guide` — mock UI + session hook (LiveKit TODO) (2026-05-21)
- [x] Intent Profile read-only view at `/you` (2026-05-21)
- [x] Transformation Plan at `/plan` (2026-05-21)
- [x] Dynamis tree (polished single-file SVG) on `/plan` — depth layers, animations, fruits tied to realized plan items (2026-05-22, finalized)
- [x] Today screen at `/today` + app navigation layout (2026-05-21)
- [x] Stretch — Daily Reflection (`/guide?mode=reflection`, card on Today) (2026-05-21)
- [x] Git repository initialized and linked to GitHub remote
- [x] Cursor rules and skills for Dynamis conventions

## In progress

- [ ] Backend scaffold (FastAPI + LiveKit)

## Next up

- [ ] `GET /api/profile/{user_id}` backend + wire Intent Profile service
- [ ] `GET /api/council/today/{user_id}` backend + wire council service
- [ ] LiveKit token endpoint + real Discovery session
- [ ] End-to-end demo path: Awakening → Today → Guide → You → Map → Plan

## Known risks / debt

- Memory store choice (MongoDB vs PostgreSQL) still deferred — use `MemoryStore` abstraction when backend starts
