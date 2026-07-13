# RN Full App Port Task 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement read-only public asset browsing for the Launchpad and Market tabs with Supabase pagination, batched viem contract reads, resilient list state, and mobile asset cards.

**Architecture:** A repository returns normalized database rows, a chain adapter batches the five allowed view calls by chain, and an aggregation loader maps both sources into trusted display summaries. Screens consume a reducer-backed hook through an injected loader so navigation tests stay deterministic and no screen imports Supabase or viem.

**Tech Stack:** React Native 0.86, React 19, TypeScript, Vitest, Supabase JS, viem, Expo.

---

## File Map

- `src/features/assets/domain/assetModels.ts`: shared database, chain, page, filter, sort, and display types.
- `src/features/assets/domain/assetDisplayStatus.ts`: pure sale-state trust and status resolution.
- `src/features/assets/domain/assetMappers.ts`: database normalization, amount formatting, progress calculation, remaining time, and summary mapping.
- `src/features/assets/domain/assetListState.ts`: pure reducer for initial load, refresh, pagination, query changes, stale responses, and errors.
- `src/features/assets/services/assetRepository.ts`: the only Supabase query boundary; read-only page retrieval with injected client.
- `src/features/assets/services/assetContractReadAdapter.ts`: the only viem boundary; five read-only calls per supported contract grouped by chain.
- `src/features/assets/services/publicAssetPageLoader.ts`: repository and chain aggregation with database fallback on chain failure.
- `src/features/assets/hooks/usePublicAssetList.ts`: request orchestration, request IDs, debounce support, refresh, pagination, and reducer dispatch.
- `src/features/assets/components/AssetCard.tsx`: stable-aspect-ratio mobile card without purchase actions.
- `src/features/assets/components/LaunchpadSummaryStrip.tsx`: lightweight horizontal metrics strip.
- `src/features/assets/components/PublicAssetList.tsx`: shared `FlatList` states and callbacks.
- `src/features/assets/screens/LaunchpadScreen.tsx`: title, metrics, sale filter, and public asset list.
- `src/features/assets/screens/MarketScreen.tsx`: title, debounced search, sort selector, completed-market filter, and public asset list.
- `src/features/assets/services/createRuntimePublicAssetLoader.ts`: production Supabase and viem wiring.
- `src/app/AppRoot.tsx`: construct the runtime loader once and pass it to navigation.
- `src/app/navigation/AppNavigator.tsx`: inject the loader and render Launchpad/Market screens.
- `test/mocks/react-native.tsx`: deterministic `FlatList`, `Image`, `ScrollView`, and activity-indicator test doubles.

## Task 1: Domain Contracts And Trusted Status Resolution

**Files:**
- Create: `src/features/assets/domain/assetModels.ts`
- Create: `src/features/assets/domain/assetDisplayStatus.ts`
- Test: `src/features/assets/__tests__/assetDisplayStatus.test.ts`

- [ ] **Step 1: Write failing status-resolution tests**

Cover sold out, ended, upcoming, active, paused, loading fallback, error fallback, missing contract, and the invariant that database fallback never sets `canTrustForPurchase`.

```ts
expect(resolveSaleDisplayState({
  dbStatus: "active",
  contractAddress: "0x1111111111111111111111111111111111111111",
  chainReadState: "error",
  nowSeconds: 1_000,
})).toEqual({
  displayStatus: "active",
  source: "database_fallback",
  chainStatus: "error",
  canTrustForPurchase: false,
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/assets/__tests__/assetDisplayStatus.test.ts`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement minimal domain types and resolver**

Define `AssetSaleFilter`, `AssetSort`, `AssetListStatus`, `AssetDatabaseRow`, `AssetChainReadState`, `PublicAssetSummary`, `AssetPageRequest`, `AssetPageResult`, and `PublicAssetPageLoader`. Implement the fixed priority policy from the Task 3 specification and treat the zero address as unsupported.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/features/assets/__tests__/assetDisplayStatus.test.ts`

Expected: all status-resolution tests pass.

- [ ] **Step 5: Commit**

Run: `git add src/features/assets/domain src/features/assets/__tests__/assetDisplayStatus.test.ts && git commit -m "feat: add trusted asset sale status model"`

## Task 2: Asset Mapping And Display Formatting

**Files:**
- Create: `src/features/assets/domain/assetMappers.ts`
- Test: `src/features/assets/__tests__/assetMappers.test.ts`

- [ ] **Step 1: Write failing mapper tests**

Use fixed timestamps and rows to prove title/artist fallback, first-image selection, price formatting, `0..100` progress clamping, bigint share formatting, missing-chain placeholders, and remaining-time text.

```ts
expect(toPublicAssetSummary(row, chain, 1_000)).toMatchObject({
  title: "Morning Mist",
  tokenCode: "ART-MIST",
  priceAmount: "0.1",
  priceText: "$0.1 USDT",
  progressPercent: 25,
  soldSharesText: "250",
  saleCapText: "1,000",
  availableSharesText: "750",
});
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/assets/__tests__/assetMappers.test.ts`

Expected: FAIL because `assetMappers.ts` is absent.

- [ ] **Step 3: Implement minimal mapper functions**

Keep database parsing and all UI strings in pure functions. Use bigint arithmetic for progress, `Intl.NumberFormat` for display-only grouping, and never use floating point for payment arithmetic.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/features/assets/__tests__/assetMappers.test.ts`

Expected: mapper tests pass.

- [ ] **Step 5: Commit**

Run: `git add src/features/assets/domain/assetMappers.ts src/features/assets/__tests__/assetMappers.test.ts && git commit -m "feat: map public asset display data"`

## Task 3: Read-Only Supabase Repository

**Files:**
- Create: `src/features/assets/services/assetRepository.ts`
- Test: `src/features/assets/__tests__/assetRepository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Inject a fake fluent client and verify `art_assets` selection, `is_deleted = false`, `created_at desc`, range pagination, completed mapping for Market, search escaping, sort mapping, normalized rows, and cursor generation.

```ts
const page = await createAssetRepository(fakeClient).fetchAssetPage({
  filter: "active",
  pageSize: 20,
});
expect(fakeClient.calls).toContainEqual(["eq", "is_deleted", false]);
expect(fakeClient.calls).toContainEqual(["range", 0, 20]);
expect(page.nextCursor).toBe("20");
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/assets/__tests__/assetRepository.test.ts`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the injected read-only repository**

Only call `select`, `eq`, `or`, `order`, and `range`. Request `pageSize + 1` rows to derive the next cursor, parse numeric cursor offsets internally, and throw a normalized error on Supabase failure. Do not add insert, update, upsert, delete, RPC, or service-role access.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/features/assets/__tests__/assetRepository.test.ts`

Expected: repository tests pass without network or environment variables.

- [ ] **Step 5: Commit**

Run: `git add src/features/assets/services/assetRepository.ts src/features/assets/__tests__/assetRepository.test.ts && git commit -m "feat: add public asset repository"`

## Task 4: Batched Viem Reads And Page Aggregation

**Files:**
- Create: `src/features/assets/services/assetContractReadAdapter.ts`
- Create: `src/features/assets/services/publicAssetPageLoader.ts`
- Create: `src/features/assets/services/createRuntimePublicAssetLoader.ts`
- Test: `src/features/assets/__tests__/assetContractReadAdapter.test.ts`
- Test: `src/features/assets/__tests__/publicAssetPageLoader.test.ts`

- [ ] **Step 1: Write failing chain-adapter tests**

Inject fake chain clients and verify five calls per valid contract, grouping by chain ID, zero-address defaults, per-contract failure isolation, and exact mapping of `saleActive`, `sold`, `SALE_CAP`, `saleStartTime`, and `saleEndTime`.

- [ ] **Step 2: Verify chain-adapter RED**

Run: `npm test -- src/features/assets/__tests__/assetContractReadAdapter.test.ts`

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement the minimal adapter**

Expose a client factory with a `multicall({ allowFailure: true, contracts })` contract. Group supported assets by `chainId`, call groups concurrently, and map each five-result slice to `ready` or `error`; unsupported assets receive `unsupported` without an RPC call.

- [ ] **Step 4: Verify chain-adapter GREEN**

Run: `npm test -- src/features/assets/__tests__/assetContractReadAdapter.test.ts`

Expected: adapter tests pass.

- [ ] **Step 5: Write failing aggregation tests**

Prove database failure rejects the page, chain failure preserves database rows, returned summaries use chain status when available, and `nextCursor`/`totalCount` pass through.

- [ ] **Step 6: Verify aggregation RED**

Run: `npm test -- src/features/assets/__tests__/publicAssetPageLoader.test.ts`

Expected: FAIL because the loader is missing.

- [ ] **Step 7: Implement aggregation and runtime wiring**

The loader first fetches one database page, then reads only that page's contracts, maps every row, and catches chain adapter rejection by assigning `error`/`unsupported` fallback states. Runtime wiring uses the existing public Supabase client and viem public clients for BSC 56 and BSC testnet 97.

- [ ] **Step 8: Verify GREEN**

Run: `npm test -- src/features/assets/__tests__/assetContractReadAdapter.test.ts src/features/assets/__tests__/publicAssetPageLoader.test.ts`

Expected: both suites pass.

- [ ] **Step 9: Commit**

Run: `git add src/features/assets/services src/features/assets/__tests__/assetContractReadAdapter.test.ts src/features/assets/__tests__/publicAssetPageLoader.test.ts && git commit -m "feat: aggregate public asset chain state"`

## Task 5: Reducer And Request Orchestration Hook

**Files:**
- Create: `src/features/assets/domain/assetListState.ts`
- Create: `src/features/assets/hooks/usePublicAssetList.ts`
- Test: `src/features/assets/__tests__/assetListState.test.ts`
- Test: `src/features/assets/__tests__/usePublicAssetList.test.tsx`

- [ ] **Step 1: Write failing reducer tests**

Cover initial success/empty/error, refresh preserving old items on failure, append-once pagination, refresh/load-more exclusion, query reset, stale request IDs, retry, and end-reached prevention.

```ts
const stale = assetListReducer(changedQueryState, {
  type: "request_succeeded",
  requestId: 1,
  mode: "replace",
  page,
});
expect(stale).toBe(changedQueryState);
```

- [ ] **Step 2: Verify reducer RED**

Run: `npm test -- src/features/assets/__tests__/assetListState.test.ts`

Expected: FAIL because the reducer is missing.

- [ ] **Step 3: Implement the pure reducer**

State stores items, status, filter, search, sort, next cursor, active request ID, and a non-destructive warning. Duplicate asset IDs are ignored on append.

- [ ] **Step 4: Verify reducer GREEN**

Run: `npm test -- src/features/assets/__tests__/assetListState.test.ts`

Expected: reducer tests pass.

- [ ] **Step 5: Write failing hook tests**

Use deferred fake loaders to verify mount loading, refresh, load-more guards, query resets, stale response rejection, and debounced Market search.

- [ ] **Step 6: Verify hook RED**

Run: `npm test -- src/features/assets/__tests__/usePublicAssetList.test.tsx`

Expected: FAIL because the hook is missing.

- [ ] **Step 7: Implement the hook**

Use `useReducer`, monotonic request IDs in refs, stable callbacks, and a cleanup-aware debounce timer. Do not add React Query or global high-frequency context state.

- [ ] **Step 8: Verify hook GREEN**

Run: `npm test -- src/features/assets/__tests__/assetListState.test.ts src/features/assets/__tests__/usePublicAssetList.test.tsx`

Expected: reducer and hook tests pass.

- [ ] **Step 9: Commit**

Run: `git add src/features/assets/domain/assetListState.ts src/features/assets/hooks src/features/assets/__tests__/assetListState.test.ts src/features/assets/__tests__/usePublicAssetList.test.tsx && git commit -m "feat: manage resilient public asset lists"`

## Task 6: Mobile Asset Components And Screens

**Files:**
- Modify: `test/mocks/react-native.tsx`
- Modify: `src/shared/ui/theme.ts`
- Create: `src/features/assets/components/AssetCard.tsx`
- Create: `src/features/assets/components/LaunchpadSummaryStrip.tsx`
- Create: `src/features/assets/components/PublicAssetList.tsx`
- Create: `src/features/assets/screens/LaunchpadScreen.tsx`
- Create: `src/features/assets/screens/MarketScreen.tsx`
- Test: `src/features/assets/__tests__/AssetCard.test.tsx`
- Test: `src/features/assets/__tests__/LaunchpadScreen.test.tsx`
- Test: `src/features/assets/__tests__/MarketScreen.test.tsx`

- [ ] **Step 1: Extend React Native mocks and write failing component tests**

Add transparent host-component mocks for `ActivityIndicator`, `FlatList`, `Image`, and `ScrollView`. Test fixed image aspect ratio/placeholder, labels, progress, no purchase control, asset press, metrics order, and muted completed-sales metric.

- [ ] **Step 2: Verify component RED**

Run: `npm test -- src/features/assets/__tests__/AssetCard.test.tsx`

Expected: FAIL because asset components are absent.

- [ ] **Step 3: Implement components**

Use stable dimensions, token colors including `champagne`, an asset-ID key extractor, and small status pills. `AssetCard` exposes only `onPress`; it must not import wallet, KYC, Supabase, viem, or write-contract APIs.

- [ ] **Step 4: Verify component GREEN**

Run: `npm test -- src/features/assets/__tests__/AssetCard.test.tsx`

Expected: component tests pass.

- [ ] **Step 5: Write failing screen tests**

Inject deterministic fake loaders. Verify Launchpad title, description, summary, four filters, list states, filter reset, retry, and asset-detail callback. Verify Market title, search input, sort options, debounce contract, completed filter, pagination, and empty/error states.

- [ ] **Step 6: Verify screen RED**

Run: `npm test -- src/features/assets/__tests__/LaunchpadScreen.test.tsx src/features/assets/__tests__/MarketScreen.test.tsx`

Expected: FAIL because screens are absent.

- [ ] **Step 7: Implement screens**

Both screens use `FlatList` through `PublicAssetList`. Launchpad supplies a header component with title, summary strip, and segmented status filter. Market supplies title, `TextInput`, and a compact sort selector. No nested card containers or full-screen spinner is allowed.

- [ ] **Step 8: Verify screen GREEN**

Run: `npm test -- src/features/assets/__tests__/AssetCard.test.tsx src/features/assets/__tests__/LaunchpadScreen.test.tsx src/features/assets/__tests__/MarketScreen.test.tsx`

Expected: all asset UI suites pass.

- [ ] **Step 9: Commit**

Run: `git add test/mocks/react-native.tsx src/shared/ui/theme.ts src/features/assets/components src/features/assets/screens src/features/assets/__tests__ && git commit -m "feat: add launchpad and market screens"`

## Task 7: App Integration And Navigation

**Files:**
- Modify: `src/app/AppRoot.tsx`
- Modify: `src/app/navigation/AppNavigator.tsx`
- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`

- [ ] **Step 1: Write failing navigation tests**

Pass a fake `PublicAssetPageLoader` into `AppNavigator`; verify logged-out Launchpad and Market render their real screen shells, tab changes preserve public access, and card presses render the existing Asset Detail placeholder without a purchase action.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx`

Expected: FAIL because `AppNavigator` does not accept the loader and still renders Task 3 placeholders.

- [ ] **Step 3: Implement thin integration**

`AppRoot` memoizes `createRuntimePublicAssetLoader()`. `AppNavigator` accepts `assetPageLoader`, passes it to `MainTabs`, and switches Launchpad/Market routes to the real screens. Keep existing authentication, referral, dashboard, and profile behavior unchanged.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx src/features/assets/__tests__/LaunchpadScreen.test.tsx src/features/assets/__tests__/MarketScreen.test.tsx`

Expected: navigation and screen suites pass.

- [ ] **Step 5: Commit**

Run: `git add src/app/AppRoot.tsx src/app/navigation/AppNavigator.tsx src/app/navigation/__tests__/AppNavigator.test.tsx && git commit -m "feat: integrate public asset tabs"`

## Task 8: Documentation, Risk Gates, And Verification

**Files:**
- Modify: `docs/plans/2026-07-02-rn-full-app-port-implementation.md`
- Create: `docs/ai-delivery/runs/2026-07-13-rn-full-app-port-task-03.md`

- [ ] **Step 1: Run focused and full verification**

Run:

```bash
npm test -- src/features/assets
npm test -- src/app/navigation
npm test
npm run typecheck
```

Expected: all test files pass and TypeScript exits 0.

- [ ] **Step 2: Run forbidden-pattern and performance scans**

Run:

```bash
rg "\.from\(|@supabase/supabase-js" src/features/assets/screens src/features/assets/components src/features/assets/hooks
rg "from ['\"]viem|writeContract|sendTransaction|approve|mint\(" src/features/assets
rg "key=\{.*index\}|ScrollView[^\n]*map" src/features/assets --type tsx
rg "service_role|EXPO_PUBLIC_.*SERVICE" src --type ts --type tsx
```

Expected: no forbidden matches; permitted Supabase and viem imports appear only in their service/runtime boundaries.

- [ ] **Step 3: Record deployment boundaries**

Document that Task 3 is read-only, chain failure degrades to untrusted display data, no database fallback may authorize purchase, and deployment must confirm `art_assets`/`artwork_submissions` Data API grants plus SELECT RLS for `anon`.

- [ ] **Step 4: Update the implementation ledger**

Change Task 3 to `done` only after all verification and reviews pass; mark Task 4 `in-progress` only when work actually begins. Do not advance the AI Delivery stage.

- [ ] **Step 5: Run AI Delivery gates**

Run:

```bash
npm run ai:audit -- rn-full-app-port
npm run ai:verify -- rn-full-app-port --write
npm run ai:ship -- rn-full-app-port
```

Expected: audit passes; verify writes evidence; ship reports any human deployment checks without auto-deploying.

- [ ] **Step 6: Review the complete diff**

Use the requesting-code-review workflow, inspect `git diff 2cbcde2...HEAD`, and resolve correctness, security, data, business-boundary, performance, and QA findings before the final commit.

- [ ] **Step 7: Commit delivery evidence**

Run: `git add docs && git commit -m "docs: record RN public asset delivery evidence"`

## Required Review Checklist

- Security: no service-role key, no client-side authorization claim, no wallet or transaction write path.
- Data: read-only query fields match the documented schema; `is_deleted = false`; Data API grant and RLS checks remain explicit deployment prerequisites.
- Contract: only five view functions; bigint values stay bigint until display mapping; chain failure never becomes purchase trust.
- Business boundary: no Asset Detail implementation, KYC, wallet balance, holdings, signature generation, realtime subscription, or purchase logic.
- Idempotency: request IDs discard stale responses; repeated pagination does not append duplicate asset IDs.
- Performance: page-scoped multicall, chain grouping, concurrent independent reads, `FlatList`, stable keys, stable callbacks, no global list context.
- QA: loading, empty, error, refresh, loading-more, end-reached, filter, search, sort, retry, and navigation paths are covered.

