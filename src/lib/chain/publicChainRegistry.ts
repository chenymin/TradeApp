import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";

const USDT_ADDRESSES: Record<56 | 97, `0x${string}`> = {
  56: "0x55d398326f99059fF775485246999027B3197955",
  97: "0xd47c26E0D9657f654675F58E5EaF450d707a3F9e",
};

const clients = new Map<number, unknown>();

export function getPublicChainClient<T>(chainId: number): T {
  const cached = clients.get(chainId);
  if (cached) return cached as T;
  const chain = chainId === bsc.id ? bsc : chainId === bscTestnet.id ? bscTestnet : null;
  if (!chain) throw new Error(`Unsupported public asset chain: ${chainId}`);
  const client = createPublicClient({ chain, transport: http() });
  clients.set(chainId, client);
  return client as T;
}

export function getUsdtAddress(chainId: number): `0x${string}` | null {
  return chainId === 56 || chainId === 97 ? USDT_ADDRESSES[chainId] : null;
}
