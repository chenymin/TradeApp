# My Rewards Safe UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected, locally verifiable My Rewards screen backed by real profile, point-ledger, and referral data while keeping unsafe commission reads and unconfigured invite links disabled.

**Architecture:** A single `RewardsScreen` owns independent section state and renders one virtualized list whose header contains the summary, invite gate, tier benefits, and segmented control. Repositories and an access-token provider are injected through a `RewardsDataDependencies` contract; production construction stays in `createDefaultRewardsServices`, and navigation only selects the route and supplies verified viewer state.

**Tech Stack:** Expo 57, React Native 0.86, React 19, TypeScript 6, Supabase JS, Vitest, React Test Renderer, existing shared UI primitives.

---

## File Map

Create:

- `src/features/referral/domain/rewardPresentation.ts`: deterministic labels and display formatting for points, statuses, dates, and masked referral identities.
- `src/features/referral/components/PointsSummary.tsx`: total/tier header and four point balances.
- `src/features/referral/components/InviteSection.tsx`: KYC/config-aware invite state without constructing links.
- `src/features/referral/components/TierBenefitsSection.tsx`: known-tier benefit descriptions and unknown fallback.
- `src/features/referral/components/ReferralRecordRow.tsx`: one referral record.
- `src/features/referral/components/PointLedgerRow.tsx`: one point transaction.
- `src/features/referral/components/CommissionUnavailableState.tsx`: intentional security-review state.
- `src/features/referral/screens/RewardsScreen.tsx`: independent async state, refresh, segmented list, and invite opening.
- `src/features/referral/services/createDefaultRewardsServices.ts`: Supabase repositories, Edge Function endpoint, and current access-token provider.
- `src/features/referral/__tests__/rewardPresentation.test.ts`: pure formatter tests.
- `src/features/referral/__tests__/RewardsScreen.test.tsx`: screen behavior and partial-failure tests.

Modify:

- `src/app/config/publicConfig.ts`: parse optional validated `EXPO_PUBLIC_WEB_ORIGIN`.
- `src/app/config/__tests__/publicConfig.test.ts`: invalid and normalized public-origin coverage.
- `src/app/AppRoot.tsx`: construct and inject Rewards dependencies and configured origin.
- `src/app/navigation/AppNavigator.tsx`: render the protected Rewards route and open the existing invite sheet with real values.
- `src/app/navigation/__tests__/AppNavigator.test.tsx`: protected route and real invite dependency tests.
- `src/features/dashboard/screens/DashboardScreen.tsx`: remove the duplicate Points list tab while preserving summary data loading.
- `src/features/dashboard/__tests__/DashboardScreen.test.tsx`: assert only Holdings and Transactions remain.
- `docs/plans/rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md`: mark only completed Task 6B items and record the commission/public-origin gates.

## Task 1: Reward Presentation And Summary Components

**Files:**

- Create: `src/features/referral/domain/rewardPresentation.ts`
- Create: `src/features/referral/__tests__/rewardPresentation.test.ts`
- Create: `src/features/referral/components/PointsSummary.tsx`
- Create: `src/features/referral/components/TierBenefitsSection.tsx`
- Create: `src/features/referral/components/ReferralRecordRow.tsx`
- Create: `src/features/referral/components/PointLedgerRow.tsx`
- Create: `src/features/referral/components/CommissionUnavailableState.tsx`

- [ ] **Step 1: Write failing formatter tests**

Cover signed decimal formatting, integer point formatting, long referral identity fallback, known/unknown status labels, and invalid dates:

```ts
expect(formatRewardPoints(1250)).toBe("1,250");
expect(formatLedgerAmount("12.50")).toBe("+12.5");
expect(formatLedgerAmount("-3.25")).toBe("-3.25");
expect(referralDisplay({
  referredEmail: null,
  referredId: "user-123456789",
  referredWalletAddress: "0x1234567890abcdef",
})).toBe("0x1234...cdef");
expect(referralStatusLabel("unknown")).toBe("Status unavailable");
expect(formatRewardDate("not-a-date")).toBe("Date unavailable");
```

- [ ] **Step 2: Run the formatter test and confirm RED**

Run: `npm test -- src/features/referral/__tests__/rewardPresentation.test.ts`

Expected: FAIL because `rewardPresentation.ts` does not exist.

- [ ] **Step 3: Implement deterministic presentation helpers**

Export the exact functions used by the tests and rows:

```ts
export function formatRewardPoints(value: number): string;
export function formatLedgerAmount(value: string): string;
export function formatLedgerBalance(value: string): string;
export function formatRewardDate(value: string): string;
export function referralDisplay(value: Pick<ReferralRecord,
  "referredEmail" | "referredId" | "referredWalletAddress"
>): string;
export function referralStatusLabel(value: ReferralStatus): string;
export function pointTypeLabel(value: PointLedgerEntry["pointType"]): string;
export function userTypeLabel(value: RegistrationUserType | null): string;
```

Use `Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })` only for already-normalized display values. Do not use floats for commission or payout calculations.

- [ ] **Step 4: Implement focused rendering components**

`PointsSummary` accepts `{ profile: RewardsProfile }`, renders `Total points`, tier, and four stable balance cells. `TierBenefitsSection` calls `getTierBenefitKeys(profile.tier)` and maps keys through a local English catalog; an empty key list renders `Tier benefits are unavailable for this account.` Rows accept their domain value only and use `numberOfLines` for long secondary labels. `CommissionUnavailableState` renders `Commission data is temporarily unavailable` and `Access controls are under security review.` with no callback and no repository dependency.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- src/features/referral/__tests__/rewardPresentation.test.ts && npm run typecheck`

Expected: PASS and exit 0.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/features/referral/domain/rewardPresentation.ts \
  src/features/referral/components \
  src/features/referral/__tests__/rewardPresentation.test.ts
git commit -m "feat: add rewards presentation components"
```

## Task 2: Rewards Screen With Independent Data States

**Files:**

- Create: `src/features/referral/screens/RewardsScreen.tsx`
- Create: `src/features/referral/__tests__/RewardsScreen.test.tsx`
- Modify: `src/features/referral/components/InviteSection.tsx`

- [ ] **Step 1: Write the failing authenticated-screen test**

Create fake dependencies matching this contract:

```ts
export type RewardsViewerState = {
  isSessionReady: boolean;
  viewer: AuthViewer | null;
};

export type RewardsDataDependencies = {
  fetchAccessToken(): Promise<string | null>;
  kycLoader(state: DashboardViewerState): Promise<DashboardKycSummary | null>;
  pointLedgerRepository: PointLedgerRepository;
  referralRecordsClient: ReferralRecordsClient;
  rewardsProfileRepository: RewardsProfileRepository;
};
```

Mount `RewardsScreen` with an authenticated viewer and resolved fakes. Assert it renders total points plus all four balances, defaults to referral records, changes to point ledger through `Rewards tab Points`, and changes to the non-fetching commission state through `Rewards tab Commission`.

- [ ] **Step 2: Run the screen test and confirm RED**

Run: `npm test -- src/features/referral/__tests__/RewardsScreen.test.tsx`

Expected: FAIL because `RewardsScreen` and `InviteSection` do not exist.

- [ ] **Step 3: Implement independent request state**

Use an explicit section state so failures cannot overwrite successful results:

```ts
type AsyncState<T> =
  | { status: "idle" | "loading" }
  | { data: T; status: "ready" }
  | { error: "auth" | "permission" | "unavailable"; status: "error" };

type RewardsTab = "referrals" | "points" | "commission";
```

On load, verify the session and viewer, then call profile, KYC, points, and token/referral work through `Promise.allSettled`. If the access token is missing, set only referrals to `auth` error. Map `ReferralRecordsError` codes without printing its payload or token. Ignore stale completions after unmount with an effect-local `cancelled` flag.

- [ ] **Step 4: Render one virtualized list**

Use a single `FlatList<RewardsListRow>` with stable keys (`referral:${id}` / `point:${id}`). Put `PointsSummary`, `InviteSection`, `TierBenefitsSection`, and `SegmentedControl` in `ListHeaderComponent`. The commission tab supplies no list rows and renders `CommissionUnavailableState` as the empty component. Set `keyboardDismissMode="on-drag"`, `refreshing`, and `onRefresh` without nesting another virtualized list.

- [ ] **Step 5: Add partial failure, empty, retry, and gate tests**

Tests must prove:

```ts
expect(profileFailureTree).toContain("Rewards summary unavailable");
expect(profileFailureTree).toContain("friend@example.com");
expect(referralFailureTree).toContain("Referral records unavailable");
expect(referralFailureTree).toContain("Purchase reward");
expect(commissionCalls).toBe(0);
expect(unapprovedTree).toContain("Complete KYC to unlock invitations");
expect(missingOriginTree).toContain("Invite sharing is not configured");
```

Trigger `Retry referral records` and assert only token/referral dependencies are called again. Empty states may appear only after successful empty arrays.

- [ ] **Step 6: Run the full referral test directory**

Run: `npm test -- src/features/referral`

Expected: all referral tests PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/features/referral/screens/RewardsScreen.tsx \
  src/features/referral/components/InviteSection.tsx \
  src/features/referral/__tests__/RewardsScreen.test.tsx
git commit -m "feat: add safe my rewards screen"
```

## Task 3: Production Services And Public Origin Configuration

**Files:**

- Create: `src/features/referral/services/createDefaultRewardsServices.ts`
- Modify: `src/app/config/publicConfig.ts`
- Modify: `src/app/config/__tests__/publicConfig.test.ts`
- Modify: `src/app/AppRoot.tsx`

- [ ] **Step 1: Write failing public-origin config tests**

Add three cases:

```ts
expect(configFrom("https://test.artstarex.com/").publicWebOrigin)
  .toBe("https://test.artstarex.com");
expect(configFrom("http://localhost:5173").publicWebOrigin).toBeUndefined();
expect(configFrom("not a url").publicWebOrigin).toBeUndefined();
```

The optional value must never make otherwise-valid app configuration fatal.

- [ ] **Step 2: Run config tests and confirm RED**

Run: `npm test -- src/app/config/__tests__/publicConfig.test.ts`

Expected: FAIL because `publicWebOrigin` is not part of `PublicConfig`.

- [ ] **Step 3: Parse only a secure public origin**

Add `EXPO_PUBLIC_WEB_ORIGIN` to `PublicConfigEnv` and `publicWebOrigin?: string` to `PublicConfig`. Normalize with `new URL`, require `https:`, require pathname `/`, and return `url.origin`; reject credentials, query, and hash. Do not add it to `REQUIRED_PUBLIC_KEYS`.

- [ ] **Step 4: Construct default Rewards services**

Export:

```ts
export function createDefaultRewardsServices(): RewardsDataDependencies {
  return {
    fetchAccessToken: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session?.access_token ?? null;
    },
    kycLoader: createDefaultDashboardKycLoader(),
    pointLedgerRepository: createPointLedgerRepository(supabase),
    referralRecordsClient: createReferralRecordsClient({
      endpoint: new URL("/functions/v1/get-my-referrals", requiredSupabaseUrl()).toString(),
      fetch: globalThis.fetch,
    }),
    rewardsProfileRepository: createRewardsProfileRepository(supabase),
  };
}
```

`requiredSupabaseUrl` reads `EXPO_PUBLIC_SUPABASE_URL`, trims it, and throws a configuration error without including secret values.

- [ ] **Step 5: Inject services from AppRoot**

Construct Rewards dependencies once with `useMemo`. Pass `rewardsDependencies` and the optional `publicWebOrigin` to `AppNavigator`; do not put the access token in React state or context.

- [ ] **Step 6: Run config tests and typecheck**

Run: `npm test -- src/app/config/__tests__/publicConfig.test.ts src/features/referral && npm run typecheck`

Expected: PASS and exit 0.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/features/referral/services/createDefaultRewardsServices.ts \
  src/app/config/publicConfig.ts \
  src/app/config/__tests__/publicConfig.test.ts \
  src/app/AppRoot.tsx
git commit -m "feat: wire rewards data services"
```

## Task 4: Protected Navigation And Dashboard De-duplication

**Files:**

- Modify: `src/app/navigation/AppNavigator.tsx`
- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`
- Modify: `src/features/dashboard/screens/DashboardScreen.tsx`
- Modify: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Write failing navigation tests**

Mount authenticated `AppNavigator` with `initialRouteName="referral"`, fake Rewards dependencies, and assert `My Rewards` plus a real profile value render instead of `RoutePlaceholder`. Mount logged-out state with the same initial route and assert private rewards data is not requested.

Add an invite test that passes `publicWebOrigin="https://test.artstarex.com"`, approved KYC, and invite code `REAL-CODE`, presses `Open invite options`, and asserts the sheet contains `REAL-CODE` and never contains `DEMO-CODE` or `app.mytrade.local`.

- [ ] **Step 2: Write the failing Dashboard de-duplication test**

Assert the Dashboard segmented control contains exactly `Holdings` and `Transactions`, and that `Points` does not render as a tab. Keep the points loader expectation because `DashboardSummary` still displays total points from profile data and current summary behavior must not regress.

- [ ] **Step 3: Run tests and confirm RED**

Run: `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx src/features/dashboard/__tests__/DashboardScreen.test.tsx`

Expected: FAIL because the referral route is still a placeholder and Dashboard still exposes Points.

- [ ] **Step 4: Wire the protected Rewards route**

Add `rewardsDependencies` and `publicWebOrigin` props through `AppNavigator` and `MainTabs`. In `renderRoute`, return `RewardsScreen` when `routeName === "referral"`. The screen's `onOpenInvite` callback stores `{ inviteCode, webOrigin }` in overlay state; render `InviteFriendSheet` only from those real values. Remove both hard-coded placeholder strings.

From the Profile menu, make `邀请好友` navigate to `referral` rather than directly opening a demo sheet. Keep logged-out protected-route behavior unchanged.

- [ ] **Step 5: Remove the Dashboard Points list tab**

Change `DashboardTab` to `"holdings" | "transactions"`, remove the point row variant and Points option, and remove point-row rendering. Keep `pointsLoader` temporarily only if `DashboardSummary` still consumes the result; otherwise remove it from `DashboardDataDependencies`, default services, and tests in the same change. Do not duplicate the recent ledger on Dashboard.

- [ ] **Step 6: Run navigation, Dashboard, and referral tests**

Run: `npm test -- src/app/navigation src/features/dashboard src/features/referral`

Expected: all selected tests PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/app/navigation/AppNavigator.tsx \
  src/app/navigation/__tests__/AppNavigator.test.tsx \
  src/features/dashboard/screens/DashboardScreen.tsx \
  src/features/dashboard/__tests__/DashboardScreen.test.tsx
git commit -m "feat: expose protected my rewards route"
```

## Task 5: Delivery Evidence And Verifiable Runtime

**Files:**

- Modify: `docs/plans/rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md`
- Create: `docs/ai-delivery/runs/2026-07-15-task-06b-rewards-ui-verification.md`

- [ ] **Step 1: Run complete machine verification**

Run:

```bash
npm test
npm run typecheck
node scripts/verify-no-match.mjs \
  -e "functions/v1" \
  -e "navigator\\." \
  -e "window\\." \
  -e "Linking\\.open" \
  src/features/referral --glob "*.tsx"
node scripts/verify-no-match.mjs \
  -e "console\\..*token" \
  -e "VITE_.*SERVICE.*KEY" \
  -e "service_role" \
  src --glob "*.ts" --glob "*.tsx"
npm run ai:audit -- rn-full-app-port
```

Expected: all commands exit 0. Any pre-existing forbidden-pattern match must be recorded with its exact existing path and must not be introduced by Task 6B.

- [ ] **Step 2: Start Expo Web for visual verification**

Run: `npm run web -- --port 8082`

Expected: Expo prints a local URL and remains running. Use a different port if 8082 is occupied.

- [ ] **Step 3: Verify mobile layouts and states**

At a 390x844 viewport verify authenticated fixtures or a real test account for: loaded data, empty referrals, long email/source text, partial referral error, unknown tier, commission unavailable state, pull-to-refresh, and invite disabled without `EXPO_PUBLIC_WEB_ORIGIN`. Confirm there is no horizontal overflow or overlapping text.

- [ ] **Step 4: Update Task 6B status and evidence**

Mark completed only for tests and UI behavior actually verified. Keep commission-summary/detail and payout items unchecked. Record commands, results, runtime URL, residual commission RLS blocker, and the owner/next action for the public Web origin in the evidence file. Do not record tokens or business row values.

- [ ] **Step 5: Re-run AI Delivery audit after documentation edits**

Run: `npm run ai:audit -- rn-full-app-port`

Expected: `AI delivery audit 通过`.

- [ ] **Step 6: Commit verification artifacts**

```bash
git add docs/plans/rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md \
  docs/ai-delivery/runs/2026-07-15-task-06b-rewards-ui-verification.md
git commit -m "docs: record rewards ui verification"
```

## Required Review Checklist

- Security: no token logging, no commission read, no payout action, and no user id parameter in the referral client.
- Data/RLS: profile and points are scoped to verified viewer id; referral identity comes from JWT; remote commission blocker remains documented.
- Business boundary: KYC is only an invite UX gate; tier benefits are explanatory; no client-side qualification decision is trusted.
- Performance: one `FlatList`, stable ids, no nested virtualized list, no realtime or polling, bounded point history.
- QA: partial failure, empty data, long content, small viewport, refresh, protected routing, and disabled invite behavior.
- Release: change is read-only, can be rolled back by removing the route wiring, and does not require a database migration.
