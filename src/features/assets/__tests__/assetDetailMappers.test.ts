import { describe, expect, it } from "vitest";

import type {
  AssetDetailContractReadyState,
  AssetDetailDatabaseRow,
} from "../domain/assetDetailModels";
import {
  buildBscScanUrl,
  toAssetDetailReadModel,
  toSafeHttpUrl,
} from "../domain/assetDetailMappers";

const CONTRACT = "0x1111111111111111111111111111111111111111";

const database: AssetDetailDatabaseRow = {
  artistName: "Lin Wei",
  chainId: 97,
  contractAddress: CONTRACT,
  creationYear: "2025",
  description: "Morning light over the harbor.",
  dimensions: "120 x 80 cm",
  id: "asset-1",
  imageUrl: "https://images.example/mist.jpg",
  material: "Oil on canvas",
  participantsCount: 12,
  provenance: "Artist studio archive",
  saleEnd: "1970-01-01T00:20:00Z",
  saleStart: "1970-01-01T00:15:00Z",
  status: "upcoming",
  symbol: "ART-MIST",
  title: "Morning Mist",
  tokenPriceUsdt: "0.3",
  totalSupply: "1000",
};

const contract: AssetDetailContractReadyState = {
  artBalanceRaw: null,
  minPurchaseUsdtRaw: 10_000_000n,
  priceUsdtRaw: 250_000n,
  reservedAmount: 200n * 10n ** 18n,
  saleActive: true,
  saleCap: 1_000n * 10n ** 18n,
  saleEndTime: 1_200n,
  saleStartTime: 900n,
  sold: 250n * 10n ** 18n,
  status: "ready",
  usdtAllowanceRaw: null,
  usdtBalanceRaw: null,
  usdtDecimals: 6,
  usdtRaisedRaw: 2_500_000_000n,
};

describe("asset detail mappers", () => {
  it("maps trusted chain and database values into display-ready detail", () => {
    const detail = toAssetDetailReadModel({
      contract,
      database,
      events: {
        events: [{
          amountUsdt: "125.5",
          blockTimestamp: "2026-07-10T09:00:00Z",
          id: "event-1",
          shares: "502000000000000000000",
          txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }],
        warning: null,
      },
      nowSeconds: 1_000,
      valuation: {
        appraiser: "Example Appraisal",
        confidence: "high",
        demandLevel: "high",
        liquidityRating: "medium",
        marketTrend: "bullish",
        notes: "Independent report",
        reportDate: "2026-06-01",
        reportNumber: "VAL-001",
        reportUrl: "https://reports.example/VAL-001.pdf",
        valuationUsdt: "1250000",
      },
      valuationUnavailable: false,
      viewer: {
        isLoggedIn: true,
        kycApproved: true,
        walletAddress: null,
        whitelisted: true,
      },
    });

    expect(detail).toMatchObject({
      actionState: "sale_open",
      availableSharesText: "750",
      chainReadState: "ready",
      contractAddressShort: "0x1111...1111",
      fundedAmountText: "$2,500 USDT",
      minPurchaseText: "$10 USDT",
      priceText: "$0.25 USDT",
      progressPercent: 25,
      reservedSharesText: "200",
      saleCapText: "1,000",
      saleStatus: "active",
      saleStatusSource: "chain",
      soldSharesText: "250",
      totalSupplyText: "1,000",
    });
    expect(detail.onchain.explorerUrl).toBe(
      `https://testnet.bscscan.com/address/${CONTRACT}`,
    );
    expect(detail.onchain.events[0]).toMatchObject({
      amountText: "$125.5 USDT / 502 shares",
      txHashShort: "0xaaaa...aaaa",
    });
    expect(detail.valuation).toMatchObject({
      reportUrl: "https://reports.example/VAL-001.pdf",
      status: "available",
      valuationText: "$1,250,000 USDT",
    });
  });

  it("keeps database detail visible but purchase unavailable after chain failure", () => {
    const detail = toAssetDetailReadModel({
      contract: { status: "error" },
      database: { ...database, status: "active" },
      events: { events: [], warning: "events_unavailable" },
      nowSeconds: 1_000,
      valuation: null,
      valuationUnavailable: true,
      viewer: {
        isLoggedIn: true,
        kycApproved: "unknown",
        walletAddress: null,
        whitelisted: "unknown",
      },
    });

    expect(detail).toMatchObject({
      actionState: "sale_status_unavailable",
      chainReadState: "error",
      priceText: "$0.3 USDT",
      progressPercent: 0,
      saleStatus: "active",
      saleStatusSource: "database_fallback",
      soldSharesText: "--",
    });
    expect(detail.valuation.status).toBe("error");
    expect(detail.onchain.eventsStatus).toBe("error");
  });

  it("clamps oversold progress and marks the sale sold out", () => {
    const detail = toAssetDetailReadModel({
      contract: { ...contract, sold: 1_200n * 10n ** 18n },
      database,
      events: { events: [], warning: null },
      nowSeconds: 1_000,
      valuation: null,
      valuationUnavailable: false,
      viewer: {
        isLoggedIn: true,
        kycApproved: true,
        walletAddress: null,
        whitelisted: true,
      },
    });

    expect(detail.progressPercent).toBe(100);
    expect(detail.availableSharesText).toBe("0");
    expect(detail.actionState).toBe("sold_out");
  });

  it.each(["javascript:alert(1)", "file:///tmp/report.pdf", "not a url"])(
    "rejects unsafe external URL %s",
    (url) => expect(toSafeHttpUrl(url)).toBeNull(),
  );

  it("builds explorer links only for supported chains and valid hex values", () => {
    expect(buildBscScanUrl(56, "address", CONTRACT)).toBe(
      `https://bscscan.com/address/${CONTRACT}`,
    );
    expect(buildBscScanUrl(1, "address", CONTRACT)).toBeNull();
    expect(buildBscScanUrl(97, "tx", "not-a-hash")).toBeNull();
  });
});
