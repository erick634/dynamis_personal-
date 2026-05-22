---
name: cleanup-dead-code
description: 'Finds and removes unused code, imports, exports, dependencies, and cruft. Use when the user asks to clean up dead code, remove unused imports, run knip/depcheck/ts-prune, delete legacy files, or says this is not used anymore. Palavras-chave PT: limpar código morto, remover imports não usados, código não utilizado, dependências não usadas, limpeza do projeto, knip, depcheck, ts-prune, apagar legado, isso não é mais usado, refatorar e remover.'
disable-model-invocation: false
---

# Cleanup Dead Code

## When to Use

- User asks to remove dead code, unused imports, or cruft
- User mentions knip, depcheck, ts-prune, or unused dependencies
- PT: código morto, limpar projeto, imports não usados, isso não é mais usado, apagar legado
- After a refactor when old symbols may remain
- User says a file, function, or export "isn't used anymore"
- Monthly hygiene or pre-release cleanup

## Instructions

### 1. Quick wins in edited scope

In files touched by the task, remove immediately:

- Unused imports
- Unused variables, functions, types, exports
- Unreachable code (after `return`, `throw`, etc.)
- Commented-out code blocks
- Empty files and empty folders
- `.bak`, `.old`, `.tmp`, `*-copy.*` files if found

### 2. Run analysis tools (project-wide)

Run available tools and collect findings:

```bash
npx knip
npx depcheck
npx ts-prune
```

Also run `npm run lint` — `eslint-plugin-unused-imports` may auto-fix imports on `--fix`.

### 3. Safe deletion workflow

Before deleting each candidate:

1. Search the entire codebase for references (ripgrep / Cursor search)
2. Check dynamic usage: string lookups, `import()`, reflection, config registries
3. Check if it is a public API consumed externally (libraries, plugins)
4. If uncertain, **ask the user** before deleting
5. If removing a public API, add an entry under `### Removed` in `CHANGELOG.md`

### 4. Forbidden patterns to eliminate

- "Just in case" code with no callers
- Duplicate versions: `auth-v2.ts`, `auth-new.ts`, `auth-final.ts` → consolidate in place
- `legacy/`, `deprecated/`, `old/`, `_archive/` folders → delete or extract to separate repo (confirm with user)
- Feature flags for shipped features no longer being rolled back

### 5. Refactor discipline

- Remove old code — do not leave it commented out
- Delete functions that lost all callers after a refactor
- Prefer rewriting a file over additive patches that leave debris
- Do not create "just in case" backups

## What to Return

Structured report:

```
## Dead code cleanup

### Removed
- <file/symbol> — reason

### Tool findings
- knip: ...
- depcheck: ...
- ts-prune: ...

### Needs confirmation
- <item> — why uncertain

### Skipped (public API / dynamic use)
- <item> — evidence
```

If nothing was safe to delete, say so and list candidates for user review.
