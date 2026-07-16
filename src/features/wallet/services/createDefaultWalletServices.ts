import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import { getPublicChainClient } from "../../../lib/chain/publicChainRegistry";
import { supabase } from "../../../lib/supabase/client";
import { expoClipboardAdapter } from "../../../shared/platform/clipboardAdapter";
import { reactNativeWalletTextShareAdapter } from "../../../shared/platform/shareAdapter";
import type { WalletDataDependencies } from "../domain/walletModels";
import type { WalletAssetContractRepositoryClient } from "./walletAssetContractRepository";
import type { WalletBalanceReadClient } from "./walletBalanceReader";
import {
  createDefaultWalletImageShareAdapter,
  type WalletImageShareAdapter,
} from "./walletImageShareAdapter";
import { createWalletServices } from "./createWalletServices";

export function createDefaultWalletServices(
  chain: PublicChainConfig,
): WalletDataDependencies {
  return createWalletServices({
    chain,
    clipboard: {
      async setString(value) {
        await expoClipboardAdapter.setString(value);
      },
    },
    createClient: (chainId) => (
      getPublicChainClient<WalletBalanceReadClient>(chainId)
    ),
    imageShare: createDefaultWalletImageShareAdapter(),
    share: reactNativeWalletTextShareAdapter,
    supabaseClient: supabase as unknown as WalletAssetContractRepositoryClient,
  });
}
