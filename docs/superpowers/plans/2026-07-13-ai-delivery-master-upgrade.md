# AI Delivery Master Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the AI Delivery package built from `../ai-agent` master commit `469d0bf` and conservatively apply its current project integration surface without changing existing feature stages or application behavior.

**Architecture:** Build a reproducible local npm archive from the approved clean source revision, install it through the existing file-dependency model, then let `ai-delivery init --write` create only missing managed assets and refresh marked instruction blocks. Preserve feature artifacts and validate both AI Delivery health and the React Native application after every integration boundary.

**Tech Stack:** Node.js 20+, npm package archives, `@artstar/ai-delivery-kit`, Git, Expo/React Native, TypeScript, Vitest

---

## File Map

- Modify: `package.json` - point the dev dependency at the master archive and expose the current CLI command aliases.
- Modify: `package-lock.json` - lock the new local archive content and dependency graph.
- Modify: `AGENTS.md` - refresh only the AI Delivery managed marker block.
- Modify: `CLAUDE.md` - refresh only the AI Delivery managed trigger block.
- Create: `docs/ai-delivery/risk-playbooks/contract.md` - current built-in contract-risk guidance.
- Create: `docs/ai-delivery/risk-playbooks/realtime.md` - current built-in realtime-risk guidance.
- Create: `docs/ai-delivery/risk-playbooks/rls.md` - current built-in RLS guidance.
- Create: `docs/ai-delivery/runs/2026-07-13-ai-delivery-master-upgrade-verification.md` - durable upgrade and regression evidence.
- Preserve unchanged: `docs/ai-delivery/features.json`, `docs/requirements/**`, `docs/plans/2026-07-01-privy-login-*`, and `docs/plans/2026-07-02-rn-full-app-port-*`.

### Task 1: Verify And Package The Approved Master Revision

**Files:**
- Read: `/Users/rwa_start/LearnSource/ai-agent/package.json`
- Read: `/Users/rwa_start/LearnSource/ai-agent/CHANGELOG.md`
- Create outside project: `/Users/rwa_start/LearnSource/ai-agent/artstar-ai-delivery-kit-0.1.0-master-469d0bf.tgz`

- [ ] **Step 1: Verify the exact clean source revision**

Run:

```bash
git -C ../ai-agent rev-parse HEAD
git -C ../ai-agent status --short --branch
```

Expected: revision is `469d0bf78b04c2f5160771ff1b9d7f7d121a7396`, branch is `master`, and there are no worktree changes.

- [ ] **Step 2: Run the package release gates**

Run:

```bash
npm run release:pack-check
npm run release:install-smoke
```

Working directory: `/Users/rwa_start/LearnSource/ai-agent`.

Expected: both commands exit 0 and do not publish, version, tag, or mutate the repository.

- [ ] **Step 3: Build the package archive in temporary storage**

Run:

```bash
mkdir -p /private/tmp/ai-delivery-master-469d0bf
npm pack ../ai-agent --pack-destination /private/tmp/ai-delivery-master-469d0bf
```

Expected: `/private/tmp/ai-delivery-master-469d0bf/artstar-ai-delivery-kit-0.1.0.tgz` exists.

- [ ] **Step 4: Copy the immutable archive to the existing local package source directory**

Run:

```bash
cp /private/tmp/ai-delivery-master-469d0bf/artstar-ai-delivery-kit-0.1.0.tgz ../ai-agent/artstar-ai-delivery-kit-0.1.0-master-469d0bf.tgz
shasum -a 256 ../ai-agent/artstar-ai-delivery-kit-0.1.0-master-469d0bf.tgz
```

Expected: the uniquely named ignored archive exists and a SHA-256 digest is printed for the verification record.

- [ ] **Step 5: Confirm packaging did not dirty the source repository**

Run:

```bash
git -C ../ai-agent status --short --branch
```

Expected: the source repository remains clean because `*.tgz` is ignored.

### Task 2: Install The Package And Synchronize Command Aliases

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify generated install: `node_modules/@artstar/ai-delivery-kit/**`

- [ ] **Step 1: Install the uniquely named master archive**

Run:

```bash
npm install --save-dev ../ai-agent/artstar-ai-delivery-kit-0.1.0-master-469d0bf.tgz
```

Expected: `package.json` and `package-lock.json` resolve the AI Delivery dependency from `file:../ai-agent/artstar-ai-delivery-kit-0.1.0-master-469d0bf.tgz`.

- [ ] **Step 2: Add the current command aliases to `package.json`**

Add these exact scripts while preserving existing scripts:

```json
{
  "ai:closure-sweep": "ai-delivery closure-sweep",
  "ai:controlled-write": "ai-delivery controlled-write",
  "ai:controlled-write-policy": "ai-delivery controlled-write-policy",
  "ai:controlled-write-simulate": "ai-delivery controlled-write-simulate",
  "ai:doctor": "ai-delivery doctor",
  "ai:finalize": "ai-delivery finalize",
  "ai:identity-secret-boundary": "ai-delivery identity-secret-boundary",
  "ai:implementation-probe": "ai-delivery implementation-probe",
  "ai:judge-escalation": "ai-delivery judge-escalation",
  "ai:knowledge-check": "ai-delivery knowledge-check",
  "ai:knowledge-refresh": "ai-delivery knowledge-refresh",
  "ai:new": "ai-delivery new",
  "ai:observability-artifacts": "ai-delivery observability-artifacts",
  "ai:organization-dashboard": "ai-delivery organization-dashboard",
  "ai:organization-inventory": "ai-delivery organization-inventory",
  "ai:organization-model": "ai-delivery organization-model",
  "ai:policy-inheritance": "ai-delivery policy-inheritance",
  "ai:small-team-trial": "ai-delivery small-team-trial",
  "ai:triage": "ai-delivery triage",
  "ai:visual-probe": "ai-delivery visual-probe",
  "ai:visual-render": "ai-delivery visual-render"
}
```

- [ ] **Step 3: Verify the installed package is the master build**

Run:

```bash
node -p "require('./node_modules/@artstar/ai-delivery-kit/package.json').version"
npm run ai:help -- --all
```

Expected: version prints `0.1.0`; full help includes `closure-sweep`, `small-team-trial`, `organization-model`, `visual-render`, `controlled-write`, and `finalize`.

- [ ] **Step 4: Review dependency-only changes**

Run:

```bash
git diff --check
git diff -- package.json package-lock.json
```

Expected: only the AI Delivery archive path, lock content, and new AI Delivery scripts changed.

- [ ] **Step 5: Commit the package upgrade**

Run:

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade AI Delivery from master"
```

Expected: one commit containing only dependency and script changes.

### Task 3: Apply Current Managed Project Assets Conservatively

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Create: `docs/ai-delivery/risk-playbooks/contract.md`
- Create: `docs/ai-delivery/risk-playbooks/realtime.md`
- Create: `docs/ai-delivery/risk-playbooks/rls.md`

- [ ] **Step 1: Preview the initializer plan**

Run:

```bash
npm run ai:init
```

Expected: the preview creates no files and reports the missing risk playbooks while skipping existing project assets.

- [ ] **Step 2: Apply the initializer without force**

Run:

```bash
npm run ai:init -- --write
```

Expected: no `--force` is used; existing templates, feature artifacts, project rules, configuration, and evidence are retained.

- [ ] **Step 3: Verify protected feature artifacts are unchanged**

Run:

```bash
git diff --exit-code -- docs/ai-delivery/features.json docs/requirements docs/plans/2026-07-01-privy-login-implementation.md docs/plans/2026-07-02-rn-full-app-port-implementation.md
```

Expected: exit 0 with no output.

- [ ] **Step 4: Review all initializer changes**

Run:

```bash
git status --short
git diff --check
git diff -- AGENTS.md CLAUDE.md docs/ai-delivery/risk-playbooks
```

Expected: marked instruction blocks are current, the three missing playbooks are created, and no unrelated project content is removed.

- [ ] **Step 5: Commit managed integration assets**

Run:

```bash
git add AGENTS.md CLAUDE.md docs/ai-delivery/risk-playbooks/contract.md docs/ai-delivery/risk-playbooks/realtime.md docs/ai-delivery/risk-playbooks/rls.md
git commit -m "chore: refresh AI Delivery project integration"
```

Expected: one commit containing only initializer-managed integration changes.

### Task 4: Validate AI Delivery And Application Compatibility

**Files:**
- Read: `.ai-delivery.json`
- Read: `docs/ai-delivery/features.json`
- Read: application source and tests through verification commands

- [ ] **Step 1: Run installation and instruction diagnostics**

Run:

```bash
npm run ai:doctor
npm run ai:instruction-audit
```

Expected: installation checks pass. Advisory notes may report existing team-preset or governance gaps, but no missing installation asset or stale managed instruction block remains.

- [ ] **Step 2: Run team and project readiness diagnostics**

Run:

```bash
npm run ai:project-rules
npm run ai:team-readiness
npm run ai:small-team-trial -- rn-full-app-port
```

Expected: commands execute successfully and clearly distinguish existing rollout/readiness gaps from installation failures.

- [ ] **Step 3: Confirm feature stages did not move**

Run:

```bash
npm run ai:list
npm run ai:status -- privy-login
npm run ai:status -- rn-full-app-port
```

Expected: both features remain at `编码实现`; no audit or advance command is run.

- [ ] **Step 4: Run the application regression suite**

Run:

```bash
npm run typecheck
npm test
```

Expected: TypeScript exits 0 and all existing Vitest tests pass.

- [ ] **Step 5: Check the final repository scope**

Run:

```bash
git status --short --branch
git diff --check HEAD~2..HEAD
git diff --stat HEAD~2..HEAD
```

Expected: no application source changes, no feature stage changes, and no uncommitted initializer output.

### Task 5: Record Upgrade Evidence

**Files:**
- Create: `docs/ai-delivery/runs/2026-07-13-ai-delivery-master-upgrade-verification.md`

- [ ] **Step 1: Write the verification record**

Create a Markdown record with these concrete sections and values:

- Header: `AI Delivery Master Upgrade Verification`.
- Date: `2026-07-13`.
- Source revision: `469d0bf78b04c2f5160771ff1b9d7f7d121a7396`.
- Package: `@artstar/ai-delivery-kit@0.1.0`.
- Archive: `artstar-ai-delivery-kit-0.1.0-master-469d0bf.tgz`.
- SHA-256: copy the exact 64-character digest printed by Task 1 Step 4.
- Results table: record `pass` plus the final summary line or count from the release pack check, release install smoke, doctor, instruction audit, feature-stage checks, TypeScript, and Vitest commands.
- Feature stage evidence: record `privy-login = 编码实现` and `rn-full-app-port = 编码实现` when Task 4 confirms them.
- Advisory findings: list each advisory printed by doctor/readiness commands; write `None` only when none were printed.
- Scope confirmation: state that requirements, implementation plans, feature stages, and application source were unchanged, and that no publish, stage advance, push, or deployment occurred.

- [ ] **Step 2: Validate the evidence file and repository diff**

Run:

```bash
rg -n -e '<[^>]+>' -e 'pass[/]fail' -e 'T[B]D' -e 'T[O]DO' docs/ai-delivery/runs/2026-07-13-ai-delivery-master-upgrade-verification.md
git diff --check
```

Expected: the placeholder scan has no matches and `git diff --check` exits 0.

- [ ] **Step 3: Commit the verification record**

Run:

```bash
git add docs/ai-delivery/runs/2026-07-13-ai-delivery-master-upgrade-verification.md
git commit -m "docs: record AI Delivery master upgrade verification"
```

Expected: the final upgrade evidence is committed separately from package and initializer changes.

- [ ] **Step 4: Perform the completion check**

Run:

```bash
git status --short --branch
git log --oneline --decorate -6
```

Expected: the worktree is clean; the design, plan, package upgrade, integration refresh, and verification commits are visible; no push occurs.
