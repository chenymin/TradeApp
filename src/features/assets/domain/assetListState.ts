import type {
  AssetListStatus,
  AssetPageResult,
  AssetSaleFilter,
  AssetSort,
  PublicAssetSummary,
} from "./assetModels";

export type AssetListState = {
  activeRequestId: number | null;
  errorMessage: string | null;
  filter: AssetSaleFilter;
  items: PublicAssetSummary[];
  nextCursor: string | null;
  search: string;
  sort: AssetSort;
  status: AssetListStatus;
  warningMessage: string | null;
};

type RequestMode = "initial" | "refresh" | "load_more";

type AssetListAction =
  | {
      filter: AssetSaleFilter;
      search: string;
      sort: AssetSort;
      type: "query_changed";
    }
  | {
      mode: RequestMode;
      requestId: number;
      type: "request_started";
    }
  | {
      mode: "append" | "replace";
      page: AssetPageResult;
      requestId: number;
      type: "request_succeeded";
    }
  | {
      message: string;
      mode: RequestMode;
      requestId: number;
      type: "request_failed";
    };

export function createInitialAssetListState({
  filter = "all",
  search = "",
  sort = "recent",
}: {
  filter?: AssetSaleFilter;
  search?: string;
  sort?: AssetSort;
} = {}): AssetListState {
  return {
    activeRequestId: null,
    errorMessage: null,
    filter,
    items: [],
    nextCursor: null,
    search,
    sort,
    status: "idle",
    warningMessage: null,
  };
}

export function assetListReducer(
  state: AssetListState,
  action: AssetListAction,
): AssetListState {
  if (action.type === "query_changed") {
    return {
      ...createInitialAssetListState(action),
      activeRequestId: null,
    };
  }

  if (action.type === "request_started") {
    return {
      ...state,
      activeRequestId: action.requestId,
      errorMessage: null,
      status: startedStatus(action.mode),
      warningMessage: null,
    };
  }

  if (action.requestId !== state.activeRequestId) {
    return state;
  }

  if (action.type === "request_failed") {
    if (action.mode === "initial") {
      return {
        ...state,
        activeRequestId: null,
        errorMessage: action.message,
        status: "error",
      };
    }

    return {
      ...state,
      activeRequestId: null,
      status: settledStatus(state.items, state.nextCursor),
      warningMessage: action.message,
    };
  }

  const items = action.mode === "append"
    ? appendUnique(state.items, action.page.items)
    : action.page.items;

  return {
    ...state,
    activeRequestId: null,
    errorMessage: null,
    items,
    nextCursor: action.page.nextCursor,
    status: settledStatus(items, action.page.nextCursor),
    warningMessage: null,
  };
}

function startedStatus(mode: RequestMode): AssetListStatus {
  if (mode === "refresh") {
    return "refreshing";
  }

  if (mode === "load_more") {
    return "loading_more";
  }

  return "initial_loading";
}

function settledStatus(
  items: PublicAssetSummary[],
  nextCursor: string | null,
): AssetListStatus {
  if (items.length === 0) {
    return "empty";
  }

  return nextCursor ? "ready" : "end_reached";
}

function appendUnique(
  current: PublicAssetSummary[],
  incoming: PublicAssetSummary[],
): PublicAssetSummary[] {
  const seen = new Set(current.map((item) => item.id));
  const result = [...current];

  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }

  return result;
}
