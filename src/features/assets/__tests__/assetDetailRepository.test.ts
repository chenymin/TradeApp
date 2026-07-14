import { describe, expect, it } from "vitest";

import { createAssetDetailRepository } from "../services/assetDetailRepository";

describe("asset detail repository", () => {
  it("reads one non-deleted asset with its artwork detail fields", async () => {
    const fake = createSingleQueryFake(rawAsset());

    const detail = await createAssetDetailRepository(fake.client).fetchAssetDetail("asset-1");

    expect(fake.calls[0]).toEqual(["from", "art_assets"]);
    const select = fake.calls.find((call) => call[0] === "select")?.[1];
    expect(select).toContain("artwork_submissions!submission_id");
    expect(select).toContain("description");
    expect(select).toContain("dimensions");
    expect(select).toContain("creation_year");
    expect(select).toContain("material");
    expect(select).toContain("provenance");
    expect(select).not.toContain("*");
    expect(fake.calls).toContainEqual(["eq", "id", "asset-1"]);
    expect(fake.calls).toContainEqual(["eq", "is_deleted", false]);
    expect(detail).toMatchObject({
      artistName: "Artist One",
      chainId: 97,
      description: "A public artwork",
      id: "asset-1",
      imageUrl: "https://images.example/asset-1.jpg",
      title: "Artwork One",
      tokenPriceUsdt: "0.25",
      totalSupply: "1000000",
    });
  });

  it("rejects when the primary detail cannot be loaded", async () => {
    const fake = createSingleQueryFake(null, { message: "permission denied" });

    await expect(
      createAssetDetailRepository(fake.client).fetchAssetDetail("asset-1"),
    ).rejects.toThrow("Unable to load asset detail: permission denied");
  });

  it("rejects when the requested asset does not exist", async () => {
    const fake = createSingleQueryFake(null);

    await expect(
      createAssetDetailRepository(fake.client).fetchAssetDetail("missing"),
    ).rejects.toThrow("Asset detail not found");
  });
});

function rawAsset() {
  return {
    artwork_submissions: {
      artist_name: "Artist One",
      artist_name_en: null,
      creation_year: 2025,
      description: "A public artwork",
      description_en: null,
      dimensions: "120 x 80 cm",
      image_urls: ["https://images.example/asset-1.jpg"],
      material: "Oil on canvas",
      name: "Artwork One",
      name_en: null,
      provenance: "Studio archive",
    },
    chain_id: 97,
    contract_address: "0x1111111111111111111111111111111111111111",
    id: "asset-1",
    participants: 8,
    sale_end: "2026-08-01T00:00:00Z",
    sale_start: "2026-07-01T00:00:00Z",
    status: "active",
    symbol: "ART1",
    token_price_usdt: "0.25",
    total_supply: "1000000",
  };
}

function createSingleQueryFake(
  data: unknown,
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    async maybeSingle() {
      calls.push(["maybeSingle"]);
      return { data, error };
    },
    select(columns: string) {
      calls.push(["select", columns]);
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
