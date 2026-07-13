import { formatUnits } from "viem";

import { resolveSaleDisplayState } from "./assetDisplayStatus";
import type {
  AssetChainReadState,
  AssetDatabaseRow,
  PublicAssetSummary,
} from "./assetModels";

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
});

export function toPublicAssetSummary(
  row: AssetDatabaseRow,
  chain: AssetChainReadState,
  nowSeconds: number,
): PublicAssetSummary {
  const soldPercent = calculateProgress(chain.sold, chain.saleCap);
  const resolution = resolveSaleDisplayState({
    chainReadState: chain.status,
    chainSaleActive: chain.saleActive,
    chainSaleEndTime: chain.saleEndTime,
    chainSaleStartTime: chain.saleStartTime,
    chainSoldPercent: soldPercent,
    contractAddress: row.contractAddress,
    dbStatus: row.status,
    nowSeconds,
  });
  const hasReadyChainState = chain.status === "ready";
  const soldOut = hasReadyChainState && chain.saleCap > 0n && chain.sold >= chain.saleCap;
  const priceAmount = normalizeDecimal(row.tokenPriceUsdt);

  return {
    artistName: row.artistName,
    availableSharesText: hasReadyChainState
      ? formatTokenAmount(maxBigInt(chain.saleCap - chain.sold, 0n))
      : "--",
    chainId: row.chainId,
    chainStatus: resolution.chainStatus,
    contractAddress: row.contractAddress,
    id: row.id,
    imageUrl: row.imageUrl,
    participantsCount: row.participantsCount,
    paymentSymbol: "USDT",
    priceAmount,
    priceText: `$${priceAmount} USDT`,
    progressPercent: soldPercent,
    remainingTimeText: resolveRemainingTime({
      chain,
      nowSeconds,
      row,
      status: resolution.displayStatus,
    }),
    saleCapText: hasReadyChainState ? formatTokenAmount(chain.saleCap) : "--",
    saleStatus: soldOut ? "sold_out" : resolution.displayStatus,
    soldSharesText: hasReadyChainState ? formatTokenAmount(chain.sold) : "--",
    title: row.title,
    tokenCode: row.symbol,
    totalSupplyText: formatDecimalText(row.totalSupply),
  };
}

export function calculateProgress(sold: bigint, cap: bigint): number {
  if (cap <= 0n) {
    return 0;
  }

  const basisPoints = (sold * 10_000n) / cap;
  return Math.min(100, Math.max(0, Number(basisPoints) / 100));
}

function formatTokenAmount(value: bigint): string {
  return formatDecimalText(formatUnits(value, 18));
}

function formatDecimalText(value: string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return INTEGER_FORMATTER.format(numericValue);
}

function normalizeDecimal(value: string): string {
  const normalized = value.trim().replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
  return normalized || "0";
}

function resolveRemainingTime({
  chain,
  nowSeconds,
  row,
  status,
}: {
  chain: AssetChainReadState;
  nowSeconds: number;
  row: AssetDatabaseRow;
  status: "active" | "upcoming" | "completed" | "paused";
}): string | null {
  const chainTarget = status === "upcoming" ? chain.saleStartTime : chain.saleEndTime;
  const databaseTarget = status === "upcoming" ? row.saleStart : row.saleEnd;
  const targetSeconds = chain.status === "ready" && chainTarget > 0n
    ? Number(chainTarget)
    : parseTimestampSeconds(databaseTarget);

  if (!targetSeconds || targetSeconds <= nowSeconds || status === "completed") {
    return null;
  }

  const remainingSeconds = targetSeconds - nowSeconds;
  const days = Math.floor(remainingSeconds / 86_400);

  if (days > 0) {
    return `${days} 天`;
  }

  const hours = Math.floor(remainingSeconds / 3_600);

  if (hours > 0) {
    return `${hours} 小时`;
  }

  return `${Math.max(1, Math.floor(remainingSeconds / 60))} 分钟`;
}

function parseTimestampSeconds(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1_000) : null;
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
