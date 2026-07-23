import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import { createDashboardInvestorWalletsRepository } from "../services/dashboardInvestorWalletsRepository";

describe("dashboard investor wallets repository", () => {
  it("returns unique active Ethereum wallets owned by the investor", async () => {
    const lower = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const checksum = getAddress(lower);
    const fake = createFakeClient([
      { chain_type: "ethereum", status: "active", wallet_address: lower },
      { chain_type: "ethereum", status: "active", wallet_address: checksum },
      { chain_type: "ethereum", status: "active", wallet_address: "invalid" },
      { chain_type: "solana", status: "active", wallet_address: "solana-wallet" },
      { chain_type: "ethereum", status: "removed", wallet_address: address(9) },
    ]);

    const wallets = await createDashboardInvestorWalletsRepository(fake.client)
      .fetchActiveEthereumByInvestor("viewer-1");

    expect(fake.calls).toEqual([
      ["from", "investor_wallets"],
      ["select", "wallet_address, chain_type, status"],
      ["eq", "investor_id", "viewer-1"],
      ["eq", "status", "active"],
      ["eq", "chain_type", "ethereum"],
      ["order", "wallet_address", { ascending: true }],
    ]);
    expect(wallets).toEqual([checksum]);
  });

  it("propagates wallet query errors instead of returning an empty account", async () => {
    const repository = createDashboardInvestorWalletsRepository(
      createFakeClient(null, { message: "permission denied" }).client,
    );

    await expect(repository.fetchActiveEthereumByInvestor("viewer-1"))
      .rejects.toThrow("Unable to load investor wallets: permission denied");
  });
});

function createFakeClient(
  data: unknown[] | null,
  error: { message: string } | null = null,
) {
  const calls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    async order(column: string, options: unknown) {
      calls.push(["order", column, options]);
      return { data, error };
    },
    select(columns: string) {
      calls.push(["select", columns]);
      return query;
    },
  };

  return {
    calls,
    client: {
      from(table: string) {
        calls.push(["from", table]);
        return query;
      },
    },
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${lastDigit.toString(16).padStart(40, "0")}`;
}
