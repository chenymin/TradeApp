import { describe, expect, it, vi } from "vitest";

import { createRuntimePublicAssetLoader } from "../services/createRuntimePublicAssetLoader";

describe("runtime public asset loader wiring", () => {
  it("connects the read-only repository and chain client", async () => {
    const query = {
      eq: vi.fn(() => query),
      or: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async () => ({ count: 1, data: [rawRow()], error: null })),
    };
    const supabaseClient = {
      from: vi.fn(() => ({ select: vi.fn(() => query) })),
    };
    const multicall = vi.fn(async () => [
      success(true),
      success(10n * 10n ** 18n),
      success(100n * 10n ** 18n),
      success(900n),
      success(1_100n),
    ]);
    const loader = createRuntimePublicAssetLoader({
      createChainClient: () => ({ multicall }),
      now: () => 1_000,
      supabaseClient,
    });

    const page = await loader({ filter: "all", pageSize: 20 });

    expect(supabaseClient.from).toHaveBeenCalledWith("art_assets");
    expect(multicall).toHaveBeenCalledOnce();
    expect(page.items[0]).toMatchObject({
      id: "asset-1",
      progressPercent: 10,
      saleStatus: "active",
    });
  });
});

function rawRow() {
  return {
    artwork_submissions: {
      artist_name: "Lin Wei",
      artist_name_en: null,
      image_urls: null,
      name: "Morning Mist",
      name_en: null,
    },
    chain_id: 97,
    contract_address: "0x1111111111111111111111111111111111111111",
    id: "asset-1",
    participants: 8,
    sale_end: null,
    sale_start: null,
    status: "upcoming",
    symbol: "ART-MIST",
    token_price_usdt: "0.1",
    total_supply: "1000",
  };
}

function success(result: unknown) {
  return { result, status: "success" as const };
}
