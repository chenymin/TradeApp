import { describe, expect, it } from "vitest";

import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import type { WalletAssetContract } from "../domain/walletModels";
import {
  createWalletBalanceReader,
  type WalletBalanceReadClient,
  type WalletMulticallResult,
} from "../services/walletBalanceReader";

describe("wallet balance reader", () => {
  it("keeps base rows, uses contract decimals, and filters ready zero ART", async () => {
    const result = await createWalletBalanceReader(client({
      native: 2_000_000_000_000_000_000n,
      tokens: [
        success(6), success(0n),
        success(8), success(123_456_789n),
        success(18), success(0n),
      ],
    })).read({
      address: address(8),
      assets: [
        asset("art-1", address(1), "ART8"),
        asset("art-2", address(2), "ZERO"),
      ],
      chain: CHAIN,
    });

    expect(result.map(({ displayAmount, status, symbol }) => ({
      displayAmount,
      status,
      symbol,
    }))).toEqual([
      { displayAmount: "2", status: "ready", symbol: "BNB" },
      { displayAmount: "0", status: "ready", symbol: "USDT" },
      { displayAmount: "1.23456789", status: "ready", symbol: "ART8" },
    ]);
  });

  it("does not turn failed reads into zero", async () => {
    const result = await createWalletBalanceReader(client({
      nativeError: new Error("rpc unavailable"),
      tokens: [failure(), failure(), failure(), failure()],
    })).read({
      address: address(8),
      assets: [asset("art-1", address(1), "ART")],
      chain: CHAIN,
    });

    expect(result).toEqual([
      expect.objectContaining({ status: "unavailable", symbol: "BNB" }),
      expect.objectContaining({ status: "unavailable", symbol: "USDT" }),
      expect.objectContaining({ status: "unavailable", symbol: "ART" }),
    ]);
    expect(result.every((row) => row.displayAmount === undefined)).toBe(true);
  });

  it("keeps successful native balance when multicall rejects", async () => {
    const result = await createWalletBalanceReader(client({
      multicallError: new Error("batch unavailable"),
      native: 1n,
    })).read({
      address: address(8),
      assets: [asset("art-1", address(1), "ART")],
      chain: CHAIN,
    });

    expect(result[0]).toMatchObject({
      displayAmount: "0.000000000000000001",
      status: "ready",
    });
    expect(result.slice(1).every((row) => row.status === "unavailable"))
      .toBe(true);
  });

  it("formats large bigint values without floating point conversion", async () => {
    const result = await createWalletBalanceReader(client({
      native: 90_071_992_547_409_930_000_000_000_000_000n,
      tokens: [success(6), success(9_007_199_254_740_993n)],
    })).read({ address: address(8), assets: [], chain: CHAIN });

    expect(result[0].displayAmount).toBe("90071992547409.93");
    expect(result[1].displayAmount).toBe("9007199254.740993");
  });
});

function client({
  multicallError,
  native = 0n,
  nativeError,
  tokens = [],
}: {
  multicallError?: Error;
  native?: bigint;
  nativeError?: Error;
  tokens?: WalletMulticallResult[];
}): WalletBalanceReadClient {
  return {
    async getBalance() {
      if (nativeError) throw nativeError;
      return native;
    },
    async multicall() {
      if (multicallError) throw multicallError;
      return tokens;
    },
  };
}

function success(result: bigint | number): WalletMulticallResult {
  return { result, status: "success" };
}

function failure(): WalletMulticallResult {
  return { status: "failure" };
}

function asset(
  id: string,
  contractAddress: `0x${string}`,
  symbol: string,
): WalletAssetContract {
  return { address: contractAddress, id, imageUrl: null, symbol };
}

function address(lastDigit: number): `0x${string}` {
  return `0x${String(lastDigit).padStart(40, "0")}`;
}

const CHAIN: PublicChainConfig = {
  chainId: 97,
  explorerOrigin: "https://testnet.bscscan.com",
  name: "BNB Smart Chain Testnet",
  nativeDecimals: 18,
  nativeSymbol: "BNB",
  usdtAddress: address(7),
};
