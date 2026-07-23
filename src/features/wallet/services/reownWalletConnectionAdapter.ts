import { getAddress, isAddress, isAddressEqual, stringToHex } from "viem";

export type Eip1193Provider = {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
};

export type ConnectedExternalWallet = {
  address: `0x${string}`;
  chainId: `eip155:${number}`;
  connectorType: "wallet_connect";
  providerLabel: string;
  signMessage(message: string): Promise<string>;
};

export type ReownConnectionSnapshot = {
  address: string;
  chainId: string;
  namespace: string;
  provider: Eip1193Provider;
  providerLabel: string;
};

export type WalletConnectionErrorCode =
  | "address_mismatch"
  | "connection_timeout"
  | "connection_failed"
  | "invalid_address"
  | "session_expired"
  | "signature_failed"
  | "unsupported_chain";

export class WalletConnectionError extends Error {
  readonly code: WalletConnectionErrorCode;

  constructor(code: WalletConnectionErrorCode) {
    super(code);
    this.name = "WalletConnectionError";
    this.code = code;
  }
}

export function createReownCleanupCoordinator(
  disconnect: () => Promise<void> | void,
): {
  start(): Promise<void>;
  wait(): Promise<void>;
} {
  let inFlight: Promise<void> | null = null;

  const start = () => {
    if (inFlight) return inFlight;

    let tracked: Promise<void>;
    tracked = Promise.resolve()
      .then(() => disconnect())
      .catch(() => undefined)
      .finally(() => {
        if (inFlight === tracked) inFlight = null;
      });
    inFlight = tracked;
    return tracked;
  };

  return {
    start,
    wait: () => inFlight ?? Promise.resolve(),
  };
}

export function shouldReuseReownConnection(
  currentAddress: string,
  expectedAddress?: `0x${string}`,
): boolean {
  return Boolean(
    expectedAddress &&
      currentAddress.toLowerCase() === expectedAddress.toLowerCase(),
  );
}

export function isReownConnectionOnChain(
  connection: { chainId: string },
  configuredChainId: number,
): boolean {
  const rawChainId = connection.chainId.includes(":")
    ? connection.chainId.slice(connection.chainId.lastIndexOf(":") + 1)
    : connection.chainId;
  return Number(rawChainId) === configuredChainId;
}

export function openReownConnectionSelector(
  open: (options: { view: "Connect" }) => void,
): void {
  open({ view: "Connect" });
}

export function shouldRejectClosedReownSelector(input: {
  hasSnapshot: boolean;
  isLoading: boolean;
  isOpen: boolean;
  sawModal: boolean;
  selectedWallet: boolean;
}): boolean {
  return input.sawModal &&
    !input.isOpen &&
    !input.isLoading &&
    !input.hasSnapshot &&
    !input.selectedWallet;
}

export function createReownWalletConnectionAdapter(dependencies: {
  connect(expectedAddress?: `0x${string}`): Promise<ReownConnectionSnapshot>;
  disconnect(): Promise<void> | void;
}) {
  return {
    async connect(
      expectedAddress?: `0x${string}`,
    ): Promise<ConnectedExternalWallet> {
      let connection: ReownConnectionSnapshot;

      try {
        connection = await dependencies.connect(expectedAddress);
      } catch (error) {
        if (error instanceof WalletConnectionError) throw error;
        throw new WalletConnectionError("connection_failed");
      }

      if (connection.namespace !== "eip155") {
        throw new WalletConnectionError("unsupported_chain");
      }
      if (!isAddress(connection.address)) {
        throw new WalletConnectionError("invalid_address");
      }

      const numericChainId = Number(connection.chainId);
      if (!Number.isSafeInteger(numericChainId) || numericChainId <= 0) {
        throw new WalletConnectionError("unsupported_chain");
      }

      const address = getAddress(connection.address) as `0x${string}`;
      if (expectedAddress && !isAddressEqual(expectedAddress, address)) {
        await Promise.resolve(dependencies.disconnect()).catch(() => undefined);
        throw new WalletConnectionError("address_mismatch");
      }

      return {
        address,
        chainId: `eip155:${numericChainId}`,
        connectorType: "wallet_connect",
        providerLabel: connection.providerLabel || "External wallet",
        async signMessage(message) {
          try {
            const signature = await connection.provider.request({
              method: "personal_sign",
              params: [stringToHex(message), address],
            });
            if (typeof signature !== "string" || !signature) {
              throw new Error("invalid signature");
            }
            return signature;
          } catch (error) {
            if (isExpiredSessionError(error)) {
              await Promise.resolve(dependencies.disconnect()).catch(() => undefined);
              throw new WalletConnectionError("session_expired");
            }
            throw new WalletConnectionError("signature_failed");
          }
        },
      };
    },
    disconnect: dependencies.disconnect,
  };
}

function isExpiredSessionError(error: unknown): boolean {
  return error instanceof Error &&
    error.message.toLowerCase().includes("session topic doesn't exist");
}
