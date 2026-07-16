# Mobile Wallet Read-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an authenticated, wallet-management-first mobile Wallet that displays the server-verified address, linked-wallet metadata, BSC balances, QR receive information, copy, text share, and branded image share without exposing any wallet write operation.

**Architecture:** `AppRoot` maps Privy SDK data into a narrow metadata snapshot and injects default Wallet services into the authenticated navigation tree. Pure domain mappers keep the `wallet-login` viewer address authoritative; repositories isolate Supabase asset discovery and failure-tolerant Viem reads; `WalletScreen` owns only explicit view state and composes focused sections. Platform adapters own clipboard, native share, view capture, temporary files, and cleanup.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript, Privy Expo, Supabase, Viem, `react-native-qrcode-styled`, `react-native-view-shot`, `expo-sharing`, `expo-file-system`, Vitest, React Test Renderer.

---

## Delivery Boundary

This plan implements Task 8A, 8B, and 8C from the approved design. It does not add transfer, signing, `sendTransaction`, `writeContract`, wallet connection, active-wallet switching, chain switching, or unlink controls. Passkey MFA is informational on this read-only screen and does not authorize any client-side action.

The active address always comes from `AuthViewer.walletAddress`, which is populated by the authenticated `wallet-login` response. Privy linked accounts may label that address and list additional wallets, but they cannot replace it. Missing or invalid viewer addresses stop all chain reads.

## File Map

- Modify `src/app/config/publicConfig.ts`: parse the supported public BSC chain ID and report invalid values as fatal configuration.
- Modify `src/app/config/FatalConfigScreen.tsx`: render invalid public values as well as missing keys.
- Modify `src/lib/chain/publicChainRegistry.ts`: centralize BSC metadata, clients, native currency, explorer origin, and USDT addresses.
- Create `src/features/wallet/domain/walletModels.ts`: stable Wallet identity, balance, chain, and dependency contracts.
- Create `src/features/wallet/domain/walletIdentity.ts`: deterministic Privy metadata and authoritative viewer-address mapping.
- Create `src/features/wallet/services/walletAssetContractRepository.ts`: discover configured-chain ART contracts through Supabase.
- Create `src/features/wallet/services/walletBalanceReader.ts`: failure-tolerant native/ERC-20 chain reads and decimal formatting.
- Create `src/features/wallet/services/walletBalanceLoader.ts`: combine asset discovery and chain reads while preserving partial failures.
- Create `src/features/wallet/services/createDefaultWalletServices.ts`: compose registry, Supabase, chain readers, clipboard, and share adapters.
- Create `src/features/wallet/workflow/walletReceiveActions.ts`: deterministic copy/text-share messages and feedback results.
- Create `src/features/wallet/services/walletImageShareAdapter.ts`: capture, share, and always remove the temporary PNG.
- Create `src/features/wallet/components/WalletIdentitySection.tsx`: verified address, linked wallets, and security metadata.
- Create `src/features/wallet/components/WalletBalanceSection.tsx`: skeleton, balances, partial errors, discovery errors, and retry.
- Create `src/features/wallet/components/WalletReceiveSection.tsx`: QR, full address, and icon actions.
- Create `src/features/wallet/components/WalletReceiveShareCard.tsx`: fixed-format branded capture target without balances or private metadata.
- Create `src/features/wallet/screens/WalletScreen.tsx`: explicit load/action state and responsive section composition.
- Modify `src/app/AppRoot.tsx`: inject public chain config, Privy metadata, and default Wallet dependencies.
- Modify `src/app/navigation/AppNavigator.tsx`: add protected Wallet detail state and connect the Profile entry.
- Modify test mocks and Vitest aliases only for native modules introduced by this plan.

### Task 1: Public Chain Configuration And Registry

**Files:**
- Modify: `src/app/config/publicConfig.ts`
- Modify: `src/app/config/FatalConfigScreen.tsx`
- Modify: `src/app/config/__tests__/publicConfig.test.ts`
- Modify: `src/app/config/__tests__/FatalConfigScreen.test.tsx`
- Modify: `src/lib/chain/publicChainRegistry.ts`
- Create: `src/lib/chain/__tests__/publicChainRegistry.test.ts`

- [ ] **Step 1: Write failing public-config tests**

Add cases proving omission defaults to testnet, `56`/`97` are accepted, whitespace is normalized, and any other non-empty value is fatal:

```ts
it.each([
  [undefined, 97],
  [" 56 ", 56],
  ["97", 97],
])("maps EXPO_PUBLIC_CHAIN_ID=%s to %s", (value, chainId) => {
  const result = parsePublicConfig(validEnv({
    ...(value ? { EXPO_PUBLIC_CHAIN_ID: value } : {}),
  }));
  expect(result).toMatchObject({ ok: true, config: { chainId } });
});

it.each(["0", "1", "98", "bsc", "56.0"])(
  "rejects unsupported chain value %s",
  (value) => {
    expect(parsePublicConfig(validEnv({ EXPO_PUBLIC_CHAIN_ID: value })))
      .toEqual({ invalidKeys: ["EXPO_PUBLIC_CHAIN_ID"], missingKeys: [], ok: false });
  },
);
```

Extend the fatal-screen test with `invalidKeys={["EXPO_PUBLIC_CHAIN_ID"]}` and assert that the key is visible without rendering the rejected value.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- src/app/config`

Expected: FAIL because `PublicConfig` has no `chainId`, invalid config has no `invalidKeys`, and `FatalConfigScreen` does not accept `invalidKeys`.

- [ ] **Step 3: Implement strict chain parsing**

Use these exact result and config shapes:

```ts
export type SupportedPublicChainId = 56 | 97;

export type PublicConfig = {
  chainId: SupportedPublicChainId;
  privyAppId: string;
  privyClientId?: string;
  publicWebOrigin?: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
  walletLoginPath: string;
};

export type PublicConfigResult =
  | { config: PublicConfig; ok: true }
  | { invalidKeys: string[]; missingKeys: string[]; ok: false };

function parseChainId(value: string | undefined): SupportedPublicChainId | null {
  if (value === undefined) return 97;
  if (value === "56") return 56;
  if (value === "97") return 97;
  return null;
}
```

Add `EXPO_PUBLIC_CHAIN_ID` to `PublicConfigEnv` and `readPublicConfig`. Return `invalidKeys: ["EXPO_PUBLIC_CHAIN_ID"]` when `parseChainId` returns `null`; always include `invalidKeys: []` on other fatal results. Change `FatalConfigScreen` to accept both arrays and render the safe message `Unsupported public configuration` for invalid keys.

- [ ] **Step 4: Write and run registry tests**

Test a pure accessor rather than making an RPC request:

```ts
it.each([
  [56, "BNB Smart Chain", "BNB", "https://bscscan.com"],
  [97, "BNB Smart Chain Testnet", "BNB", "https://testnet.bscscan.com"],
] as const)("returns metadata for chain %s", (chainId, name, nativeSymbol, explorerOrigin) => {
  expect(getPublicChainConfig(chainId)).toMatchObject({
    chainId,
    explorerOrigin,
    name,
    nativeSymbol,
  });
  expect(getPublicChainConfig(chainId).usdtAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
});

it("rejects unsupported chains", () => {
  expect(() => getPublicChainConfig(1)).toThrow("Unsupported public chain: 1");
});
```

Implement and export:

```ts
export type PublicChainConfig = {
  chainId: 56 | 97;
  explorerOrigin: string;
  name: string;
  nativeDecimals: 18;
  nativeSymbol: "BNB";
  usdtAddress: `0x${string}`;
};

export function getPublicChainConfig(chainId: number): PublicChainConfig {
  const config = PUBLIC_CHAIN_CONFIGS[chainId as 56 | 97];
  if (!config) throw new Error(`Unsupported public chain: ${chainId}`);
  return config;
}
```

Make `getUsdtAddress` delegate to this registry for `56`/`97`, and keep returning `null` for unsupported callers. Make `getPublicChainClient` use the same supported-chain decision.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/config src/lib/chain && npm run typecheck`

Expected: all focused tests PASS and TypeScript exits 0.

```bash
git add src/app/config src/lib/chain
git commit -m "feat: configure wallet public chain"
```

### Task 2: Authoritative Wallet Identity Mapping

**Files:**
- Create: `src/features/wallet/domain/walletModels.ts`
- Create: `src/features/wallet/domain/walletIdentity.ts`
- Create: `src/features/wallet/__tests__/walletIdentity.test.ts`

- [ ] **Step 1: Write failing identity tests**

Cover these inputs: missing viewer address, invalid viewer address, active address present in Privy metadata, active address absent from Privy metadata, case-insensitive deduplication, non-EVM accounts excluded, and passkey MFA state.

```ts
it("keeps the wallet-login viewer address authoritative", () => {
  const identity = mapWalletIdentity(
    viewer("0x0000000000000000000000000000000000000008"),
    {
      passkeyMfaEnabled: true,
      wallets: [
        wallet("0x0000000000000000000000000000000000000009", "embedded"),
        wallet("0x0000000000000000000000000000000000000008", "external"),
      ],
    },
  );

  expect(identity?.activeAddress).toBe("0x0000000000000000000000000000000000000008");
  expect(identity?.wallets.map(({ address, status }) => ({ address, status }))).toEqual([
    { address: "0x0000000000000000000000000000000000000008", status: "active" },
    { address: "0x0000000000000000000000000000000000000009", status: "linked" },
  ]);
  expect(identity?.passkeyMfaEnabled).toBe(true);
});

it.each([null, "", "not-an-address"])("does not create identity for %s", (walletAddress) => {
  expect(mapWalletIdentity(viewer(walletAddress), EMPTY_PRIVY_WALLET_METADATA)).toBeNull();
});
```

- [ ] **Step 2: Run the identity test and verify RED**

Run: `npm test -- src/features/wallet/__tests__/walletIdentity.test.ts`

Expected: FAIL because the Wallet domain does not exist.

- [ ] **Step 3: Add stable domain contracts**

Define these contracts in `walletModels.ts`:

```ts
export type WalletKind = "embedded" | "external";
export type WalletLinkStatus = "active" | "linked";

export type PrivyWalletMetadata = {
  passkeyMfaEnabled: boolean;
  wallets: Array<{
    address: string;
    kind: WalletKind;
    providerLabel: string;
  }>;
};

export const EMPTY_PRIVY_WALLET_METADATA: PrivyWalletMetadata = {
  passkeyMfaEnabled: false,
  wallets: [],
};

export type WalletIdentity = {
  activeAddress: `0x${string}`;
  passkeyMfaEnabled: boolean;
  wallets: Array<{
    address: `0x${string}`;
    kind: WalletKind;
    providerLabel: string;
    status: WalletLinkStatus;
  }>;
};
```

- [ ] **Step 4: Implement pure Privy metadata and identity mappers**

`mapPrivyWalletMetadata` accepts only a serializable SDK-shaped boundary, filters `type === "wallet" && chain_type === "ethereum"`, validates with Viem `isAddress`, classifies embedded wallets when `connector_type === "embedded"` or `wallet_client_type === "privy"`, and derives MFA only from `mfa_methods.some(method => method.type === "passkey")`.

```ts
export function mapWalletIdentity(
  viewer: AuthViewer | null,
  metadata: PrivyWalletMetadata,
): WalletIdentity | null {
  if (!viewer?.walletAddress || !isAddress(viewer.walletAddress)) return null;
  const activeAddress = getAddress(viewer.walletAddress);
  const deduped = dedupeWallets(metadata.wallets);
  const active = deduped.find((item) => sameAddress(item.address, activeAddress)) ?? {
    address: activeAddress,
    kind: "external" as const,
    providerLabel: "Verified wallet",
  };
  return {
    activeAddress,
    passkeyMfaEnabled: metadata.passkeyMfaEnabled,
    wallets: [
      { ...active, address: activeAddress, status: "active" },
      ...deduped
        .filter((item) => !sameAddress(item.address, activeAddress))
        .map((item) => ({ ...item, address: getAddress(item.address), status: "linked" as const })),
    ],
  };
}
```

Do not import React, Supabase, or Privy hooks into either domain file.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/wallet/__tests__/walletIdentity.test.ts && npm run typecheck`

Expected: PASS and TypeScript exits 0.

```bash
git add src/features/wallet/domain src/features/wallet/__tests__/walletIdentity.test.ts
git commit -m "feat: map verified wallet identity"
```

### Task 3: Protected Wallet Detail Navigation And Runtime Injection

**Files:**
- Modify: `src/app/AppRoot.tsx`
- Modify: `src/app/navigation/AppNavigator.tsx`
- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`
- Create: `src/features/wallet/screens/WalletScreen.tsx`

- [ ] **Step 1: Write failing navigation tests**

Add a minimal `WalletScreen` dependency fixture and prove authentication, route chrome, back navigation, and state reset:

```ts
it("opens Wallet from authenticated Profile as a protected detail route", async () => {
  const renderer = await renderAuthenticatedProfile({ walletDependencies: walletDependencies() });
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Profile item Wallet" }).props.onPress());
  expect(renderer.root.findByProps({ accessibilityLabel: "Wallet screen" })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: "Header title Wallet" })).toBeTruthy();
  expect(renderer.root.findAllByProps({ accessibilityLabel: "Tab My" })).toHaveLength(0);
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Back" }).props.onPress());
  expect(renderer.root.findByProps({ accessibilityLabel: "Tab My" }).props.accessibilityState)
    .toEqual({ selected: true });
});

it("starts login instead of opening Wallet for a logged-out Profile", async () => {
  const actions = createActions();
  const renderer = await renderLoggedOutProfile(actions);
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Profile item Wallet" }).props.onPress());
  expect(actions.login).toHaveBeenCalledOnce();
  expect(renderer.root.findAllByProps({ accessibilityLabel: "Wallet screen" })).toHaveLength(0);
});
```

Update the existing logout/viewer-change test to open Wallet first, update `AppNavigator`, and assert that no Wallet screen remains. The existing `key={authenticated:${viewer.id}}` boundary must continue to clear private state.

- [ ] **Step 2: Run navigation tests and verify RED**

Run: `npm test -- src/app/navigation/__tests__/AppNavigator.test.tsx`

Expected: FAIL because the Wallet profile item has no handler and no detail screen is rendered.

- [ ] **Step 3: Add a narrow detail-route state**

Replace the asset-only detail state with this discriminated union:

```ts
type DetailRoute =
  | { assetId: string; kind: "asset"; placeholder: PublicAssetSummary; returnTo: MainTabRouteName }
  | { kind: "wallet"; returnTo: "profile" };
```

When `kind === "wallet"`, pass `getHeaderConfig("wallet", authStatus)`, hide tabs, render the Wallet screen, and make Back restore Profile. Add `onWalletPress` to `ProfileRoute`; for logged-out users call `onLogin`, and for authenticated users set `{ kind: "wallet", returnTo: "profile" }`.

The initial route `wallet` must open the Wallet detail only when authenticated. Logged-out `initialRouteName="wallet"` continues to fall back to Launchpad through existing route access behavior.

- [ ] **Step 4: Inject SDK metadata without moving authority into Privy**

In `AuthRuntime`, destructure `user` alongside `getAccessToken` and `logout`, create metadata with `useMemo(() => mapPrivyWalletMetadata(user), [user])`, and pass it through `AuthGateRuntime` to `AppNavigator`. Keep auth workflow construction unchanged.

Add these navigator props:

```ts
privyWalletMetadata?: PrivyWalletMetadata;
walletDependencies?: WalletDataDependencies;
walletChain?: PublicChainConfig;
```

Default metadata to `EMPTY_PRIVY_WALLET_METADATA`; provide a no-network empty Wallet dependency only for tests where no runtime dependency was injected. `WalletScreen` receives `viewerState`, metadata, chain, and dependencies. It must not call `usePrivy`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/app/navigation src/features/wallet && npm run typecheck`

Expected: navigation tests PASS, the initial Wallet screen is reachable only through authenticated navigation, and TypeScript exits 0.

```bash
git add src/app/AppRoot.tsx src/app/navigation src/features/wallet/screens/WalletScreen.tsx
git commit -m "feat: add protected wallet route"
```

### Task 4: Configured-Chain ART Contract Discovery

**Files:**
- Modify: `src/features/wallet/domain/walletModels.ts`
- Create: `src/features/wallet/services/walletAssetContractRepository.ts`
- Create: `src/features/wallet/__tests__/walletAssetContractRepository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

The fake PostgREST builder must record `.eq("chain_id", 97)`, `.eq("is_deleted", false)`, and the exact selected columns. Test trimming, invalid-address rejection, duplicate-address removal, symbol fallback, and query failure.

```ts
it("returns unique valid ART contracts for the configured chain", async () => {
  const fake = createFakeClient([
    rawAsset("asset-1", address(1), " ART1 "),
    rawAsset("asset-2", address(1).toUpperCase(), "DUP"),
    rawAsset("asset-3", "invalid", "BAD"),
  ]);
  const result = await createWalletAssetContractRepository(fake.client).fetchByChain(97);
  expect(fake.calls).toContainEqual(["eq", "chain_id", 97]);
  expect(fake.calls).toContainEqual(["eq", "is_deleted", false]);
  expect(result).toEqual([{ address: getAddress(address(1)), id: "asset-1", imageUrl: null, symbol: "ART1" }]);
});
```

- [ ] **Step 2: Run the repository test and verify RED**

Run: `npm test -- src/features/wallet/__tests__/walletAssetContractRepository.test.ts`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the read-only repository**

Add the stable model:

```ts
export type WalletAssetContract = {
  address: `0x${string}`;
  id: string;
  imageUrl: string | null;
  symbol: string;
};

export type WalletAssetContractRepository = {
  fetchByChain(chainId: 56 | 97): Promise<WalletAssetContract[]>;
};
```

Query only:

```ts
client.from("art_assets")
  .select("id, symbol, contract_address, artwork_submissions!submission_id(image_urls)")
  .eq("chain_id", chainId)
  .eq("is_deleted", false);
```

Map with `isAddress`/`getAddress`, retain the first row for a case-insensitive address, use `ART` when the symbol is empty, and throw `Unable to discover wallet assets: <message>` on query failure. There are no insert, update, delete, or service-role paths.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/features/wallet/__tests__/walletAssetContractRepository.test.ts && npm run typecheck`

Expected: PASS and TypeScript exits 0.

```bash
git add src/features/wallet/domain/walletModels.ts src/features/wallet/services/walletAssetContractRepository.ts src/features/wallet/__tests__/walletAssetContractRepository.test.ts
git commit -m "feat: discover wallet asset contracts"
```

### Task 5: Failure-Tolerant BNB, USDT, And ART Balance Reads

**Files:**
- Modify: `src/features/wallet/domain/walletModels.ts`
- Create: `src/features/wallet/services/walletBalanceReader.ts`
- Create: `src/features/wallet/services/walletBalanceLoader.ts`
- Create: `src/features/wallet/__tests__/walletBalanceReader.test.ts`
- Create: `src/features/wallet/__tests__/walletBalanceLoader.test.ts`

- [ ] **Step 1: Write failing chain-reader tests**

Use a fake client with `getBalance` and `multicall`. Cover native zero, USDT zero, ART positive, ART zero filtered, ART decimals not equal to 18, large `bigint`, failed native read, failed token decimals, failed token balance, and a rejected multicall.

```ts
it("keeps base rows, uses contract decimals, and filters ready zero ART", async () => {
  const result = await createWalletBalanceReader(client({
    native: 2_000_000_000_000_000_000n,
    tokens: [
      success(6), success(0n),
      success(8), success(123_456_789n),
      success(18), success(0n),
    ],
  })).read({
    address: address(8),
    assets: [asset("art-1", address(1), "ART8"), asset("art-2", address(2), "ZERO")],
    chain: chainConfig,
  });

  expect(result.map(({ symbol, status, displayAmount }) => ({ symbol, status, displayAmount })))
    .toEqual([
      { displayAmount: "2", status: "ready", symbol: "BNB" },
      { displayAmount: "0", status: "ready", symbol: "USDT" },
      { displayAmount: "1.23456789", status: "ready", symbol: "ART8" },
    ]);
});

it("does not turn failed reads into zero", async () => {
  const result = await createWalletBalanceReader(client({
    nativeError: new Error("rpc unavailable"),
    tokens: [failure(), failure(), failure(), failure()],
  })).read({ address: address(8), assets: [asset("art-1", address(1), "ART")], chain: chainConfig });
  expect(result).toEqual([
    expect.objectContaining({ status: "unavailable", symbol: "BNB" }),
    expect.objectContaining({ status: "unavailable", symbol: "USDT" }),
    expect.objectContaining({ status: "unavailable", symbol: "ART" }),
  ]);
  expect(JSON.stringify(result)).not.toContain('"displayAmount":"0"');
});
```

- [ ] **Step 2: Run reader tests and verify RED**

Run: `npm test -- src/features/wallet/__tests__/walletBalanceReader.test.ts`

Expected: FAIL because reader contracts do not exist.

- [ ] **Step 3: Implement explicit balance states**

Add these models:

```ts
export type WalletBalanceRow = {
  contractAddress: `0x${string}` | null;
  displayAmount?: string;
  id: string;
  imageUrl: string | null;
  kind: "native" | "usdt" | "art";
  status: "ready" | "unavailable";
  symbol: string;
};

export type WalletBalanceLoadResult = {
  artDiscoveryStatus: "ready" | "unavailable";
  rows: WalletBalanceRow[];
};
```

Keep raw values as `bigint`. Read native balance independently with `Promise.allSettled`. Build two multicall contracts per ERC-20 (`decimals`, `balanceOf`) with `allowFailure: true`. A row becomes ready only when decimals is an integer from 0 through 255 and balance is `bigint`. Use `formatUnits`; never default failed decimals to 6 or 18. Preserve unavailable ART rows because their positivity is unknown; remove an ART row only when its successful raw balance is exactly `0n`.

- [ ] **Step 4: Write failing loader tests**

```ts
it("keeps BNB and USDT when ART discovery fails", async () => {
  const assetRepository = { fetchByChain: vi.fn().mockRejectedValue(new Error("db unavailable")) };
  const balanceReader = { read: vi.fn().mockResolvedValue(baseRows()) };
  await expect(createWalletBalanceLoader({ assetRepository, balanceReader })({
    address: address(8), chain: chainConfig,
  })).resolves.toEqual({ artDiscoveryStatus: "unavailable", rows: baseRows() });
  expect(balanceReader.read).toHaveBeenCalledWith({ address: address(8), assets: [], chain: chainConfig });
});
```

Also prove successful discovery is passed to the reader and a reader-level rejection returns unavailable base rows rather than zero rows.

- [ ] **Step 5: Implement the loader boundary**

`createWalletBalanceLoader` first attempts discovery, records `artDiscoveryStatus`, then invokes the reader. If the reader rejects entirely, return BNB and USDT unavailable rows plus an unavailable row for every discovered ART contract. The loader never receives a route parameter address; callers pass the mapped identity address only.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/features/wallet/__tests__/walletBalanceReader.test.ts src/features/wallet/__tests__/walletBalanceLoader.test.ts && npm run typecheck`

Expected: PASS, including partial failures and non-18 ART decimals.

```bash
git add src/features/wallet/domain src/features/wallet/services/walletBalanceReader.ts src/features/wallet/services/walletBalanceLoader.ts src/features/wallet/__tests__
git commit -m "feat: read wallet balances safely"
```

### Task 6: Wallet Screen States And Responsive Layout

**Files:**
- Create: `src/features/wallet/components/WalletIdentitySection.tsx`
- Create: `src/features/wallet/components/WalletBalanceSection.tsx`
- Modify: `src/features/wallet/screens/WalletScreen.tsx`
- Create: `src/features/wallet/__tests__/WalletScreen.test.tsx`
- Modify: `test/mocks/react-native.tsx`

- [ ] **Step 1: Extend the React Native test mock**

Export deterministic `useWindowDimensions` and `RefreshControl` support:

```ts
export function useWindowDimensions() {
  return { fontScale: 1, height: 844, scale: 3, width: 390 };
}

export function RefreshControl(props: Props) {
  return React.createElement("RefreshControl", props);
}
```

Tests that need tablet layout should spy on this export and return width `900`.

- [ ] **Step 2: Write failing screen-state tests**

Cover missing verified address, initial skeleton, ready base rows, linked-wallet labels, Passkey enabled/not enabled, partial unavailable rows, ART discovery warning, retry, large balances, and tablet columns.

```ts
it("does not query chain without a verified viewer wallet", async () => {
  const dependencies = walletDependencies();
  const renderer = await renderWallet({ dependencies, viewerState: viewerState(null) });
  expect(text(renderer)).toContain("Wallet unavailable");
  expect(dependencies.loadBalances).not.toHaveBeenCalled();
});

it("shows successful rows beside a failed token and retries", async () => {
  const dependencies = walletDependencies({
    rows: [readyNative("1.25"), unavailableUsdt(), readyArt("ART1", "9007199254740993")],
  });
  const renderer = await renderWallet({ dependencies });
  expect(text(renderer)).toContain("1.25");
  expect(text(renderer)).toContain("Unavailable");
  expect(text(renderer)).toContain("9007199254740993");
  await act(async () => renderer.root.findByProps({ accessibilityLabel: "Refresh wallet balances" }).props.onPress());
  expect(dependencies.loadBalances).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 3: Run the screen test and verify RED**

Run: `npm test -- src/features/wallet/__tests__/WalletScreen.test.tsx`

Expected: FAIL because the real screen sections and load state are absent.

- [ ] **Step 4: Implement explicit screen state**

Use this state rather than interdependent booleans:

```ts
type WalletLoadState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { data: WalletBalanceLoadResult; status: "ready" }
  | { status: "error" };
```

Derive identity synchronously with `mapWalletIdentity`. In an effect keyed by `identity?.activeAddress`, `chain.chainId`, and stable `loadBalances`, set loading and fetch. Use an `active` cleanup flag so logout/viewer changes cannot write stale results. Retry invokes the same `useCallback` loader. Do not poll.

- [ ] **Step 5: Implement the wallet-management-first sections**

Use one `ScrollView` with `contentContainerStyle`. Phone order is Identity, Linked Wallets, Security, Balances, Receive. At `width >= 768`, render two `View` columns: identity/security left and balances/receive right, each `flexBasis: 340`, `minWidth: 0`, with a 24px gap. Do not nest cards inside cards.

Identity rows show shortened addresses visually and retain full addresses in accessibility labels. Labels are `Active`/`Linked` and `Embedded`/`External`. Security text is `Passkey MFA enabled` or `Passkey MFA not enabled`; supporting text states that transfers are unavailable, without a disabled transfer button.

Balance skeletons use fixed 64px rows. Ready rows show symbol, native/contract label, short contract address where present, and a right-aligned amount with `numberOfLines={1}` plus `adjustsFontSizeToFit`. Unavailable rows display `Unavailable`, never `0`. A discovery warning reads `ART token discovery unavailable`; it does not replace BNB/USDT rows.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/features/wallet/__tests__/WalletScreen.test.tsx && npm run typecheck`

Expected: PASS for phone/tablet, missing identity, skeleton, ready, and partial-error states.

```bash
git add src/features/wallet/components src/features/wallet/screens src/features/wallet/__tests__/WalletScreen.test.tsx test/mocks/react-native.tsx
git commit -m "feat: build read-only wallet screen"
```

### Task 7: QR Receive, Copy, And Text Share

**Files:**
- Create: `src/features/wallet/workflow/walletReceiveActions.ts`
- Create: `src/features/wallet/components/WalletReceiveSection.tsx`
- Modify: `src/features/wallet/screens/WalletScreen.tsx`
- Create: `src/features/wallet/__tests__/walletReceiveActions.test.ts`
- Modify: `src/features/wallet/__tests__/WalletScreen.test.tsx`
- Modify: `vitest.config.ts`
- Create: `test/mocks/react-native-qrcode-styled.tsx`

- [ ] **Step 1: Write failing receive-action tests**

```ts
it("copies only the verified public address", async () => {
  const clipboard = { setString: vi.fn().mockResolvedValue(undefined) };
  await expect(copyWalletAddress({ address: address(8), clipboard })).resolves.toBe("copied");
  expect(clipboard.setString).toHaveBeenCalledWith(address(8));
});

it("shares deterministic chain and address text", async () => {
  const share = { share: vi.fn().mockResolvedValue("shared") };
  await expect(shareWalletAddress({ address: address(8), chain: chainConfig, share }))
    .resolves.toBe("shared");
  expect(share.share).toHaveBeenCalledWith({
    message: `Receive on BNB Smart Chain Testnet only.\n${address(8)}`,
    title: "Receive BNB wallet assets",
  });
});
```

Add rejection and cancellation cases. Rejection maps to `unavailable`; cancellation maps to `cancelled` and is not an error.

- [ ] **Step 2: Run workflow tests and verify RED**

Run: `npm test -- src/features/wallet/__tests__/walletReceiveActions.test.ts`

Expected: FAIL because the workflow does not exist.

- [ ] **Step 3: Implement platform-neutral workflows**

Define narrow adapters:

```ts
export type WalletClipboardAdapter = { setString(value: string): Promise<void> };
export type WalletTextShareAdapter = {
  share(input: { message: string; title: string }): Promise<"cancelled" | "shared">;
};
export type WalletActionResult = "cancelled" | "copied" | "shared" | "unavailable";
```

Catch adapter exceptions and return `unavailable`; do not log the address or exception payload. Update the React Native share adapter to inspect `Share.share` results and return `cancelled` only for `Share.dismissedAction`.

- [ ] **Step 4: Add a deterministic QR mock and failing screen tests**

Alias `react-native-qrcode-styled` to a mock that renders a host `QRCodeStyled` element. Assert its `data` equals the authoritative address, the full address is visible, and icon actions have accessibility labels `Copy wallet address`, `Share wallet address as text`, and `Share wallet address as image`.

- [ ] **Step 5: Implement the receive section**

Use `react-native-qrcode-styled` with a stable square size, white background, dark modules, error correction `H`, and Android `pieceScale={1.02}`. Render `BNB Smart Chain only`/`BNB Smart Chain Testnet only`, full selectable address, and Lucide `Copy`, `Share2`, and `Image` icon buttons with 44px hit targets and tooltips through accessibility hints. Show concise inline feedback for copy/share errors; clear success feedback on the next action. Cancellation returns to idle.

The component receives the address as a prop. It must not read route parameters, clipboard, Privy, Supabase, or environment variables.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/features/wallet/__tests__/walletReceiveActions.test.ts src/features/wallet/__tests__/WalletScreen.test.tsx && npm run typecheck`

Expected: PASS; QR and both public-address actions use the viewer-derived active address.

```bash
git add src/features/wallet test/mocks/react-native-qrcode-styled.tsx vitest.config.ts src/shared/platform/shareAdapter.ts
git commit -m "feat: add wallet receive actions"
```

### Task 8: Branded Image Capture, Sharing, And Cleanup

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/wallet/services/walletImageShareAdapter.ts`
- Create: `src/features/wallet/components/WalletReceiveShareCard.tsx`
- Modify: `src/features/wallet/components/WalletReceiveSection.tsx`
- Modify: `src/features/wallet/screens/WalletScreen.tsx`
- Create: `src/features/wallet/__tests__/walletImageShareAdapter.test.ts`
- Modify: `src/features/wallet/__tests__/WalletScreen.test.tsx`
- Modify: `vitest.config.ts`
- Create: `test/mocks/react-native-view-shot.ts`
- Create: `test/mocks/expo-sharing.ts`
- Create: `test/mocks/expo-file-system-legacy.ts`

- [ ] **Step 1: Install Expo-compatible dependencies**

Run: `npx expo install react-native-view-shot expo-sharing expo-file-system`

Expected: `package.json` and `package-lock.json` contain Expo-compatible versions and installation exits 0.

- [ ] **Step 2: Write failing adapter cleanup tests**

Inject capture, availability, share, and delete functions so tests do not touch native modules:

```ts
it.each([
  ["success", vi.fn().mockResolvedValue(undefined)],
  ["share failure", vi.fn().mockRejectedValue(new Error("share failed"))],
])("removes the temporary PNG after %s", async (_name, shareFile) => {
  const deleteFile = vi.fn().mockResolvedValue(undefined);
  const adapter = createWalletImageShareAdapter({
    capture: vi.fn().mockResolvedValue("file:///tmp/wallet.png"),
    deleteFile,
    isSharingAvailable: vi.fn().mockResolvedValue(true),
    shareFile,
  });
  await adapter.share({ current: {} });
  expect(deleteFile).toHaveBeenCalledWith("file:///tmp/wallet.png");
});

it("does not attempt cleanup when capture fails before a URI exists", async () => {
  const deleteFile = vi.fn();
  const adapter = createWalletImageShareAdapter({
    capture: vi.fn().mockRejectedValue(new Error("capture failed")),
    deleteFile,
    isSharingAvailable: vi.fn().mockResolvedValue(true),
    shareFile: vi.fn(),
  });
  await expect(adapter.share({ current: {} })).resolves.toBe("unavailable");
  expect(deleteFile).not.toHaveBeenCalled();
});
```

Also test sharing unavailable and cleanup rejection. Cleanup rejection must not expose a path or change a successful share into an error.

- [ ] **Step 3: Run the adapter test and verify RED**

Run: `npm test -- src/features/wallet/__tests__/walletImageShareAdapter.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 4: Implement the adapter with `finally` cleanup**

Use `captureRef(target, { format: "png", quality: 1, result: "tmpfile" })`, `Sharing.isAvailableAsync()`, `Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" })`, and `deleteAsync(uri, { idempotent: true })` from `expo-file-system/legacy`.

```ts
export type WalletImageShareAdapter = {
  share(target: { current: unknown }): Promise<"shared" | "unavailable">;
};

export function createWalletImageShareAdapter(io: WalletImageShareIo): WalletImageShareAdapter {
  return {
    async share(target) {
      let uri: string | null = null;
      try {
        if (!target.current || !(await io.isSharingAvailable())) return "unavailable";
        uri = await io.capture(target.current);
        await io.shareFile(uri);
        return "shared";
      } catch {
        return "unavailable";
      } finally {
        if (uri) {
          try { await io.deleteFile(uri); } catch { /* cleanup is best effort */ }
        }
      }
    },
  };
}
```

The short cleanup comment is retained because swallowing this error is a deliberate privacy/UX boundary. No filesystem path is logged.

- [ ] **Step 5: Implement the fixed-format capture card**

`WalletReceiveShareCard` renders at a stable width of 320px with white background, ArtStar product name, configured chain name, QR, and full address. It excludes balances, viewer ID, Privy ID, email, session/token values, and linked-wallet rows. Mount it outside the visible flow using absolute positioning and `left: -10000`; do not use `display: none`, because the native view must be capturable.

Forward a ref to the outer View. The visible image-share action calls the adapter with that ref and shows `Unable to share receive image. Try again.` on `unavailable`. A resolved native share sheet, including user dismissal where the API does not distinguish it, returns the screen to idle.

- [ ] **Step 6: Add module mocks and screen assertions**

Mock native modules at the Vitest alias boundary. Assert the capture card includes chain/address and excludes current balance text and viewer email. Assert repeated image-share taps do not run concurrently by disabling the action while its explicit state is `sharing_image`.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- src/features/wallet && npm run typecheck`

Expected: all Wallet tests PASS; temporary cleanup is proved after success and share failure.

```bash
git add package.json package-lock.json src/features/wallet test/mocks vitest.config.ts
git commit -m "feat: share wallet receive image"
```

### Task 9: Default Service Composition And Full Integration

**Files:**
- Create: `src/features/wallet/services/createDefaultWalletServices.ts`
- Create: `src/features/wallet/__tests__/createDefaultWalletServices.test.ts`
- Modify: `src/app/AppRoot.tsx`
- Modify: `src/app/navigation/AppNavigator.tsx`
- Modify: `src/app/navigation/__tests__/AppNavigator.test.tsx`

- [ ] **Step 1: Write a failing composition test**

Inject factory inputs and prove the configured chain is used consistently by asset discovery, client creation, and screen dependencies:

```ts
it("composes read-only services for the configured public chain", async () => {
  const createClient = vi.fn().mockReturnValue(readClient());
  const services = createWalletServices({
    chain: getPublicChainConfig(97),
    clipboard: clipboardAdapter,
    createClient,
    imageShare: imageShareAdapter,
    share: textShareAdapter,
    supabaseClient,
  });
  await services.loadBalances({ address: address(8), chain: getPublicChainConfig(97) });
  expect(createClient).toHaveBeenCalledWith(97);
});
```

- [ ] **Step 2: Run the composition test and verify RED**

Run: `npm test -- src/features/wallet/__tests__/createDefaultWalletServices.test.ts`

Expected: FAIL because default composition does not exist.

- [ ] **Step 3: Implement dependency composition**

`createDefaultWalletServices(chain)` delegates to `createWalletServices` with `supabase`, `getPublicChainClient`, `expoClipboardAdapter`, the native text-share adapter, and default image-share adapter. It returns a stable `WalletDataDependencies` object:

```ts
export type WalletDataDependencies = {
  clipboard: WalletClipboardAdapter;
  imageShare: WalletImageShareAdapter;
  loadBalances: WalletBalanceLoader;
  textShare: WalletTextShareAdapter;
};
```

Do not put changing balance state in `AppRoot`. Memoize the dependency object by `chain.chainId`; `WalletScreen` owns request state.

- [ ] **Step 4: Wire the validated config end-to-end**

`AppRoot` passes `publicConfig.config.chainId` into `getPublicChainConfig`, creates Wallet services once, and supplies both to `AppNavigator`. Fatal config renders before Privy or chain clients are created. Update the fatal screen call to pass both `missingKeys` and `invalidKeys`.

Navigation integration tests must prove `loadBalances` receives the viewer address and configured chain, not a linked Privy address. Add an assertion that a logged-out Wallet profile action makes zero chain/discovery calls.

- [ ] **Step 5: Verify focused integration and commit**

Run: `npm test -- src/app src/features/wallet src/lib/chain && npm run typecheck`

Expected: all focused tests PASS and TypeScript exits 0.

```bash
git add src/app src/features/wallet src/lib/chain
git commit -m "feat: integrate mobile wallet services"
```

### Task 10: Forbidden Scans, AI Delivery Audit, And Device QA

**Files:**
- Create after device execution: `docs/ai-delivery/runs/2026-07-16-rn-wallet-readonly-verification.md`
- Modify only if implementation status is recorded: `docs/plans/2026-07-02-rn-full-app-port-implementation.md`

- [ ] **Step 1: Run the full deterministic suite**

Run:

```bash
npm test -- src
npm run typecheck
npm run ai:audit -- rn-full-app-port
```

Expected: every command exits 0. Do not claim readiness if any command is red.

- [ ] **Step 2: Prove the Wallet delivery has no write capability**

Run:

```bash
node scripts/verify-no-match.mjs -e "writeContract" -e "sendTransaction" -e "unlinkWallet" -e "switchChain" -e "useWallets" -e "useActiveWallet" -e "approve\\(" -e "transfer\\(" src/features/wallet src/app/navigation/AppNavigator.tsx --glob "*.ts" --glob "*.tsx"
node scripts/verify-no-match.mjs -e "\\.from\\(.+\\)\\.insert" -e "\\.from\\(.+\\)\\.upsert" -e "\\.from\\(.+\\)\\.update" -e "\\.from\\(.+\\)\\.delete" src/features/wallet --glob "*.ts" --glob "*.tsx"
node scripts/verify-no-match.mjs -e "console\\.log.*token" -e "console\\.warn.*token" -e "console\\.error.*token" -e "console\\.log.*session" -e "console\\.warn.*session" -e "console\\.error.*session" -e "console\\.log.*signature" -e "console\\.warn.*signature" -e "console\\.error.*signature" -e "logger\\..*token" -e "logger\\..*session" -e "logger\\..*signature" src/ --glob "*.ts" --glob "*.tsx"
node scripts/verify-no-match.mjs -e "react-router-dom" -e "react-helmet-async" -e "@radix-ui" -e "className=" -e "window\\." -e "document\\." -e "sessionStorage\\." -e "localStorage\\." -e "navigator\\." src/ --glob "*.ts" --glob "*.tsx"
node scripts/verify-no-match.mjs "key=\\{.*index\\}" src/ --glob "*.tsx"
```

Expected: no matches. If a scan matches an existing unrelated file, document the exact pre-existing path and narrow the Wallet-specific gate without deleting user work.

- [ ] **Step 3: Perform security, data, performance, and business-boundary review**

Review the final diff and record explicit answers:

- The only authoritative address is `AuthViewer.walletAddress`.
- Missing identity causes no Supabase asset discovery or RPC read.
- Every chain amount remains `bigint` until `formatUnits`.
- Failed decimals/balance reads remain unavailable rather than zero.
- Contract addresses come only from the chain registry or validated configured-chain asset rows.
- The capture card contains only product name, public chain, public address, and QR.
- No high-frequency state or polling was added to an app-wide provider.
- No write, signature, transfer, switch, link, or unlink action is reachable.

- [ ] **Step 4: Run iOS and Android device QA**

Use an authenticated BSC Testnet `97` session first, then repeat the configuration check with Mainnet `56` without initiating writes. Verify:

- Narrow phone: all sections remain in the approved vertical order with no clipped address or amount.
- Tablet/wide: two columns appear without nested cards or overlap.
- Viewer with no wallet: Wallet unavailable and no RPC activity.
- BNB/USDT zero: both rows remain visible as `0`.
- ART zero: ready zero ART row is hidden.
- Positive ART with non-18 decimals: displayed value matches an independent explorer/RPC read.
- Weak/offline RPC: successful rows remain visible; failed rows show unavailable; Retry recovers.
- Copy: clipboard contains the full active address.
- Text share: chain and address are correct; cancellation returns to idle.
- Image share: branded PNG is legible, QR scans on a second device, balances are absent, cancellation/failure permits retry.
- Navigate away/back repeatedly and logout: Wallet state and metadata do not leak into the logged-out tree.

- [ ] **Step 5: Record evidence and final AI Delivery gates**

Create the verification run with command outputs summarized, device/OS/build identifiers, pass/fail for every QA item, residual risks, and rollback boundary. Do not include raw tokens, session values, emails, complete device identifiers, or non-public user data.

Run:

```bash
npm run ai:verify -- rn-full-app-port --write
npm run ai:ship -- rn-full-app-port
npm run ai:audit -- rn-full-app-port
```

Expected: audit passes. `ai:ship` may still report feature-level tasks outside Task 8A-C; report those as remaining `rn-full-app-port` scope rather than representing this Wallet slice as the entire port.

- [ ] **Step 6: Commit verification evidence**

```bash
git add docs/ai-delivery/runs/2026-07-16-rn-wallet-readonly-verification.md
git commit -m "docs: verify mobile wallet read-only flow"
```

When implementation status was recorded, stage it separately with `git add docs/plans/2026-07-02-rn-full-app-port-implementation.md`. Never stage `.env`, `.gstack/`, `.superpowers/`, tokens, or local QA captures.

## Acceptance Trace

| Approved behavior | Implementation task | Evidence |
| --- | --- | --- |
| Profile opens protected Wallet detail | Task 3 | `AppNavigator.test.tsx` |
| Viewer address is authoritative | Tasks 2, 3, 9 | identity and navigation tests |
| Linked wallets are metadata only | Tasks 2, 6 | identity and screen tests |
| Passkey is informational | Tasks 2, 6 | mapper and screen tests |
| Config supports only BSC 56/97, default 97 | Task 1 | config and registry tests |
| BNB/USDT always render, including zero | Tasks 5, 6 | reader and screen tests |
| Positive ART renders with on-chain decimals | Tasks 4, 5 | repository and reader tests |
| Failed reads never become zero | Tasks 5, 6 | partial-failure tests |
| QR/copy/text share use active public address | Task 7 | workflow and screen tests |
| Image share always cleans temporary file | Task 8 | adapter tests |
| No wallet write operation is reachable | Task 10 | forbidden scans and review |

## Rollback Boundary

Tasks 8A-C are read-only and can be rolled back by removing the Wallet detail entry and its injected dependencies. There are no database migrations, writes, signatures, transactions, or on-chain state to compensate. Dependency rollback must remove the three native packages together with their imports and native build artifacts; the existing Profile, Dashboard, Auth, Launchpad, Market, and Asset Detail behavior remains independent.
