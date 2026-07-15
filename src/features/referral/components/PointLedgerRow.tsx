import { StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { PointLedgerEntry } from "../domain/rewardModels";
import {
  formatLedgerAmount,
  formatLedgerBalance,
  formatRewardDate,
  pointTypeLabel,
} from "../domain/rewardPresentation";

export function PointLedgerRow({ entry }: { entry: PointLedgerEntry }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText numberOfLines={2} style={styles.source} variant="body">
          {entry.source ?? pointTypeLabel(entry.pointType)}
        </AppText>
        <AppText style={styles.amount} variant="body">
          {formatLedgerAmount(entry.amount)}
        </AppText>
      </View>
      <AppText variant="caption">{pointTypeLabel(entry.pointType)}</AppText>
      <View style={styles.meta}>
        <AppText variant="caption">
          Balance {formatLedgerBalance(entry.balanceAfter)}
        </AppText>
        <AppText variant="caption">{formatRewardDate(entry.createdAt)}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.primary,
    fontWeight: "800",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  root: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  source: {
    flex: 1,
    fontWeight: "800",
  },
});
