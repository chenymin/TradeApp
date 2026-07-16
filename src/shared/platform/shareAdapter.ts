import { Share } from "react-native";

import type { InviteShareAdapter } from "../../features/referral/workflow/inviteShareWorkflow";
import type { WalletTextShareAdapter } from "../../features/wallet/workflow/walletReceiveActions";

export const reactNativeShareAdapter: InviteShareAdapter = {
  async share(input) {
    await Share.share(input);
  },
};

export const reactNativeWalletTextShareAdapter: WalletTextShareAdapter = {
  async share(input) {
    const result = await Share.share(input);
    return result.action === Share.dismissedAction ? "cancelled" : "shared";
  },
};
