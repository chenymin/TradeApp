import { describe, expect, it, vi } from "vitest";

const supabaseFrom = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/supabase/client", () => ({
  supabase: { from: supabaseFrom },
}));

import {
  createDashboardIdentityClient,
  createDefaultDashboardCommissionLoader,
} from "../services/createDefaultDashboardServices";

describe("default Dashboard services", () => {
  it("creates the authenticated identity client at the exact Edge Function URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        country: "China",
        dateOfBirth: "2002-12-30",
        docNumber: "430181200212308817",
        docType: "Identity card",
        fullName: "Test User",
      }),
      ok: true,
      status: 200,
    } as unknown as Response);
    const client = createDashboardIdentityClient({
      fetch: fetchMock,
      supabaseUrl: "https://example.supabase.co",
    });

    await client.fetchDetails("access-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/kyc-applicant-details",
      expect.objectContaining({
        body: "{}",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
        method: "POST",
      }),
    );
  });

  it.each([
    "http://example.supabase.co",
    "not-a-url",
  ])("rejects unsafe Supabase URL %s before a request", (supabaseUrl) => {
    const fetchMock = vi.fn();

    expect(() => createDashboardIdentityClient({
      fetch: fetchMock,
      supabaseUrl,
    })).toThrow("Invalid Supabase URL for KYC identity services");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps commission reads disabled until the view authorization gate passes", async () => {
    const loader = createDefaultDashboardCommissionLoader();

    await expect(loader({
      isSessionReady: true,
      viewer: { email: null, id: "viewer-1", walletAddress: null },
    })).resolves.toEqual({ status: "unavailable" });
    expect(supabaseFrom).not.toHaveBeenCalled();
  });
});
