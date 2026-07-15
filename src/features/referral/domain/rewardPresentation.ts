import type { RegistrationUserType } from "../../registration/domain/registrationPayload";
import { normalizeDecimal } from "../../../shared/domain/decimal";
import type { PointLedgerEntry, ReferralRecord } from "./rewardModels";
import type { ReferralStatus } from "./rewardStatus";

const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  approved: "Approved",
  expired: "Expired",
  pending: "Pending",
  rejected: "Rejected",
  self_referral_rejected: "Self-referral rejected",
  unknown: "Status unavailable",
  waiting_kyc: "Waiting for KYC",
};

const POINT_TYPE_LABELS: Record<PointLedgerEntry["pointType"], string> = {
  referral: "Referral points",
  reputation: "Reputation points",
  task: "Task points",
  trading: "Trading points",
  unknown: "Other points",
};

const USER_TYPE_LABELS: Record<RegistrationUserType, string> = {
  collector: "Collector",
  creator: "Creator",
  institution: "Institution",
  investor: "Investor",
};

export function formatRewardPoints(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatLedgerAmount(value: string): string {
  const normalized = normalizeDecimal(value);
  const formatted = formatDecimalString(normalized);
  return normalized.startsWith("-") || normalized === "0"
    ? formatted
    : `+${formatted}`;
}

export function formatLedgerBalance(value: string): string {
  return formatDecimalString(normalizeDecimal(value));
}

export function formatRewardDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function referralDisplay(value: Pick<
  ReferralRecord,
  "referredEmail" | "referredId" | "referredWalletAddress"
>): string {
  return value.referredEmail ??
    (value.referredWalletAddress
      ? shorten(value.referredWalletAddress)
      : shorten(value.referredId));
}

export function referralStatusLabel(value: ReferralStatus): string {
  return REFERRAL_STATUS_LABELS[value];
}

export function pointTypeLabel(value: PointLedgerEntry["pointType"]): string {
  return POINT_TYPE_LABELS[value];
}

export function userTypeLabel(value: RegistrationUserType | null): string {
  return value ? USER_TYPE_LABELS[value] : "Type unavailable";
}

function formatDecimalString(value: string): string {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const visibleFraction = fraction.slice(0, 2).replace(/0+$/, "");
  const formatted = visibleFraction ? `${grouped}.${visibleFraction}` : grouped;
  return negative ? `-${formatted}` : formatted;
}

function shorten(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
