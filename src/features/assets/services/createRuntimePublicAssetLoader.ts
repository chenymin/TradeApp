import type { PublicAssetPageLoader } from "../domain/assetModels";
import {
  createAssetContractReadAdapter,
  type AssetReadClient,
} from "./assetContractReadAdapter";
import {
  createAssetRepository,
  type AssetRepositoryClient,
} from "./assetRepository";
import { createPublicAssetPageLoader } from "./publicAssetPageLoader";

export function createRuntimePublicAssetLoader({
  createChainClient,
  now,
  supabaseClient,
}: {
  createChainClient(chainId: number): AssetReadClient;
  now?: () => number;
  supabaseClient: AssetRepositoryClient;
}): PublicAssetPageLoader {
  return createPublicAssetPageLoader({
    chainAdapter: createAssetContractReadAdapter({ createClient: createChainClient }),
    now,
    repository: createAssetRepository(supabaseClient),
  });
}
