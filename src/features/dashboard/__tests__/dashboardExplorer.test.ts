import { describe, expect, it } from "vitest";

import { getDashboardTransactionUrl } from "../domain/dashboardExplorer";

describe("dashboard transaction explorer", () => {
  const txHash = `0x${"a".repeat(64)}`;

  it("uses the explorer for each supported asset chain", () => {
    expect(getDashboardTransactionUrl(txHash, 56)).toBe(
      `https://bscscan.com/tx/${txHash}`,
    );
    expect(getDashboardTransactionUrl(txHash, 97)).toBe(
      `https://testnet.bscscan.com/tx/${txHash}`,
    );
  });

  it("rejects unsupported chains and invalid hashes", () => {
    expect(getDashboardTransactionUrl(txHash, 1)).toBeNull();
    expect(getDashboardTransactionUrl("not-a-hash", 97)).toBeNull();
    expect(getDashboardTransactionUrl(txHash, null)).toBeNull();
  });
});
