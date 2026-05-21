---
name: progress-report
description: "Generates a structured project progress report from git history, CHANGELOG, and PROGRESS.md. Use when the user asks for a progress report, status report, sprint summary, what shipped, roadmap update, or generate a progress report. Palavras-chave PT: relatório de progresso, status do projeto, resumo da sprint, o que foi entregue, andamento do projeto, roadmap, relatório semanal, relatório mensal, gerar relatório de progresso."
disable-model-invocation: true
---
# Progress Report

## When to Use

- User asks to "generate a progress report" or equivalent (status report, sprint recap, what shipped)
- User wants a period summary (last week, month, since release)
- PT: relatório de progresso, status do projeto, resumo da sprint, o que foi entregue, andamento
- User asks what's in progress, blocked, or pending

## Instructions

### 1. Determine reporting period

Use the period the user specifies. Defaults:

- No period given → last 30 days
- "Since last release" → from latest version tag in `CHANGELOG.md` to now

### 2. Gather data

Run in parallel where possible:

```bash
git log --since="<period>" --oneline
```

Read:

- `CHANGELOG.md` — compare `[Unreleased]` vs last released version
- `docs/PROGRESS.md` — current phase, in progress, next up, risks

If `docs/reports/` does not exist, create it before saving.

### 3. Optional — test coverage

If the project exposes coverage (e.g. `coverage/` artifact, CI badge, or `npm test -- --coverage`), note delta or current %. Otherwise state "not available".

### 4. Write the report

Use this structure:

```markdown
# Progress Report — YYYY-MM-DD

## Period
<start> → <end>

## Summary
<2–4 sentences: what shipped and overall momentum>

## Shipped (from git + CHANGELOG)
- ...

## Unreleased (CHANGELOG [Unreleased])
- ...

## Active work (from PROGRESS.md)
- ... — estimated % if known

## Pending / next up
- ...

## Blockers & risks
- ...

## Test coverage
<delta or "not available">
```

### 5. Save and return

Save to:

```
docs/reports/YYYY-MM-DD-progress.md
```

Return to the user:

- Path to the saved file
- Executive summary (3–5 bullets)
- Link to key blockers if any

## What to Return

- Full report path
- Short executive summary in the chat
- Explicit callouts for blockers and unreleased CHANGELOG items
