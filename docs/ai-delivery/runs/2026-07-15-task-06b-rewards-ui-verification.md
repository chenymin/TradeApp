# Task 6B My Rewards UI Verification

Date: 2026-07-15

Feature: `rn-full-app-port`

Branch: `feat/rn-rewards-read-models`

## Verified Scope

- Protected My Rewards route renders the Task 6A profile, point ledger, and referral read models.
- Profile, point ledger, and referral records settle independently and expose distinct loading, empty, error, and retry states.
- The screen uses one `FlatList` with stable business ids for referral and point rows.
- Four point balances, total points, tier benefits, KYC invite gate, and unknown-tier fallback are covered by tests.
- Dashboard no longer renders or queries the duplicate point ledger.
- Logged-out users cannot enter My Rewards from the public Profile route without starting login.
- Invite URLs require an approved KYC summary, a real invite code, and a validated HTTPS public origin.
- Rewards and Dashboard production paths do not query commission views while the authorization gate is open.
- React StrictMode remount behavior is covered by a screen test.

## Machine Evidence

`npm test`

- Result: 69 test files passed.
- Result: 290 tests passed.
- Failures: 0.

`npm run typecheck`

- Result: exit 0.

Referral TSX boundary scan:

```text
functions/v1
navigator.
window.
Linking.open
```

- Result: no matches in `src/features/referral/**/*.tsx`.

Secret-pattern review:

- No new diff line logs a token.
- No new diff line contains a Vite service-role environment key.
- The repository-wide `service_role` scan has one pre-existing negative assertion in `FatalConfigScreen.test.tsx`; it is not a credential or a Task 6 change.

`npm run ai:audit -- rn-full-app-port`

- Result: AI Delivery audit passed with no cross-document consistency issue.

## Runtime Evidence

Command:

```bash
npx expo export --platform ios --output-dir /tmp/mytrade-task6b-export --clear
```

Result:

- Metro bundled the iOS entry successfully.
- 4,561 modules were included.
- The Hermes bundle and metadata were exported to `/tmp/mytrade-task6b-export`.
- Metro reported an existing `@noble/hashes` package-export fallback warning; bundling still completed successfully and Task 6B did not introduce that dependency.

Expo Web was also probed on port 8082. The server returned an Expo native manifest rather than a rendered page because the project does not currently install `react-dom`, `react-native-web`, or `@expo/metro-runtime`. No Web dependencies were added as part of this native Task 6 slice.

## Review Results

Local security, data-boundary, React, and QA review found and fixed:

1. The existing Dashboard default commission loader still queried `my_commission_summary`; it now returns `unavailable` without a request until backend authorization passes.
2. The initial mounted-ref cleanup could leave React StrictMode stuck in loading; effect setup now restores the mounted flag and a regression test covers it.
3. Profile and point errors lacked explicit local retry actions; each section now retries independently.

An external Codex CLI review was not executed because the permission gate rejected exporting the private repository diff to an external service. No workaround was attempted.

## Residual Gates

### Commission authorization

- Owner: Supabase/backend owner.
- Evidence: `docs/ai-delivery/runs/2026-07-15-task-06a-supabase-contract-check.md`.
- Next action: revoke anonymous access, verify view invoker semantics and underlying RLS, then run two-user isolation tests before enabling commission reads or Task 6C writes.

### Public registration origin

- Owner: product/release owner.
- Evidence: `EXPO_PUBLIC_WEB_ORIGIN` is optional and absent from this worktree runtime.
- Next action: confirm the HTTPS registration origin and configure it per environment. Until then the UI shows `Invite sharing is not configured` and creates no link.

### Device visual QA

- Owner: mobile QA.
- Evidence: unit/component tests and the iOS production bundle pass; no simulator screenshot is recorded here.
- Next action: verify authenticated My Rewards on small iOS and Android devices with long email/source text, empty data, partial errors, refresh, and the system share sheet.

## Rollback

This slice is read-only and has no migration or external write. Roll back by removing the protected Rewards route wiring and its default services. Commission and invite gates default closed, so no data repair is required.
