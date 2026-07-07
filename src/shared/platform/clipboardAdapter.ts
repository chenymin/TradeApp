import * as Clipboard from "expo-clipboard";

import type { InviteClipboardAdapter } from "../../features/referral/workflow/inviteShareWorkflow";

export const expoClipboardAdapter: InviteClipboardAdapter = {
  async setString(value) {
    await Clipboard.setStringAsync(value);
  },
};
