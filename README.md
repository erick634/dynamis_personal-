# Dynamis Web

Transformation guide powered by AI — web POC for the June 1, 2026 demo.

## Stack

- Vite 5 + React 18 + TypeScript (strict)
- Tailwind CSS v4 (`@tailwindcss/vite`, semantic design tokens)
- React Router v6
- TanStack Query v5, Zustand v5
- react-i18next (`en-US` source of truth)
- LiveKit client (typed data-channel events)
- lucide-react

## Setup

```bash
npm install
cp .env.example .env   # optional — defaults to http://localhost:8000
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The home route shows **Dynamis — bootstrap OK**.

## Scripts

| Script              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Start Vite dev server                                           |
| `npm run build`     | Typecheck + production build                                    |
| `npm run preview`   | Preview production build                                        |
| `npm run lint`      | ESLint (flat config, no `any`, no unused imports, no `console`) |
| `npm run format`    | Prettier write                                                  |
| `npm run typecheck` | `tsc -b` without emit                                           |

## Project structure

```
src/
├── main.tsx, App.tsx
├── routes/           # route-level screens
├── features/         # feature modules (filled in next milestones)
├── components/ui/    # shared UI atoms
├── hooks/
├── stores/           # Zustand
├── lib/              # i18n, QueryClient, LiveKit helpers
├── services/         # REST API clients
├── types/
├── locales/          # en-US.json (source), pt-BR.json
└── styles/           # tokens.css + tailwind.css
```

Import alias: `@/` → `src/`.

## Docs

- [CHANGELOG.md](./CHANGELOG.md)
- [docs/PROGRESS.md](./docs/PROGRESS.md)
- [docs/DECISIONS.md](./docs/DECISIONS.md)

## Remote

[github.com/erick634/dynamis_personal-](https://github.com/erick634/dynamis_personal-.git)
