import { describe, expect, it, vi } from "vitest";

import {
  KycIdentityDetailsError,
  createKycIdentityDetailsClient,
} from "../services/kycIdentityDetailsClient";

const endpoint = "https://example.supabase.co/functions/v1/kyc-applicant-details";

describe("KYC identity details client", () => {
  it("posts an empty body with only the current bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {
      country: "CHN",
      dateOfBirth: "2002-12-30",
      docNumber: "430181200212308817",
      docType: "ID_CARD",
      fullName: "Test User",
    }));
    const client = createKycIdentityDetailsClient({ endpoint, fetch: fetchMock });

    await expect(client.fetchDetails("secret-token")).resolves.toEqual({
      country: "CHN",
      dateOfBirth: "2002-12-30",
      docNumber: "430181200212308817",
      docType: "ID_CARD",
      fullName: "Test User",
    });
    expect(fetchMock).toHaveBeenCalledWith(endpoint, {
      body: "{}",
      headers: {
        Authorization: "Bearer secret-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/user_?id|viewer/i);
  });

  it("normalizes blank nullable fields", async () => {
    const client = createKycIdentityDetailsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse(200, {
        country: " ",
        dateOfBirth: null,
        docNumber: null,
        docType: " passport ",
        fullName: " Test User ",
      })),
    });

    await expect(client.fetchDetails("secret-token")).resolves.toEqual({
      country: null,
      dateOfBirth: null,
      docNumber: null,
      docType: "passport",
      fullName: "Test User",
    });
  });

  it.each([
    [401, "unauthorized", false],
    [403, "forbidden", false],
    [500, "server_unavailable", true],
  ] as const)("maps HTTP %s to %s", async (status, code, retryable) => {
    const client = createKycIdentityDetailsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse(status, { error: code })),
    });

    await expect(client.fetchDetails("secret-token")).rejects.toEqual(
      new KycIdentityDetailsError(code, { retryable }),
    );
  });

  it("maps transport failures without exposing the access token", async () => {
    const client = createKycIdentityDetailsClient({
      endpoint,
      fetch: vi.fn().mockRejectedValue(new TypeError("Network request failed")),
    });

    await expect(client.fetchDetails("secret-token")).rejects.toEqual(
      new KycIdentityDetailsError("network_unavailable", { retryable: true }),
    );
  });

  it("rejects missing tokens before making a request", async () => {
    const fetchMock = vi.fn();
    const client = createKycIdentityDetailsClient({ endpoint, fetch: fetchMock });

    await expect(client.fetchDetails(" ")).rejects.toEqual(
      new KycIdentityDetailsError("unauthorized", { retryable: false }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    {},
    {
      country: "CHN",
      dateOfBirth: null,
      docNumber: null,
      docType: null,
      fullName: 123,
    },
  ])("rejects malformed success payload %#", async (payload) => {
    const client = createKycIdentityDetailsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse(200, payload)),
    });

    await expect(client.fetchDetails("secret-token")).rejects.toEqual(
      new KycIdentityDetailsError("invalid_response", { retryable: false }),
    );
  });

  it("rejects non-JSON success responses", async () => {
    const client = createKycIdentityDetailsClient({
      endpoint,
      fetch: vi.fn().mockResolvedValue({
        json: async () => { throw new SyntaxError("invalid JSON"); },
        ok: true,
        status: 200,
      } as Response),
    });

    await expect(client.fetchDetails("secret-token")).rejects.toEqual(
      new KycIdentityDetailsError("invalid_response", { retryable: false }),
    );
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}
