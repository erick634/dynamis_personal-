# Architectural Decision Records

## ADR-001: Dedicated personal repository

Date: 2026-05-21  
Status: Accepted

### Context

The Dynamis POC needs its own version control, separate from other projects under `C:\projetos`.

### Decision

Use `https://github.com/erick634/dynamis_personal-.git` as the canonical remote. Initialize Git at `Dynamis/` root, not the parent `projetos/` folder.

### Alternatives considered

- Reuse the parent `projetos` git repo — rejected to avoid mixing unrelated projects.

### Consequences

- Clean history and remotes for Dynamis only.
- Clone and CI target a single-purpose repository.
