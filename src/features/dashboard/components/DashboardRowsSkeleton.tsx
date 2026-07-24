import { StyleSheet, View } from "react-native";

import {
  SkeletonBlock,
  SkeletonGroup,
  colors,
  radii,
  spacing,
} from "../../../shared/ui";

export function DashboardRowsSkeleton() {
  return (
    <SkeletonGroup accessibilityLabel="Dashboard rows loading">
      <RowSkeleton />
      <RowSkeleton />
    </SkeletonGroup>
  );
}

function RowSkeleton() {
  return (
    <View style={styles.row}>
      <View style={styles.identity}>
        <SkeletonBlock height={16} radius={radii.sm} tone="strong" width="68%" />
        <SkeletonBlock height={12} radius={radii.sm} width="38%" />
      </View>
      <View style={styles.amount}>
        <SkeletonBlock height={18} radius={radii.sm} tone="strong" width={92} />
        <SkeletonBlock height={12} radius={radii.sm} width={116} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
});
