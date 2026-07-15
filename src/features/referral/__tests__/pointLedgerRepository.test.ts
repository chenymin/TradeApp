import { describe, expect, it } from "vitest";

import { createPointLedgerRepository } from "../services/pointLedgerRepository";

describe("point ledger repository", () => {
  it("reads the latest 50 non-deleted viewer entries and preserves signed amounts", async () => {
    const operations: unknown[][] = [];
    const repository = createPointLedgerRepository(createClient({
      data: [{
        amount: "-2.25",
        balance_after: "10.5",
        created_at: "2026-07-15T00:00:00Z",
        id: "point-1",
        point_type: "task",
        source: "manual_adjustment",
      }],
      error: null,
    }, operations));

    await expect(repository.fetchRecent("viewer-1")).resolves.toEqual([{
      amount: "-2.25",
      balanceAfter: "10.5",
      createdAt: "2026-07-15T00:00:00Z",
      id: "point-1",
      pointType: "task",
      source: "manual_adjustment",
    }]);
    expect(operations).toEqual([
      ["from", "point_transactions"],
      ["select", "id, point_type, amount, balance_after, source, created_at"],
      ["eq", "user_id", "viewer-1"],
      ["eq", "is_deleted", false],
      ["order", "created_at", { ascending: false }],
      ["limit", 50],
    ]);
  });

  it("does not turn a ledger permission error into an empty list", async () => {
    const repository = createPointLedgerRepository(createClient({
      data: null,
      error: { message: "permission denied" },
    }, []));

    await expect(repository.fetchRecent("viewer-1")).rejects.toThrow(
      "Unable to load point ledger: permission denied",
    );
  });
});

function createClient(response: unknown, operations: unknown[][]) {
  const query = {
    eq(column: string, value: unknown) {
      operations.push(["eq", column, value]);
      return query;
    },
    limit(value: number) {
      operations.push(["limit", value]);
      return Promise.resolve(response);
    },
    order(column: string, options: unknown) {
      operations.push(["order", column, options]);
      return query;
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
