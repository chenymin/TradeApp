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

export function createDefaultDashboardHoldingsLoader() {
  return createDashboardHoldingsLoader({
    chainAdapter: createDashboardChainHoldingsAdapter({
      createClient: (chainId) =>
        getPublicChainClient<DashboardHoldingsReadClient>(chainId),
      getUsdtAddress,
    }),
    repository: createDashboardMintEventsRepository(
      supabase as unknown as DashboardMintEventsClient,
    ),
  });
}
