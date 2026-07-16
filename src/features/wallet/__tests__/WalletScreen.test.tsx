import * as ReactNative from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import type {
  PrivyWalletMetadata,
  WalletBalanceLoadResult,
} from "../domain/walletModels";
import {
  WalletScreen,
  type WalletDataDependencies,
} from "../screens/WalletScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("WalletScreen", () => {
  it("does not query chain without a verified viewer wallet", async () => {
    const dependencies = walletDependencies();
    const renderer = await renderWallet({
      dependencies,
      walletAddress: null,
    });

    expect(output(renderer)).toContain("Wallet unavailable");
    expect(dependencies.loadBalances).not.toHaveBeenCalled();
  });

  it("shows fixed skeleton rows during initial load", async () => {
    const dependencies = walletDependencies();
    dependencies.loadBalances = vi.fn().mockReturnValue(
      new Promise<never>(() => undefined),
    );
    const renderer = await renderWallet({ dependencies });

    expect(renderer.root.findByProps({ accessibilityLabel: "Wallet balances loading" }))
      .toBeTruthy();
    expect(renderer.root.findAll((node) => (
      String(node.type) === "View" && node.props.testID === "wallet-balance-skeleton"
    ))).toHaveLength(3);
  });

  it("shows successful rows beside a failed token and retries", async () => {
    const dependencies = walletDependencies({
      artDiscoveryStatus: "unavailable",
      rows: [
        ready("native:97", "native", "BNB", "1.25", null),
        unavailable("usdt:97", "usdt", "USDT", CHAIN.usdtAddress),
        ready("art-1", "art", "ART1", "9007199254740993", address(1)),
      ],
    });
    const renderer = await renderWallet({ dependencies });

    expect(output(renderer)).toContain("1.25");
    expect(output(renderer)).toContain("Unavailable");
    expect(output(renderer)).toContain("9007199254740993");
    expect(output(renderer)).toContain("ART token discovery unavailable");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Refresh wallet balances" })
        .props.onPress();
      await Promise.resolve();
    });
    expect(dependencies.loadBalances).toHaveBeenCalledTimes(2);
  });

  it("labels active and linked wallets with informational Passkey state", async () => {
    const renderer = await renderWallet({
      metadata: {
        passkeyMfaEnabled: true,
        wallets: [
          { address: address(8), kind: "embedded", providerLabel: "Privy" },
          { address: address(9), kind: "external", providerLabel: "metamask" },
        ],
      },
    });

    expect(output(renderer)).toContain("Active");
    expect(output(renderer)).toContain("Linked");
    expect(output(renderer)).toContain("Embedded");
    expect(output(renderer)).toContain("External");
    expect(output(renderer)).toContain("Passkey MFA enabled");
    expect(output(renderer)).toContain("Transfers are unavailable");
  });

  it("uses two columns on tablet widths", async () => {
    vi.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
      fontScale: 1,
      height: 1024,
      scale: 2,
      width: 900,
    });
    const renderer = await renderWallet();

    expect(renderer.root.findByProps({ accessibilityLabel: "Wallet responsive layout" })
      .props.style).toEqual(expect.arrayContaining([
        expect.objectContaining({ flexDirection: "row" }),
      ]));
    vi.restoreAllMocks();
  });

  it("renders the authoritative address in QR, copy, and text share actions", async () => {
    const dependencies = walletDependencies();
    const renderer = await renderWallet({ dependencies });

    expect(renderer.root.findAll((node) => (
      String(node.type) === "QRCodeStyled" && node.props.data === address(8)
    ))).toHaveLength(2);
    expect(renderer.root.findByProps({ accessibilityLabel: `Receive address ${address(8)}` })
      .props.selectable).toBe(true);

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Copy wallet address" })
        .props.onPress();
      await Promise.resolve();
    });
    expect(dependencies.clipboard.setString).toHaveBeenCalledWith(address(8));

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Share wallet address as text" })
        .props.onPress();
      await Promise.resolve();
    });
    expect(dependencies.textShare.share).toHaveBeenCalledWith({
      message: `Receive on ${CHAIN.name} only.\n${address(8)}`,
      title: "Receive BNB wallet assets",
    });
  });

  it("shares a branded receive card without financial or identity metadata", async () => {
    const dependencies = walletDependencies({
      artDiscoveryStatus: "ready",
      rows: [ready("native:97", "native", "BNB", "12345", null)],
    });
    const renderer = await renderWallet({ dependencies });
    const shareCard = renderer.root.findByProps({
      accessibilityLabel: "Wallet receive share card",
    });
    const shareText = instanceText(shareCard);

    expect(shareText).toContain("ArtStar");
    expect(shareText).toContain(CHAIN.name);
    expect(shareText).toContain(address(8));
    expect(shareText).not.toContain("12345");
    expect(shareText).not.toContain("viewer-1");
    expect(shareText).not.toContain("viewer@example.com");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Share wallet address as image" })
        .props.onPress();
      await Promise.resolve();
    });
    expect(dependencies.imageShare.share).toHaveBeenCalledOnce();
  });
});

async function renderWallet({
  dependencies = walletDependencies(),
  metadata = EMPTY_METADATA,
  walletAddress = address(8),
}: {
  dependencies?: WalletDataDependencies;
  metadata?: PrivyWalletMetadata;
  walletAddress?: string | null;
} = {}): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(
      <WalletScreen
        chain={CHAIN}
        dependencies={dependencies}
        privyWalletMetadata={metadata}
        viewerState={{
          isSessionReady: true,
          viewer: { email: null, id: "viewer-1", walletAddress },
        }}
      />,
    );
    await Promise.resolve();
  });
  return renderer!;
}

function walletDependencies(
  result: WalletBalanceLoadResult = { artDiscoveryStatus: "ready", rows: [] },
): WalletDataDependencies {
  return {
    clipboard: { setString: vi.fn().mockResolvedValue(undefined) },
    imageShare: { share: vi.fn().mockResolvedValue("shared") },
    loadBalances: vi.fn().mockResolvedValue(result),
    textShare: { share: vi.fn().mockResolvedValue("shared") },
  };
}

function instanceText(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => (
    typeof child === "string" ? child : instanceText(child)
  )).join("");
}

function ready(
  id: string,
  kind: "native" | "usdt" | "art",
  symbol: string,
  displayAmount: string,
  contractAddress: `0x${string}` | null,
) {
  return {
    contractAddress,
    displayAmount,
    id,
    imageUrl: null,
    kind,
    status: "ready" as const,
    symbol,
  };
}

function unavailable(
  id: string,
  kind: "native" | "usdt" | "art",
  symbol: string,
  contractAddress: `0x${string}` | null,
) {
  return {
    contractAddress,
    id,
    imageUrl: null,
    kind,
    status: "unavailable" as const,
    symbol,
  };
}

function output(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}

const CHAIN: PublicChainConfig = {
  chainId: 97,
  explorerOrigin: "https://testnet.bscscan.com",
  name: "BNB Smart Chain Testnet",
  nativeDecimals: 18,
  nativeSymbol: "BNB",
  usdtAddress: address(7),
};

const EMPTY_METADATA: PrivyWalletMetadata = {
  passkeyMfaEnabled: false,
  wallets: [],
};
