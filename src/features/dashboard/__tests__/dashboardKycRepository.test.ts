import { describe, expect, it } from "vitest";

import { createDashboardKycRepository } from "../services/dashboardKycRepository";

describe("dashboard KYC repository", () => {
  it("reads only the latest non-deleted application for the viewer", async () => {
    const fake = createFakeClient({
      notes: null,
      reason_code: null,
      reviewed_at: "2026-07-14T00:00:00.000Z",
      status: "approved",
    });

    const result = await createDashboardKycRepository(fake.client)
      .fetchLatest("viewer-1");

    expect(fake.calls).toEqual([
      ["from", "kyc_applications"],
      ["select", "status, reviewed_at, reason_code, notes"],
      ["eq", "investor_id", "viewer-1"],
      ["eq", "is_deleted", false],
      ["order", "created_at", { ascending: false }],
      ["limit", 1],
      ["maybeSingle"],
    ]);
    expect(result).toEqual({
      approved: true,
      notes: null,
      reasonCode: null,
      reviewedAt: "2026-07-14T00:00:00.000Z",
      status: "approved",
    });
  });

  it("returns not started for no row and propagates RLS errors", async () => {
    await expect(createDashboardKycRepository(createFakeClient(null).client)
      .fetchLatest("viewer-1")).resolves.toEqual({
      approved: false,
      notes: null,
      reasonCode: null,
      reviewedAt: null,
      status: null,
    });

    await expect(createDashboardKycRepository(
      createFakeClient(null, { message: "permission denied" }).client,
    ).fetchLatest("viewer-1")).rejects.toThrow(
      "Unable to load dashboard KYC status: permission denied",
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
    limit(value: number) {
      calls.push(["limit", value]);
      return query;
    },
    async maybeSingle() {
      calls.push(["maybeSingle"]);
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
