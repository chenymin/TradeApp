import { describe, expect, it } from "vitest";

import type { AssetChainReadState, AssetDatabaseRow } from "../domain/assetModels";
import { toPublicAssetSummary } from "../domain/assetMappers";

const row: AssetDatabaseRow = {
  artistName: "Lin Wei",
  chainId: 97,
  contractAddress: "0x1111111111111111111111111111111111111111",
  id: "asset-1",
  imageUrl: "https://images.example/mist.jpg",
  participantsCount: 8,
  saleEnd: "1970-01-01T00:20:00.000Z",
  saleStart: "1970-01-01T00:15:00.000Z",
  status: "upcoming",
  symbol: "ART-MIST",
  title: "Morning Mist",
  tokenPriceUsdt: "0.100000",
  totalSupply: "2000",
};

const readyChain: AssetChainReadState = {
  saleActive: true,
  saleCap: 1_000n * 10n ** 18n,
  saleEndTime: 1_200n,
  saleStartTime: 900n,
  sold: 250n * 10n ** 18n,
  status: "ready",
};

describe("asset mappers", () => {
  it("maps database and chain data into display-ready text", () => {
    expect(toPublicAssetSummary(row, readyChain, 1_000)).toEqual({
      artistName: "Lin Wei",
      availableSharesText: "750",
      chainId: 97,
      chainStatus: "ready",
      contractAddress: row.contractAddress,
      id: "asset-1",
      imageUrl: "https://images.example/mist.jpg",
      participantsCount: 8,
      paymentSymbol: "USDT",
      priceAmount: "0.1",
      priceText: "$0.1 USDT",
      progressPercent: 25,
      remainingTimeText: "3 分钟",
      saleCapText: "1,000",
      saleStatus: "active",
      soldSharesText: "250",
      title: "Morning Mist",
      tokenCode: "ART-MIST",
      totalSupplyText: "2,000",
    });
  });

  it("clamps over-sold progress and exposes sold out", () => {
    const result = toPublicAssetSummary(row, {
      ...readyChain,
      saleCap: 10n * 10n ** 18n,
      sold: 12n * 10n ** 18n,
    }, 1_000);

    expect(result.progressPercent).toBe(100);
    expect(result.availableSharesText).toBe("0");
    expect(result.saleStatus).toBe("sold_out");
  });

  it("uses stable placeholders when chain state is unavailable", () => {
    const result = toPublicAssetSummary({
      ...row,
      contractAddress: null,
      imageUrl: null,
      status: "completed",
    }, {
      saleActive: false,
      saleCap: 0n,
      saleEndTime: 0n,
      saleStartTime: 0n,
      sold: 0n,
      status: "unsupported",
    }, 1_000);

    expect(result).toMatchObject({
      availableSharesText: "--",
      chainStatus: "unsupported",
      imageUrl: null,
      progressPercent: 0,
      remainingTimeText: null,
      saleCapText: "--",
      saleStatus: "completed",
      soldSharesText: "--",
    });
  });

  it("uses the database schedule while a supported contract read fails", () => {
    const result = toPublicAssetSummary({
      ...row,
      saleStart: "1970-01-01T00:21:40.000Z",
    }, {
      ...readyChain,
      status: "error",
    }, 1_000);

    expect(result.chainStatus).toBe("error");
    expect(result.saleStatus).toBe("upcoming");
    expect(result.remainingTimeText).toBe("5 分钟");
  });
});
