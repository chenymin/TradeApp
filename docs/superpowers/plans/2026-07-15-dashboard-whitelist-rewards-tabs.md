# Dashboard Whitelist And Rewards Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct Dashboard to use `Holdings / Transactions / Whitelist / Rewards` sibling tabs, add the mobile-first read-only Whitelist view, embed My Rewards, and restore Profile Invite Friends as a direct authenticated command.

**Architecture:** `DashboardScreen` remains the owner of common profile, portfolio, nickname, and KYC-summary state, while exactly one active body owns the only vertical `FlatList`. Whitelist fetches approved identity details through a JWT-only Edge Function client and keeps them only in component memory; Rewards reuses its existing services but accepts the shared Dashboard header. Profile invite generation uses a pure workflow that independently loads the existing Rewards profile and KYC summary, then either opens the real invite sheet or routes to the relevant recovery state.

**Tech Stack:** React Native 0.86, React 19, TypeScript 6, Expo 57, Supabase JS, Vitest 4, React Test Renderer, Lucide React Native, AI Delivery Kit

---

## File Map

**Create**

- `src/features/dashboard/domain/kycIdentityDetails.ts` - identity read model, document masking, and deterministic date display.
- `src/features/dashboard/services/kycIdentityDetailsClient.ts` - authenticated `kyc-applicant-details` Edge Function client with response validation and typed errors.
- `src/features/dashboard/components/DashboardHeader.tsx` - common profile, portfolio, nickname, refresh, and four-tab header.
- `src/features/dashboard/screens/WhitelistScreen.tsx` - one-list, mobile-first Whitelist body with approved-only identity loading.
- `src/features/referral/workflow/inviteFriendCommand.ts` - direct Profile invite prerequisite workflow and explicit gate results.
- `src/features/dashboard/__tests__/kycIdentityDetails.test.ts` - masking and invalid-date tests.
- `src/features/dashboard/__tests__/kycIdentityDetailsClient.test.ts` - JWT-only request and response/error mapping tests.
- `src/features/dashboard/__tests__/WhitelistScreen.test.tsx` - status, approved-only identity, retry, unmount, and list-architecture tests.
- `src/features/referral/__tests__/inviteFriendCommand.test.ts` - session, KYC, profile, origin, and repository gate tests.

**Modify**

- `src/features/dashboard/screens/DashboardScreen.tsx` - four-tab orchestration and one active virtualized list.
- `src/features/dashboard/services/dashboardHoldingsLoader.ts` - export the existing loader result type for the shared header boundary.
- `src/features/dashboard/services/createDefaultDashboardServices.ts` - production identity client factory.
- `src/features/dashboard/__tests__/DashboardScreen.test.tsx` - exact tab order, embedded Whitelist/Rewards, refresh, and unmount coverage.
- `src/features/referral/screens/RewardsScreen.tsx` - embedded header contract and removal of title/invite section.
- `src/features/referral/__tests__/RewardsScreen.test.tsx` - embedded rendering and independent partial-state coverage.
- `src/app/navigation/AppNavigator.tsx` - route aliases, Dashboard tab intent, and direct Profile Invite Friends command.
- `src/app/navigation/__tests__/AppNavigator.test.tsx` - route aliases and every invite command outcome.
- `src/app/AppRoot.tsx` - identity service and existing Rewards services wiring.
- `docs/plans/rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md` - mark corrected Task 6B/7A scope and implementation status.
- `docs/ai-delivery/runs/2026-07-15-task-06b-7a-dashboard-tabs-verification.md` - durable verification evidence.

**Delete**

- `src/features/referral/components/InviteSection.tsx` - invitation is no longer part of embedded Rewards.

## Invariants

- Never send a user id to `kyc-applicant-details`; the Edge Function derives ownership from the bearer JWT.
- Never log, persist, copy, cache, or attach analytics to KYC identity details or access tokens.
- Never request identity details unless the latest KYC summary is successfully loaded and has `status === "approved"`.
- Never treat a KYC repository error as “not started”.
- Never render more than one vertical `FlatList` or `SectionList` in the active Dashboard tree.
- Never enable commission-view reads or payout actions while the authorization evidence in `docs/ai-delivery/runs/2026-07-15-task-06a-supabase-contract-check.md` remains unresolved.
- Never generate an invite link without a real profile invite code and validated HTTPS `EXPO_PUBLIC_WEB_ORIGIN`.
- Task 7B KYC start/resume and Task 6C payout remain out of scope.

### Task 1: KYC Identity Domain And Authenticated Client

**Files:**

- Create: `src/features/dashboard/domain/kycIdentityDetails.ts`
- Create: `src/features/dashboard/services/kycIdentityDetailsClient.ts`
- Create: `src/features/dashboard/__tests__/kycIdentityDetails.test.ts`
- Create: `src/features/dashboard/__tests__/kycIdentityDetailsClient.test.ts`

- [ ] **Step 1: Write failing domain tests for masking and date fallback**

```ts
import { describe, expect, it } from "vitest";

import {
  formatIdentityDate,
  maskDocumentNumber,
} from "../domain/kycIdentityDetails";

describe("KYC identity presentation", () => {
  it("preserves at most four leading and trailing document characters", () => {
    expect(maskDocumentNumber("430181200212308817"))
      .toBe("4301**********8817");
    expect(maskDocumentNumber("A12345678"))
      .toBe("A123*5678");
  });

  it("fully masks short document values", () => {
    expect(maskDocumentNumber("A1234567")).toBe("********");
    expect(maskDocumentNumber(null)).toBe("Unavailable");
  });

  it("formats valid dates and rejects invalid dates", () => {
    expect(formatIdentityDate("2026-07-10T09:00:00Z")).toBe("2026-07-10");
    expect(formatIdentityDate("not-a-date")).toBe("Unavailable");
    expect(formatIdentityDate(null)).toBe("Unavailable");
  });
});
```

- [ ] **Step 2: Run the domain test and confirm the missing-module failure**

Run: `npm test -- src/features/dashboard/__tests__/kycIdentityDetails.test.ts`

Expected: FAIL because `../domain/kycIdentityDetails` does not exist.

- [ ] **Step 3: Implement the identity read model and pure formatting functions**

```ts
export type KycIdentityDetails = {
  country: string | null;
  dateOfBirth: string | null;
  docNumber: string | null;
  docType: string | null;
  fullName: string | null;
};

export function maskDocumentNumber(value: string | null): string {
  const characters = Array.from(value?.trim() ?? "");
  if (!characters.length) return "Unavailable";
  if (characters.length <= 8) return "*".repeat(characters.length);
  return `${characters.slice(0, 4).join("")}${"*".repeat(characters.length - 8)}${characters.slice(-4).join("")}`;
}

export function formatIdentityDate(value: string | null): string {
  if (!value) return "Unavailable";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString().slice(0, 10)
    : "Unavailable";
}
```

- [ ] **Step 4: Run the domain test and confirm it passes**

Run: `npm test -- src/features/dashboard/__tests__/kycIdentityDetails.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Write failing client tests for the exact Web contract and safe failures**

```ts
import { describe, expect, it, vi } from "vitest";

import {
  KycIdentityDetailsError,
  createKycIdentityDetailsClient,
} from "../services/kycIdentityDetailsClient";

const endpoint = "https://example.supabase.co/functions/v1/kyc-applicant-details";

describe("KYC identity details client", () => {
  it("posts an empty body with only the current bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
      country: "CHN",
      dateOfBirth: "2002-12-30",
      docNumber: "430181200212308817",
      docType: "ID_CARD",
      fullName: "Test User",
    }));
    const client = createKycIdentityDetailsClient({ endpoint, fetch: fetchMock });

    await expect(client.fetchDetails("secret-token")).resolves.toEqual({
      country: "CHN",
      dateOfBirth: "2002-12-30",
      docNumber: "430181200212308817",
      docType: "ID_CARD",
      fullName: "Test User",
    });
    expect(fetchMock).toHaveBeenCalledWith(endpoint, {
      body: "{}",
      headers: {
        Authorization: "Bearer secret-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/user_?id|viewer/i);
  });

  it.each([
    [401, "unauthorized", false],
    [403, "forbidden", false],
    [500, "server_unavailable", true],
  ] as const)("maps HTTP %s to %s", async (status, code, retryable) => {
    const client = createKycIdentityDetailsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse(status, { error: code })),
    });
    await expect(client.fetchDetails("secret-token")).rejects.toEqual(
      new KycIdentityDetailsError(code, { retryable }),
    );
  });

  it("rejects missing tokens and malformed success payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { fullName: 123 }));
    const client = createKycIdentityDetailsClient({ endpoint, fetch: fetchMock });
    await expect(client.fetchDetails(" ")).rejects.toMatchObject({ code: "unauthorized" });
    await expect(client.fetchDetails("secret-token"))
      .rejects.toMatchObject({ code: "invalid_response" });
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}
```

- [ ] **Step 6: Run the client test and confirm the missing-module failure**

Run: `npm test -- src/features/dashboard/__tests__/kycIdentityDetailsClient.test.ts`

Expected: FAIL because `../services/kycIdentityDetailsClient` does not exist.

- [ ] **Step 7: Implement the client without user-id parameters or sensitive logging**

```ts
import type { KycIdentityDetails } from "../domain/kycIdentityDetails";

export type KycIdentityDetailsErrorCode =
  | "forbidden"
  | "invalid_response"
  | "network_unavailable"
  | "server_unavailable"
  | "unauthorized";

export class KycIdentityDetailsError extends Error {
  constructor(
    readonly code: KycIdentityDetailsErrorCode,
    readonly options: { retryable: boolean },
  ) {
    super(code);
    this.name = "KycIdentityDetailsError";
  }

  get retryable(): boolean {
    return this.options.retryable;
  }
}

export type KycIdentityDetailsClient = {
  fetchDetails(accessToken: string): Promise<KycIdentityDetails>;
};

export function createKycIdentityDetailsClient({ endpoint, fetch: fetchImpl }: {
  endpoint: string;
  fetch: typeof fetch;
}): KycIdentityDetailsClient {
  return {
    async fetchDetails(accessToken) {
      if (!accessToken.trim()) {
        throw new KycIdentityDetailsError("unauthorized", { retryable: false });
      }

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          body: "{}",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
      } catch {
        throw new KycIdentityDetailsError("network_unavailable", { retryable: true });
      }

      if (!response.ok) throw mapHttpError(response.status);

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new KycIdentityDetailsError("invalid_response", { retryable: false });
      }
      return parseIdentityDetails(payload);
    },
  };
}
```

Complete the client with these local helpers so arrays, missing keys, numbers, nested objects, and booleans cannot enter the identity model:

```ts
function mapHttpError(status: number): KycIdentityDetailsError {
  if (status === 401) {
    return new KycIdentityDetailsError("unauthorized", { retryable: false });
  }
  if (status === 403) {
    return new KycIdentityDetailsError("forbidden", { retryable: false });
  }
  return new KycIdentityDetailsError("server_unavailable", {
    retryable: status >= 500,
  });
}

function parseIdentityDetails(value: unknown): KycIdentityDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new KycIdentityDetailsError("invalid_response", { retryable: false });
  }
  const row = value as Record<string, unknown>;
  const keys = ["country", "dateOfBirth", "docNumber", "docType", "fullName"] as const;
  if (keys.some((key) => !(key in row) || !isNullableString(row[key]))) {
    throw new KycIdentityDetailsError("invalid_response", { retryable: false });
  }
  return {
    country: normalizeText(row.country),
    dateOfBirth: normalizeText(row.dateOfBirth),
    docNumber: normalizeText(row.docNumber),
    docType: normalizeText(row.docType),
    fullName: normalizeText(row.fullName),
  };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
```

- [ ] **Step 8: Run both identity test files**

Run: `npm test -- src/features/dashboard/__tests__/kycIdentityDetails.test.ts src/features/dashboard/__tests__/kycIdentityDetailsClient.test.ts`

Expected: all identity tests PASS.

- [ ] **Step 9: Commit the identity boundary**

```bash
git add src/features/dashboard/domain/kycIdentityDetails.ts src/features/dashboard/services/kycIdentityDetailsClient.ts src/features/dashboard/__tests__/kycIdentityDetails.test.ts src/features/dashboard/__tests__/kycIdentityDetailsClient.test.ts
git commit -m "feat: add authenticated kyc identity details client"
```

### Task 2: Mobile-First Whitelist Screen

**Files:**

- Create: `src/features/dashboard/screens/WhitelistScreen.tsx`
- Create: `src/features/dashboard/__tests__/WhitelistScreen.test.tsx`

- [ ] **Step 1: Write failing tests for every KYC state and repository error**

Create a table-driven test that renders `WhitelistScreen` with these states and expected titles:

```ts
it.each([
  [null, "Whitelist not started"],
  ["pending", "Complete KYC steps"],
  ["under_review", "Review in progress"],
  ["awaiting_resubmission", "More information required"],
  ["rejected", "Whitelist not approved"],
  ["approved", "Whitelist approved"],
] as const)("renders %s status", async (status, expected) => {
  const renderer = await renderWhitelist({
    statusState: readyKyc(status),
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(expected);
});

it("renders a status error separately from not-started", async () => {
  const renderer = await renderWhitelist({ statusState: { status: "error" } });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain("Whitelist status unavailable");
  expect(output).not.toContain("Whitelist not started");
});
```

Use an exported discriminated union:

```ts
export type WhitelistStatusState =
  | { status: "loading" }
  | { status: "error" }
  | { data: DashboardKycSummary; status: "ready" };
```

- [ ] **Step 2: Write failing approved-only identity and cleanup tests**

```ts
it.each([null, "pending", "under_review", "awaiting_resubmission", "rejected"] as const)(
  "does not request identity for %s",
  async (status) => {
    const identityClient = { fetchDetails: vi.fn() };
    const fetchAccessToken = vi.fn();
    await renderWhitelist({ identityClient, fetchAccessToken, statusState: readyKyc(status) });
    expect(fetchAccessToken).not.toHaveBeenCalled();
    expect(identityClient.fetchDetails).not.toHaveBeenCalled();
  },
);

it("loads approved identity with the access token and masks the document", async () => {
  const identityClient = {
    fetchDetails: vi.fn().mockResolvedValue(identityFixture),
  };
  const renderer = await renderWhitelist({ identityClient, statusState: readyKyc("approved") });
  const output = JSON.stringify(renderer.toJSON());
  expect(identityClient.fetchDetails).toHaveBeenCalledWith("access-token");
  expect(output).toContain("4301**********8817");
  expect(output).not.toContain("430181200212308817");
});

it("keeps approved status visible when identity fails and retries only identity", async () => {
  const identityClient = {
    fetchDetails: vi.fn()
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce(identityFixture),
  };
  const renderer = await renderWhitelist({ identityClient, statusState: readyKyc("approved") });
  expect(JSON.stringify(renderer.toJSON())).toContain("Identity details unavailable");
  expect(JSON.stringify(renderer.toJSON())).toContain("Whitelist approved");
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: "Retry identity details" }).props.onPress();
  });
  expect(identityClient.fetchDetails).toHaveBeenCalledTimes(2);
});
```

Add explicit viewer-change and unmount coverage:

```ts
it("discards identity when the viewer changes", async () => {
  const identityClient = {
    fetchDetails: vi.fn()
      .mockResolvedValueOnce(identityFixture)
      .mockResolvedValueOnce({ ...identityFixture, fullName: "Second Viewer" }),
  };
  const renderer = await renderWhitelist({ identityClient, viewerId: "viewer-1" });
  expect(JSON.stringify(renderer.toJSON())).toContain("Test User");
  await act(async () => {
    renderer.update(<WhitelistFixture identityClient={identityClient} viewerId="viewer-2" />);
    await Promise.resolve();
  });
  expect(JSON.stringify(renderer.toJSON())).toContain("Second Viewer");
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Test User");
});

it("ignores a late identity result after unmount", async () => {
  let resolveDetails!: (value: KycIdentityDetails) => void;
  const pending = new Promise<KycIdentityDetails>((resolve) => { resolveDetails = resolve; });
  const renderer = await renderWhitelist({
    identityClient: { fetchDetails: vi.fn().mockReturnValue(pending) },
  });
  await act(async () => renderer.unmount());
  await act(async () => resolveDetails(identityFixture));
});
```

- [ ] **Step 3: Write a failing single-list and accessibility test**

Assert the active tree contains one `FlatList`, no `SectionList`, stable row ids, a `ShieldCheck`-backed status header, and label/value text that includes `KYC verification`, `Verification date`, `Valid until`, `Name`, `Country / region`, `Document type`, `Document number`, and `Date of birth` for approved state.

- [ ] **Step 4: Run the Whitelist test and confirm the missing-module failure**

Run: `npm test -- src/features/dashboard/__tests__/WhitelistScreen.test.tsx`

Expected: FAIL because `../screens/WhitelistScreen` does not exist.

- [ ] **Step 5: Implement one virtualized mobile flow**

The public contract must be:

```ts
export type WhitelistScreenProps = {
  fetchAccessToken(): Promise<string | null>;
  identityClient: KycIdentityDetailsClient;
  onRefreshCommon(): Promise<void>;
  renderHeader(onRefresh: () => Promise<void>): ReactNode;
  statusState: WhitelistStatusState;
  viewerId: string;
};
```

Implementation rules:

```ts
const approved = statusState.status === "ready" &&
  statusState.data.status === "approved";

const loadIdentity = useCallback(async () => {
  if (!approved) {
    setIdentity({ status: "idle" });
    return;
  }
  setIdentity({ status: "loading" });
  const token = await fetchAccessToken();
  if (!token) {
    if (requestIsCurrent()) setIdentity({ status: "error" });
    return;
  }
  try {
    const data = await identityClient.fetchDetails(token);
    if (requestIsCurrent()) setIdentity({ data, status: "ready" });
  } catch {
    if (requestIsCurrent()) setIdentity({ status: "error" });
  }
}, [approved, fetchAccessToken, identityClient, viewerId]);
```

Use an incrementing request generation or an `active` cleanup flag so viewer changes, unmount, logout, and late responses cannot repopulate old details. Store details only in local component state. Render status facts first and approved identity facts second in one `FlatList`; use semantic field ids such as `status:verification` and `identity:document-number`, never indexes. Values use `flexShrink: 1`, `textAlign: "right"`, and wrapping-safe containers. Use `ShieldCheck` from `lucide-react-native`; do not add a new icon dependency.

The active refresh function must await `Promise.allSettled([onRefreshCommon(), approved ? loadIdentity() : Promise.resolve()])`. The retry button invokes only `loadIdentity`.

- [ ] **Step 6: Run Whitelist and identity tests**

Run: `npm test -- src/features/dashboard/__tests__/WhitelistScreen.test.tsx src/features/dashboard/__tests__/kycIdentityDetails.test.ts src/features/dashboard/__tests__/kycIdentityDetailsClient.test.ts`

Expected: all tests PASS with no act warnings.

- [ ] **Step 7: Commit the Whitelist screen**

```bash
git add src/features/dashboard/screens/WhitelistScreen.tsx src/features/dashboard/__tests__/WhitelistScreen.test.tsx
git commit -m "feat: add mobile whitelist status and identity view"
```

### Task 3: Make Rewards An Embedded Dashboard Body

**Files:**

- Modify: `src/features/referral/screens/RewardsScreen.tsx`
- Modify: `src/features/referral/__tests__/RewardsScreen.test.tsx`
- Delete: `src/features/referral/components/InviteSection.tsx`

- [ ] **Step 1: Replace standalone tests with failing embedded-screen tests**

Change the render helper to pass:

```tsx
<RewardsScreen
  dependencies={dependencies}
  onRefreshCommon={onRefreshCommon}
  renderHeader={(refresh) => (
    <Pressable accessibilityLabel="Refresh dashboard" onPress={refresh}>
      <AppText>Dashboard shared header</AppText>
    </Pressable>
  )}
  viewerState={viewerState}
/>
```

Add these assertions to the existing screen suite:

- `Dashboard shared header`, `Total points`, tier benefits, and `Referrals / Points / Commission` render inside the same `FlatList`.
- `My Rewards`, `Invite friends`, `Open invite options`, and `Open KYC` do not render.
- `dependencies.kycLoader` is not called by embedded Rewards.
- Pressing `Refresh dashboard` reloads common data, profile, referrals, and point ledger.
- Only one `FlatList` exists for each internal Rewards tab.
- Existing profile, referrals, points, commission-unavailable, partial error, retry, empty, and StrictMode cases remain covered.

```ts
expect(JSON.stringify(renderer.toJSON())).toContain("Dashboard shared header");
expect(JSON.stringify(renderer.toJSON())).toContain("Total points");
expect(JSON.stringify(renderer.toJSON())).not.toContain("My Rewards");
expect(JSON.stringify(renderer.toJSON())).not.toContain("Invite friends");
expect(dependencies.kycLoader).not.toHaveBeenCalled();
expect(renderer.root.findAllByType(FlatList)).toHaveLength(1);

await act(async () => {
  await renderer.root.findByProps({ accessibilityLabel: "Refresh dashboard" }).props.onPress();
});
expect(onRefreshCommon).toHaveBeenCalledOnce();
expect(dependencies.rewardsProfileRepository.fetchProfile).toHaveBeenCalledTimes(2);
expect(dependencies.referralRecordsClient.fetchRecords).toHaveBeenCalledTimes(2);
expect(dependencies.pointLedgerRepository.fetchRecent).toHaveBeenCalledTimes(2);
```

- [ ] **Step 2: Run Rewards tests and confirm they fail against standalone props**

Run: `npm test -- src/features/referral/__tests__/RewardsScreen.test.tsx`

Expected: FAIL because `RewardsScreen` still requires invite props and renders the standalone title/Invite section.

- [ ] **Step 3: Implement the embedded header contract**

Use this prop surface:

```ts
export function RewardsScreen({
  dependencies,
  onRefreshCommon,
  renderHeader,
  viewerState,
}: {
  dependencies: RewardsDataDependencies;
  onRefreshCommon(): Promise<void>;
  renderHeader(onRefresh: () => Promise<void>): ReactNode;
  viewerState: { isSessionReady: boolean; viewer: AuthViewer | null };
})
```

Remove KYC local state, `loadKyc`, `InviteSection`, invite props, and the `My Rewards` title. Keep `RewardsDataDependencies.kycLoader` because the direct Profile invite workflow reuses it. Make refresh await common and Rewards loads together:

```ts
const refresh = useCallback(async () => {
  setRefreshing(true);
  await Promise.allSettled([onRefreshCommon(), loadAll()]);
  if (mounted.current) setRefreshing(false);
}, [loadAll, onRefreshCommon]);
```

The `FlatList` header order is `renderHeader(refresh)`, `PointsSummary`, `TierBenefitsSection`, then the internal segmented control. The commission tab continues rendering only `CommissionUnavailableState` and makes no commission request.

- [ ] **Step 4: Delete the obsolete Invite section and run Rewards tests**

Run: `npm test -- src/features/referral/__tests__/RewardsScreen.test.tsx src/features/referral/__tests__/InviteFriendSheet.test.tsx`

Expected: all tests PASS; invite-sheet behavior remains intact while the removed section has no imports.

- [ ] **Step 5: Commit embedded Rewards**

```bash
git add src/features/referral/screens/RewardsScreen.tsx src/features/referral/__tests__/RewardsScreen.test.tsx src/features/referral/components/InviteSection.tsx
git commit -m "refactor: embed rewards in dashboard"
```

### Task 4: Four-Tab Dashboard With One Active List

**Files:**

- Create: `src/features/dashboard/components/DashboardHeader.tsx`
- Modify: `src/features/dashboard/screens/DashboardScreen.tsx`
- Modify: `src/features/dashboard/services/dashboardHoldingsLoader.ts`
- Modify: `src/features/dashboard/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Write failing exact-order and selection tests**

```ts
it("renders the approved Dashboard tabs in exact order", async () => {
  const renderer = await renderDashboard();
  const tabs = renderer.root.findAll(
    (node) => node.props.accessibilityRole === "tab",
  );
  expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
    "Holdings",
    "Transactions",
    "Whitelist",
    "Rewards",
  ]);
});

it("embeds Whitelist and Rewards under the common Dashboard header", async () => {
  const renderer = await renderDashboard();
  await press(renderer, "Whitelist");
  expect(JSON.stringify(renderer.toJSON())).toContain("Whitelist approved");
  expect(JSON.stringify(renderer.toJSON())).toContain("Alice");
  await press(renderer, "Rewards");
  expect(JSON.stringify(renderer.toJSON())).toContain("Total points");
  expect(JSON.stringify(renderer.toJSON())).toContain("Alice");
  expect(JSON.stringify(renderer.toJSON())).not.toContain("My Rewards");
});
```

- [ ] **Step 2: Write failing unmount and list-architecture tests**

For every outer tab, assert `renderer.root.findAllByType(FlatList).length === 1`. On Whitelist, resolve identity details, switch to Holdings, switch back, and assert the client is called again and the old details are not retained before the new request resolves. This proves the inactive body unmounted and discarded identity state.

Add an `initialTab="rewards"` and `initialTab="whitelist"` test. Invalid or omitted values are impossible at the type boundary; omitted defaults to Holdings.

- [ ] **Step 3: Run Dashboard tests and confirm the two-tab failure**

Run: `npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx`

Expected: FAIL because only Holdings and Transactions exist and no embedded body props are available.

- [ ] **Step 4: Extract the controlled common Dashboard header**

`DashboardHeader.tsx` owns presentation only. Its props include:

```ts
export type DashboardTab = "holdings" | "transactions" | "whitelist" | "rewards";

// Export this beside DashboardHoldingsLoader in dashboardHoldingsLoader.ts.
export type DashboardHoldingsResult = NonNullable<
  Awaited<ReturnType<DashboardHoldingsLoader>>
>;

export type DashboardHeaderProps = {
  commission: DashboardCommissionResult | null;
  editingNickname: boolean;
  errors: string[];
  holdings: DashboardHoldingsResult | null;
  kyc: DashboardKycSummary | null;
  nicknameDraft: string;
  nicknameError: string | null;
  onBeginNicknameEdit(): void;
  onChangeNickname(value: string): void;
  onFinishNicknameEdit(): void;
  onRefresh(): void;
  onTabChange(tab: DashboardTab): void;
  profile: DashboardProfile | null;
  tab: DashboardTab;
  viewerEmail: string | null;
};
```

Define the options in this file and move the existing title, nickname editor, refresh icon, warnings, `DashboardSummary`, holdings warning, and segmented-control JSX as one presentation-only component. Preserve the existing formatting helper calls and use this exact option value:

```ts
const DASHBOARD_TABS = [
  { label: "Holdings", value: "holdings" },
  { label: "Transactions", value: "transactions" },
  { label: "Whitelist", value: "whitelist" },
  { label: "Rewards", value: "rewards" },
] satisfies Array<SegmentedControlOption<DashboardTab>>;
```

The component ends with:

```tsx
<SegmentedControl
  onChange={onTabChange}
  options={DASHBOARD_TABS}
  value={tab}
/>
```

- [ ] **Step 5: Refactor DashboardScreen into an orchestrator**

Add these props to the existing data dependencies:

```ts
export type DashboardDataDependencies = {
  commissionLoader(state: DashboardViewerState): Promise<DashboardCommissionResult | null>;
  fetchAccessToken(): Promise<string | null>;
  holdingsLoader: DashboardHoldingsLoader;
  identityClient: KycIdentityDetailsClient;
  kycLoader(state: DashboardViewerState): Promise<DashboardKycSummary | null>;
  nicknameRepository: NicknameRepository;
  profileLoader: DashboardProfileLoader;
};
```

Pass `rewardsDependencies: RewardsDataDependencies` as a separate `DashboardScreen` prop because Profile and Dashboard share that capability but it is not common Dashboard data. Add `initialTab?: DashboardTab`, defaulting to `holdings`. Track KYC as an independent state so a rejected query becomes `{ status: "error" }` while an explicit latest-query `null` status remains `{ data: summary, status: "ready" }`.

Build one `renderHeader(onRefresh)` callback around `DashboardHeader`, then conditionally return exactly one active body:

```tsx
if (tab === "whitelist") {
  return (
    <WhitelistScreen
      fetchAccessToken={fetchAccessToken}
      identityClient={identityClient}
      onRefreshCommon={load}
      renderHeader={renderHeader}
      statusState={kycState}
      viewerId={viewerState.viewer.id}
    />
  );
}

if (tab === "rewards") {
  return (
    <RewardsScreen
      dependencies={rewardsDependencies}
      onRefreshCommon={load}
      renderHeader={renderHeader}
      viewerState={viewerState}
    />
  );
}
```

Holdings and Transactions continue using the existing Dashboard `FlatList`, with `DashboardHeader` as `ListHeaderComponent`. Keep the outer keyboard-dismiss surface for all tabs. Do not wrap any body in a `ScrollView` or another virtualized list.

- [ ] **Step 6: Run Dashboard, Whitelist, and Rewards tests**

Run: `npm test -- src/features/dashboard/__tests__/DashboardScreen.test.tsx src/features/dashboard/__tests__/WhitelistScreen.test.tsx src/features/referral/__tests__/RewardsScreen.test.tsx`

Expected: all tests PASS and each active Dashboard tree contains one `FlatList`.

- [ ] **Step 7: Commit the four-tab Dashboard**

```bash
git add src/features/dashboard/components/DashboardHeader.tsx src/features/dashboard/screens/DashboardScreen.tsx src/features/dashboard/__tests__/DashboardScreen.test.tsx
git commit -m "feat: add whitelist and rewards dashboard tabs"
```

### Task 5: Direct Profile Invite Command And Route Aliases

**Files:**

- Create: `src/features/referral/workflow/inviteFriendCommand.ts`
- Create: `src/features/referral/__tests__/inviteFriendCommand.test.ts`
- Modify: `src/app/navigation/AppNavigator.tsx`
- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`

- [ ] **Step 1: Write failing pure workflow tests for all gates**

The result union is:

```ts
export type InviteFriendCommandResult =
  | { inviteCode: string; status: "ready"; webOrigin: string }
  | { status: "session_unavailable" }
  | { status: "kyc_required" }
  | { status: "invite_code_unavailable" }
  | { status: "origin_unavailable" }
  | { status: "unavailable" };
```

Implement these cases as a table plus a concurrency assertion:

- session not ready or viewer absent returns `session_unavailable` and calls no private dependency;
- authenticated execution invokes KYC and profile dependencies concurrently;
- KYC not approved returns `kyc_required`;
- profile without invite code returns `invite_code_unavailable`;
- missing, HTTP, credentialed, path-bearing, query-bearing, or fragment-bearing origin returns `origin_unavailable`;
- either repository rejection returns `unavailable` without leaking the caught error;
- approved KYC + real code + HTTPS origin returns the exact ready values.

```ts
it.each([
  [{ isSessionReady: false, viewer: null }, undefined, "session_unavailable"],
  [viewerState, undefined, "origin_unavailable"],
] as const)("maps command gates to %s", async (state, origin, expected) => {
  await expect(runInviteFriendCommand({
    dependencies: createDependencies(),
    publicWebOrigin: origin,
    viewerState: state,
  })).resolves.toMatchObject({ status: expected });
});

it("starts profile and KYC reads before either one resolves", async () => {
  const profile = deferred<RewardsProfile>();
  const kyc = deferred<DashboardKycSummary | null>();
  const dependencies = createDependencies({ profile: profile.promise, kyc: kyc.promise });
  const result = runInviteFriendCommand({
    dependencies,
    publicWebOrigin: "https://test.artstarex.com",
    viewerState,
  });
  expect(dependencies.rewardsProfileRepository.fetchProfile).toHaveBeenCalledOnce();
  expect(dependencies.kycLoader).toHaveBeenCalledOnce();
  profile.resolve(profileFixture);
  kyc.resolve(approvedKyc);
  await expect(result).resolves.toMatchObject({ status: "ready" });
});
```

Use individual tests with `mockRejectedValue`, unapproved KYC, a null `inviteCode`, and the unsafe origins from `publicConfig.test.ts` to assert the remaining result variants exactly.

- [ ] **Step 2: Run the workflow test and confirm the missing-module failure**

Run: `npm test -- src/features/referral/__tests__/inviteFriendCommand.test.ts`

Expected: FAIL because `../workflow/inviteFriendCommand` does not exist.

- [ ] **Step 3: Implement the workflow with concurrent independent reads**

```ts
export async function runInviteFriendCommand({
  dependencies,
  publicWebOrigin,
  viewerState,
}: {
  dependencies: Pick<RewardsDataDependencies, "kycLoader" | "rewardsProfileRepository">;
  publicWebOrigin?: string;
  viewerState: DashboardViewerState;
}): Promise<InviteFriendCommandResult> {
  if (!viewerState.isSessionReady || !viewerState.viewer) {
    return { status: "session_unavailable" };
  }

  const [profileResult, kycResult] = await Promise.allSettled([
    dependencies.rewardsProfileRepository.fetchProfile(viewerState.viewer.id),
    dependencies.kycLoader(viewerState),
  ]);
  if (profileResult.status === "rejected" || kycResult.status === "rejected") {
    return { status: "unavailable" };
  }
  if (kycResult.value?.status !== "approved") return { status: "kyc_required" };

  const inviteCode = profileResult.value.inviteCode?.trim();
  if (!inviteCode) return { status: "invite_code_unavailable" };
  const webOrigin = normalizeHttpsOrigin(publicWebOrigin);
  if (!webOrigin) return { status: "origin_unavailable" };
  return { inviteCode, status: "ready", webOrigin };
}
```

Implement the HTTPS-origin-only helper directly:

```ts
function normalizeHttpsOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the workflow tests**

Run: `npm test -- src/features/referral/__tests__/inviteFriendCommand.test.ts`

Expected: all gate tests PASS.

- [ ] **Step 5: Replace old protected-route tests with failing alias and direct-command tests**

In `AppNavigator.test.tsx`, assert:

- `initialRouteName="referral"` renders Dashboard with Rewards selected and no standalone `My Rewards` title.
- `initialRouteName="kyc"` renders Dashboard with Whitelist selected.
- `initialRouteName="dashboard"` renders Holdings selected.
- logged-out Invite Friends calls `actions.login` and no Rewards dependency.
- authenticated Invite Friends loads profile/KYC and opens `InviteFriendSheet` directly; no intermediate Rewards navigation or `Open invite options` press.
- unapproved KYC routes to Dashboard with Whitelist selected.
- missing code shows `Invite code unavailable`.
- missing origin shows `Invite sharing is not configured`.
- repository failure shows `Unable to load invite details` and a `Retry invite` action.
- session loss shows `Sign in again to create an invite`.

- [ ] **Step 6: Run AppNavigator tests and confirm old behavior fails**

Run: `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx`

Expected: FAIL because `referral` still renders standalone Rewards and Profile Invite Friends navigates there first.

- [ ] **Step 7: Simplify navigation to Dashboard tab intent**

Remove `protectedRoute` and the standalone Rewards/KYC route rendering. Derive initial Dashboard tab as:

```ts
function dashboardTabForRoute(routeName: AppRouteName): DashboardTab {
  if (routeName === "referral") return "rewards";
  if (routeName === "kyc") return "whitelist";
  return "holdings";
}
```

Map authenticated `referral` and `kyc` aliases to the Dashboard bottom tab. Store a `dashboardInitialTab` intent in `MainTabs`; Profile KYC and unapproved invite outcomes set it to `whitelist`, select `dashboard`, and clear detail state. Bottom-tab Dashboard selection resets it to `holdings`.

Profile Invite Friends behavior:

```ts
const handleInvitePress = async () => {
  if (authStatus !== "authenticated") {
    await onLogin?.();
    return;
  }
  setInviteFeedback({ status: "loading" });
  const result = await runInviteFriendCommand({
    dependencies: rewardsDependencies,
    publicWebOrigin,
    viewerState,
  });
  if (result.status === "ready") {
    setInviteFeedback({ status: "idle" });
    setInviteSheet({ inviteCode: result.inviteCode, webOrigin: result.webOrigin });
  } else if (result.status === "kyc_required") {
    openDashboardTab("whitelist");
  } else {
    setInviteFeedback(result);
  }
};
```

Pass feedback and retry to `ProfileRoute`. Use explicit text for every result and never display caught errors, token values, raw profile objects, or KYC payloads.

- [ ] **Step 8: Run navigation, workflow, and screen integration tests**

Run: `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx src/features/referral/__tests__/inviteFriendCommand.test.ts src/features/dashboard/__tests__/DashboardScreen.test.tsx`

Expected: all tests PASS.

- [ ] **Step 9: Commit navigation and invitation correction**

```bash
git add src/features/referral/workflow/inviteFriendCommand.ts src/features/referral/__tests__/inviteFriendCommand.test.ts src/app/navigation/AppNavigator.tsx src/app/navigation/__tests__/AppNavigator.test.tsx
git commit -m "fix: restore direct profile invite command"
```

### Task 6: Production Wiring, Documentation, And Delivery Verification

**Files:**

- Modify: `src/features/dashboard/services/createDefaultDashboardServices.ts`
- Modify: `src/app/AppRoot.tsx`
- Modify: `src/features/dashboard/__tests__/createDefaultDashboardServices.test.ts`
- Modify: `docs/plans/rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md`
- Create: `docs/ai-delivery/runs/2026-07-15-task-06b-7a-dashboard-tabs-verification.md`

- [ ] **Step 1: Write failing default-service tests**

Test a parameterized factory before the environment wrapper:

```ts
const client = createDashboardIdentityClient({
  fetch: fetchMock,
  supabaseUrl: "https://example.supabase.co",
});

await client.fetchDetails("access-token");
expect(fetchMock).toHaveBeenCalledWith(
  "https://example.supabase.co/functions/v1/kyc-applicant-details",
  expect.objectContaining({ method: "POST" }),
);
```

Also assert a missing/invalid Supabase URL throws before a request and that no production factory imports test fixtures.

- [ ] **Step 2: Run default-service tests and confirm the missing-factory failure**

Run: `npm test -- src/features/dashboard/__tests__/createDefaultDashboardServices.test.ts`

Expected: FAIL because the identity factory is not wired.

- [ ] **Step 3: Add production identity wiring and reuse the existing session-token provider**

Add parameterized and environment-backed factories in `createDefaultDashboardServices.ts`:

```ts
export function createDashboardIdentityClient({ fetch: fetchImpl, supabaseUrl }: {
  fetch: typeof fetch;
  supabaseUrl: string;
}) {
  const parsedUrl = new URL(supabaseUrl);
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Invalid Supabase URL for KYC identity services");
  }
  return createKycIdentityDetailsClient({
    endpoint: new URL("/functions/v1/kyc-applicant-details", parsedUrl).toString(),
    fetch: fetchImpl,
  });
}

export function createDefaultDashboardIdentityClient() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) throw new Error("Missing Supabase URL for KYC identity services");
  return createDashboardIdentityClient({ fetch: globalThis.fetch, supabaseUrl });
}
```

In `AppRoot.tsx`, instantiate `rewardsDependencies` first. Add its existing `fetchAccessToken` and the new identity client to `dashboardDependencies`. Continue passing the same `rewardsDependencies` object to `AppNavigator`; `AppNavigator` passes it as the separate `DashboardScreen.rewardsDependencies` prop so Dashboard and Profile share repositories instead of creating duplicate service instances.

- [ ] **Step 4: Run focused production-wiring tests and typecheck**

Run: `npm test -- src/features/dashboard/__tests__/createDefaultDashboardServices.test.ts src/features/referral/__tests__/createDefaultRewardsServices.test.ts && npm run typecheck`

Expected: all tests PASS and TypeScript exits 0.

- [ ] **Step 5: Run the full automated suite**

Run: `npm test`

Expected: all test files and tests PASS with no unhandled rejection or act warning.

- [ ] **Step 6: Run forbidden-pattern and architecture scans**

Run each command independently:

```bash
rg -n "console\.(log|info|debug|warn).*?(token|session|docNumber|dateOfBirth|fullName)" src
rg -n "kyc-applicant-details.*(userId|user_id)|JSON\.stringify\(\{.*(userId|user_id)" src
rg -n "AsyncStorage|SecureStore|Clipboard|analytics|breadcrumb" src/features/dashboard/domain/kycIdentityDetails.ts src/features/dashboard/services/kycIdentityDetailsClient.ts src/features/dashboard/screens/WhitelistScreen.tsx
rg -n "my_commission_summary|my_commissions" src/features/referral/screens/RewardsScreen.tsx src/features/dashboard/screens/DashboardScreen.tsx src/features/referral/services/createDefaultRewardsServices.ts src/features/dashboard/services/createDefaultDashboardServices.ts
rg -n "key=\{.*index\}" src/features/dashboard src/features/referral
```

Expected: no matches. Existing commission repository files may still define disabled read models, but production factories and screens must not invoke them.

- [ ] **Step 7: Produce an iOS production bundle without exposing environment values**

Run from the worktree:

```bash
(set -a; source ../../.env; set +a; npx expo export --platform ios --output-dir /tmp/mytrade-dashboard-tabs-ios)
```

Expected: Expo export completes successfully. The existing Metro `@noble/hashes` package-export fallback warning may remain documented; no new missing module or bundle error is allowed.

- [ ] **Step 8: Perform mobile visual QA where a native runtime is available**

Verify at 320-pixel phone width and one tablet width:

- all four Dashboard tab labels remain readable and have 40-pixel touch targets;
- Whitelist status and identity rows wrap without overlap;
- raw document numbers never appear;
- long names, countries, document types, referral emails, and point sources wrap;
- switching Whitelist → Holdings → Whitelist shows an identity reload rather than retained details;
- Rewards internal tabs retain one vertical scroll surface;
- keyboard dismissal and nickname auto-save still work;
- invite command opens the native sheet only with configured real origin and code.

If a native simulator/device is unavailable, record this as residual manual QA rather than claiming visual completion. Expo Web is not an acceptance substitute because Web dependencies are not installed.

- [ ] **Step 9: Update durable task and verification documents**

In `2026-07-15-task-06-07-rewards-whitelist-business-logic.md`, correct Task 6B to “Rewards embedded as Dashboard tab; Invite Friends is a Profile command”, mark Task 7A read-only items complete only after tests pass, and preserve open Task 6C/7B/security/domain items.

Create the verification run using the repository template sections: scope, contract evidence, commands/results, security review, data review, business-boundary review, performance review, QA, residual risks, rollback, and next action. Record actual test counts and command results, not predicted values.

- [ ] **Step 10: Run AI Delivery audit after document edits**

Run: `npm run ai:audit -- rn-full-app-port`

Expected: PASS with the feature remaining in `编码实现`.

- [ ] **Step 11: Run AI Delivery verification and shipping gates**

Run:

```bash
npm run ai:verify -- rn-full-app-port --write
npm run ai:ship -- rn-full-app-port
```

Expected: verification writes a passing artifact; ship/readiness reports no new blocking implementation issue. Do not advance the feature stage, merge, deploy, or enable commission/payout from this task.

- [ ] **Step 12: Review the final diff and commit verification evidence**

Run:

```bash
git diff --check
git status --short
git diff --stat HEAD
```

Inspect the complete diff for accidental `.env`, `.superpowers`, generated bundle, token, raw identity fixture, or commission-query changes. Then commit:

```bash
git add src/app/AppRoot.tsx src/features/dashboard/services/createDefaultDashboardServices.ts src/features/dashboard/__tests__/createDefaultDashboardServices.test.ts docs/plans/rn-full-app-port/tasks/2026-07-15-task-06-07-rewards-whitelist-business-logic.md docs/ai-delivery/runs/2026-07-15-task-06b-7a-dashboard-tabs-verification.md docs/ai-delivery/runs/2026-07-15-rn-full-app-port-verification.md
git commit -m "docs: verify dashboard whitelist and rewards tabs"
```

## Final Acceptance

- Dashboard outer tabs are exactly Holdings, Transactions, Whitelist, Rewards.
- `referral`, `kyc`, and `dashboard` aliases select Rewards, Whitelist, and Holdings respectively.
- The active Dashboard tree contains one vertical virtualized list.
- Whitelist never requests identity for a non-approved or unavailable KYC state.
- Approved identity uses only the current access token, renders a masked document number, and clears on unmount/viewer/session changes.
- Rewards is embedded, has no Invite section, retains its three internal tabs and independent failure states, and makes no commission request.
- Profile Invite Friends opens the real invite sheet directly and exposes explicit closed-gate states.
- Full tests, TypeScript, forbidden scans, iOS export, and AI Delivery audit/verify pass.
- Task 6C payout and Task 7B KYC launcher remain explicitly open.
