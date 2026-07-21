import { describe, expect, it, vi } from "vitest";

import {
  selectWalletForSession,
  WalletSelectClientError,
} from "../services/walletSelectClient";

const endpoint = "https://example.supabase.co/functions/v1/wallet-select";
const request = {
  endpoint,
  expectedPreviousAddress: "0x1111111111111111111111111111111111111111" as const,
  operationId: "11111111-1111-4111-8111-111111111111",
  privyToken: "privy-token",
  supabasePublicKey: "publishable-key",
  targetAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
};

describe("selectWalletForSession", () => {
  it("posts only the controlled wallet selection fields and parses the session", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, {
      access_token: "replacement-token",
      expires_in: 1800,
      operation_id: request.operationId,
      user: {
        email: "viewer@example.com",
        id: "viewer-1",
        walletAddress: request.targetAddress,
      },
    }));

    await expect(selectWalletForSession({
      ...request,
      fetcher,
      now: () => 1_800_000_000,
    })).resolves.toEqual({
      operationId: request.operationId,
      session: {
        accessToken: "replacement-token",
        expiresAt: 1_800_001_800,
      },
      viewer: {
        email: "viewer@example.com",
        id: "viewer-1",
        walletAddress: request.targetAddress,
      },
    });

    expect(fetcher).toHaveBeenCalledWith(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        apikey: request.supabasePublicKey,
        Authorization: `Bearer ${request.supabasePublicKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedPreviousAddress: request.expectedPreviousAddress,
        operationId: request.operationId,
        privyToken: request.privyToken,
        targetAddress: request.targetAddress,
      }),
    });
  });

  it.each([
    [401, "invalid_privy_token", "unauthorized", false],
    [409, "wallet_owned_by_another_investor", "wallet_owned_by_another_investor", false],
    [409, "stale_previous_wallet", "stale_previous_wallet", false],
    [503, "unavailable", "server_unavailable", true],
  ] as const)(
    "maps HTTP %s/%s to %s",
    async (status, serverError, code, retryable) => {
      const fetcher = vi.fn().mockResolvedValue(
        jsonResponse(status, { error: serverError }),
      );

      await expect(
        selectWalletForSession({ ...request, fetcher }),
      ).rejects.toEqual(
        new WalletSelectClientError(code, {
          retryable,
          serverCode: serverError,
        }),
      );
    },
  );

  it("rejects a mismatched operation response", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, {
      access_token: "replacement-token",
      expires_in: 1800,
      operation_id: "22222222-2222-4222-8222-222222222222",
      user: {
        email: null,
        id: "viewer-1",
        walletAddress: request.targetAddress,
      },
    }));

    await expect(
      selectWalletForSession({ ...request, fetcher }),
    ).rejects.toMatchObject({ code: "invalid_response", retryable: false });
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
