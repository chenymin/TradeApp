import { Share } from "react-native";

import type { InviteShareAdapter } from "../../features/referral/workflow/inviteShareWorkflow";

export const reactNativeShareAdapter: InviteShareAdapter = {
  async share(input) {
    await Share.share(input);
  },
};
