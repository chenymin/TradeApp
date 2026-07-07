import { describe, expect, it, vi } from "vitest";

import {
  RegisterUserError,
  registerUser,
} from "../services/registrationClient";

const endpoint = "https://example.supabase.co/functions/v1/register-user";

describe("registrationClient", () => {
  it("posts the access token and register-user body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true }));

    await registerUser({
      accessToken: "supabase-access-token",
      endpoint,
      fetch: fetchMock,
      payload: {
        referrerCode: "A3K9M2",
        selectedType: "investor",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer supabase-access-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referrer_code: "A3K9M2",
        selected_type: "investor",
      }),
    });
  });

  it.each([
    [400, "invalid_referrer_code", false],
    [401, "invalid_auth_token", false],
    [500, "internal_error", true],
  ] as const)("maps HTTP %s %s", async (status, code, retryable) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(status, { error: code }));

    await expect(
      registerUser({
        accessToken: "supabase-access-token",
        endpoint,
        fetch: fetchMock,
        payload: { selectedType: "investor" },
      }),
    ).rejects.toEqual(
      new RegisterUserError(code, {
        details: `HTTP ${status}: ${code}`,
        retryable,
      }),
    );
  });

  it("maps network failures to retryable errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      registerUser({
        accessToken: "supabase-access-token",
        endpoint,
        fetch: fetchMock,
        payload: { selectedType: "investor" },
      }),
    ).rejects.toEqual(new RegisterUserError("network_unavailable", { retryable: true }));
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
