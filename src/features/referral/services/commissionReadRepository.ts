import { normalizeUnsignedDecimal } from "../../../shared/domain/decimal";
import { calculateCommissionAmounts } from "../domain/commissionAmounts";
import type {
  CommissionDetail,
  CommissionReadResult,
  CommissionSummary,
} from "../domain/rewardModels";
import {
  normalizeCommissionStatus,
  normalizePayoutStatus,
} from "../domain/rewardStatus";

type ReadError = { code?: string; message: string };
type SummaryResponse = { data: unknown | null; error: ReadError | null };
type DetailsResponse = { data: unknown[] | null; error: ReadError | null };

type CommissionQuery = {
  maybeSingle(): PromiseLike<SummaryResponse>;
  order(
    column: string,
    options: { ascending: boolean },
  ): PromiseLike<DetailsResponse>;
};

export type CommissionReadClient = {
  from(table: "my_commission_details" | "my_commission_summary"): {
    select(columns: string): CommissionQuery;
  };
};

export type CommissionReadRepository = {
  fetchReadModel(): Promise<CommissionReadResult>;
};

const SUMMARY_SELECT = "review_pending_total_usdt, user_confirmation_pending_total_usdt, payment_pending_total_usdt, paid_total_usdt, disputed_total_usdt, lifetime_total_usdt, referred_buyer_count, referred_mint_total_usdt";
const DETAILS_SELECT = "id, asset_id, asset_name, referred_id, referred_display, pending_usdt, settled_usdt, kol_bonus_usdt, kol_bonus_settled, golden_bonus_usdt, golden_bonus_settled, status, payout_id, payout_status, payout_tx_hash, payout_user_confirmed_at, payout_paid_at, referrer_wallet, updated_at, created_at";

export function createCommissionReadRepository(client: CommissionReadClient) {
  return {
    async fetchReadModel(): Promise<CommissionReadResult> {
      const [summaryResponse, detailsResponse] = await Promise.all([
        client
          .from("my_commission_summary")
          .select(SUMMARY_SELECT)
          .maybeSingle(),
        client
          .from("my_commission_details")
          .select(DETAILS_SELECT)
          .order("updated_at", { ascending: false }),
      ]);

      const errors = [summaryResponse.error, detailsResponse.error]
        .filter((error): error is ReadError => Boolean(error));
      const blockingError = errors.find((error) => !isUnavailable(error));

      if (blockingError) {
        throw new Error(
          `Unable to load commission read model: ${blockingError.message}`,
        );
      }
      if (errors.length > 0) {
        return { status: "unavailable" };
      }

      return {
        details: (detailsResponse.data ?? []).map(mapDetail),
        status: "ready",
        summary: mapSummary(summaryResponse.data),
      };
    },
  };
}

function mapSummary(value: unknown): CommissionSummary {
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

function mapDetail(value: unknown, index: number): CommissionDetail {
  const row = value as Record<string, unknown>;
  const assetId = requiredText(row.asset_id, "commission asset_id");
  const referredId = requiredText(row.referred_id, "commission referred_id");
  const pendingUsdt = normalizeUnsignedDecimal(row.pending_usdt);
  const settledUsdt = normalizeUnsignedDecimal(row.settled_usdt);
  const kolBonusUsdt = normalizeUnsignedDecimal(row.kol_bonus_usdt);
  const kolBonusSettled = normalizeUnsignedDecimal(row.kol_bonus_settled);
  const goldenBonusUsdt = normalizeUnsignedDecimal(row.golden_bonus_usdt);
  const goldenBonusSettled = normalizeUnsignedDecimal(row.golden_bonus_settled);
  const totals = calculateCommissionAmounts({
    goldenBonusSettled,
    goldenBonusUsdt,
    kolBonusSettled,
    kolBonusUsdt,
    pendingUsdt,
    settledUsdt,
  });

  return {
    assetId,
    assetName: nullableText(row.asset_name) ?? assetId,
    ...totals,
    createdAt: requiredText(row.created_at, "commission created_at"),
    goldenBonusSettled,
    goldenBonusUsdt,
    id: nullableText(row.id) ?? `${assetId}:${referredId}:${index}`,
    kolBonusSettled,
    kolBonusUsdt,
    payoutId: nullableText(row.payout_id),
    payoutPaidAt: nullableText(row.payout_paid_at),
    payoutStatus: normalizePayoutStatus(row.payout_status),
    payoutTxHash: nullableText(row.payout_tx_hash),
    payoutUserConfirmedAt: nullableText(row.payout_user_confirmed_at),
    pendingUsdt,
    referredDisplay: nullableText(row.referred_display) ?? shorten(referredId),
    referredId,
    referrerWallet: nullableText(row.referrer_wallet),
    settledUsdt,
    status: normalizeCommissionStatus(row.status),
    updatedAt: requiredText(row.updated_at, "commission updated_at"),
  };
}

function isUnavailable(error: ReadError): boolean {
  return error.code === "PGRST205" || error.code === "42P01" ||
    error.message.includes("Could not find the table") ||
    (error.message.includes("relation") && error.message.includes("does not exist"));
}

function finiteCount(value: unknown): number {
  const count = Number(value ?? 0);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown, field: string): string {
  const text = nullableText(value);
  if (!text) throw new Error(`Invalid ${field}`);
  return text;
}

function shorten(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}
