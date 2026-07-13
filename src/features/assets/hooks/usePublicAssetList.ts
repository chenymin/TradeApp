import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  assetListReducer,
  createInitialAssetListState,
  type AssetListState,
} from "../domain/assetListState";
import type {
  AssetPageRequest,
  AssetSaleFilter,
  AssetSort,
  PublicAssetPageLoader,
} from "../domain/assetModels";

type Query = Pick<AssetPageRequest, "filter" | "search" | "sort">;
type RequestMode = "initial" | "refresh" | "load_more";

export type UsePublicAssetListResult = AssetListState & {
  loadMore(): void;
  refresh(): void;
  retry(): void;
  searchInput: string;
  setFilter(filter: AssetSaleFilter): void;
  setSearch(search: string): void;
  setSort(sort: AssetSort): void;
};

export function usePublicAssetList({
  initialFilter = "all",
  initialSearch = "",
  initialSort = "recent",
  loader,
  pageSize = 20,
  searchDebounceMs = 300,
}: {
  initialFilter?: AssetSaleFilter;
  initialSearch?: string;
  initialSort?: AssetSort;
  loader: PublicAssetPageLoader;
  pageSize?: number;
  searchDebounceMs?: number;
}): UsePublicAssetListResult {
  const [state, dispatch] = useReducer(
    assetListReducer,
    createInitialAssetListState({
      filter: initialFilter,
      search: initialSearch,
      sort: initialSort,
    }),
  );
  const [searchInput, setSearchInput] = useState(initialSearch);
  const requestIdRef = useRef(0);

  const runRequest = useCallback((
    mode: RequestMode,
    query: Query,
    cursor?: string,
  ) => {
    const requestId = ++requestIdRef.current;
    dispatch({ mode, requestId, type: "request_started" });

    void loader({
      cursor,
      filter: query.filter,
      pageSize,
      search: query.search?.trim() || undefined,
      sort: query.sort,
    }).then((page) => {
      dispatch({
        mode: mode === "load_more" ? "append" : "replace",
        page,
        requestId,
        type: "request_succeeded",
      });
    }).catch((error: unknown) => {
      dispatch({
        message: error instanceof Error ? error.message : "Unable to load assets",
        mode,
        requestId,
        type: "request_failed",
      });
    });
  }, [loader, pageSize]);

  useEffect(() => {
    runRequest("initial", state, undefined);
  }, [runRequest, state.filter, state.search, state.sort]);

  useEffect(() => {
    if (searchInput === state.search) {
      return;
    }

    const timeout = setTimeout(() => {
      dispatch({
        filter: state.filter,
        search: searchInput,
        sort: state.sort,
        type: "query_changed",
      });
    }, searchDebounceMs);

    return () => clearTimeout(timeout);
  }, [searchDebounceMs, searchInput, state.filter, state.search, state.sort]);

  const setFilter = useCallback((filter: AssetSaleFilter) => {
    dispatch({
      filter,
      search: state.search,
      sort: state.sort,
      type: "query_changed",
    });
  }, [state.search, state.sort]);

  const setSort = useCallback((sort: AssetSort) => {
    dispatch({
      filter: state.filter,
      search: state.search,
      sort,
      type: "query_changed",
    });
  }, [state.filter, state.search]);

  const refresh = useCallback(() => {
    if (state.status === "refreshing" || state.status === "loading_more") {
      return;
    }

    runRequest("refresh", state, undefined);
  }, [runRequest, state]);

  const loadMore = useCallback(() => {
    if (state.status !== "ready" || !state.nextCursor) {
      return;
    }

    runRequest("load_more", state, state.nextCursor);
  }, [runRequest, state]);

  const retry = useCallback(() => {
    runRequest(state.items.length === 0 ? "initial" : "refresh", state, undefined);
  }, [runRequest, state]);

  return {
    ...state,
    loadMore,
    refresh,
    retry,
    searchInput,
    setFilter,
    setSearch: setSearchInput,
    setSort,
  };
}
