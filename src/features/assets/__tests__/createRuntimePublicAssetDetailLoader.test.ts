import { describe, expect, it, vi } from "vitest";

import {
  createRuntimePublicAssetDetailLoader,
  type AssetDetailSupabaseClient,
} from "../services/createRuntimePublicAssetDetailLoader";

describe("runtime public asset detail loader wiring", () => {
  it("connects read-only repositories and the asset-chain client", async () => {
    const supabaseClient = createSupabaseFake();
    const multicall = vi.fn().mockResolvedValue([
      success(true), success(250_000n), success(10_000_000n), success(12_000_000n),
      success(25n * 10n ** 18n), success(100n * 10n ** 18n), success(20n * 10n ** 18n),
      success(6_250_000n), success(900n), success(1_100n), success(6),
    ]);
    const createChainClient = vi.fn(() => ({ multicall }));
    const loader = createRuntimePublicAssetDetailLoader({
      createChainClient,
      getUsdtAddress: (chainId) => chainId === 97
        ? "0xd47c26E0D9657f654675F58E5EaF450d707a3F9e"
        : null,
      now: () => 1_000,
      supabaseClient: supabaseClient as unknown as AssetDetailSupabaseClient,
    });

    const result = await loader({
      assetId: "asset-1",
      viewer: {
        isLoggedIn: false,
        kycApproved: "unknown",
        walletAddress: null,
        whitelisted: "unknown",
      },
    });

    expect(supabaseClient.from).toHaveBeenCalledWith("art_assets");
    expect(supabaseClient.from).toHaveBeenCalledWith("asset_valuation_reports");
    expect(supabaseClient.from).toHaveBeenCalledWith("mint_events");
    expect(createChainClient).toHaveBeenCalledWith(97);
    expect(result.detail).toMatchObject({
      chainReadState: "ready",
      id: "asset-1",
      progressPercent: 25,
    });
  });
});

function createSupabaseFake() {
  const detailQuery = chain({ data: rawDetail(), error: null });
  const valuationQuery = chain({ data: null, error: null });
  const eventsQuery = chain({ data: [], error: null });
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => table === "art_assets"
        ? detailQuery
        : table === "asset_valuation_reports"
          ? valuationQuery
          : eventsQuery),
    })),
  };
}

function chain(response: { data: unknown; error: null }) {
  const query = {
    eq: vi.fn(() => query),
    limit: vi.fn((value: number) => value === 20 ? Promise.resolve(response) : query),
    maybeSingle: vi.fn().mockResolvedValue(response),
    order: vi.fn(() => query),
  };
  return query;
}

function rawDetail() {
  return {
    artwork_submissions: {
      artist_name: "Lin Wei",
      artist_name_en: null,
      creation_year: 2025,
      description: "Description",
      description_en: null,
      dimensions: null,
      image_urls: null,
      material: null,
      name: "Morning Mist",
      name_en: null,
      provenance: null,
    },
    chain_id: 97,
    contract_address: "0x1111111111111111111111111111111111111111",
    id: "asset-1",
    participants: 8,
    sale_end: null,
    sale_start: null,
    status: "upcoming",
    symbol: "ART-MIST",
    token_price_usdt: "0.25",
    total_supply: "1000",
  };
}

function success(result: unknown) {
  return { result, status: "success" as const };
}
