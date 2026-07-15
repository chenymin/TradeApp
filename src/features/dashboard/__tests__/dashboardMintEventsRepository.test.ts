import { describe, expect, it } from "vitest";

import { createDashboardMintEventsRepository } from "../services/dashboardMintEventsRepository";

describe("dashboard mint events repository", () => {
  it("reads the verified wallet events with associated asset metadata", async () => {
    const fake = createFakeClient([rawEvent()]);

    const events = await createDashboardMintEventsRepository(fake.client)
      .fetchByWallet("0xABCDEF");

    expect(fake.calls).toEqual([
      ["from", "mint_events"],
      ["select", expect.stringContaining("art_assets!asset_id")],
      ["eq", "buyer_wallet", "0xabcdef"],
      ["eq", "is_deleted", false],
      ["order", "block_timestamp", { ascending: false }],
    ]);
    expect(events).toEqual([{
      amountUsdt: "25.5",
      asset: {
        chainId: 97,
        contractAddress: "0x0000000000000000000000000000000000000001",
        id: "asset-1",
        imageUrl: "https://images.example/art.jpg",
        symbol: "ART",
        title: "Artwork",
      },
      assetId: "asset-1",
      blockTimestamp: "2026-07-15T00:00:00.000Z",
      id: "event-1",
      shares: "2",
      txHash: `0x${"a".repeat(64)}`,
    }]);
  });

  it("propagates query errors instead of returning a false empty state", async () => {
    const repository = createDashboardMintEventsRepository(
      createFakeClient(null, { message: "permission denied" }).client,
    );

    await expect(repository.fetchByWallet("0xabcdef")).rejects.toThrow(
      "Unable to load dashboard mint events: permission denied",
    );
  });
});

function rawEvent() {
  return {
    amount_usdt: "25.5",
    art_assets: {
      artwork_submissions: {
        image_urls: ["https://images.example/art.jpg"],
        name: "Artwork",
        name_en: "Artwork EN",
      },
      chain_id: 97,
      contract_address: "0x0000000000000000000000000000000000000001",
      id: "asset-1",
      symbol: " ART ",
    },
    asset_id: "asset-1",
    block_timestamp: "2026-07-15T00:00:00.000Z",
    id: "event-1",
    shares: "2",
    tx_hash: `0x${"a".repeat(64)}`,
  };
}

function createFakeClient(
  data: unknown[] | null,
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    async order(column: string, options: unknown) {
      calls.push(["order", column, options]);
      return { data, error };
    },
    select(columns: string) {
      calls.push(["select", columns.replace(/\s+/g, " ").trim()]);
      return query;
    },
  };

  return {
    calls,
    client: {
      from(table: string) {
        calls.push(["from", table]);
        return query;
      },
    },
  };
}
