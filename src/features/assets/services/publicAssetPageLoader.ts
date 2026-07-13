import { hasSupportedContractAddress } from "../domain/assetDisplayStatus";
import { toPublicAssetSummary } from "../domain/assetMappers";
import type {
  AssetChainReadState,
  AssetPageRequest,
  AssetPageResult,
  AssetRepository,
  AssetSaleFilter,
  PublicAssetPageLoader,
  PublicAssetSummary,
} from "../domain/assetModels";
import type { AssetContractReadAdapter } from "./assetContractReadAdapter";

export function createPublicAssetPageLoader({
  chainAdapter,
  now = () => Math.floor(Date.now() / 1_000),
  repository,
}: {
  chainAdapter: AssetContractReadAdapter;
  now?: () => number;
  repository: AssetRepository;
}): PublicAssetPageLoader {
  return async (request: AssetPageRequest): Promise<AssetPageResult> => {
    const page = await repository.fetchAssetPage(request);
    const chainStates = await readChainStatesWithFallback(chainAdapter, page.rows);
    const nowSeconds = now();
    const items = page.rows
      .map((row) => toPublicAssetSummary(row, chainStates.get(row.id) ?? errorState(), nowSeconds))
      .filter((item) => matchesFilter(item, request.filter));

    if (request.sort === "progress_desc") {
      items.sort((left, right) => right.progressPercent - left.progressPercent);
    }

    return {
      items,
      nextCursor: page.nextCursor,
      ...(page.totalCount === undefined ? {} : { totalCount: page.totalCount }),
    };
  };
}

async function readChainStatesWithFallback(
  chainAdapter: AssetContractReadAdapter,
  rows: Parameters<AssetContractReadAdapter["readListState"]>[0],
): Promise<Map<string, AssetChainReadState>> {
  try {
    return await chainAdapter.readListState(rows);
  } catch {
    return new Map(rows.map((row) => [
      row.id,
      hasSupportedContractAddress(row.contractAddress)
        ? errorState()
        : { ...errorState(), status: "unsupported" },
    ]));
  }
}

function matchesFilter(item: PublicAssetSummary, filter: AssetSaleFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "completed") {
    return item.saleStatus === "completed" || item.saleStatus === "paused" || item.saleStatus === "sold_out";
  }

  return item.saleStatus === filter;
}

function errorState(): AssetChainReadState {
  return {
    saleActive: false,
    saleCap: 0n,
    saleEndTime: 0n,
    saleStartTime: 0n,
    sold: 0n,
    status: "error",
  };
}
