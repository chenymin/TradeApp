import { isAddress } from "viem";

import type { WalletSelectionOperation } from "../workflow/walletSelectionMachine";
import type { WalletSelectionOperationStorage } from "../workflow/walletSelectionWorkflow";

export const WALLET_SELECTION_OPERATION_STORAGE_KEY =
  "mytradeapp.wallet-selection.operation";

type RecoveryStorage = {
  deleteItemAsync(key: string): Promise<void>;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
};

export function createWalletSelectionOperationStorage({
  maxAgeMs = 24 * 60 * 60 * 1_000,
  now = Date.now,
  storage,
}: {
  maxAgeMs?: number;
  now?: () => number;
  storage: RecoveryStorage;
}): WalletSelectionOperationStorage {
  const clear = () => storage.deleteItemAsync(
    WALLET_SELECTION_OPERATION_STORAGE_KEY,
  );

  return {
    clear,
    async load() {
      const raw = await storage.getItemAsync(
        WALLET_SELECTION_OPERATION_STORAGE_KEY,
      );
      if (!raw) return null;

      const operation = parseOperation(raw);
      if (
        !operation ||
        operation.timestamp > now() ||
        now() - operation.timestamp > maxAgeMs
      ) {
        await clear();
        return null;
      }

      return operation;
    },
    save(operation) {
      return storage.setItemAsync(
        WALLET_SELECTION_OPERATION_STORAGE_KEY,
        JSON.stringify(operation),
      );
    },
  };
}

function parseOperation(raw: string): WalletSelectionOperation | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const target = value.target as Record<string, unknown> | null;

    if (
      (value.mode !== "bind" && value.mode !== "switch") ||
      typeof value.operationId !== "string" ||
      !value.operationId.trim() ||
      !isEvmAddress(value.previousAddress) ||
      !isStage(value.stage) ||
      typeof value.timestamp !== "number" ||
      !Number.isFinite(value.timestamp) ||
      !target ||
      !isEvmAddress(target.address) ||
      (target.kind !== "embedded" && target.kind !== "external") ||
      target.privyLinked !== true ||
      typeof target.providerLabel !== "string" ||
      !target.providerLabel.trim()
    ) {
      return null;
    }

    return {
      mode: value.mode,
      operationId: value.operationId,
      previousAddress: value.previousAddress.toLowerCase() as `0x${string}`,
      stage: value.stage,
      target: {
        address: target.address.toLowerCase() as `0x${string}`,
        kind: target.kind,
        privyLinked: true,
        providerLabel: target.providerLabel,
      },
      timestamp: value.timestamp,
    };
  } catch {
    return null;
  }
}

function isEvmAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && isAddress(value.toLowerCase());
}

function isStage(value: unknown): value is WalletSelectionOperation["stage"] {
  return value === "platform_syncing" ||
    value === "session_persisting" ||
    value === "session_sync_pending";
}
