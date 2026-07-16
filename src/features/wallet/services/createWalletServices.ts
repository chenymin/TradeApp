import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import type { WalletDataDependencies } from "../domain/walletModels";
import type {
  WalletClipboardAdapter,
  WalletTextShareAdapter,
} from "../workflow/walletReceiveActions";
import {
  createWalletAssetContractRepository,
  type WalletAssetContractRepositoryClient,
} from "./walletAssetContractRepository";
import { createWalletBalanceLoader } from "./walletBalanceLoader";
import {
  createWalletBalanceReader,
  type WalletBalanceReadClient,
} from "./walletBalanceReader";
import type { WalletImageShareAdapter } from "./walletImageShareAdapter";

export function createWalletServices({
  chain,
  clipboard,
  createClient,
  imageShare,
  share,
  supabaseClient,
}: {
  chain: PublicChainConfig;
  clipboard: WalletClipboardAdapter;
  createClient(chainId: 56 | 97): WalletBalanceReadClient;
  imageShare: WalletImageShareAdapter;
  share: WalletTextShareAdapter;
  supabaseClient: WalletAssetContractRepositoryClient;
}): WalletDataDependencies {
  const loadBalances = createWalletBalanceLoader({
    assetRepository: createWalletAssetContractRepository(supabaseClient),
    balanceReader: createWalletBalanceReader(createClient(chain.chainId)),
  });

  return {
    clipboard,
    imageShare,
    async loadBalances({ address }) {
      return loadBalances({ address, chain });
    },
    textShare: share,
  };
}
