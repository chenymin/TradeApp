import { describe, expect, it, vi } from "vitest";
import { getAddress, stringToHex } from "viem";

import {
  createReownCleanupCoordinator,
  createReownWalletConnectionAdapter,
  isReownConnectionOnChain,
  openReownConnectionSelector,
  shouldRejectClosedReownSelector,
  shouldReuseReownConnection,
  WalletConnectionError,
} from "../services/reownWalletConnectionAdapter";

const target = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const checksummedTarget = getAddress(target);

describe("Reown wallet connection adapter", () => {
  it("coalesces cleanup and makes a retry wait for the same disconnect", async () => {
    let finishDisconnect: (() => void) | undefined;
    const disconnect = vi.fn().mockReturnValue(new Promise<void>((resolve) => {
      finishDisconnect = resolve;
    }));
    const cleanup = createReownCleanupCoordinator(disconnect);

    const first = cleanup.start();
    const second = cleanup.start();

    expect(second).toBe(first);
    expect(cleanup.wait()).toBe(first);
    await Promise.resolve();
    expect(disconnect).toHaveBeenCalledOnce();

    finishDisconnect?.();
    await first;
    await expect(cleanup.wait()).resolves.toBeUndefined();
  });

  it("accepts only the connection chain configured for this environment", () => {
    expect(isReownConnectionOnChain({ chainId: "97" }, 97)).toBe(true);
    expect(isReownConnectionOnChain({ chainId: "eip155:97" }, 97)).toBe(true);
    expect(isReownConnectionOnChain({ chainId: "56" }, 97)).toBe(false);
  });

  it("opens a fresh connection for binding and only reuses an exact switch target", () => {
    expect(shouldReuseReownConnection(target)).toBe(false);
    expect(shouldReuseReownConnection(target, target)).toBe(true);
    expect(shouldReuseReownConnection(
      target,
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    )).toBe(false);
  });

  it("opens the explicit Connect view after clearing a stale session", () => {
    const open = vi.fn();

    openReownConnectionSelector(open);

    expect(open).toHaveBeenCalledWith({ view: "Connect" });
  });

  it("keeps waiting after an external wallet handoff but rejects an unselected close", () => {
    const closedSelector = {
      hasSnapshot: false,
      isLoading: false,
      isOpen: false,
      sawModal: true,
    };

    expect(shouldRejectClosedReownSelector({
      ...closedSelector,
      selectedWallet: true,
    })).toBe(false);
    expect(shouldRejectClosedReownSelector({
      ...closedSelector,
      selectedWallet: false,
    })).toBe(true);
  });

  it("maps an EIP-155 connection and signs with personal_sign", async () => {
    const provider = { request: vi.fn().mockResolvedValue("0xsigned") };
    const adapter = createReownWalletConnectionAdapter({
      connect: vi.fn().mockResolvedValue({
        address: target,
        chainId: "56",
        namespace: "eip155",
        provider,
        providerLabel: "MetaMask",
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
    });

    const wallet = await adapter.connect();
    await expect(wallet.signMessage("Sign this message")).resolves.toBe(
      "0xsigned",
    );

    expect(wallet).toMatchObject({
      address: checksummedTarget,
      chainId: "eip155:56",
      connectorType: "wallet_connect",
      providerLabel: "MetaMask",
    });
    expect(provider.request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: [stringToHex("Sign this message"), checksummedTarget],
    });
  });

  it("expires and clears a WalletConnect session missing its topic", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const adapter = createReownWalletConnectionAdapter({
      connect: vi.fn().mockResolvedValue({
        address: target,
        chainId: "97",
        namespace: "eip155",
        provider: {
          request: vi.fn().mockRejectedValue(
            new Error("No matching key. session topic doesn't exist: stale-topic"),
          ),
        },
        providerLabel: "MetaMask",
      }),
      disconnect,
    });

    const wallet = await adapter.connect();

    await expect(wallet.signMessage("Sign this message")).rejects.toEqual(
      new WalletConnectionError("session_expired"),
    );
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it.each([
    [{ address: target, chainId: "56", namespace: "solana" }, "unsupported_chain"],
    [{ address: "0x1234", chainId: "56", namespace: "eip155" }, "invalid_address"],
    [{ address: target, chainId: "not-a-chain", namespace: "eip155" }, "unsupported_chain"],
  ] as const)("rejects an invalid connection", async (connection, code) => {
    const adapter = createReownWalletConnectionAdapter({
      connect: vi.fn().mockResolvedValue({
        ...connection,
        provider: { request: vi.fn() },
        providerLabel: "External wallet",
      }),
      disconnect: vi.fn(),
    });

    await expect(adapter.connect()).rejects.toEqual(
      new WalletConnectionError(code),
    );
  });

  it("rejects a connected address that differs from the requested wallet", async () => {
    const connect = vi.fn().mockResolvedValue({
      address: target,
      chainId: "97",
      namespace: "eip155",
      provider: { request: vi.fn() },
      providerLabel: "Rabby",
    });
    const adapter = createReownWalletConnectionAdapter({
      connect,
      disconnect: vi.fn(),
    });
    const expected = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    await expect(
      adapter.connect(expected),
    ).rejects.toEqual(new WalletConnectionError("address_mismatch"));
    expect(connect).toHaveBeenCalledWith(expected);
  });

  it("accepts the requested wallet when only the address casing differs", async () => {
    const disconnect = vi.fn();
    const adapter = createReownWalletConnectionAdapter({
      connect: vi.fn().mockResolvedValue({
        address: target,
        chainId: "97",
        namespace: "eip155",
        provider: { request: vi.fn() },
        providerLabel: "MetaMask",
      }),
      disconnect,
    });

    await expect(adapter.connect(checksummedTarget)).resolves.toMatchObject({
      address: checksummedTarget,
    });
    expect(disconnect).not.toHaveBeenCalled();
  });
});
