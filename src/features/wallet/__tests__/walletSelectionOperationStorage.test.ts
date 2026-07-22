import { describe, expect, it, vi } from "vitest";

import { createWalletSelectionOperationStorage } from "../services/walletSelectionOperationStorage";

describe("wallet selection operation storage", () => {
  it("persists only non-secret recovery metadata", async () => {
    const storage = secureStorage();
    const operations = createWalletSelectionOperationStorage({
      now: () => 1_000,
      storage,
    });
    const operation = validOperation();

    await operations.save(operation);
    await expect(operations.load()).resolves.toEqual(operation);

    const serialized = storage.setItemAsync.mock.calls[0]?.[1] ?? "";
    expect(serialized).not.toMatch(/token|jwt|session|authorization/i);
    expect(serialized).toContain("operation-1");
    expect(serialized).toContain(address(2));
  });

  it("clears malformed or expired recovery metadata", async () => {
    const malformedStorage = secureStorage("{not-json");
    const malformed = createWalletSelectionOperationStorage({
      now: () => 1_000,
      storage: malformedStorage,
    });
    await expect(malformed.load()).resolves.toBeNull();
    expect(malformedStorage.deleteItemAsync).toHaveBeenCalledOnce();

    const expiredStorage = secureStorage(JSON.stringify({
      ...validOperation(),
      timestamp: 1,
    }));
    const expired = createWalletSelectionOperationStorage({
      maxAgeMs: 100,
      now: () => 1_000,
      storage: expiredStorage,
    });
    await expect(expired.load()).resolves.toBeNull();
    expect(expiredStorage.deleteItemAsync).toHaveBeenCalledOnce();
  });

  it.each([
    ["session_persisting", "viewer_persisting"],
    ["session_sync_pending", "viewer_sync_pending"],
  ] as const)("normalizes legacy %s recovery metadata", async (legacy, current) => {
    const storage = secureStorage(JSON.stringify({
      ...validOperation(),
      stage: legacy,
    }));
    const operations = createWalletSelectionOperationStorage({
      now: () => 1_000,
      storage,
    });

    await expect(operations.load()).resolves.toMatchObject({ stage: current });
  });

  it("removes recovery metadata on clear", async () => {
    const storage = secureStorage();
    const operations = createWalletSelectionOperationStorage({ storage });

    await operations.clear();

    expect(storage.deleteItemAsync).toHaveBeenCalledOnce();
  });
});

function secureStorage(initial: string | null = null) {
  let current = initial;
  return {
    deleteItemAsync: vi.fn().mockImplementation(async () => {
      current = null;
    }),
    getItemAsync: vi.fn().mockImplementation(async () => current),
    setItemAsync: vi.fn().mockImplementation(async (_key: string, value: string) => {
      current = value;
    }),
  };
}

function validOperation() {
  return {
    mode: "bind" as const,
    operationId: "operation-1",
    previousAddress: address(1),
    stage: "platform_syncing" as const,
    target: {
      address: address(2),
      kind: "external" as const,
      privyLinked: true,
      providerLabel: "MetaMask",
    },
    timestamp: 1_000,
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
