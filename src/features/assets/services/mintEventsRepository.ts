import type {
  AssetMintEventRow,
  MintEventsRepository,
} from "../domain/assetDetailModels";

const EVENTS_SELECT = "id, tx_hash, block_timestamp, amount_usdt, shares";

type EventsResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type EventsQuery = {
  eq(column: string, value: unknown): EventsQuery;
  limit(value: number): PromiseLike<EventsResponse>;
  order(column: string, options: { ascending: boolean }): EventsQuery;
};

export type MintEventsRepositoryClient = {
  from(table: "mint_events"): {
    select(columns: string): EventsQuery;
  };
};

export function createMintEventsRepository(
  client: MintEventsRepositoryClient,
): MintEventsRepository {
  return {
    async fetchRecentEvents(assetId) {
      const response = await client
        .from("mint_events")
        .select(EVENTS_SELECT)
        .eq("asset_id", assetId)
        .eq("is_deleted", false)
        .order("block_timestamp", { ascending: false })
        .limit(20);

      if (response.error) {
        return { events: [], warning: "events_unavailable" };
      }

      return {
        events: (response.data ?? []).map(mapEvent),
        warning: null,
      };
    },
  };
}

function mapEvent(value: unknown): AssetMintEventRow {
  const row = value as Record<string, unknown>;
  return {
    amountUsdt: decimal(row.amount_usdt),
    blockTimestamp: text(row.block_timestamp),
    id: String(row.id),
    shares: decimal(row.shares),
    txHash: text(row.tx_hash) ?? "",
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function decimal(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  return text(value) ?? "0";
}
