import { describe, expect, it, vi } from "vitest";

import { findByProps, getPressHandler, renderElement, textContent } from "../../../test/renderElement";
import type { PublicAssetSummary } from "../domain/assetModels";
import { AssetCard } from "../components/AssetCard";
import { LaunchpadSummaryStrip } from "../components/LaunchpadSummaryStrip";

describe("AssetCard", () => {
  it("renders a stable, display-only asset summary", async () => {
    const onPress = vi.fn();
    const tree = renderElement(<AssetCard asset={asset()} onPress={onPress} />);
    const content = textContent(tree);

    expect(content).toContain("进行中");
    expect(content).toContain("Lin Wei");
    expect(content).toContain("Morning Mist");
    expect(content).toContain("ART-MIST");
    expect(content).toContain("$0.1 USDT");
    expect(content).toContain("750");
    expect(content).toContain("25%");
    expect(content).toContain("8 位参与者");
    expect(content).toContain("3 分钟");
    expect(content).not.toContain("Buy");
    expect(content).not.toContain("购买");
    expect(findByProps(tree, { accessibilityLabel: "Asset image Morning Mist" }).props.style)
      .toEqual(expect.objectContaining({ aspectRatio: 1.6, width: "100%" }));

    await getPressHandler(tree, "Open asset Morning Mist")();
    expect(onPress).toHaveBeenCalledWith("asset-1");
  });

  it("renders a fixed-height placeholder when the image is missing", () => {
    const tree = renderElement(<AssetCard asset={{ ...asset(), imageUrl: null }} onPress={vi.fn()} />);

    expect(findByProps(tree, { accessibilityLabel: "Asset image placeholder Morning Mist" }).props.style)
      .toEqual(expect.objectContaining({ aspectRatio: 1.6, width: "100%" }));
  });
});

describe("LaunchpadSummaryStrip", () => {
  it("renders trust metrics from the public asset data", () => {
    const tree = renderElement(<LaunchpadSummaryStrip assets={[
      asset({ participantsCount: 4, saleStatus: "upcoming" }),
      asset({ id: "asset-2", participantsCount: 5, saleStatus: "completed" }),
      asset({ id: "asset-3", participantsCount: 7, saleStatus: "sold_out" }),
    ]} />);
    const content = textContent(tree);
    const activeMetric = findByProps(tree, { accessibilityLabel: "Metric 活跃项目" });
    const participantMetric = findByProps(tree, { accessibilityLabel: "Metric 总参与者" });
    const completedMetric = findByProps(tree, { accessibilityLabel: "Metric 完成发售" });

    expect(content.indexOf("总锁仓价值")).toBeLessThan(content.indexOf("活跃项目"));
    expect(content.indexOf("活跃项目")).toBeLessThan(content.indexOf("总参与者"));
    expect(content.indexOf("总参与者")).toBeLessThan(content.indexOf("完成发售"));
    expect(content).toContain("$12.5M");
    expect(textContent(activeMetric)).toContain("0");
    expect(textContent(activeMetric)).toContain("1 个即将开始");
    expect(textContent(participantMetric)).toContain("16");
    expect(textContent(completedMetric)).toContain("2");
    expect(completedMetric.props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0.68 })]),
    );
  });
});

function asset(overrides: Partial<PublicAssetSummary> = {}): PublicAssetSummary {
  return {
    artistName: "Lin Wei",
    availableSharesText: "750",
    chainId: 97,
    chainStatus: "ready",
    contractAddress: "0x1111111111111111111111111111111111111111",
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
    ...overrides,
  };
}
