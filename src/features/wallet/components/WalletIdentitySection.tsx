import { Plus, Trash2 } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppText, Button, colors, spacing } from "../../../shared/ui";
import { getWalletSelectionAction } from "../domain/walletIdentity";
import type { WalletIdentity } from "../domain/walletModels";
import type {
  WalletSelectionState,
  WalletSelectionTarget,
} from "../workflow/walletSelectionMachine";
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
  connectedExternalAddress,
  identity,
  onBindWallet,
  onRemoveConflictLink,
  onRetryWalletSync,
  onRetryWalletSelection,
  onSelectWallet,
  onUnlinkWallet,
  selectionEnabled = false,
  selectionState = { status: "idle" },
  unlinkEnabled = false,
  unlinkState = { status: "idle" },
}: {
  chainName: string;
  connectedExternalAddress?: `0x${string}`;
  identity: WalletIdentity;
  onBindWallet?: () => Promise<void> | void;
  onRemoveConflictLink?: (wallet: WalletUnlinkTarget) => Promise<void> | void;
  onRetryWalletSync?: () => Promise<void> | void;
  onRetryWalletSelection?: () => Promise<void> | void;
  onSelectWallet?: (wallet: WalletUnlinkTarget) => Promise<void> | void;
  onUnlinkWallet?: (wallet: WalletUnlinkTarget) => Promise<void> | void;
  selectionEnabled?: boolean;
  selectionState?: WalletSelectionState;
  unlinkEnabled?: boolean;
  unlinkState?: WalletUnlinkPresentation;
}) {
  const unlinkBusy = unlinkState.status === "confirming" ||
    unlinkState.status === "unlinking" ||
    unlinkState.status === "syncing";
  const selectionBusy = isSelectionBusy(selectionState);
  const operationBusy = unlinkBusy || isSelectionMutationBlocked(selectionState);

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
          const targetBusy = unlinkBusy &&
            sameAddress(unlinkState.address, wallet.address);
          const targetNeedsSync = unlinkState.status === "sync_error" &&
            sameAddress(unlinkState.address, wallet.address);
          const selectionTarget = getSelectionTarget(selectionState);
          const selectionTargetBusy = selectionBusy && selectionTarget &&
            sameAddress(selectionTarget.address, wallet.address);
          const conflictTarget = selectionState.status === "conflict" &&
            sameAddress(selectionState.operation.target.address, wallet.address);
          const selectionAction = getWalletSelectionAction(
            wallet,
            connectedExternalAddress,
          );

          return (
            <View key={wallet.address.toLowerCase()} style={styles.walletRow}>
              <View style={styles.walletDetails}>
                <AppText numberOfLines={1} variant="body">
                  {shortAddress(wallet.address)}
                </AppText>
                <AppText variant="caption">{wallet.providerLabel}</AppText>
                <View style={styles.labels}>
                  <AppText style={styles.label} variant="caption">
                    {wallet.status === "active" ? "Active" : "Linked"}
                  </AppText>
                  <AppText style={styles.label} variant="caption">
                    {wallet.kind === "embedded" ? "Embedded" : "External"}
                  </AppText>
                </View>
              </View>
              <View
                style={styles.selectionAction}
                testID={`wallet-selection-action-slot-${wallet.address.toLowerCase()}`}
              >
                {selectionTargetBusy ? (
                  <ActivityIndicator
                    color={colors.primary}
                    size="small"
                    testID={`wallet-selection-spinner-${wallet.address.toLowerCase()}`}
                  />
                ) : conflictTarget ? (
                  <Pressable
                    accessibilityLabel={`Remove link ${shortAddress(wallet.address)}`}
                    accessibilityRole="button"
                    disabled={unlinkBusy || selectionBusy}
                    onPress={() => onRemoveConflictLink?.(wallet)}
                    style={({ pressed }) => [
                      styles.selectionButton,
                      pressed ? styles.unlinkActionPressed : null,
                    ]}
                  >
                    <AppText style={styles.dangerActionText} variant="caption">
                      Remove link
                    </AppText>
                  </Pressable>
                ) : selectionEnabled && selectionAction !== "none" ? (
                  <Pressable
                    accessibilityLabel={`${selectionAction === "connect" ? "Connect" : "Use"} wallet ${shortAddress(wallet.address)}`}
                    accessibilityRole="button"
                    disabled={operationBusy}
                    onPress={() => onSelectWallet?.(wallet)}
                    style={({ pressed }) => [
                      styles.selectionButton,
                      pressed ? styles.unlinkActionPressed : null,
                    ]}
                  >
                    <AppText style={styles.selectionActionText} variant="caption">
                      {selectionAction === "connect" ? "Connect" : "Use"}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
              {eligible && !conflictTarget ? (
                <View
                  style={styles.unlinkAction}
                  testID={`wallet-unlink-action-slot-${wallet.address.toLowerCase()}`}
                >
                  {!targetNeedsSync ? (
                    <Pressable
                      accessibilityHint="Removes this external wallet after confirmation"
                      accessibilityLabel={`Unlink wallet ${shortAddress(wallet.address)}`}
                      accessibilityRole="button"
                      disabled={operationBusy}
                      onPress={() => onUnlinkWallet?.(wallet)}
                      style={({ pressed }) => [
                        styles.unlinkButton,
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
        {selectionState.status === "sync_error" ||
        selectionState.status === "session_sync_pending" ? (
          <View style={styles.syncError}>
            <AppText style={styles.error} variant="caption">
              Wallet activation is pending
            </AppText>
            <Button
              accessibilityLabel="Retry wallet selection"
              label="Retry"
              onPress={() => onRetryWalletSelection?.()}
            />
          </View>
        ) : null}
        {selectionState.status === "consistency_error" ? (
          <AppText style={styles.error} variant="caption">
            Wallet state needs attention before another change
          </AppText>
        ) : null}
        {selectionEnabled ? (
          <View style={styles.bindActionSlot}>
            {selectionBusy && !getSelectionTarget(selectionState) ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Pressable
                accessibilityLabel="Bind wallet"
                accessibilityRole="button"
                disabled={operationBusy}
                onPress={() => onBindWallet?.()}
                style={({ pressed }) => [
                  styles.bindButton,
                  pressed ? styles.unlinkActionPressed : null,
                ]}
              >
                <Plus color={colors.primary} size={18} strokeWidth={2.2} />
                <AppText style={styles.selectionActionText} variant="body">
                  Bind wallet
                </AppText>
              </Pressable>
            )}
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

function isSelectionBusy(state: WalletSelectionState): boolean {
  return state.status === "binding" ||
    state.status === "confirming_switch" ||
    state.status === "connecting" ||
    state.status === "platform_syncing" ||
    state.status === "session_persisting";
}

function isSelectionMutationBlocked(state: WalletSelectionState): boolean {
  return isSelectionBusy(state) ||
    state.status === "complete" ||
    state.status === "conflict" ||
    state.status === "consistency_error" ||
    state.status === "session_sync_pending" ||
    state.status === "sync_error";
}

function getSelectionTarget(
  state: WalletSelectionState,
): WalletSelectionTarget | null {
  if ("operation" in state && state.operation) return state.operation.target;
  if ("target" in state && state.target) return state.target;
  return null;
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
  bindActionSlot: {
    alignItems: "center",
    minHeight: 44,
  },
  bindButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 44,
    width: "100%",
  },
  dangerActionText: {
    color: colors.danger,
    fontWeight: "700",
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
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  selectionAction: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 80,
  },
  selectionActionText: {
    color: colors.primary,
    fontWeight: "700",
  },
  selectionButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 80,
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
  unlinkButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
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
