export type ReferralStatus =
  | "approved"
  | "expired"
  | "pending"
  | "rejected"
  | "self_referral_rejected"
  | "unknown"
  | "waiting_kyc";

export type CommissionStatus =
  | "accumulating"
  | "disputed"
  | "pending_review"
  | "settled"
  | "suspicious"
  | "unknown";

export type PayoutStatus =
  | "cancelled"
  | "paid"
  | "pending_payment"
  | "pending_user_confirmation"
  | "unknown";

const REFERRAL_STATUSES = new Set<ReferralStatus>([
  "approved",
  "expired",
  "pending",
  "rejected",
  "self_referral_rejected",
  "waiting_kyc",
]);

const COMMISSION_STATUSES = new Set<CommissionStatus>([
  "accumulating",
  "disputed",
  "pending_review",
  "settled",
  "suspicious",
]);

const PAYOUT_STATUSES = new Set<PayoutStatus>([
  "cancelled",
  "paid",
  "pending_payment",
  "pending_user_confirmation",
]);

export function normalizeReferralStatus(value: unknown): ReferralStatus {
  return typeof value === "string" && REFERRAL_STATUSES.has(value as ReferralStatus)
    ? value as ReferralStatus
    : "unknown";
}

export function normalizeCommissionStatus(value: unknown): CommissionStatus {
  return typeof value === "string" && COMMISSION_STATUSES.has(value as CommissionStatus)
    ? value as CommissionStatus
    : "unknown";
}

export function normalizePayoutStatus(value: unknown): PayoutStatus | null {
  if (value == null) return null;
  return typeof value === "string" && PAYOUT_STATUSES.has(value as PayoutStatus)
    ? value as PayoutStatus
    : "unknown";
}
