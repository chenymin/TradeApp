import { describe, expect, it } from "vitest";

import { createAssetRepository } from "../services/assetRepository";

describe("asset repository", () => {
  it("reads a filtered page and returns a cursor when another row exists", async () => {
    const fake = createFakeClient([
      rawRow("asset-1"),
      rawRow("asset-2"),
      rawRow("asset-3"),
    ], 3);

    const result = await createAssetRepository(fake.client).fetchAssetPage({
      filter: "active",
      pageSize: 2,
      sort: "recent",
    });

    expect(fake.calls[0]).toEqual(["from", "art_assets"]);
    expect(fake.calls).toContainEqual(["eq", "is_deleted", false]);
    expect(fake.calls).toContainEqual(["eq", "status", "active"]);
    expect(fake.calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(fake.calls).toContainEqual(["range", 0, 2]);
    expect(result.nextCursor).toBe("2");
    expect(result.totalCount).toBe(3);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      artistName: "Artist asset-1",
      chainId: 97,
      contractAddress: null,
      id: "asset-1",
      imageUrl: "https://images.example/asset-1.jpg",
      participantsCount: 4,
      saleEnd: null,
      saleStart: null,
      status: "active",
      symbol: "ART-1",
      title: "Artwork asset-1",
      tokenPriceUsdt: "0.1",
      totalSupply: "1000",
    });
  });

  it("maps price sorting, search, and cursor offsets", async () => {
    const fake = createFakeClient([rawRow("asset-3")], 3);

    await createAssetRepository(fake.client).fetchAssetPage({
      cursor: "2",
      filter: "all",
      pageSize: 2,
      search: "mist,100%",
      sort: "price_asc",
    });

    expect(fake.calls.filter((call) => call[0] === "from")).toHaveLength(2);
    expect(fake.calls).toContainEqual([
      "or",
      "symbol.ilike.%mist\\,100\\%%",
      undefined,
    ]);
    expect(fake.calls).toContainEqual([
      "or",
      "name.ilike.%mist\\,100\\%%,artist_name.ilike.%mist\\,100\\%%",
      { referencedTable: "artwork_submissions" },
    ]);
    expect(fake.calls).toContainEqual(["order", "token_price_usdt", { ascending: true }]);
    expect(fake.calls).toContainEqual(["range", 0, 4]);
  });

  it("normalizes numeric database values into decimal strings", async () => {
    const fake = createFakeClient([{
      ...rawRow("asset-1"),
      token_price_usdt: 0.1,
      total_supply: 1000,
    }], 1);

    const result = await createAssetRepository(fake.client).fetchAssetPage({
      filter: "all",
      pageSize: 20,
    });

    expect(result.rows[0]).toMatchObject({
      tokenPriceUsdt: "0.1",
      totalSupply: "1000",
    });
  });

  it("throws a normalized error when Supabase fails", async () => {
    const fake = createFakeClient([], null, { message: "permission denied" });

    await expect(createAssetRepository(fake.client).fetchAssetPage({
      filter: "all",
      pageSize: 20,
    })).rejects.toThrow("Unable to load public assets: permission denied");
  });
});

function rawRow(id: string) {
  return {
    artwork_submissions: {
      artist_name: `Artist ${id}`,
      artist_name_en: null,
      image_urls: [`https://images.example/${id}.jpg`],
      name: `Artwork ${id}`,
      name_en: null,
    },
    chain_id: 97,
    contract_address: null,
    id,
    participants: 4,
    sale_end: null,
    sale_start: null,
    status: "active",
    symbol: " ART-1 ",
    token_price_usdt: "0.1",
    total_supply: "1000",
  };
}

function createFakeClient(
  data: unknown[],
  count: number | null,
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    or(value: string, options?: unknown) {
      calls.push(["or", value, options]);
      return query;
    },
    order(column: string, options: unknown) {
      calls.push(["order", column, options]);
      return query;
    },
    async range(from: number, to: number) {
      calls.push(["range", from, to]);
      return { count, data, error };
    },
    select(columns: string, options: unknown) {
      calls.push(["select", columns, options]);
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
