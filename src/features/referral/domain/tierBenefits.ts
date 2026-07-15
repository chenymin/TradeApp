export type RewardTier = "A" | "B" | "C" | "D" | "S";

const BENEFIT_COUNTS: Record<RewardTier, number> = {
  A: 4,
  B: 4,
  C: 3,
  D: 2,
  S: 4,
};

export function getTierBenefitKeys(tier: unknown): string[] {
  if (typeof tier !== "string" || !(tier in BENEFIT_COUNTS)) {
    return [];
  }

  const normalizedTier = tier as RewardTier;
  return Array.from(
    { length: BENEFIT_COUNTS[normalizedTier] },
    (_, index) => `referral.tierBenefits.${normalizedTier}.${index + 1}`,
  );
}
