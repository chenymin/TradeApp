import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type {
  AssetDetailLoader,
  AssetDetailReadModel,
} from "../domain/assetDetailModels";
import { AssetDetailScreen } from "../screens/AssetDetailScreen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("AssetDetailScreen", () => {
  it("renders detail sections and changes tabs without reloading", async () => {
    const loader = vi.fn<AssetDetailLoader>().mockResolvedValue({
      detail: detailModel(),
      warnings: [],
    });
    const openExternalUrl = vi.fn().mockResolvedValue("opened");
    const renderer = await renderScreen({ loader, openExternalUrl });

    expect(text(renderer)).toContain("Morning Mist");
    expect(text(renderer)).toContain("$0.25 USDT");
    expect(text(renderer)).toContain("Morning light over the harbor.");

    await press(renderer, "Asset detail tab Valuation");
    expect(text(renderer)).toContain("Example Appraisal");
    expect(text(renderer)).toContain("本估值报告仅供参考");
    await press(renderer, "Open valuation report");
    expect(openExternalUrl).toHaveBeenCalledWith("https://reports.example/VAL-001.pdf");

    await press(renderer, "Asset detail tab Rules");
    expect(text(renderer)).toContain("USDT (BEP-20)");
    expect(text(renderer)).toContain("完成 KYC 身份认证");

    await press(renderer, "Asset detail tab On-chain");
    expect(text(renderer)).toContain("0x1111...1111");
    expect(text(renderer)).toContain("Subscription");
    await press(renderer, "Open transaction 0xaaaa...aaaa");
    expect(openExternalUrl).toHaveBeenCalledWith(
      "https://testnet.bscscan.com/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("shows list placeholder data while the detail request is pending", async () => {
    const pending = new Promise<never>(() => undefined);
    const renderer = await renderScreen({
      loader: vi.fn().mockReturnValue(pending),
      placeholder: {
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
        remainingTimeText: null,
        saleCapText: "1,000",
        saleStatus: "active",
        soldSharesText: "250",
        title: "Placeholder Morning Mist",
        tokenCode: "ART-MIST",
        totalSupplyText: "2,000",
      },
    });

    expect(text(renderer)).toContain("Placeholder Morning Mist");
    expect(text(renderer)).toContain("$0.1 USDT");
    expect(text(renderer)).toContain("正在加载完整详情");
  });

  it("renders local error states without replacing the primary detail", async () => {
    const model = detailModel();
    model.valuation = { ...model.valuation, status: "error" };
    model.onchain = { ...model.onchain, events: [], eventsStatus: "error" };
    model.chainReadState = "error";
    model.actionState = "sale_status_unavailable";
    const renderer = await renderScreen({
      loader: vi.fn().mockResolvedValue({
        detail: model,
        warnings: ["valuation_unavailable", "events_unavailable", "chain_unavailable"],
      }),
    });

    expect(text(renderer)).toContain("Morning Mist");
    expect(text(renderer)).toContain("链上发售状态暂不可用");
    await press(renderer, "Asset detail tab Valuation");
    expect(text(renderer)).toContain("估值报告暂时无法加载");
    await press(renderer, "Asset detail tab On-chain");
    expect(text(renderer)).toContain("链上事件暂时无法加载");
  });

  it("shows a primary error and retries", async () => {
    const loader = vi.fn<AssetDetailLoader>()
      .mockRejectedValueOnce(new Error("Primary unavailable"))
      .mockResolvedValueOnce({ detail: detailModel(), warnings: [] });
    const renderer = await renderScreen({ loader });

    expect(text(renderer)).toContain("Primary unavailable");
    await press(renderer, "Retry asset detail");
    await flush();
    expect(text(renderer)).toContain("Morning Mist");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("runs only the command associated with the trusted action state", async () => {
    const onLogin = vi.fn();
    const onPurchasePreview = vi.fn();
    const onViewMarket = vi.fn();
    const model = detailModel();
    model.actionState = "connect_required";
    const renderer = await renderScreen({
      loader: vi.fn().mockResolvedValue({ detail: model, warnings: [] }),
      onLogin,
      onPurchasePreview,
      onViewMarket,
    });

    await press(renderer, "Asset detail action Connect wallet");
    expect(onLogin).toHaveBeenCalledOnce();
    expect(onPurchasePreview).not.toHaveBeenCalled();
    expect(onViewMarket).not.toHaveBeenCalled();
  });
});

async function renderScreen(overrides: Partial<React.ComponentProps<typeof AssetDetailScreen>>) {
  const React = await import("react");
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<AssetDetailScreen
      assetId="asset-1"
      loader={vi.fn().mockResolvedValue({ detail: detailModel(), warnings: [] })}
      onLogin={() => undefined}
      onPurchasePreview={() => undefined}
      onViewMarket={() => undefined}
      openExternalUrl={async () => "opened"}
      viewer={{
        isLoggedIn: false,
        kycApproved: "unknown",
        walletAddress: null,
        whitelisted: "unknown",
      }}
      {...overrides}
    />);
  });
  await flush();
  return renderer;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function press(renderer: ReactTestRenderer, accessibilityLabel: string) {
  const node = renderer.root.findByProps({ accessibilityLabel });
  await act(async () => node.props.onPress());
}

function text(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

function detailModel(): AssetDetailReadModel {
  return {
    actionState: "sale_open",
    artistName: "Lin Wei",
    availableSharesText: "750",
    chainId: 97,
    chainReadState: "ready",
    contractAddress: "0x1111111111111111111111111111111111111111",
    contractAddressShort: "0x1111...1111",
    eligibility: { description: "Wallet eligibility is verified.", status: "approved", title: "Eligible" },
    fundedAmountText: "$2,500 USDT",
    id: "asset-1",
    imageUrl: null,
    minPurchaseText: "$10 USDT",
    onchain: {
      chainName: "BNB Smart Chain Testnet",
      events: [{
        amountText: "$125.5 USDT / 502 shares",
        explorerUrl: "https://testnet.bscscan.com/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        id: "event-1",
        occurredAtText: "2026/07/10 09:00",
        title: "Subscription",
        txHashShort: "0xaaaa...aaaa",
        type: "purchase",
      }],
      eventsStatus: "ready",
      explorerUrl: "https://testnet.bscscan.com/address/0x1111111111111111111111111111111111111111",
      tokenStandard: "ERC-20",
    },
    overview: {
      creationYear: "2025",
      description: "Morning light over the harbor.",
      dimensions: "120 x 80 cm",
      material: "Oil on canvas",
      provenance: "Artist studio archive",
    },
    participantsCount: 12,
    priceText: "$0.25 USDT",
    progressPercent: 25,
    remainingTimeText: "3 分钟",
    reservedSharesText: "200",
    rules: {
      publicSaleText: "1,000",
      reservedText: "200",
      settlementAsset: "USDT (BEP-20)",
      totalSupplyText: "1,200",
    },
    saleCapText: "1,000",
    saleStatus: "active",
    saleStatusSource: "chain",
    soldSharesText: "250",
    title: "Morning Mist",
    tokenCode: "ART-MIST",
    totalSupplyText: "1,200",
    userAllowanceState: "unknown",
    userUsdtBalanceText: null,
    valuation: {
      appraiser: "Example Appraisal",
      confidence: "high",
      demandLevel: "high",
      liquidityRating: "medium",
      marketTrend: "bullish",
      notes: "Independent report",
      reportDate: "2026-06-01",
      reportNumber: "VAL-001",
      reportUrl: "https://reports.example/VAL-001.pdf",
      status: "available",
      valuationText: "$1,250,000 USDT",
    },
  };
}
