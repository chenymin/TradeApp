import { describe, expect, it, vi } from "vitest";

import {
  AuthExchangeError,
  exchangePrivyTokenForSession,
} from "../services/authExchangeClient";

const endpoint = "https://example.supabase.co/functions/v1/wallet-login";

describe("exchangePrivyTokenForSession", () => {
  it("posts only the Privy token in the deployed wallet-login contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        user: { id: "app-user-1" },
        session: {
          access_token: "supabase-access-token",
          refresh_token: "supabase-refresh-token",
          expires_at: 1_800_000_000,
        },
      }),
    );

    const result = await exchangePrivyTokenForSession({
      endpoint,
      fetch: fetchMock,
      privyAccessToken: "privy-token",
    });

    expect(result).toEqual({
      user: { id: "app-user-1" },
      session: {
        accessToken: "supabase-access-token",
        refreshToken: "supabase-refresh-token",
        expiresAt: 1_800_000_000,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ privyToken: "privy-token" }),
    });
  });

  it("does not send client identity fields in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        user: { id: "app-user-1" },
        session: { access_token: "supabase-access-token" },
      }),
    );

    await exchangePrivyTokenForSession({
      endpoint,
      fetch: fetchMock,
      privyAccessToken: "privy-token",
    });

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(request?.body as string)).toEqual({ privyToken: "privy-token" });
    expect(request?.body).not.toContain("wallet");
    expect(request?.body).not.toContain("email");
    expect(request?.body).not.toContain("userId");
  });

  it("accepts the deployed wallet-login success response shape", async () => {
    const nowSeconds = 1_800_000_000;
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        access_token: "supabase-access-token",
        expires_in: 1_800,
        user_status: "new",
        user: { id: "app-user-1" },
      }),
    );

    const result = await exchangePrivyTokenForSession({
      endpoint,
      fetch: fetchMock,
      now: () => nowSeconds,
      privyAccessToken: "privy-token",
    });

    expect(result).toEqual({
      user: { id: "app-user-1" },
      userStatus: "new",
      session: {
        accessToken: "supabase-access-token",
        expiresAt: nowSeconds + 1_800,
      },
    });
  });

  it.each([
    [401, "unauthorized"],
    [403, "account_disabled"],
    [503, "server_unavailable"],
  ] as const)("maps HTTP %s to %s", async (status, code) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(status, { error: code }));

    await expect(
      exchangePrivyTokenForSession({
        endpoint,
        fetch: fetchMock,
        privyAccessToken: "privy-token",
      }),
    ).rejects.toMatchObject({
      code,
      details: `HTTP ${status}: ${code}`,
      retryable: status >= 500,
    });
  });

  it("preserves safe HTTP status details for unmapped exchange failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(404, { error: "not_found", message: "Function not found" }),
    );

    await expect(
      exchangePrivyTokenForSession({
        endpoint,
        fetch: fetchMock,
        privyAccessToken: "privy-token",
      }),
    ).rejects.toMatchObject({
      code: "exchange_failed",
      details: "HTTP 404: not_found: Function not found",
      retryable: false,
    });
  });

  it("maps network failures to retryable network errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Network request failed"));

    await expect(
      exchangePrivyTokenForSession({
        endpoint,
        fetch: fetchMock,
        privyAccessToken: "privy-token",
      }),
    ).rejects.toEqual(new AuthExchangeError("network_unavailable", { retryable: true }));
  });

  it("rejects malformed success responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { session: {} }));

    await expect(
      exchangePrivyTokenForSession({
        endpoint,
        fetch: fetchMock,
        privyAccessToken: "privy-token",
      }),
    ).rejects.toEqual(new AuthExchangeError("invalid_response", { retryable: false }));
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
