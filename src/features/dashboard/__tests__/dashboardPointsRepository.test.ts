import { describe, expect, it, vi } from "vitest";

import {
  createDashboardPointsLoader,
  createDashboardPointsRepository,
} from "../services/dashboardPointsRepository";

describe("dashboard points repository", () => {
  it("reads the latest 50 non-deleted viewer point transactions", async () => {
    const fake = createFakeClient([{
      amount: "-2.5",
      balance_after: "10.25",
      created_at: "2026-07-15T00:00:00.000Z",
      id: "point-1",
      point_type: "trading",
      source: "mint",
    }]);

    const rows = await createDashboardPointsRepository(fake.client)
      .fetchRecent("viewer-1");

    expect(fake.calls).toEqual([
      ["from", "point_transactions"],
      ["select", "id, point_type, amount, balance_after, source, created_at"],
      ["eq", "user_id", "viewer-1"],
      ["eq", "is_deleted", false],
      ["order", "created_at", { ascending: false }],
      ["limit", 50],
    ]);
    expect(rows).toEqual([{
      amount: "-2.5",
      balanceAfter: "10.25",
      createdAt: "2026-07-15T00:00:00.000Z",
      id: "point-1",
      pointType: "trading",
      source: "mint",
    }]);
  });

  it("guards private queries until viewer and session are ready", async () => {
    const repository = { fetchRecent: vi.fn() };
    const load = createDashboardPointsLoader(repository);

    await expect(load({ isSessionReady: false, viewer: viewer() })).resolves.toBeNull();
    await expect(load({ isSessionReady: true, viewer: null })).resolves.toBeNull();
    expect(repository.fetchRecent).not.toHaveBeenCalled();

    repository.fetchRecent.mockResolvedValue([]);
    await load({ isSessionReady: true, viewer: viewer() });
    expect(repository.fetchRecent).toHaveBeenCalledWith("viewer-1");
  });
});

function viewer() {
  return { email: null, id: "viewer-1", walletAddress: null };
}

function createFakeClient(data: unknown[], error: { message: string } | null = null) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    async limit(value: number) {
      calls.push(["limit", value]);
      return { data, error };
    },
    order(column: string, options: unknown) {
      calls.push(["order", column, options]);
      return query;
    },
    select(columns: string) {
      calls.push(["select", columns]);
      return query;
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
