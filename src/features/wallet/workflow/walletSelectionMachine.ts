import type { WalletKind } from "../domain/walletModels";

export type WalletSelectionTarget = {
  address: `0x${string}`;
  kind: WalletKind;
  privyLinked: boolean;
  providerLabel: string;
};

export type WalletSelectionOperationStage =
  | "platform_syncing"
  | "session_persisting"
  | "session_sync_pending";

export type WalletSelectionOperation = {
  mode: "bind" | "switch";
  operationId: string;
  previousAddress: `0x${string}`;
  stage: WalletSelectionOperationStage;
  target: WalletSelectionTarget;
  timestamp: number;
};

export type WalletSelectionState =
  | { status: "idle" }
  | {
      expectedAddress?: `0x${string}`;
      mode: "bind" | "switch";
      status: "connecting";
    }
  | { status: "binding"; target: WalletSelectionTarget }
  | { status: "confirming_switch"; target: WalletSelectionTarget }
  | { operation: WalletSelectionOperation; status: "platform_syncing" }
  | {
      error: string;
      operation?: WalletSelectionOperation;
      phase: "binding" | "connect" | "platform";
      status: "sync_error";
    }
  | { operation: WalletSelectionOperation; status: "session_persisting" }
  | { operation: WalletSelectionOperation; status: "session_sync_pending" }
  | {
      error: "wallet_owned_by_another_investor";
      operation: WalletSelectionOperation;
      status: "conflict";
    }
  | {
      error: string;
      operation?: WalletSelectionOperation;
      status: "consistency_error";
      target?: WalletSelectionTarget;
    }
  | { status: "complete"; target: WalletSelectionTarget };

export type WalletSelectionEvent =
  | { type: "bind_requested" }
  | { type: "connection_started"; expectedAddress?: `0x${string}`; mode: "bind" | "switch" }
  | { type: "binding_started"; target: WalletSelectionTarget }
  | { type: "switch_requested"; target: WalletSelectionTarget }
  | { type: "platform_started"; operation: WalletSelectionOperation }
  | { type: "platform_succeeded"; operation: WalletSelectionOperation }
  | { type: "platform_failed"; error: string; phase: "binding" | "connect" | "platform" }
  | { type: "platform_conflict"; error: "wallet_owned_by_another_investor" }
  | { type: "recovery_loaded"; operation: WalletSelectionOperation }
  | { type: "session_failed" }
  | { type: "session_persisted"; target: WalletSelectionTarget }
  | { type: "consistency_failed"; error: string; target?: WalletSelectionTarget }
  | { type: "reset" };

export const initialWalletSelectionState: WalletSelectionState = {
  status: "idle",
};

export function walletSelectionReducer(
  state: WalletSelectionState,
  event: WalletSelectionEvent,
): WalletSelectionState {
  switch (event.type) {
    case "bind_requested":
      return { mode: "bind", status: "connecting" };
    case "connection_started":
      return {
        ...(event.expectedAddress
          ? { expectedAddress: event.expectedAddress }
          : {}),
        mode: event.mode,
        status: "connecting",
      };
    case "binding_started":
      return { status: "binding", target: event.target };
    case "switch_requested":
      return { status: "confirming_switch", target: event.target };
    case "platform_started":
      return { operation: event.operation, status: "platform_syncing" };
    case "platform_succeeded":
      return { operation: event.operation, status: "session_persisting" };
    case "platform_failed":
      return {
        error: event.error,
        ...(hasOperation(state) ? { operation: state.operation } : {}),
        phase: event.phase,
        status: "sync_error",
      };
    case "platform_conflict":
      return hasOperation(state)
        ? { error: event.error, operation: state.operation, status: "conflict" }
        : { error: event.error, status: "consistency_error" };
    case "recovery_loaded":
      return event.operation.stage === "platform_syncing"
        ? {
            error: "operation_recovery_pending",
            operation: event.operation,
            phase: "platform",
            status: "sync_error",
          }
        : {
            operation: event.operation,
            status: "session_sync_pending",
          };
    case "session_failed":
      return hasOperation(state)
        ? { operation: state.operation, status: "session_sync_pending" }
        : { error: "operation_missing", status: "consistency_error" };
    case "session_persisted":
      return { status: "complete", target: event.target };
    case "consistency_failed":
      return {
        error: event.error,
        ...(hasOperation(state) ? { operation: state.operation } : {}),
        status: "consistency_error",
        ...(event.target ? { target: event.target } : {}),
      };
    case "reset":
      return initialWalletSelectionState;
  }
}

function hasOperation(
  state: WalletSelectionState,
): state is Extract<WalletSelectionState, { operation: WalletSelectionOperation }> {
  return "operation" in state;
}
