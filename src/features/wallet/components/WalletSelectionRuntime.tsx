import { useLinkWithSiwe } from "@privy-io/expo";
import {
  useAccount,
  useAppKit,
  useAppKitState,
  useProvider,
  useWalletInfo,
} from "@reown/appkit-react-native";
import { randomUUID } from "expo-crypto";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Alert } from "react-native";

import { expoSecureSessionStorage } from "../../auth/services/expoSecureSessionStorage";
import { createPrivyWalletLinkAdapter } from "../services/privyWalletLinkAdapter";
import {
  createReownWalletConnectionAdapter,
  type ReownConnectionSnapshot,
  WalletConnectionError,
} from "../services/reownWalletConnectionAdapter";
import { createWalletSelectionDependencies } from "../services/createWalletSelectionDependencies";
import { createWalletSelectionOperationStorage } from "../services/walletSelectionOperationStorage";
import { selectWalletForViewer } from "../services/walletSelectClient";
import type {
  WalletSelectionDependencies,
  WalletSelectionRuntimeDependencies,
} from "../workflow/walletSelectionWorkflow";

export type WalletSelectionRuntimeConfig = {
  endpoint: string;
  publicWebOrigin: string;
  supabasePublicKey: string;
};

type PendingConnection = {
  promise: Promise<ReownConnectionSnapshot>;
  reject(error: Error): void;
  resolve(snapshot: ReownConnectionSnapshot): void;
  sawModal: boolean;
};

export function WalletSelectionRuntime({
  children,
  config,
  getAccessToken,
  replaceViewer,
  viewerId,
}: {
  children(dependencies: WalletSelectionRuntimeDependencies): ReactNode;
  config: WalletSelectionRuntimeConfig;
  getAccessToken: () => Promise<string | null>;
  replaceViewer: WalletSelectionDependencies["persistViewer"];
  viewerId: string | null;
}) {
  const connection = useReownConnectionAdapter();
  const { generateSiweMessage, linkWithSiwe } = useLinkWithSiwe();
  const privyLink = useMemo(
    () => createPrivyWalletLinkAdapter({ generateSiweMessage, linkWithSiwe }),
    [generateSiweMessage, linkWithSiwe],
  );
  const operationStorage = useMemo(
    () => createWalletSelectionOperationStorage({
      storage: expoSecureSessionStorage,
    }),
    [],
  );
  const previousViewerId = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousViewerId.current;
    previousViewerId.current = viewerId;
    if (previous && previous !== viewerId) {
      void operationStorage.clear();
    }
  }, [operationStorage, viewerId]);
  const workflow = useMemo(
    () => createWalletSelectionDependencies({
      alert: Alert,
      connection: connection.adapter,
      getAccessToken,
      newOperationId: randomUUID,
      now: Date.now,
      operationStorage,
      privyLink,
      publicWebOrigin: config.publicWebOrigin,
      replaceViewer,
      selectWallet: (input) => selectWalletForViewer({
        ...input,
        endpoint: config.endpoint,
        supabasePublicKey: config.supabasePublicKey,
      }),
    }),
    [
      config.endpoint,
      config.publicWebOrigin,
      config.supabasePublicKey,
      connection.adapter,
      getAccessToken,
      operationStorage,
      privyLink,
      replaceViewer,
    ],
  );
  const dependencies = useMemo<WalletSelectionRuntimeDependencies>(
    () => ({
      ...(connection.connectedAddress
        ? { connectedExternalAddress: connection.connectedAddress }
        : {}),
      workflow,
    }),
    [connection.connectedAddress, workflow],
  );

  return children(dependencies);
}

function useReownConnectionAdapter(): {
  adapter: ReturnType<typeof createReownWalletConnectionAdapter>;
  connectedAddress?: `0x${string}`;
} {
  const { disconnect, open } = useAppKit();
  const account = useAccount();
  const { provider } = useProvider();
  const { walletInfo } = useWalletInfo();
  const { isLoading, isOpen } = useAppKitState();
  const snapshot = useMemo(
    () => toConnectionSnapshot({
      address: account.address,
      chainId: account.chainId,
      namespace: account.namespace,
      provider,
      providerLabel: walletInfo?.name,
    }),
    [
      account.address,
      account.chainId,
      account.namespace,
      provider,
      walletInfo?.name,
    ],
  );
  const snapshotRef = useRef(snapshot);
  const pendingRef = useRef<PendingConnection | null>(null);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!snapshot || !pendingRef.current) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending.resolve(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (isOpen) pending.sawModal = true;
    if (pending.sawModal && !isOpen && !isLoading && !snapshotRef.current) {
      pendingRef.current = null;
      pending.reject(new WalletConnectionError("connection_failed"));
    }
  }, [isLoading, isOpen]);

  useEffect(() => () => {
    pendingRef.current?.reject(new WalletConnectionError("connection_failed"));
    pendingRef.current = null;
  }, []);

  const connect = useCallback(async (expectedAddress?: `0x${string}`) => {
    const current = snapshotRef.current;
    if (current && (
      !expectedAddress || current.address.toLowerCase() === expectedAddress.toLowerCase()
    )) {
      return current;
    }
    if (current) {
      await Promise.resolve(disconnect("eip155"));
      snapshotRef.current = null;
    }
    if (pendingRef.current) return pendingRef.current.promise;

    let resolve!: (value: ReownConnectionSnapshot) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<ReownConnectionSnapshot>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    pendingRef.current = { promise, reject, resolve, sawModal: false };
    try {
      open();
    } catch {
      pendingRef.current = null;
      reject(new WalletConnectionError("connection_failed"));
    }
    return promise;
  }, [disconnect, open]);

  const adapter = useMemo(
    () => createReownWalletConnectionAdapter({
      connect,
      disconnect: () => Promise.resolve(disconnect("eip155")),
    }),
    [connect, disconnect],
  );

  return {
    adapter,
    ...(snapshot ? { connectedAddress: snapshot.address as `0x${string}` } : {}),
  };
}

function toConnectionSnapshot(input: {
  address?: string;
  chainId?: string;
  namespace?: string;
  provider?: { request(input: { method: string; params?: unknown[] }): Promise<unknown> };
  providerLabel?: string;
}): ReownConnectionSnapshot | null {
  if (!input.address || !input.chainId || !input.namespace || !input.provider) {
    return null;
  }

  return {
    address: input.address,
    chainId: input.chainId.includes(":")
      ? input.chainId.slice(input.chainId.lastIndexOf(":") + 1)
      : input.chainId,
    namespace: input.namespace,
    provider: input.provider,
    providerLabel: input.providerLabel ?? "External wallet",
  };
}
