# Task 8D Mobile Wallet Controlled Unlink Verification

Date: 2026-07-17

Feature: `rn-full-app-port`

Branch: `feat/rn-wallet-controlled-unlink`

## Scope

- Unlink an external, Privy-linked, non-active Ethereum wallet after native confirmation.
- Preserve the current account, Viewer active wallet, KYC, points, referrals, and balances.
- Reuse the deployed `wallet-login` exchange after Privy succeeds.
- Retry only session/platform synchronization after a post-unlink refresh failure.
- Keep Task 8E wallet switching, wallet connection, transfer, and signing unavailable.

## Machine Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full unit/component suite | pass | `npm test`: 84 files, 437 tests |
| TypeScript | pass | `npm run typecheck` |
| AI Delivery audit | pass | `npm run ai:audit -- rn-full-app-port` |
| AI Delivery deterministic gates | pass | `npm run ai:verify -- rn-full-app-port --write`: 8/8 |
| Diff whitespace | pass | `git diff --check origin/main...HEAD` |
| Wallet UI has no Edge Function/token contract | pass | `verify-no-match` for `functions/v1`, `wallet-login`, `privyToken`, `accessToken`, `wallet-select`, `sync-wallets` in Wallet TSX |
| No transfer/switch/signing additions | pass | `verify-no-match` for `writeContract`, `sendTransaction`, `switchChain`, `useActiveWallet`, `useWallets` |

## Red-Green Evidence

- Auth refresh tests failed before `refreshSession` existed, then passed after implementation.
- Provider tests failed before refresh state preservation existed, then passed after implementation.
- Wallet workflow tests failed before eligibility/sequencing existed, then passed.
- Native adapter tests failed before Alert/Privy bindings existed, then passed.
- Wallet screen tests failed before eligible actions and recovery UI existed, then passed.
- Navigation tests failed before authenticated dependency propagation existed, then passed.
- Concurrency tests reproduced double unlink and late refresh-after-logout, then passed after operation locking and generation guards.
- A forged same-address wallet object reproduced attribute trust, then passed after canonical identity lookup.
- Viewer-only synthetic wallet coverage reproduced the final-Privy-wallet bypass, then passed after `privyLinked` tracking.

## Security And Business Review

- The client never accepts an investor id or free-form target address.
- Canonical wallet kind, status, provider, and address come from current Privy metadata mapped into WalletIdentity.
- Viewer-only synthetic active rows do not count toward the remaining Privy wallet rule.
- Embedded, active, non-Privy, unknown, and final Privy Ethereum wallets cannot be unlinked.
- Rapid presses coalesce to one confirmation, one Privy unlink, and one session refresh.
- Privy failure permits a new confirmed unlink attempt and never triggers platform refresh.
- Once Privy succeeds, platform failure exposes only `Retry wallet sync`; Privy unlink is not repeated.
- Logout supersedes an in-flight refresh before replacement session persistence.
- Refresh failure keeps the existing authenticated session and Viewer available.
- No schema, RLS, Edge Function, KYC, entitlement, or contract change is included.

## Rollback

Reverting the mobile commits removes the unlink action and non-interactive refresh entry point. A wallet already unlinked from Privy cannot be relinked by code rollback; the existing `wallet-login` flow will reconcile it on a later successful login.

## Manual Device Gate

The following checks use a signed Expo development build and a real authenticated Privy account:

- iOS destructive confirmation: pass on iPhone 17 Pro simulator with an authenticated account and a real linked Rabby wallet.
- iOS Cancel: pass; the external wallet row remained linked and no destructive confirmation was accepted.
- iOS real unlink: pass on 2026-07-18; the native confirmation was accepted once for `rabby_wallet` `0x15A16a...Bf5dEf`.
- Privy convergence: pass; the unlink request returned HTTP 200 and the Rabby row disappeared while the active Privy Embedded wallet remained `0x91f451...Ae8Ca6`.
- Platform convergence: pass; `wallet-login` returned HTTP 200 at 12:07:00, followed by a successful authenticated session request at 12:07:01. The account stayed authenticated and the active wallet did not change.
- Database convergence: service-level pass; the deployed `wallet-login` returns success only after `syncInvestorWallets` marks missing active rows as `status='removed'` and updates the investor mirror. Direct privileged SQL was intentionally not used from the mobile client.
- Android destructive confirmation and cancellation: pending.
- Offline refresh shows `Wallet removed; sync pending`; reconnect + Retry sync converges without a second Privy request.
- Active wallet: pass. KYC, points, referrals, and rewards are outside the unlink mutation path and no related write was issued; a dedicated post-unlink visual regression remains optional release QA.

The iOS Wallet view surfaced a pre-existing unhandled timeout indicator. Simulator logs traced it to a stale Supabase `/auth/v1/user` request started at 12:03:00 and timed out at 12:06:35, before the unlink request began at 12:06:55. The subsequent Privy, `wallet-login`, and session requests all returned HTTP 200, so this indicator is not an unlink failure. It should be triaged separately as auth-client background request handling.

Status: machine verification, iOS confirmation/cancel, and real Privy/backend convergence passed. Android confirmation/cancel and deliberate offline Retry sync QA remain pending.
