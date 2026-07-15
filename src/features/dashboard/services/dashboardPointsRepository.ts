import type { AuthViewer } from "../../auth/domain/authViewer";
import { normalizeDecimal, normalizeUnsignedDecimal } from "../domain/decimal";

export type DashboardPointTransaction = {
  amount: string;
  balanceAfter: string;
  createdAt: string | null;
  id: string;
  pointType: string;
  source: string | null;
};

type PointsResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type PointsQuery = {
  eq(column: string, value: unknown): PointsQuery;
  limit(value: number): PromiseLike<PointsResponse>;
  order(column: string, options: { ascending: boolean }): PointsQuery;
};

export type DashboardPointsClient = {
  from(table: "point_transactions"): {
    select(columns: string): PointsQuery;
  };
};

export type DashboardPointsRepository = {
  fetchRecent(viewerId: string): Promise<DashboardPointTransaction[]>;
};

export function createDashboardPointsRepository(
  client: DashboardPointsClient,
): DashboardPointsRepository {
  return {
    async fetchRecent(viewerId) {
      const response = await client
        .from("point_transactions")
        .select("id, point_type, amount, balance_after, source, created_at")
        .eq("user_id", viewerId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (response.error) {
        throw new Error(
          `Unable to load dashboard point transactions: ${response.error.message}`,
        );
      }

      return (response.data ?? []).map(mapPointTransaction);
    },
  };
}

export function createDashboardPointsLoader(
  repository: DashboardPointsRepository,
) {
  return async function loadPoints(state: {
    isSessionReady: boolean;
    viewer: AuthViewer | null;
  }): Promise<DashboardPointTransaction[] | null> {
    if (!state.isSessionReady || !state.viewer) {
      return null;
    }

    return repository.fetchRecent(state.viewer.id);
  };
}

function mapPointTransaction(value: unknown): DashboardPointTransaction {
  const row = value as Record<string, unknown>;
  return {
    amount: normalizeDecimal(row.amount),
    balanceAfter: normalizeUnsignedDecimal(row.balance_after),
    createdAt: text(row.created_at),
    id: String(row.id),
    pointType: text(row.point_type) ?? "unknown",
    source: text(row.source),
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
