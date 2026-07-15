import {
  addDecimals,
  divideDecimals,
  isPositiveDecimal,
  multiplyDecimals,
  normalizeUnsignedDecimal,
  percentDecimal,
  subtractDecimals,
} from "./decimal";
import { getDashboardTransactionUrl } from "./dashboardExplorer";

export type DashboardHoldingAsset = {
  chainId: number | null;
  contractAddress: string | null;
  id: string;
  imageUrl: string | null;
  symbol: string;
  title: string;
};

export type DashboardMintEvent = {
  amountUsdt: string;
  asset: DashboardHoldingAsset | null;
  assetId: string;
  blockTimestamp: string | null;
  id: string;
  shares: string;
  txHash: string;
};

export type DashboardChainHoldingState =
  | { currentPriceUsdt: string; currentShares: string; status: "ready" }
  | { status: "error" | "unsupported" };

export type DashboardHolding = {
  assetId: string;
  avgBuyPriceUsdt: string;
  currentPriceUsdt: string;
  currentShares: string;
  gainPercent: string | null;
  imageUrl: string | null;
  symbol: string;
  title: string;
  valueUsdt: string;
};

export type DashboardTransaction = {
  amountUsdt: string;
  assetId: string;
  chainId: number | null;
  explorerUrl: string | null;
  id: string;
  priceUsdt: string;
  shares: string;
  symbol: string;
  timestamp: string | null;
  txHash: string;
  type: "buy";
};

export function buildDashboardHoldings(
  events: DashboardMintEvent[],
  chainStates: Map<string, DashboardChainHoldingState>,
) {
  const costs = aggregateCosts(events);
  const assets = new Map<string, DashboardHoldingAsset>();

  for (const event of events) {
    if (event.asset && !assets.has(event.assetId)) {
      assets.set(event.assetId, event.asset);
    }
  }

  const holdings: DashboardHolding[] = [];
  const warnings: Array<{
    assetId: string;
    code: "chain_unavailable" | "chain_unsupported";
  }> = [];

  for (const [assetId, asset] of assets) {
    const state = chainStates.get(assetId);

    if (!state || state.status !== "ready") {
      if (state) {
        warnings.push({
          assetId,
          code: state.status === "unsupported"
            ? "chain_unsupported"
            : "chain_unavailable",
        });
      }
      continue;
    }

    const currentShares = normalizeUnsignedDecimal(state.currentShares);
    if (!isPositiveDecimal(currentShares)) {
      continue;
    }

    const currentPriceUsdt = normalizeUnsignedDecimal(state.currentPriceUsdt);
    const cost = costs.get(assetId) ?? { totalShares: "0", totalUsdt: "0" };
    const avgBuyPriceUsdt = isPositiveDecimal(cost.totalShares)
      ? divideDecimals(cost.totalUsdt, cost.totalShares)
      : "0";
    const valueUsdt = multiplyDecimals(currentShares, currentPriceUsdt);
    const gainPercent = isPositiveDecimal(avgBuyPriceUsdt)
      ? percentDecimal(
        subtractDecimals(currentPriceUsdt, avgBuyPriceUsdt),
        avgBuyPriceUsdt,
      )
      : null;

    holdings.push({
      assetId,
      avgBuyPriceUsdt,
      currentPriceUsdt,
      currentShares,
      gainPercent,
      imageUrl: asset.imageUrl,
      symbol: asset.symbol,
      title: asset.title,
      valueUsdt,
    });
  }

  const transactions: DashboardTransaction[] = events.map((event) => {
    const shares = normalizeUnsignedDecimal(event.shares);
    const amountUsdt = normalizeUnsignedDecimal(event.amountUsdt);
    return {
      amountUsdt,
      assetId: event.assetId,
      chainId: event.asset?.chainId ?? null,
      explorerUrl: getDashboardTransactionUrl(
        event.txHash,
        event.asset?.chainId ?? null,
      ),
      id: event.id,
      priceUsdt: isPositiveDecimal(shares)
        ? divideDecimals(amountUsdt, shares)
        : "0",
      shares,
      symbol: event.asset?.symbol ?? event.assetId,
      timestamp: event.blockTimestamp,
      txHash: event.txHash,
      type: "buy",
    };
  });

  const totalValueUsdt = holdings.reduce(
    (total, holding) => addDecimals(total, holding.valueUsdt),
    "0",
  );
  const totalInvestedUsdt = holdings.reduce(
    (total, holding) => addDecimals(
      total,
      multiplyDecimals(holding.currentShares, holding.avgBuyPriceUsdt),
    ),
    "0",
  );
  const totalPnlUsdt = subtractDecimals(totalValueUsdt, totalInvestedUsdt);

  return {
    holdings,
    summary: {
      holdingsCount: holdings.length,
      pnlPercent: isPositiveDecimal(totalInvestedUsdt)
        ? percentDecimal(totalPnlUsdt, totalInvestedUsdt)
        : "0",
      totalInvestedUsdt,
      totalPnlUsdt,
      totalValueUsdt,
    },
    transactions,
    warnings,
  };
}

function aggregateCosts(events: DashboardMintEvent[]) {
  const costs = new Map<string, { totalShares: string; totalUsdt: string }>();

  for (const event of events) {
    const current = costs.get(event.assetId) ?? {
      totalShares: "0",
      totalUsdt: "0",
    };
    costs.set(event.assetId, {
      totalShares: addDecimals(
        current.totalShares,
        normalizeUnsignedDecimal(event.shares),
      ),
      totalUsdt: addDecimals(
        current.totalUsdt,
        normalizeUnsignedDecimal(event.amountUsdt),
      ),
    });
  }

  return costs;
}
