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
});
