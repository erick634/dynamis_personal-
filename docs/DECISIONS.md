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
