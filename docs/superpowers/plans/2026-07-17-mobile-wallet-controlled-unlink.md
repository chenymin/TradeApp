# Mobile Wallet Controlled Unlink Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated mobile user explicitly confirm and unlink an eligible external non-active Ethereum wallet, then reconcile the existing platform session through `wallet-login` without repeating a successful Privy mutation.

**Architecture:** Extend the auth workflow with a non-interactive session refresh that preserves the current session on failure. Add deterministic wallet eligibility and unlink workflow modules, inject Privy and native Alert adapters from `AppRoot`, and keep the Wallet screen responsible only for rendering the controlled state machine.

**Tech Stack:** React Native 0.83, Expo 55, TypeScript 6, `@privy-io/expo` 0.69.4, Supabase session exchange, Vitest, React Test Renderer

---

## File Map

| File | Change | Responsibility |
| --- | --- | --- |
| `src/features/auth/workflow/authWorkflow.ts` | Modify | Non-interactive Privy token exchange and session replacement |
| `src/app/auth/createAuthWorkflow.ts` | Modify | Supply current Privy access token without opening login UI |
| `src/app/providers/AuthProvider.tsx` | Modify | Preserve authenticated state on refresh failure; update viewer on success |
| `src/features/auth/__tests__/authWorkflow.test.ts` | Modify | Refresh workflow red/green coverage |
| `src/app/providers/__tests__/AuthProvider.test.tsx` | Modify | Provider state preservation and viewer replacement coverage |
| `src/features/wallet/workflow/walletUnlinkWorkflow.ts` | Create | Eligibility, unlink sequencing, and retry-only-sync behavior |
| `src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts` | Create | Pure controlled-write workflow tests |
| `src/features/wallet/services/createWalletUnlinkDependencies.ts` | Create | Native Alert and Privy/Auth runtime adapters |
| `src/features/wallet/__tests__/createWalletUnlinkDependencies.test.ts` | Create | Confirmation and binding tests |
| `src/features/wallet/components/WalletIdentitySection.tsx` | Modify | Eligible trash action and stable progress/error presentation |
| `src/features/wallet/screens/WalletScreen.tsx` | Modify | Screen-local mutation state and completed-row suppression |
| `src/features/wallet/__tests__/WalletScreen.test.tsx` | Modify | End-to-end component interaction tests |
| `src/app/AppRoot.tsx` | Modify | Bind `useUnlinkWallet()` and auth refresh to wallet dependencies |
| `src/app/navigation/AppNavigator.tsx` | Modify | Pass optional unlink dependencies to protected Wallet route |
| `src/app/navigation/__tests__/AppNavigator.test.tsx` | Modify | Protected dependency propagation regression |

## Task 1: Non-Interactive Session Refresh

**Files:**

- Modify: `src/features/auth/__tests__/authWorkflow.test.ts`
- Modify: `src/app/providers/__tests__/AuthProvider.test.tsx`
- Modify: `src/features/auth/workflow/authWorkflow.ts`
- Modify: `src/app/auth/createAuthWorkflow.ts`
- Modify: `src/app/providers/AuthProvider.tsx`

- [ ] **Step 1: Write failing auth workflow tests**

Add `getAccessToken` to the fake Privy adapter and tests that require this contract:

```ts
it("refreshes an authenticated session without opening Privy login", async () => {
  const adapters = fakeAdapters();
  adapters.privy.getAccessToken.mockResolvedValue("fresh-privy-token");
  adapters.exchange.exchange.mockResolvedValue({
    session: { accessToken: "replacement-token" },
    userStatus: "existing",
    viewer: { ...viewer(), walletAddress: "0xdef" },
  });

  const result = await createAuthWorkflow(adapters).refreshSession();

  expect(result).toEqual({
    ok: true,
    viewer: { ...viewer(), walletAddress: "0xdef" },
  });
  expect(adapters.privy.login).not.toHaveBeenCalled();
  expect(adapters.exchange.exchange).toHaveBeenCalledWith("fresh-privy-token");
  expect(adapters.session.setSession).toHaveBeenCalledWith({
    accessToken: "replacement-token",
    viewer: { ...viewer(), walletAddress: "0xdef" },
  });
});

it("does not clear the working session when refresh fails", async () => {
  const adapters = fakeAdapters();
  adapters.privy.getAccessToken.mockResolvedValue("fresh-privy-token");
  adapters.exchange.exchange.mockRejectedValue({
    code: "server_unavailable",
    retryable: false,
  });

  await expect(createAuthWorkflow(adapters).refreshSession()).resolves.toEqual({
    error: { code: "server_unavailable", retryable: false },
    ok: false,
  });
  expect(adapters.session.clearSession).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the workflow test and verify RED**

Run:

```bash
npx vitest run src/features/auth/__tests__/authWorkflow.test.ts
```

Expected: FAIL because `getAccessToken` and `refreshSession` do not exist.

- [ ] **Step 3: Implement the workflow refresh contract**

Add to `AuthWorkflowAdapters.privy`:

```ts
getAccessToken: () => Promise<string | null>;
```

Add:

```ts
export type AuthSessionRefreshResult =
  | { ok: true; viewer: AuthViewer }
  | { error: AuthWorkflowError; ok: false };
```

Expose `refreshSession` from `createAuthWorkflow` and implement it without registration branching or cleanup:

```ts
async function refreshSession(
  adapters: AuthWorkflowAdapters,
): Promise<AuthSessionRefreshResult> {
  try {
    const privyAccessToken = await adapters.privy.getAccessToken();
    if (!privyAccessToken) {
      return {
        error: { code: "privy_session_unavailable", retryable: true },
        ok: false,
      };
    }

    const exchanged = await exchangeWithRetry(adapters, privyAccessToken);
    if (!exchanged.viewer) {
      return {
        error: { code: "auth_viewer_missing", retryable: true },
        ok: false,
      };
    }

    await adapters.session.setSession(
      attachViewer(exchanged.session, exchanged.viewer),
    );
    return { ok: true, viewer: exchanged.viewer };
  } catch (error) {
    return { error: normalizeWorkflowError(error), ok: false };
  }
}
```

Supply `getAccessToken` from `createRuntimeAuthWorkflow` without calling `useLogin`.

- [ ] **Step 4: Run the workflow tests and verify GREEN**

Run:

```bash
npx vitest run src/features/auth/__tests__/authWorkflow.test.ts
```

Expected: all auth workflow tests pass.

- [ ] **Step 5: Write failing AuthProvider tests**

Add one test where `refreshSession` succeeds and replaces the viewer, and one where it fails and the latest authenticated snapshot remains unchanged:

```ts
await expect(actions.refreshSession?.()).resolves.toBe(true);
expect(snapshots.at(-1)).toEqual({
  isSessionReady: true,
  status: "authenticated",
  viewer: replacementViewer,
});

workflow.refreshSession.mockResolvedValue({
  error: { code: "server_unavailable", retryable: true },
  ok: false,
});
await expect(actions.refreshSession?.()).resolves.toBe(false);
expect(snapshots.at(-1)).toEqual(authenticatedSnapshot);
```

- [ ] **Step 6: Run the provider test and verify RED**

Run:

```bash
npx vitest run src/app/providers/__tests__/AuthProvider.test.tsx
```

Expected: FAIL because `AuthProviderActions.refreshSession` is missing.

- [ ] **Step 7: Implement provider state preservation**

Add this action shape:

```ts
refreshSession: () => Promise<boolean>;
```

Implement without setting a loading/auth-failed state:

```ts
const refreshSession = useCallback(async () => {
  const result = await workflow.refreshSession();
  if (!result.ok) return false;

  setState({
    isSessionReady: true,
    status: "authenticated",
    viewer: result.viewer,
  });
  return true;
}, [workflow]);
```

Include it in the memoized actions object.

- [ ] **Step 8: Run focused auth tests and typecheck**

Run:

```bash
npx vitest run src/features/auth/__tests__/authWorkflow.test.ts src/app/providers/__tests__/AuthProvider.test.tsx
npm run typecheck
```

Expected: both test files and typecheck pass.

- [ ] **Step 9: Commit**

```bash
git add src/features/auth/__tests__/authWorkflow.test.ts src/app/providers/__tests__/AuthProvider.test.tsx src/features/auth/workflow/authWorkflow.ts src/app/auth/createAuthWorkflow.ts src/app/providers/AuthProvider.tsx
git commit -m "feat: refresh authenticated wallet session"
```

## Task 2: Controlled Wallet Unlink Workflow

**Files:**

- Create: `src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts`
- Create: `src/features/wallet/workflow/walletUnlinkWorkflow.ts`

- [ ] **Step 1: Write failing eligibility and sequencing tests**

Cover these exact behaviors:

```ts
expect(canUnlinkWallet(identity, linkedExternal)).toBe(true);
expect(canUnlinkWallet(identity, activeExternal)).toBe(false);
expect(canUnlinkWallet(identity, linkedEmbedded)).toBe(false);
expect(canUnlinkWallet(singleWalletIdentity, singleWalletIdentity.wallets[0]!))
  .toBe(false);
```

Add command tests:

```ts
await expect(requestWalletUnlink(linkedExternal, dependencies)).resolves.toBe(
  "complete",
);
expect(dependencies.unlink).toHaveBeenCalledOnce();
expect(dependencies.refreshSession).toHaveBeenCalledOnce();

dependencies.refreshSession.mockResolvedValue(false);
await expect(requestWalletUnlink(linkedExternal, dependencies)).resolves.toBe(
  "sync_error",
);
await expect(retryWalletSync(dependencies)).resolves.toBe("complete");
expect(dependencies.unlink).toHaveBeenCalledOnce();
expect(dependencies.refreshSession).toHaveBeenCalledTimes(2);
```

Also prove cancellation does not unlink, and Privy failure does not refresh.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx vitest run src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts
```

Expected: FAIL because the workflow module does not exist.

- [ ] **Step 3: Implement the deterministic workflow**

Create these public contracts:

```ts
export type WalletUnlinkDependencies = {
  confirm(input: {
    address: `0x${string}`;
    providerLabel: string;
  }): Promise<boolean>;
  refreshSession(): Promise<boolean>;
  unlink(address: `0x${string}`): Promise<void>;
};

export type WalletUnlinkResult =
  | "cancelled"
  | "complete"
  | "sync_error"
  | "unlink_error";
```

Implement `canUnlinkWallet`, `requestWalletUnlink`, and a separate `retryWalletSync`. The request function must call in order: eligibility guard, confirmation, unlink once, refresh. `retryWalletSync` may call only `refreshSession`.

- [ ] **Step 4: Run the workflow tests and verify GREEN**

Run:

```bash
npx vitest run src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts
```

Expected: all workflow tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts src/features/wallet/workflow/walletUnlinkWorkflow.ts
git commit -m "feat: add controlled wallet unlink workflow"
```

## Task 3: Native Confirmation And Runtime Bindings

**Files:**

- Create: `src/features/wallet/__tests__/createWalletUnlinkDependencies.test.ts`
- Create: `src/features/wallet/services/createWalletUnlinkDependencies.ts`

- [ ] **Step 1: Write the failing native adapter tests**

Inject an Alert-compatible adapter and verify the destructive action resolves true, cancel/dismiss resolves false, and runtime calls retain the exact address:

```ts
const dependencies = createWalletUnlinkDependencies({
  alert,
  refreshSession,
  unlinkWallet,
});

const confirmed = dependencies.confirm({
  address: ADDRESS,
  providerLabel: "MetaMask",
});
alert.alert.mock.calls[0]![2]![1]!.onPress?.();
await expect(confirmed).resolves.toBe(true);
expect(alert.alert).toHaveBeenCalledWith(
  "Unlink wallet?",
  expect.stringContaining("MetaMask"),
  expect.any(Array),
  expect.objectContaining({ cancelable: true }),
);

await dependencies.unlink(ADDRESS);
expect(unlinkWallet).toHaveBeenCalledWith({ address: ADDRESS });
```

- [ ] **Step 2: Run the adapter test and verify RED**

Run:

```bash
npx vitest run src/features/wallet/__tests__/createWalletUnlinkDependencies.test.ts
```

Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement the adapter factory**

The factory accepts `Alert` by default and injectable bindings for tests. Confirmation must use `Cancel` and destructive `Unlink` actions, format only a shortened public address, and resolve false on dismiss.

Map runtime methods exactly:

```ts
return {
  confirm: (input) => confirmWithAlert(alert, input),
  refreshSession,
  unlink: async (address) => {
    await unlinkWallet({ address });
  },
};
```

- [ ] **Step 4: Run the adapter tests and verify GREEN**

Run:

```bash
npx vitest run src/features/wallet/__tests__/createWalletUnlinkDependencies.test.ts
```

Expected: all adapter tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/wallet/__tests__/createWalletUnlinkDependencies.test.ts src/features/wallet/services/createWalletUnlinkDependencies.ts
git commit -m "feat: bind native wallet unlink confirmation"
```

## Task 4: Wallet Screen Controlled Action UI

**Files:**

- Modify: `src/features/wallet/__tests__/WalletScreen.test.tsx`
- Modify: `src/features/wallet/components/WalletIdentitySection.tsx`
- Modify: `src/features/wallet/screens/WalletScreen.tsx`

- [ ] **Step 1: Write failing Wallet screen interaction tests**

Render an active embedded wallet plus one linked external wallet and injected unlink dependencies. Assert:

```ts
expect(renderer.root.findByProps({
  accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
})).toBeTruthy();
expect(renderer.root.findAllByProps({
  accessibilityLabel: `Unlink wallet ${shortAddress(address(8))}`,
})).toHaveLength(0);
```

Press unlink and prove confirmation/unlink/refresh each run once. Add separate tests for:

- cancellation: no unlink or refresh;
- Privy failure: inline `Wallet could not be unlinked` and no refresh;
- sync failure: inline `Wallet removed; sync pending` plus `Retry wallet sync`;
- retry: only refresh count changes, unlink remains once;
- success: completed address is suppressed while stale metadata still contains it;
- absent dependencies: no unlink actions are rendered.

- [ ] **Step 2: Run the screen test and verify RED**

Run:

```bash
npx vitest run src/features/wallet/__tests__/WalletScreen.test.tsx
```

Expected: FAIL because `WalletScreen` does not accept unlink dependencies or render actions.

- [ ] **Step 3: Implement the screen-local mutation state**

Add optional `unlinkDependencies?: WalletUnlinkDependencies`. Track:

```ts
type WalletUnlinkViewState =
  | { status: "idle" }
  | { address: `0x${string}`; status: "confirming" | "unlinking" | "syncing" }
  | { address: `0x${string}`; status: "unlink_error" | "sync_error" | "complete" };
```

Use the workflow results to enter `unlink_error`, `sync_error`, or `complete`. `Retry wallet sync` calls only `retryWalletSync`. While `complete`, remove that address from the identity passed to `WalletIdentitySection`; clear complete state after Privy metadata no longer includes it.

- [ ] **Step 4: Implement the stable row action UI**

Extend `WalletIdentitySection` with state and callbacks. Use a fixed 44x44 `Pressable` containing `Trash2` or `ActivityIndicator`. Render it only when `canUnlinkWallet` is true and dependencies exist. Provide:

```tsx
accessibilityLabel={`Unlink wallet ${shortAddress(wallet.address)}`}
accessibilityHint="Removes this external wallet after confirmation"
accessibilityRole="button"
```

Render unlink and synchronization errors below the linked-wallet list, not as nested cards. Use the shared `Button` only for the explicit `Retry wallet sync` command.

- [ ] **Step 5: Run the screen tests and verify GREEN**

Run:

```bash
npx vitest run src/features/wallet/__tests__/WalletScreen.test.tsx src/features/wallet/__tests__/walletUnlinkWorkflow.test.ts
```

Expected: both files pass without console warnings.

- [ ] **Step 6: Commit**

```bash
git add src/features/wallet/__tests__/WalletScreen.test.tsx src/features/wallet/components/WalletIdentitySection.tsx src/features/wallet/screens/WalletScreen.tsx
git commit -m "feat: add controlled wallet unlink UI"
```

## Task 5: Privy And Navigation Integration

**Files:**

- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`
- Modify: `src/app/navigation/AppNavigator.tsx`
- Modify: `src/app/AppRoot.tsx`

- [ ] **Step 1: Write a failing protected-route propagation test**

In the authenticated Wallet navigation test, supply `walletUnlinkDependencies` and assert the eligible external row exposes its unlink action. Also prove the logged-out tree does not receive or expose mutation dependencies.

- [ ] **Step 2: Run the navigator test and verify RED**

Run:

```bash
npx vitest run src/app/navigation/__tests__/AppNavigator.test.tsx
```

Expected: FAIL because the navigator has no unlink dependency prop.

- [ ] **Step 3: Thread optional dependencies through navigation**

Add `walletUnlinkDependencies?: WalletUnlinkDependencies` to `AppNavigator` and `MainTabs`, pass it only through the authenticated branch, and supply it to `WalletScreen`.

- [ ] **Step 4: Bind the Privy hook in AppRoot**

Import `useUnlinkWallet` and call it inside `AuthRuntime`. Pass the function into `AuthGateRuntime`. After `useAuthActions()` is available, memoize:

```ts
const walletUnlinkDependencies = useMemo(
  () => createWalletUnlinkDependencies({
    refreshSession: actions.refreshSession,
    unlinkWallet,
  }),
  [actions.refreshSession, unlinkWallet],
);
```

Pass the dependencies to `AppNavigator`. Do not add a URL, token, user id, or wallet-login call to any TSX component.

- [ ] **Step 5: Run integration tests and typecheck**

Run:

```bash
npx vitest run src/app/navigation/__tests__/AppNavigator.test.tsx src/app/providers/__tests__/AuthProvider.test.tsx src/features/wallet/__tests__/WalletScreen.test.tsx
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/navigation/__tests__/AppNavigator.test.tsx src/app/navigation/AppNavigator.tsx src/app/AppRoot.tsx
git commit -m "feat: connect Privy wallet unlink runtime"
```

## Task 6: Full Verification And Delivery Evidence

**Files:**

- Create: `docs/ai-delivery/runs/2026-07-17-rn-wallet-controlled-unlink-verification.md`

- [ ] **Step 1: Run focused forbidden scans**

Run:

```bash
node scripts/verify-no-match.mjs -e "functions/v1" -e "wallet-login" -e "privyToken" -e "accessToken" -e "wallet-select" -e "sync-wallets" src/features/wallet --glob "*.tsx"
node scripts/verify-no-match.mjs -e "writeContract" -e "sendTransaction" -e "switchChain" -e "useActiveWallet" -e "useWallets" src/features/wallet src/app/AppRoot.tsx --glob "*.ts" --glob "*.tsx"
```

Expected: both scans report no matches.

- [ ] **Step 2: Run complete automated verification**

Run:

```bash
npm test
npm run typecheck
npm run ai:audit -- rn-full-app-port
```

Expected: all tests pass, typecheck exits 0, and AI Delivery audit passes.

- [ ] **Step 3: Record verification evidence**

Create the run document with exact commands, pass/fail results, test counts, security review, data boundary review, rollback behavior, and these residual manual checks:

- iOS and Android native confirmation rendering;
- real Privy external-wallet unlink;
- offline `wallet-login` refresh failure followed by retry;
- verification that the backend row becomes `status='removed'` after refresh;
- confirmation that the active wallet, account id, KYC, points, and referrals remain unchanged.

- [ ] **Step 4: Run AI Delivery verification**

Run:

```bash
npm run ai:verify -- rn-full-app-port --write
```

Expected: verification artifact is updated without a failed deterministic gate.

- [ ] **Step 5: Commit verification evidence**

```bash
git add docs/ai-delivery/runs/2026-07-17-rn-wallet-controlled-unlink-verification.md docs/ai-delivery/runs/2026-07-17-rn-full-app-port-verification.md
git commit -m "docs: verify controlled mobile wallet unlink"
```

## Completion Gate

- Task 8D only; no wallet switching, connection, transfer, or signing.
- Privy unlink is called at most once per confirmed operation.
- Post-unlink failures retry `wallet-login` session refresh only.
- Auth refresh failure preserves the current session and viewer.
- Active, embedded, and final Ethereum wallets never expose unlink.
- No backend/schema deployment is required.
- Full tests, typecheck, security scans, AI Delivery audit, and device QA evidence are complete before merge.
