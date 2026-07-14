import type {
  AssetValuationReport,
  AssetValuationRepository,
} from "../domain/assetDetailModels";

const VALUATION_SELECT = `
  appraiser, report_number, report_date, valuation_usdt, report_url,
  market_trend, demand_level, confidence, liquidity_rating, notes, created_at
`;

type QueryResponse = {
  data: unknown | null;
  error: { message: string } | null;
};

type ValuationQuery = {
  eq(column: string, value: unknown): ValuationQuery;
  limit(value: number): ValuationQuery;
  maybeSingle(): Promise<QueryResponse>;
  order(column: string, options: { ascending: boolean }): ValuationQuery;
};

export type AssetValuationRepositoryClient = {
  from(table: "asset_valuation_reports"): {
    select(columns: string): ValuationQuery;
  };
};

export function createAssetValuationRepository(
  client: AssetValuationRepositoryClient,
): AssetValuationRepository {
  return {
    async fetchLatestReport(assetId) {
      const response = await client
        .from("asset_valuation_reports")
        .select(VALUATION_SELECT)
        .eq("asset_id", assetId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (response.error) {
        throw new Error(`Unable to load asset valuation: ${response.error.message}`);
      }

      return response.data ? mapValuation(response.data) : null;
    },
  };
}

function mapValuation(value: unknown): AssetValuationReport {
  const row = value as Record<string, unknown>;
  return {
    appraiser: text(row.appraiser),
    confidence: text(row.confidence),
    demandLevel: text(row.demand_level),
    liquidityRating: text(row.liquidity_rating),
    marketTrend: text(row.market_trend),
    notes: text(row.notes),
    reportDate: text(row.report_date),
    reportNumber: text(row.report_number),
    reportUrl: text(row.report_url),
    valuationUsdt: decimal(row.valuation_usdt),
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function decimal(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  return text(value) ?? "0";
}
