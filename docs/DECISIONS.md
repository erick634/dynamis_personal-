# Architectural Decision Records

## ADR-001: Dedicated personal repository

Date: 2026-05-21  
Status: Accepted

### Context

The Dynamis POC needs its own version control, separate from other projects under `C:\projetos`.

### Decision

Use `https://github.com/erick634/dynamis_personal-.git` as the canonical remote. Initialize Git at `Dynamis/` root, not the parent `projetos/` folder.

### Alternatives considered

- Reuse the parent `projetos` git repo — rejected to avoid mixing unrelated projects.

### Consequences

- Clean history and remotes for Dynamis only.
- Clone and CI target a single-purpose repository.

---

## ADR-002: Web-first delivery for June 1 demo

Date: 2026-05-21  
Status: Accepted

### Context

The POC demo on June 1, 2026 must land a compelling browser experience (Possibility Map, Discovery) while Flutter mobile continues in parallel.

### Decision

Prioritize the Vite + React web app as the primary deliverable. Share contracts with mobile via one FastAPI backend and LiveKit, but do not block web on mobile parity.

### Alternatives considered

- Mobile-first — rejected for demo timeline and reviewer (Brian) focus on desktop hero flows.

### Consequences

- Web routes and UI ship first; Flutter unification deferred until after the demo.

---

## ADR-003: Unified backend and LiveKit real-time path

Date: 2026-05-21  
Status: Accepted

### Context

Web and Flutter must not duplicate agent logic or memory access. Discovery and voice sessions need low-latency streaming.

### Decision

One FastAPI backend for REST (profile, possibility map, plan, council) and LiveKit (rooms + data channel) for agent conversation. Frontend mirrors session state; backend is source of truth. All memory access goes through a `MemoryStore` protocol.

### Alternatives considered

- REST-only chat — rejected; does not meet voice + streaming requirements.
- Separate backends per client — rejected; violates single-backend principle.

### Consequences

- Typed LiveKit data events shared between Python worker and TypeScript client.
- No OpenAI/Anthropic calls from the frontend.

---

## ADR-004: Semantic color palette (timeline metaphor)

Date: 2026-05-20  
Status: Accepted

### Context

Early mockups used gold/amber for achievement cues. The team reframed color as a **timeline**: blue = memory, red = present achievement (Energeia), green = future suggestion.

### Decision

Adopt the palette in `20-dynamis-design-system`: blue `#1B5E9F` family, red achievement `#D94A38` family, success/suggestion `#2EBC8F`, light default surfaces. **No gold/amber/yellow** as primary UI colors. Red is never used for generic errors (`#9B2C2C` for destructive). Tailwind theme maps CSS variables only — no default `blue-500` / `gray-700` classes.

### Alternatives considered

- Gold achievement accents — reverted May 20, 2026.
- Dark-first app shell — rejected; light default except Awakening and Possibility Map.

### Consequences

- `src/styles/tokens.css` is canonical; new colors require updating the design rule first.
- Fraunces (display) + Manrope (body) loaded from Google Fonts.

---

## ADR-005: Dynamis tree visual semantics

Date: 2026-05-22  
Status: Accepted

### Context

The Transformation Plan needs a single visual metaphor for progress that matches product vocabulary (rule 11): journeys started, daily actions, and realized goals (Energeia). The previous tree used circles for foliage and mixed red circles with green, which blurred meaning.

### Decision

Render the Dynamis tree as parametric SVG subcomponents with fixed position slots:

- **Branches** — one per active `DynamisGoal` (journey started)
- **Leaves** — green teardrop shapes for daily actions (demo: `streakDays` as proxy until action history exists)
- **Fruits** — red radial-gradient circles (never gold) for `realized === true` (Energeia)

Slots are ordered central → peripheral; counts slice predefined coordinate arrays. Enter animations fire when counts increase (React key + CSS). `prefers-reduced-motion` disables motion.

### Alternatives considered

- Circle foliage clusters — rejected; indistinguishable from fruits and not leaf-shaped
- Gold fruit accents — rejected per ADR-004 (red = Energeia achievement)
- Zustand for tree counts — rejected for demo; parent `goals` state in `TransformationPlanScreen` is sufficient

### Consequences

- Files under `src/features/transformation-plan/tree-*.tsx` and `tree-positions.ts`; orchestrator `dynamis-tree.tsx` stays under 200 lines
- i18n keys under `transformationPlan.tree.*` for `aria-label` and screen-reader text
- When backend exposes action history, replace `leaves = streakDays` proxy with a real count

---

## ADR-006: Possibility Map visual design

Date: 2026-05-27  
Status: Accepted

### Context

The Possibility Map is the hero moment of the June 1 demo — a threshold-crossing visualization of Dynamis (untapped potential) becoming Energeia (realized potential expanded by AI). The screen must be visually striking, accessible, and ready for backend integration without coupling to live data yet.

### Decision

Implement the Possibility Map as a feature module under `src/features/possibility-map/` with:

- **Dual constellation SVGs** — sparse blue Dynamis constellation (left) vs dense red Energeia constellation (right) with radial glow and subtle pulse on accent nodes
- **Curved expansion arrow** — gradient stroke (blue → red) with one-time draw animation followed by infinite dash flow; rotates vertical on mobile
- **Sequential CSS reveal** — header → Dynamis → arrow → Energeia → staggered dimension cards (~1.6s total); all disabled under `prefers-reduced-motion`
- **Climate Adaptation mock persona** — four dimension cards with leverage percentages (340, 220, 180, 260) via `climateAdaptationMockMap`; service layer returns mock with simulated latency until `GET /api/possibility-map/{userId}` is wired

No Framer Motion — CSS keyframes only. All copy via i18n (`possibilityMap.*`). Semantic Tailwind tokens only (no default palette or gold accents).

### Alternatives considered

- Single combined visualization — rejected; dual-side layout matches vision doc v10 and mockup screen 4
- Live API fetch in demo — rejected; mock-first with TODO hook preserves rule 12 scope while preparing rule 13 contract
- Framer Motion for reveal — rejected; no dependency in project, CSS sufficient

### Consequences

- Files: `possibility-map.tsx`, `dynamis-constellation.tsx`, `energeia-constellation.tsx`, `dimension-card.tsx`, `possibility-map-mock.ts`, `possibility-map.css`
- `getPossibilityMap()` in `possibility-map-api.ts` replaces direct fetch for demo; swap implementation when backend is ready
- Dimension i18n keys use `healthLongevity` and `purposeMeaning` (not generic `health`/`purpose`)
