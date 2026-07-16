import { describe, expect, it, vi } from "vitest";

import { getPublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import {
  createWalletServices,
} from "../services/createWalletServices";
import type { WalletBalanceReadClient } from "../services/walletBalanceReader";
import type { WalletAssetContractRepositoryClient } from "../services/walletAssetContractRepository";

describe("wallet service composition", () => {
  it("composes read-only services for the configured public chain", async () => {
    const calls: unknown[][] = [];
    const createClient = vi.fn().mockReturnValue(readClient());
    const clipboard = { setString: vi.fn().mockResolvedValue(undefined) };
    const imageShare = { share: vi.fn().mockResolvedValue("shared") };
    const textShare = { share: vi.fn().mockResolvedValue("shared") };
    const services = createWalletServices({
      chain: getPublicChainConfig(97),
      clipboard,
      createClient,
      imageShare,
      share: textShare,
      supabaseClient: assetClient(calls),
    });

    const result = await services.loadBalances({
      address: address(8),
      chain: getPublicChainConfig(56),
    });

    expect(createClient).toHaveBeenCalledWith(97);
    expect(calls).toContainEqual(["eq", "chain_id", 97]);
    expect(result.rows.map((row) => [row.symbol, row.displayAmount]))
      .toEqual([["BNB", "0"], ["USDT", "0"]]);
    expect(services.clipboard).toBe(clipboard);
    expect(services.imageShare).toBe(imageShare);
    expect(services.textShare).toBe(textShare);
  });
});

function readClient(): WalletBalanceReadClient {
  return {
    async getBalance() {
      return 0n;
    },
    async multicall() {
      return [
        { result: 6, status: "success" },
        { result: 0n, status: "success" },
      ];
    },
  };
}

function assetClient(calls: unknown[][]): WalletAssetContractRepositoryClient {
  const query = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return query;
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
  };
  return {
    from(table: "art_assets") {
      calls.push(["from", table]);
      return {
        select(columns: string) {
          calls.push(["select", columns]);
          return query as never;
        },
      };
    },
  };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}
