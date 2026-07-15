import type { AuthViewer } from "../../auth/domain/authViewer";
import { normalizeUnsignedDecimal } from "../domain/decimal";

export type DashboardCommissionSummary = {
  disputedTotalUsdt: string;
  lifetimeTotalUsdt: string;
  paidTotalUsdt: string;
  paymentPendingTotalUsdt: string;
  referredBuyerCount: number;
  referredMintTotalUsdt: string;
  reviewPendingTotalUsdt: string;
  userConfirmationPendingTotalUsdt: string;
};

export type DashboardCommissionResult =
  | { status: "ready"; summary: DashboardCommissionSummary }
  | { status: "unavailable" };

type CommissionError = { code?: string; message: string };
type CommissionResponse = {
  data: unknown | null;
  error: CommissionError | null;
};

export type DashboardCommissionClient = {
  from(table: "my_commission_summary"): {
    select(columns: string): {
      maybeSingle(): PromiseLike<CommissionResponse>;
    };
  };
};

export type DashboardCommissionRepository = {
  fetchSummary(): Promise<DashboardCommissionResult>;
};

const COMMISSION_SELECT = [
  "review_pending_total_usdt",
  "user_confirmation_pending_total_usdt",
  "payment_pending_total_usdt",
  "paid_total_usdt",
  "disputed_total_usdt",
  "lifetime_total_usdt",
  "referred_buyer_count",
  "referred_mint_total_usdt",
].join(", ");

export function createDashboardCommissionRepository(
  client: DashboardCommissionClient,
): DashboardCommissionRepository {
  return {
    async fetchSummary() {
      const response = await client
        .from("my_commission_summary")
        .select(COMMISSION_SELECT)
        .maybeSingle();

      if (response.error) {
        if (isReadModelUnavailable(response.error)) {
          return { status: "unavailable" };
        }

        throw new Error(
          `Unable to load dashboard commission summary: ${response.error.message}`,
        );
      }

      return {
        status: "ready",
        summary: mapSummary(response.data),
      };
    },
  };
}

export function createDashboardCommissionLoader(
  repository: DashboardCommissionRepository,
) {
  return async function loadCommission(state: {
    isSessionReady: boolean;
    viewer: AuthViewer | null;
  }): Promise<DashboardCommissionResult | null> {
    if (!state.isSessionReady || !state.viewer) {
      return null;
    }

    return repository.fetchSummary();
  };
}

function mapSummary(value: unknown): DashboardCommissionSummary {
  const row = value as Record<string, unknown> | null;
  return {
    disputedTotalUsdt: normalizeUnsignedDecimal(row?.disputed_total_usdt),
    lifetimeTotalUsdt: normalizeUnsignedDecimal(row?.lifetime_total_usdt),
    paidTotalUsdt: normalizeUnsignedDecimal(row?.paid_total_usdt),
    paymentPendingTotalUsdt: normalizeUnsignedDecimal(
      row?.payment_pending_total_usdt,
    ),
    referredBuyerCount: finiteCount(row?.referred_buyer_count),
    referredMintTotalUsdt: normalizeUnsignedDecimal(row?.referred_mint_total_usdt),
    reviewPendingTotalUsdt: normalizeUnsignedDecimal(
      row?.review_pending_total_usdt,
    ),
    userConfirmationPendingTotalUsdt: normalizeUnsignedDecimal(
      row?.user_confirmation_pending_total_usdt,
    ),
  };
}

function finiteCount(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function isReadModelUnavailable(error: CommissionError): boolean {
  return error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message.includes("Could not find the table") ||
    error.message.includes("does not exist") ||
    error.message.includes("relation");
}
