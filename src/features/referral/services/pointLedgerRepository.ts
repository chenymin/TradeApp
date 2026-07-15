import {
  normalizeDecimal,
  normalizeUnsignedDecimal,
} from "../../../shared/domain/decimal";
import type { PointLedgerEntry } from "../domain/rewardModels";

type LedgerResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type LedgerQuery = {
  eq(column: string, value: unknown): LedgerQuery;
  limit(value: number): PromiseLike<LedgerResponse>;
  order(column: string, options: { ascending: boolean }): LedgerQuery;
};

export type PointLedgerClient = {
  from(table: "point_transactions"): {
    select(columns: string): LedgerQuery;
  };
};

export type PointLedgerRepository = {
  fetchRecent(viewerId: string): Promise<PointLedgerEntry[]>;
};

export function createPointLedgerRepository(client: PointLedgerClient) {
  return {
    async fetchRecent(viewerId: string): Promise<PointLedgerEntry[]> {
      const response = await client
        .from("point_transactions")
        .select("id, point_type, amount, balance_after, source, created_at")
        .eq("user_id", viewerId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (response.error) {
        throw new Error(`Unable to load point ledger: ${response.error.message}`);
      }

      return (response.data ?? []).map(mapEntry);
    },
  };
}

function mapEntry(value: unknown): PointLedgerEntry {
  const row = value as Record<string, unknown>;
  return {
    amount: normalizeDecimal(row.amount),
    balanceAfter: normalizeUnsignedDecimal(row.balance_after),
    createdAt: requiredText(row.created_at, "point created_at"),
    id: requiredText(row.id, "point id"),
    pointType: normalizePointType(row.point_type),
    source: nullableText(row.source),
  };
}

function normalizePointType(value: unknown): PointLedgerEntry["pointType"] {
  return value === "referral" || value === "reputation" ||
      value === "task" || value === "trading"
    ? value
    : "unknown";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown, field: string): string {
  const text = nullableText(value);
  if (!text) throw new Error(`Invalid ${field}`);
  return text;
}
