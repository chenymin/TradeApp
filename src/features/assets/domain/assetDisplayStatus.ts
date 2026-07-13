import type {
  AssetChainStatus,
  AssetSaleStatus,
  SaleStatusResolution,
} from "./assetModels";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function hasSupportedContractAddress(address: string | null): boolean {
  return Boolean(address && address.toLowerCase() !== ZERO_ADDRESS);
}

export function resolveChainSaleStatus({
  nowSeconds,
  saleActive,
  saleEndTime,
  saleStartTime,
  soldPercent,
}: {
  nowSeconds: number;
  saleActive: boolean;
  saleEndTime?: bigint;
  saleStartTime?: bigint;
  soldPercent: number;
}): AssetSaleStatus {
  if (soldPercent >= 100) {
    return "completed";
  }

  if (saleEndTime && saleEndTime > 0n && nowSeconds > Number(saleEndTime)) {
    return "completed";
  }

  if (saleStartTime && saleStartTime > 0n && nowSeconds < Number(saleStartTime)) {
    return "upcoming";
  }

  if (saleActive) {
    return "active";
  }

  if (
    saleStartTime &&
    saleEndTime &&
    saleStartTime > 0n &&
    saleEndTime > 0n &&
    nowSeconds >= Number(saleStartTime) &&
    nowSeconds <= Number(saleEndTime)
  ) {
    return "paused";
  }

  return "upcoming";
}

export function resolveSaleDisplayState({
  chainReadState,
  chainSaleActive = false,
  chainSaleEndTime,
  chainSaleStartTime,
  chainSoldPercent = 0,
  contractAddress,
  dbStatus,
  nowSeconds,
}: {
  chainReadState: AssetChainStatus;
  chainSaleActive?: boolean;
  chainSaleEndTime?: bigint;
  chainSaleStartTime?: bigint;
  chainSoldPercent?: number;
  contractAddress: string | null;
  dbStatus: AssetSaleStatus;
  nowSeconds: number;
}): SaleStatusResolution {
  if (!hasSupportedContractAddress(contractAddress)) {
    return {
      canTrustForPurchase: false,
      chainStatus: "unsupported",
      displayStatus: dbStatus,
      source: "unsupported",
    };
  }

  if (chainReadState !== "ready") {
    return {
      canTrustForPurchase: false,
      chainStatus: chainReadState,
      displayStatus: dbStatus,
      source: "database_fallback",
    };
  }

  return {
    canTrustForPurchase: true,
    chainStatus: "ready",
    displayStatus: resolveChainSaleStatus({
      nowSeconds,
      saleActive: chainSaleActive,
      saleEndTime: chainSaleEndTime,
      saleStartTime: chainSaleStartTime,
      soldPercent: chainSoldPercent,
    }),
    source: "chain",
  };
}
