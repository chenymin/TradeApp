import type {
  AssetDatabasePage,
  AssetDatabaseRow,
  AssetPageRequest,
  AssetRepository,
  AssetSaleStatus,
} from "../domain/assetModels";

const ASSET_SELECT = `
  id, symbol, contract_address, chain_id,
  token_price_usdt, total_supply,
  sale_start, sale_end, status, participants, created_at,
  artwork_submissions!submission_id(
    name, name_en, artist_name, artist_name_en, image_urls
  )
`;

const ASSET_SEARCH_SELECT = `
  id, symbol, contract_address, chain_id,
  token_price_usdt, total_supply,
  sale_start, sale_end, status, participants, created_at,
  artwork_submissions!submission_id!inner(
    name, name_en, artist_name, artist_name_en, image_urls
  )
`;

type QueryResponse = {
  count: number | null;
  data: unknown[] | null;
  error: { message: string } | null;
};

type QueryBuilder = {
  eq(column: string, value: unknown): QueryBuilder;
  or(value: string, options?: { referencedTable: string }): QueryBuilder;
  order(column: string, options: { ascending: boolean }): QueryBuilder;
  range(from: number, to: number): PromiseLike<QueryResponse>;
};

export type AssetRepositoryClient = {
  from(table: "art_assets"): {
    select(
      columns: string,
      options: { count: "exact" },
    ): QueryBuilder;
  };
};

export function createAssetRepository(client: AssetRepositoryClient): AssetRepository {
  return {
    async fetchAssetPage(request) {
      const offset = parseCursor(request.cursor);
      const search = request.search?.trim();

      if (search) {
        return fetchSearchPage(client, request, offset, search);
      }

      let query = createBaseQuery(client, request, ASSET_SELECT);
      const order = resolveOrder(request);
      query = query.order(order.column, { ascending: order.ascending });

      const response = await query.range(offset, offset + request.pageSize);

      if (response.error) {
        throw new Error(`Unable to load public assets: ${response.error.message}`);
      }

      const rows = (response.data ?? []).slice(0, request.pageSize).map(mapDatabaseRow);
      const hasNextPage = (response.data?.length ?? 0) > request.pageSize;

      return {
        nextCursor: hasNextPage ? String(offset + request.pageSize) : null,
        rows,
        ...(typeof response.count === "number" ? { totalCount: response.count } : {}),
      } satisfies AssetDatabasePage;
    },
  };
}

async function fetchSearchPage(
  client: AssetRepositoryClient,
  request: AssetPageRequest,
  offset: number,
  search: string,
): Promise<AssetDatabasePage> {
  const pattern = `%${escapePostgrestPattern(search)}%`;
  const order = resolveOrder(request);
  const rangeEnd = offset + request.pageSize;
  const symbolQuery = createBaseQuery(client, request, ASSET_SELECT)
    .or(`symbol.ilike.${pattern}`)
    .order(order.column, { ascending: order.ascending });
  const artworkQuery = createBaseQuery(client, request, ASSET_SEARCH_SELECT)
    .or(
      `name.ilike.${pattern},artist_name.ilike.${pattern}`,
      { referencedTable: "artwork_submissions" },
    )
    .order(order.column, { ascending: order.ascending });
  const [symbolResponse, artworkResponse] = await Promise.all([
    symbolQuery.range(0, rangeEnd),
    artworkQuery.range(0, rangeEnd),
  ]);

  throwForQueryError(symbolResponse.error);
  throwForQueryError(artworkResponse.error);

  const mergedRows = mergeRawRows([
    ...(symbolResponse.data ?? []),
    ...(artworkResponse.data ?? []),
  ]).sort((left, right) => compareRawRows(left, right, request));
  const pageRows = mergedRows.slice(offset, offset + request.pageSize);
  const queriedPastPage = [symbolResponse, artworkResponse].some(
    (response) => (response.data?.length ?? 0) > offset + request.pageSize,
  );
  const hasNextPage = mergedRows.length > offset + request.pageSize || queriedPastPage;

  return {
    nextCursor: hasNextPage ? String(offset + request.pageSize) : null,
    rows: pageRows.map(mapDatabaseRow),
  };
}

function createBaseQuery(
  client: AssetRepositoryClient,
  request: AssetPageRequest,
  select: string,
): QueryBuilder {
  let query = client
    .from("art_assets")
    .select(select, { count: "exact" })
    .eq("is_deleted", false);

  if (request.filter !== "all") {
    query = query.eq("status", request.filter);
  }

  return query;
}

function throwForQueryError(error: QueryResponse["error"]): void {
  if (error) {
    throw new Error(`Unable to load public assets: ${error.message}`);
  }
}

function mergeRawRows(values: unknown[]): RawAssetRow[] {
  const rows = new Map<string, RawAssetRow>();

  for (const value of values) {
    const row = value as RawAssetRow;
    rows.set(String(row.id), row);
  }

  return [...rows.values()];
}

function compareRawRows(
  left: RawAssetRow,
  right: RawAssetRow,
  request: AssetPageRequest,
): number {
  if (request.sort === "price_asc") {
    return compareDecimalStrings(left.token_price_usdt, right.token_price_usdt);
  }

  if (request.sort === "price_desc") {
    return compareDecimalStrings(right.token_price_usdt, left.token_price_usdt);
  }

  return parseTimestamp(right.created_at) - parseTimestamp(left.created_at);
}

function compareDecimalStrings(left: string | null, right: string | null): number {
  const normalizedLeft = normalizeUnsignedDecimal(left);
  const normalizedRight = normalizeUnsignedDecimal(right);

  if (normalizedLeft.integer.length !== normalizedRight.integer.length) {
    return normalizedLeft.integer.length - normalizedRight.integer.length;
  }

  const integerComparison = normalizedLeft.integer.localeCompare(normalizedRight.integer);

  if (integerComparison !== 0) {
    return integerComparison;
  }

  const fractionLength = Math.max(normalizedLeft.fraction.length, normalizedRight.fraction.length);
  return normalizedLeft.fraction.padEnd(fractionLength, "0")
    .localeCompare(normalizedRight.fraction.padEnd(fractionLength, "0"));
}

function normalizeUnsignedDecimal(value: string | null): {
  fraction: string;
  integer: string;
} {
  const [integer = "0", fraction = ""] = (value ?? "0").trim().split(".");
  return {
    fraction: fraction.replace(/0+$/, ""),
    integer: integer.replace(/^0+(?=\d)/, "") || "0",
  };
}

function parseTimestamp(value: string | null | undefined): number {
  const timestamp = value ? Date.parse(value) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function resolveOrder(request: AssetPageRequest): {
  ascending: boolean;
  column: string;
} {
  if (request.sort === "price_asc") {
    return { ascending: true, column: "token_price_usdt" };
  }

  if (request.sort === "price_desc") {
    return { ascending: false, column: "token_price_usdt" };
  }

  return { ascending: false, column: "created_at" };
}

function parseCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }

  const parsed = Number.parseInt(cursor, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function escapePostgrestPattern(value: string): string {
  return value.replace(/[\\,%_]/g, (character) => `\\${character}`);
}

function mapDatabaseRow(value: unknown): AssetDatabaseRow {
  const row = value as RawAssetRow;
  const submission = Array.isArray(row.artwork_submissions)
    ? row.artwork_submissions[0] ?? null
    : row.artwork_submissions;

  return {
    artistName: submission?.artist_name?.trim() || submission?.artist_name_en?.trim() || "Unknown artist",
    chainId: typeof row.chain_id === "number" ? row.chain_id : null,
    contractAddress: row.contract_address?.trim() || null,
    id: String(row.id),
    imageUrl: submission?.image_urls?.[0]?.trim() || null,
    participantsCount: Number.isFinite(row.participants) ? Math.max(0, row.participants ?? 0) : 0,
    saleEnd: row.sale_end ?? null,
    saleStart: row.sale_start ?? null,
    status: normalizeStatus(row.status),
    symbol: row.symbol?.trim() || "--",
    title: submission?.name?.trim() || submission?.name_en?.trim() || "Untitled asset",
    tokenPriceUsdt: row.token_price_usdt?.trim() || "0",
    totalSupply: row.total_supply?.trim() || "0",
  };
}

function normalizeStatus(value: string | null | undefined): AssetSaleStatus {
  if (
    value === "active" ||
    value === "upcoming" ||
    value === "completed" ||
    value === "paused"
  ) {
    return value;
  }

  return "upcoming";
}

type RawSubmission = {
  artist_name: string | null;
  artist_name_en: string | null;
  image_urls: string[] | null;
  name: string | null;
  name_en: string | null;
};

type RawAssetRow = {
  artwork_submissions: RawSubmission | RawSubmission[] | null;
  chain_id: number | null;
  contract_address: string | null;
  created_at?: string | null;
  id: string;
  participants: number | null;
  sale_end: string | null;
  sale_start: string | null;
  status: string | null;
  symbol: string | null;
  token_price_usdt: string | null;
  total_supply: string | null;
};
