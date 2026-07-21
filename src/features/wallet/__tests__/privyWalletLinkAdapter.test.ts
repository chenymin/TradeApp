import { describe, expect, it, vi } from "vitest";

import {
  createPrivyWalletLinkAdapter,
  PrivyWalletLinkError,
} from "../services/privyWalletLinkAdapter";
import type { ConnectedExternalWallet } from "../services/reownWalletConnectionAdapter";

const target = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

describe("Privy wallet SIWE link adapter", () => {
  it("generates, signs, links, and verifies the exact wallet", async () => {
    const generateSiweMessage = vi.fn().mockResolvedValue("siwe-message");
    const linkWithSiwe = vi.fn().mockResolvedValue({
      linked_accounts: [
        {
          type: "wallet",
          chain_type: "ethereum",
          address: target.toUpperCase().replace("0X", "0x"),
        },
      ],
    });
    const wallet = connectedWallet();
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage,
      linkWithSiwe,
    });

    await expect(
      adapter.link(wallet, "https://test.artstarex.com"),
    ).resolves.toBeUndefined();

    expect(generateSiweMessage).toHaveBeenCalledWith({
      from: {
        domain: "test.artstarex.com",
        uri: "https://test.artstarex.com",
      },
      wallet: {
        address: target,
        chainId: "eip155:97",
        connectorType: "wallet_connect",
        meta: { id: "Rabby", name: "Rabby" },
        walletClientType: "Rabby",
      },
    });
    expect(wallet.signMessage).toHaveBeenCalledWith("siwe-message");
    expect(linkWithSiwe).toHaveBeenCalledWith({
      messageOverride: "siwe-message",
      signature: "0xsigned",
    });
  });

  it("rejects a Privy result that does not contain the target wallet", async () => {
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage: vi.fn().mockResolvedValue("siwe-message"),
      linkWithSiwe: vi.fn().mockResolvedValue({ linked_accounts: [] }),
    });

    await expect(
      adapter.link(connectedWallet(), "https://test.artstarex.com"),
    ).rejects.toEqual(new PrivyWalletLinkError("linked_wallet_mismatch"));
  });

  it("rejects an unsafe SIWE origin before generating a message", async () => {
    const generateSiweMessage = vi.fn();
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage,
      linkWithSiwe: vi.fn(),
    });

    await expect(
      adapter.link(connectedWallet(), "http://test.artstarex.com"),
    ).rejects.toEqual(new PrivyWalletLinkError("invalid_origin"));
    expect(generateSiweMessage).not.toHaveBeenCalled();
  });
});

function connectedWallet(): ConnectedExternalWallet {
  return {
    address: target,
    chainId: "eip155:97",
    connectorType: "wallet_connect",
    providerLabel: "Rabby",
    signMessage: vi.fn().mockResolvedValue("0xsigned"),
  };
}
