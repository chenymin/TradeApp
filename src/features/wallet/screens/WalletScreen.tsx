import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import type { AuthProviderState } from "../../../app/providers/AuthProvider";
import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import { AppText, colors, spacing } from "../../../shared/ui";
import {
  WalletBalanceSection,
  type WalletLoadState,
} from "../components/WalletBalanceSection";
import { WalletIdentitySection } from "../components/WalletIdentitySection";
import type { WalletUnlinkPresentation } from "../components/WalletIdentitySection";
import { WalletReceiveSection } from "../components/WalletReceiveSection";
import { WalletReceiveShareCard } from "../components/WalletReceiveShareCard";
import { mapWalletIdentity } from "../domain/walletIdentity";
import type {
  PrivyWalletMetadata,
  WalletDataDependencies,
} from "../domain/walletModels";
import {
  initialWalletSelectionState,
  type WalletSelectionState,
} from "../workflow/walletSelectionMachine";
import {
  createWalletSelectionWorkflow,
  type WalletSelectionRuntimeDependencies,
} from "../workflow/walletSelectionWorkflow";
import {
  requestWalletUnlink,
  retryWalletSync,
  type WalletUnlinkDependencies,
  type WalletUnlinkTarget,
} from "../workflow/walletUnlinkWorkflow";

export type { WalletDataDependencies } from "../domain/walletModels";

const EMPTY_DEPENDENCIES: WalletDataDependencies = {
  clipboard: { async setString() {} },
  imageShare: { async share() { return "unavailable"; } },
  async loadBalances() {
    return { artDiscoveryStatus: "ready", rows: [] };
  },
  textShare: { async share() { return "cancelled"; } },
};

export function WalletScreen({
  chain,
  dependencies = EMPTY_DEPENDENCIES,
  privyWalletMetadata,
  selectionDependencies,
  unlinkDependencies,
  viewerState,
}: {
  chain: PublicChainConfig;
  dependencies?: WalletDataDependencies;
  privyWalletMetadata: PrivyWalletMetadata;
  selectionDependencies?: WalletSelectionRuntimeDependencies;
  unlinkDependencies?: WalletUnlinkDependencies;
  viewerState: Pick<AuthProviderState, "isSessionReady" | "viewer">;
}) {
  const { width } = useWindowDimensions();
  const receiveShareRef = useRef<View>(null);
  const identityMutationInFlight = useRef(false);
  const identity = useMemo(
    () => mapWalletIdentity(viewerState.viewer, privyWalletMetadata),
    [privyWalletMetadata, viewerState.viewer],
  );
  const [requestVersion, setRequestVersion] = useState(0);
  const [unlinkState, setUnlinkState] = useState<WalletUnlinkPresentation>({
    status: "idle",
  });
  const selectionWorkflow = useMemo(
    () => selectionDependencies
      ? createWalletSelectionWorkflow(selectionDependencies.workflow)
      : null,
    [selectionDependencies?.workflow],
  );
  const [selectionState, setSelectionState] = useState<WalletSelectionState>(
    initialWalletSelectionState,
  );
  const [loadState, setLoadState] = useState<WalletLoadState>(
    identity ? { status: "loading" } : { status: "unavailable" },
  );

  useEffect(() => {
    let active = true;
    if (!identity) {
      setLoadState({ status: "unavailable" });
      return () => { active = false; };
    }

    setLoadState({ status: "loading" });
    void dependencies.loadBalances({
      address: identity.activeAddress,
      chain,
    }).then(
      (data) => {
        if (active) setLoadState({ data, status: "ready" });
      },
      () => {
        if (active) setLoadState({ status: "error" });
      },
    );

    return () => { active = false; };
  }, [
    chain.chainId,
    dependencies.loadBalances,
    identity?.activeAddress,
    requestVersion,
  ]);

  useEffect(() => {
    identityMutationInFlight.current = false;
    setUnlinkState({ status: "idle" });
  }, [viewerState.viewer?.id, viewerState.viewer?.walletAddress]);

  useEffect(() => {
    setSelectionState(
      selectionWorkflow?.getState() ?? initialWalletSelectionState,
    );
    const unsubscribe = selectionWorkflow?.subscribe(setSelectionState);
    if (selectionWorkflow) void selectionWorkflow.restore();
    return unsubscribe;
  }, [selectionWorkflow]);

  useEffect(() => {
    if (
      unlinkState.status === "complete" &&
      identity &&
      !identity.wallets.some((wallet) =>
        sameAddress(wallet.address, unlinkState.address)
      )
    ) {
      setUnlinkState({ status: "idle" });
    }
  }, [identity, unlinkState]);

  if (!identity) {
    return (
      <View accessibilityLabel="Wallet screen" style={styles.unavailable}>
        <AppText style={styles.pageTitle} variant="title">Wallet</AppText>
        <AppText variant="body">Wallet unavailable</AppText>
        <AppText variant="caption">
          Sign in again to restore a verified wallet address.
        </AppText>
      </View>
    );
  }

  const wide = width >= 768;
  const displayIdentity = unlinkState.status === "complete"
    ? {
        ...identity,
        wallets: identity.wallets.filter((wallet) =>
          !sameAddress(wallet.address, unlinkState.address)
        ),
      }
    : identity;

  const handleUnlink = async (wallet: WalletUnlinkTarget) => {
    if (
      !unlinkDependencies ||
      identityMutationInFlight.current ||
      (unlinkState.status !== "idle" && unlinkState.status !== "unlink_error")
    ) return;

    identityMutationInFlight.current = true;
    setUnlinkState({ address: wallet.address, status: "confirming" });
    const result = await requestWalletUnlink(
      identity,
      wallet,
      {
        ...unlinkDependencies,
        refreshSession: async () => {
          setUnlinkState({ address: wallet.address, status: "syncing" });
          return unlinkDependencies.refreshSession();
        },
        unlink: async (address) => {
          setUnlinkState({ address: wallet.address, status: "unlinking" });
          return unlinkDependencies.unlink(address);
        },
      },
    );
    identityMutationInFlight.current = false;

    if (result === "cancelled" || result === "ineligible") {
      setUnlinkState({ status: "idle" });
      return;
    }

    setUnlinkState({ address: wallet.address, status: result });
  };

  const handleRetrySync = async () => {
    if (
      !unlinkDependencies ||
      identityMutationInFlight.current ||
      unlinkState.status !== "sync_error"
    ) return;

    const address = unlinkState.address;
    identityMutationInFlight.current = true;
    setUnlinkState({ address, status: "syncing" });
    const result = await retryWalletSync(unlinkDependencies);
    identityMutationInFlight.current = false;
    setUnlinkState({ address, status: result });
  };

  const handleSelectWallet = async (wallet: WalletUnlinkTarget) => {
    if (!selectionWorkflow || identityMutationInFlight.current) return;

    identityMutationInFlight.current = true;
    try {
      await selectionWorkflow.selectExisting(wallet, identity.activeAddress);
    } finally {
      identityMutationInFlight.current = false;
    }
  };

  const handleBindWallet = async () => {
    if (!selectionWorkflow || identityMutationInFlight.current) return;

    identityMutationInFlight.current = true;
    try {
      await selectionWorkflow.bindNew(identity.activeAddress);
    } finally {
      identityMutationInFlight.current = false;
    }
  };

  const handleRetrySelection = async () => {
    if (!selectionWorkflow || identityMutationInFlight.current) return;

    identityMutationInFlight.current = true;
    try {
      await selectionWorkflow.retry();
    } finally {
      identityMutationInFlight.current = false;
    }
  };

  return (
    <ScrollView
      accessibilityLabel="Wallet screen"
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.titleRow}>
        <View>
          <AppText style={styles.pageTitle} variant="title">Wallet</AppText>
          <AppText variant="caption">{chain.name}</AppText>
        </View>
        <AppText style={styles.chainBadge} variant="caption">
          Chain {chain.chainId}
        </AppText>
      </View>

      <View
        accessibilityLabel="Wallet responsive layout"
        style={[styles.layout, wide ? styles.wideLayout : styles.phoneLayout]}
      >
        <View style={styles.column}>
          <WalletIdentitySection
            chainName={chain.name}
            connectedExternalAddress={
              selectionDependencies?.connectedExternalAddress
            }
            identity={displayIdentity}
            onBindWallet={handleBindWallet}
            onRemoveConflictLink={handleUnlink}
            onRetryWalletSync={handleRetrySync}
            onRetryWalletSelection={handleRetrySelection}
            onSelectWallet={handleSelectWallet}
            onUnlinkWallet={handleUnlink}
            selectionEnabled={Boolean(selectionDependencies)}
            selectionState={selectionState}
            unlinkEnabled={Boolean(unlinkDependencies)}
            unlinkState={unlinkState}
          />
        </View>
        <View style={styles.column}>
          <WalletBalanceSection
            onRefresh={() => setRequestVersion((value) => value + 1)}
            state={loadState}
          />
          <WalletReceiveSection
            address={identity.activeAddress}
            chain={chain}
            clipboard={dependencies.clipboard}
            onShareImage={() => dependencies.imageShare.share(receiveShareRef)}
            textShare={dependencies.textShare}
          />
        </View>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.captureHost}
      >
        <WalletReceiveShareCard
          address={identity.activeAddress}
          chain={chain}
          ref={receiveShareRef}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chainBadge: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  captureHost: {
    left: -10000,
    position: "absolute",
    top: 0,
  },
  column: {
    flex: 1,
    flexBasis: 340,
    gap: spacing.md,
    minWidth: 0,
  },
  layout: {
    gap: spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    textAlign: "left",
  },
  phoneLayout: {
    flexDirection: "column",
  },
  scrollContent: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  unavailable: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  wideLayout: {
    flexDirection: "row",
  },
});

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
