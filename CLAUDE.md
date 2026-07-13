# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Dynamis is an AI transformation guide: a conversational agent builds an **Intent Profile** of the user, renders a **Possibility Map** (untapped potential vs. AI-expanded potential), and produces a **Transformation Plan**. Web POC, originally targeting a June 1, 2026 demo.

Two independent apps in one repo, each with its own `package.json` and `node_modules` (no workspaces):

- **Root** — `dynamis-web`, the Vite + React 18 + TS frontend.
- **`backend/`** — a Node + Express 5 service that *is* the agent (Anthropic Claude + AssemblyAI STT + Cartesia TTS + MongoDB via Prisma).

The frontend calls this backend directly. `API_BASE_URL` defaults to `http://localhost:8000` and `backend/.env` sets `PORT=8000`.

## Commands

**Before starting the backend, always confirm MongoDB is up:**

```bash
docker ps                     # the `dynamis-mongo` container must show Up
docker start dynamis-mongo    # if it isn't
```

This is not optional and the failure is silent. If the container is stopped, the backend still connects and serves HTTP, but **voice turns cancel with no error and the agent never replies**. Check `docker ps` first before debugging a "broken" voice pipeline.

Frontend (repo root):

```bash
npm run dev         # Vite dev server → http://localhost:5173
npm run build       # tsc -b && vite build
npm run lint        # eslint . — no `any`, no unused imports, no console
npm run typecheck   # tsc -b --noEmit
npm run format      # prettier --write .
```

Backend (`cd backend`):

```bash
npx prisma generate   # REQUIRED before first run — see below
npm start             # tsx index.ts (no build step; tsx does NOT typecheck)
npx tsc --noEmit      # the only way to typecheck the backend
npx prisma db push    # sync schema to MongoDB
```

`backend/package.json` has **no `dev` script, no `build`, and no prisma scripts** — run those with `npx`. The Prisma client is generated to `backend/generated/prisma/` (gitignored), so a fresh clone must run `prisma generate` or `npm start` fails at import.

**There are no tests.** No vitest/jest/playwright, no test files, no test script (`backend`'s is the npm-init stub). Quality gates are lint + typecheck only, enforced by husky + lint-staged on commit. Don't claim a change is verified because "tests pass" — there are none to pass. Verify by running the app.

## Important: docs and rules have drifted from the code

Several authoritative-looking documents describe a system that **does not exist**. Trust the code over these:

- **`.cursor/rules/13-dynamis-architecture.mdc` and `22-dynamis-backend-python.mdc`** prescribe a **FastAPI/Python backend + LiveKit Agents worker**. There is no Python in this repo. The backend is Node/Express and the real-time path is a **raw WebSocket**, not LiveKit.
- **LiveKit is installed but not wired up.** `livekit-client` and `@livekit/components-react` are in `package.json` but never imported. `src/lib/livekit.ts` exists but only its `CouncilAgentId` type is consumed; no room is ever joined. Do **not** delete these — a migration of the voice pipeline onto LiveKit is planned (see *Current focus*). `src/routes/` is separately dead and genuinely unused — `App.tsx` imports feature screens directly.
- **`src/services/profile-api.ts`, `energeia-api.ts`, `livekit-token-api.ts`** fetch `/api/*` endpoints the backend does not implement. They were written against the never-built FastAPI spec.
- **`README.md`** still says the backend is a separate Python repo ("Robson's stack"). It now lives in `backend/`.
- **`backend/project.md`** diagrams Flutter + LiveKit Cloud + Groq Whisper + OpenAI TTS + Postgres. Reality: React + raw WS + AssemblyAI + Cartesia + MongoDB. Stale.
- **`.cursor/rules/20-dynamis-design-system.mdc`** forbids gold/amber and specifies `--bg: #FAFBFD` / `--blue: #1B5E9F`. The actual `src/styles/tokens.css` is a **warm-paper palette** (`--bg: #f4efe3`, `--blue: #1f44e0`) that ships `--gold` and `--ember`. The tokens file won.

When a rule and the code disagree, follow the code and say so rather than "fixing" the code to match a stale rule.

## Architecture

### Backend (`backend/index.ts`)

One ~2,900-line CommonJS file. Because `tsconfig.json` sets `types: []` + `verbatimModuleSyntax`, imports use the `const x = require('...') as typeof import('...')` pattern — match it.

- **HTTP** (Express, open CORS): `GET /health`, `POST /chat`, `GET /discovery-signals`, `POST /possibility-map`, `POST /transformation-plan`, `POST /reflection-summary`. The map/plan endpoints 404 with `profile not ready` until Discovery has captured enough signal.
- **WebSocket `/voice/realtime`** on the same HTTP server (via the `upgrade` event): AssemblyAI streaming v3 for STT → Anthropic streaming (chunked by sentence) → Cartesia `sonic-2` MP3 per sentence, with barge-in and turn cancellation. `mode=full` (voice agent) or `mode=stt_only` (dictation into the Discovery text box).
- **Auth**: `isRequestAuthorized()` accepts everything when `NODE_ENV !== 'production' && DEV_AUTH_BYPASS=true`; otherwise requires an **`x-api-key`** header matching `APP_SECRET_KEY`. Note the frontend sends `Authorization: Bearer <VITE_DYNAMIS_JWT>` instead — so outside dev bypass, frontend REST calls 401. Known gap.
- **Persistence**: Prisma → MongoDB. Two models in `backend/prisma/schema.prisma`: `ChatHistory` (`chat_history`) and `UserProfile` (`user_profiles`). Behavior is tuned almost entirely through env vars (models, token limits, prompt, flush thresholds, timeouts) — read the `process.env` block at the top of `index.ts` before hardcoding anything.
- `backend/sql/` is dead Postgres/Supabase migration leftovers, superseded by the Prisma schema.

### Frontend (`src/`)

- Import alias `@/` → `src/`. Routes are declared inline in `src/App.tsx`: `/` (Awakening), `/onboarding`, `/welcome`, then inside `AppLayout`: `/today`, `/plan`, `/map`, `/guide` (Discovery), `/live`, `/you`.
- **`src/lib/config.ts`** is the single source for `API_BASE_URL`, `WS_BASE_URL`, `DYNAMIS_JWT`, `ALLOW_EMPTY_TOKEN`, plus `VOICE_PATH`, `VOICE_SAMPLE_RATE` (16000), `ENDPOINTING_MS`.
- **No shared fetch wrapper.** Each `*-api.ts` re-implements `buildAuthHeaders()`. `src/lib/api.ts` is only the TanStack `queryClient`, not an HTTP client.
- **Voice** (`src/features/live/`): `voice-service.ts` captures mic via an AudioWorklet (`public/audio/pcm-worklet.js`) at 16 kHz mono and streams base64 PCM over the WS; `voice-protocol.ts` is the discriminated union of wire messages and must stay in sync with the backend's emitters (a Flutter sibling app shares this protocol); `streaming-tts-player.ts` plays the MP3 chunk FIFO.
- **State**: only two Zustand stores — `app-ui.store.ts` and `current-user.ts` (persisted to localStorage as `dynamis-current-user`; `userId` is a client-generated UUID). Several features cache to localStorage directly (`plan-storage.ts`, possibility-map fingerprint cache).
- Some screens are still mock-backed (`council.service.ts`, `intent-profile.service.ts`, `possibility-map-api.ts` return fixtures without hitting the network). Check whether a service is real before wiring UI to it.
- `src/lib/supabase.ts` **throws at import** if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset, and those vars are missing from `.env.example` — a fresh `cp .env.example .env` breaks any module importing it.

## Current focus (July 2026)

**Watchtower Recommendation** (per *DYNAMIS Discovery Agent PRD v3.0*) is the team's priority.

Scope **in this repo**: generate 2–5 `watchtower_recommendation` objects from the user's completed intent profile, triggered automatically when `breadth_pass_complete` flips to true. That is the whole job here.

The actual watchtower **scanning and monitoring is another team's responsibility — out of scope.** Generate the recommendation objects; do not build the thing that acts on them.

**Also planned: migrating the voice pipeline from the custom WebSocket to LiveKit.** Until that lands, LiveKit is *not* wired up — `src/lib/livekit.ts` is a dead stub (types only; `fetchLiveKitToken()` returns an empty string) and no room is ever joined. Treat the LiveKit deps and that stub as scaffolding for planned work, not as cruft to delete.

## Known gotchas

**A "brand-new user" is almost always localStorage, not a bug.** The user identity exists *only* in localStorage under the `dynamis-current-user` key (Zustand `persist`), and `userId` is a client-generated UUID. Clear it — devtools, a fresh profile, incognito — and the app silently mints a **new** `userId`. The backend then sees an unknown user: the agent re-introduces itself every turn and `/you` shows no profile.

The old data is not lost; it's still in Mongo under the **previous** `userId`. Check localStorage before chasing this as a code defect in the agent or the profile endpoints.

## Conventions

The `.cursor/rules/` files are the house style and mostly still apply (file organization, code structure, i18n, terminology). The load-bearing ones:

- **Product vocabulary is mandatory in code and copy** (`11-dynamis-terminology`). *Dynamis* = untapped potential, *Energeia* = potential realized. Use `IntentProfile` not `User`, `dynamisTree` not `progressTree`, `markAsEnergeia` not `complete`. Screens have fixed names: The Awakening, Discovery, Possibility Map, Transformation Plan, Council, Daily Reflection. Tone is direct and warm — no exclamation marks, no "Let's dive in", never score or quantify the user's worth.
- **i18n, English-first** (`04-i18n-english-first`). No hardcoded user-facing strings — everything through `t()`. Add keys to `src/locales/en-US.json` **first**, then `pt-BR.json`. Keys group by feature and describe meaning, not content. Format dates/numbers with `Intl.*`.
- **Files kebab-case, one primary export, named exports only, under 300 lines.** No `utils.ts`/`helpers.ts` dumping grounds. Components `PascalCase`, hooks `use-kebab-case.ts` → `useCamelCase`.
- **TypeScript**: never `any` (use `unknown` + narrow); prefer `type` over `interface`; discriminated unions for variants; `as const` objects over `enum`.
- **Styling**: semantic tokens only. Map through `src/styles/tokens.css` → `@theme inline` in `tailwind.css`. Never Tailwind defaults like `bg-blue-500` or `text-gray-700`. Fraunces for display, Manrope for body.
- **Never `console.log` in committed code** — ESLint enforces it.
- **After a meaningful change** (`07-changelog-discipline`): update `CHANGELOG.md` under `[Unreleased]`; append an ADR to `docs/DECISIONS.md` for architectural decisions; update `docs/PROGRESS.md` at milestones. Conventional Commits.
