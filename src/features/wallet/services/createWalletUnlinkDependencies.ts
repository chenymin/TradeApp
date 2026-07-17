import {
  Alert,
  type AlertButton,
  type AlertOptions,
} from "react-native";

import type { WalletUnlinkDependencies } from "../workflow/walletUnlinkWorkflow";

type AlertAdapter = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ): void;
};

export function createWalletUnlinkDependencies({
  alert = Alert,
  refreshSession,
  unlinkWallet,
}: {
  alert?: AlertAdapter;
  refreshSession: () => Promise<boolean>;
  unlinkWallet: (input: { address: string }) => Promise<unknown>;
}): WalletUnlinkDependencies {
  return {
    confirm: (input) => confirmWalletUnlink(alert, input),
    refreshSession,
    unlink: async (address) => {
      await unlinkWallet({ address });
    },
  };
}

function confirmWalletUnlink(
  alert: AlertAdapter,
  input: { address: `0x${string}`; providerLabel: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    alert.alert(
      "Unlink wallet?",
      `${input.providerLabel} ${shortAddress(input.address)} will no longer be linked to this account.`,
      [
        {
          onPress: () => resolve(false),
          style: "cancel",
          text: "Cancel",
        },
        {
          onPress: () => resolve(true),
          style: "destructive",
          text: "Unlink",
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      },
    );
  });
}

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}
