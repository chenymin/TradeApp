import type { AlertButton, AlertOptions } from "react-native";
import { describe, expect, it, vi } from "vitest";

import { createWalletSelectionDependencies } from "../services/createWalletSelectionDependencies";

describe("createWalletSelectionDependencies", () => {
  it("requires explicit native confirmation for an existing switch", async () => {
    const alert = alertAdapter();
    const dependencies = createWalletSelectionDependencies({
      ...bindings(),
      alert,
    });
    const confirmation = dependencies.confirmSwitch(target());
    const [, message, buttons] = alert.alert.mock.calls[0]!;

    expect(message).toContain("MetaMask");
    expect(message).toContain("0x000000...000002");
    buttons?.[1]?.onPress?.();

    await expect(confirmation).resolves.toBe(true);
  });

  it("binds connection, SIWE, platform selection, and Viewer persistence", async () => {
    const input = bindings();
    const dependencies = createWalletSelectionDependencies(input);
    const wallet = await dependencies.connect(address(2));

    await dependencies.link(wallet);
    await expect(dependencies.getPrivyAccessToken()).resolves.toBe("privy-token");
    await expect(dependencies.select({
      expectedPreviousAddress: address(1),
      operationId: "operation-1",
      privyToken: "privy-token",
      targetAddress: address(2),
    })).resolves.toEqual(input.selectionResult);
    await expect(
      dependencies.persistViewer(input.selectionResult.viewer),
    ).resolves.toBe(true);

    expect(input.connection.connect).toHaveBeenCalledWith(address(2));
    expect(input.privyLink.link).toHaveBeenCalledWith(
      wallet,
      "https://test.artstarex.com",
    );
    expect(input.selectWallet).toHaveBeenCalledOnce();
    expect(input.replaceViewer).toHaveBeenCalledOnce();
  });

  it("rejects a missing Privy access token", async () => {
    const dependencies = createWalletSelectionDependencies({
      ...bindings(),
      getAccessToken: vi.fn().mockResolvedValue(null),
    });

    await expect(dependencies.getPrivyAccessToken()).rejects.toMatchObject({
      code: "privy_session_unavailable",
    });
  });
});

function bindings() {
  const wallet = {
    address: address(2),
    chainId: "eip155:97" as const,
    connectorType: "wallet_connect" as const,
    providerLabel: "MetaMask",
    signMessage: vi.fn().mockResolvedValue("0xsigned"),
  };
  const selectionResult = {
    idempotent: false,
    operationId: "operation-1",
    viewer: { email: null, id: "viewer-1", walletAddress: address(2) },
  };

  return {
    alert: alertAdapter(),
    connection: {
      connect: vi.fn().mockResolvedValue(wallet),
      disconnect: vi.fn(),
    },
    getAccessToken: vi.fn().mockResolvedValue("privy-token"),
    newOperationId: vi.fn().mockReturnValue("operation-1"),
    now: vi.fn().mockReturnValue(100),
    operationStorage: {
      clear: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
    },
    privyLink: { link: vi.fn().mockResolvedValue(undefined) },
    publicWebOrigin: "https://test.artstarex.com",
    replaceViewer: vi.fn().mockResolvedValue(true),
    selectionResult,
    selectWallet: vi.fn().mockResolvedValue(selectionResult),
  };
}

function target() {
  return {
    address: address(2),
    kind: "external" as const,
    privyLinked: true,
    providerLabel: "MetaMask",
  };
}

function alertAdapter() {
  return {
    alert: vi.fn((
      _title: string,
      _message?: string,
      _buttons?: AlertButton[],
      _options?: AlertOptions,
    ) => undefined),
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
