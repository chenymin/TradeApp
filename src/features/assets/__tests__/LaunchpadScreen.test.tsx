import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { PublicAssetPageLoader, PublicAssetSummary } from "../domain/assetModels";
import { LaunchpadScreen } from "../screens/LaunchpadScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("LaunchpadScreen", () => {
  it("renders the launchpad shell, metrics, filters, and assets", async () => {
    const items = [
      asset({ participantsCount: 4, saleStatus: "upcoming" }),
      asset({ id: "asset-2", participantsCount: 5, saleStatus: "completed" }),
      asset({ id: "asset-3", participantsCount: 7, saleStatus: "sold_out" }),
    ];
    const loader = vi.fn<PublicAssetPageLoader>()
      .mockResolvedValueOnce({ items, nextCursor: null })
      .mockResolvedValue({ items: [], nextCursor: null });
    const onAssetPress = vi.fn();
    const renderer = await renderScreen(
      <LaunchpadScreen loader={loader} onAssetPress={onAssetPress} />,
    );
    const content = JSON.stringify(renderer.toJSON());

    expect(content).toContain("艺术资产发行");
    expect(content).toContain("Tokenized Art Launchpad");
    expect(content).toContain("总锁仓价值");
    expect(content).toContain("全部");
    expect(content).toContain("进行中");
    expect(content).toContain("即将开始");
    expect(content).toContain("已完成");
    expect(content).toContain("1 个即将开始");
    expect(content).toContain("16");
    expect(content).toContain("Morning Mist");
    expect(renderer.root.findByProps({ accessibilityLabel: "Public asset list" }).props.keyExtractor(asset())).toBe("asset-1");

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "进行中" }).props.onPress();
      await Promise.resolve();
    });
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "active" }));
    expect(JSON.stringify(renderer.toJSON())).toContain("16");
  });

  it("keeps an explicit empty state", async () => {
    const renderer = await renderScreen(
      <LaunchpadScreen
        loader={vi.fn<PublicAssetPageLoader>().mockResolvedValue({ items: [], nextCursor: null })}
        onAssetPress={vi.fn()}
      />,
    );

    expect(JSON.stringify(renderer.toJSON())).toContain("暂无公开资产");
  });

  it("offers retry after an initial failure", async () => {
    const loader = vi.fn<PublicAssetPageLoader>()
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ items: [asset()], nextCursor: null });
    const renderer = await renderScreen(
      <LaunchpadScreen loader={loader} onAssetPress={vi.fn()} />,
    );

    expect(JSON.stringify(renderer.toJSON())).toContain("Network unavailable");
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "Retry asset list" }).props.onPress();
      await Promise.resolve();
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Morning Mist");
  });
});

async function renderScreen(element: React.ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = TestRenderer.create(element);
    await Promise.resolve();
  });
  if (!renderer) throw new Error("Expected renderer");
  return renderer;
}

function asset(overrides: Partial<PublicAssetSummary> = {}): PublicAssetSummary {
  return {
    artistName: "Lin Wei",
    availableSharesText: "750",
    chainId: 97,
    chainStatus: "ready",
    contractAddress: null,
    id: "asset-1",
    imageUrl: null,
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
    ...overrides,
  };
}
