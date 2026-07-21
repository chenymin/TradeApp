import { getAddress, isAddress } from "viem";

import type { AuthViewer } from "../../auth/domain/authViewer";
import type {
  PrivyWalletMetadata,
  WalletIdentity,
  WalletIdentityItem,
  WalletKind,
  WalletSelectionAction,
} from "./walletModels";

export const EMPTY_PRIVY_WALLET_METADATA: PrivyWalletMetadata = {
  passkeyMfaEnabled: false,
  wallets: [],
};

type PrivyUserMetadataInput = {
  linked_accounts?: readonly unknown[];
  mfa_methods?: readonly unknown[];
} | null;

export function mapPrivyWalletMetadata(
  user: PrivyUserMetadataInput,
): PrivyWalletMetadata {
  if (!user) return EMPTY_PRIVY_WALLET_METADATA;

  return {
    passkeyMfaEnabled: (user.mfa_methods ?? []).some(
      (method) => readText(method, "type") === "passkey",
    ),
    wallets: (user.linked_accounts ?? []).flatMap((account) => {
      if (
        readText(account, "type") !== "wallet" ||
        readText(account, "chain_type") !== "ethereum"
      ) {
        return [];
      }

      const address = readText(account, "address");
      if (!address || !isAddress(address)) return [];

      const walletClientType = readText(account, "wallet_client_type");
      const embedded = readText(account, "connector_type") === "embedded" ||
        walletClientType === "privy";

      return [{
        address: getAddress(address),
        kind: embedded ? "embedded" as const : "external" as const,
        providerLabel: embedded ? "Privy" : walletClientType ?? "External wallet",
      }];
    }),
  };
}

export function mapWalletIdentity(
  viewer: AuthViewer | null,
  metadata: PrivyWalletMetadata,
): WalletIdentity | null {
  if (!viewer?.walletAddress || !isAddress(viewer.walletAddress)) return null;

  const activeAddress = getAddress(viewer.walletAddress);
  const wallets = dedupeWallets(metadata.wallets);
  const active = wallets.find((wallet) => sameAddress(wallet.address, activeAddress)) ?? {
    address: activeAddress,
    kind: "external" as const,
    privyLinked: false,
    providerLabel: "Verified wallet",
  };

  return {
    activeAddress,
    passkeyMfaEnabled: metadata.passkeyMfaEnabled,
    wallets: [
      {
        ...active,
        address: activeAddress,
        privyLinked: active.privyLinked,
        status: "active",
      },
      ...wallets
        .filter((wallet) => !sameAddress(wallet.address, activeAddress))
        .map((wallet) => ({
          ...wallet,
          address: getAddress(wallet.address),
          privyLinked: true,
          status: "linked" as const,
        })),
    ],
  };
}

export function getWalletSelectionAction(
  wallet: WalletIdentityItem,
  connectedExternalAddress?: string,
): WalletSelectionAction {
  if (wallet.status === "active") return "none";
  if (wallet.kind === "embedded") return "use";
  return connectedExternalAddress &&
      sameAddress(connectedExternalAddress, wallet.address)
    ? "use"
    : "connect";
}

function dedupeWallets(wallets: PrivyWalletMetadata["wallets"]): Array<{
  address: `0x${string}`;
  kind: WalletKind;
  privyLinked: true;
  providerLabel: string;
}> {
  const unique = new Map<string, {
    address: `0x${string}`;
    kind: WalletKind;
    privyLinked: true;
    providerLabel: string;
  }>();

  for (const wallet of wallets) {
    if (!isAddress(wallet.address)) continue;
    const address = getAddress(wallet.address);
    const key = address.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, { ...wallet, address, privyLinked: true });
    }
  }

  return [...unique.values()];
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function readText(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const field = (value as Record<string, unknown>)[key];
  if (typeof field !== "string") return null;
  return field.trim() || null;
}
