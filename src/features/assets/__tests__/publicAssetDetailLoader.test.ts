import { describe, expect, it, vi } from "vitest";

import type {
  AssetDetailContractReadAdapter,
  AssetDetailDatabaseRow,
  AssetDetailRepository,
  AssetValuationRepository,
  MintEventsRepository,
} from "../domain/assetDetailModels";
import { createPublicAssetDetailLoader } from "../services/publicAssetDetailLoader";

describe("public asset detail loader", () => {
  it("stops when the primary asset detail fails", async () => {
    const dependencies = createDependencies();
    dependencies.repository.fetchAssetDetail = vi.fn().mockRejectedValue(new Error("missing"));

    await expect(createPublicAssetDetailLoader(dependencies)({
      assetId: "asset-1",
      viewer: viewer(),
    })).rejects.toThrow("missing");

    expect(dependencies.valuationRepository.fetchLatestReport).not.toHaveBeenCalled();
    expect(dependencies.eventsRepository.fetchRecentEvents).not.toHaveBeenCalled();
    expect(dependencies.chainAdapter.readDetailState).not.toHaveBeenCalled();
  });

  it("localizes valuation, event, and chain failures", async () => {
    const dependencies = createDependencies();
    dependencies.valuationRepository.fetchLatestReport = vi.fn().mockRejectedValue(new Error("valuation"));
    dependencies.eventsRepository.fetchRecentEvents = vi.fn().mockRejectedValue(new Error("events"));
    dependencies.chainAdapter.readDetailState = vi.fn().mockRejectedValue(new Error("rpc"));

    const result = await createPublicAssetDetailLoader(dependencies)({
      assetId: "asset-1",
      viewer: viewer(),
    });

    expect(result.warnings).toEqual([
      "valuation_unavailable",
      "events_unavailable",
      "chain_unavailable",
    ]);
    expect(result.detail).toMatchObject({
      actionState: "sale_status_unavailable",
      chainReadState: "error",
      id: "asset-1",
      valuation: { status: "error" },
    });
  });

  it("passes the asset chain and viewer wallet to read-only contract reads", async () => {
    const dependencies = createDependencies();
    const loader = createPublicAssetDetailLoader(dependencies);

    const result = await loader({
      assetId: "asset-1",
      viewer: { ...viewer(), walletAddress: "0x2222222222222222222222222222222222222222" },
    });

    expect(dependencies.chainAdapter.readDetailState).toHaveBeenCalledWith({
      chainId: 97,
      contractAddress: "0x1111111111111111111111111111111111111111",
      walletAddress: "0x2222222222222222222222222222222222222222",
    });
    expect(result.warnings).toEqual([]);
    expect(result.detail.actionState).toBe("sale_open");

    await loader({ assetId: "asset-1", viewer: viewer() });
    expect(dependencies.repository.fetchAssetDetail).toHaveBeenCalledTimes(2);
    expect(dependencies.valuationRepository.fetchLatestReport).toHaveBeenCalledTimes(2);
    expect(dependencies.eventsRepository.fetchRecentEvents).toHaveBeenCalledTimes(2);
    expect(dependencies.chainAdapter.readDetailState).toHaveBeenCalledTimes(2);
  });

  it("does not query private mint events for a logged-out viewer", async () => {
    const dependencies = createDependencies();

    const result = await createPublicAssetDetailLoader(dependencies)({
      assetId: "asset-1",
      viewer: { ...viewer(), isLoggedIn: false },
    });

    expect(dependencies.eventsRepository.fetchRecentEvents).not.toHaveBeenCalled();
    expect(result.detail.onchain.eventsStatus).toBe("empty");
    expect(result.warnings).toEqual([]);
  });
});

function createDependencies(): {
  chainAdapter: AssetDetailContractReadAdapter;
  eventsRepository: MintEventsRepository;
  now: () => number;
  repository: AssetDetailRepository;
  valuationRepository: AssetValuationRepository;
} {
  return {
    chainAdapter: {
      readDetailState: vi.fn().mockResolvedValue({
        artBalanceRaw: null,
        minPurchaseUsdtRaw: 10_000_000n,
        priceUsdtRaw: 250_000n,
        reservedAmount: 20n * 10n ** 18n,
        saleActive: true,
        saleCap: 100n * 10n ** 18n,
        saleEndTime: 1_100n,
        saleStartTime: 900n,
        sold: 25n * 10n ** 18n,
        status: "ready",
        usdtAllowanceRaw: null,
        usdtBalanceRaw: null,
        usdtDecimals: 6,
        usdtRaisedRaw: 6_250_000n,
      }),
    },
    eventsRepository: {
      fetchRecentEvents: vi.fn().mockResolvedValue({ events: [], warning: null }),
    },
    now: () => 1_000,
    repository: {
      fetchAssetDetail: vi.fn().mockResolvedValue(database()),
    },
    valuationRepository: {
      fetchLatestReport: vi.fn().mockResolvedValue(null),
    },
  };
}

function database(): AssetDetailDatabaseRow {
  return {
    artistName: "Artist",
    chainId: 97,
    contractAddress: "0x1111111111111111111111111111111111111111",
    creationYear: null,
    description: "Description",
    dimensions: null,
    id: "asset-1",
    imageUrl: null,
    material: null,
    participantsCount: 1,
    provenance: null,
    saleEnd: null,
    saleStart: null,
    status: "active",
    symbol: "ART",
    title: "Artwork",
    tokenPriceUsdt: "0.25",
    totalSupply: "100",
  };
}

function viewer() {
  return {
    isLoggedIn: true,
    kycApproved: true as const,
    walletAddress: null,
    whitelisted: true as const,
  };
}
