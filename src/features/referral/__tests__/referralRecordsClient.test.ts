import { describe, expect, it, vi } from "vitest";

import {
  ReferralRecordsError,
  createReferralRecordsClient,
} from "../services/referralRecordsClient";

const endpoint = "https://example.supabase.co/functions/v1/get-my-referrals";

describe("referral records client", () => {
  it("authenticates with the viewer token and maps referral records", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
      records: [{
        created_at: "2026-07-15T00:00:00Z",
        id: "referral-1",
        referral_status: "waiting_kyc",
        referred_email: "friend@example.com",
        referred_id: "friend-1",
        referred_tier: "C",
        referred_user_type: "collector",
        referred_wallet_address: "0x1234",
        total_points_awarded: "25",
      }],
    }));
    const client = createReferralRecordsClient({ endpoint, fetch: fetchMock });

    await expect(client.fetchRecords("access-token")).resolves.toEqual([{
      createdAt: "2026-07-15T00:00:00Z",
      id: "referral-1",
      referredEmail: "friend@example.com",
      referredId: "friend-1",
      referredTier: "C",
      referredUserType: "collector",
      referredWalletAddress: "0x1234",
      status: "waiting_kyc",
      totalPointsAwarded: 25,
    }]);
    expect(fetchMock).toHaveBeenCalledWith(endpoint, {
      headers: { Authorization: "Bearer access-token" },
      method: "GET",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("referrer_id");
  });

  it("returns a real empty result only for an explicit empty records array", async () => {
    const client = createReferralRecordsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse(200, { records: [] })),
    });

    await expect(client.fetchRecords("access-token")).resolves.toEqual([]);
  });

  it.each([
    [401, "unauthorized", false],
    [403, "forbidden", false],
    [500, "server_unavailable", true],
  ] as const)("maps HTTP %s to %s", async (status, code, retryable) => {
    const client = createReferralRecordsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse(status, { error: code })),
    });

    await expect(client.fetchRecords("access-token")).rejects.toEqual(
      new ReferralRecordsError(code, { retryable }),
    );
  });

  it("maps transport failures without exposing the access token", async () => {
    const client = createReferralRecordsClient({
      endpoint,
      fetch: vi.fn().mockRejectedValue(new TypeError("Network request failed")),
    });

    await expect(client.fetchRecords("secret-access-token")).rejects.toEqual(
      new ReferralRecordsError("network_unavailable", { retryable: true }),
    );
  });

  it("rejects a malformed success response instead of treating it as empty", async () => {
    const client = createReferralRecordsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse(200, {})),
    });

    await expect(client.fetchRecords("access-token")).rejects.toEqual(
      new ReferralRecordsError("invalid_response", { retryable: false }),
    );
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
