import { formatUnits } from "viem";

import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import type {
  WalletAssetContract,
  WalletBalanceRow,
} from "../domain/walletModels";

export type WalletMulticallResult =
  | { result: unknown; status: "success" }
  | { error?: unknown; status: "failure" };

type ContractCall = {
  abi: readonly unknown[];
  address: `0x${string}`;
  args?: readonly [`0x${string}`];
  functionName: "balanceOf" | "decimals";
};

export type WalletBalanceReadClient = {
  getBalance(input: { address: `0x${string}` }): Promise<bigint>;
  multicall(input: {
    allowFailure: true;
    contracts: ContractCall[];
  }): Promise<WalletMulticallResult[]>;
};

export type WalletBalanceReader = {
  read(input: {
    address: `0x${string}`;
    assets: WalletAssetContract[];
    chain: PublicChainConfig;
  }): Promise<WalletBalanceRow[]>;
};

export function createWalletBalanceReader(
  client: WalletBalanceReadClient,
): WalletBalanceReader {
  return {
    async read({ address, assets, chain }) {
      const tokens: TokenDescriptor[] = [
        {
          address: chain.usdtAddress,
          id: `usdt:${chain.chainId}`,
          imageUrl: null,
          kind: "usdt",
          symbol: "USDT",
        },
        ...assets.map((asset) => ({
          address: asset.address,
          id: asset.id,
          imageUrl: asset.imageUrl,
          kind: "art" as const,
          symbol: asset.symbol,
        })),
      ];
      const [nativeResult, tokenResult] = await Promise.allSettled([
        client.getBalance({ address }),
        readTokens(client, address, tokens),
      ]);

      return [
        nativeResult.status === "fulfilled"
          ? readyNativeRow(chain, nativeResult.value)
          : unavailableNativeRow(chain),
        ...(tokenResult.status === "fulfilled"
          ? tokenResult.value
          : tokens.map(unavailableTokenRow)),
      ];
    },
  };
}

async function readTokens(
  client: WalletBalanceReadClient,
  walletAddress: `0x${string}`,
  tokens: TokenDescriptor[],
): Promise<WalletBalanceRow[]> {
  const results = await client.multicall({
    allowFailure: true,
    contracts: tokens.flatMap((token) => [
      erc20Call(token.address, "decimals"),
      erc20Call(token.address, "balanceOf", walletAddress),
    ]),
  });

  return tokens.flatMap((token, index) => {
    const decimals = readDecimals(results[index * 2]);
    const balance = readBalance(results[index * 2 + 1]);
    if (decimals === null || balance === null) return [unavailableTokenRow(token)];
    if (token.kind === "art" && balance === 0n) return [];

    return [{
      contractAddress: token.address,
      displayAmount: formatUnits(balance, decimals),
      id: token.id,
      imageUrl: token.imageUrl,
      kind: token.kind,
      status: "ready" as const,
      symbol: token.symbol,
    }];
  });
}

function readyNativeRow(
  chain: PublicChainConfig,
  balance: bigint,
): WalletBalanceRow {
  return {
    contractAddress: null,
    displayAmount: formatUnits(balance, chain.nativeDecimals),
    id: `native:${chain.chainId}`,
    imageUrl: null,
    kind: "native",
    status: "ready",
    symbol: chain.nativeSymbol,
  };
}

export function unavailableNativeRow(
  chain: PublicChainConfig,
): WalletBalanceRow {
  return {
    contractAddress: null,
    id: `native:${chain.chainId}`,
    imageUrl: null,
    kind: "native",
    status: "unavailable",
    symbol: chain.nativeSymbol,
  };
}

export function unavailableTokenRow(
  token: TokenDescriptor,
): WalletBalanceRow {
  return {
    contractAddress: token.address,
    id: token.id,
    imageUrl: token.imageUrl,
    kind: token.kind,
    status: "unavailable",
    symbol: token.symbol,
  };
}

function readDecimals(result: WalletMulticallResult | undefined): number | null {
  const value = result?.status === "success" ? result.result : null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255
    ? value
    : null;
}

function readBalance(result: WalletMulticallResult | undefined): bigint | null {
  return result?.status === "success" && typeof result.result === "bigint"
    ? result.result
    : null;
}

function erc20Call(
  address: `0x${string}`,
  functionName: "decimals" | "balanceOf",
  walletAddress?: `0x${string}`,
): ContractCall {
  return {
    abi: [{
      inputs: functionName === "balanceOf" ? [{ type: "address" }] : [],
      name: functionName,
      outputs: [{ type: functionName === "decimals" ? "uint8" : "uint256" }],
      stateMutability: "view",
      type: "function",
    }],
    address,
    ...(walletAddress ? { args: [walletAddress] as const } : {}),
    functionName,
  };
}

type TokenDescriptor = {
  address: `0x${string}`;
  id: string;
  imageUrl: string | null;
  kind: "usdt" | "art";
  symbol: string;
};
