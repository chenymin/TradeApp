import { getAddress, isAddress } from "viem";

type InvestorWalletsResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type InvestorWalletsQuery = {
  eq(column: string, value: unknown): InvestorWalletsQuery;
  order(
    column: string,
    options: { ascending: boolean },
  ): PromiseLike<InvestorWalletsResponse>;
};

export type DashboardInvestorWalletsClient = {
  from(table: "investor_wallets"): {
    select(columns: string): InvestorWalletsQuery;
  };
};

export type DashboardInvestorWalletsRepository = {
  fetchActiveEthereumByInvestor(investorId: string): Promise<`0x${string}`[]>;
};

export function createDashboardInvestorWalletsRepository(
  client: DashboardInvestorWalletsClient,
): DashboardInvestorWalletsRepository {
  return {
    async fetchActiveEthereumByInvestor(investorId) {
      const response = await client
        .from("investor_wallets")
        .select("wallet_address, chain_type, status")
        .eq("investor_id", investorId)
        .eq("status", "active")
        .eq("chain_type", "ethereum")
        .order("wallet_address", { ascending: true });

      if (response.error) {
        throw new Error(
          `Unable to load investor wallets: ${response.error.message}`,
        );
      }

      const wallets = new Map<string, `0x${string}`>();
      for (const value of response.data ?? []) {
        const row = value as Record<string, unknown>;
        if (row.status !== "active" || row.chain_type !== "ethereum") continue;
        if (typeof row.wallet_address !== "string" || !isAddress(row.wallet_address)) {
          continue;
        }
        const address = getAddress(row.wallet_address);
        wallets.set(address.toLowerCase(), address);
      }
      return [...wallets.values()];
    },
  };
}
