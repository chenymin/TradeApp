import { StyleSheet, View } from "react-native";

import type { AuthProviderState } from "../../../app/providers/AuthProvider";
import type { PublicChainConfig } from "../../../lib/chain/publicChainRegistry";
import { AppText, Screen, spacing } from "../../../shared/ui";
import { mapWalletIdentity } from "../domain/walletIdentity";
import type { PrivyWalletMetadata } from "../domain/walletModels";

export function WalletScreen({
  chain,
  privyWalletMetadata,
  viewerState,
}: {
  chain: PublicChainConfig;
  privyWalletMetadata: PrivyWalletMetadata;
  viewerState: Pick<AuthProviderState, "isSessionReady" | "viewer">;
}) {
  const identity = mapWalletIdentity(viewerState.viewer, privyWalletMetadata);

  return (
    <Screen>
      <View accessibilityLabel="Wallet screen" style={styles.content}>
        <AppText variant="title">Wallet</AppText>
        <AppText variant="caption">{chain.name}</AppText>
        {identity ? (
          <>
            <AppText variant="subtitle">Verified wallet</AppText>
            <AppText variant="body">{identity.activeAddress}</AppText>
          </>
        ) : (
          <AppText variant="body">Wallet unavailable</AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
});
