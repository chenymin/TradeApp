import type { AuthViewer } from "../../auth/domain/authViewer";

export type DashboardKycStatus =
  | "awaiting_resubmission"
  | "pending"
  | "approved"
  | "rejected"
  | "under_review"
  | null;

export type DashboardKycSummary = {
  approved: boolean;
  notes: string | null;
  reasonCode: string | null;
  reviewedAt: string | null;
  status: DashboardKycStatus;
};

type KycResponse = {
  data: unknown | null;
  error: { message: string } | null;
};

type KycQuery = {
  eq(column: string, value: unknown): KycQuery;
  limit(value: number): KycQuery;
  maybeSingle(): PromiseLike<KycResponse>;
  order(column: string, options: { ascending: boolean }): KycQuery;
};

export type DashboardKycClient = {
  from(table: "kyc_applications"): {
    select(columns: string): KycQuery;
  };
};

export type DashboardKycRepository = {
  fetchLatest(viewerId: string): Promise<DashboardKycSummary>;
};

export function createDashboardKycRepository(
  client: DashboardKycClient,
): DashboardKycRepository {
  return {
    async fetchLatest(viewerId) {
      const response = await client
        .from("kyc_applications")
        .select("status, reviewed_at, reason_code, notes")
        .eq("investor_id", viewerId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (response.error) {
        throw new Error(
          `Unable to load dashboard KYC status: ${response.error.message}`,
        );
      }

      const row = response.data as Record<string, unknown> | null;
      const status = normalizeStatus(row?.status);
      return {
        approved: status === "approved",
        notes: text(row?.notes),
        reasonCode: text(row?.reason_code),
        reviewedAt: text(row?.reviewed_at),
        status,
      };
    },
  };
}

export function createDashboardKycLoader(repository: DashboardKycRepository) {
  return async function loadKyc(state: {
    isSessionReady: boolean;
    viewer: AuthViewer | null;
  }): Promise<DashboardKycSummary | null> {
    if (!state.isSessionReady || !state.viewer) {
      return null;
    }

    return repository.fetchLatest(state.viewer.id);
  };
}

function normalizeStatus(value: unknown): DashboardKycStatus {
  return value === "awaiting_resubmission" ||
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "under_review"
    ? value
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
