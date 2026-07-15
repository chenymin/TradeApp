import { describe, expect, it } from "vitest";

import { createRewardsProfileRepository } from "../services/rewardsProfileRepository";

describe("rewards profile repository", () => {
  it("reads only the authenticated viewer profile and normalizes point fields", async () => {
    const operations: unknown[][] = [];
    const repository = createRewardsProfileRepository(createClient({
      data: {
        id: "viewer-1",
        invite_code: "INVITE-7",
        referral_points: "12",
        reputation_points: null,
        task_points: "invalid",
        tier: "A",
        total_points: "34.5",
        trading_points: 22.25,
        user_type: "investor",
      },
      error: null,
    }, operations));

    await expect(repository.fetchProfile("viewer-1")).resolves.toEqual({
      id: "viewer-1",
      inviteCode: "INVITE-7",
      referralPoints: 12,
      reputationPoints: 0,
      taskPoints: 0,
      tier: "A",
      totalPoints: 34.5,
      tradingPoints: 22.25,
      userType: "investor",
    });
    expect(operations).toEqual([
      ["from", "user_profiles"],
      ["select", "id, user_type, tier, referral_points, trading_points, reputation_points, task_points, total_points, invite_code"],
      ["eq", "id", "viewer-1"],
      ["single"],
    ]);
  });

  it("does not turn a profile query error into empty rewards", async () => {
    const repository = createRewardsProfileRepository(createClient({
      data: null,
      error: { message: "permission denied" },
    }, []));

    await expect(repository.fetchProfile("viewer-1")).rejects.toThrow(
      "Unable to load rewards profile: permission denied",
    );
  });
});

function createClient(response: unknown, operations: unknown[][]) {
  const query = {
    eq(column: string, value: unknown) {
      operations.push(["eq", column, value]);
      return query;
    },
    single() {
      operations.push(["single"]);
      return Promise.resolve(response);
    },
  };
  return {
    from(table: string) {
      operations.push(["from", table]);
      return {
        select(columns: string) {
          operations.push(["select", columns]);
          return query;
        },
      };
    },
  } as never;
}
