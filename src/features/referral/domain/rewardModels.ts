import type { RegistrationUserType } from "../../registration/domain/registrationPayload";
import type { ReferralStatus } from "./rewardStatus";
import type { CommissionStatus, PayoutStatus } from "./rewardStatus";
import type { RewardTier } from "./tierBenefits";

export type RewardsProfile = {
  id: string;
  inviteCode: string | null;
  referralPoints: number;
  reputationPoints: number;
  taskPoints: number;
  tier: RewardTier | null;
  totalPoints: number;
  tradingPoints: number;
  userType: RegistrationUserType | null;
};

export type PointLedgerEntry = {
  amount: string;
  balanceAfter: string;
  createdAt: string;
  id: string;
  pointType: "referral" | "reputation" | "task" | "trading" | "unknown";
  source: string | null;
};

export type ReferralRecord = {
  createdAt: string;
  id: string;
  referredEmail: string | null;
  referredId: string;
  referredTier: RewardTier | null;
  referredUserType: RegistrationUserType | null;
  referredWalletAddress: string | null;
  status: ReferralStatus;
  totalPointsAwarded: number;
};

export type CommissionSummary = {
  disputedTotalUsdt: string;
  lifetimeTotalUsdt: string;
  paidTotalUsdt: string;
  paymentPendingTotalUsdt: string;
  referredBuyerCount: number;
  referredMintTotalUsdt: string;
  reviewPendingTotalUsdt: string;
  userConfirmationPendingTotalUsdt: string;
};

export type CommissionDetail = {
  assetId: string;
  assetName: string;
  bonusTotalUsdt: string;
  confirmTotalUsdt: string;
  createdAt: string;
  goldenBonusSettled: string;
  goldenBonusUsdt: string;
  id: string;
  kolBonusSettled: string;
  kolBonusUsdt: string;
  payoutId: string | null;
  payoutPaidAt: string | null;
  payoutStatus: PayoutStatus | null;
  payoutTxHash: string | null;
  payoutUserConfirmedAt: string | null;
  pendingUsdt: string;
  referredDisplay: string;
  referredId: string;
  referrerWallet: string | null;
  settledUsdt: string;
  standardTotalUsdt: string;
  status: CommissionStatus;
  updatedAt: string;
};

export type CommissionReadResult =
  | {
      details: CommissionDetail[];
      status: "ready";
      summary: CommissionSummary;
    }
  | { status: "unavailable" };
