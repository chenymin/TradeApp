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
import {
  createDashboardCommissionLoader,
  createDashboardCommissionRepository,
  type DashboardCommissionClient,
} from "./dashboardCommissionRepository";

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
  return createDashboardCommissionLoader(createDashboardCommissionRepository(
    supabase as unknown as DashboardCommissionClient,
  ));
}
