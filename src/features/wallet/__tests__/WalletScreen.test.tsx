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
import type { WalletUnlinkDependencies } from "../workflow/walletUnlinkWorkflow";

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

  it("offers unlink only for a linked external wallet and suppresses it after success", async () => {
    const unlinkDependencies = walletUnlinkDependencies();
    const renderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      unlinkDependencies,
    });

    expect(renderer.root.findByProps({
      accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
    })).toBeTruthy();
    expect(renderer.root.findAllByProps({
      accessibilityLabel: `Unlink wallet ${shortAddress(address(8))}`,
    })).toHaveLength(0);

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
      }).props.onPress();
    });

    expect(unlinkDependencies.confirm).toHaveBeenCalledOnce();
    expect(unlinkDependencies.unlink).toHaveBeenCalledWith(address(9));
    expect(unlinkDependencies.refreshSession).toHaveBeenCalledOnce();
    expect(output(renderer)).not.toContain("MetaMask");
  });

  it("does not unlink when confirmation is cancelled", async () => {
    const unlinkDependencies = walletUnlinkDependencies();
    unlinkDependencies.confirm.mockResolvedValue(false);
    const renderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      unlinkDependencies,
    });

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
      }).props.onPress();
    });

    expect(unlinkDependencies.unlink).not.toHaveBeenCalled();
    expect(unlinkDependencies.refreshSession).not.toHaveBeenCalled();
  });

  it("coalesces rapid unlink presses into one Privy mutation", async () => {
    let resolveConfirmation: ((confirmed: boolean) => void) | undefined;
    const unlinkDependencies = walletUnlinkDependencies();
    unlinkDependencies.confirm.mockReturnValue(new Promise<boolean>((resolve) => {
      resolveConfirmation = resolve;
    }));
    const renderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      unlinkDependencies,
    });
    const onPress = renderer.root.findByProps({
      accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
    }).props.onPress;

    await act(async () => {
      const first = onPress();
      const second = onPress();
      resolveConfirmation?.(true);
      await Promise.all([first, second]);
    });

    expect(unlinkDependencies.confirm).toHaveBeenCalledOnce();
    expect(unlinkDependencies.unlink).toHaveBeenCalledOnce();
    expect(unlinkDependencies.refreshSession).toHaveBeenCalledOnce();
  });

  it("keeps platform synchronization separate from a failed Privy unlink", async () => {
    const unlinkDependencies = walletUnlinkDependencies();
    unlinkDependencies.unlink
      .mockRejectedValueOnce(new Error("privy unavailable"))
      .mockResolvedValueOnce(undefined);
    const renderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      unlinkDependencies,
    });

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
      }).props.onPress();
    });

    expect(output(renderer)).toContain("Wallet could not be unlinked");
    expect(unlinkDependencies.refreshSession).not.toHaveBeenCalled();

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
      }).props.onPress();
    });

    expect(unlinkDependencies.unlink).toHaveBeenCalledTimes(2);
    expect(unlinkDependencies.refreshSession).toHaveBeenCalledOnce();
    expect(output(renderer)).not.toContain("MetaMask");
  });

  it("retries only platform synchronization after Privy unlink succeeds", async () => {
    const unlinkDependencies = walletUnlinkDependencies();
    unlinkDependencies.refreshSession
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const renderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      unlinkDependencies,
    });
    const actionSlotTestId = `wallet-unlink-action-slot-${address(9).toLowerCase()}`;
    const initialActionSlotStyle = renderer.root.findByProps({
      testID: actionSlotTestId,
    }).props.style;

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
      }).props.onPress();
    });

    expect(output(renderer)).toContain("Wallet removed; sync pending");
    expect(renderer.root.findByProps({ testID: actionSlotTestId }).props.style)
      .toEqual(initialActionSlotStyle);
    expect(renderer.root.findAllByProps({
      accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
    })).toHaveLength(0);

    await act(async () => {
      await renderer.root.findByProps({
        accessibilityLabel: "Retry wallet sync",
      }).props.onPress();
    });

    expect(unlinkDependencies.unlink).toHaveBeenCalledOnce();
    expect(unlinkDependencies.refreshSession).toHaveBeenCalledTimes(2);
    expect(output(renderer)).not.toContain("MetaMask");
  });

  it("keeps unlink unavailable without controlled mutation dependencies", async () => {
    const renderer = await renderWallet({ metadata: linkedWalletMetadata() });

    expect(renderer.root.findAll((node) => (
      typeof node.props.accessibilityLabel === "string" &&
      node.props.accessibilityLabel.startsWith("Unlink wallet ")
    ))).toHaveLength(0);
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
  unlinkDependencies,
  walletAddress = address(8),
}: {
  dependencies?: WalletDataDependencies;
  metadata?: PrivyWalletMetadata;
  unlinkDependencies?: WalletUnlinkDependencies;
  walletAddress?: string | null;
} = {}): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(
      <WalletScreen
        chain={CHAIN}
        dependencies={dependencies}
        privyWalletMetadata={metadata}
        unlinkDependencies={unlinkDependencies}
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

function walletUnlinkDependencies() {
  return {
    confirm: vi.fn().mockResolvedValue(true),
    refreshSession: vi.fn().mockResolvedValue(true),
    unlink: vi.fn().mockResolvedValue(undefined),
  } satisfies WalletUnlinkDependencies;
}

function linkedWalletMetadata(): PrivyWalletMetadata {
  return {
    passkeyMfaEnabled: true,
    wallets: [
      { address: address(8), kind: "embedded", providerLabel: "Privy" },
      { address: address(9), kind: "external", providerLabel: "MetaMask" },
      { address: address(6), kind: "embedded", providerLabel: "Privy" },
    ],
  };
}

function shortAddress(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
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
