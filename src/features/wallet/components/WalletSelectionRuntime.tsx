import { useLinkWithSiwe } from "@privy-io/expo";
import {
  useAccount,
  useAppKit,
  useAppKitEventSubscription,
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

import { useWalletConnectionController } from "../../../app/providers/WalletConnectionProvider";
import { expoSecureSessionStorage } from "../../auth/services/expoSecureSessionStorage";
import {
  createPrivyWalletLinkAdapter,
  type PrivyWalletLinkFailure,
} from "../services/privyWalletLinkAdapter";
import {
  createReownCleanupCoordinator,
  createReownWalletConnectionAdapter,
  isReownConnectionOnChain,
  openReownConnectionSelector,
  shouldRejectClosedReownSelector,
  shouldReuseReownConnection,
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
  chainId: 56 | 97;
  endpoint: string;
  publicWebOrigin: string;
  supabasePublicKey: string;
};

const REOWN_CONNECTION_TIMEOUT_MS = 120_000;

function reportPrivyWalletLinkFailure(
  failure: PrivyWalletLinkFailure,
): void {
  console.warn("[wallet-link] Privy SIWE link failed", failure);
}

type PendingConnection = {
  promise: Promise<ReownConnectionSnapshot>;
  reject(error: Error): void;
  resolve(snapshot: ReownConnectionSnapshot): void;
  sawModal: boolean;
  selectedWallet: boolean;
  timeoutId: ReturnType<typeof setTimeout>;
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
  const connection = useReownConnectionAdapter(config.chainId);
  const { generateSiweMessage, linkWithSiwe } = useLinkWithSiwe();
  const privyLink = useMemo(
    () => createPrivyWalletLinkAdapter({
      generateSiweMessage,
      linkWithSiwe,
      reportFailure: reportPrivyWalletLinkFailure,
    }),
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

function useReownConnectionAdapter(configuredChainId: 56 | 97): {
  adapter: ReturnType<typeof createReownWalletConnectionAdapter>;
  connectedAddress?: `0x${string}`;
} {
  const { open } = useAppKit();
  const { disconnect } = useWalletConnectionController();
  const account = useAccount();
  const { provider } = useProvider();
  const { walletInfo } = useWalletInfo();
  const { isLoading, isOpen } = useAppKitState();
  const rawSnapshot = useMemo(
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
  const snapshot = rawSnapshot &&
      isReownConnectionOnChain(rawSnapshot, configuredChainId)
    ? rawSnapshot
    : null;
  const snapshotRef = useRef(snapshot);
  const unexpectedChainRef = useRef(Boolean(rawSnapshot && !snapshot));
  const pendingRef = useRef<PendingConnection | null>(null);
  snapshotRef.current = snapshot;
  unexpectedChainRef.current = Boolean(rawSnapshot && !snapshot);
  const cleanup = useMemo(
    () => createReownCleanupCoordinator(disconnect),
    [disconnect],
  );

  const failPendingConnection = useCallback((
    code: "connection_failed" | "connection_timeout" | "unsupported_chain",
  ) => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    clearTimeout(pending.timeoutId);
    pending.reject(new WalletConnectionError(code));
  }, []);

  const rejectPendingConnection = useCallback(() => {
    failPendingConnection("connection_failed");
  }, [failPendingConnection]);

  const markWalletSelected = useCallback(() => {
    if (pendingRef.current) pendingRef.current.selectedWallet = true;
  }, []);

  useAppKitEventSubscription("SELECT_WALLET", markWalletSelected);
  useAppKitEventSubscription("CONNECT_ERROR", rejectPendingConnection);
  useAppKitEventSubscription("USER_REJECTED", rejectPendingConnection);

  useEffect(() => {
    if (!snapshot || !pendingRef.current) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    clearTimeout(pending.timeoutId);
    pending.resolve(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!rawSnapshot || snapshot || !pendingRef.current) return;
    void cleanup.start();
    failPendingConnection("unsupported_chain");
  }, [cleanup, failPendingConnection, rawSnapshot, snapshot]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (isOpen) pending.sawModal = true;
    if (shouldRejectClosedReownSelector({
      hasSnapshot: Boolean(snapshotRef.current),
      isLoading,
      isOpen,
      sawModal: pending.sawModal,
      selectedWallet: pending.selectedWallet,
    })) {
      rejectPendingConnection();
    }
  }, [isLoading, isOpen, rejectPendingConnection]);

  useEffect(() => () => {
    failPendingConnection("connection_failed");
  }, [failPendingConnection]);

  const connect = useCallback(async (expectedAddress?: `0x${string}`) => {
    await cleanup.wait();

    const current = snapshotRef.current;
    if (current && shouldReuseReownConnection(current.address, expectedAddress)) {
      return current;
    }
    if (current || unexpectedChainRef.current) {
      await cleanup.start();
      snapshotRef.current = null;
      unexpectedChainRef.current = false;
    }
    if (pendingRef.current) return pendingRef.current.promise;

    let resolve!: (value: ReownConnectionSnapshot) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<ReownConnectionSnapshot>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    const timeoutId = setTimeout(() => {
      void cleanup.start();
      failPendingConnection("connection_timeout");
    }, REOWN_CONNECTION_TIMEOUT_MS);
    pendingRef.current = {
      promise,
      reject,
      resolve,
      sawModal: false,
      selectedWallet: false,
      timeoutId,
    };
    try {
      openReownConnectionSelector(open);
    } catch {
      failPendingConnection("connection_failed");
    }
    return promise;
  }, [cleanup, failPendingConnection, open]);

  const adapter = useMemo(
    () => createReownWalletConnectionAdapter({
      connect,
      disconnect,
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
