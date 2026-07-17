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

The following checks require a signed Expo development build and a real authenticated Privy account. They are not claimed by the machine suite:

- iOS and Android render the destructive confirmation correctly.
- Cancel and system-dismiss leave the linked wallet unchanged.
- A real external linked wallet is removed by Privy exactly once.
- `wallet-login` succeeds after unlink and returns the same account id and active wallet.
- The corresponding `investor_wallets` row becomes `status='removed'`.
- Offline refresh shows `Wallet removed; sync pending`; reconnect + Retry sync converges without a second Privy request.
- Active wallet, KYC status, points, referrals, and rewards remain unchanged.

Status: machine verification passed; manual device/backend convergence gate pending.
