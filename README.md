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
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The home route shows **Dynamis — bootstrap OK**.

## Local Development

Voice/Live needs the **backend voice service** running in parallel (Robson's stack, port **8000**) with `DEV_AUTH_BYPASS=true`.

1. Start the backend (separate repo/folder) so it listens on `http://localhost:8000`.
2. Copy env template and enable dev bypass on the frontend:

   ```bash
   cp .env.example .env
   ```

   In `.env`, set `VITE_ALLOW_EMPTY_TOKEN=true` and leave `VITE_DYNAMIS_JWT` empty. Defaults already point at `http://localhost:8000` / `ws://localhost:8000` (the app appends `/voice/realtime` for the WebSocket).

3. Start the frontend (restart Vite after changing `.env`):

   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173/live](http://localhost:5173/live), click **Entrar ao vivo**, and allow the microphone.

**Production:** set `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` to the Cloud Run host, `VITE_ALLOW_EMPTY_TOKEN=false`, and paste a real `VITE_DYNAMIS_JWT`.

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

