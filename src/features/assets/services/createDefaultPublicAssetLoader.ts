import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

import { supabase } from "../../../lib/supabase/client";
import type { AssetReadClient } from "./assetContractReadAdapter";
import type { AssetRepositoryClient } from "./assetRepository";
import { createRuntimePublicAssetLoader } from "./createRuntimePublicAssetLoader";

const clients = new Map<number, AssetReadClient>();

export function createDefaultPublicAssetLoader() {
  return createRuntimePublicAssetLoader({
    createChainClient: getChainClient,
    supabaseClient: supabase as unknown as AssetRepositoryClient,
  });
}

function getChainClient(chainId: number): AssetReadClient {
  const cached = clients.get(chainId);

  if (cached) {
    return cached;
  }

  const chain = chainId === bsc.id
    ? bsc
    : chainId === bscTestnet.id
      ? bscTestnet
      : null;

  if (!chain) {
    throw new Error(`Unsupported public asset chain: ${chainId}`);
  }

  const client = createPublicClient({ chain, transport: http() }) as unknown as AssetReadClient;
  clients.set(chainId, client);
  return client;
}
