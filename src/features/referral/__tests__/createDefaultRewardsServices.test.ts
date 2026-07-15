import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/supabase/client", () => ({ supabase: {} }));

import { createRewardsServices } from "../services/createDefaultRewardsServices";

describe("createRewardsServices", () => {
  it("gets the current session token and fixes the referral endpoint", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: "session-access-token" } },
      error: null,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ records: [] }),
      ok: true,
      status: 200,
    });
    const services = createRewardsServices({
      client: { auth: { getSession } } as never,
      fetch: fetchMock as never,
      supabaseUrl: "https://example.supabase.co",
    });

    await expect(services.fetchAccessToken()).resolves.toBe("session-access-token");
    await expect(
      services.referralRecordsClient.fetchRecords("session-access-token"),
    ).resolves.toEqual([]);

    expect(getSession).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/get-my-referrals",
      {
        headers: { Authorization: "Bearer session-access-token" },
        method: "GET",
      },
    );
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("user_id");
  });

  it("returns null when no authenticated Supabase session exists", async () => {
    const services = createRewardsServices({
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
        },
      } as never,
      fetch: vi.fn() as never,
      supabaseUrl: "https://example.supabase.co",
    });

    await expect(services.fetchAccessToken()).resolves.toBeNull();
  });
});
