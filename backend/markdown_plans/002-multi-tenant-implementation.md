# 002 — Multi-Tenant Implementation (Isolation & Short-Term Memory)

**Plan type:** Strategy / implementation plan  
**Status:** Draft — awaiting review  
**Source of truth:** [`project.md`](../project.md) — Agent layer (Conversation History) + Data layer (Supabase)

---

## Purpose

Define **tenant isolation** (per-user `user_id`) and **short-term memory** so that conversation state is correct, secure, and scalable before implementing corresponding schema and application code.

This plan is **design-only** until approved; no `.ts` implementation should proceed without that approval (per project workflow).

---

## Definitions

| Term                  | Meaning                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant boundary**   | All persisted chat and profile-linked data is scoped by a stable **`user_id`** (application identity, typically aligned with Supabase Auth `uuid` or equivalent).                         |
| **Short-term memory** | Context the agent uses **within a session** or **recent window** (e.g. last N turns, token-budgeted slice, or explicit “session id”), distinct from long-term stored history in Postgres. |
| **Long-term memory**  | Durable rows in Supabase (and optional summaries/embeddings in later phases — out of scope unless added in a future plan).                                                                |

---

## Isolation strategy (`user_id`)

**Principles**

1. **Every** chat-related row carries **`user_id`** (UUID or text per existing auth — to be fixed in schema migration plan).
2. **Application queries** always filter by `user_id` (and optionally `session_id` / `room_id`).
3. **Database enforcement:** enable **Row Level Security** on relevant tables; policies restrict rows so a principal can only read/write rows where `user_id` matches `auth.uid()` (or a validated service role pattern for the worker — detailed in an approved migration plan).
4. **LiveKit linkage:** map LiveKit participant identity → same **`user_id`** used in the DB so voice and text paths share tenancy (exact mapping TBD in a LiveKit integration plan; `project.md` shows AUDIO/UI → Agent — identity must be consistent).

**Non-goals (this plan)**

- Full auth implementation in Flutter (referenced only).
- Detailed RLS SQL — belongs in a focused migration plan after this strategy is approved.

---

## Short-term memory strategy

**Goals**

- Keep Claude prompts **bounded** and relevant.
- Avoid leaking another user’s turns into the model context.

**Recommended approach (for approval)**

1. **Session identifier:** Introduce `session_id` (or reuse LiveKit `room_name` / internal session UUID) per user conversation thread.
2. **Window:** Load last **K** message pairs from Postgres **where `user_id` = … and `session_id` = …**, or maintain an in-memory deque for the worker process with the same keys.
3. **Token budget:** Optionally trim oldest turns until under a max token budget before calling Claude.
4. **Ephemeral cache:** Optional Redis or in-worker Map keyed by `(user_id, session_id)` for hot path — only if latency requires it; Postgres-first is acceptable for early phases.

**Alignment with `project.md`**

- **Conversation History** must remain **Logically per-tenant** while **HISTORY ↔ DB** stays the durability path; short-term memory is the **slice** of history (and optional buffers) fed into each Claude request.

---

## Dependencies

- **`001-initial-infrastructure-audit.md`:** Confirms Supabase connectivity baseline.
- **`000-project-overview.md`:** Confirms overall Agent ↔ Claude ↔ DB positioning.

---

## Risks

- **Service role vs user JWT:** The TS worker may use a service key; RLS must still prevent cross-tenant access — design service-role queries to **always** include `user_id` from a trusted source (token validated upstream), not from client-supplied guesswork.
- **Session fixation:** Ensure `session_id` cannot be enumerated across users.

---

## Approval criteria (for sign-off)

- [ ] `user_id` is accepted as the tenant key end-to-end (Flutter → LiveKit → Agent → DB).
- [ ] Short-term memory model (session + window + optional token trim) is accepted or revised with explicit amendments.
- [ ] Stakeholder authorizes a follow-on **migration / implementation** plan or tickets for schema + code (after this document is approved).

---

_Last updated: created as initial draft for stakeholder review._
