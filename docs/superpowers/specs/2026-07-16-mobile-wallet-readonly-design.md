# Mobile Wallet Read-Only Design

Date: 2026-07-16

Feature: `rn-full-app-port`

## Goal

Add a production-shaped mobile Wallet experience that lets an authenticated user inspect the server-verified wallet, linked-wallet metadata, wallet security state, BSC balances, and receive/share information without enabling transfers or other wallet writes.

## Business References

The business behavior is derived from:

- `/Users/rwa_start/ProjectSource/ArtStarFront/src/pages/Wallet.tsx`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/components/wallet/*`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useWallet.ts`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useWalletBalances.ts`
- `/Users/rwa_start/ProjectSource/ArtStarFront/src/hooks/useTransfer.ts`

The React Native implementation preserves the wallet display, balance, receive, copy, and share rules. It does not copy Web-only APIs, DOM image generation, Wagmi hooks, or the Web transfer workflow.

## Confirmed Decisions

- Use the wallet-management-first mobile layout selected in the visual review.
- Treat `AuthViewer.walletAddress`, returned through the authenticated `wallet-login` session, as the only active wallet address for this delivery.
- Show other Privy linked wallets as read-only metadata. Do not switch active wallets in this delivery because `@privy-io/expo` does not expose the Web `useWallets/useActiveWallet` contract.
- Support BSC Mainnet `56` and BSC Testnet `97` through one chain registry. `EXPO_PUBLIC_CHAIN_ID` selects the environment and defaults to `97` when omitted.
- Always show BNB and USDT rows, including zero balances. Show ART Token rows only when their balance is greater than zero.
- Support address copy, text share, and branded QR image share.
- Keep unlink, external-wallet connection/switching, transfer, signature, and chain switching out of this delivery.

## Scope Decomposition

### Task 8A: Wallet identity and route

- Connect the Profile Wallet item to the protected `wallet` route.
- Display the server-verified active wallet and Privy linked-wallet metadata.
- Mark wallets as Embedded or External and Active or Linked.
- Display Passkey MFA as informational security state only.

### Task 8B: Balances and receive

- Read BNB, USDT, and positive-balance ART Token holdings on the configured BSC chain.
- Render loading, partial-error, empty, unavailable, and retry states without converting read failures to zero.
- Render the receive address and QR code.
- Copy and text-share the configured chain name and active wallet address.

### Task 8C: Branded image share and responsive QA

- Render an off-screen branded receive card containing the QR code, chain, and address.
- Capture it to a temporary PNG using `react-native-view-shot`.
- Share the file through `expo-sharing` and clean the temporary file through `expo-file-system` after success, cancellation, or failure.
- Verify phone and tablet layouts, long addresses, large balances, zero balances, weak network, share cancellation, and QR scanning on iOS and Android.

### Deferred controlled work

- Task 8D: unlink an external non-active wallet with explicit confirmation. Never unlink the Embedded Wallet, active wallet, or final linked wallet.
- A separate mobile wallet-connect task: integrate Privy Expo SIWE/WalletConnect, then refresh the server session so Wallet, Dashboard, and transactions share one active address.
- A separate transfer task: BNB and ERC-20 validation, explicit confirmation, Passkey policy, signing, receipt waiting, failure recovery, and testnet/production gates.

## Architecture

### Wallet identity boundary

`WalletIdentityAdapter` maps the current authenticated viewer and Privy user metadata into a deterministic read model. The viewer address is authoritative. Linked Privy wallet records can describe provider/type/status but cannot override the active address or authorization boundary.

When no authenticated viewer address exists, Wallet does not query the chain and renders an unavailable state. Wallet addresses and Privy metadata stay in memory and are cleared with the authenticated navigation tree on logout or viewer change.

### Chain registry and configuration

Extend public configuration with optional `EXPO_PUBLIC_CHAIN_ID`. Missing means `97`. Only `56` and `97` are valid. Any other non-empty value produces a fatal configuration error rather than silently selecting another network.

The shared BSC registry owns chain metadata, public clients, native symbol, explorer origin, and USDT address. Components must not hard-code contract addresses.

### Balance data flow

`WalletBalanceRepository` receives the configured chain, active address, and current-chain asset contracts. It uses the shared Viem public client to read:

1. Native BNB balance.
2. USDT decimals and `balanceOf`.
3. ART Token `decimals` and `balanceOf` for assets with a valid contract address on the configured chain.

All raw values remain `bigint` until `formatUnits` creates display strings. BNB uses 18 decimals. USDT and every ART Token use chain-reported `decimals`; the client must not assume that every ERC-20 uses 18 decimals.

Reads use failure-tolerant batching. One failed token stays unavailable and does not hide successful balances. A failed contract read is never displayed as zero.

### Share boundaries

Text sharing reuses a platform adapter over React Native `Share`. Image sharing is isolated behind `WalletImageShareAdapter`; the screen supplies a capture target and does not manage filesystem paths directly. The adapter owns capture, share, and `finally` cleanup.

Shared text and images contain only the configured BSC chain name and public wallet address. They never contain auth tokens, session values, Privy IDs, email, balance data, or user IDs.

## UI Design

### Mobile

Use one vertical scroll surface in this order:

1. Header with `Wallet`, configured chain badge, and verified address.
2. Linked wallets section with Active/Linked and Embedded/External labels; no switch or unlink controls.
3. Wallet security section with Passkey state and a note that transfers are unavailable in this delivery.
4. Balances list with Token icon, symbol, native/contract label, short contract address, and formatted balance.
5. Receive section with BSC-only warning, QR code, full address, Copy, Text Share, and Image Share icon actions.

Do not render a Transfer tab, transfer form, Max action, transaction confirmation, or disabled transfer button.

### Tablet

Use a two-column responsive layout: identity/security on the left, balances/receive on the right. Both columns keep stable minimum widths and collapse to the mobile order when space is insufficient.

## State and Error Behavior

- Missing verified address: Wallet unavailable; no chain request.
- Invalid chain configuration: fatal public configuration screen.
- Initial load: stable skeleton rows that do not shift the page structure.
- Native or token read failure: mark only that row unavailable and offer refresh.
- Asset discovery failure: keep BNB and USDT visible; show ART Token discovery unavailable.
- No positive ART balances: show BNB and USDT only, not an empty-wallet error.
- Copy failure: keep the address visible and show a non-sensitive retry message.
- Text share cancellation: return to idle without an error alert.
- Image capture/share failure: show a retryable message and remove any temporary file.
- Viewer change/logout: discard Wallet screen state and linked-wallet metadata.

## Security Boundaries

- The client never treats a linked-wallet row, route parameter, QR value, clipboard content, or local state as authorization for account data or writes.
- No transfer, signing, chain switch, wallet switch, unlink, or link mutation is reachable from the screen.
- No wallet/session/token data is written to logs or persistent storage.
- Passkey state is informational; it cannot grant transfer permission in the client.
- Contract addresses come from the shared registry and validated asset rows.
- Image sharing excludes balances to reduce accidental financial disclosure.

## Testing and Verification

### Deterministic tests

- Public chain config accepts omitted/`56`/`97` and rejects every other value.
- Wallet identity mapper keeps the server viewer address authoritative.
- Balance mapper covers BNB, USDT decimals, ART decimals, zero balances, invalid contracts, large `bigint` values, and partial multicall failures.
- Token selection always includes BNB/USDT and filters zero-balance ART Token rows.
- Screen tests cover loading, partial error, missing wallet, no ART balances, linked-wallet labels, copy, both share modes, and retry.
- Image-share tests prove temporary cleanup on success, cancellation, capture failure, and share failure.
- Navigation tests prove the Profile Wallet entry opens the protected Wallet route and private state resets on logout/viewer change.
- Forbidden scans prove there are no transfer/sign/writeContract/sendTransaction/unlink/switch actions in Task 8A-C UI code.

### Device QA

- iOS and Android authenticated sessions on BSC Testnet `97`.
- Narrow phone and tablet/wide layout.
- Long wallet address, large balances, zero balances, many ART Token balances, weak/offline RPC, refresh, and repeated navigation.
- Copy feedback, text share, image share cancellation, temporary-file cleanup, and QR scanning with another device.

## Acceptance

- Wallet opens from Profile and displays the server-verified address.
- Linked wallets and security state are visible without exposing unsupported controls.
- BNB/USDT and positive ART balances follow the confirmed display rules.
- Read errors stay distinct from zero balances.
- QR, copy, text share, and branded image share work without exposing private data.
- No transaction, signature, external-wallet switch, or unlink can be initiated.
