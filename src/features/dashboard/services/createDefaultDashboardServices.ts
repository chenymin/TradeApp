import { supabase } from "../../../lib/supabase/client";
import { createDashboardProfileLoader } from "./dashboardProfileLoader";
import {
  createDashboardProfileRepository,
  type DashboardProfileClient,
} from "./dashboardProfileRepository";
import {
  createNicknameRepository,
  type NicknameRpcClient,
} from "./nicknameRepository";
import {
  createDashboardKycLoader,
  createDashboardKycRepository,
  type DashboardKycClient,
} from "./dashboardKycRepository";
import {
  createDashboardPointsLoader,
  createDashboardPointsRepository,
  type DashboardPointsClient,
} from "./dashboardPointsRepository";
import { createKycIdentityDetailsClient } from "./kycIdentityDetailsClient";

export function createDashboardIdentityClient({
  fetch: fetchImpl,
  supabaseUrl,
}: {
  fetch: typeof fetch;
  supabaseUrl: string;
}) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("Invalid Supabase URL for KYC identity services");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("Invalid Supabase URL for KYC identity services");
  }

  return createKycIdentityDetailsClient({
    endpoint: new URL(
      "/functions/v1/kyc-applicant-details",
      parsedUrl,
    ).toString(),
    fetch: fetchImpl,
  });
}

export function createDefaultDashboardIdentityClient() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL for KYC identity services");
  }
  return createDashboardIdentityClient({
    fetch: globalThis.fetch,
    supabaseUrl,
  });
}

export function createDefaultDashboardProfileLoader() {
  const repository = createDashboardProfileRepository(
    supabase as unknown as DashboardProfileClient,
  );
  return createDashboardProfileLoader(repository);
}

export function createDefaultNicknameRepository() {
  return createNicknameRepository(supabase as unknown as NicknameRpcClient);
}

export function createDefaultDashboardKycLoader() {
  return createDashboardKycLoader(createDashboardKycRepository(
    supabase as unknown as DashboardKycClient,
  ));
}

export function createDefaultDashboardPointsLoader() {
  return createDashboardPointsLoader(createDashboardPointsRepository(
    supabase as unknown as DashboardPointsClient,
  ));
}

export function createDefaultDashboardCommissionLoader() {
  return async function loadCommission(state: {
    isSessionReady: boolean;
    viewer: unknown | null;
  }) {
    if (!state.isSessionReady || !state.viewer) return null;
    return { status: "unavailable" as const };
  };
}
