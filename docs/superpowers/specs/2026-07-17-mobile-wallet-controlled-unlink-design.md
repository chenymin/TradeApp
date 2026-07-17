# Mobile Wallet Controlled Unlink Design

Date: 2026-07-17

Feature: `rn-full-app-port`

Task: 8D

## Goal

Allow an authenticated mobile user to unlink an eligible external Ethereum wallet from the Wallet screen without changing accounts, KYC, points, referrals, or the active wallet.

## Confirmed Scope

- Reuse the deployed `wallet-login` Edge Function as the Privy-to-platform wallet synchronization boundary.
- Do not introduce `sync-wallets`, `wallet-select`, active-wallet switching, external-wallet connection, transfer, or signing in this task.
- Use `@privy-io/expo` `useUnlinkWallet().unlinkWallet({ address })` for the Privy mutation.
- Refresh the existing authenticated session after a successful Privy unlink. `wallet-login` will issue a replacement short-lived JWT as part of its current contract; the account id remains unchanged.
- Treat `AuthViewer.walletAddress` as the authoritative active wallet throughout this task.

## Eligibility Rules

An unlink action is reachable only when all rules are true:

1. The wallet is present in the current Privy Ethereum linked-wallet metadata.
2. The wallet is `external`.
3. The wallet is not `AuthViewer.walletAddress` and therefore is not active.
4. At least one other Ethereum wallet remains linked.
5. No unlink or post-unlink synchronization is already in progress.

Embedded wallets, the active wallet, and the final Ethereum wallet never expose an unlink action. The client rules protect the interaction, but they do not authorize platform data; Privy validates the unlink mutation and `wallet-login` derives the final wallet set from the verified Privy token.

## Architecture

### Wallet mutation boundary

Add a small `WalletUnlinkDependencies` interface owned by the wallet feature:

- `confirm(address, providerLabel)` shows the native destructive confirmation and resolves to a boolean.
- `unlink(address)` delegates to Privy and resolves only after Privy reports success.
- `refreshSession()` obtains a fresh Privy access token, calls the existing `wallet-login`, persists the replacement Supabase session, and updates `AuthViewer` without opening the login UI.

`AppRoot` supplies the real Privy hook and AuthProvider action. Tests inject deterministic fakes. UI components never call Edge Function URLs or session storage directly.

### Auth refresh boundary

Extend the existing auth workflow with a non-interactive refresh operation. It uses the already authenticated Privy session and existing exchange adapter:

```text
get current Privy access token
  -> wallet-login exchange
  -> persist replacement Supabase session
  -> update AuthProvider viewer
```

Refresh failure must not sign the user out, clear the working session, or discard the existing viewer. The caller receives failure and keeps a retryable wallet synchronization state.

### Existing backend behavior

No Edge Function or database change is part of Task 8D. After Privy removes the wallet, the next successful `wallet-login` call reads the updated `linked_accounts`, marks the missing `investor_wallets` row as `removed`, keeps the existing active wallet primary, mirrors it to `investors.wallet_address`, and returns the refreshed viewer.

## Interaction Flow

```text
tap unlink icon
  -> native confirmation
  -> cancel: return to idle
  -> confirm: call Privy unlink once
     -> Privy failure: show retryable unlink error
     -> Privy success: call non-interactive session refresh
        -> refresh success: remove row and return to ready state
        -> refresh failure: show "wallet removed; sync pending"
           -> retry sync: call refresh only
```

Once Privy unlink succeeds, the command records that the irreversible external step completed. Every subsequent retry calls only `refreshSession()`; it must never call `unlink()` again.

## UI

- Keep the existing Wallet information hierarchy and spacing.
- Show a trash icon action only on eligible linked external wallet rows.
- Give the icon an accessibility label containing the shortened wallet address and a tooltip-equivalent accessibility hint.
- Use a native destructive confirmation dialog containing the provider label and shortened address.
- While unlinking or synchronizing, disable wallet mutation actions and show stable inline progress without resizing the row.
- Privy failure shows a non-sensitive inline error and permits starting the unlink flow again.
- Post-unlink synchronization failure shows a distinct inline message and a `Retry sync` command. It does not show another unlink command for that address.

## State Model

The wallet screen owns one mutation state:

- `idle`
- `confirming`
- `unlinking(address)`
- `syncing(address)`
- `unlink_error(address)`
- `sync_error(address)`
- `complete(address)`

The state is screen-local and contains no token or full error payload. After both steps succeed, `complete(address)` suppresses the removed row until Privy metadata no longer contains it, preventing a delayed context update from briefly exposing a second unlink action. Privy metadata remains the display source for all other linked-wallet rows; the server viewer remains the active-wallet source.

## Error And Recovery Rules

- Confirmation cancelled: no network or Privy call.
- Privy unlink rejected/cancelled: no session refresh; show unlink error.
- Privy unlink succeeded and refresh failed: preserve current authenticated session and viewer; retry refresh only.
- Refresh succeeded but Privy metadata update is delayed: suppress the completed address until metadata no longer includes it or the screen is re-entered.
- Viewer or authenticated navigation tree changes: discard mutation state.
- Error text must not include Privy tokens, Supabase JWTs, user ids, email, or raw provider error bodies.

## Security Boundaries

- The target address comes from verified in-memory Privy metadata, not route parameters or text input.
- The client never sends an `investor_id`; `wallet-login` derives it from the verified Privy user.
- The active wallet cannot be unlinked even if row ordering changes.
- Embedded wallets cannot be unlinked from this UI.
- A successful Privy unlink is never repeated as compensation for a later platform-sync failure.
- No token, full wallet list, or auth response is logged.
- Task 8D does not change KYC or move any user entitlement between accounts.

## Testing

Deterministic tests must prove:

- eligibility permits only an external, non-active wallet when another Ethereum wallet remains;
- embedded, active, and final wallets expose no unlink action;
- cancellation performs no mutation;
- confirmation calls Privy unlink once and then refreshes the session;
- Privy failure does not refresh;
- refresh failure preserves the authenticated viewer and exposes retry sync;
- retry sync never calls Privy unlink again;
- successful refresh replaces the stored session and updates the viewer;
- Wallet row layout remains stable during progress and error states;
- logout/viewer change clears pending mutation state;
- source scans show no Edge Function URL, token logging, wallet switching, transfer, or signing in wallet UI files.

Device QA must cover iOS and Android confirmation, cancellation, successful unlink, offline refresh failure, retry after reconnect, navigation away/back, and an account with embedded plus multiple external wallets.

## Rollout And Rollback

- No schema migration or Edge Function deployment is required.
- Release behind the existing authenticated Wallet route; the action is absent when dependencies are unavailable.
- Rollback removes the mobile unlink command. Wallets already unlinked in Privy remain unlinked and will converge in the platform on a later successful `wallet-login`.

## Acceptance

- Only eligible external non-active wallets can be selected for unlink.
- Explicit confirmation is required.
- A successful unlink is followed by non-interactive `wallet-login` synchronization.
- A failed synchronization is recoverable without repeating the unlink mutation.
- The current account, KYC, entitlements, and active wallet remain unchanged.
- Task 8E switching and wallet connection remain unavailable.
