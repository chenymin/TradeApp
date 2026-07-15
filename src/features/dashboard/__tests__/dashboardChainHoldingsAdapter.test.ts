import { describe, expect, it, vi } from "vitest";

import { createDashboardChainHoldingsAdapter } from "../services/dashboardChainHoldingsAdapter";

describe("dashboard chain holdings adapter", () => {
  it("groups assets by chain and formats balance and price with chain decimals", async () => {
    const clients = new Map([
      [56, fakeClient([
        success(18),
        success(1_000_000_000_000_000_000n),
        success(3_000_000_000_000_000_000n),
      ])],
      [97, fakeClient([
        success(6),
        success(2_000_000_000_000_000_000n),
        success(2_500_000n),
      ])],
    ]);
    const adapter = createDashboardChainHoldingsAdapter({
      createClient: (chainId) => clients.get(chainId)!.client,
      getUsdtAddress: () => address(9),
    });

    const states = await adapter.readHoldings({
      assets: [asset("asset-97", 97, 1), asset("asset-56", 56, 2)],
      walletAddress: address(8),
    });

    expect(states).toEqual(new Map([
      ["asset-97", {
        currentPriceUsdt: "2.5",
        currentShares: "2",
        status: "ready",
      }],
      ["asset-56", {
        currentPriceUsdt: "3",
        currentShares: "1",
        status: "ready",
      }],
    ]));
    expect(clients.get(56)!.multicall.mock.calls[0][0].contracts
      .map((call: { functionName: string }) => call.functionName))
      .toEqual(["decimals", "balanceOf", "priceUSDT"]);
    expect(clients.get(97)!.multicall).toHaveBeenCalledOnce();
  });

  it("marks invalid and unsupported assets without calling a chain", async () => {
    const createClient = vi.fn();
    const adapter = createDashboardChainHoldingsAdapter({
      createClient,
      getUsdtAddress: () => address(9),
    });

    const states = await adapter.readHoldings({
      assets: [
        asset("bad-address", 97, 1, "not-an-address"),
        asset("bad-chain", 1, 2),
      ],
      walletAddress: address(8),
    });

    expect(states).toEqual(new Map([
      ["bad-address", { status: "unsupported" }],
      ["bad-chain", { status: "unsupported" }],
    ]));
    expect(createClient).not.toHaveBeenCalled();
  });

  it("isolates a failed asset and an unavailable chain", async () => {
    const chain56 = fakeClient([], new Error("rpc unavailable"));
    const chain97 = fakeClient([
      failure(),
      success(1_000_000_000_000_000_000n),
      failure(),
      success(2_000_000_000_000_000_000n),
      success(4_000_000n),
    ]);
    const adapter = createDashboardChainHoldingsAdapter({
      createClient: (chainId) => chainId === 56 ? chain56.client : chain97.client,
      getUsdtAddress: () => address(9),
    });

    const states = await adapter.readHoldings({
      assets: [
        asset("chain-down", 56, 1),
        asset("asset-failed", 97, 2),
        asset("asset-ready", 97, 3),
      ],
      walletAddress: address(8),
    });

    expect(states.get("chain-down")).toEqual({ status: "error" });
    expect(states.get("asset-failed")).toEqual({ status: "error" });
    expect(states.get("asset-ready")).toEqual({
      currentPriceUsdt: "4",
      currentShares: "2",
      status: "ready",
    });
  });
});

function asset(
  id: string,
  chainId: number,
  addressIndex: number,
  contractAddress: string = address(addressIndex),
) {
  return {
    chainId,
    contractAddress,
    id,
    imageUrl: null,
    symbol: "ART",
    title: "Artwork",
  };
}

function address(index: number): `0x${string}` {
  return `0x${index.toString(16).padStart(40, "0")}`;
}

function success(result: unknown) {
  return { result, status: "success" as const };
}

function failure() {
  return { status: "failure" as const };
}

function fakeClient(results: unknown[], error?: Error) {
  const multicall = error
    ? vi.fn().mockRejectedValue(error)
    : vi.fn().mockResolvedValue(results);
  return { client: { multicall }, multicall };
}
