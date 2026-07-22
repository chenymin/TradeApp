import { describe, expect, it } from "vitest";

import {
  initialWalletSelectionState,
  walletSelectionReducer,
  type WalletSelectionOperation,
} from "../workflow/walletSelectionMachine";

const operation: WalletSelectionOperation = {
  mode: "switch",
  operationId: "operation-1",
  previousAddress: address(1),
  stage: "platform_syncing",
  target: {
    address: address(2),
    kind: "external",
    privyLinked: true,
    providerLabel: "MetaMask",
  },
  timestamp: 100,
};

describe("walletSelectionReducer", () => {
  it("moves a confirmed switch through platform and Viewer persistence", () => {
    const confirming = walletSelectionReducer(initialWalletSelectionState, {
      type: "switch_requested",
      target: operation.target,
    });
    const syncing = walletSelectionReducer(confirming, {
      type: "platform_started",
      operation,
    });
    const persisting = walletSelectionReducer(syncing, {
      type: "platform_succeeded",
      operation: { ...operation, stage: "viewer_persisting" },
    });
    const complete = walletSelectionReducer(persisting, {
      type: "viewer_persisted",
      target: operation.target,
    });

    expect(confirming.status).toBe("confirming_switch");
    expect(syncing.status).toBe("platform_syncing");
    expect(persisting.status).toBe("viewer_persisting");
    expect(complete).toEqual({ status: "complete", target: operation.target });
  });

  it("retains the operation for platform and Viewer recovery", () => {
    const syncing = { status: "platform_syncing", operation } as const;

    expect(walletSelectionReducer(syncing, {
      type: "platform_failed",
      error: "server_unavailable",
      phase: "platform",
    })).toEqual({
      error: "server_unavailable",
      operation,
      phase: "platform",
      status: "sync_error",
    });

    expect(walletSelectionReducer(syncing, {
      type: "platform_conflict",
      error: "wallet_owned_by_another_investor",
    })).toEqual({
      error: "wallet_owned_by_another_investor",
      operation,
      status: "conflict",
    });

    expect(walletSelectionReducer({
      status: "viewer_persisting",
      operation: { ...operation, stage: "viewer_persisting" },
    }, { type: "viewer_failed" })).toMatchObject({
      status: "viewer_sync_pending",
      operation: { operationId: "operation-1" },
    });
  });
});

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
