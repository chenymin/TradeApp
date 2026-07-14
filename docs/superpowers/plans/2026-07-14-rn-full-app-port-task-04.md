# RN Full App Port Task 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the asset-detail placeholder with a read-only React Native detail experience backed by Supabase and BSC public reads, without adding any purchase or chain-write path.

**Architecture:** Deterministic domain functions own detail formatting and CTA trust rules. Injected repositories and a viem adapter read the primary asset, optional valuation, optional mint events, and contract state; an aggregate loader turns those boundaries into one read model with partial-failure warnings. The screen only renders the read model, tabs, retry states, and platform-link commands. Navigation carries the selected list summary as placeholder data plus the originating tab, while viewer fields absent from the trusted auth boundary remain explicitly `unknown`.

**Tech Stack:** React Native 0.86, React 19, TypeScript, Vitest, Supabase JS, viem, Expo Linking.

---

## File Map

- `src/features/assets/domain/assetDetailModels.ts`: database, valuation, event, contract, loader, and display contracts.
- `src/features/assets/domain/assetDetailActionState.ts`: trusted bottom-action state resolver and display metadata.
- `src/features/assets/domain/assetDetailMappers.ts`: pure detail read-model formatting and URL/address guards.
- `src/features/assets/services/assetDetailRepository.ts`: read-only `art_assets` + `artwork_submissions` query.
- `src/features/assets/services/assetValuationRepository.ts`: latest non-deleted valuation report query.
- `src/features/assets/services/mintEventsRepository.ts`: latest 20 asset mint events query with RLS-safe fallback.
- `src/features/assets/services/assetDetailContractReadAdapter.ts`: all detail viem public reads grouped behind one adapter.
- `src/features/assets/services/publicAssetDetailLoader.ts`: primary/optional read orchestration and partial-failure warnings.
- `src/features/assets/services/createDefaultPublicAssetDetailLoader.ts`: Supabase + BSC 56/97 runtime wiring.
- `src/features/assets/services/createRuntimePublicAssetDetailLoader.ts`: injectable runtime composition used by tests and the default factory.
- `src/features/assets/hooks/usePublicAssetDetail.ts`: request, retry, refresh, and stale-response orchestration.
- `src/features/assets/components/AssetHero.tsx`: stable image, status, title, price, progress, and key facts.
- `src/features/assets/components/AssetDetailTabs.tsx`: four-view segmented control.
- `src/features/assets/components/AssetOverviewSection.tsx`: description and artwork metadata.
- `src/features/assets/components/AssetValuationSection.tsx`: report, analysis, disclaimer, and safe report link command.
- `src/features/assets/components/AssetRulesSection.tsx`: issuance, whitelist, and post-sale rights.
- `src/features/assets/components/AssetOnchainSection.tsx`: contract details, warnings, and event timeline.
- `src/features/assets/components/AssetBottomAction.tsx`: fixed read-only CTA surface.
- `src/features/assets/screens/AssetDetailScreen.tsx`: async state + section composition only.
- `src/shared/platform/linkingAdapter.ts`: injected HTTP(S)-only external-link boundary.
- `src/app/AppRoot.tsx`: construct page and detail loaders once.
- `src/app/navigation/components/AppHeader.tsx`: optional detail back action.
- `src/app/navigation/components/AppShell.tsx`: optional detail back action and detail-mode tab suppression.
- `src/app/navigation/AppNavigator.tsx`: carry `{ assetId, placeholder, returnTo }`, render detail screen, and return to the originating list tab.

### Task 1: Trusted Detail Action State

**Files:**
- Create: `src/features/assets/domain/assetDetailModels.ts`
- Create: `src/features/assets/domain/assetDetailActionState.ts`
- Test: `src/features/assets/__tests__/assetDetailActionState.test.ts`

- [ ] **Step 1: Write failing action-state tests**

Cover unauthenticated, KYC required, unknown KYC/whitelist, loading/error/unsupported chain state, upcoming, ineligible, sold out, completed, trusted active sale, and the invariant that database fallback never enables Subscribe. `canTrustForPurchase` means the sale resolution came from a successful chain read; `displayStatus === "active"` remains a separate requirement for the open-sale action.

```ts
expect(resolveAssetDetailActionState({
  isLoggedIn: true,
  kycApproved: true,
  sale: {
    canTrustForPurchase: false,
    chainStatus: "error",
    displayStatus: "active",
    source: "database_fallback",
  },
  soldPercent: 20,
  whitelisted: true,
})).toBe("sale_status_unavailable");
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/assets/__tests__/assetDetailActionState.test.ts`

Expected: FAIL because the detail domain modules do not exist.

- [ ] **Step 3: Implement minimal types and resolver**

Define `AssetDetailActionState`, `AssetDetailTab`, `AssetEligibilitySummary`, repository rows, contract state, `AssetDetailReadModel`, `AssetDetailLoadResult`, and loader contracts. Model KYC and whitelist as `boolean | "unknown"`; unknown eligibility stays disabled and uses neutral unavailable copy rather than claiming a failed KYC decision. Implement priority in this order: untrusted chain state, sold out/completed, not logged in, known KYC failure, unknown eligibility, known whitelist failure, upcoming, trusted active, read-only fallback.

```ts
export function resolveAssetDetailActionState(input: ActionInput): AssetDetailActionState {
  if (input.sale.chainStatus === "loading") return "verifying_sale_status";
  if (!input.sale.canTrustForPurchase) return "sale_status_unavailable";
  if (input.soldPercent >= 100) return "sold_out";
  if (input.sale.displayStatus === "completed") return "sale_closed";
  if (!input.isLoggedIn) return "connect_required";
  if (!input.kycApproved) return "kyc_required";
  if (input.whitelisted !== true) return "not_eligible";
  if (input.sale.displayStatus === "upcoming") return "not_started";
  return input.sale.displayStatus === "active" ? "sale_open" : "read_only";
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/features/assets/__tests__/assetDetailActionState.test.ts`

Expected: all action-state cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/assets/domain/assetDetailModels.ts src/features/assets/domain/assetDetailActionState.ts src/features/assets/__tests__/assetDetailActionState.test.ts
git commit -m "feat: add trusted asset detail action state"
```

### Task 2: Read-Only Detail Repositories

**Files:**
- Create: `src/features/assets/services/assetDetailRepository.ts`
- Create: `src/features/assets/services/assetValuationRepository.ts`
- Create: `src/features/assets/services/mintEventsRepository.ts`
- Test: `src/features/assets/__tests__/assetDetailRepository.test.ts`
- Test: `src/features/assets/__tests__/assetValuationRepository.test.ts`
- Test: `src/features/assets/__tests__/mintEventsRepository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Use fake fluent builders to prove:

- primary query selects `art_assets` plus description/dimensions/year/material/provenance and filters `id` + `is_deleted=false`;
- valuation query filters `asset_id` + `is_deleted=false`, orders `created_at desc`, and limits to one;
- event query filters `asset_id` + `is_deleted=false`, orders `block_timestamp desc`, and limits to 20;
- primary errors reject; missing valuation returns `null`; mint-event RLS errors return an empty optional result with a warning.

```ts
const detail = await createAssetDetailRepository(fake.client).fetchAssetDetail("asset-1");
expect(fake.calls).toContainEqual(["eq", "id", "asset-1"]);
expect(fake.calls).toContainEqual(["eq", "is_deleted", false]);
expect(detail.id).toBe("asset-1");
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/assets/__tests__/assetDetailRepository.test.ts src/features/assets/__tests__/assetValuationRepository.test.ts src/features/assets/__tests__/mintEventsRepository.test.ts`

Expected: FAIL because repository modules do not exist.

- [ ] **Step 3: Implement the three injected repositories**

Only expose read operations (`select`, `eq`, `order`, `limit`, `maybeSingle`). Normalize Supabase numeric fields from `number | string | null` without floating-point payment arithmetic. Do not import the runtime Supabase singleton into the repository modules.

- [ ] **Step 4: Verify GREEN**

Run the three repository test files from Step 2.

Expected: all repository tests pass with no network or environment variables.

- [ ] **Step 5: Commit**

```bash
git add src/features/assets/services/assetDetailRepository.ts src/features/assets/services/assetValuationRepository.ts src/features/assets/services/mintEventsRepository.ts src/features/assets/__tests__/assetDetailRepository.test.ts src/features/assets/__tests__/assetValuationRepository.test.ts src/features/assets/__tests__/mintEventsRepository.test.ts
git commit -m "feat: add read-only asset detail repositories"
```

### Task 3: Detail Contract Reads And Pure Mapping

**Files:**
- Create: `src/features/assets/services/assetDetailContractReadAdapter.ts`
- Create: `src/features/assets/domain/assetDetailMappers.ts`
- Test: `src/features/assets/__tests__/assetDetailContractReadAdapter.test.ts`
- Test: `src/features/assets/__tests__/assetDetailMappers.test.ts`

- [ ] **Step 1: Write failing contract-adapter tests**

Inject a fake `multicall` client and verify public calls for sale active, price, min purchase fallback, sold, cap, reserved amount, raised USDT, start, and end. Add authenticated-wallet cases for token balance and injected USDT client reads. Missing/zero address returns `unsupported`; RPC rejection returns `error`; chain 56 and 97 are accepted. The adapter reads using the asset's chain ID, never the connected wallet chain.

```ts
const state = await adapter.readDetailState({
  chainId: 97,
  contractAddress: "0x1111111111111111111111111111111111111111",
  walletAddress: null,
});
expect(state.status).toBe("ready");
expect(client.multicall).toHaveBeenCalledOnce();
```

- [ ] **Step 2: Verify adapter RED**

Run: `npm test -- src/features/assets/__tests__/assetDetailContractReadAdapter.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the read-only adapter**

Keep ABI definitions and viem-shaped calls in the service. Use `allowFailure: true`, require all mandatory public results for `ready`, prefer `MIN_PURCHASE_USDT()` over the legacy getter when available, and never expose `writeContract`, `approve`, `mint`, or receipt APIs.

- [ ] **Step 4: Write failing mapper tests**

Cover missing image/report/events, chain fallback, sold progress clamp, USDT decimal formatting, 18-decimal shares, short addresses/hashes, safe explorer/report URLs, eligibility copy, and the exact action state passed from Task 1.

```ts
expect(toAssetDetailReadModel(input)).toMatchObject({
  contractAddressShort: "0x1111...1111",
  fundedAmountText: "$2,500 USDT",
  progressPercent: 25,
  saleCapText: "1,000",
});
```

- [ ] **Step 5: Implement mapper functions**

Reuse `resolveSaleDisplayState` from Task 3. Keep all BigInt and decimal formatting here. Build BscScan URLs only for supported chains, reject non-HTTP(S) report URLs, and map unavailable optional data to explicit empty states.

- [ ] **Step 6: Verify GREEN**

Run: `npm test -- src/features/assets/__tests__/assetDetailContractReadAdapter.test.ts src/features/assets/__tests__/assetDetailMappers.test.ts`

Expected: both suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/assets/services/assetDetailContractReadAdapter.ts src/features/assets/domain/assetDetailMappers.ts src/features/assets/__tests__/assetDetailContractReadAdapter.test.ts src/features/assets/__tests__/assetDetailMappers.test.ts
git commit -m "feat: map trusted asset detail reads"
```

### Task 4: Aggregate Loader And Request Hook

**Files:**
- Create: `src/features/assets/services/publicAssetDetailLoader.ts`
- Create: `src/features/assets/services/createDefaultPublicAssetDetailLoader.ts`
- Create: `src/features/assets/hooks/usePublicAssetDetail.ts`
- Test: `src/features/assets/__tests__/publicAssetDetailLoader.test.ts`
- Test: `src/features/assets/__tests__/usePublicAssetDetail.test.tsx`

- [ ] **Step 1: Write failing aggregation tests**

Prove primary detail failure rejects, optional valuation/event failures become warnings, chain failure preserves database content with an untrusted CTA, auth/KYC inputs reach the mapper, and refresh re-reads every boundary.

- [ ] **Step 2: Verify aggregation RED**

Run: `npm test -- src/features/assets/__tests__/publicAssetDetailLoader.test.ts`

Expected: FAIL because the loader does not exist.

- [ ] **Step 3: Implement the aggregate loader**

Fetch the primary row first. Then read valuation, events, and contract state concurrently with independent fallback handling. Return `{ detail, warnings }`; only the primary repository error rejects.

- [ ] **Step 4: Write failing hook tests**

Test initial loading, ready, primary error/retry, refresh preserving content, stale asset-id response suppression, and unmount suppression.

- [ ] **Step 5: Implement the hook**

Use request IDs and reducer-style state. Expose `refresh()` and `retry()`; do not add polling or realtime subscriptions.

- [ ] **Step 6: Add runtime wiring and verify GREEN**

The injectable runtime factory receives the public Supabase client and a shared cached viem-client/contract registry for BSC 56/97; the default factory supplies production bindings. Do not duplicate the private chain cache from the list loader or hardcode an unverified USDT address. If the address registry is unavailable, wallet balance/allowance preview remains explicitly unavailable while mandatory asset-contract reads continue. Run both tests from this task plus `npm run typecheck`.

- [ ] **Step 7: Commit**

```bash
git add src/features/assets/services/publicAssetDetailLoader.ts src/features/assets/services/createRuntimePublicAssetDetailLoader.ts src/features/assets/services/createDefaultPublicAssetDetailLoader.ts src/features/assets/hooks/usePublicAssetDetail.ts src/features/assets/__tests__/publicAssetDetailLoader.test.ts src/features/assets/__tests__/usePublicAssetDetail.test.tsx
git commit -m "feat: load public asset detail read model"
```

### Task 5: Detail Sections And Safe Linking

**Files:**
- Create: `src/shared/platform/linkingAdapter.ts`
- Create: `src/features/assets/components/AssetHero.tsx`
- Create: `src/features/assets/components/AssetDetailTabs.tsx`
- Create: `src/features/assets/components/AssetOverviewSection.tsx`
- Create: `src/features/assets/components/AssetValuationSection.tsx`
- Create: `src/features/assets/components/AssetRulesSection.tsx`
- Create: `src/features/assets/components/AssetOnchainSection.tsx`
- Create: `src/features/assets/components/AssetBottomAction.tsx`
- Create: `src/features/assets/screens/AssetDetailScreen.tsx`
- Test: `src/features/assets/__tests__/AssetDetailScreen.test.tsx`
- Test: `src/shared/platform/__tests__/linkingAdapter.test.ts`

- [ ] **Step 1: Write failing safe-link tests**

Allow only `https:` and `http:` URLs, require `canOpenURL`, and surface a deterministic failure without sending unsupported schemes to Expo Linking.

- [ ] **Step 2: Write failing screen tests**

Render a deterministic detail model and verify hero, four tabs, tab switching without reload, valuation empty/report states, disclaimer, issuance rules, on-chain empty/timeline states, warning banners, fixed bottom CTA labels, and disabled Subscribe placeholder behavior.

- [ ] **Step 3: Verify RED**

Run: `npm test -- src/shared/platform/__tests__/linkingAdapter.test.ts src/features/assets/__tests__/AssetDetailScreen.test.tsx`

Expected: FAIL because the adapter and screen do not exist.

- [ ] **Step 4: Implement the adapter and focused components**

Use existing `AppText`, `SegmentedControl`, colors, spacing, and 8px-or-less card radii. Keep a stable image aspect ratio, bottom padding equal to the fixed action height plus safe area, accessibility labels for tabs/links/actions, and no nested cards.

- [ ] **Step 5: Verify GREEN**

Run the tests from Step 3 and `npm test -- src/features/assets`.

Expected: all section and screen tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/platform/linkingAdapter.ts src/shared/platform/__tests__/linkingAdapter.test.ts src/features/assets/components src/features/assets/screens/AssetDetailScreen.tsx src/features/assets/__tests__/AssetDetailScreen.test.tsx
git commit -m "feat: add read-only asset detail screen"
```

### Task 6: Navigation And Runtime Integration

**Files:**
- Modify: `src/app/AppRoot.tsx`
- Modify: `src/app/navigation/AppNavigator.tsx`
- Modify: `src/app/navigation/components/AppHeader.tsx`
- Modify: `src/app/navigation/components/AppShell.tsx`
- Modify: `src/features/assets/components/AssetCard.tsx`
- Modify: `src/features/assets/components/PublicAssetList.tsx`
- Modify: `src/features/assets/screens/LaunchpadScreen.tsx`
- Modify: `src/features/assets/screens/MarketScreen.tsx`
- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`

- [ ] **Step 1: Replace the placeholder assertion with a failing real-detail test**

Inject a fake detail loader and link adapter, open a Launchpad card, verify the loader receives the asset id plus `PublicAssetSummary` placeholder, verify the real detail title and hidden bottom tabs, trigger Back, and verify return to the originating tab. Repeat entry from Market. Verify logged-in runtime requests retain KYC/whitelist as `unknown` rather than inferring approval.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx`

Expected: FAIL because navigation still renders `RoutePlaceholder`.

- [ ] **Step 3: Wire the detail screen**

Construct the detail loader once in `AppRoot` and inject it through `AppNavigator`. Pass the selected summary through the card/list/screen callbacks and retain `{ assetId, placeholder, returnTo }` as the in-memory detail route. Render `AssetDetailScreen`, expose a back callback through `AppShell`/`AppHeader`, and suppress bottom tabs while detail is open so they cannot collide with the fixed CTA. Do not add a navigation library, deep-link route params, or URL router in this task.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/app/navigation src/features/assets src/shared/platform`

Expected: all integration tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/AppRoot.tsx src/app/navigation src/features/assets/components/AssetCard.tsx src/features/assets/components/PublicAssetList.tsx src/features/assets/screens/LaunchpadScreen.tsx src/features/assets/screens/MarketScreen.tsx
git commit -m "feat: navigate to public asset details"
```

### Task 7: Delivery Gates And Task Ledger

**Files:**
- Modify: `docs/plans/2026-07-02-rn-full-app-port-implementation.md`
- Modify: `docs/plans/rn-full-app-port/tasks/2026-07-03-task-04-asset-detail-readonly-layout.md`
- Create or update: `docs/ai-delivery/runs/2026-07-14-rn-full-app-port-verification.md`

- [ ] **Step 1: Run complete verification**

```bash
npm test -- src/features/assets src/shared/platform src/app/navigation
npm test
npm run typecheck
npm run ai:audit -- rn-full-app-port
```

Expected: all tests, typecheck, and audit pass.

- [ ] **Step 2: Run forbidden scans**

```bash
node scripts/verify-no-match.mjs -e "generate-signature" -e "writeContract" -e "approve" -e "mint" src/features/assets --glob "*.tsx"
node scripts/verify-no-match.mjs -e "generate-signature" -e "writeContract" -e "approve" -e "mint" src/features/assets --glob "*.ts"
node scripts/verify-no-match.mjs -e "window\\." -e "document\\." -e "navigator\\." src/features/assets --glob "*.ts" --glob "*.tsx"
```

Expected: no matches.

- [ ] **Step 3: Verify in iOS simulator**

Open a real asset from Launchpad, inspect all tabs, confirm no overlap with the fixed CTA, exercise safe external links, confirm contract/valuation/event partial failures remain local, and capture accessibility state plus screenshots.

- [ ] **Step 4: Update implementation status**

Record completed files, test counts, simulator evidence, residual Android QA, Privy initialization timeout as a separate issue, and rollback boundaries. Call `npm run ai:audit -- rn-full-app-port` after editing plan documents.

- [ ] **Step 5: Write AI Delivery evidence**

Run: `npm run ai:verify -- rn-full-app-port --write`

Expected: all configured gates pass and the run artifact is updated.

- [ ] **Step 6: Commit**

```bash
git add docs/plans docs/ai-delivery/runs
git commit -m "docs: record asset detail delivery evidence"
```
