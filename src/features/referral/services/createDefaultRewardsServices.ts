import { supabase } from "../../../lib/supabase/client";
import {
  createDashboardKycLoader,
  createDashboardKycRepository,
  type DashboardKycClient,
} from "../../dashboard/services/dashboardKycRepository";
import {
  createPointLedgerRepository,
  type PointLedgerClient,
} from "./pointLedgerRepository";
import { createReferralRecordsClient } from "./referralRecordsClient";
import {
  createRewardsProfileRepository,
  type RewardsProfileClient,
} from "./rewardsProfileRepository";

type RewardsSessionClient = {
  auth: {
    getSession(): Promise<{
      data: { session: { access_token: string } | null };
      error: unknown | null;
    }>;
  };
};

type RewardsClient = DashboardKycClient &
  PointLedgerClient &
  RewardsProfileClient &
  RewardsSessionClient;

export function createRewardsServices({
  client,
  fetch: fetchImpl,
  supabaseUrl,
}: {
  client: RewardsClient;
  fetch: typeof fetch;
  supabaseUrl: string;
}) {
  const referralEndpoint = new URL(
    "/functions/v1/get-my-referrals",
    supabaseUrl,
  ).toString();

  return {
    async fetchAccessToken(): Promise<string | null> {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error("Unable to read the current rewards session");
      return data.session?.access_token ?? null;
    },
    kycLoader: createDashboardKycLoader(createDashboardKycRepository(client)),
    pointLedgerRepository: createPointLedgerRepository(client),
    referralRecordsClient: createReferralRecordsClient({
      endpoint: referralEndpoint,
      fetch: fetchImpl,
    }),
    rewardsProfileRepository: createRewardsProfileRepository(client),
  };
}

export function createDefaultRewardsServices() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL for rewards services");
  }

  return createRewardsServices({
    client: supabase as unknown as RewardsClient,
    fetch: globalThis.fetch,
    supabaseUrl,
  });
}
