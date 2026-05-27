# 000 — Project Overview (System Architecture)

**Plan type:** Living overview  
**Status:** Draft — awaiting review  
**Source of truth:** [`project.md`](../project.md) (architecture flowchart)

---

## Purpose

This document is the **holistic summary** of the Dynamis backend stack: how **LiveKit**, **Claude (Anthropic)**, and **Supabase (PostgreSQL)** fit together. Detailed audits and implementation strategies live in numbered follow-on plans (`001-*`, `002-*`, …).

---

## Planning methodology

Plans follow **Markdown Plans** conventions (Adam Johnson): numbered, markdown-first artifacts that describe **intent, scope, and sequencing** before code changes. Implementation work on `.ts` (and related code) proceeds **only after** the relevant plan is reviewed and approved.

---

## High-level architecture (from `project.md`)

| Layer               | Components                                                     | Role                                                  |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| **Client**          | Flutter app: Chat UI, LiveKit Flutter SDK                      | Text to agent; WebRTC audio to LiveKit                |
| **Orchestration**   | LiveKit Cloud / Server                                         | WebRTC audio pipeline; routes STT → agent → TTS       |
| **Agent & backend** | TypeScript agent worker, conversation history                  | Business logic, Claude integration, persistence hooks |
| **MCP**             | MCP server(s)                                                  | Tools, profile/API fetching                           |
| **AI services**     | Groq Whisper (STT), Anthropic Claude (LLM), OpenAI TTS-1 (TTS) | Speech and language                                   |
| **Data**            | PostgreSQL (Supabase)                                          | Durable storage for messages and tenant-scoped data   |

---

## Core flows

### Voice flow (LiveKit-orchestrated)

1. Flutter **AUDIO** ↔ **LiveKit** (WebRTC full audio).
2. LiveKit → **Whisper** (STT).
3. Transcribed text returns to LiveKit → forwarded to **Agent**.
4. Agent ↔ **Claude** (streaming tokens).
5. Agent response → LiveKit → **TTS** → audio back through LiveKit to the client.

### Text flow

- Flutter **UI** ↔ **Agent** (send text / SSE as designed).

### MCP & persistence

- Agent ↔ **MCP** servers (tool calls).
- MCP ↔ **DB** (profile/data queries).
- Agent → **Conversation History** → read/write **Supabase**.

---

## Technology anchors

- **LiveKit:** Voice orchestration and media path (not replaced by a generic HTTP-only backend for realtime audio).
- **Claude:** Primary reasoning model for the TS agent (product naming in `project.md`: Sonnet family for agent streaming).
- **Supabase:** Managed PostgreSQL + connectivity from the agent worker for history and multi-tenant data (see `002-multi-tenant-implementation.md`).

---

## Related plans

| File                                  | Topic                                                |
| ------------------------------------- | ---------------------------------------------------- |
| `001-initial-infrastructure-audit.md` | Confirmed infrastructure (DB connectivity baseline). |
| `002-multi-tenant-implementation.md`  | `user_id` isolation and short-term memory.           |

---

## Open questions (for future plans)

- Exact LiveKit room/participant identity mapping to `user_id`.
- SSE vs WebSocket contract for Flutter text chat.
- MCP server inventory and auth model.

---

_Last updated: created as initial draft for stakeholder review._
