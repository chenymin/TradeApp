import { Trash2 } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppText, Button, colors, spacing } from "../../../shared/ui";
import type { WalletIdentity } from "../domain/walletModels";
import {
  canUnlinkWallet,
  type WalletUnlinkTarget,
} from "../workflow/walletUnlinkWorkflow";

export type WalletUnlinkPresentation =
  | { status: "idle" }
  | {
      address: `0x${string}`;
      status:
        | "complete"
        | "confirming"
        | "sync_error"
        | "syncing"
        | "unlink_error"
        | "unlinking";
    };

export function WalletIdentitySection({
  chainName,
  identity,
  onRetryWalletSync,
  onUnlinkWallet,
  unlinkEnabled = false,
  unlinkState = { status: "idle" },
}: {
  chainName: string;
  identity: WalletIdentity;
  onRetryWalletSync?: () => Promise<void> | void;
  onUnlinkWallet?: (wallet: WalletUnlinkTarget) => Promise<void> | void;
  unlinkEnabled?: boolean;
  unlinkState?: WalletUnlinkPresentation;
}) {
  const operationBusy = unlinkState.status === "confirming" ||
    unlinkState.status === "unlinking" ||
    unlinkState.status === "syncing";

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
        {identity.wallets.map((wallet) => {
          const eligible = unlinkEnabled &&
            canUnlinkWallet(identity, wallet);
          const targetBusy = operationBusy &&
            sameAddress(unlinkState.address, wallet.address);
          const targetNeedsSync = unlinkState.status === "sync_error" &&
            sameAddress(unlinkState.address, wallet.address);

          return (
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
              {eligible && !targetNeedsSync ? (
                <Pressable
                  accessibilityHint="Removes this external wallet after confirmation"
                  accessibilityLabel={`Unlink wallet ${shortAddress(wallet.address)}`}
                  accessibilityRole="button"
                  disabled={operationBusy}
                  onPress={() => onUnlinkWallet?.(wallet)}
                  style={({ pressed }) => [
                    styles.unlinkAction,
                    pressed ? styles.unlinkActionPressed : null,
                  ]}
                >
                  {targetBusy ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <Trash2 color={colors.danger} size={19} strokeWidth={2.2} />
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {unlinkState.status === "unlink_error" ? (
          <AppText style={styles.error} variant="caption">
            Wallet could not be unlinked
          </AppText>
        ) : null}
        {unlinkState.status === "sync_error" ? (
          <View style={styles.syncError}>
            <AppText style={styles.error} variant="caption">
              Wallet removed; sync pending
            </AppText>
            <Button
              accessibilityLabel="Retry wallet sync"
              label="Retry sync"
              onPress={() => onRetryWalletSync?.()}
            />
          </View>
        ) : null}
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

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

const styles = StyleSheet.create({
  address: {
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    fontWeight: "700",
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
  syncError: {
    gap: spacing.sm,
  },
  unlinkAction: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  unlinkActionPressed: {
    opacity: 0.6,
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
