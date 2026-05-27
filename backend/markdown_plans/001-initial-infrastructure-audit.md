# 001 — Initial Infrastructure Audit (Database Connectivity)

**Plan type:** Audit / baseline record  
**Status:** Draft — awaiting review  
**Source of truth:** [`project.md`](../project.md) — Data layer: PostgreSQL (Supabase)

---

## Purpose

Document the **successful baseline** already achieved: connecting the TypeScript backend to **Supabase PostgreSQL** and persisting chat rows. This establishes what is proven before layering LiveKit, MCP, and multi-tenant rules.

---

## Scope

**In scope**

- Connection mechanism and environment variables.
- Schema usage as exercised by current code (minimal `chat_history` writes).
- SSL / cloud connectivity notes.

**Out of scope** (deferred to other plans)

- Row Level Security (RLS) policies and `user_id` scoping → see `002-multi-tenant-implementation.md`.
- LiveKit or MCP wiring.

---

## Verified behavior (baseline)

| Item                  | Detail                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Driver**            | `pg` `Client` with `connectionString` from environment.                                                                                                    |
| **Connection string** | `DATABASE_URL` (injected via `.env` at runtime).                                                                                                           |
| **TLS**               | `ssl: { rejectUnauthorized: false }` — typical for Supabase/cloud Postgres when using connection strings that require SSL without local CA pinning in dev. |
| **Lifecycle**         | `connect()` before work; `end()` in `finally` after each run (current script-style agent).                                                                 |
| **Persistence**       | `INSERT INTO chat_history (sender, message) VALUES ($1, $2)` for both user and agent messages.                                                             |

---

## Alignment with `project.md`

- The **DATA** subgraph targets **PostgreSQL (Supabase)**; this audit confirms the agent path can **read/write** the database for conversation history, consistent with **HISTORY ↔ DB** in the diagram.
- Full production hardening (RLS, secrets rotation, connection pooling) is **not** claimed complete here — only that **connectivity and basic inserts** succeeded in the initial test.

---

## Risks / gaps (honest)

- **Single global history:** Current inserts do not scope by `user_id` or session; multi-tenant isolation is explicitly planned in `002-*`.
- **SSL setting:** `rejectUnauthorized: false` is convenient for development; production should use proper CA trust or Supabase-recommended SSL configuration.
- **Operational:** Long-lived workers should use a pool (`pg.Pool`) rather than one-shot connect/end per invocation when moving beyond scripts.

---

## Approval criteria (for sign-off)

- [ ] Stakeholder confirms this audit matches what was run in the environment (Supabase cloud, successful inserts).
- [ ] No objection to listing `DATABASE_URL` + `pg` as the canonical DB approach until superseded by a later infra plan.

---

_Last updated: created as initial draft for stakeholder review._
