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

---

rodar teste backend e live

---

Como rodar
Backend local:

cd backendend
npm install
npm run dev
Sobe em http://localhost:8000. Vai imprimir [auth] DEV_AUTH_BYPASS=true — every request will be authenticated as the dev user.

Web:

cd dynamis_personal-
npm run dev
Acesse /live no browser, clique em Entrar ao vivo, aceite o microfone. Sem JWT, sem WorkOS — todo request entra como o usuário aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.

Trocar para produção depois
No dynamis_personal-/.env:

VITE_API_BASE_URL=https://dynamis-backend-33565254033.us-central1.run.app
VITE_WS_BASE_URL=wss://dynamis-backend-33565254033.us-central1.run.app
VITE_ALLOW_EMPTY_TOKEN=false
VITE_DYNAMIS_JWT=<JWT>
E reinicie o npm run dev (Vite só lê env na subida).

Segurança
NODE_ENV=production no Cloud Run desliga o bypass mesmo com a env var ativa — está no código.
O bloco .env do backend está em .gitignore, então a flag não vaza para o repo.
Em dev, todos os requests viram o mesmo usuário fictício — não use isso para multi-tenant.
