import { getPublicChainClient, getUsdtAddress } from "../../../lib/chain/publicChainRegistry";
import { supabase } from "../../../lib/supabase/client";
import {
  createDashboardChainHoldingsAdapter,
  type DashboardHoldingsReadClient,
} from "./dashboardChainHoldingsAdapter";
import { createDashboardHoldingsLoader } from "./dashboardHoldingsLoader";
import {
  createDashboardMintEventsRepository,
  type DashboardMintEventsClient,
} from "./dashboardMintEventsRepository";
import {
  createDashboardInvestorWalletsRepository,
  type DashboardInvestorWalletsClient,
} from "./dashboardInvestorWalletsRepository";

export function createDefaultDashboardHoldingsLoader() {
  return createDashboardHoldingsLoader({
    chainAdapter: createDashboardChainHoldingsAdapter({
      createClient: (chainId) =>
        getPublicChainClient<DashboardHoldingsReadClient>(chainId),
      getUsdtAddress,
    }),
    eventsRepository: createDashboardMintEventsRepository(
      supabase as unknown as DashboardMintEventsClient,
    ),
    walletsRepository: createDashboardInvestorWalletsRepository(
      supabase as unknown as DashboardInvestorWalletsClient,
    ),
  });
}
