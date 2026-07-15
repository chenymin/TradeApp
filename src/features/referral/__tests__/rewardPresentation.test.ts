import { describe, expect, it } from "vitest";

import {
  formatLedgerAmount,
  formatLedgerBalance,
  formatRewardDate,
  formatRewardPoints,
  pointTypeLabel,
  referralDisplay,
  referralStatusLabel,
  userTypeLabel,
} from "../domain/rewardPresentation";

describe("reward presentation", () => {
  it("formats point balances without unnecessary decimal zeroes", () => {
    expect(formatRewardPoints(1250)).toBe("1,250");
    expect(formatRewardPoints(12.5)).toBe("12.5");
    expect(formatRewardPoints(Number.NaN)).toBe("0");
  });

  it("formats signed ledger amounts and balances", () => {
    expect(formatLedgerAmount("12.50")).toBe("+12.5");
    expect(formatLedgerAmount("-3.25")).toBe("-3.25");
    expect(formatLedgerAmount("0")).toBe("0");
    expect(formatLedgerBalance("1250.500")).toBe("1,250.5");
  });

  it("chooses a safe referral identity fallback", () => {
    expect(referralDisplay({
      referredEmail: "friend@example.com",
      referredId: "user-123456789",
      referredWalletAddress: "0x1234567890abcdef",
    })).toBe("friend@example.com");
    expect(referralDisplay({
      referredEmail: null,
      referredId: "user-123456789",
      referredWalletAddress: "0x1234567890abcdef",
    })).toBe("0x1234...cdef");
    expect(referralDisplay({
      referredEmail: null,
      referredId: "user-123456789",
      referredWalletAddress: null,
    })).toBe("user-1...6789");
  });

  it("uses stable labels for known and unknown enum values", () => {
    expect(referralStatusLabel("waiting_kyc")).toBe("Waiting for KYC");
    expect(referralStatusLabel("unknown")).toBe("Status unavailable");
    expect(pointTypeLabel("reputation")).toBe("Reputation points");
    expect(pointTypeLabel("unknown")).toBe("Other points");
    expect(userTypeLabel("creator")).toBe("Creator");
    expect(userTypeLabel(null)).toBe("Type unavailable");
  });

  it("formats valid dates and rejects invalid dates", () => {
    expect(formatRewardDate("2026-07-15T08:30:00.000Z")).not.toBe("Date unavailable");
    expect(formatRewardDate("not-a-date")).toBe("Date unavailable");
  });
});
