import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { PublicAssetPageLoader } from "../domain/assetModels";
import { MarketScreen } from "../screens/MarketScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("MarketScreen", () => {
  it("requests completed assets and exposes search and sorting controls", async () => {
    const loader = vi.fn<PublicAssetPageLoader>().mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    const renderer = await renderScreen(
      <MarketScreen loader={loader} onAssetPress={vi.fn()} />,
    );
    const content = JSON.stringify(renderer.toJSON());

    expect(content).toContain("艺术资产市场");
    expect(content).toContain("搜索作品、艺术家或代币代码");
    expect(content).toContain("最新");
    expect(content).toContain("价格升序");
    expect(loader).toHaveBeenCalledWith(expect.objectContaining({ filter: "completed" }));

    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: "价格升序" }).props.onPress();
    });
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({
      filter: "completed",
      sort: "price_asc",
    }));
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
