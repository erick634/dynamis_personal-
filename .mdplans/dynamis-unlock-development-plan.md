# DYNAMIS Unlock — Development Plan & Phases

### Plano de Desenvolvimento & Fases

> Bilingual document (PT/EN). Português para referência interna do Erick; English for the team / Linear.
> Documento bilíngue. Conteúdo de time e tickets do Linear em inglês.
> Owner: Erick (frontend + Unlock end-to-end). Last update: jun/2026.

---

## 🇧🇷 Visão geral (PT)

O objetivo do DYNAMIS Unlock é levar a pessoa por uma jornada: **primeira conversa por voz com o agente → perfil → Possibility Map → plano de unlocks**. O backend de voz que sustenta a primeira conversa **já existe e foi construído pelo Robson** — não vamos recriar IA; vamos operar e estabilizar o que já temos, sob controle próprio.

O trabalho está organizado em fases. **A Fase 1 é o foco atual** e está detalhada abaixo. As fases seguintes estão esboçadas (título + objetivo) para registrar a visão completa, sem comprometer detalhe de execução de coisa distante.

## 🇺🇸 Overview (EN)

DYNAMIS Unlock guides the user through a journey: **first voice conversation with the agent → profile → Possibility Map → unlock plan**. The voice backend that powers the first conversation **already exists and was built by Robson** — we are not rebuilding any AI; we are operating and stabilizing what we already have, under our own control.

Work is organized in phases. **Phase 1 is the current focus** and is detailed below. Later phases are outlined (title + goal) to capture the full vision without over-committing detail on distant work.

---

## FASE 1 — First Conversation, Self-Hosted & Stable

### Fase 1 — Primeira conversa, sob controle próprio e estável

**🇧🇷 Objetivo:** ter a primeira conversa por voz (onboarding) rodando de forma independente — reusando o backend do Robson, com banco próprio (MongoDB), estável e pronta para deploy em EC2. Não depender do ambiente nem do Supabase do Robson.

**🇺🇸 Goal:** get the first voice conversation (onboarding) running independently — reusing Robson's backend, backed by our own database (MongoDB), stable, and ready for EC2 deployment. Remove the dependency on Robson's environment and paused Supabase.

A Fase 1 é uma escada de três degraus. Cada degrau só começa quando o anterior está validado.
_Phase 1 is a three-step ladder. Each step starts only after the previous one is validated._

### Degrau 1 — Database migration (Postgres → MongoDB)

**🇧🇷** O backend foi escrito para Postgres (lib `pg`, queries SQL). Migrar a camada de persistência (`chat_history`, `user_profiles`) para MongoDB, alinhado com a decisão de infra do time. Esta é a mudança que destrava a conversa: hoje ela trava porque o Supabase está pausado.
**🇺🇸** The backend was written for Postgres (`pg` lib, SQL queries). Migrate the persistence layer (`chat_history`, `user_profiles`) to MongoDB, aligned with the team's infra decision. This is the change that unblocks the conversation: today it stalls because Supabase is paused.

### Degrau 2 — Independent, stable backend copy

**🇧🇷** Assumir o backend (já no monorepo, pasta `backend/`) como cópia própria e operável: variáveis de ambiente próprias, documentação de execução local, e validação end-to-end da primeira conversa (STT → LLM → TTS → persistência no Mongo) sem qualquer dependência externa do Robson.
**🇺🇸** Take ownership of the backend (already in the monorepo, `backend/`) as an operable copy: own environment variables, local run docs, and end-to-end validation of the first conversation (STT → LLM → TTS → Mongo persistence) with no external dependency on Robson.

### Degrau 3 — Containerization & EC2 deployment

**🇧🇷** Containerizar frontend + backend (Docker) e validar localmente, depois fazer deploy na instância EC2 (acesso pendente com o Ben). O container que roda local é o mesmo que sobe no EC2.
**🇺🇸** Containerize frontend + backend (Docker), validate locally, then deploy to the EC2 instance (access pending with Ben). The container that runs locally is the same one deployed to EC2.

---

## Próximas fases (esboço) / Later phases (outline)

> 🇧🇷 Títulos e objetivos registrados para dar visão do todo. Detalhamento quando a Fase 1 estiver entregue.
> 🇺🇸 Titles and goals captured to show the full picture. Detailed scoping once Phase 1 ships.

**Phase 2 — Conditional Discovery (new vs. returning users)**
🇧🇷 Saudação condicional: usuário novo entra no onboarding; usuário recorrente entra no fluxo de atualização de metas. Discovery que enriquece o perfil a cada visita.
🇺🇸 Conditional greeting: new users enter onboarding; returning users enter a goal-update flow. Discovery that enriches the profile on every visit.

**Phase 3 — Possibility Map generation (real data)**
🇧🇷 Substituir o mock-via-Claude pela geração real do mapa quando o Archimedes (API ABS) for liberado, mantendo o mesmo contrato de dados.
🇺🇸 Replace the Claude mock with real map generation once Archimedes (ABS API) is unblocked, keeping the same data contract.

**Phase 4 — Unlock Plan & progression**
🇧🇷 Da escolha de unlocks no mapa ao plano executável (Today, Captain's Log, gamification) com dados reais em vez de mock.
🇺🇸 From unlock selection on the map to an executable plan (Today, Captain's Log, gamification) backed by real data instead of mock.

**Phase 5 — Production hardening**
🇧🇷 Segurança (RLS/auth real no lugar do `DEV_AUTH_BYPASS`), observabilidade, e prontidão para usuários reais.
🇺🇸 Security (real auth/RLS replacing `DEV_AUTH_BYPASS`), observability, and readiness for real users.

---

## Notas técnicas / Technical notes

- 🇧🇷 **Não recriar IA.** O agente, o pipeline de voz e o profile extractor já existem (trabalho do Robson). Fase 1 é operação e migração, não criação de modelo.
  🇺🇸 **No AI rebuild.** The agent, voice pipeline, and profile extractor already exist (Robson's work). Phase 1 is operation and migration, not model creation.
- 🇧🇷 A migração Postgres→Mongo exige reescrever a camada de acesso a dados (não é troca de credencial).
  🇺🇸 The Postgres→Mongo migration requires rewriting the data-access layer (not a credential swap).
- 🇧🇷 O mesmo container validado localmente é o que vai para o EC2 — garante paridade dev/prod.
  🇺🇸 The same container validated locally is the one deployed to EC2 — ensures dev/prod parity.
