import type {
  AssetDetailDatabaseRow,
  AssetDetailRepository,
} from "../domain/assetDetailModels";

const DETAIL_SELECT = `
  id, symbol, contract_address, chain_id,
  token_price_usdt, total_supply,
  sale_start, sale_end, status, participants,
  artwork_submissions!submission_id(
    name, name_en, artist_name, artist_name_en, image_urls,
    description, description_en, dimensions, creation_year, material, provenance
  )
`;

type QueryResponse = {
  data: unknown | null;
  error: { message: string } | null;
};

type DetailQuery = {
  eq(column: string, value: unknown): DetailQuery;
  maybeSingle(): Promise<QueryResponse>;
};

export type AssetDetailRepositoryClient = {
  from(table: "art_assets"): {
    select(columns: string): DetailQuery;
  };
};

export function createAssetDetailRepository(
  client: AssetDetailRepositoryClient,
): AssetDetailRepository {
  return {
    async fetchAssetDetail(assetId) {
      const response = await client
        .from("art_assets")
        .select(DETAIL_SELECT)
        .eq("id", assetId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (response.error) {
        throw new Error(`Unable to load asset detail: ${response.error.message}`);
      }

      if (!response.data) {
        throw new Error("Asset detail not found");
      }

      return mapDetailRow(response.data);
    },
  };
}

function mapDetailRow(value: unknown): AssetDetailDatabaseRow {
  const row = value as RawDetailRow;
  const submission = Array.isArray(row.artwork_submissions)
    ? row.artwork_submissions[0] ?? null
    : row.artwork_submissions;

  return {
    artistName: clean(submission?.artist_name) || clean(submission?.artist_name_en) || "Unknown artist",
    chainId: normalizeChainId(row.chain_id),
    contractAddress: clean(row.contract_address),
    creationYear: normalizeOptionalText(submission?.creation_year),
    description: clean(submission?.description) || clean(submission?.description_en),
    dimensions: clean(submission?.dimensions),
    id: String(row.id),
    imageUrl: clean(submission?.image_urls?.[0]),
    material: clean(submission?.material),
    participantsCount: normalizeCount(row.participants),
    provenance: clean(submission?.provenance),
    saleEnd: clean(row.sale_end),
    saleStart: clean(row.sale_start),
    status: normalizeStatus(row.status),
    symbol: clean(row.symbol) || "--",
    title: clean(submission?.name) || clean(submission?.name_en) || "Untitled asset",
    tokenPriceUsdt: normalizeDecimal(row.token_price_usdt),
    totalSupply: normalizeDecimal(row.total_supply),
  };
}

function clean(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function normalizeOptionalText(value: number | string | null | undefined): string | null {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  return clean(value);
}

function normalizeDecimal(value: number | string | null | undefined): string {
  return normalizeOptionalText(value) ?? "0";
}

function normalizeCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeChainId(value: number | string | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeStatus(value: string | null | undefined): AssetDetailDatabaseRow["status"] {
  return value === "active" || value === "completed" || value === "paused" || value === "upcoming"
    ? value
    : "upcoming";
}

type RawSubmission = {
  artist_name?: string | null;
  artist_name_en?: string | null;
  creation_year?: number | string | null;
  description?: string | null;
  description_en?: string | null;
  dimensions?: string | null;
  image_urls?: string[] | null;
  material?: string | null;
  name?: string | null;
  name_en?: string | null;
  provenance?: string | null;
};

type RawDetailRow = {
  artwork_submissions?: RawSubmission | RawSubmission[] | null;
  chain_id?: number | string | null;
  contract_address?: string | null;
  id: unknown;
  participants?: number | null;
  sale_end?: string | null;
  sale_start?: string | null;
  status?: string | null;
  symbol?: string | null;
  token_price_usdt?: number | string | null;
  total_supply?: number | string | null;
};
