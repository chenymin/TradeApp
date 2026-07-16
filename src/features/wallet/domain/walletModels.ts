export type WalletKind = "embedded" | "external";

export type WalletLinkStatus = "active" | "linked";

export type PrivyWalletMetadata = {
  passkeyMfaEnabled: boolean;
  wallets: Array<{
    address: string;
    kind: WalletKind;
    providerLabel: string;
  }>;
};

export type WalletIdentity = {
  activeAddress: `0x${string}`;
  passkeyMfaEnabled: boolean;
  wallets: Array<{
    address: `0x${string}`;
    kind: WalletKind;
    providerLabel: string;
    status: WalletLinkStatus;
  }>;
};
