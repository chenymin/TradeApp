import { useEffect, useMemo, useState } from "react";
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
import { mapWalletIdentity } from "../domain/walletIdentity";
import type { PrivyWalletMetadata } from "../domain/walletModels";
import type { WalletBalanceLoader } from "../services/walletBalanceLoader";

export type WalletDataDependencies = {
  loadBalances: WalletBalanceLoader;
};

const EMPTY_DEPENDENCIES: WalletDataDependencies = {
  async loadBalances() {
    return { artDiscoveryStatus: "ready", rows: [] };
  },
};

export function WalletScreen({
  chain,
  dependencies = EMPTY_DEPENDENCIES,
  privyWalletMetadata,
  viewerState,
}: {
  chain: PublicChainConfig;
  dependencies?: WalletDataDependencies;
  privyWalletMetadata: PrivyWalletMetadata;
  viewerState: Pick<AuthProviderState, "isSessionReady" | "viewer">;
}) {
  const { width } = useWindowDimensions();
  const identity = useMemo(
    () => mapWalletIdentity(viewerState.viewer, privyWalletMetadata),
    [privyWalletMetadata, viewerState.viewer],
  );
  const [requestVersion, setRequestVersion] = useState(0);
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
          <WalletIdentitySection chainName={chain.name} identity={identity} />
        </View>
        <View style={styles.column}>
          <WalletBalanceSection
            onRefresh={() => setRequestVersion((value) => value + 1)}
            state={loadState}
          />
          <View style={styles.receivePreview}>
            <AppText style={styles.sectionHeading} variant="body">Receive</AppText>
            <AppText numberOfLines={1} variant="caption">
              {identity.activeAddress}
            </AppText>
          </View>
        </View>
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
  receivePreview: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    padding: spacing.md,
  },
  scrollContent: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeading: {
    fontWeight: "800",
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
