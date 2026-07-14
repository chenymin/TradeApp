import { getPublicChainClient, getUsdtAddress } from "../../../lib/chain/publicChainRegistry";
import { supabase } from "../../../lib/supabase/client";
import type { AssetDetailReadClient } from "./assetDetailContractReadAdapter";
import {
  createRuntimePublicAssetDetailLoader,
  type AssetDetailSupabaseClient,
} from "./createRuntimePublicAssetDetailLoader";

export function createDefaultPublicAssetDetailLoader() {
  return createRuntimePublicAssetDetailLoader({
    createChainClient: (chainId) => getPublicChainClient<AssetDetailReadClient>(chainId),
    getUsdtAddress,
    supabaseClient: supabase as unknown as AssetDetailSupabaseClient,
  });
}
