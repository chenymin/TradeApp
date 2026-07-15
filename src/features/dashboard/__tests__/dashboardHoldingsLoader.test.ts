import { describe, expect, it, vi } from "vitest";

import { createDashboardHoldingsLoader } from "../services/dashboardHoldingsLoader";

describe("dashboard holdings loader", () => {
  it("does not query until session and verified wallet are available", async () => {
    const repository = { fetchByWallet: vi.fn() };
    const chainAdapter = { readHoldings: vi.fn() };
    const load = createDashboardHoldingsLoader({ chainAdapter, repository });

    await expect(load({ isSessionReady: false, viewer: viewer("0xabc") }))
      .resolves.toBeNull();
    await expect(load({ isSessionReady: true, viewer: null })).resolves.toBeNull();
    await expect(load({ isSessionReady: true, viewer: viewer(null) }))
      .resolves.toBeNull();
    expect(repository.fetchByWallet).not.toHaveBeenCalled();
    expect(chainAdapter.readHoldings).not.toHaveBeenCalled();
  });

  it("loads events and chain states using only the verified viewer wallet", async () => {
    const events = [event("event-1"), event("event-2")];
    const repository = { fetchByWallet: vi.fn().mockResolvedValue(events) };
    const chainAdapter = {
      readHoldings: vi.fn().mockResolvedValue(new Map([
        ["asset-1", {
          currentPriceUsdt: "10",
          currentShares: "2",
          status: "ready" as const,
        }],
      ])),
    };
    const load = createDashboardHoldingsLoader({ chainAdapter, repository });

    const result = await load({
      isSessionReady: true,
      viewer: viewer("0xABCDEF"),
    });

    expect(repository.fetchByWallet).toHaveBeenCalledWith("0xABCDEF");
    expect(chainAdapter.readHoldings).toHaveBeenCalledWith({
      assets: [events[0].asset],
      walletAddress: "0xABCDEF",
    });
    expect(result?.transactions).toHaveLength(2);
    expect(result?.holdings).toHaveLength(1);
  });
});

function viewer(walletAddress: string | null) {
  return { email: null, id: "viewer-1", walletAddress };
}

function event(id: string) {
  return {
    amountUsdt: "20",
    asset: {
      chainId: 97,
      contractAddress: "0x0000000000000000000000000000000000000001",
      id: "asset-1",
      imageUrl: null,
      symbol: "ART",
      title: "Artwork",
    },
    assetId: "asset-1",
    blockTimestamp: "2026-07-15T00:00:00.000Z",
    id,
    shares: "2",
    txHash: `0x${"a".repeat(64)}`,
  };
}
