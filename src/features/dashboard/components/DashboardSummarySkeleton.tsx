import { StyleSheet, View } from "react-native";

import {
  SkeletonBlock,
  SkeletonGroup,
  colors,
  radii,
  spacing,
} from "../../../shared/ui";

export function DashboardSummarySkeleton() {
  return (
    <SkeletonGroup accessibilityLabel="Dashboard loading" style={styles.summary}>
      <View style={styles.hero}>
        <SkeletonBlock height={14} radius={radii.sm} width="34%" />
        <SkeletonBlock height={36} radius={radii.md} tone="strong" width="76%" />
        <View style={styles.heroDetail}>
          <SkeletonBlock height={12} radius={radii.sm} width="28%" />
          <SkeletonBlock height={18} radius={radii.sm} tone="strong" width="46%" />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </View>
    </SkeletonGroup>
  );
}

function MetricSkeleton() {
  return (
    <View style={styles.metric}>
      <SkeletonBlock height={12} radius={radii.sm} width="54%" />
      <SkeletonBlock height={20} radius={radii.sm} tone="strong" width="72%" />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    gap: spacing.sm,
    minHeight: 156,
    padding: spacing.lg,
  },
  heroDetail: {
    borderTopColor: "rgba(255, 255, 255, 0.16)",
    borderTopWidth: 1,
    gap: spacing.xs,
    marginTop: "auto",
    paddingTop: spacing.md,
  },
  metric: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    minHeight: 76,
    paddingVertical: spacing.md,
    width: "48%",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summary: {
    gap: spacing.md,
  },
});
