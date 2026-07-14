import { describe, expect, it } from "vitest";

import { createMintEventsRepository } from "../services/mintEventsRepository";

describe("mint events repository", () => {
  it("reads the latest 20 non-deleted events for one asset", async () => {
    const fake = createEventsFake([{
      amount_usdt: "125.5",
      block_timestamp: "2026-07-10T09:00:00Z",
      id: "event-1",
      shares: "502",
      tx_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }]);

    const result = await createMintEventsRepository(fake.client)
      .fetchRecentEvents("asset-1");

    expect(fake.calls[0]).toEqual(["from", "mint_events"]);
    expect(fake.calls).toContainEqual(["eq", "asset_id", "asset-1"]);
    expect(fake.calls).toContainEqual(["eq", "is_deleted", false]);
    expect(fake.calls).toContainEqual(["order", "block_timestamp", { ascending: false }]);
    expect(fake.calls).toContainEqual(["limit", 20]);
    expect(result).toEqual({
      events: [{
        amountUsdt: "125.5",
        blockTimestamp: "2026-07-10T09:00:00Z",
        id: "event-1",
        shares: "502",
        txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }],
      warning: null,
    });
  });

  it("turns RLS or event query errors into a local unavailable result", async () => {
    const fake = createEventsFake([], { message: "RLS denied" });

    await expect(
      createMintEventsRepository(fake.client).fetchRecentEvents("asset-1"),
    ).resolves.toEqual({ events: [], warning: "events_unavailable" });
  });
});

function createEventsFake(
  data: unknown[],
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const response = { data, error };
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    limit(value: number) {
      calls.push(["limit", value]);
      return Promise.resolve(response);
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
