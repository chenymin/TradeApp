import { describe, expect, it } from "vitest";

import { createAssetValuationRepository } from "../services/assetValuationRepository";

describe("asset valuation repository", () => {
  it("reads the latest non-deleted valuation with explicit fields", async () => {
    const fake = createValuationFake({
      appraiser: "Example Appraisal",
      confidence: "high",
      demand_level: "high",
      liquidity_rating: "medium",
      market_trend: "bullish",
      notes: "Independent report",
      report_date: "2026-06-01",
      report_number: "VAL-001",
      report_url: "https://reports.example/VAL-001.pdf",
      valuation_usdt: "1250000",
    });

    const report = await createAssetValuationRepository(fake.client)
      .fetchLatestReport("asset-1");

    expect(fake.calls[0]).toEqual(["from", "asset_valuation_reports"]);
    expect(fake.calls).toContainEqual(["eq", "asset_id", "asset-1"]);
    expect(fake.calls).toContainEqual(["eq", "is_deleted", false]);
    expect(fake.calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(fake.calls).toContainEqual(["limit", 1]);
    expect(String(fake.calls.find((call) => call[0] === "select")?.[1])).not.toContain("*");
    expect(report).toMatchObject({
      appraiser: "Example Appraisal",
      reportNumber: "VAL-001",
      valuationUsdt: "1250000",
    });
  });

  it("returns null when no valuation exists", async () => {
    const fake = createValuationFake(null);

    await expect(
      createAssetValuationRepository(fake.client).fetchLatestReport("asset-1"),
    ).resolves.toBeNull();
  });

  it("rejects valuation query errors for the aggregate loader to localize", async () => {
    const fake = createValuationFake(null, { message: "RLS denied" });

    await expect(
      createAssetValuationRepository(fake.client).fetchLatestReport("asset-1"),
    ).rejects.toThrow("Unable to load asset valuation: RLS denied");
  });
});

function createValuationFake(
  data: unknown,
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    limit(value: number) {
      calls.push(["limit", value]);
      return query;
    },
    async maybeSingle() {
      calls.push(["maybeSingle"]);
      return { data, error };
    },
    order(column: string, options: unknown) {
      calls.push(["order", column, options]);
      return query;
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
