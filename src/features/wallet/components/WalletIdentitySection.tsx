import { StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { WalletIdentity } from "../domain/walletModels";

export function WalletIdentitySection({
  chainName,
  identity,
}: {
  chainName: string;
  identity: WalletIdentity;
}) {
  return (
    <View accessibilityLabel="Wallet identity and security" style={styles.group}>
      <View style={styles.section}>
        <AppText style={styles.heading} variant="body">Verified wallet</AppText>
        <AppText variant="caption">{chainName}</AppText>
        <AppText
          accessibilityLabel={`Active wallet address ${identity.activeAddress}`}
          numberOfLines={1}
          style={styles.address}
          variant="body"
        >
          {shortAddress(identity.activeAddress)}
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText style={styles.heading} variant="body">Linked wallets</AppText>
        {identity.wallets.map((wallet) => (
          <View key={wallet.address.toLowerCase()} style={styles.walletRow}>
            <View style={styles.walletDetails}>
              <AppText numberOfLines={1} variant="body">
                {shortAddress(wallet.address)}
              </AppText>
              <AppText variant="caption">{wallet.providerLabel}</AppText>
            </View>
            <View style={styles.labels}>
              <AppText style={styles.label} variant="caption">
                {wallet.status === "active" ? "Active" : "Linked"}
              </AppText>
              <AppText style={styles.label} variant="caption">
                {wallet.kind === "embedded" ? "Embedded" : "External"}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <AppText style={styles.heading} variant="body">Wallet security</AppText>
        <AppText variant="body">
          {identity.passkeyMfaEnabled
            ? "Passkey MFA enabled"
            : "Passkey MFA not enabled"}
        </AppText>
        <AppText variant="caption">
          Transfers are unavailable in this read-only Wallet.
        </AppText>
      </View>
    </View>
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

const styles = StyleSheet.create({
  address: {
    fontWeight: "800",
  },
  group: {
    gap: spacing.md,
  },
  heading: {
    fontWeight: "800",
  },
  label: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  labels: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  walletDetails: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  walletRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
  },
});
