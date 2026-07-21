import { isAddress } from "viem";

import type { ConnectedExternalWallet } from "./reownWalletConnectionAdapter";

export type PrivyWalletLinkErrorCode =
  | "invalid_origin"
  | "linked_wallet_mismatch";

export class PrivyWalletLinkError extends Error {
  readonly code: PrivyWalletLinkErrorCode;

  constructor(code: PrivyWalletLinkErrorCode) {
    super(code);
    this.name = "PrivyWalletLinkError";
    this.code = code;
  }
}

type GenerateSiweMessage = (input: {
  from: { domain: string; uri: string };
  wallet: {
    address: string;
    chainId: string;
    connectorType: "wallet_connect";
    meta: { id: string; name: string };
    walletClientType: string;
  };
}) => Promise<string>;

type LinkWithSiwe = (input: {
  messageOverride: string;
  signature: string;
}) => Promise<unknown>;

export type PrivyWalletLinkAdapter = {
  link(wallet: ConnectedExternalWallet, origin: string): Promise<void>;
};

export function createPrivyWalletLinkAdapter(dependencies: {
  generateSiweMessage: GenerateSiweMessage;
  linkWithSiwe: LinkWithSiwe;
}): PrivyWalletLinkAdapter {
  return {
    async link(wallet, origin) {
      const parsedOrigin = parseSecureOrigin(origin);
      if (!parsedOrigin) {
        throw new PrivyWalletLinkError("invalid_origin");
      }

      const message = await dependencies.generateSiweMessage({
        from: {
          domain: parsedOrigin.host,
          uri: parsedOrigin.origin,
        },
        wallet: {
          address: wallet.address,
          chainId: wallet.chainId,
          connectorType: wallet.connectorType,
          meta: {
            id: wallet.providerLabel,
            name: wallet.providerLabel,
          },
          walletClientType: wallet.providerLabel,
        },
      });
      const signature = await wallet.signMessage(message);
      const user = await dependencies.linkWithSiwe({
        messageOverride: message,
        signature,
      });

      if (!hasLinkedEthereumWallet(user, wallet.address)) {
        throw new PrivyWalletLinkError("linked_wallet_mismatch");
      }
    },
  };
}

function parseSecureOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function hasLinkedEthereumWallet(user: unknown, targetAddress: string): boolean {
  if (!user || typeof user !== "object" || !isAddress(targetAddress)) {
    return false;
  }

  const linkedAccounts = (user as Record<string, unknown>).linked_accounts;
  if (!Array.isArray(linkedAccounts)) return false;

  return linkedAccounts.some((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const account = candidate as Record<string, unknown>;
    return account.type === "wallet" &&
      account.chain_type === "ethereum" &&
      typeof account.address === "string" &&
      isAddress(account.address.toLowerCase()) &&
      account.address.toLowerCase() === targetAddress.toLowerCase();
  });
}
