import { toAssetDetailReadModel } from "../domain/assetDetailMappers";
import type {
  AssetDetailContractReadAdapter,
  AssetDetailLoader,
  AssetDetailRepository,
  AssetDetailWarning,
  AssetValuationRepository,
  MintEventsRepository,
} from "../domain/assetDetailModels";

export function createPublicAssetDetailLoader({
  chainAdapter,
  eventsRepository,
  now = () => Math.floor(Date.now() / 1_000),
  repository,
  valuationRepository,
}: {
  chainAdapter: AssetDetailContractReadAdapter;
  eventsRepository: MintEventsRepository;
  now?: () => number;
  repository: AssetDetailRepository;
  valuationRepository: AssetValuationRepository;
}): AssetDetailLoader {
  return async ({ assetId, viewer }) => {
    const database = await repository.fetchAssetDetail(assetId);
    const [valuationResult, eventsResult, chainResult] = await Promise.all([
      valuationRepository.fetchLatestReport(assetId)
        .then((value) => ({ value, warning: null as AssetDetailWarning | null }))
        .catch(() => ({ value: null, warning: "valuation_unavailable" as const })),
      eventsRepository.fetchRecentEvents(assetId)
        .then((value) => ({
          value,
          warning: value.warning ? "events_unavailable" as const : null,
        }))
        .catch(() => ({
          value: { events: [], warning: "events_unavailable" as const },
          warning: "events_unavailable" as const,
        })),
      chainAdapter.readDetailState({
        chainId: database.chainId,
        contractAddress: database.contractAddress,
        walletAddress: viewer.walletAddress,
      })
        .then((value) => ({
          value,
          warning: value.status === "error" ? "chain_unavailable" as const : null,
        }))
        .catch(() => ({
          value: { status: "error" as const },
          warning: "chain_unavailable" as const,
        })),
    ]);
    const warnings = [
      valuationResult.warning,
      eventsResult.warning,
      chainResult.warning,
    ].filter((warning): warning is AssetDetailWarning => warning !== null);

    return {
      detail: toAssetDetailReadModel({
        contract: chainResult.value,
        database,
        events: eventsResult.value,
        nowSeconds: now(),
        valuation: valuationResult.value,
        valuationUnavailable: valuationResult.warning !== null,
        viewer,
      }),
      warnings,
    };
  };
}
