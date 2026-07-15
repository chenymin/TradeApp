import type { AuthViewer } from "../../auth/domain/authViewer";
import {
  buildDashboardHoldings,
  type DashboardChainHoldingState,
  type DashboardHoldingAsset,
} from "../domain/holdings";
import type { DashboardMintEventsRepository } from "./dashboardMintEventsRepository";

export type DashboardChainHoldingsAdapter = {
  readHoldings(input: {
    assets: DashboardHoldingAsset[];
    walletAddress: string;
  }): Promise<Map<string, DashboardChainHoldingState>>;
};

export type DashboardHoldingsLoader = ReturnType<
  typeof createDashboardHoldingsLoader
>;

export function createDashboardHoldingsLoader({
  chainAdapter,
  repository,
}: {
  chainAdapter: DashboardChainHoldingsAdapter;
  repository: DashboardMintEventsRepository;
}) {
  return async function loadHoldings(state: {
    isSessionReady: boolean;
    viewer: AuthViewer | null;
  }) {
    const walletAddress = state.viewer?.walletAddress;

    if (!state.isSessionReady || !state.viewer || !walletAddress) {
      return null;
    }

    const events = await repository.fetchByWallet(walletAddress);
    const assets = uniqueAssets(events);
    const chainStates = await chainAdapter.readHoldings({
      assets,
      walletAddress,
    });
    return buildDashboardHoldings(events, chainStates);
  };
}

function uniqueAssets(
  events: Awaited<ReturnType<DashboardMintEventsRepository["fetchByWallet"]>>,
): DashboardHoldingAsset[] {
  const assets = new Map<string, DashboardHoldingAsset>();

  for (const event of events) {
    if (event.asset) {
      assets.set(event.asset.id, event.asset);
    }
  }

  return [...assets.values()];
}
