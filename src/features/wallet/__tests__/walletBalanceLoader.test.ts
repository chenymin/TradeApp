import { describe, expect, it, vi } from "vitest";

import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import type {
  WalletAssetContract,
  WalletBalanceRow,
} from "../domain/walletModels";
import { createWalletBalanceLoader } from "../services/walletBalanceLoader";

describe("wallet balance loader", () => {
  it("keeps BNB and USDT when ART discovery fails", async () => {
    const assetRepository = {
      fetchByChain: vi.fn().mockRejectedValue(new Error("db unavailable")),
    };
    const balanceReader = { read: vi.fn().mockResolvedValue(baseRows()) };

    await expect(createWalletBalanceLoader({ assetRepository, balanceReader })({
      address: address(8),
      chain: CHAIN,
    })).resolves.toEqual({
      artDiscoveryStatus: "unavailable",
      rows: baseRows(),
    });
    expect(balanceReader.read).toHaveBeenCalledWith({
      address: address(8),
      assets: [],
      chain: CHAIN,
    });
  });

  it("passes discovered contracts to the chain reader", async () => {
    const assets = [asset("art-1", address(1), "ART")];
    const rows = [...baseRows(), unavailableArt(assets[0])];
    const assetRepository = { fetchByChain: vi.fn().mockResolvedValue(assets) };
    const balanceReader = { read: vi.fn().mockResolvedValue(rows) };

    await expect(createWalletBalanceLoader({ assetRepository, balanceReader })({
      address: address(8),
      chain: CHAIN,
    })).resolves.toEqual({ artDiscoveryStatus: "ready", rows });
    expect(assetRepository.fetchByChain).toHaveBeenCalledWith(97);
    expect(balanceReader.read).toHaveBeenCalledWith({
      address: address(8),
      assets,
      chain: CHAIN,
    });
  });

  it("returns unavailable rows instead of zero when the reader rejects", async () => {
    const assets = [asset("art-1", address(1), "ART")];
    const loader = createWalletBalanceLoader({
      assetRepository: { fetchByChain: vi.fn().mockResolvedValue(assets) },
      balanceReader: { read: vi.fn().mockRejectedValue(new Error("rpc down")) },
    });

    const result = await loader({ address: address(8), chain: CHAIN });

    expect(result).toEqual({
      artDiscoveryStatus: "ready",
      rows: [...baseRows(), unavailableArt(assets[0])],
    });
    expect(result.rows.every((row) => row.displayAmount === undefined)).toBe(true);
  });
});

function baseRows(): WalletBalanceRow[] {
  return [
    {
      contractAddress: null,
      id: "native:97",
      imageUrl: null,
      kind: "native",
      status: "unavailable",
      symbol: "BNB",
    },
    {
      contractAddress: CHAIN.usdtAddress,
      id: "usdt:97",
      imageUrl: null,
      kind: "usdt",
      status: "unavailable",
      symbol: "USDT",
    },
  ];
}

function unavailableArt(value: WalletAssetContract): WalletBalanceRow {
  return {
    contractAddress: value.address,
    id: value.id,
    imageUrl: value.imageUrl,
    kind: "art",
    status: "unavailable",
    symbol: value.symbol,
  };
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
