import { getPublicChainClient } from "../../../lib/chain/publicChainRegistry";
import { supabase } from "../../../lib/supabase/client";
import type { AssetReadClient } from "./assetContractReadAdapter";
import type { AssetRepositoryClient } from "./assetRepository";
import { createRuntimePublicAssetLoader } from "./createRuntimePublicAssetLoader";

export function createDefaultPublicAssetLoader() {
  return createRuntimePublicAssetLoader({
    createChainClient: (chainId) => getPublicChainClient<AssetReadClient>(chainId),
    supabaseClient: supabase as unknown as AssetRepositoryClient,
  });
}
