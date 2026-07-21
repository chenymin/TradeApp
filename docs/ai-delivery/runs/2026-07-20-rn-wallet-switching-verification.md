# Mobile Wallet Binding And Switching Verification

Date: 2026-07-20 (evidence refreshed 2026-07-21)

Feature: `rn-wallet-switching`

Branch: `rn-wallet-switching`

Status: implementation verified; provider-backed manual QA and local database execution remain release gates.

## Scope And Commits

| Repository | Commit | Scope |
| --- | --- | --- |
| ArtStarManagementPlatform | `dbb4b0c` | Atomic `select_investor_wallet` RPC, operation ledger, grants/RLS, and verification SQL |
| ArtStarFront | `99c60f6` | Privy-verified `wallet-select` Edge Function and tests |
| MyTradeApp | `5cc822e` | Wallet-select client and replacement-session contract |
| MyTradeApp | `68a3bd5` | Reown connection and Privy SIWE adapters |
| MyTradeApp | `1f86c6a` | Controlled binding/switching workflow and Wallet UI |
| MyTradeApp | `c3a4fc4` | Supabase gateway public-key headers |
| MyTradeApp | `c9af85f` | Reproducible iOS Pods and Metro preset dependencies |

No production migration, Edge Function deployment, cross-account destructive write, or Android device action was performed.

## Machine Verification

| Repository / check | Result | Evidence |
| --- | --- | --- |
| MyTradeApp full suite | pass | `npm test -- --run`: 92 files, 487 tests |
| MyTradeApp typecheck | pass | `npm run typecheck`, exit 0 |
| Wallet runtime dependency contract | pass | `WalletConnectionProvider.test.ts`: 5 tests; pins Babel preset and required Pods |
| MyTradeApp diff whitespace | pass | `git diff --check`, exit 0 |
| ArtStarFront wallet-select focus | pass | Node 22: 4 files, 31 tests |
| ArtStarFront full suite | pass | Node 22: 55 files, 292 tests |
| ArtStarFront lint | baseline fail | 15 errors and 17 warnings, all outside `wallet-select` delivery files |
| Management migration contract | pass | 1 file, 1 test |
| Management full suite | baseline fail | 30/31 files and 138/139 tests pass; the remaining commission test expects a missing adjacent `ArtStarFront` worktree path |
| Management lint | baseline fail | 39 errors and 12 warnings in pre-existing application/test files |
| CocoaPods lock install | pass | `pod install --deployment`: 112 dependencies / 112 pods |
| iOS Debug simulator build | pass | Xcode 26.6, iPhone 17 Pro simulator, `CODE_SIGNING_ALLOWED=NO`, `BUILD SUCCEEDED` |
| Metro iOS bundle | pass | HTTP 200; 22,358,905-byte development bundle after pinning `babel-preset-expo@57.0.1` |
| iOS runtime smoke | pass | App installed, loaded the `rn-wallet-switching` bundle over LAN, and rendered the Launchpad UI |

ArtStarFront must use Node 22 for the recorded baseline. Node 25 adds an invalid `--localstorage-file` runtime behavior and is not the verification runtime for this feature.

## Build Issues Found And Closed

1. The first sandboxed `xcodebuild` reported that the workspace was invalid. Running Xcode with CoreSimulator/DerivedData access proved the workspace was valid.
2. `pod install --deployment` then found that the lockfile did not include AsyncStorage, NetInfo, or WalletConnect compatibility Pods. The lockfile and CocoaPods resource phase were regenerated and committed.
3. A clean worktree Metro start failed because `babel.config.js` referenced an indirectly nested `babel-preset-expo`. The preset is now a direct, exact dev dependency.
4. The simulator initially retained an older app install and reported `AsyncStorage is null`. Reinstalling the verified build without clearing application data loaded the native module correctly.
5. The worktree did not contain the ignored `.env`. A local-only symlink to the root `.env` allowed runtime smoke testing without copying, printing, or committing credentials.

## Forbidden Pattern Scans

- No mobile `.from("investors" | "investor_wallets").insert/update/upsert/delete` call was found.
- No wallet-select direct table update was found; its only database write dependency is `select_investor_wallet`.
- `wallet-login/index.ts` has no diff from ArtStarFront baseline `1f57226`.
- No `linked_accounts[0]` target selection was found.
- No service-role key, JWT secret, or wallet-login secret is present in production mobile source.
- The `service_role` mobile scan only matched a test asserting that a fatal config screen does not render that text.
- Session/token scan matches are limited to SecureStore serialization and request-body construction; no token/session console logging was found.

## Security Review

Result: pass, with no unresolved Critical or Important finding.

- Reown provides the connector address only; Privy SIWE establishes wallet ownership.
- `wallet-select` verifies the Privy access token server-side and matches the exact requested Ethereum linked account. It does not trust linked-account order or a client-supplied investor id.
- Investor ownership and status are derived server-side from the verified Privy user.
- The mobile request authenticates the Supabase gateway with the public project key. The Privy token remains in the request body for Edge Function verification and is not logged.
- Database execution is restricted to the service-role-only RPC. `PUBLIC`, `anon`, and `authenticated` cannot execute it.
- The replacement JWT/Viewer is persisted before the workflow reports complete. Auth generation guards prevent a late selection result from crossing logout/account changes.
- Selection and unlink share one mutation lock, preventing concurrent wallet mutations in the UI.
- KYC and account authority are not decided in the client.

## Data And Supabase Review

Result: static/contract pass; local execution blocked.

- The RPC updates only `investor_wallets`, `investors.wallet_address`, and the operation ledger inside one transaction.
- Investor row locking precedes sorted wallet-row locking, giving deterministic lock order.
- Expected-previous checks reject stale requests; operation payload checks make retries idempotent and reject operation-id reuse with different data.
- Unique wallet ownership and one-primary-per-investor constraints protect cross-account and primary consistency.
- `wallet_selection_operations` has RLS enabled and forced, no client policy, explicit service-role grants, and indexes for investor history and creation time.
- Authenticated broad UPDATE access to `investors` is revoked; nickname writes continue through the separate `update_my_nickname` RPC.
- The current Supabase changelog has no directly applicable Edge Function/RLS breaking change. The 2026 Data API exposure change does not require client exposure for this service-role-only ledger.

Blocker: Docker is not installed, so `supabase/manual/verify_wallet_selection.sql` could not execute locally.

- Owner: backend/data deployment owner.
- Evidence: `docker` is not available; migration contract test passes.
- Next action: before deployment, run the verification SQL against an isolated local or staging database and record commit, rollback, idempotency, stale request, cross-investor conflict, and authenticated direct-update denial results.

Residual data risk: operation ledger indexes exist, but retention/cleanup automation is not part of this task. Define retention before operation volume becomes material.

## Business Boundary Review

Result: pass.

- Binding a new external wallet immediately selects it as the platform active wallet, matching the current Web behavior.
- Selecting an existing linked wallet changes the active wallet within the same investor account; it does not create a new account.
- No KYC status, points, referrals, commissions, holdings, tier, invitation, or reward field is written by this feature.
- Existing `wallet-login` behavior remains unchanged. Mobile selection uses the new endpoint and atomic RPC.
- A Privy-linked wallet is not reported as fully selected until the platform RPC succeeds and the replacement session is persisted.
- Privy-link success followed by an unknown platform result retains the operation id for forward recovery instead of falsely rolling back ownership.

## iOS Manual QA Gate

Completed:

- Development workspace resolution and Pods installation.
- Debug simulator build without code signing.
- Installation, cold launch, Metro bundle generation, and Launchpad render.

Pending provider-backed scenarios:

- MetaMask or Rabby connection and return deep link.
- Connection cancellation.
- SIWE rejection/failure.
- Newly bound wallet becomes active.
- Existing linked-wallet switch and native confirmation cancellation.
- Replacement Viewer/session address matches the selected wallet.
- Connector/Privy address mismatch rejects before `wallet-select`.

Blocker:

- Owner: mobile QA / project environment owner.
- Evidence: the simulator is signed out, and the current root `.env` has no `EXPO_PUBLIC_REOWN_PROJECT_ID` entry.
- Next action: add an approved public Reown project id to the local QA environment, sign in with a non-production test investor that has one existing external wallet and one spare wallet, then execute the scenarios above. Do not create a production cross-account conflict fixture.

## Android Deferred Gate

Android build/device verification remains intentionally deferred for the unified Android pass requested by the user. No Android success is claimed. The later pass must cover build, WalletConnect return, cancellation, SIWE, bind-active, switching, session persistence, and address mismatch.

## Rollback And Release Boundary

- Mobile rollback removes the connector/selection UI and replacement-session workflow but does not unlink a wallet already linked in Privy.
- Edge Function rollback stops new wallet selections; existing `wallet-login` remains available.
- Database migration rollback must happen only after `wallet-select` traffic is stopped and operation state is reviewed.
- Release remains blocked until the local/staging SQL gate and provider-backed iOS gate are recorded. Android remains a separate deferred release gate.
