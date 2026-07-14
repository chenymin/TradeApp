import { formatUnits, isAddress } from "viem";

import { resolveAssetDetailActionState } from "./assetDetailActionState";
import { resolveSaleDisplayState } from "./assetDisplayStatus";
import { calculateProgress } from "./assetMappers";
import type {
  AssetChainEvent,
  AssetDetailMapperInput,
  AssetDetailReadModel,
  AssetDetailValuation,
  AssetDetailViewer,
  AssetEligibilitySummary,
  AssetMintEventRow,
  AssetValuationReport,
} from "./assetDetailModels";

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });
const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function toAssetDetailReadModel(input: AssetDetailMapperInput): AssetDetailReadModel {
  const ready = input.contract.status === "ready" ? input.contract : null;
  const progressPercent = ready ? calculateProgress(ready.sold, ready.saleCap) : 0;
  const sale = resolveSaleDisplayState({
    chainReadState: input.contract.status,
    chainSaleActive: ready?.saleActive,
    chainSaleEndTime: ready?.saleEndTime,
    chainSaleStartTime: ready?.saleStartTime,
    chainSoldPercent: progressPercent,
    contractAddress: input.database.contractAddress,
    dbStatus: input.database.status,
    nowSeconds: input.nowSeconds,
  });
  const soldOut = Boolean(ready && ready.saleCap > 0n && ready.sold >= ready.saleCap);
  const actionState = resolveAssetDetailActionState({
    isLoggedIn: input.viewer.isLoggedIn,
    kycApproved: input.viewer.kycApproved,
    sale,
    soldPercent: progressPercent,
    whitelisted: input.viewer.whitelisted,
  });
  const priceText = ready
    ? moneyFromRaw(ready.priceUsdtRaw, ready.usdtDecimals)
    : moneyFromDecimal(input.database.tokenPriceUsdt);
  const contractAddressShort = shortenHex(input.database.contractAddress);

  return {
    actionState,
    artistName: input.database.artistName,
    availableSharesText: ready
      ? tokenAmount(maxBigInt(ready.saleCap - ready.sold, 0n))
      : "--",
    chainId: input.database.chainId,
    chainReadState: input.contract.status,
    contractAddress: input.database.contractAddress,
    contractAddressShort,
    eligibility: mapEligibility(input.viewer),
    fundedAmountText: ready ? moneyFromRaw(ready.usdtRaisedRaw, ready.usdtDecimals) : "--",
    id: input.database.id,
    imageUrl: input.database.imageUrl,
    minPurchaseText: ready
      ? moneyFromRaw(ready.minPurchaseUsdtRaw, ready.usdtDecimals)
      : null,
    onchain: {
      chainName: input.database.chainId === 56
        ? "BNB Smart Chain"
        : input.database.chainId === 97
          ? "BNB Smart Chain Testnet"
          : "Unsupported chain",
      events: input.events.events.map((event) => mapEvent(event, input.database.chainId)),
      eventsStatus: input.events.warning
        ? "error"
        : input.events.events.length > 0
          ? "ready"
          : "empty",
      explorerUrl: buildBscScanUrl(
        input.database.chainId,
        "address",
        input.database.contractAddress,
      ),
      tokenStandard: "ERC-20",
    },
    overview: {
      creationYear: input.database.creationYear,
      description: input.database.description,
      dimensions: input.database.dimensions,
      material: input.database.material,
      provenance: input.database.provenance,
    },
    participantsCount: input.database.participantsCount,
    priceText,
    progressPercent,
    remainingTimeText: remainingTimeText(input, sale.displayStatus),
    reservedSharesText: ready ? tokenAmount(ready.reservedAmount) : "--",
    rules: {
      publicSaleText: ready ? tokenAmount(ready.saleCap) : "--",
      reservedText: ready ? tokenAmount(ready.reservedAmount) : "--",
      settlementAsset: "USDT (BEP-20)",
      totalSupplyText: decimalText(input.database.totalSupply),
    },
    saleCapText: ready ? tokenAmount(ready.saleCap) : "--",
    saleStatus: soldOut ? "sold_out" : sale.displayStatus,
    saleStatusSource: sale.source,
    soldSharesText: ready ? tokenAmount(ready.sold) : "--",
    title: input.database.title,
    tokenCode: input.database.symbol,
    totalSupplyText: decimalText(input.database.totalSupply),
    userAllowanceState: allowanceState(ready),
    userUsdtBalanceText: ready?.usdtBalanceRaw === null || ready?.usdtBalanceRaw === undefined
      ? null
      : moneyFromRaw(ready.usdtBalanceRaw, ready.usdtDecimals),
    valuation: mapValuation(input.valuation, input.valuationUnavailable),
  };
}

export function toSafeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildBscScanUrl(
  chainId: number | null,
  kind: "address" | "tx",
  value: string | null,
): string | null {
  const origin = chainId === 56
    ? "https://bscscan.com"
    : chainId === 97
      ? "https://testnet.bscscan.com"
      : null;
  const valid = kind === "address"
    ? Boolean(value && isAddress(value))
    : Boolean(value && /^0x[0-9a-fA-F]{64}$/.test(value));
  return origin && valid ? `${origin}/${kind}/${value}` : null;
}

export function shortenHex(value: string | null): string {
  if (!value || value.length < 12) return value || "--";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function mapValuation(
  report: AssetValuationReport | null,
  unavailable: boolean,
): AssetDetailValuation {
  if (unavailable) return emptyValuation("error");
  if (!report) return emptyValuation("empty");
  return {
    appraiser: report.appraiser,
    confidence: report.confidence,
    demandLevel: report.demandLevel,
    liquidityRating: report.liquidityRating,
    marketTrend: report.marketTrend,
    notes: report.notes,
    reportDate: report.reportDate,
    reportNumber: report.reportNumber,
    reportUrl: toSafeHttpUrl(report.reportUrl),
    status: "available",
    valuationText: moneyFromDecimal(report.valuationUsdt),
  };
}

function emptyValuation(status: "empty" | "error"): AssetDetailValuation {
  return {
    appraiser: null,
    confidence: null,
    demandLevel: null,
    liquidityRating: null,
    marketTrend: null,
    notes: null,
    reportDate: null,
    reportNumber: null,
    reportUrl: null,
    status,
    valuationText: null,
  };
}

function mapEvent(event: AssetMintEventRow, chainId: number | null): AssetChainEvent {
  return {
    amountText: `${moneyFromDecimal(event.amountUsdt)} / ${tokenAmountFromDecimal(event.shares)} shares`,
    explorerUrl: buildBscScanUrl(chainId, "tx", event.txHash),
    id: event.id,
    occurredAtText: formatDate(event.blockTimestamp),
    title: "Subscription",
    txHashShort: shortenHex(event.txHash),
    type: "purchase",
  };
}

function mapEligibility(viewer: AssetDetailViewer): AssetEligibilitySummary {
  if (!viewer.isLoggedIn) {
    return { status: "not_logged_in", title: "Connect wallet", description: "Sign in to check eligibility." };
  }
  if (viewer.kycApproved === false) {
    return { status: "kyc_required", title: "KYC required", description: "Complete identity verification before subscribing." };
  }
  if (viewer.kycApproved === "unknown" || viewer.whitelisted === "unknown") {
    return { status: "unknown", title: "Eligibility unavailable", description: "Eligibility could not be verified." };
  }
  if (!viewer.whitelisted) {
    return { status: "not_whitelisted", title: "Not eligible", description: "This wallet is not on the allowlist." };
  }
  return { status: "approved", title: "Eligible", description: "Wallet eligibility is verified." };
}

function allowanceState(
  ready: Extract<AssetDetailMapperInput["contract"], { status: "ready" }> | null,
): "unknown" | "sufficient" | "insufficient" {
  if (!ready || ready.usdtAllowanceRaw === null) return "unknown";
  return ready.usdtAllowanceRaw >= ready.minPurchaseUsdtRaw ? "sufficient" : "insufficient";
}

function moneyFromRaw(value: bigint, decimals: number): string {
  return moneyFromDecimal(formatUnits(value, decimals));
}

function moneyFromDecimal(value: string): string {
  return `$${decimalText(value)} USDT`;
}

function tokenAmount(value: bigint): string {
  return decimalText(formatUnits(value, 18));
}

function tokenAmountFromDecimal(value: string): string {
  if (/^\d+$/.test(value)) {
    try {
      return tokenAmount(BigInt(value));
    } catch {
      return "0";
    }
  }
  return decimalText(value);
}

function decimalText(value: string): string {
  const number = Number(value);
  return Number.isFinite(number) ? NUMBER_FORMATTER.format(number) : "0";
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : DATE_FORMATTER.format(date);
}

function remainingTimeText(
  input: AssetDetailMapperInput,
  status: "active" | "upcoming" | "completed" | "paused",
): string | null {
  if (status === "completed") return null;
  const ready = input.contract.status === "ready" ? input.contract : null;
  const rawTarget = status === "upcoming"
    ? ready?.saleStartTime
    : ready?.saleEndTime;
  const databaseTarget = status === "upcoming" ? input.database.saleStart : input.database.saleEnd;
  const target = rawTarget && rawTarget > 0n
    ? Number(rawTarget)
    : databaseTarget
      ? Math.floor(Date.parse(databaseTarget) / 1_000)
      : 0;
  if (!Number.isFinite(target) || target <= input.nowSeconds) return null;
  const seconds = target - input.nowSeconds;
  if (seconds >= 86_400) return `${Math.floor(seconds / 86_400)} 天`;
  if (seconds >= 3_600) return `${Math.floor(seconds / 3_600)} 小时`;
  return `${Math.max(1, Math.floor(seconds / 60))} 分钟`;
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
