import { describe, expect, it } from "vitest";

import { resolveAssetDetailActionState } from "../domain/assetDetailActionState";
import type { AssetDetailActionInput } from "../domain/assetDetailModels";

function createInput(
  overrides: Partial<AssetDetailActionInput> = {},
): AssetDetailActionInput {
  return {
    isLoggedIn: true,
    kycApproved: true,
    sale: {
      canTrustForPurchase: true,
      chainStatus: "ready",
      displayStatus: "active",
      source: "chain",
    },
    soldPercent: 20,
    whitelisted: true,
    ...overrides,
  };
}

describe("asset detail action state", () => {
  it("verifies the sale while the chain read is loading", () => {
    expect(resolveAssetDetailActionState(createInput({
      sale: {
        canTrustForPurchase: false,
        chainStatus: "loading",
        displayStatus: "active",
        source: "database_fallback",
      },
    }))).toBe("verifying_sale_status");
  });

  it.each(["error", "unsupported"] as const)(
    "blocks purchase when the chain state is %s",
    (chainStatus) => {
      expect(resolveAssetDetailActionState(createInput({
        sale: {
          canTrustForPurchase: false,
          chainStatus,
          displayStatus: "active",
          source: chainStatus === "unsupported" ? "unsupported" : "database_fallback",
        },
      }))).toBe("sale_status_unavailable");
    },
  );

  it("never enables purchase from a database fallback", () => {
    expect(resolveAssetDetailActionState(createInput({
      sale: {
        canTrustForPurchase: false,
        chainStatus: "error",
        displayStatus: "active",
        source: "database_fallback",
      },
    }))).toBe("sale_status_unavailable");
  });

  it("marks a fully subscribed trusted sale as sold out", () => {
    expect(resolveAssetDetailActionState(createInput({ soldPercent: 100 }))).toBe("sold_out");
  });

  it("routes a completed trusted sale to the market", () => {
    expect(resolveAssetDetailActionState(createInput({
      sale: {
        canTrustForPurchase: true,
        chainStatus: "ready",
        displayStatus: "completed",
        source: "chain",
      },
    }))).toBe("sale_closed");
  });

  it("requires login before an eligible active sale can open", () => {
    expect(resolveAssetDetailActionState(createInput({ isLoggedIn: false }))).toBe("connect_required");
  });

  it("requires KYC when a trusted decision says it is incomplete", () => {
    expect(resolveAssetDetailActionState(createInput({ kycApproved: false }))).toBe("kyc_required");
  });

  it.each([
    { kycApproved: "unknown" as const },
    { whitelisted: "unknown" as const },
  ])("keeps unknown eligibility read-only", (overrides) => {
    expect(resolveAssetDetailActionState(createInput(overrides))).toBe("read_only");
  });

  it("blocks a user who is not whitelisted", () => {
    expect(resolveAssetDetailActionState(createInput({ whitelisted: false }))).toBe("not_eligible");
  });

  it("shows a trusted upcoming sale as not started", () => {
    expect(resolveAssetDetailActionState(createInput({
      sale: {
        canTrustForPurchase: true,
        chainStatus: "ready",
        displayStatus: "upcoming",
        source: "chain",
      },
    }))).toBe("not_started");
  });

  it("opens only a trusted active sale for an eligible user", () => {
    expect(resolveAssetDetailActionState(createInput())).toBe("sale_open");
  });

  it("keeps a trusted paused sale read-only", () => {
    expect(resolveAssetDetailActionState(createInput({
      sale: {
        canTrustForPurchase: true,
        chainStatus: "ready",
        displayStatus: "paused",
        source: "chain",
      },
    }))).toBe("read_only");
  });
});
