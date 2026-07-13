import { describe, expect, it } from "vitest";

import type { PublicAssetSummary } from "../domain/assetModels";
import {
  assetListReducer,
  createInitialAssetListState,
} from "../domain/assetListState";

describe("asset list reducer", () => {
  it("moves initial loading to ready or empty", () => {
    const loading = assetListReducer(createInitialAssetListState(), {
      mode: "initial",
      requestId: 1,
      type: "request_started",
    });
    const ready = assetListReducer(loading, {
      mode: "replace",
      page: { items: [asset("a")], nextCursor: "20" },
      requestId: 1,
      type: "request_succeeded",
    });
    const empty = assetListReducer(loading, {
      mode: "replace",
      page: { items: [], nextCursor: null },
      requestId: 1,
      type: "request_succeeded",
    });

    expect(loading.status).toBe("initial_loading");
    expect(ready.status).toBe("ready");
    expect(empty.status).toBe("empty");
  });

  it("preserves old items and exposes a warning when refresh fails", () => {
    const state = {
      ...createInitialAssetListState(),
      items: [asset("old")],
      nextCursor: "20",
      status: "ready" as const,
    };
    const refreshing = assetListReducer(state, {
      mode: "refresh",
      requestId: 2,
      type: "request_started",
    });
    const failed = assetListReducer(refreshing, {
      message: "Network unavailable",
      mode: "refresh",
      requestId: 2,
      type: "request_failed",
    });

    expect(refreshing.items).toEqual(state.items);
    expect(refreshing.status).toBe("refreshing");
    expect(failed.items).toEqual(state.items);
    expect(failed.status).toBe("ready");
    expect(failed.warningMessage).toBe("Network unavailable");
  });

  it("appends each asset once and reaches the end", () => {
    const state = {
      ...createInitialAssetListState(),
      activeRequestId: 3,
      items: [asset("a")],
      nextCursor: "20",
      status: "loading_more" as const,
    };
    const result = assetListReducer(state, {
      mode: "append",
      page: { items: [asset("a"), asset("b")], nextCursor: null },
      requestId: 3,
      type: "request_succeeded",
    });

    expect(result.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.status).toBe("end_reached");
  });

  it("resets items and cursor when the query changes", () => {
    const state = {
      ...createInitialAssetListState(),
      filter: "active" as const,
      items: [asset("a")],
      nextCursor: "20",
      status: "ready" as const,
    };
    const result = assetListReducer(state, {
      filter: "completed",
      search: "mist",
      sort: "price_desc",
      type: "query_changed",
    });

    expect(result).toMatchObject({
      filter: "completed",
      items: [],
      nextCursor: null,
      search: "mist",
      sort: "price_desc",
      status: "idle",
    });
  });

  it("ignores a response from a stale request", () => {
    const state = {
      ...createInitialAssetListState(),
      activeRequestId: 8,
      status: "initial_loading" as const,
    };
    const result = assetListReducer(state, {
      mode: "replace",
      page: { items: [asset("stale")], nextCursor: null },
      requestId: 7,
      type: "request_succeeded",
    });

    expect(result).toBe(state);
  });
});

function asset(id: string): PublicAssetSummary {
  return {
    artistName: "Artist",
    availableSharesText: "90",
    chainId: 97,
    chainStatus: "ready",
    contractAddress: null,
    id,
    imageUrl: null,
    participantsCount: 1,
    paymentSymbol: "USDT",
    priceAmount: "1",
    priceText: "$1 USDT",
    progressPercent: 10,
    remainingTimeText: null,
    saleCapText: "100",
    saleStatus: "active",
    soldSharesText: "10",
    title: id,
    tokenCode: "ART",
    totalSupplyText: "100",
  };
}
