import type {
  DashboardProfile,
  DashboardProfileRepository,
} from "../domain/dashboardModels";

const PROFILE_SELECT = `
  id, user_type, tier, referral_points, trading_points,
  reputation_points, task_points, total_points, invite_code, nickname
`;

type ProfileResponse = {
  data: unknown | null;
  error: { message: string } | null;
};

type ProfileQuery = {
  eq(column: string, value: unknown): ProfileQuery;
  single(): PromiseLike<ProfileResponse>;
};

export type DashboardProfileClient = {
  from(table: "user_profiles"): {
    select(columns: string): ProfileQuery;
  };
};

export function createDashboardProfileRepository(
  client: DashboardProfileClient,
): DashboardProfileRepository {
  return {
    async fetchProfile(viewerId) {
      const response = await client
        .from("user_profiles")
        .select(PROFILE_SELECT)
        .eq("id", viewerId)
        .single();

      if (response.error) {
        throw new Error(`Unable to load dashboard profile: ${response.error.message}`);
      }

      if (!response.data) {
        throw new Error("Dashboard profile not found");
      }

      return mapProfile(response.data);
    },
  };
}

function mapProfile(value: unknown): DashboardProfile {
  const row = value as Record<string, unknown>;

  return {
    id: String(row.id),
    inviteCode: normalizeNullableString(row.invite_code),
    nickname: normalizeNullableString(row.nickname),
    referralPoints: normalizeNumber(row.referral_points),
    reputationPoints: normalizeNumber(row.reputation_points),
    taskPoints: normalizeNumber(row.task_points),
    tier: normalizeNullableString(row.tier),
    totalPoints: normalizeNumber(row.total_points),
    tradingPoints: normalizeNumber(row.trading_points),
    userType: normalizeNullableString(row.user_type),
  };
}

function normalizeNumber(value: unknown): number {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
