import { describe, expect, it, vi } from "vitest";

import type { AssetChainReadState, AssetDatabaseRow } from "../domain/assetModels";
import { createPublicAssetPageLoader } from "../services/publicAssetPageLoader";

describe("public asset page loader", () => {
  it("combines database and chain state and applies chain-authoritative filtering", async () => {
    const rows = [row("active", "active"), row("ended", "active")];
    const readListState = vi.fn(async () => new Map<string, AssetChainReadState>([
      ["active", chain({ saleActive: true })],
      ["ended", chain({ saleActive: false, saleEndTime: 999n })],
    ]));
    const loader = createPublicAssetPageLoader({
      chainAdapter: { readListState },
      now: () => 1_000,
      repository: {
        fetchAssetPage: vi.fn(async () => ({ nextCursor: "20", rows, totalCount: 2 })),
      },
    });

    const result = await loader({ filter: "active", pageSize: 20 });

    expect(readListState).toHaveBeenCalledWith(rows);
    expect(result.items.map((item) => item.id)).toEqual(["active"]);
    expect(result.nextCursor).toBe("20");
    expect(result.totalCount).toBe(2);
  });

  it("keeps database assets when the chain provider fails", async () => {
    const loader = createPublicAssetPageLoader({
      chainAdapter: {
        readListState: vi.fn(async () => {
          throw new Error("rpc unavailable");
        }),
      },
      now: () => 1_000,
      repository: {
        fetchAssetPage: vi.fn(async () => ({ nextCursor: null, rows: [row("asset", "active")] })),
      },
    });

    const result = await loader({ filter: "all", pageSize: 20 });

    expect(result.items[0]).toMatchObject({
      chainStatus: "error",
      id: "asset",
      saleStatus: "active",
    });
  });

  it("does not hide repository failures", async () => {
    const loader = createPublicAssetPageLoader({
      chainAdapter: { readListState: vi.fn() },
      repository: {
        fetchAssetPage: vi.fn(async () => {
          throw new Error("database unavailable");
        }),
      },
    });

    await expect(loader({ filter: "all", pageSize: 20 })).rejects.toThrow(
      "database unavailable",
    );
  });
});

function row(id: string, status: AssetDatabaseRow["status"]): AssetDatabaseRow {
  return {
    artistName: "Artist",
    chainId: 97,
    contractAddress: "0x1111111111111111111111111111111111111111",
    id,
    imageUrl: null,
    participantsCount: 1,
    saleEnd: null,
    saleStart: null,
    status,
    symbol: "ART",
    title: "Artwork",
    tokenPriceUsdt: "1",
    totalSupply: "100",
  };
}

function chain(overrides: Partial<AssetChainReadState>): AssetChainReadState {
  return {
    saleActive: false,
    saleCap: 100n * 10n ** 18n,
    saleEndTime: 1_100n,
    saleStartTime: 900n,
    sold: 10n * 10n ** 18n,
    status: "ready",
    ...overrides,
  };
}
