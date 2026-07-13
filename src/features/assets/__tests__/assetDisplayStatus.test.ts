import { describe, expect, it } from "vitest";

import {
  resolveChainSaleStatus,
  resolveSaleDisplayState,
} from "../domain/assetDisplayStatus";

const CONTRACT = "0x1111111111111111111111111111111111111111";

describe("asset display status", () => {
  it("marks a fully sold sale as completed", () => {
    expect(resolveChainSaleStatus({
      nowSeconds: 1_000,
      saleActive: true,
      soldPercent: 100,
    })).toBe("completed");
  });

  it("marks a sale past its end time as completed", () => {
    expect(resolveChainSaleStatus({
      nowSeconds: 1_000,
      saleActive: true,
      saleEndTime: 999n,
      soldPercent: 25,
    })).toBe("completed");
  });

  it("marks a sale before its start time as upcoming", () => {
    expect(resolveChainSaleStatus({
      nowSeconds: 1_000,
      saleActive: false,
      saleStartTime: 1_001n,
      soldPercent: 0,
    })).toBe("upcoming");
  });

  it("marks an enabled in-window sale as active", () => {
    expect(resolveChainSaleStatus({
      nowSeconds: 1_000,
      saleActive: true,
      saleEndTime: 1_100n,
      saleStartTime: 900n,
      soldPercent: 25,
    })).toBe("active");
  });

  it("marks a disabled in-window sale as paused", () => {
    expect(resolveChainSaleStatus({
      nowSeconds: 1_000,
      saleActive: false,
      saleEndTime: 1_100n,
      saleStartTime: 900n,
      soldPercent: 25,
    })).toBe("paused");
  });

  it("trusts a successful contract read", () => {
    expect(resolveSaleDisplayState({
      chainReadState: "ready",
      chainSaleActive: true,
      chainSaleEndTime: 1_100n,
      chainSaleStartTime: 900n,
      chainSoldPercent: 10,
      contractAddress: CONTRACT,
      dbStatus: "upcoming",
      nowSeconds: 1_000,
    })).toEqual({
      canTrustForPurchase: true,
      chainStatus: "ready",
      displayStatus: "active",
      source: "chain",
    });
  });

  it.each(["loading", "error"] as const)(
    "uses an untrusted database fallback while chain status is %s",
    (chainReadState) => {
      expect(resolveSaleDisplayState({
        chainReadState,
        contractAddress: CONTRACT,
        dbStatus: "active",
        nowSeconds: 1_000,
      })).toEqual({
        canTrustForPurchase: false,
        chainStatus: chainReadState,
        displayStatus: "active",
        source: "database_fallback",
      });
    },
  );

  it.each([null, "0x0000000000000000000000000000000000000000"])(
    "marks %s contract addresses as unsupported",
    (contractAddress) => {
      expect(resolveSaleDisplayState({
        chainReadState: "ready",
        contractAddress,
        dbStatus: "completed",
        nowSeconds: 1_000,
      })).toEqual({
        canTrustForPurchase: false,
        chainStatus: "unsupported",
        displayStatus: "completed",
        source: "unsupported",
      });
    },
  );
});
