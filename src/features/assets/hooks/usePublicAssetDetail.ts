import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AssetDetailLoader,
  AssetDetailReadModel,
  AssetDetailViewer,
  AssetDetailWarning,
} from "../domain/assetDetailModels";
import type { PublicAssetSummary } from "../domain/assetModels";

export type UsePublicAssetDetailResult = {
  detail: AssetDetailReadModel | null;
  error: string | null;
  refresh(): void;
  retry(): void;
  status: "loading" | "refreshing" | "ready" | "error";
  warnings: AssetDetailWarning[];
};

export function usePublicAssetDetail({
  assetId,
  loader,
  placeholder,
  viewer,
}: {
  assetId: string;
  loader: AssetDetailLoader;
  placeholder?: PublicAssetSummary;
  viewer: AssetDetailViewer;
}): UsePublicAssetDetailResult {
  const [detail, setDetail] = useState<AssetDetailReadModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<UsePublicAssetDetailResult["status"]>("loading");
  const [warnings, setWarnings] = useState<AssetDetailWarning[]>([]);
  const requestIdRef = useRef(0);

  const run = useCallback((refreshing: boolean) => {
    const requestId = ++requestIdRef.current;
    setError(null);
    setStatus(refreshing && detail ? "refreshing" : "loading");
    void loader({
      assetId,
      ...(placeholder ? { placeholder } : {}),
      viewer: {
        isLoggedIn: viewer.isLoggedIn,
        kycApproved: viewer.kycApproved,
        walletAddress: viewer.walletAddress,
        whitelisted: viewer.whitelisted,
      },
    }).then((result) => {
      if (requestId !== requestIdRef.current) return;
      setDetail(result.detail);
      setWarnings(result.warnings);
      setStatus("ready");
    }).catch((reason: unknown) => {
      if (requestId !== requestIdRef.current) return;
      setError(reason instanceof Error ? reason.message : "Unable to load asset detail");
      setStatus("error");
    });
  }, [
    assetId,
    detail,
    loader,
    placeholder,
    viewer.isLoggedIn,
    viewer.kycApproved,
    viewer.walletAddress,
    viewer.whitelisted,
  ]);

  useEffect(() => {
    setDetail(null);
    setWarnings([]);
    run(false);
    return () => {
      requestIdRef.current += 1;
    };
  }, [assetId, loader, placeholder, viewer.isLoggedIn, viewer.kycApproved, viewer.walletAddress, viewer.whitelisted]);

  return {
    detail,
    error,
    refresh: () => run(true),
    retry: () => run(false),
    status,
    warnings,
  };
}
