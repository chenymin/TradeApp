import { describe, expect, it, vi } from "vitest";

import { createDashboardHoldingsLoader } from "../services/dashboardHoldingsLoader";

describe("dashboard holdings loader", () => {
  it("does not query until the investor session is available", async () => {
    const eventsRepository = { fetchByInvestor: vi.fn() };
    const walletsRepository = { fetchActiveEthereumByInvestor: vi.fn() };
    const chainAdapter = { readHoldings: vi.fn() };
    const load = createDashboardHoldingsLoader({
      chainAdapter,
      eventsRepository,
      walletsRepository,
    });

    await expect(load({ isSessionReady: false, viewer: viewer("0xabc") }))
      .resolves.toBeNull();
    await expect(load({ isSessionReady: true, viewer: null })).resolves.toBeNull();
    expect(eventsRepository.fetchByInvestor).not.toHaveBeenCalled();
    expect(walletsRepository.fetchActiveEthereumByInvestor).not.toHaveBeenCalled();
    expect(chainAdapter.readHoldings).not.toHaveBeenCalled();
  });

  it("loads investor events and aggregates every active Ethereum wallet", async () => {
    const events = [event("event-1"), event("event-2")];
    const eventsRepository = {
      fetchByInvestor: vi.fn().mockResolvedValue(events),
    };
    const walletAddresses = [address(8), address(9)];
    const walletsRepository = {
      fetchActiveEthereumByInvestor: vi.fn().mockResolvedValue(walletAddresses),
    };
    const chainAdapter = {
      readHoldings: vi.fn().mockResolvedValue(new Map([
        ["asset-1", {
          currentPriceUsdt: "10",
          currentShares: "2",
          status: "ready" as const,
        }],
      ])),
    };
    const load = createDashboardHoldingsLoader({
      chainAdapter,
      eventsRepository,
      walletsRepository,
    });

    const result = await load({
      isSessionReady: true,
      viewer: viewer(null),
    });

    expect(eventsRepository.fetchByInvestor).toHaveBeenCalledWith("viewer-1");
    expect(walletsRepository.fetchActiveEthereumByInvestor)
      .toHaveBeenCalledWith("viewer-1");
    expect(chainAdapter.readHoldings).toHaveBeenCalledWith({
      assets: [events[0].asset],
      walletAddresses,
    });
    expect(result?.transactions).toHaveLength(2);
    expect(result?.holdings).toHaveLength(1);
  });

  it("propagates account wallet read failures instead of returning zero holdings", async () => {
    const load = createDashboardHoldingsLoader({
      chainAdapter: { readHoldings: vi.fn() },
      eventsRepository: { fetchByInvestor: vi.fn().mockResolvedValue([]) },
      walletsRepository: {
        fetchActiveEthereumByInvestor: vi.fn().mockRejectedValue(
          new Error("wallet read failed"),
        ),
      },
    });

    await expect(load({ isSessionReady: true, viewer: viewer(null) }))
      .rejects.toThrow("wallet read failed");
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

function address(lastDigit: number): `0x${string}` {
  return `0x${lastDigit.toString(16).padStart(40, "0")}`;
}
