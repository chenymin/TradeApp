# Project Rules

This file captures stable architecture and delivery rules extracted from completed features.
Add rules here via `npm run ai:remember -- feature-name --write` or manually.

## Architecture Constraints

- Keep entrypoints thin: CLI/API/UI handlers should parse input, delegate to workflow/domain modules, and format output only. _(Source: ai-delivery-kit-defaults)_
- Put reusable delivery logic in named workflow/domain modules instead of duplicating command-handler branches. _(Source: ai-delivery-kit-defaults)_
- New modules should expose deterministic functions that can be tested without network, secrets, or live external services when possible. _(Source: ai-delivery-kit-defaults)_

## Data Access Constraints

- Treat external providers as read-only by default; any write must go through an explicit controlled-write policy, preview artifact, and approval boundary. _(Source: ai-delivery-kit-defaults)_
- Do not record raw secret values, live tokens, or credentials in project artifacts, dashboards, logs, or review output. _(Source: ai-delivery-kit-defaults)_
- Prefer local deterministic fixtures for dogfood and tests before using live repositories, tickets, CI, or deployment systems. _(Source: ai-delivery-kit-defaults)_

## Testing Constraints

- Every feature should have a machine-verifiable path for its cheapest sufficient validation layer before relying on LLM or human judgment. _(Source: ai-delivery-kit-defaults)_
- If a blocker is reported, it should name one owner, one evidence path, and one next action. _(Source: ai-delivery-kit-defaults)_
- Ship readiness must include validation evidence, residual risks, monitoring notes, and rollback or stop-for-human boundaries. _(Source: ai-delivery-kit-defaults)_

## Forbidden Patterns

Project-level forbidden patterns are intentionally empty at install time.
Each feature implementation plan must define its own forbidden patterns and machine verification commands, then promote stable patterns here with `npm run ai:remember -- feature-name --write`.

## Cross-Repository Conventions

- Use `docs/ai-delivery/` for durable AI Delivery artifacts and `docs/ai-delivery/runs/` for dated run evidence. _(Source: ai-delivery-kit-defaults)_
- Use `docs/requirements/` and `docs/plans/` as the markdown source of truth for requirements, solution design, and implementation plans. _(Source: ai-delivery-kit-defaults)_
- Keep connector evidence advisory unless a deterministic gate explicitly promotes it to a blocking check. _(Source: ai-delivery-kit-defaults)_

## Release and Rollback Conventions

- Do not auto-merge, auto-deploy, or approve high-risk business decisions without explicit human review. _(Source: ai-delivery-kit-defaults)_
- A completed loop should archive or summarize durable evidence and clear transient state so stale context does not pollute the next task. _(Source: ai-delivery-kit-defaults)_
- New external-write capabilities should start in dry-run or simulation mode before live use. _(Source: ai-delivery-kit-defaults)_
