import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import type {
  WalletAssetContract,
  WalletAssetContractRepository,
  WalletBalanceLoadResult,
  WalletBalanceRow,
} from "../domain/walletModels";
import {
  type WalletBalanceReader,
  unavailableNativeRow,
  unavailableTokenRow,
} from "./walletBalanceReader";

export type WalletBalanceLoader = (input: {
  address: `0x${string}`;
  chain: PublicChainConfig;
}) => Promise<WalletBalanceLoadResult>;

export function createWalletBalanceLoader({
  assetRepository,
  balanceReader,
}: {
  assetRepository: WalletAssetContractRepository;
  balanceReader: WalletBalanceReader;
}): WalletBalanceLoader {
  return async ({ address, chain }) => {
    let artDiscoveryStatus: WalletBalanceLoadResult["artDiscoveryStatus"] = "ready";
    let assets: WalletAssetContract[] = [];

    try {
      assets = await assetRepository.fetchByChain(chain.chainId);
    } catch {
      artDiscoveryStatus = "unavailable";
    }

    try {
      return {
        artDiscoveryStatus,
        rows: await balanceReader.read({ address, assets, chain }),
      };
    } catch {
      return {
        artDiscoveryStatus,
        rows: unavailableRows(chain, assets),
      };
    }
  };
}

function unavailableRows(
  chain: PublicChainConfig,
  assets: WalletAssetContract[],
): WalletBalanceRow[] {
  return [
    unavailableNativeRow(chain),
    unavailableTokenRow({
      address: chain.usdtAddress,
      id: `usdt:${chain.chainId}`,
      imageUrl: null,
      kind: "usdt",
      symbol: "USDT",
    }),
    ...assets.map((asset) => unavailableTokenRow({
      address: asset.address,
      id: asset.id,
      imageUrl: asset.imageUrl,
      kind: "art",
      symbol: asset.symbol,
    })),
  ];
}
