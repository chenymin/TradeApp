import { REGISTRATION_USER_TYPES } from "../../registration/domain/registrationPayload";
import type { RewardsProfile } from "../domain/rewardModels";
import type { RewardTier } from "../domain/tierBenefits";

type ProfileResponse = {
  data: unknown | null;
  error: { message: string } | null;
};

type ProfileQuery = {
  eq(column: string, value: unknown): ProfileQuery;
  single(): PromiseLike<ProfileResponse>;
};

export type RewardsProfileClient = {
  from(table: "user_profiles"): {
    select(columns: string): ProfileQuery;
  };
};

export type RewardsProfileRepository = {
  fetchProfile(viewerId: string): Promise<RewardsProfile>;
};

const PROFILE_SELECT = "id, user_type, tier, referral_points, trading_points, reputation_points, task_points, total_points, invite_code";

export function createRewardsProfileRepository(client: RewardsProfileClient) {
  return {
    async fetchProfile(viewerId: string): Promise<RewardsProfile> {
      const response = await client
        .from("user_profiles")
        .select(PROFILE_SELECT)
        .eq("id", viewerId)
        .single();

      if (response.error) {
        throw new Error(`Unable to load rewards profile: ${response.error.message}`);
      }
      if (!response.data) {
        throw new Error("Rewards profile not found");
      }

      return mapProfile(response.data);
    },
  };
}

function mapProfile(value: unknown): RewardsProfile {
  const row = value as Record<string, unknown>;
  return {
    id: requiredText(row.id, "profile id"),
    inviteCode: nullableText(row.invite_code),
    referralPoints: finiteNumber(row.referral_points),
    reputationPoints: finiteNumber(row.reputation_points),
    taskPoints: finiteNumber(row.task_points),
    tier: normalizeTier(row.tier),
    totalPoints: finiteNumber(row.total_points),
    tradingPoints: finiteNumber(row.trading_points),
    userType: typeof row.user_type === "string" &&
      REGISTRATION_USER_TYPES.includes(row.user_type as never)
      ? row.user_type as RewardsProfile["userType"]
      : null,
  };
}

function normalizeTier(value: unknown): RewardTier | null {
  return value === "S" || value === "A" || value === "B" ||
      value === "C" || value === "D"
    ? value
    : null;
}

function finiteNumber(value: unknown): number {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown, field: string): string {
  const text = nullableText(value);
  if (!text) throw new Error(`Invalid ${field}`);
  return text;
}
