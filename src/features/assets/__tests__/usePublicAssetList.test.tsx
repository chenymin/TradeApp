import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssetPageResult, PublicAssetPageLoader, PublicAssetSummary } from "../domain/assetModels";
import {
  usePublicAssetList,
  type UsePublicAssetListResult,
} from "../hooks/usePublicAssetList";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("usePublicAssetList", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores an older response after the filter changes", async () => {
    const initial = deferred<AssetPageResult>();
    const filtered = deferred<AssetPageResult>();
    const loader = vi.fn<PublicAssetPageLoader>()
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(filtered.promise);
    const harness = await renderHook(loader);

    expect(loader).toHaveBeenNthCalledWith(1, {
      cursor: undefined,
      filter: "all",
      pageSize: 20,
      search: undefined,
      sort: "recent",
    });

    await act(async () => {
      harness.current.setFilter("active");
    });

    expect(loader).toHaveBeenNthCalledWith(2, {
      cursor: undefined,
      filter: "active",
      pageSize: 20,
      search: undefined,
      sort: "recent",
    });

    await act(async () => {
      filtered.resolve({ items: [asset("current")], nextCursor: null });
      await filtered.promise;
    });
    await act(async () => {
      initial.resolve({ items: [asset("stale")], nextCursor: null });
      await initial.promise;
    });

    expect(harness.current.items.map((item) => item.id)).toEqual(["current"]);
  });

  it("debounces search before replacing the current query", async () => {
    vi.useFakeTimers();
    const loader = vi.fn<PublicAssetPageLoader>().mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    const harness = await renderHook(loader, 300);

    await act(async () => {
      await Promise.resolve();
    });
    expect(loader).toHaveBeenCalledTimes(1);

    await act(async () => {
      harness.current.setSearch("mist");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(loader).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ search: "mist" }));
  });
});

async function renderHook(loader: PublicAssetPageLoader, searchDebounceMs = 0) {
  const harness: { current: UsePublicAssetListResult } = {
    current: null as unknown as UsePublicAssetListResult,
  };

  function HookHarness() {
    harness.current = usePublicAssetList({ loader, searchDebounceMs });
    return null;
  }

  await act(async () => {
    create(<HookHarness />);
  });

  return harness;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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
