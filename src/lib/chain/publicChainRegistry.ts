import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

export type PublicChainConfig = {
  chainId: 56 | 97;
  explorerOrigin: string;
  name: string;
  nativeDecimals: 18;
  nativeSymbol: "BNB";
  usdtAddress: `0x${string}`;
};

const PUBLIC_CHAIN_CONFIGS: Record<56 | 97, PublicChainConfig> = {
  56: {
    chainId: 56,
    explorerOrigin: "https://bscscan.com",
    name: "BNB Smart Chain",
    nativeDecimals: 18,
    nativeSymbol: "BNB",
    usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
  },
  97: {
    chainId: 97,
    explorerOrigin: "https://testnet.bscscan.com",
    name: "BNB Smart Chain Testnet",
    nativeDecimals: 18,
    nativeSymbol: "BNB",
    usdtAddress: "0xd47c26E0D9657f654675F58E5EaF450d707a3F9e",
  },
};

const PUBLIC_CHAINS = {
  56: bsc,
  97: bscTestnet,
};

const clients = new Map<number, unknown>();

export function getPublicChainConfig(chainId: number): PublicChainConfig {
  if (!isSupportedPublicChainId(chainId)) {
    throw new Error(`Unsupported public chain: ${chainId}`);
  }
  return PUBLIC_CHAIN_CONFIGS[chainId];
}

export function getPublicChainClient<T>(chainId: number): T {
  const publicChain = getPublicChainConfig(chainId);
  const cached = clients.get(publicChain.chainId);
  if (cached) return cached as T;
  const chain = PUBLIC_CHAINS[publicChain.chainId];
  const client = createPublicClient({ chain, transport: http() });
  clients.set(publicChain.chainId, client);
  return client as T;
}

export function getUsdtAddress(chainId: number): `0x${string}` | null {
  return isSupportedPublicChainId(chainId)
    ? getPublicChainConfig(chainId).usdtAddress
    : null;
}

function isSupportedPublicChainId(chainId: number): chainId is 56 | 97 {
  return chainId === 56 || chainId === 97;
}
