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
import type { WalletSelectionRuntimeDependencies } from "../workflow/walletSelectionWorkflow";

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

  it("offers stable wallet selection actions and a bind command", async () => {
    const selectionDependencies = walletSelectionDependencies();
    const renderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      selectionDependencies,
    });

    expect(renderer.root.findAllByProps({
      accessibilityLabel: `Use wallet ${shortAddress(address(8))}`,
    })).toHaveLength(0);
    expect(renderer.root.findByProps({
      accessibilityLabel: `Use wallet ${shortAddress(address(6))}`,
    })).toBeTruthy();
    expect(renderer.root.findByProps({
      accessibilityLabel: `Connect wallet ${shortAddress(address(9))}`,
    })).toBeTruthy();
    expect(renderer.root.findByProps({
      accessibilityLabel: "Bind wallet",
    })).toBeTruthy();

    const connectedRenderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      selectionDependencies: {
        ...walletSelectionDependencies(),
        connectedExternalAddress: address(9),
      },
    });
    expect(connectedRenderer.root.findByProps({
      accessibilityLabel: `Use wallet ${shortAddress(address(9))}`,
    })).toBeTruthy();
  });

  it("keeps the action slot stable and locks unlink during wallet selection", async () => {
    let resolveConfirmation: ((confirmed: boolean) => void) | undefined;
    const selectionDependencies = walletSelectionDependencies();
    selectionDependencies.workflow.confirmSwitch = vi.fn().mockReturnValue(
      new Promise<boolean>((resolve) => { resolveConfirmation = resolve; }),
    );
    const unlinkDependencies = walletUnlinkDependencies();
    const renderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      selectionDependencies,
      unlinkDependencies,
    });
    const actionSlot = `wallet-selection-action-slot-${address(6).toLowerCase()}`;
    const initialStyle = renderer.root.findByProps({ testID: actionSlot }).props.style;
    const unlink = renderer.root.findByProps({
      accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
    });

    let selection: Promise<void> | undefined;
    await act(async () => {
      selection = renderer.root.findByProps({
        accessibilityLabel: `Use wallet ${shortAddress(address(6))}`,
      }).props.onPress();
      await Promise.resolve();
    });

    expect(renderer.root.findByProps({ testID: actionSlot }).props.style)
      .toEqual(initialStyle);
    expect(renderer.root.findByProps({
      testID: `wallet-selection-spinner-${address(6).toLowerCase()}`,
    })).toBeTruthy();
    await act(async () => {
      await unlink.props.onPress();
      expect(unlinkDependencies.confirm).not.toHaveBeenCalled();

      resolveConfirmation?.(false);
      await selection;
    });
  });

  it("keeps the active workflow when the connected wallet snapshot changes", async () => {
    let resolveConfirmation: ((confirmed: boolean) => void) | undefined;
    const dependencies = walletDependencies();
    const selectionDependencies = walletSelectionDependencies();
    selectionDependencies.workflow.confirmSwitch = vi.fn().mockReturnValue(
      new Promise<boolean>((resolve) => { resolveConfirmation = resolve; }),
    );
    const metadata = linkedWalletMetadata();
    const renderer = await renderWallet({
      dependencies,
      metadata,
      selectionDependencies,
    });
    let selection: Promise<void> | undefined;
    await act(async () => {
      selection = renderer.root.findByProps({
        accessibilityLabel: `Use wallet ${shortAddress(address(6))}`,
      }).props.onPress();
      await Promise.resolve();
    });

    await act(async () => {
      renderer.update(
        <WalletScreen
          chain={CHAIN}
          dependencies={dependencies}
          privyWalletMetadata={metadata}
          selectionDependencies={{
            ...selectionDependencies,
            connectedExternalAddress: address(9),
          }}
          viewerState={{
            isSessionReady: true,
            viewer: { email: null, id: "viewer-1", walletAddress: address(8) },
          }}
        />,
      );
    });

    expect(renderer.root.findByProps({
      testID: `wallet-selection-spinner-${address(6).toLowerCase()}`,
    })).toBeTruthy();
    await act(async () => {
      resolveConfirmation?.(false);
      await selection;
    });
  });

  it("shows Retry after platform failure and Remove link for a conflict", async () => {
    const failed = walletSelectionDependencies();
    failed.workflow.select = vi.fn().mockRejectedValueOnce({ code: "server_unavailable" });
    const failedRenderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      selectionDependencies: failed,
      unlinkDependencies: walletUnlinkDependencies(),
    });

    await act(async () => {
      await failedRenderer.root.findByProps({
        accessibilityLabel: `Use wallet ${shortAddress(address(6))}`,
      }).props.onPress();
    });
    expect(failedRenderer.root.findByProps({
      accessibilityLabel: "Retry wallet selection",
    })).toBeTruthy();
    expect(failedRenderer.root.findByProps({ accessibilityLabel: "Bind wallet" })
      .props.disabled).toBe(true);
    expect(failedRenderer.root.findByProps({
      accessibilityLabel: `Unlink wallet ${shortAddress(address(9))}`,
    }).props.disabled).toBe(true);

    const conflict = walletSelectionDependencies();
    conflict.workflow.select = vi.fn().mockRejectedValue({
      code: "wallet_owned_by_another_investor",
    });
    const conflictRenderer = await renderWallet({
      metadata: linkedWalletMetadata(),
      selectionDependencies: {
        ...conflict,
        connectedExternalAddress: address(9),
      },
      unlinkDependencies: walletUnlinkDependencies(),
    });
    await act(async () => {
      await conflictRenderer.root.findByProps({
        accessibilityLabel: `Use wallet ${shortAddress(address(9))}`,
      }).props.onPress();
    });
    expect(conflictRenderer.root.findByProps({
      accessibilityLabel: `Remove link ${shortAddress(address(9))}`,
    }).props.disabled).toBe(false);
    expect(conflictRenderer.root.findByProps({ accessibilityLabel: "Bind wallet" })
      .props.disabled).toBe(true);
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
  selectionDependencies,
  unlinkDependencies,
  walletAddress = address(8),
}: {
  dependencies?: WalletDataDependencies;
  metadata?: PrivyWalletMetadata;
  selectionDependencies?: WalletSelectionRuntimeDependencies;
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
        selectionDependencies={selectionDependencies}
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

function walletSelectionDependencies(): WalletSelectionRuntimeDependencies {
  return {
    workflow: {
      confirmSwitch: vi.fn().mockResolvedValue(true),
      connect: vi.fn().mockResolvedValue({
        address: address(9),
        chainId: "eip155:97",
        connectorType: "wallet_connect",
        providerLabel: "MetaMask",
        signMessage: vi.fn().mockResolvedValue("0xsigned"),
      }),
      getPrivyAccessToken: vi.fn().mockResolvedValue("privy-token"),
      link: vi.fn().mockResolvedValue(undefined),
      newOperationId: vi.fn().mockReturnValue("operation-1"),
      now: vi.fn().mockReturnValue(100),
      operationStorage: {
        clear: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue(undefined),
      },
      persistViewer: vi.fn().mockResolvedValue(true),
      select: vi.fn().mockImplementation(async ({ operationId, targetAddress }) => ({
        idempotent: false,
        operationId,
        viewer: { email: null, id: "viewer-1", walletAddress: targetAddress },
      })),
    },
  };
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
