import type { AlertButton, AlertOptions } from "react-native";
import { describe, expect, it, vi } from "vitest";

import { createWalletUnlinkDependencies } from "../services/createWalletUnlinkDependencies";

describe("createWalletUnlinkDependencies", () => {
  it("resolves true only from the destructive confirmation action", async () => {
    const alert = alertAdapter();
    const dependencies = createWalletUnlinkDependencies({
      alert,
      refreshSession: vi.fn().mockResolvedValue(true),
      unlinkWallet: vi.fn().mockResolvedValue({}),
    });

    const confirmation = dependencies.confirm({
      address: ADDRESS,
      providerLabel: "MetaMask",
    });
    const [, message, buttons, options] = alert.alert.mock.calls[0]!;

    expect(message).toContain("MetaMask");
    expect(message).toContain("0x000000...000009");
    expect(buttons?.[1]?.style).toBe("destructive");
    expect(options).toEqual(expect.objectContaining({ cancelable: true }));

    buttons?.[1]?.onPress?.();
    await expect(confirmation).resolves.toBe(true);
  });

  it("resolves false when confirmation is cancelled or dismissed", async () => {
    const cancelAlert = alertAdapter();
    const cancelDependencies = createWalletUnlinkDependencies({
      alert: cancelAlert,
      refreshSession: vi.fn().mockResolvedValue(true),
      unlinkWallet: vi.fn().mockResolvedValue({}),
    });
    const cancelled = cancelDependencies.confirm({
      address: ADDRESS,
      providerLabel: "MetaMask",
    });
    cancelAlert.alert.mock.calls[0]?.[2]?.[0]?.onPress?.();
    await expect(cancelled).resolves.toBe(false);

    const dismissAlert = alertAdapter();
    const dismissDependencies = createWalletUnlinkDependencies({
      alert: dismissAlert,
      refreshSession: vi.fn().mockResolvedValue(true),
      unlinkWallet: vi.fn().mockResolvedValue({}),
    });
    const dismissed = dismissDependencies.confirm({
      address: ADDRESS,
      providerLabel: "MetaMask",
    });
    dismissAlert.alert.mock.calls[0]?.[3]?.onDismiss?.();
    await expect(dismissed).resolves.toBe(false);
  });

  it("binds Privy unlink and auth refresh without changing their results", async () => {
    const unlinkWallet = vi.fn().mockResolvedValue({});
    const refreshSession = vi.fn().mockResolvedValue(false);
    const dependencies = createWalletUnlinkDependencies({
      alert: alertAdapter(),
      refreshSession,
      unlinkWallet,
    });

    await dependencies.unlink(ADDRESS);
    await expect(dependencies.refreshSession()).resolves.toBe(false);

    expect(unlinkWallet).toHaveBeenCalledWith({ address: ADDRESS });
    expect(refreshSession).toHaveBeenCalledOnce();
  });
});

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

const ADDRESS = "0x0000000000000000000000000000000000000009" as const;
