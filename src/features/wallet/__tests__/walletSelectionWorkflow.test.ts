import { describe, expect, it, vi } from "vitest";

import type { AuthExchangeResult } from "../../auth/services/authExchangeClient";
import type { ConnectedExternalWallet } from "../services/reownWalletConnectionAdapter";
import {
  createWalletSelectionWorkflow,
  type WalletSelectionDependencies,
} from "../workflow/walletSelectionWorkflow";

describe("wallet selection workflow", () => {
  it("binds a new wallet and immediately makes it active", async () => {
    const dependencies = fakeDependencies();
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(workflow.bindNew(address(1))).resolves.toMatchObject({
      status: "complete",
      target: { address: address(2) },
    });

    expect(dependencies.confirmSwitch).not.toHaveBeenCalled();
    expect(dependencies.link).toHaveBeenCalledOnce();
    expect(dependencies.select).toHaveBeenCalledWith({
      expectedPreviousAddress: address(1),
      operationId: "operation-1",
      privyToken: "privy-token",
      targetAddress: address(2),
    });
    expect(dependencies.persistSession).toHaveBeenCalledOnce();
    expect(dependencies.operationStorage.clear).toHaveBeenCalledOnce();
  });

  it("does not connect or select when an existing switch is cancelled", async () => {
    const dependencies = fakeDependencies();
    dependencies.confirmSwitch.mockResolvedValue(false);
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(
      workflow.selectExisting(target(), address(1)),
    ).resolves.toEqual({ status: "idle" });

    expect(dependencies.connect).not.toHaveBeenCalled();
    expect(dependencies.select).not.toHaveBeenCalled();
  });

  it("does not call the platform after an external connection mismatch", async () => {
    const dependencies = fakeDependencies();
    dependencies.connect.mockRejectedValue({ code: "address_mismatch" });
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(
      workflow.selectExisting(target(), address(1)),
    ).resolves.toMatchObject({
      error: "address_mismatch",
      status: "consistency_error",
    });
    expect(dependencies.select).not.toHaveBeenCalled();
  });

  it("retries an uncertain platform failure with the same operation", async () => {
    const dependencies = fakeDependencies();
    dependencies.select
      .mockRejectedValueOnce({ code: "server_unavailable", retryable: true })
      .mockResolvedValueOnce(selectionResult());
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(workflow.bindNew(address(1))).resolves.toMatchObject({
      operation: { operationId: "operation-1" },
      status: "sync_error",
    });
    await expect(workflow.retry()).resolves.toMatchObject({ status: "complete" });

    expect(dependencies.link).toHaveBeenCalledOnce();
    expect(dependencies.select).toHaveBeenCalledTimes(2);
    expect(dependencies.select.mock.calls[0]).toEqual(
      dependencies.select.mock.calls[1],
    );
    expect(dependencies.newOperationId).toHaveBeenCalledOnce();
  });

  it("retries only cached session persistence after platform success", async () => {
    const dependencies = fakeDependencies();
    dependencies.persistSession
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(workflow.bindNew(address(1))).resolves.toMatchObject({
      status: "session_sync_pending",
    });
    await expect(workflow.retry()).resolves.toMatchObject({ status: "complete" });

    expect(dependencies.link).toHaveBeenCalledOnce();
    expect(dependencies.select).toHaveBeenCalledOnce();
    expect(dependencies.persistSession).toHaveBeenCalledTimes(2);
  });

  it("restores a pending operation without reconnecting or linking again", async () => {
    const dependencies = fakeDependencies();
    dependencies.operationStorage.load.mockResolvedValue({
      mode: "bind",
      operationId: "operation-1",
      previousAddress: address(1),
      stage: "session_sync_pending",
      target: target(),
      timestamp: 90,
    });
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(workflow.restore()).resolves.toMatchObject({
      operation: { operationId: "operation-1" },
      status: "session_sync_pending",
    });
    await expect(workflow.retry()).resolves.toMatchObject({ status: "complete" });

    expect(dependencies.connect).not.toHaveBeenCalled();
    expect(dependencies.link).not.toHaveBeenCalled();
    expect(dependencies.newOperationId).not.toHaveBeenCalled();
    expect(dependencies.select).toHaveBeenCalledWith({
      expectedPreviousAddress: address(1),
      operationId: "operation-1",
      privyToken: "privy-token",
      targetAddress: address(2),
    });
  });

  it("surfaces a cross-account conflict without unlinking", async () => {
    const dependencies = fakeDependencies();
    dependencies.select.mockRejectedValue({
      code: "wallet_owned_by_another_investor",
      retryable: false,
    });
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(workflow.bindNew(address(1))).resolves.toMatchObject({
      error: "wallet_owned_by_another_investor",
      status: "conflict",
    });
    expect(dependencies.link).toHaveBeenCalledOnce();
    expect(dependencies.operationStorage.clear).not.toHaveBeenCalled();
  });

  it("surfaces recovery storage failure after platform success", async () => {
    const dependencies = fakeDependencies();
    dependencies.operationStorage.save
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("storage unavailable"));
    const workflow = createWalletSelectionWorkflow(dependencies);

    await expect(workflow.bindNew(address(1))).resolves.toMatchObject({
      error: "operation_storage_failed",
      status: "consistency_error",
      target: { address: address(2) },
    });
    expect(dependencies.persistSession).not.toHaveBeenCalled();
  });

  it("rejects a concurrent wallet mutation", async () => {
    let resolveConnect: ((wallet: ConnectedExternalWallet) => void) | undefined;
    const dependencies = fakeDependencies();
    dependencies.connect.mockReturnValue(new Promise((resolve) => {
      resolveConnect = resolve;
    }));
    const workflow = createWalletSelectionWorkflow(dependencies);

    const first = workflow.bindNew(address(1));
    await Promise.resolve();
    await expect(workflow.bindNew(address(1))).resolves.toMatchObject({
      status: "connecting",
    });
    resolveConnect?.(connectedWallet());
    await first;

    expect(dependencies.connect).toHaveBeenCalledOnce();
  });
});

function fakeDependencies() {
  const result = selectionResult();

  return {
    confirmSwitch: vi.fn().mockResolvedValue(true),
    connect: vi.fn().mockResolvedValue(connectedWallet()),
    getPrivyAccessToken: vi.fn().mockResolvedValue("privy-token"),
    link: vi.fn().mockResolvedValue(undefined),
    newOperationId: vi.fn().mockReturnValue("operation-1"),
    now: vi.fn().mockReturnValue(100),
    operationStorage: {
      clear: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    },
    persistSession: vi.fn().mockResolvedValue(true),
    select: vi.fn().mockResolvedValue(result),
  } satisfies WalletSelectionDependencies;
}

function connectedWallet(): ConnectedExternalWallet {
  return {
    address: address(2),
    chainId: "eip155:97",
    connectorType: "wallet_connect",
    providerLabel: "MetaMask",
    signMessage: vi.fn().mockResolvedValue("0xsigned"),
  };
}

function target() {
  return {
    address: address(2),
    kind: "external" as const,
    privyLinked: true,
    providerLabel: "MetaMask",
  };
}

function selectionResult(): AuthExchangeResult & { operationId: string } {
  return {
    operationId: "operation-1",
    session: { accessToken: "replacement-token" },
    viewer: {
      email: null,
      id: "viewer-1",
      walletAddress: address(2),
    },
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
