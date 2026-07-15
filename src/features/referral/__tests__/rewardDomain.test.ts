import { describe, expect, it } from "vitest";

import { calculateCommissionAmounts } from "../domain/commissionAmounts";
import {
  normalizeCommissionStatus,
  normalizePayoutStatus,
  normalizeReferralStatus,
} from "../domain/rewardStatus";
import { getTierBenefitKeys } from "../domain/tierBenefits";

describe("reward domain", () => {
  it("adds commission decimal strings without floating point drift", () => {
    expect(calculateCommissionAmounts({
      goldenBonusSettled: "0.6",
      goldenBonusUsdt: "0.5",
      kolBonusSettled: "0.4",
      kolBonusUsdt: "0.3",
      pendingUsdt: "0.1",
      settledUsdt: "0.2",
    })).toEqual({
      bonusTotalUsdt: "1.8",
      confirmTotalUsdt: "2.1",
      standardTotalUsdt: "0.3",
    });
  });

  it("normalizes invalid or negative commission fields to zero", () => {
    expect(calculateCommissionAmounts({
      goldenBonusSettled: null,
      goldenBonusUsdt: "invalid",
      kolBonusSettled: undefined,
      kolBonusUsdt: "-2",
      pendingUsdt: "3",
      settledUsdt: 4,
    })).toEqual({
      bonusTotalUsdt: "0",
      confirmTotalUsdt: "7",
      standardTotalUsdt: "7",
    });
  });

  it("preserves known reward states and rejects unknown states", () => {
    expect(normalizeReferralStatus("waiting_kyc")).toBe("waiting_kyc");
    expect(normalizeReferralStatus("future_state")).toBe("unknown");
    expect(normalizeCommissionStatus("pending_review")).toBe("pending_review");
    expect(normalizeCommissionStatus("future_state")).toBe("unknown");
    expect(normalizePayoutStatus("pending_user_confirmation")).toBe(
      "pending_user_confirmation",
    );
    expect(normalizePayoutStatus("future_state")).toBe("unknown");
    expect(normalizePayoutStatus(null)).toBeNull();
  });

  it("returns only the configured benefit keys for a known tier", () => {
    expect(getTierBenefitKeys("D")).toEqual([
      "referral.tierBenefits.D.1",
      "referral.tierBenefits.D.2",
    ]);
    expect(getTierBenefitKeys("S")).toHaveLength(4);
    expect(getTierBenefitKeys("future-tier")).toEqual([]);
    expect(getTierBenefitKeys(null)).toEqual([]);
  });
});
