import { describe, expect, it, vi } from "vitest";

import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import {
  copyWalletAddress,
  shareWalletAddress,
} from "../workflow/walletReceiveActions";

describe("wallet receive actions", () => {
  it("copies only the verified public address", async () => {
    const clipboard = { setString: vi.fn().mockResolvedValue(undefined) };

    await expect(copyWalletAddress({ address: address(8), clipboard }))
      .resolves.toBe("copied");
    expect(clipboard.setString).toHaveBeenCalledWith(address(8));
  });

  it("shares deterministic chain and address text", async () => {
    const share = { share: vi.fn().mockResolvedValue("shared") };

    await expect(shareWalletAddress({
      address: address(8),
      chain: CHAIN,
      share,
    })).resolves.toBe("shared");
    expect(share.share).toHaveBeenCalledWith({
      message: `Receive on BNB Smart Chain Testnet only.\n${address(8)}`,
      title: "Receive BNB wallet assets",
    });
  });

  it("returns cancellation without converting it into an error", async () => {
    await expect(shareWalletAddress({
      address: address(8),
      chain: CHAIN,
      share: { share: vi.fn().mockResolvedValue("cancelled") },
    })).resolves.toBe("cancelled");
  });

  it("normalizes platform failures without logging public account context", async () => {
    await expect(copyWalletAddress({
      address: address(8),
      clipboard: { setString: vi.fn().mockRejectedValue(new Error("denied")) },
    })).resolves.toBe("unavailable");
    await expect(shareWalletAddress({
      address: address(8),
      chain: CHAIN,
      share: { share: vi.fn().mockRejectedValue(new Error("denied")) },
    })).resolves.toBe("unavailable");
  });
});

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
