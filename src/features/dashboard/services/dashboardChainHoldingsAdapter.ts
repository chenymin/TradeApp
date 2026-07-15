import { formatUnits, isAddress } from "viem";

import type {
  DashboardChainHoldingState,
  DashboardHoldingAsset,
} from "../domain/holdings";
import type { DashboardChainHoldingsAdapter } from "./dashboardHoldingsLoader";

type MulticallResult =
  | { result: unknown; status: "success" }
  | { error?: unknown; status: "failure" };

type ContractCall = {
  abi: readonly unknown[];
  address: `0x${string}`;
  args?: readonly `0x${string}`[];
  functionName: string;
};

export type DashboardHoldingsReadClient = {
  multicall(input: {
    allowFailure: true;
    contracts: ContractCall[];
  }): Promise<MulticallResult[]>;
};

export function createDashboardChainHoldingsAdapter({
  createClient,
  getUsdtAddress,
}: {
  createClient(chainId: number): DashboardHoldingsReadClient;
  getUsdtAddress(chainId: number): string | null;
}): DashboardChainHoldingsAdapter {
  return {
    async readHoldings({ assets, walletAddress }) {
      if (!isAddress(walletAddress)) {
        return new Map(assets.map((asset) => [
          asset.id,
          { status: "unsupported" } as const,
        ]));
      }

      const states = new Map<string, DashboardChainHoldingState>();
      const groups = new Map<56 | 97, DashboardHoldingAsset[]>();

      for (const asset of assets) {
        if (!isSupportedChain(asset.chainId) || !validAddress(asset.contractAddress)) {
          states.set(asset.id, { status: "unsupported" });
          continue;
        }

        const group = groups.get(asset.chainId) ?? [];
        group.push(asset);
        groups.set(asset.chainId, group);
      }

      await Promise.all([...groups].map(async ([chainId, chainAssets]) => {
        const usdtAddress = getUsdtAddress(chainId);
        if (!validAddress(usdtAddress)) {
          setGroupState(states, chainAssets, "unsupported");
          return;
        }

        const contracts: ContractCall[] = [
          erc20Call(usdtAddress, "decimals"),
          ...chainAssets.flatMap((asset) => {
            const address = asset.contractAddress as `0x${string}`;
            return [
              erc20Call(address, "balanceOf", [walletAddress as `0x${string}`]),
              assetPriceCall(address),
            ];
          }),
        ];

        try {
          const results = await createClient(chainId).multicall({
            allowFailure: true,
            contracts,
          });
          const decimals = readDecimals(results[0]);

          chainAssets.forEach((asset, index) => {
            const balance = readBigInt(results[index * 2 + 1]);
            const price = readBigInt(results[index * 2 + 2]);

            if (balance === null || price === null) {
              states.set(asset.id, { status: "error" });
              return;
            }

            states.set(asset.id, {
              currentPriceUsdt: formatUnits(price, decimals),
              currentShares: formatUnits(balance, 18),
              status: "ready",
            });
          });
        } catch {
          setGroupState(states, chainAssets, "error");
        }
      }));

      return states;
    },
  };
}

function setGroupState(
  states: Map<string, DashboardChainHoldingState>,
  assets: DashboardHoldingAsset[],
  status: "error" | "unsupported",
): void {
  for (const asset of assets) {
    states.set(asset.id, { status });
  }
}

function readDecimals(result: MulticallResult | undefined): number {
  const value = result?.status === "success" ? result.result : undefined;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255
    ? value
    : 6;
}

function readBigInt(result: MulticallResult | undefined): bigint | null {
  return result?.status === "success" && typeof result.result === "bigint"
    ? result.result
    : null;
}

function isSupportedChain(chainId: number | null): chainId is 56 | 97 {
  return chainId === 56 || chainId === 97;
}

function validAddress(value: string | null): value is `0x${string}` {
  return Boolean(value && isAddress(value));
}

function erc20Call(
  address: `0x${string}`,
  functionName: "balanceOf" | "decimals",
  args?: readonly `0x${string}`[],
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
    ...(args ? { args } : {}),
    functionName,
  };
}

function assetPriceCall(address: `0x${string}`): ContractCall {
  return {
    abi: [{
      inputs: [],
      name: "priceUSDT",
      outputs: [{ type: "uint256" }],
      stateMutability: "view",
      type: "function",
    }],
    address,
    functionName: "priceUSDT",
  };
}
