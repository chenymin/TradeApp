import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type {
  AssetDetailLoadResult,
  AssetDetailLoader,
  AssetDetailReadModel,
} from "../domain/assetDetailModels";
import { usePublicAssetDetail, type UsePublicAssetDetailResult } from "../hooks/usePublicAssetDetail";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("usePublicAssetDetail", () => {
  it("loads detail and supports retry after a primary error", async () => {
    const loader = vi.fn<AssetDetailLoader>()
      .mockRejectedValueOnce(new Error("Unable to load detail"))
      .mockResolvedValueOnce(result("asset-1"));
    const harness = await renderHook(loader, "asset-1");

    await flush();
    expect(harness.current).toMatchObject({
      error: "Unable to load detail",
      status: "error",
    });

    await act(async () => harness.current.retry());
    await flush();
    expect(harness.current).toMatchObject({
      detail: { id: "asset-1" },
      status: "ready",
    });
  });

  it("ignores an older response after the asset id changes", async () => {
    const first = deferred<AssetDetailLoadResult>();
    const second = deferred<AssetDetailLoadResult>();
    const loader = vi.fn<AssetDetailLoader>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const harness = await renderHook(loader, "asset-1");

    await act(async () => harness.setAssetId("asset-2"));
    await act(async () => {
      second.resolve(result("asset-2"));
      await second.promise;
    });
    await act(async () => {
      first.resolve(result("asset-1"));
      await first.promise;
    });

    expect(harness.current.detail?.id).toBe("asset-2");
  });

  it("keeps existing detail visible during refresh", async () => {
    const refresh = deferred<AssetDetailLoadResult>();
    const loader = vi.fn<AssetDetailLoader>()
      .mockResolvedValueOnce(result("asset-1"))
      .mockReturnValueOnce(refresh.promise);
    const harness = await renderHook(loader, "asset-1");
    await flush();

    await act(async () => harness.current.refresh());
    expect(harness.current).toMatchObject({
      detail: { id: "asset-1" },
      status: "refreshing",
    });

    await act(async () => {
      refresh.resolve(result("asset-1"));
      await refresh.promise;
    });
    expect(harness.current.status).toBe("ready");
  });
});

async function renderHook(loader: AssetDetailLoader, initialAssetId: string) {
  const harness: {
    current: UsePublicAssetDetailResult;
    renderer: ReactTestRenderer;
    setAssetId(assetId: string): void;
  } = {
    current: null as unknown as UsePublicAssetDetailResult,
    renderer: null as unknown as ReactTestRenderer,
    setAssetId: () => undefined,
  };

  function HookHarness() {
    const [assetId, setAssetId] = React.useState(initialAssetId);
    harness.setAssetId = setAssetId;
    harness.current = usePublicAssetDetail({
      assetId,
      loader,
      viewer: {
        isLoggedIn: false,
        kycApproved: "unknown",
        walletAddress: null,
        whitelisted: "unknown",
      },
    });
    return null;
  }

  const React = await import("react");
  await act(async () => {
    harness.renderer = create(<HookHarness />);
  });
  return harness;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function result(id: string): AssetDetailLoadResult {
  return {
    detail: { id } as AssetDetailReadModel,
    warnings: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
