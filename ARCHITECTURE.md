# Unlock — Architecture & Flows

> Living architecture reference. Diagrams are written in **Mermaid** so they render on
> GitHub and can be edited as text by Cursor.
>
> **Rule for Cursor / contributors:** whenever a change alters one of these flows
> (schema, agent behavior, routing, data path), update the relevant diagram in this
> file in the **same commit**. Keep code and diagrams in sync.
>
> Legend: 🟢 already exists (partial) · 🟠 new, to build

---

## 1. Application Map — 5 Layers

Each layer depends on the one above. Build order is top-down; **Layer 2 (multi-profile)
is the root** of the new work.

```mermaid
flowchart TB
    subgraph L1["Layer 1 — Private Professional Identity 🟢"]
        L1a["Master identity (private)"]
        L1b["Profile extractor (LLM) — runs each turn"]
        L1c["Mongo + Prisma — UserProfile"]
    end
    subgraph L2["Layer 2 — Professional Profiles (multi) 🟠 ROOT"]
        L2a["Profile model: 1 User -> N Profiles<br/>title, context, is_primary"]
        L2b["Confidence per profile<br/>Eng 94% / Arch 81% / AI 76%"]
        L2c["Agent detects N contexts,<br/>proposes split"]
    end
    subgraph L3["Layer 3 — Portfolio Library 🟠"]
        L3a["PortfolioItem model<br/>stored once"]
        L3b["Item <-> profiles<br/>many-to-many join"]
        L3c["File upload + 'My contribution'"]
    end
    subgraph L4["Layer 4 — Presentation & Sharing 🟠 (the WOW)"]
        L4a["Public page per profile<br/>route /:user/:profile"]
        L4b["Privacy: public/link/password/expiry"]
        L4c["Opportunity Profile<br/>paste job -> tailor (never invents)"]
    end
    subgraph L5["Layer 5 — Intelligence 🟢 (adapt existing)"]
        L5a["Contextual chat (active profile)"]
        L5b["Watchtowers per profile<br/>pass profile_id + persist"]
    end
    L1 --> L2 --> L3 --> L4 --> L5
```

---

## 2. User Flow — End to End

```mermaid
flowchart TD
    n1["1. Enter Unlock — lands in chat (not a form)"]
    n2["2. Discovery Conversation<br/>3-4 questions: role, responsibilities, environment, goals<br/>collects only, doesn't solve"]
    n3["3. First interpretation — roles/skills + confidence levels"]
    n4{"Do I know<br/>enough to start?"}
    n5["4. Create first profile — user reviews/corrects/adds"]
    n6["5. Suggest additional profiles<br/>'I found 3 contexts': Eng, Architect, AI"]
    n7["6. Choose primary profile"]
    n8["7. Enrichment — resume, LinkedIn, GitHub, photos"]
    n9["8. Portfolio Library — pick which profiles each item appears in"]
    n10["9. Public page — Unlock builds the presentation"]
    n11["10. Personalization — reorder, hide, set privacy"]
    n12["11. Sharing — a link per profile"]
    n13["12. Specific opportunity — paste job, AI tailors (never invents)"]
    n14["13. Contextual chat — active profile as context"]
    n15["14. Watchtowers — external signals per profile"]
    n16["15. Continuous evolution — profile stays alive"]

    n1 --> n2 --> n3 --> n4
    n4 -- "no: more questions" --> n2
    n4 -- yes --> n5 --> n6 --> n7
    n7 --> n8 --> n10
    n7 --> n9 --> n11
    n10 --> n12
    n11 --> n12
    n12 --> n13 --> n14
    n13 --> n15
    n14 --> n16
    n15 --> n16
```

---

## 3. Memory — Living Identity

The identity is never "done": each input updates confidence and can change the primary profile.

```mermaid
flowchart TD
    core["Private Professional Identity<br/>source of truth, always growing 🟢"]
    in1["New conversation"]
    in2["New project / attachment"]
    in3["Role change / new skill / goal"]
    in4["User correction"]
    upd["Update identity (upsert)<br/>recompute confidence per dimension 🟠"]
    shift["Detect meaningful shift<br/>'Work shifted to architecture — make it primary?'"]
    der["Derived profiles update<br/>same experience shown differently per profile"]

    in1 --> upd
    in2 --> upd
    in3 --> upd
    in4 --> upd
    core --> upd
    upd --> shift --> der
    upd -. back to identity .-> core
```

---

## 4. Memory — Across Sessions

When the user returns, the agent loads profile + history + long-term summary as context
instead of starting from zero.

```mermaid
flowchart LR
    subgraph A["Session A (today)"]
        a1["User talks"] --> a2["Save each turn<br/>ChatHistory 🟢"]
        a2 --> a3["Extractor updates<br/>UserProfile / Profiles 🟢"]
        a3 --> a4["Generate/update<br/>long_term_summary 🟢"]
    end
    subgraph STORE["Persisted memory (Mongo)"]
        s1["ChatHistory"]
        s2["Profiles + confidence"]
        s3["long_term_summary"]
    end
    subgraph B["Session B (returns later)"]
        b1["User returns<br/>same user_id"] --> b2["Backend loads context 🟠"]
        b2 --> b3["Inject into system prompt"]
        b3 --> b4["'Welcome back. How did [goal] go?'"]
    end
    a2 --> s1
    a3 --> s2
    a4 --> s3
    STORE --> b2
```

> Already exists: ChatHistory, extractor, long_term_summary.
> Missing: inject context into the return prompt (returning-user greeting) + pick active profile.

---

## 5. Memory — Data & Storage

Golden rule: **Mongo stores structured memory** (text, refs, confidence); **large files go
to file storage** and Mongo keeps only the reference.

```mermaid
flowchart TB
    src["User speech/text + attachments"]
    be["Backend (Node/Express/WS)<br/>LLM extractor + routes"]
    src --> be

    subgraph MONGO["MongoDB via Prisma — structured memory"]
        m1["ChatHistory 🟢"]
        m2["UserProfile 🟢"]
        m3["long_term_summary 🟢"]
        m4["Profile (N per user) + confidence + is_primary 🟠"]
        m5["PortfolioItem + item<->profiles join 🟠"]
        m6["ShareSettings (public/link/password/expiry) 🟠"]
    end
    subgraph FILES["File storage (S3 / bucket) 🟠"]
        f1["Photos, videos, PDFs<br/>Mongo stores only the URL/ref"]
    end

    be -- "read/write structured" --> MONGO
    be -- "upload file" --> FILES

    MONGO -. read .-> c1["Contextual chat (active profile)"]
    MONGO -. read .-> c2["Watchtowers (per profile)"]
    MONGO -. read .-> c3["Public page (read-only, respects privacy)"]
    MONGO -. read .-> c4["Opportunity Profile (tailors for a job)"]
```

---

## Build Order (reminder)

1. **Layer 2 — multi-profile** (root; changes the schema: 1 User -> N Profiles)
2. **Layer 3 — Portfolio Library** (what profiles display)
3. **Layer 4 — shareable page** (the "wow"; heaviest — public routes, privacy, job tailoring)
4. **Layer 5 — adapt chat + Watchtowers** per profile (endpoint already exists)

**Before touching code:** confirm the current schema with `cat backend/prisma/schema.prisma`
and review the agent system prompt in `backend/index.ts`.
