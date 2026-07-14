import { describe, expect, it, vi } from "vitest";

import {
  createAssetDetailContractReadAdapter,
  type AssetDetailReadClient,
} from "../services/assetDetailContractReadAdapter";

const ASSET = "0x1111111111111111111111111111111111111111" as const;
const WALLET = "0x2222222222222222222222222222222222222222" as const;
const USDT = "0xd47c26E0D9657f654675F58E5EaF450d707a3F9e" as const;

describe("asset detail contract read adapter", () => {
  it("reads mandatory public and optional wallet state on the asset chain", async () => {
    const fake = createFakeClient([
      success(true),
      success(250_000n),
      success(10_000_000n),
      success(12_000_000n),
      success(25n * 10n ** 18n),
      success(100n * 10n ** 18n),
      success(20n * 10n ** 18n),
      success(6_250_000n),
      success(900n),
      success(1_100n),
      success(6),
      success(3n * 10n ** 18n),
      success(1_000_000n),
      success(500_000n),
    ]);
    const createClient = vi.fn(() => fake.client);

    const result = await createAssetDetailContractReadAdapter({
      createClient,
      getUsdtAddress: (chainId) => chainId === 97 ? USDT : null,
    }).readDetailState({
      chainId: 97,
      contractAddress: ASSET,
      walletAddress: WALLET,
    });

    expect(createClient).toHaveBeenCalledWith(97);
    expect(fake.calls[0].contracts.map((call) => call.functionName)).toEqual([
      "saleActive",
      "priceUSDT",
      "minPurchaseUSDT",
      "MIN_PURCHASE_USDT",
      "sold",
      "SALE_CAP",
      "RESERVED_AMOUNT",
      "usdtRaised",
      "saleStartTime",
      "saleEndTime",
      "decimals",
      "balanceOf",
      "balanceOf",
      "allowance",
    ]);
    expect(fake.calls[0].contracts[10]?.address).toBe(USDT);
    expect(fake.calls[0].contracts[11]?.address).toBe(ASSET);
    expect(fake.calls[0].contracts[12]?.address).toBe(USDT);
    expect(result).toEqual({
      artBalanceRaw: 3n * 10n ** 18n,
      minPurchaseUsdtRaw: 12_000_000n,
      priceUsdtRaw: 250_000n,
      reservedAmount: 20n * 10n ** 18n,
      saleActive: true,
      saleCap: 100n * 10n ** 18n,
      saleEndTime: 1_100n,
      saleStartTime: 900n,
      sold: 25n * 10n ** 18n,
      status: "ready",
      usdtAllowanceRaw: 500_000n,
      usdtBalanceRaw: 1_000_000n,
      usdtDecimals: 6,
      usdtRaisedRaw: 6_250_000n,
    });
  });

  it("falls back to the legacy min purchase getter", async () => {
    const fake = createFakeClient([
      success(true), success(1n), success(7n), failure(), success(1n), success(10n),
      success(2n), success(1n), success(900n), success(1_100n), success(6),
    ]);

    const result = await createAssetDetailContractReadAdapter({
      createClient: () => fake.client,
      getUsdtAddress: () => USDT,
    }).readDetailState({ chainId: 56, contractAddress: ASSET, walletAddress: null });

    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.minPurchaseUsdtRaw).toBe(7n);
  });

  it.each([
    { chainId: 1, contractAddress: ASSET },
    { chainId: 97, contractAddress: null },
    { chainId: 97, contractAddress: "0x0000000000000000000000000000000000000000" },
  ])("returns unsupported for invalid chain or address", async (request) => {
    const createClient = vi.fn();
    const result = await createAssetDetailContractReadAdapter({
      createClient,
      getUsdtAddress: () => USDT,
    }).readDetailState({ ...request, walletAddress: null });

    expect(result).toEqual({ status: "unsupported" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns error without substituting zero when a mandatory result fails", async () => {
    const fake = createFakeClient([
      success(true), failure(), success(7n), success(8n), success(1n), success(10n),
      success(2n), success(1n), success(900n), success(1_100n), success(6),
    ]);

    const result = await createAssetDetailContractReadAdapter({
      createClient: () => fake.client,
      getUsdtAddress: () => USDT,
    }).readDetailState({ chainId: 97, contractAddress: ASSET, walletAddress: null });

    expect(result).toEqual({ status: "error" });
    expect(result).not.toHaveProperty("priceUsdtRaw");
  });

  it("returns error when RPC rejects", async () => {
    const client: AssetDetailReadClient = {
      multicall: vi.fn().mockRejectedValue(new Error("timeout")),
    };
    const result = await createAssetDetailContractReadAdapter({
      createClient: () => client,
      getUsdtAddress: () => USDT,
    }).readDetailState({ chainId: 97, contractAddress: ASSET, walletAddress: null });

    expect(result).toEqual({ status: "error" });
  });
});

function createFakeClient(results: ReturnType<typeof success | typeof failure>[]) {
  const calls: Array<{
    contracts: Array<{ address: string; functionName: string }>;
  }> = [];
  const client: AssetDetailReadClient = {
    async multicall(input) {
      calls.push(input);
      return results;
    },
  };
  return { calls, client };
}

function success(result: unknown) {
  return { result, status: "success" as const };
}

function failure() {
  return { error: new Error("read failed"), status: "failure" as const };
}
