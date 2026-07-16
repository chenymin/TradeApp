import { describe, expect, it, vi } from "vitest";

import { createWalletImageShareAdapter } from "../services/walletImageShareAdapter";

describe("wallet image share adapter", () => {
  it("removes the temporary PNG after a successful share", async () => {
    const io = createIo();

    await expect(createWalletImageShareAdapter(io).share(target()))
      .resolves.toBe("shared");

    expect(io.shareFile).toHaveBeenCalledWith("file:///tmp/wallet.png");
    expect(io.deleteFile).toHaveBeenCalledWith("file:///tmp/wallet.png");
  });

  it("removes the temporary PNG after share failure", async () => {
    const io = createIo({
      shareFile: vi.fn().mockRejectedValue(new Error("share failed")),
    });

    await expect(createWalletImageShareAdapter(io).share(target()))
      .resolves.toBe("unavailable");
    expect(io.deleteFile).toHaveBeenCalledWith("file:///tmp/wallet.png");
  });

  it("does not attempt cleanup when capture fails before a URI exists", async () => {
    const io = createIo({
      capture: vi.fn().mockRejectedValue(new Error("capture failed")),
    });

    await expect(createWalletImageShareAdapter(io).share(target()))
      .resolves.toBe("unavailable");
    expect(io.deleteFile).not.toHaveBeenCalled();
  });

  it("does not capture when native sharing is unavailable", async () => {
    const io = createIo({
      isSharingAvailable: vi.fn().mockResolvedValue(false),
    });

    await expect(createWalletImageShareAdapter(io).share(target()))
      .resolves.toBe("unavailable");
    expect(io.capture).not.toHaveBeenCalled();
  });

  it("keeps a successful result when best-effort cleanup fails", async () => {
    const io = createIo({
      deleteFile: vi.fn().mockRejectedValue(new Error("cleanup failed")),
    });

    await expect(createWalletImageShareAdapter(io).share(target()))
      .resolves.toBe("shared");
  });
});

function target() {
  return { current: {} };
}

function createIo(overrides: Record<string, unknown> = {}) {
  return {
    capture: vi.fn().mockResolvedValue("file:///tmp/wallet.png"),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    isSharingAvailable: vi.fn().mockResolvedValue(true),
    shareFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
