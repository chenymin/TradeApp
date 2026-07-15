import { describe, expect, it } from "vitest";

import { createDashboardProfileRepository } from "../services/dashboardProfileRepository";

describe("dashboard profile repository", () => {
  it("reads the viewer profile and normalizes database numeric values", async () => {
    const fake = createFakeClient({
      id: "viewer-1",
      invite_code: "INVITE1",
      nickname: "Alice",
      referral_points: "12",
      reputation_points: null,
      task_points: "invalid",
      tier: "A",
      total_points: "34.5",
      trading_points: 22.5,
      user_type: "investor",
    });

    const profile = await createDashboardProfileRepository(fake.client)
      .fetchProfile("viewer-1");

    expect(fake.calls).toEqual([
      ["from", "user_profiles"],
      ["select", "id, user_type, tier, referral_points, trading_points, reputation_points, task_points, total_points, invite_code, nickname"],
      ["eq", "id", "viewer-1"],
      ["single"],
    ]);
    expect(profile).toEqual({
      id: "viewer-1",
      inviteCode: "INVITE1",
      nickname: "Alice",
      referralPoints: 12,
      reputationPoints: 0,
      taskPoints: 0,
      tier: "A",
      totalPoints: 34.5,
      tradingPoints: 22.5,
      userType: "investor",
    });
  });

  it("does not turn a missing or RLS-blocked profile into empty data", async () => {
    await expect(createDashboardProfileRepository(
      createFakeClient(null).client,
    ).fetchProfile("viewer-1")).rejects.toThrow("Dashboard profile not found");

    await expect(createDashboardProfileRepository(
      createFakeClient(null, { message: "permission denied" }).client,
    ).fetchProfile("viewer-1")).rejects.toThrow(
      "Unable to load dashboard profile: permission denied",
    );
  });
});

function createFakeClient(
  data: unknown,
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    select(columns: string) {
      calls.push(["select", columns.replace(/\s+/g, " ").trim()]);
      return query;
    },
    async single() {
      calls.push(["single"]);
      return { data, error };
    },
  };

  return {
    calls,
    client: {
      from(table: string) {
        calls.push(["from", table]);
        return query;
      },
    },
  };
}
