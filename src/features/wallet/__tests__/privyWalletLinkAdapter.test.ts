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
        walletClientType: "unknown",
      },
    });
    expect(wallet.signMessage).toHaveBeenCalledWith("siwe-message");
    expect(linkWithSiwe).toHaveBeenCalledWith({
      messageOverride: "siwe-message",
      signature: "0xsigned",
    });
  });

  it("maps a MetaMask display label to Privy's wallet client enum", async () => {
    const generateSiweMessage = vi.fn().mockResolvedValue("siwe-message");
    const wallet = connectedWallet();
    wallet.providerLabel = "MetaMask";
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage,
      linkWithSiwe: vi.fn().mockResolvedValue({
        linked_accounts: [{
          type: "wallet",
          chain_type: "ethereum",
          address: target,
        }],
      }),
    });

    await adapter.link(wallet, "https://test.artstarex.com");

    expect(generateSiweMessage).toHaveBeenCalledWith(expect.objectContaining({
      wallet: expect.objectContaining({ walletClientType: "metamask" }),
    }));
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

  it("identifies a failure while Privy prepares the SIWE message", async () => {
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage: vi.fn().mockRejectedValue(new Error("nonce failed")),
      linkWithSiwe: vi.fn(),
    });

    await expect(
      adapter.link(connectedWallet(), "https://test.artstarex.com"),
    ).rejects.toEqual(new PrivyWalletLinkError("siwe_message_failed"));
  });

  it("preserves a classified wallet signature failure", async () => {
    const wallet = connectedWallet();
    wallet.signMessage = vi.fn().mockRejectedValue({ code: "session_expired" });
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage: vi.fn().mockResolvedValue("siwe-message"),
      linkWithSiwe: vi.fn(),
    });

    await expect(
      adapter.link(wallet, "https://test.artstarex.com"),
    ).rejects.toMatchObject({ code: "session_expired" });
  });

  it("identifies a failure while Privy submits the SIWE signature", async () => {
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage: vi.fn().mockResolvedValue("siwe-message"),
      linkWithSiwe: vi.fn().mockRejectedValue(new Error("link failed")),
    });

    await expect(
      adapter.link(connectedWallet(), "https://test.artstarex.com"),
    ).rejects.toEqual(new PrivyWalletLinkError("privy_link_failed"));
  });

  it("reports only safe Privy failure metadata", async () => {
    const reportFailure = vi.fn();
    const adapter = createPrivyWalletLinkAdapter({
      generateSiweMessage: vi.fn().mockResolvedValue("siwe-message"),
      linkWithSiwe: vi.fn().mockRejectedValue({
        code: "wallet_already_linked",
        error: `sensitive address ${target}`,
        status: 409,
      }),
      reportFailure,
    });

    await expect(
      adapter.link(connectedWallet(), "https://test.artstarex.com"),
    ).rejects.toEqual(new PrivyWalletLinkError("privy_link_failed"));

    expect(reportFailure).toHaveBeenCalledWith({
      providerCode: "wallet_already_linked",
      providerStatus: 409,
      stage: "link_with_siwe",
    });
    expect(JSON.stringify(reportFailure.mock.calls)).not.toContain(target);
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
