import { isAddress } from "viem";

import { ZERO_ADDRESS } from "../domain/assetDisplayStatus";
import type {
  AssetDetailContractReadAdapter,
  AssetDetailContractReadyState,
} from "../domain/assetDetailModels";

type MulticallResult =
  | { result: unknown; status: "success" }
  | { error?: unknown; status: "failure" };

type ContractCall = {
  abi: readonly unknown[];
  address: `0x${string}`;
  args?: readonly unknown[];
  functionName: string;
};

export type AssetDetailReadClient = {
  multicall(input: {
    allowFailure: true;
    contracts: ContractCall[];
  }): Promise<MulticallResult[]>;
};

export function createAssetDetailContractReadAdapter({
  createClient,
  getUsdtAddress,
}: {
  createClient(chainId: number): AssetDetailReadClient;
  getUsdtAddress(chainId: number): string | null;
}): AssetDetailContractReadAdapter {
  return {
    async readDetailState({ chainId, contractAddress, walletAddress }) {
      if (!isSupportedChain(chainId) || !validAddress(contractAddress)) {
        return { status: "unsupported" };
      }

      const usdtAddress = getUsdtAddress(chainId);
      if (!validAddress(usdtAddress)) {
        return { status: "unsupported" };
      }

      const asset = contractAddress as `0x${string}`;
      const usdt = usdtAddress as `0x${string}`;
      const wallet = validAddress(walletAddress) ? walletAddress as `0x${string}` : null;
      const contracts: ContractCall[] = [
        assetCall(asset, "saleActive"),
        assetCall(asset, "priceUSDT"),
        assetCall(asset, "minPurchaseUSDT"),
        assetCall(asset, "MIN_PURCHASE_USDT"),
        assetCall(asset, "sold"),
        assetCall(asset, "SALE_CAP"),
        assetCall(asset, "RESERVED_AMOUNT"),
        assetCall(asset, "usdtRaised"),
        assetCall(asset, "saleStartTime"),
        assetCall(asset, "saleEndTime"),
        erc20Call(usdt, "decimals"),
      ];

      if (wallet) {
        contracts.push(
          erc20Call(asset, "balanceOf", [wallet]),
          erc20Call(usdt, "balanceOf", [wallet]),
          erc20Call(usdt, "allowance", [wallet, asset]),
        );
      }

      try {
        const results = await createClient(chainId).multicall({
          allowFailure: true,
          contracts,
        });
        return mapResults(results, Boolean(wallet));
      } catch {
        return { status: "error" };
      }
    },
  };
}

function mapResults(
  results: MulticallResult[],
  hasWallet: boolean,
): AssetDetailContractReadyState | { status: "error" } {
  const value = (index: number) => results[index]?.status === "success"
    ? results[index].result
    : undefined;
  const saleActive = value(0);
  const priceUsdtRaw = value(1);
  const legacyMin = value(2);
  const preferredMin = value(3);
  const sold = value(4);
  const saleCap = value(5);
  const reservedAmount = value(6);
  const usdtRaisedRaw = value(7);
  const saleStartTime = value(8);
  const saleEndTime = value(9);
  const usdtDecimals = value(10);
  const minPurchaseUsdtRaw = typeof preferredMin === "bigint" ? preferredMin : legacyMin;

  if (
    typeof saleActive !== "boolean" ||
    typeof priceUsdtRaw !== "bigint" ||
    typeof minPurchaseUsdtRaw !== "bigint" ||
    typeof sold !== "bigint" ||
    typeof saleCap !== "bigint" ||
    typeof reservedAmount !== "bigint" ||
    typeof usdtRaisedRaw !== "bigint" ||
    typeof saleStartTime !== "bigint" ||
    typeof saleEndTime !== "bigint" ||
    typeof usdtDecimals !== "number" ||
    !Number.isInteger(usdtDecimals) ||
    usdtDecimals < 0 ||
    usdtDecimals > 255
  ) {
    return { status: "error" };
  }

  return {
    artBalanceRaw: hasWallet ? optionalBigInt(value(11)) : null,
    minPurchaseUsdtRaw,
    priceUsdtRaw,
    reservedAmount,
    saleActive,
    saleCap,
    saleEndTime,
    saleStartTime,
    sold,
    status: "ready",
    usdtAllowanceRaw: hasWallet ? optionalBigInt(value(13)) : null,
    usdtBalanceRaw: hasWallet ? optionalBigInt(value(12)) : null,
    usdtDecimals,
    usdtRaisedRaw,
  };
}

function optionalBigInt(value: unknown): bigint | null {
  return typeof value === "bigint" ? value : null;
}

function validAddress(value: string | null): boolean {
  return Boolean(value && value.toLowerCase() !== ZERO_ADDRESS && isAddress(value));
}

function isSupportedChain(chainId: number | null): chainId is 56 | 97 {
  return chainId === 56 || chainId === 97;
}

function assetCall(address: `0x${string}`, functionName: string): ContractCall {
  return {
    abi: [viewFunction(functionName, [], functionName === "saleActive" ? "bool" : "uint256")],
    address,
    functionName,
  };
}

function erc20Call(
  address: `0x${string}`,
  functionName: "allowance" | "balanceOf" | "decimals",
  args?: readonly `0x${string}`[],
): ContractCall {
  const inputs = functionName === "allowance"
    ? [{ type: "address" }, { type: "address" }]
    : functionName === "balanceOf"
      ? [{ type: "address" }]
      : [];
  return {
    abi: [viewFunction(functionName, inputs, functionName === "decimals" ? "uint8" : "uint256")],
    address,
    ...(args ? { args } : {}),
    functionName,
  };
}

function viewFunction(
  name: string,
  inputs: Array<{ type: string }>,
  outputType: "bool" | "uint256" | "uint8",
) {
  return {
    inputs,
    name,
    outputs: [{ type: outputType }],
    stateMutability: "view",
    type: "function",
  } as const;
}
