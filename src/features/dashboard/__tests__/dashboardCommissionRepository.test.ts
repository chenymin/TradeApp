import { describe, expect, it, vi } from "vitest";

import {
  createDashboardCommissionLoader,
  createDashboardCommissionRepository,
} from "../services/dashboardCommissionRepository";

describe("dashboard commission repository", () => {
  it("maps the confirmed commission summary view contract", async () => {
    const repository = createDashboardCommissionRepository(createFakeClient({
      disputed_total_usdt: "1.25",
      lifetime_total_usdt: "12.5",
      paid_total_usdt: "5",
      payment_pending_total_usdt: "2",
      referred_buyer_count: 3,
      referred_mint_total_usdt: "100",
      review_pending_total_usdt: "3.25",
      user_confirmation_pending_total_usdt: "1",
    }).client);

    await expect(repository.fetchSummary()).resolves.toEqual({
      status: "ready",
      summary: {
        disputedTotalUsdt: "1.25",
        lifetimeTotalUsdt: "12.5",
        paidTotalUsdt: "5",
        paymentPendingTotalUsdt: "2",
        referredBuyerCount: 3,
        referredMintTotalUsdt: "100",
        reviewPendingTotalUsdt: "3.25",
        userConfirmationPendingTotalUsdt: "1",
      },
    });
  });

  it("marks a missing read model unavailable but propagates unrelated errors", async () => {
    await expect(createDashboardCommissionRepository(createFakeClient(
      null,
      { code: "PGRST205", message: "Could not find the table" },
    ).client).fetchSummary()).resolves.toEqual({ status: "unavailable" });

    await expect(createDashboardCommissionRepository(createFakeClient(
      null,
      { code: "42501", message: "permission denied" },
    ).client).fetchSummary()).rejects.toThrow(
      "Unable to load dashboard commission summary: permission denied",
    );
  });

  it("does not query the view before authenticated viewer state is ready", async () => {
    const repository = { fetchSummary: vi.fn() };
    const load = createDashboardCommissionLoader(repository);

    await expect(load({ isSessionReady: false, viewer: viewer() })).resolves.toBeNull();
    await expect(load({ isSessionReady: true, viewer: null })).resolves.toBeNull();
    expect(repository.fetchSummary).not.toHaveBeenCalled();
  });
});

function viewer() {
  return { email: null, id: "viewer-1", walletAddress: null };
}

function createFakeClient(
  data: unknown,
  error: { code?: string; message: string } | null = null,
) {
  return {
    client: {
      from() {
        return {
          select() {
            return {
              async maybeSingle() {
                return { data, error };
              },
            };
          },
        };
      },
    },
  };
}
