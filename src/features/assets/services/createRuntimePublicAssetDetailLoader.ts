import {
  createAssetDetailContractReadAdapter,
  type AssetDetailReadClient,
} from "./assetDetailContractReadAdapter";
import {
  createAssetDetailRepository,
  type AssetDetailRepositoryClient,
} from "./assetDetailRepository";
import {
  createAssetValuationRepository,
  type AssetValuationRepositoryClient,
} from "./assetValuationRepository";
import {
  createMintEventsRepository,
  type MintEventsRepositoryClient,
} from "./mintEventsRepository";
import { createPublicAssetDetailLoader } from "./publicAssetDetailLoader";

export type AssetDetailSupabaseClient = AssetDetailRepositoryClient &
  AssetValuationRepositoryClient & MintEventsRepositoryClient;

export function createRuntimePublicAssetDetailLoader({
  createChainClient,
  getUsdtAddress,
  now,
  supabaseClient,
}: {
  createChainClient(chainId: number): AssetDetailReadClient;
  getUsdtAddress(chainId: number): string | null;
  now?: () => number;
  supabaseClient: AssetDetailSupabaseClient;
}) {
  return createPublicAssetDetailLoader({
    chainAdapter: createAssetDetailContractReadAdapter({ createClient: createChainClient, getUsdtAddress }),
    eventsRepository: createMintEventsRepository(supabaseClient),
    now,
    repository: createAssetDetailRepository(supabaseClient),
    valuationRepository: createAssetValuationRepository(supabaseClient),
  });
}
