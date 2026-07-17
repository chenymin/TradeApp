# Mobile Wallet Read-Only Verification

Date: 2026-07-17

Feature: `rn-full-app-port`

Branch: `feat/mobile-wallet-readonly`

Scope: Task 8A-8C, authenticated Wallet identity, balances, receive, copy, text share, and branded image share. Transfer, signing, wallet switching, chain switching, link, and unlink remain out of scope.

## Deterministic Evidence

| Gate | Result |
| --- | --- |
| `npm test -- src` | Pass: 82 files, 413 tests, 0 failures |
| `npm run typecheck` | Pass: exit 0 |
| Wallet write-capability scan | Pass: no matches |
| Wallet Supabase mutation scan | Pass: no matches |
| Token/session/signature log scan | Pass: no matches |
| Web-only dependency/API scan | Pass: no matches |
| React index-key scan | Pass: no matches |
| `git diff --check` | Pass |
| `npm run ai:audit -- rn-full-app-port` | Pass: no cross-document consistency issue |

Production export:

```text
npx expo export --platform all --output-dir /tmp/mytrade-wallet-export-20260717-0944
Android: pass, 4,588 modules, 8.5 MB Hermes bundle
iOS: pass, 4,532 modules, 8.5 MB Hermes bundle
```

Metro emitted the existing `@noble/hashes/crypto.js` package-exports fallback warning. Both platform exports completed.

iOS native integration:

```text
xcodebuild -workspace ios/MyTradeApp.xcworkspace -scheme MyTradeApp \
  -configuration Debug -sdk iphonesimulator \
  -destination platform=iOS Simulator,id=<redacted> \
  -derivedDataPath /tmp/MyTradeAppWalletDerivedData \
  CODE_SIGNING_ALLOWED=NO build
Result: BUILD SUCCEEDED
```

The resulting app loaded the 8090 feature bundle on an iPhone 17 Pro simulator running iOS 26.5 and rendered Launchpad without a missing-native-module or dyld error.

## Review Results

- Security and business boundary: `AuthViewer.walletAddress` is the only authoritative address. Privy wallets are display metadata only. No write, signature, transfer, switch, link, or unlink action is reachable.
- Identity isolation: missing or invalid identity returns the unavailable screen before Supabase discovery or RPC reads. A same-user verified-address change now remounts the authenticated tree; a regression test prevents prior Wallet state from surviving the change.
- Contract boundary: BNB and USDT addresses come from the supported BSC registry. ART addresses are accepted only from configured-chain `art_assets` rows after Viem address validation and case-insensitive deduplication.
- Amount boundary: raw balances remain `bigint` until `formatUnits`. Token decimals are read on-chain. Failed decimals or balance reads remain `Unavailable`, never zero.
- Share privacy: the capture card contains only ArtStar, configured public chain, public address, and QR. It excludes balances, user IDs, email, sessions, and tokens. Temporary PNG cleanup runs in `finally`.
- Data boundary: the Wallet repository performs a read-only `art_assets` query filtered by `chain_id` and `is_deleted = false`. No schema, migration, transaction, or user-data mutation is included.
- Performance: no polling, realtime subscription, or app-wide high-frequency state was added. Balance state stays screen-local. Large ART sets still use one multicall and one screen `ScrollView`; device profiling remains required before release.
- Native dependency compatibility: direct `expo-file-system 57.0.1` reproduced a dyld symbol failure against the Expo 57 prebuilt core. The dependency is pinned to the SDK's previously working `57.0.0`, CocoaPods records `ExpoSharing 57.0.5` and `react-native-view-shot 5.1.0`, and the rebuilt simulator app stays running.

An external Codex review was not run because the private repository diff was not authorized for transmission to an external review service. The diff was reviewed locally against `cb9e91c`.

## Device QA Status

Physical iOS and Android QA has not been executed from this worktree. Partial iOS simulator QA passed native build, installation, bundle loading, and logged-out Launchpad rendering. Authenticated Wallet QA could not proceed because the intentionally unsigned simulator build cannot write SecureStore/Keychain (`setValueWithKeyAsync` reports missing authorization), so it cannot restore a login session.

The following release checks remain pending:

- Phone and tablet layout, including long addresses, large balances, and many positive ART rows.
- BSC Testnet `97`, then configuration-only Mainnet `56` verification.
- No-wallet, zero BNB/USDT, zero ART filtering, and non-18-decimal ART against an independent RPC or explorer.
- Offline and partial RPC behavior, Retry recovery, and repeated navigation/logout.
- Clipboard content, text-share cancellation, image-share cancellation/failure, retry, and temporary-file cleanup.
- Branded PNG legibility and QR scan on a second device.

Owner: mobile QA. Evidence path: this document plus the device/build matrix captured during execution. Next action: install a signed dev client or use a physical development build, sign in, then run the checklist on authenticated iOS and Android builds before release approval.

## Residual Risks

- Supabase owner must confirm Data API grants and RLS/select policy for public `art_assets` reads in each environment. This slice does not change or bypass those policies.
- Mobile QA must validate off-screen view capture on both platforms; deterministic tests verify adapter behavior but cannot prove native capture composition.
- Mobile QA must profile large ART inventories. If row count or RPC payload becomes material, follow-up work should chunk multicalls and virtualize the balance list.
- Dependency installation reported 12 moderate and 5 high vulnerabilities in the complete npm dependency graph. No automatic `npm audit fix` or forced upgrade was applied; dependency remediation requires a separate compatibility review.

## Rollback

Remove the Wallet detail entry and injected Wallet dependencies, then remove `expo-file-system`, `expo-sharing`, and `react-native-view-shot` together with their native build artifacts. There are no database writes, migrations, signatures, transactions, or on-chain state to compensate.
