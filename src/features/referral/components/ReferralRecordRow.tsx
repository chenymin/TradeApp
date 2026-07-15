import { StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { ReferralRecord } from "../domain/rewardModels";
import {
  formatRewardDate,
  formatRewardPoints,
  referralDisplay,
  referralStatusLabel,
  userTypeLabel,
} from "../domain/rewardPresentation";

export function ReferralRecordRow({ record }: { record: ReferralRecord }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText numberOfLines={1} style={styles.identity} variant="body">
          {referralDisplay(record)}
        </AppText>
        <AppText style={styles.points} variant="body">
          +{formatRewardPoints(record.totalPointsAwarded)}
        </AppText>
      </View>
      <AppText variant="caption">
        {userTypeLabel(record.referredUserType)}
        {record.referredTier ? ` · Tier ${record.referredTier}` : ""}
      </AppText>
      <View style={styles.meta}>
        <AppText style={styles.status} variant="caption">
          {referralStatusLabel(record.status)}
        </AppText>
        <AppText variant="caption">{formatRewardDate(record.createdAt)}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  identity: {
    flex: 1,
    fontWeight: "800",
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  points: {
    color: colors.primary,
    fontWeight: "800",
  },
  root: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  status: {
    color: colors.primaryStrong,
    fontWeight: "700",
  },
});
