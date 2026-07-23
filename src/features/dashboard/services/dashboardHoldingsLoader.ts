import type { AuthViewer } from "../../auth/domain/authViewer";
import {
  buildDashboardHoldings,
  type DashboardChainHoldingState,
  type DashboardHoldingAsset,
} from "../domain/holdings";
import type { DashboardMintEventsRepository } from "./dashboardMintEventsRepository";
import type { DashboardInvestorWalletsRepository } from "./dashboardInvestorWalletsRepository";

export type DashboardChainHoldingsAdapter = {
  readHoldings(input: {
    assets: DashboardHoldingAsset[];
    walletAddresses: string[];
  }): Promise<Map<string, DashboardChainHoldingState>>;
};

export type DashboardHoldingsLoader = ReturnType<
  typeof createDashboardHoldingsLoader
>;

export type DashboardHoldingsResult = NonNullable<
  Awaited<ReturnType<DashboardHoldingsLoader>>
>;

export function createDashboardHoldingsLoader({
  chainAdapter,
  eventsRepository,
  walletsRepository,
}: {
  chainAdapter: DashboardChainHoldingsAdapter;
  eventsRepository: DashboardMintEventsRepository;
  walletsRepository: DashboardInvestorWalletsRepository;
}) {
  return async function loadHoldings(state: {
    isSessionReady: boolean;
    viewer: AuthViewer | null;
  }) {
    if (!state.isSessionReady || !state.viewer) {
      return null;
    }

    const [events, walletAddresses] = await Promise.all([
      eventsRepository.fetchByInvestor(state.viewer.id),
      walletsRepository.fetchActiveEthereumByInvestor(state.viewer.id),
    ]);
    const assets = uniqueAssets(events);
    const chainStates = await chainAdapter.readHoldings({
      assets,
      walletAddresses,
    });
    return buildDashboardHoldings(events, chainStates);
  };
}

function uniqueAssets(
  events: Awaited<ReturnType<DashboardMintEventsRepository["fetchByInvestor"]>>,
): DashboardHoldingAsset[] {
  const assets = new Map<string, DashboardHoldingAsset>();

  for (const event of events) {
    if (event.asset) {
      assets.set(event.asset.id, event.asset);
    }
  }

  return [...assets.values()];
}
