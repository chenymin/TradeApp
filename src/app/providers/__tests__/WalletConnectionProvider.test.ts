import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("WalletConnectionProvider configuration", () => {
  it("uses the Ethers adapter, persistent storage, and BSC networks", () => {
    const source = readFileSync(
      resolve(root, "src/app/providers/WalletConnectionProvider.tsx"),
      "utf8",
    );

    expect(source).toContain("new EthersAdapter()");
    expect(source).toContain("createAppKit({");
    expect(source).toContain("bscMainnet");
    expect(source).toContain("bscTestnet");
    expect(source).toContain("appKitStorage");
    expect(source).toContain("<AppKitProvider");
    expect(source).toContain("<AppKit />");
    expect(source).toContain("if (!projectId)");
  });

  it("scopes wallet connection to the configured environment chain", () => {
    const source = readFileSync(
      resolve(root, "src/app/providers/WalletConnectionProvider.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "const configuredNetwork = chainId === 56 ? bscMainnet : bscTestnet",
    );
    expect(source).toContain("defaultNetwork: configuredNetwork");
    expect(source).toContain("networks: [configuredNetwork]");
    expect(source).not.toContain("walletIdentityProofNetwork");
  });

  it("disables non-wallet features and uses the native redirect", () => {
    const source = readFileSync(
      resolve(root, "src/app/providers/WalletConnectionProvider.tsx"),
      "utf8",
    );

    expect(source).toContain("enableAnalytics: false");
    expect(source).toContain("logger: \"error\"");
    expect(source).toContain("swaps: false");
    expect(source).toContain("onramp: false");
    expect(source).toContain("socials: false");
    expect(source).toContain("showWallets: true");
    expect(source).toContain('native: "mytradeapp://"');
  });

  it("configures Expo import-meta and WalletConnect startup ordering", () => {
    const babel = readFileSync(resolve(root, "babel.config.js"), "utf8");
    const entry = readFileSync(resolve(root, "index.ts"), "utf8");
    const app = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8"));

    expect(babel).toContain("babel-preset-expo");
    expect(babel).toContain("unstable_transformImportMeta: true");
    expect(entry.trimStart().startsWith(
      'import "@walletconnect/react-native-compat";',
    )).toBe(true);
    expect(app.expo.scheme).toBe("mytradeapp");
  });

  it("locks the Metro preset and WalletConnect native pods", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    );
    const podfileLock = readFileSync(resolve(root, "ios/Podfile.lock"), "utf8");

    expect(packageJson.devDependencies["babel-preset-expo"]).toBe("57.0.1");
    expect(podfileLock).toContain("RNCAsyncStorage (2.2.0)");
    expect(podfileLock).toContain("react-native-compat (2.23.10)");
    expect(podfileLock).toContain("react-native-netinfo (12.0.1)");
  });

  it("follows AppKit's protocol dependency while keeping RN compat independent", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    );
    const packageLock = JSON.parse(
      readFileSync(resolve(root, "package-lock.json"), "utf8"),
    );
    const resolvedVersions = (packageName: string) => Object.entries(
      packageLock.packages as Record<string, { version?: string }>,
    ).flatMap(([path, metadata]) => path.endsWith(`node_modules/${packageName}`)
      ? [metadata.version]
      : []);

    expect(packageJson.dependencies["@walletconnect/universal-provider"])
      .toBeUndefined();
    expect(packageJson.overrides?.["@walletconnect/universal-provider"])
      .toBeUndefined();
    expect(packageLock.packages["node_modules/@reown/appkit-react-native"]
      .dependencies["@walletconnect/universal-provider"])
      .toBe("2.21.10");
    expect(resolvedVersions("@walletconnect/universal-provider"))
      .toEqual(["2.21.10"]);
    expect(resolvedVersions("@walletconnect/sign-client"))
      .toEqual(["2.21.10"]);
    expect(resolvedVersions("@walletconnect/core"))
      .toEqual(["2.21.10"]);
    expect(resolvedVersions("@walletconnect/react-native-compat"))
      .toEqual(["2.23.10"]);
  });

  it("finishes local cleanup when a wallet session is already stale", () => {
    const provider = readFileSync(
      resolve(root, "src/app/providers/WalletConnectionProvider.tsx"),
      "utf8",
    );
    const runtime = readFileSync(
      resolve(root, "src/features/wallet/components/WalletSelectionRuntime.tsx"),
      "utf8",
    );

    expect(provider).toContain('await instance.disconnect("eip155")');
    expect(provider).toContain('await instance.disconnect("eip155", false)');
    expect(runtime).toContain("useWalletConnectionController");
  });

  it("bounds a wallet handoff that never approves or rejects", () => {
    const runtime = readFileSync(
      resolve(root, "src/features/wallet/components/WalletSelectionRuntime.tsx"),
      "utf8",
    );

    expect(runtime).toContain("REOWN_CONNECTION_TIMEOUT_MS = 120_000");
    expect(runtime).toContain("setTimeout(");
    expect(runtime).toContain("clearTimeout(");
    expect(runtime).toContain('failPendingConnection("connection_timeout")');
    expect(runtime).toContain("createReownCleanupCoordinator");
  });

  it("passes the configured chain into the wallet selection runtime", () => {
    const appRoot = readFileSync(resolve(root, "src/app/AppRoot.tsx"), "utf8");
    const runtime = readFileSync(
      resolve(root, "src/features/wallet/components/WalletSelectionRuntime.tsx"),
      "utf8",
    );

    expect(appRoot).toContain("chainId: publicConfig.config.chainId");
    expect(runtime).toContain("useReownConnectionAdapter(config.chainId)");
    expect(runtime).toContain("isReownConnectionOnChain");
    expect(runtime).toContain('failPendingConnection("unsupported_chain")');
  });

  it("composes Reown, Privy SIWE, wallet selection, and secure recovery", () => {
    const appRoot = readFileSync(resolve(root, "src/app/AppRoot.tsx"), "utf8");
    const runtime = readFileSync(
      resolve(root, "src/features/wallet/components/WalletSelectionRuntime.tsx"),
      "utf8",
    );
    const source = `${appRoot}\n${runtime}`;

    expect(source).toContain("useAppKit()");
    expect(source).toContain("useAccount()");
    expect(source).toContain("useProvider()");
    expect(source).toContain("useWalletInfo()");
    expect(source).toContain("useAppKitState()");
    expect(source).toContain("useLinkWithSiwe");
    expect(source).toContain("createReownWalletConnectionAdapter");
    expect(source).toContain("createPrivyWalletLinkAdapter");
    expect(source).toContain("reportFailure: reportPrivyWalletLinkFailure");
    expect(source).toContain("createWalletSelectionOperationStorage");
    expect(source).toContain("createWalletSelectionDependencies");
    expect(source).toContain("selectWalletForViewer");
    expect(appRoot).toContain("walletSelectionDependencies=");
  });
});
