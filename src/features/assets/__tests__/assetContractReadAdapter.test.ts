import { describe, expect, it, vi } from "vitest";

import type { AssetDatabaseRow } from "../domain/assetModels";
import {
  createAssetContractReadAdapter,
  type AssetReadClient,
} from "../services/assetContractReadAdapter";

describe("asset contract read adapter", () => {
  it("groups contracts by chain and maps five calls per asset", async () => {
    const clients = new Map<number, ReturnType<typeof createFakeClient>>([
      [56, createFakeClient([
        success(true),
        success(25n),
        success(100n),
        success(900n),
        success(1_100n),
      ])],
      [97, createFakeClient([
        success(false),
        success(5n),
        success(10n),
        success(1_200n),
        success(1_300n),
      ])],
    ]);
    const createClient = vi.fn((chainId: number) => clients.get(chainId)!.client);

    const result = await createAssetContractReadAdapter({ createClient }).readListState([
      asset("mainnet", 56, "0x1111111111111111111111111111111111111111"),
      asset("testnet", 97, "0x2222222222222222222222222222222222222222"),
    ]);

    expect(createClient.mock.calls).toEqual([[56], [97]]);
    expect(clients.get(56)!.calls[0].contracts.map((call) => call.functionName)).toEqual([
      "saleActive",
      "sold",
      "SALE_CAP",
      "saleStartTime",
      "saleEndTime",
    ]);
    expect(result.get("mainnet")).toEqual({
      saleActive: true,
      saleCap: 100n,
      saleEndTime: 1_100n,
      saleStartTime: 900n,
      sold: 25n,
      status: "ready",
    });
    expect(result.get("testnet")?.status).toBe("ready");
  });

  it("does not call a client for missing and zero addresses", async () => {
    const createClient = vi.fn();
    const result = await createAssetContractReadAdapter({ createClient }).readListState([
      asset("missing", 97, null),
      asset("zero", 97, "0x0000000000000000000000000000000000000000"),
    ]);

    expect(createClient).not.toHaveBeenCalled();
    expect(result.get("missing")?.status).toBe("unsupported");
    expect(result.get("zero")?.status).toBe("unsupported");
  });

  it("isolates a failed contract slice without dropping other assets", async () => {
    const fake = createFakeClient([
      success(true), success(1n), success(10n), success(900n), success(1_100n),
      success(true), failure(), success(10n), success(900n), success(1_100n),
    ]);

    const result = await createAssetContractReadAdapter({
      createClient: () => fake.client,
    }).readListState([
      asset("healthy", 97, "0x1111111111111111111111111111111111111111"),
      asset("failed", 97, "0x2222222222222222222222222222222222222222"),
    ]);

    expect(result.get("healthy")?.status).toBe("ready");
    expect(result.get("failed")).toEqual({
      saleActive: false,
      saleCap: 0n,
      saleEndTime: 0n,
      saleStartTime: 0n,
      sold: 0n,
      status: "error",
    });
  });
});

function asset(id: string, chainId: number, contractAddress: string | null): AssetDatabaseRow {
  return {
    artistName: "Artist",
    chainId,
    contractAddress,
    id,
    imageUrl: null,
    participantsCount: 0,
    saleEnd: null,
    saleStart: null,
    status: "upcoming",
    symbol: "ART",
    title: "Artwork",
    tokenPriceUsdt: "1",
    totalSupply: "100",
  };
}

function createFakeClient(
  results: Array<ReturnType<typeof success> | ReturnType<typeof failure>>,
) {
  const calls: Array<{ allowFailure: boolean; contracts: Array<{ functionName: string }> }> = [];
  const client: AssetReadClient = {
    async multicall(input) {
      calls.push(input);
      return results;
    },
  };

  return {
    calls,
    client,
  };
}

function success(result: unknown) {
  return { result, status: "success" as const };
}

function failure() {
  return { error: new Error("rpc failed"), status: "failure" as const };
}
