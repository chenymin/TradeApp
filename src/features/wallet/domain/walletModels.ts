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

export type WalletAssetContract = {
  address: `0x${string}`;
  id: string;
  imageUrl: string | null;
  symbol: string;
};

export type WalletAssetContractRepository = {
  fetchByChain(chainId: 56 | 97): Promise<WalletAssetContract[]>;
};

export type WalletBalanceRow = {
  contractAddress: `0x${string}` | null;
  displayAmount?: string;
  id: string;
  imageUrl: string | null;
  kind: "native" | "usdt" | "art";
  status: "ready" | "unavailable";
  symbol: string;
};

export type WalletBalanceLoadResult = {
  artDiscoveryStatus: "ready" | "unavailable";
  rows: WalletBalanceRow[];
};

export type WalletDataDependencies = {
  clipboard: {
    setString(value: string): Promise<void>;
  };
  imageShare: {
    share(target: { current: unknown }): Promise<"shared" | "unavailable">;
  };
  loadBalances(input: {
    address: `0x${string}`;
    chain: PublicChainConfig;
  }): Promise<WalletBalanceLoadResult>;
  textShare: {
    share(input: {
      message: string;
      title: string;
    }): Promise<"cancelled" | "shared">;
  };
};
import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
