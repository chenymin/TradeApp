import { describe, expect, it } from "vitest";

import { createCommissionReadRepository } from "../services/commissionReadRepository";

describe("commission read repository", () => {
  it("maps the complete summary and detail views with exact decimal totals", async () => {
    const operations: unknown[][] = [];
    const repository = createCommissionReadRepository(createClient({
      details: {
        data: [{
          asset_id: "asset-1",
          asset_name: "Artwork One",
          created_at: "2026-07-01T00:00:00Z",
          golden_bonus_settled: "0.6",
          golden_bonus_usdt: "0.5",
          id: "commission-1",
          kol_bonus_settled: "0.4",
          kol_bonus_usdt: "0.3",
          payout_id: "payout-1",
          payout_paid_at: null,
          payout_status: "pending_user_confirmation",
          payout_tx_hash: null,
          payout_user_confirmed_at: null,
          pending_usdt: "0.1",
          referred_display: "friend@example.com",
          referred_id: "friend-1",
          referrer_wallet: "0x1234",
          settled_usdt: "0.2",
          status: "pending_review",
          updated_at: "2026-07-15T00:00:00Z",
        }],
        error: null,
      },
      summary: {
        data: {
          disputed_total_usdt: "1.25",
          lifetime_total_usdt: "20.75",
          paid_total_usdt: "8.5",
          payment_pending_total_usdt: "3",
          referred_buyer_count: 2,
          referred_mint_total_usdt: "100",
          review_pending_total_usdt: "5",
          user_confirmation_pending_total_usdt: "3",
        },
        error: null,
      },
    }, operations));

    await expect(repository.fetchReadModel()).resolves.toEqual({
      details: [{
        assetId: "asset-1",
        assetName: "Artwork One",
        bonusTotalUsdt: "1.8",
        confirmTotalUsdt: "2.1",
        createdAt: "2026-07-01T00:00:00Z",
        goldenBonusSettled: "0.6",
        goldenBonusUsdt: "0.5",
        id: "commission-1",
        kolBonusSettled: "0.4",
        kolBonusUsdt: "0.3",
        payoutId: "payout-1",
        payoutPaidAt: null,
        payoutStatus: "pending_user_confirmation",
        payoutTxHash: null,
        payoutUserConfirmedAt: null,
        pendingUsdt: "0.1",
        referredDisplay: "friend@example.com",
        referredId: "friend-1",
        referrerWallet: "0x1234",
        settledUsdt: "0.2",
        standardTotalUsdt: "0.3",
        status: "pending_review",
        updatedAt: "2026-07-15T00:00:00Z",
      }],
      status: "ready",
      summary: {
        disputedTotalUsdt: "1.25",
        lifetimeTotalUsdt: "20.75",
        paidTotalUsdt: "8.5",
        paymentPendingTotalUsdt: "3",
        referredBuyerCount: 2,
        referredMintTotalUsdt: "100",
        reviewPendingTotalUsdt: "5",
        userConfirmationPendingTotalUsdt: "3",
      },
    });
    expect(operations).toEqual([
      ["from", "my_commission_summary"],
      ["select", "review_pending_total_usdt, user_confirmation_pending_total_usdt, payment_pending_total_usdt, paid_total_usdt, disputed_total_usdt, lifetime_total_usdt, referred_buyer_count, referred_mint_total_usdt"],
      ["maybeSingle"],
      ["from", "my_commission_details"],
      ["select", "id, asset_id, asset_name, referred_id, referred_display, pending_usdt, settled_usdt, kol_bonus_usdt, kol_bonus_settled, golden_bonus_usdt, golden_bonus_settled, status, payout_id, payout_status, payout_tx_hash, payout_user_confirmed_at, payout_paid_at, referrer_wallet, updated_at, created_at"],
      ["order", "updated_at", { ascending: false }],
    ]);
  });

  it("returns unavailable only when a read model view does not exist", async () => {
    const repository = createCommissionReadRepository(createClient({
      details: { data: [], error: null },
      summary: {
        data: null,
        error: { code: "PGRST205", message: "Could not find the table" },
      },
    }, []));

    await expect(repository.fetchReadModel()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("does not hide permission errors behind unavailable or empty data", async () => {
    const repository = createCommissionReadRepository(createClient({
      details: { data: [], error: null },
      summary: {
        data: null,
        error: { code: "42501", message: "permission denied" },
      },
    }, []));

    await expect(repository.fetchReadModel()).rejects.toThrow(
      "Unable to load commission read model: permission denied",
    );
  });

  it("maps an empty view result to explicit zero summary and empty details", async () => {
    const repository = createCommissionReadRepository(createClient({
      details: { data: [], error: null },
      summary: { data: null, error: null },
    }, []));

    await expect(repository.fetchReadModel()).resolves.toEqual({
      details: [],
      status: "ready",
      summary: {
        disputedTotalUsdt: "0",
        lifetimeTotalUsdt: "0",
        paidTotalUsdt: "0",
        paymentPendingTotalUsdt: "0",
        referredBuyerCount: 0,
        referredMintTotalUsdt: "0",
        reviewPendingTotalUsdt: "0",
        userConfirmationPendingTotalUsdt: "0",
      },
    });
  });
});

function createClient(
  responses: { details: unknown; summary: unknown },
  operations: unknown[][],
) {
  return {
    from(table: "my_commission_details" | "my_commission_summary") {
      operations.push(["from", table]);
      return {
        select(columns: string) {
          operations.push(["select", columns]);
          return {
            maybeSingle() {
              operations.push(["maybeSingle"]);
              return Promise.resolve(responses.summary);
            },
            order(column: string, options: unknown) {
              operations.push(["order", column, options]);
              return Promise.resolve(responses.details);
            },
          };
        },
      };
    },
  } as never;
}
