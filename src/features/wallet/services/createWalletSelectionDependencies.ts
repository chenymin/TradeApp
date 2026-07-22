import type { AlertButton, AlertOptions } from "react-native";

import type { AuthViewer } from "../../auth/domain/authViewer";
import type { PrivyWalletLinkAdapter } from "./privyWalletLinkAdapter";
import type { ConnectedExternalWallet } from "./reownWalletConnectionAdapter";
import type {
  WalletSelectRequest,
  WalletSelectResult,
  WalletSelectionDependencies,
} from "../workflow/walletSelectionWorkflow";
import type { WalletSelectionTarget } from "../workflow/walletSelectionMachine";

type AlertAdapter = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ): void;
};

type WalletConnectionAdapter = {
  connect(expectedAddress?: `0x${string}`): Promise<ConnectedExternalWallet>;
};

export type CreateWalletSelectionDependenciesInput = {
  alert: AlertAdapter;
  connection: WalletConnectionAdapter;
  getAccessToken(): Promise<string | null>;
  newOperationId(): string;
  now(): number;
  operationStorage: WalletSelectionDependencies["operationStorage"];
  privyLink: PrivyWalletLinkAdapter;
  publicWebOrigin: string;
  replaceViewer(viewer: AuthViewer): Promise<boolean>;
  selectWallet(input: WalletSelectRequest): Promise<WalletSelectResult>;
};

export class WalletSelectionDependencyError extends Error {
  readonly code: "privy_session_unavailable";

  constructor(code: "privy_session_unavailable") {
    super(code);
    this.name = "WalletSelectionDependencyError";
    this.code = code;
  }
}

export function createWalletSelectionDependencies({
  alert,
  connection,
  getAccessToken,
  newOperationId,
  now,
  operationStorage,
  privyLink,
  publicWebOrigin,
  replaceViewer,
  selectWallet,
}: CreateWalletSelectionDependenciesInput): WalletSelectionDependencies {
  return {
    confirmSwitch: (target) => confirmWalletSwitch(alert, target),
    connect: (expectedAddress) => connection.connect(expectedAddress),
    async getPrivyAccessToken() {
      const token = await getAccessToken();
      if (!token) {
        throw new WalletSelectionDependencyError("privy_session_unavailable");
      }
      return token;
    },
    link: (wallet) => privyLink.link(wallet, publicWebOrigin),
    newOperationId,
    now,
    operationStorage,
    persistViewer: replaceViewer,
    select: selectWallet,
  };
}

function confirmWalletSwitch(
  alert: AlertAdapter,
  target: WalletSelectionTarget,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      resolve(confirmed);
    };

    alert.alert(
      "Switch active wallet?",
      `${target.providerLabel} ${shortAddress(target.address)} will become your active wallet.`,
      [
        { onPress: () => finish(false), style: "cancel", text: "Cancel" },
        { onPress: () => finish(true), text: "Use wallet" },
      ],
      { cancelable: true, onDismiss: () => finish(false) },
    );
  });
}

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}
