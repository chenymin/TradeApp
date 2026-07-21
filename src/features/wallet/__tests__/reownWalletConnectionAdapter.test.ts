import { describe, expect, it, vi } from "vitest";
import { stringToHex } from "viem";

import {
  createReownWalletConnectionAdapter,
  WalletConnectionError,
} from "../services/reownWalletConnectionAdapter";

const target = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("Reown wallet connection adapter", () => {
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
      address: target,
      chainId: "eip155:56",
      connectorType: "wallet_connect",
      providerLabel: "MetaMask",
    });
    expect(provider.request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: [stringToHex("Sign this message"), target],
    });
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
    const adapter = createReownWalletConnectionAdapter({
      connect: vi.fn().mockResolvedValue({
        address: target,
        chainId: "97",
        namespace: "eip155",
        provider: { request: vi.fn() },
        providerLabel: "Rabby",
      }),
      disconnect: vi.fn(),
    });

    await expect(
      adapter.connect("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
    ).rejects.toEqual(new WalletConnectionError("address_mismatch"));
  });
});
