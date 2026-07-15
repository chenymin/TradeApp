import { StyleSheet, View } from "react-native";

import { AppText, colors, radii, spacing } from "../../../shared/ui";
import type { RewardsProfile } from "../domain/rewardModels";
import { formatRewardPoints } from "../domain/rewardPresentation";

const BALANCES: Array<{
  key: keyof Pick<
    RewardsProfile,
    "referralPoints" | "reputationPoints" | "taskPoints" | "tradingPoints"
  >;
  label: string;
}> = [
  { key: "referralPoints", label: "Referral points" },
  { key: "tradingPoints", label: "Trading points" },
  { key: "reputationPoints", label: "Reputation points" },
  { key: "taskPoints", label: "Task points" },
];

export function PointsSummary({ profile }: { profile: RewardsProfile }) {
  return (
    <View style={styles.root}>
      <View style={styles.totalRow}>
        <View>
          <AppText style={styles.eyebrow} variant="caption">Total points</AppText>
          <AppText style={styles.total} variant="title">
            {formatRewardPoints(profile.totalPoints)}
          </AppText>
        </View>
        <View accessibilityLabel={`Tier ${profile.tier ?? "unavailable"}`} style={styles.tier}>
          <AppText style={styles.tierText} variant="body">
            {profile.tier ? `Tier ${profile.tier}` : "Tier unavailable"}
          </AppText>
        </View>
      </View>
      <View style={styles.grid}>
        {BALANCES.map(({ key, label }) => (
          <View key={key} style={styles.balance}>
            <AppText style={styles.balanceLabel} variant="caption">{label}</AppText>
            <AppText style={styles.balanceValue} variant="body">
              {formatRewardPoints(profile[key])}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 76,
    padding: spacing.md,
  },
  balanceLabel: {
    color: colors.muted,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  eyebrow: {
    color: colors.muted,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  root: {
    gap: spacing.lg,
  },
  tier: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tierText: {
    color: colors.primaryStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  total: {
    fontSize: 36,
    textAlign: "left",
  },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
