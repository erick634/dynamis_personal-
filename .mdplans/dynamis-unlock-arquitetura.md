# DYNAMIS Unlock — Arquitetura & Estado Atual

> Documento de referência do projeto. Serve para (1) eu (Erick) me reorientar e (2) apresentar pro Brian e pro Adam onde estamos.
> Tom: técnico mas apresentável. Atualizado em junho de 2026.

---

## 1. O que é o DYNAMIS Unlock (e o que NÃO é)

DYNAMIS Unlock é o **web app** do produto "career copilot na era da IA". Um agente de voz (o **Dynamis**) conversa com a pessoa, monta um perfil dela a partir da conversa, e revela o potencial dela através do **Possibility Map** → escolha de unlocks → plano de transformação.

**Atenção à confusão de nomes — são dois projetos diferentes:**

| Projeto            | Repositório                  | Time          | O que é                                                                     |
| ------------------ | ---------------------------- | ------------- | --------------------------------------------------------------------------- |
| **Dynamis**        | `OmNovix/dynamis`            | Adam + equipe | Projeto grande da empresa: Archimedes (pesquisa), backend, etc. Referência. |
| **DYNAMIS Unlock** | `erick634/dynamis_personal-` | Eu (Erick)    | **Este projeto.** Web app React.                                            |

O produto final é um **app de celular**. A divisão de trabalho:

- **Robson** → parte mobile/nativa (foco em iOS/Apple, pela base de usuários americana).
- **Eu (Erick)** → **web app em React** (React puro, não React Native).

---

## 2. Stack atual

**Frontend (meu):** Vite + React + TypeScript (strict) + Tailwind v4, Zustand (state), React Query, react-i18next (en-US + pt-BR). Husky com pre-commit (type-check + lint-staged) e pre-push (build). Deploy na **Vercel**.

**Backend de voz (Robson):** Node + TS, WebSocket próprio (`ws`), sem framework de agente. Pipeline de voz: AssemblyAI (STT) → Anthropic Claude (LLM, streaming) → Cartesia (TTS). Tem barge-in, state machine e profile extractor rodando em background. Deploy no **Railway** (root directory `backend/`).

**Banco:** Supabase / Postgres. Tabelas `chat_history` e `user_profiles`. RLS desativado (atalho de POC — fechar antes de qualquer deploy público).

**Repo:** monorepo. `src/` é o frontend, `backend/` é o backend do Robson copiado pra dentro.

**Detalhe importante de arquitetura:** a feature **Live é só o "cano"**. Ela transporta áudio e mensagens entre frontend e backend, mas **não tem o roteiro do agente**. O texto que o Dynamis fala (apresentação, perguntas) vive no **backend**, no system prompt do Claude. Mudar o que o agente diz = mexer no backend, não no frontend.

---

## 3. Estado das features (o que funciona, o que está em andamento)

O frontend tem dez features em `src/features/`. Classificadas por prontidão:

**Funciona end-to-end (sólido, na main):**

- **Awakening** — tela inicial.
- **Onboarding** — cria perfil (nome, data de nascimento, email), gera UUID, salva no Zustand + localStorage.
- **Live** — voz real multi-usuário (STT + Claude + TTS + barge-in), conecta com o UUID do usuário. A conversa é salva em `chat_history`.
- **Intent Profile (`/you`)** — perfil gerado automaticamente da conversa, lido do Supabase, renderizado.

**Avançado, mas em polimento ou em branch separada:**

- **Possibility Map** — bem desenvolvido: constelações (Dynamis + Energeia), comparação, cards de dimensão, fingerprint do perfil, storage, e a ponte LLM. A engenharia já existe; falta a fonte de dados real (ver Archimedes).
- **Discovery** — chat por conversa, input, painel lateral, voz, derivação de sinais de perfil, resumo de reflexão. Feature de verdade, não esqueleto.
- **Transformation Plan / Today / Daily Reflection (Captain's Log)** — telas de plano e acompanhamento, com a Dynamis tree.

**Bloqueado por dependência externa (mockado para o demo):**

- **Archimedes** — sistema de pesquisa que alimentaria o Possibility Map. Bloqueado pela API do ABS (terceiro). Estratégia: **mock via Claude** no formato que o Archimedes real vai usar depois, em `possibility-map-llm-api.ts` (`fetchGeneratedMap`).

---

## 4. Onde está o trabalho (mapa das branches)

Esta foi a parte que estava causando a sensação de "perdido". A boa notícia: **o trabalho não está espalhado e perdido — está quase todo na `main`.** Existem só dois commits soltos que importam.

| Branch                         | Conteúdo                                         | Relação com a main            | No GitHub?     |
| ------------------------------ | ------------------------------------------------ | ----------------------------- | -------------- |
| `main`                         | base sólida: tudo que funciona end-to-end        | — (é o tronco)                | sim            |
| `redesign-gamification`        | **estilo novo** (mais perto do que o Brian quer) | main **+ 1 commit**           | não (só local) |
| `feat/discovery-onboarding`    | **roteiro estruturado de onboarding** por voz    | main **+ 1 commit**           | não (só local) |
| `feature/possibility-map`      | (nada exclusivo)                                 | igual à main                  | não (só local) |
| `feat/frontend-discovery-tree` | bootstrap inicial + Dynamis tree                 | **atrás** da main (histórico) | sim            |
| `feat/live-voice-session`      | trabalho de voz                                  | já incorporado na main        | sim            |

**Tradução:** a `main` já tem voz, perfil, Intent Profile, Possibility Map, Discovery e os fixes de deploy. As únicas duas coisas que vivem fora dela e valem trazer pra frente são:

1. O **redesign de estilo** (`redesign-gamification`, commit `766b961`).
2. O **roteiro de onboarding** (`feat/discovery-onboarding`, commit `f2c9cca`).

Cada uma é a main + um único commit, então trazer cada uma é uma operação pequena e limpa — não um merge complicado.

---

## 5. Onde estamos vs. para onde vamos (infra)

**Hoje:** frontend na Vercel + backend no Railway + Supabase. Essa stack foi escolhida pra subir o mockup rápido.

**Direção:** migrar para **AWS**, alinhando com a infra que o time da empresa já usa. Essa migração é um trabalho futuro, planejado, não urgente para o demo — mas é a direção combinada e vale constar no mapa pro Brian/Adam verem que está no radar.

---

## 6. Decisões já tomadas (para não rediscutir)

1. **Monorepo** — backend do Robson copiado pra dentro do meu repo.
2. **Supabase client direto no frontend** (anon key) pra ler `user_profiles`, em vez de esperar endpoint REST. Refatorar quando o Robson fizer os GETs.
3. **Possibility Map / Plan ficam mock** para o demo (não dá tempo do agente gerar essas telas).
4. **Escopo MVP rígido** — não adicionar features da visão v10 (Council, Watchtower, Implementer) agora. É futuro.
5. **API keys ficam no backend** — a key da Anthropic nunca é exposta no frontend.

---

## 7. Como eu trabalho (lembrete)

- Um passo de cada vez. Confirmar (`git status`, `cat`) antes de avançar.
- Comandos PowerShell explícitos (Windows).
- Código grande → prompt pro Cursor (Agent mode), não comando a comando.
- Me segurar quando eu quiser fazer merge/push sem testar.
- Honestidade sobre escopo.
