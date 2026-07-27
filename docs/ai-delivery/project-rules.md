# Project Rules

This file captures stable architecture and delivery rules extracted from completed features.
Add rules here via `npm run ai:remember -- feature-name --write` or manually.

## Architecture Constraints

- Keep entrypoints thin: CLI/API/UI handlers should parse input, delegate to workflow/domain modules, and format output only. _(Source: ai-delivery-kit-defaults)_
- Put reusable delivery logic in named workflow/domain modules instead of duplicating command-handler branches. _(Source: ai-delivery-kit-defaults)_
- New modules should expose deterministic functions that can be tested without network, secrets, or live external services when possible. _(Source: ai-delivery-kit-defaults)_
- External-provider adapters must use the provider SDK's exported contract types and canonical protocol values. Display labels, localized names, and UI metadata must never be submitted as protocol enum values. _(Source: rn-wallet-switching retrospective, 2026-07-23)_
- Multi-boundary write workflows must preserve safe diagnostic metadata at every boundary, including a stable stage, provider or server error code, HTTP status, and SQLSTATE when available. Never log request bodies, tokens, signatures, SIWE messages, full provider responses, or complete wallet addresses. _(Source: rn-wallet-switching retrospective, 2026-07-23)_
- Wallet identity mutations must model connector session, provider linkage, platform primary state, and client Viewer state as separate authorities. Every transition must name which authority is being read or written and the exact convergence condition required before the UI reports success. _(Source: rn-wallet-switching Android QA, 2026-07-23)_
- Async wallet state machines must define entry, success exit, failure exit, timeout, retry, cleanup, and UI lock behavior for every state. A terminal success state must return to idle after the authoritative Viewer converges; it must not permanently block later bind, switch, or unlink operations. _(Source: rn-wallet-switching Android QA, 2026-07-23)_

## Data Access Constraints

- Treat external providers as read-only by default; any write must go through an explicit controlled-write policy, preview artifact, and approval boundary. _(Source: ai-delivery-kit-defaults)_
- Do not record raw secret values, live tokens, or credentials in project artifacts, dashboards, logs, or review output. _(Source: ai-delivery-kit-defaults)_
- Prefer local deterministic fixtures for dogfood and tests before using live repositories, tickets, CI, or deployment systems. _(Source: ai-delivery-kit-defaults)_

## Testing Constraints

- Every feature should have a machine-verifiable path for its cheapest sufficient validation layer before relying on LLM or human judgment. _(Source: ai-delivery-kit-defaults)_
- If a blocker is reported, it should name one owner, one evidence path, and one next action. _(Source: ai-delivery-kit-defaults)_
- Ship readiness must include validation evidence, residual risks, monitoring notes, and rollback or stop-for-human boundaries. _(Source: ai-delivery-kit-defaults)_
- PostgreSQL migrations that add or change PL/pgSQL functions or Data API RPCs must execute their success, idempotency, conflict, and rollback cases against a compatible real PostgreSQL instance before deployment. Source-text assertions, mocks, and successful `CREATE FUNCTION` alone are not sufficient because PL/pgSQL statements may fail only on first execution. _(Source: rn-wallet-switching retrospective, 2026-07-23)_
- PL/pgSQL parameters, local variables, output variables, and table columns must have non-conflicting naming conventions. RPC verification must exercise every `ON CONFLICT` branch so ambiguous references such as SQLSTATE `42702` block delivery. _(Source: rn-wallet-switching retrospective, 2026-07-23)_
- Before implementing or manually testing a wallet connector, record a capability matrix covering wallet name and version, operating system, configured chain, WalletConnect namespace, required methods/events, and SIWE support. A wallet application's ability to add or display a network is not evidence that its WalletConnect implementation approves that chain. _(Source: Rabby Mobile 0.6.81 Chain 97 investigation, 2026-07-23)_
- Wallet mutation tests must include sequential journeys, not only isolated happy paths: bind to active, switch away, switch back, unlink a non-active external wallet, reload, and repeat an operation. Tests must assert both domain results and whether the next visible action is actually enabled and dispatches its handler. _(Source: rn-wallet-switching Android QA, 2026-07-23)_
- Manual wallet QA evidence must pin the source revision, Metro or bundle working directory, resolved connector protocol versions, wallet application version, configured chain ID, and stale-session cleanup status. Results from an old bundle, unknown wallet version, or mixed environment chains are invalid evidence. _(Source: rn-wallet-switching Android QA, 2026-07-23)_
- Cross-platform wallet readiness requires the supported wallet/OS/chain matrix to pass on real wallet applications. Unsupported combinations must be recorded as explicit provider capability limits and must never be made to pass by silently adding or downgrading to another environment's chain. _(Source: Rabby Mobile 0.6.81 Chain 97 investigation, 2026-07-23)_

## Forbidden Patterns

- Do not infer WalletConnect chain support from a wallet's network-management UI; verify the wallet's approved namespace on the exact wallet version and platform.
- Do not collapse connector-selected, provider-linked, platform-primary, and Viewer-active wallets into one state or use one as an implicit substitute for another.
- Do not treat a visible button, completed first mutation, or passing unit workflow as proof that the next wallet mutation remains operable; verify the sequential UI journey.
- Each feature implementation plan must define its own additional forbidden patterns and machine verification commands, then promote stable patterns here with `npm run ai:remember -- feature-name --write`.

## Cross-Repository Conventions

- Use `docs/ai-delivery/` for durable AI Delivery artifacts and `docs/ai-delivery/runs/` for dated run evidence. _(Source: ai-delivery-kit-defaults)_
- Use `docs/requirements/` and `docs/plans/` as the markdown source of truth for requirements, solution design, and implementation plans. _(Source: ai-delivery-kit-defaults)_
- Keep connector evidence advisory unless a deterministic gate explicitly promotes it to a blocking check. _(Source: ai-delivery-kit-defaults)_
- A cross-repository feature must record the owning repository and merged/deployed revision for every client, Edge Function, and database migration artifact. It must not be called ready while any artifact exists only in an unmerged worktree, was deployed manually without source synchronization, or lacks an end-to-end verification covering all boundaries. _(Source: rn-wallet-switching retrospective, 2026-07-23)_

## Release and Rollback Conventions

- Do not auto-merge, auto-deploy, or approve high-risk business decisions without explicit human review. _(Source: ai-delivery-kit-defaults)_
- A completed loop should archive or summarize durable evidence and clear transient state so stale context does not pollute the next task. _(Source: ai-delivery-kit-defaults)_
- New external-write capabilities should start in dry-run or simulation mode before live use. _(Source: ai-delivery-kit-defaults)_
