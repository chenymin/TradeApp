import { getAddress, isAddress } from "viem";

import type {
  WalletAssetContract,
  WalletAssetContractRepository,
} from "../domain/walletModels";

const WALLET_ASSET_SELECT =
  "id, symbol, contract_address, artwork_submissions!submission_id(image_urls)";

type QueryResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<QueryResponse> & {
  eq(column: string, value: unknown): QueryBuilder;
};

export type WalletAssetContractRepositoryClient = {
  from(table: "art_assets"): {
    select(columns: string): QueryBuilder;
  };
};

export function createWalletAssetContractRepository(
  client: WalletAssetContractRepositoryClient,
): WalletAssetContractRepository {
  return {
    async fetchByChain(chainId) {
      const response = await client
        .from("art_assets")
        .select(WALLET_ASSET_SELECT)
        .eq("chain_id", chainId)
        .eq("is_deleted", false);

      if (response.error) {
        throw new Error(
          `Unable to discover wallet assets: ${response.error.message}`,
        );
      }

      return mapContracts(response.data ?? []);
    },
  };
}

function mapContracts(rows: unknown[]): WalletAssetContract[] {
  const contracts = new Map<string, WalletAssetContract>();

  for (const value of rows) {
    const row = value as RawAssetRow;
    const address = row.contract_address?.trim();
    if (!address || !isAddress(address)) continue;

    const normalizedAddress = getAddress(address);
    const key = normalizedAddress.toLowerCase();
    if (contracts.has(key)) continue;

    const submission = Array.isArray(row.artwork_submissions)
      ? row.artwork_submissions[0] ?? null
      : row.artwork_submissions;

    contracts.set(key, {
      address: normalizedAddress,
      id: String(row.id),
      imageUrl: submission?.image_urls?.find((url) => url.trim())?.trim() ?? null,
      symbol: row.symbol?.trim() || "ART",
    });
  }

  return [...contracts.values()];
}

type RawAssetRow = {
  artwork_submissions: {
    image_urls: string[] | null;
  } | Array<{
    image_urls: string[] | null;
  }> | null;
  contract_address: string | null;
  id: string | number;
  symbol: string | null;
};
