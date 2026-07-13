import { ScrollView, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";

type LaunchpadMetric = {
  emphasis: "primary" | "neutral" | "muted";
  helper: string;
  id: "totalValueLocked" | "activeProjects" | "participants" | "completedSales";
  label: string;
  value: string;
};

const METRICS: LaunchpadMetric[] = [
  { emphasis: "primary", helper: "+23.4% 本月", id: "totalValueLocked", label: "总锁仓价值", value: "$12.5M" },
  { emphasis: "neutral", helper: "3 个即将开始", id: "activeProjects", label: "活跃项目", value: "1" },
  { emphasis: "neutral", helper: "来自 45 个国家", id: "participants", label: "总参与者", value: "8" },
  { emphasis: "muted", helper: "100% 成功率", id: "completedSales", label: "完成发售", value: "0" },
];

export function LaunchpadSummaryStrip() {
  return (
    <ScrollView
      accessibilityLabel="Launchpad summary"
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {METRICS.map((metric) => (
        <View
          accessibilityLabel={`Metric ${metric.label}`}
          key={metric.id}
          style={[styles.metric, metric.emphasis === "muted" ? styles.muted : null]}
        >
          <AppText variant="caption">{metric.label}</AppText>
          <AppText style={metric.emphasis === "primary" ? styles.primaryValue : styles.value}>
            {metric.value}
          </AppText>
          <View style={styles.helperPill}>
            <AppText variant="caption">{metric.helper}</AppText>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  helperPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 112,
    padding: spacing.md,
    width: 168,
  },
  muted: {
    opacity: 0.68,
  },
  primaryValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
  },
});
