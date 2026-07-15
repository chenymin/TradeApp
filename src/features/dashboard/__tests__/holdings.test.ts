import { describe, expect, it } from "vitest";

import { buildDashboardHoldings } from "../domain/holdings";

describe("dashboard holdings", () => {
  it("aggregates purchase cost and values the current remaining position", () => {
    const result = buildDashboardHoldings([
      event({ amountUsdt: "20", id: "event-1", shares: "2" }),
      event({ amountUsdt: "45", id: "event-2", shares: "3" }),
    ], new Map([
      ["asset-1", {
        currentPriceUsdt: "15",
        currentShares: "4",
        status: "ready" as const,
      }],
    ]));

    expect(result.holdings).toEqual([{
      assetId: "asset-1",
      avgBuyPriceUsdt: "13",
      currentPriceUsdt: "15",
      currentShares: "4",
      gainPercent: "15.384615384615384615",
      imageUrl: "https://images.example/art.jpg",
      symbol: "ART",
      title: "Artwork",
      valueUsdt: "60",
    }]);
    expect(result.summary).toEqual({
      holdingsCount: 1,
      pnlPercent: "15.384615384615384615",
      totalInvestedUsdt: "52",
      totalPnlUsdt: "8",
      totalValueUsdt: "60",
    });
    expect(result.transactions.map((transaction) => transaction.priceUsdt)).toEqual([
      "10",
      "15",
    ]);
  });

  it("keeps a positive chain balance with no usable cost and returns null gain", () => {
    const result = buildDashboardHoldings([
      event({ amountUsdt: "10", shares: "0" }),
    ], new Map([
      ["asset-1", {
        currentPriceUsdt: "2.5",
        currentShares: "3",
        status: "ready" as const,
      }],
    ]));

    expect(result.holdings[0]).toMatchObject({
      avgBuyPriceUsdt: "0",
      gainPercent: null,
      valueUsdt: "7.5",
    });
    expect(result.transactions[0].priceUsdt).toBe("0");
    expect(result.summary).toMatchObject({
      pnlPercent: "0",
      totalInvestedUsdt: "0",
      totalPnlUsdt: "7.5",
    });
  });

  it("filters zero balances and reports chain failures without dropping transactions", () => {
    const result = buildDashboardHoldings([
      event({ assetId: "asset-1", id: "event-1" }),
      event({ assetId: "asset-2", id: "event-2" }),
    ], new Map([
      ["asset-1", {
        currentPriceUsdt: "12",
        currentShares: "0",
        status: "ready" as const,
      }],
      ["asset-2", { status: "error" as const }],
    ]));

    expect(result.holdings).toEqual([]);
    expect(result.transactions).toHaveLength(2);
    expect(result.warnings).toEqual([
      { assetId: "asset-2", code: "chain_unavailable" },
    ]);
  });
});

function event(overrides: Partial<{
  amountUsdt: string;
  assetId: string;
  id: string;
  shares: string;
}> = {}) {
  const assetId = overrides.assetId ?? "asset-1";
  return {
    amountUsdt: overrides.amountUsdt ?? "10",
    asset: {
      chainId: 97,
      contractAddress: "0x0000000000000000000000000000000000000001",
      id: assetId,
      imageUrl: "https://images.example/art.jpg",
      symbol: "ART",
      title: "Artwork",
    },
    assetId,
    blockTimestamp: "2026-07-15T00:00:00.000Z",
    id: overrides.id ?? "event-1",
    shares: overrides.shares ?? "1",
    txHash: `0x${"a".repeat(64)}`,
  };
}
