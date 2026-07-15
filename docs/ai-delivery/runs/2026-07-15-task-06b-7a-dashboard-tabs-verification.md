# Task 6B / 7A Dashboard Tabs Verification

Date: 2026-07-15

Feature: `rn-full-app-port`

Branch: `feat/rn-dashboard-whitelist-rewards-tabs`

Status: pass with runtime QA blocker

## Scope

- Dashboard tabs are exactly Holdings, Transactions, Whitelist, and Rewards.
- `dashboard`, `kyc`, and `referral` aliases select Holdings, Whitelist, and Rewards.
- Whitelist is read-only and requests approved identity details only after an approved KYC summary.
- Rewards is embedded in Dashboard and retains Referrals, Points, and Commission internal tabs.
- Profile Invite Friends loads the current profile and KYC state, then opens the real native invite sheet directly.
- Commission reads, payout writes, and Task 7B KYC start / resume remain disabled.

## Contract Evidence

- `kyc-applicant-details` receives `Authorization: Bearer <access_token>` and an empty `{}` body.
- The identity client API has no user-id argument; ownership must be derived from the verified JWT on the Edge Function.
- Success payloads are shape-checked before entering the identity model.
- Raw document numbers are masked before rendering and identity state is kept only in component memory.
- Navigation is keyed by authenticated viewer id, so logout and account switching unmount prior private state.
- Invite links require an approved KYC summary, a real invite code, and an HTTPS origin without credentials, path, query, or fragment.

## Machine Evidence

`npm test`

- Result: 73 test files passed.
- Result: 357 tests passed.
- Failures: 0.

`npm run typecheck`

- Result: exit 0.

`git diff --check`

- Result: exit 0.

Forbidden scans:

- No sensitive token, session, document, birth-date, or full-name logging.
- No KYC identity user-id payload.
- No identity persistence, clipboard, analytics, or breadcrumb use.
- No production commission query from Dashboard or Rewards.
- No list index keys.
- `service_role` appears only in a negative test assertion.

## Native Build Evidence

- Expo iOS production export completed after the final navigation fix, bundled 4,565 modules, and produced an 8.4 MB Hermes bundle at `/tmp/mytrade-dashboard-tabs-ios-final`.
- Unsigned iPhone Simulator Release build completed with `BUILD SUCCEEDED` at `/tmp/mytrade-dashboard-derived/Build/Products/Release-iphonesimulator/MyTradeApp.app`.
- The built app installed, but dyld terminated it at launch because `ReactNativeDependencies.framework` was absent.
- Crash evidence: `/Users/rwa_start/Library/Logs/DiagnosticReports/MyTradeApp-2026-07-15-215146.ips`.
- Root cause is a local CocoaPods dependency-graph mismatch: Pods were regenerated once in source mode while the bundled prebuilt `React.framework` expects `ReactNativeDependencies.framework`.
- Three targeted CocoaPods recovery attempts did not restore a consistent graph, so no fourth destructive Pods reset was attempted.

## Review Results

### Security and authorization

- Identity details are approved-only, JWT-only, and fail closed on missing token or malformed payload.
- KYC approval is still read from the backend summary; the client never promotes itself to approved.
- A review finding showed `MainTabs` state survived logout and viewer changes. Navigation now keys the private tree by viewer id, with regression tests proving the invite sheet is removed on logout and account switch.
- External Codex review was not executed because the permission gate rejected exporting a private repository diff. No workaround was attempted.

### Data and business boundaries

- No database migration or write path was added.
- Commission read models remain unavailable in production UI pending view isolation and grant verification.
- Task 6C payout and Task 7B KYC launcher remain out of scope.

### Performance

- Each active Dashboard tab owns one vertical `FlatList`; there is no nested vertical virtualized list.
- Whitelist uses stable fact ids; Rewards uses stable business ids.
- Profile and KYC reads for the invite command start concurrently.

### QA

- Status, error, empty, retry, viewer-change, unmount, route alias, invite gate, and session-isolation paths are automated.
- Native screenshot QA is not complete because the local simulator app could not launch after the Pods mismatch.
- Expo Web is not an acceptance substitute because Web rendering dependencies are absent.

## Residual Risks And Owners

### Native visual QA

- Owner: mobile QA / iOS build owner.
- Evidence path: crash report and Native Build Evidence above.
- Next action: recreate Pods from the committed lockfile in a clean worktree, then verify 320-pixel phone and tablet layouts, long text wrapping, nickname keyboard dismissal, refresh, tab switching, and invite sheet behavior.

### Commission authorization

- Owner: Supabase/backend owner.
- Evidence path: `docs/ai-delivery/runs/2026-07-15-task-06a-supabase-contract-check.md`.
- Next action: fix anonymous exposure, verify invoker semantics and underlying RLS, then run two-user isolation tests before enabling reads or payout writes.

### Public invite origin

- Owner: product/release owner.
- Evidence path: `EXPO_PUBLIC_WEB_ORIGIN` remains unconfirmed.
- Next action: configure the approved HTTPS registration origin per environment; until then invite generation stays closed.

## Rollback

This slice has no migration or external write. Roll back the Dashboard tab, identity client, route alias, and direct invite commits. Commission and invite gates default closed, so rollback requires no data repair.
