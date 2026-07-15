import { normalizeUnsignedDecimal } from "../domain/decimal";
import type { DashboardMintEvent } from "../domain/holdings";

const MINT_EVENTS_SELECT = `
  id, asset_id, tx_hash, shares, amount_usdt, block_timestamp,
  art_assets!asset_id(
    id, symbol, contract_address, chain_id,
    artwork_submissions!submission_id(name, name_en, image_urls)
  )
`;

type MintEventsResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type MintEventsQuery = {
  eq(column: string, value: unknown): MintEventsQuery;
  order(
    column: string,
    options: { ascending: boolean },
  ): PromiseLike<MintEventsResponse>;
};

export type DashboardMintEventsClient = {
  from(table: "mint_events"): {
    select(columns: string): MintEventsQuery;
  };
};

export type DashboardMintEventsRepository = {
  fetchByWallet(walletAddress: string): Promise<DashboardMintEvent[]>;
};

export function createDashboardMintEventsRepository(
  client: DashboardMintEventsClient,
): DashboardMintEventsRepository {
  return {
    async fetchByWallet(walletAddress) {
      const response = await client
        .from("mint_events")
        .select(MINT_EVENTS_SELECT)
        .eq("buyer_wallet", walletAddress.toLowerCase())
        .eq("is_deleted", false)
        .order("block_timestamp", { ascending: false });

      if (response.error) {
        throw new Error(
          `Unable to load dashboard mint events: ${response.error.message}`,
        );
      }

      return (response.data ?? []).map(mapMintEvent);
    },
  };
}

function mapMintEvent(value: unknown): DashboardMintEvent {
  const row = value as Record<string, unknown>;
  const rawAsset = firstRelation(row.art_assets);
  const submission = rawAsset
    ? firstRelation(rawAsset.artwork_submissions)
    : null;
  const assetId = text(row.asset_id) ?? "";

  return {
    amountUsdt: normalizeUnsignedDecimal(row.amount_usdt),
    asset: rawAsset
      ? {
        chainId: typeof rawAsset.chain_id === "number" ? rawAsset.chain_id : null,
        contractAddress: text(rawAsset.contract_address),
        id: text(rawAsset.id) ?? assetId,
        imageUrl: firstText(submission?.image_urls),
        symbol: text(rawAsset.symbol) ?? "--",
        title: text(submission?.name) ?? text(submission?.name_en) ?? "Untitled asset",
      }
      : null,
    assetId,
    blockTimestamp: text(row.block_timestamp),
    id: String(row.id),
    shares: normalizeUnsignedDecimal(row.shares),
    txHash: text(row.tx_hash) ?? "",
  };
}

function firstRelation(value: unknown): Record<string, unknown> | null {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation && typeof relation === "object"
    ? relation as Record<string, unknown>
    : null;
}

function firstText(value: unknown): string | null {
  return Array.isArray(value) ? text(value[0]) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
