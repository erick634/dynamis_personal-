---
name: pre-commit-check
description: 'Runs pre-commit and pre-push quality gates (tests, lint, type-check, format, build). Use when the user asks to commit, push, verify before commit, run pre-commit checks, quality gates, or is it ready to commit. Palavras-chave PT: commitar, fazer commit, push, verificar antes de commitar, checagem pré-commit, portões de qualidade, pronto para commitar, rodar testes antes de commitar, husky, lint-staged.'
disable-model-invocation: false
---

# Pre-Commit Check

## When to Use

- User asks to commit, push, or merge and wants validation first
- User says "run pre-commit", "check before commit", "quality gates", "ready to commit?"
- PT: commitar, push, verificar antes de commitar, checagem pré-commit, pronto para commitar
- After completing a coding task, when user wants verification before staging
- User asks to set up Husky / lint-staged pre-commit hooks

## Instructions

### 1. Detect package manager

Read `package.json` scripts. Use the project's script runner (`npm`, `pnpm`, or `yarn`) consistently.

### 2. Run required checks (before commit)

Run **all** of these in order; stop on first failure and report the error:

```bash
npm test          # or: pnpm test / yarn test
npm run lint
npm run type-check   # or: tsc --noEmit if no script exists
npm run format:check
```

If a script is missing, note it in the report and skip only that step (do not claim full pass).

### 3. Pre-push only (when user will push)

Additionally run:

```bash
npm run build
```

### 4. Scan for forbidden patterns

Before confirming readiness, grep or search the changed files for:

- `console.log`, `console.debug`, `print()` in production code
- `debugger;`
- `TODO` without issue reference (`TODO(#123):`)
- Commented-out code blocks
- `.only` / `.skip` in tests
- Hardcoded secrets, API keys, tokens
- TypeScript `any` without justification comment

### 5. On failure

- Do **not** proceed with commit or new features until fixed
- Return: which command failed, relevant output excerpt, suggested fix
- Never suggest `git commit --no-verify` or `git push --no-verify` unless the user explicitly requests bypass and acknowledges it

### 6. On success

Return a concise checklist:

```
Pre-commit checks: PASSED
- [x] tests
- [x] lint
- [x] type-check
- [x] format:check
- [x] forbidden-pattern scan
```

If push was requested, include `[x] build`.

### 7. Optional — Husky setup (only when user asks)

```bash
npm install -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:

```sh
npx lint-staged
npm run type-check
```

`.husky/pre-push`:

```sh
npm test
npm run build
```

`package.json` lint-staged:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

## What to Return

- Pass/fail per check with command output on failure
- Clear "ready to commit" or "not ready — fix X first"
- Reminder to add tests when new features were generated in the same task
