import type { AuthViewer } from "../../auth/domain/authViewer";
import type { ConnectedExternalWallet } from "../services/reownWalletConnectionAdapter";
import {
  initialWalletSelectionState,
  walletSelectionReducer,
  type WalletSelectionOperation,
  type WalletSelectionState,
  type WalletSelectionTarget,
} from "./walletSelectionMachine";

export type WalletSelectRequest = {
  expectedPreviousAddress: `0x${string}`;
  operationId: string;
  privyToken: string;
  targetAddress: `0x${string}`;
};

export type WalletSelectResult = {
  idempotent: boolean;
  operationId: string;
  viewer: AuthViewer;
};

export type WalletSelectionOperationStorage = {
  clear(): Promise<void>;
  load(): Promise<WalletSelectionOperation | null>;
  save(operation: WalletSelectionOperation): Promise<void>;
};

export type WalletSelectionDependencies = {
  confirmSwitch(target: WalletSelectionTarget): Promise<boolean>;
  connect(expectedAddress?: `0x${string}`): Promise<ConnectedExternalWallet>;
  getPrivyAccessToken(): Promise<string>;
  link(wallet: ConnectedExternalWallet): Promise<void>;
  newOperationId(): string;
  now(): number;
  operationStorage: WalletSelectionOperationStorage;
  persistViewer(viewer: AuthViewer): Promise<boolean>;
  select(input: WalletSelectRequest): Promise<WalletSelectResult>;
};

export type WalletSelectionRuntimeDependencies = {
  connectedExternalAddress?: `0x${string}`;
  workflow: WalletSelectionDependencies;
};

type RetryIntent =
  | { mode: "bind"; previousAddress: `0x${string}` }
  | {
      mode: "switch";
      previousAddress: `0x${string}`;
      target: WalletSelectionTarget;
    };

export function createWalletSelectionWorkflow(
  dependencies: WalletSelectionDependencies,
) {
  let state: WalletSelectionState = initialWalletSelectionState;
  let inFlight = false;
  let cachedSelection: WalletSelectResult | null = null;
  let retryIntent: RetryIntent | null = null;
  const listeners = new Set<(next: WalletSelectionState) => void>();

  const update = (event: Parameters<typeof walletSelectionReducer>[1]) => {
    state = walletSelectionReducer(state, event);
    listeners.forEach((listener) => listener(state));
    return state;
  };

  const persistSelection = async (
    operation: WalletSelectionOperation,
    selection: WalletSelectResult,
  ): Promise<WalletSelectionState> => {
    cachedSelection = selection;
    const viewerOperation = { ...operation, stage: "viewer_persisting" as const };
    try {
      await dependencies.operationStorage.save(viewerOperation);
    } catch {
      cachedSelection = null;
      return update({
        type: "consistency_failed",
        error: "operation_storage_failed",
        target: operation.target,
      });
    }
    update({ type: "platform_succeeded", operation: viewerOperation });

    let persisted = false;
    try {
      persisted = await dependencies.persistViewer(selection.viewer);
    } catch {
      persisted = false;
    }

    if (!persisted) {
      const pending = { ...viewerOperation, stage: "viewer_sync_pending" as const };
      try {
        await dependencies.operationStorage.save(pending);
      } catch {
        cachedSelection = null;
        return update({
          type: "consistency_failed",
          error: "operation_storage_failed",
          target: operation.target,
        });
      }
      update({ type: "viewer_failed" });
      if (state.status === "viewer_sync_pending") {
        state = { ...state, operation: pending };
        listeners.forEach((listener) => listener(state));
      }
      return state;
    }

    try {
      await dependencies.operationStorage.clear();
    } catch {
      return update({
        type: "consistency_failed",
        error: "operation_storage_failed",
        target: operation.target,
      });
    }
    cachedSelection = null;
    retryIntent = null;
    return update({ type: "viewer_persisted", target: operation.target });
  };

  const syncPlatform = async (
    operation: WalletSelectionOperation,
  ): Promise<WalletSelectionState> => {
    try {
      await dependencies.operationStorage.save(operation);
    } catch {
      return update({
        type: "consistency_failed",
        error: "operation_storage_failed",
        target: operation.target,
      });
    }
    update({ type: "platform_started", operation });

    try {
      const privyToken = await dependencies.getPrivyAccessToken();
      const selection = await dependencies.select({
        expectedPreviousAddress: operation.previousAddress,
        operationId: operation.operationId,
        privyToken,
        targetAddress: operation.target.address,
      });

      if (
        selection.operationId !== operation.operationId ||
        selection.viewer.walletAddress?.toLowerCase() !==
          operation.target.address.toLowerCase()
      ) {
        return update({
          type: "consistency_failed",
          error: "wallet_state_inconsistent",
          target: operation.target,
        });
      }

      return persistSelection(operation, selection);
    } catch (error) {
      const code = errorCode(error);
      if (code === "wallet_owned_by_another_investor") {
        return update({
          type: "platform_conflict",
          error: "wallet_owned_by_another_investor",
        });
      }
      return update({ type: "platform_failed", error: code, phase: "platform" });
    }
  };

  const bindNew = async (
    previousAddress: `0x${string}`,
  ): Promise<WalletSelectionState> => {
    if (inFlight) return state;
    inFlight = true;
    retryIntent = { mode: "bind", previousAddress };
    update({ type: "bind_requested" });

    try {
      let wallet: ConnectedExternalWallet;
      try {
        wallet = await dependencies.connect();
      } catch (error) {
        const code = errorCode(error);
        return code === "address_mismatch"
          ? update({ type: "consistency_failed", error: code })
          : update({ type: "platform_failed", error: code, phase: "connect" });
      }

      const target = toTarget(wallet);
      update({ type: "binding_started", target });
      try {
        await dependencies.link(wallet);
      } catch (error) {
        return update({
          type: "platform_failed",
          error: errorCode(error),
          phase: "binding",
        });
      }

      return syncPlatform(newOperation("bind", previousAddress, target));
    } finally {
      inFlight = false;
    }
  };

  const selectExisting = async (
    target: WalletSelectionTarget,
    previousAddress: `0x${string}`,
  ): Promise<WalletSelectionState> => {
    if (inFlight) return state;
    inFlight = true;
    retryIntent = { mode: "switch", previousAddress, target };
    update({ type: "switch_requested", target });

    try {
      if (!await dependencies.confirmSwitch(target)) {
        retryIntent = null;
        return update({ type: "reset" });
      }

      if (target.kind === "external") {
        update({
          type: "connection_started",
          expectedAddress: target.address,
          mode: "switch",
        });
        try {
          await dependencies.connect(target.address);
        } catch (error) {
          const code = errorCode(error);
          return code === "address_mismatch"
            ? update({ type: "consistency_failed", error: code, target })
            : update({ type: "platform_failed", error: code, phase: "connect" });
        }
      }

      return syncPlatform(newOperation("switch", previousAddress, target));
    } finally {
      inFlight = false;
    }
  };

  const retry = async (): Promise<WalletSelectionState> => {
    if (inFlight) return state;

    if (state.status === "viewer_sync_pending" && cachedSelection) {
      inFlight = true;
      try {
        return await persistSelection(state.operation, cachedSelection);
      } finally {
        inFlight = false;
      }
    }

    if (state.status === "viewer_sync_pending") {
      inFlight = true;
      try {
        return await syncPlatform({
          ...state.operation,
          stage: "platform_syncing",
        });
      } finally {
        inFlight = false;
      }
    }

    if ((state.status === "sync_error" || state.status === "conflict") && state.operation) {
      inFlight = true;
      try {
        return await syncPlatform({
          ...state.operation,
          stage: "platform_syncing",
        });
      } finally {
        inFlight = false;
      }
    }

    const intent = retryIntent;
    if (!intent) return state;
    update({ type: "reset" });
    return intent.mode === "bind"
      ? bindNew(intent.previousAddress)
      : selectExisting(intent.target, intent.previousAddress);
  };

  const newOperation = (
    mode: "bind" | "switch",
    previousAddress: `0x${string}`,
    target: WalletSelectionTarget,
  ): WalletSelectionOperation => ({
    mode,
    operationId: dependencies.newOperationId(),
    previousAddress,
    stage: "platform_syncing",
    target,
    timestamp: dependencies.now(),
  });

  const restore = async (): Promise<WalletSelectionState> => {
    if (inFlight) return state;
    inFlight = true;
    try {
      const operation = await dependencies.operationStorage.load();
      return operation
        ? update({ type: "recovery_loaded", operation })
        : state;
    } catch {
      return update({
        type: "consistency_failed",
        error: "operation_storage_failed",
      });
    } finally {
      inFlight = false;
    }
  };

  return {
    bindNew,
    getState: () => state,
    reset: () => update({ type: "reset" }),
    restore,
    retry,
    selectExisting,
    subscribe(listener: (next: WalletSelectionState) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function toTarget(wallet: ConnectedExternalWallet): WalletSelectionTarget {
  return {
    address: wallet.address,
    kind: "external",
    privyLinked: true,
    providerLabel: wallet.providerLabel,
  };
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code) return code;
  }
  return "wallet_selection_failed";
}
