import { describe, expect, it, vi } from "vitest";

import type { WalletIdentity } from "../domain/walletModels";
import {
  canUnlinkWallet,
  requestWalletUnlink,
  retryWalletSync,
  type WalletUnlinkDependencies,
} from "../workflow/walletUnlinkWorkflow";

describe("walletUnlinkWorkflow", () => {
  it("allows only a linked external wallet when another Ethereum wallet remains", () => {
    const identity = walletIdentity();

    expect(canUnlinkWallet(identity, identity.wallets[1]!)).toBe(true);
    expect(canUnlinkWallet(identity, identity.wallets[0]!)).toBe(false);
    expect(canUnlinkWallet(identity, identity.wallets[2]!)).toBe(false);

    const singleWalletIdentity = walletIdentity().wallets.slice(0, 1);
    expect(canUnlinkWallet(
      { ...identity, wallets: singleWalletIdentity },
      singleWalletIdentity[0]!,
    )).toBe(false);
  });

  it("rejects a wallet that is not part of the current identity", async () => {
    const identity = walletIdentity();
    const dependencies = unlinkDependencies();
    const unknownWallet = {
      address: address(4),
      kind: "external" as const,
      privyLinked: true,
      providerLabel: "Unknown",
      status: "linked" as const,
    };

    await expect(
      requestWalletUnlink(identity, unknownWallet, dependencies),
    ).resolves.toBe("ineligible");
    expect(dependencies.confirm).not.toHaveBeenCalled();
    expect(dependencies.unlink).not.toHaveBeenCalled();
  });

  it("does not trust forged wallet properties for a known address", async () => {
    const identity = walletIdentity();
    const dependencies = unlinkDependencies();
    const forgedExternal = {
      ...identity.wallets[2]!,
      kind: "external" as const,
      providerLabel: "Forged provider",
    };

    expect(canUnlinkWallet(identity, forgedExternal)).toBe(false);
    await expect(
      requestWalletUnlink(identity, forgedExternal, dependencies),
    ).resolves.toBe("ineligible");
    expect(dependencies.confirm).not.toHaveBeenCalled();
    expect(dependencies.unlink).not.toHaveBeenCalled();
  });

  it("does not count a viewer-only synthetic wallet as a remaining Privy wallet", () => {
    const identity: WalletIdentity = {
      activeAddress: address(1),
      passkeyMfaEnabled: false,
      wallets: [
        {
          address: address(1),
          kind: "external",
          privyLinked: false,
          providerLabel: "Verified wallet",
          status: "active",
        },
        {
          address: address(2),
          kind: "external",
          privyLinked: true,
          providerLabel: "MetaMask",
          status: "linked",
        },
      ],
    };

    expect(canUnlinkWallet(identity, identity.wallets[1]!)).toBe(false);
  });

  it("does nothing after confirmation is cancelled", async () => {
    const identity = walletIdentity();
    const dependencies = unlinkDependencies();
    dependencies.confirm.mockResolvedValue(false);

    await expect(
      requestWalletUnlink(identity, identity.wallets[1]!, dependencies),
    ).resolves.toBe("cancelled");

    expect(dependencies.unlink).not.toHaveBeenCalled();
    expect(dependencies.refreshSession).not.toHaveBeenCalled();
  });

  it("unlinks once and refreshes the platform session", async () => {
    const identity = walletIdentity();
    const dependencies = unlinkDependencies();

    await expect(
      requestWalletUnlink(identity, identity.wallets[1]!, dependencies),
    ).resolves.toBe("complete");

    expect(dependencies.confirm).toHaveBeenCalledWith({
      address: address(2),
      providerLabel: "MetaMask",
    });
    expect(dependencies.unlink).toHaveBeenCalledOnce();
    expect(dependencies.unlink).toHaveBeenCalledWith(address(2));
    expect(dependencies.refreshSession).toHaveBeenCalledOnce();
  });

  it("does not refresh when Privy unlink fails", async () => {
    const identity = walletIdentity();
    const dependencies = unlinkDependencies();
    dependencies.unlink.mockRejectedValue(new Error("privy unavailable"));

    await expect(
      requestWalletUnlink(identity, identity.wallets[1]!, dependencies),
    ).resolves.toBe("unlink_error");

    expect(dependencies.refreshSession).not.toHaveBeenCalled();
  });

  it("retries only session synchronization after Privy unlink succeeds", async () => {
    const identity = walletIdentity();
    const dependencies = unlinkDependencies();
    dependencies.refreshSession
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(
      requestWalletUnlink(identity, identity.wallets[1]!, dependencies),
    ).resolves.toBe("sync_error");
    await expect(retryWalletSync(dependencies)).resolves.toBe("complete");

    expect(dependencies.unlink).toHaveBeenCalledOnce();
    expect(dependencies.refreshSession).toHaveBeenCalledTimes(2);
  });
});

function unlinkDependencies() {
  return {
    confirm: vi.fn().mockResolvedValue(true),
    refreshSession: vi.fn().mockResolvedValue(true),
    unlink: vi.fn().mockResolvedValue(undefined),
  } satisfies WalletUnlinkDependencies;
}

function walletIdentity(): WalletIdentity {
  return {
    activeAddress: address(1),
    passkeyMfaEnabled: true,
    wallets: [
      {
        address: address(1),
        kind: "embedded",
        privyLinked: true,
        providerLabel: "Privy",
        status: "active",
      },
      {
        address: address(2),
        kind: "external",
        privyLinked: true,
        providerLabel: "MetaMask",
        status: "linked",
      },
      {
        address: address(3),
        kind: "embedded",
        privyLinked: true,
        providerLabel: "Privy",
        status: "linked",
      },
    ],
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
