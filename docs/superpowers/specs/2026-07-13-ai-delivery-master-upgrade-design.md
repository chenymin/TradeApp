# AI Delivery Master Upgrade Design

## Goal

Upgrade MyTradeApp from the existing July 9 local package archive to the latest
checked-out `../ai-agent` master commit (`469d0bf`) while preserving all existing
feature documents, delivery evidence, project rules, and application behavior.

## Source Of Truth

- Package source: `/Users/rwa_start/LearnSource/ai-agent`
- Git revision: `469d0bf78b04c2f5160771ff1b9d7f7d121a7396`
- Package name and version: `@artstar/ai-delivery-kit@0.1.0`
- Consumption model: a reproducible npm package archive built from that revision

The package version remains `0.1.0`, so the archive content and installed command
surface must be verified explicitly instead of relying on semantic version change.

## Upgrade Approach

1. Verify the source repository is still on the approved clean master revision.
2. Run the package's release checks and build a fresh npm archive outside the
   MyTradeApp repository.
3. Install that archive as MyTradeApp's dev dependency and update the lockfile.
4. Run `ai-delivery init --write` without `--force` so managed instructions,
   templates, policies, scripts, and configuration are merged conservatively.
5. Review every generated change and preserve project-specific content.
6. Add missing npm script aliases for newly available AI Delivery commands where
   the initializer does not maintain them automatically.
7. Validate installation health and confirm existing application checks still pass.

## Preservation Boundaries

The upgrade must not:

- delete or replace tracked feature definitions;
- advance `privy-login` or `rn-full-app-port` to another stage;
- overwrite requirements, implementation plans, verification runs, dashboards, or
  project-specific rules with forced template output;
- modify application source code unless a generated integration file requires a
  narrowly scoped compatibility correction;
- publish a package, create a release tag, push commits, or deploy anything.

If the initializer proposes a conflicting change to an existing customized file,
the project version is retained and the relevant new upstream behavior is merged
manually.

## Expected Integration Surface

The upgrade may update:

- `package.json` and `package-lock.json`;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, and `.ai-delivery.json`;
- AI Delivery templates, prompts, policies, risk profiles, workflows, and CI files;
- opt-in session hooks or loop-ready assets introduced by current master;
- npm script aliases for current CLI commands.

Generated runtime evidence is only retained when it materially verifies the
upgrade and belongs in source control. Temporary package and test output remains
outside the repository.

## Error Handling And Rollback

- Stop if the source revision changes or the source worktree is dirty.
- Stop if package release checks fail.
- Inspect initializer output and Git diff before accepting generated changes.
- Treat existing feature artifacts as immutable upgrade inputs.
- Rollback is the removal of the upgrade commit; the previous lockfile references
  the earlier local archive.

## Verification

The upgrade is complete only when all applicable checks pass:

- AI Delivery package release pack check and install smoke test;
- installed package command/version/content inspection;
- `ai-delivery doctor`;
- instruction audit and project/team readiness checks;
- status/list checks for both existing features, confirming their stages did not
  change;
- `npm run typecheck`;
- `npm test`;
- final Git diff review for unrelated application changes or lost project content.

Known advisory findings, such as incomplete team presets or feature ship readiness,
may remain when they predate the upgrade and are reported clearly rather than hidden.
