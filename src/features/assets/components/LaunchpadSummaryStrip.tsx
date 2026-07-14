import { ScrollView, StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "../../../shared/ui";
import type { PublicAssetSummary } from "../domain/assetModels";

type LaunchpadMetric = {
  emphasis: "primary" | "neutral" | "muted";
  helper: string;
  id: "totalValueLocked" | "activeProjects" | "participants" | "completedSales";
  label: string;
  value: string;
};

export function LaunchpadSummaryStrip({ assets }: { assets: PublicAssetSummary[] }) {
  const metrics = buildMetrics(assets);

  return (
    <ScrollView
      accessibilityLabel="Launchpad summary"
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {metrics.map((metric) => (
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

function buildMetrics(assets: PublicAssetSummary[]): LaunchpadMetric[] {
  let active = 0;
  let upcoming = 0;
  let completed = 0;
  let participants = 0;

  for (const asset of assets) {
    if (asset.saleStatus === "active") active += 1;
    if (asset.saleStatus === "upcoming") upcoming += 1;
    if (asset.saleStatus === "completed" || asset.saleStatus === "sold_out") completed += 1;
    participants += asset.participantsCount;
  }

  return [
    { emphasis: "primary", helper: "+23.4% 本月", id: "totalValueLocked", label: "总锁仓价值", value: "$12.5M" },
    { emphasis: "neutral", helper: `${upcoming} 个即将开始`, id: "activeProjects", label: "活跃项目", value: String(active) },
    { emphasis: "neutral", helper: "来自 45 个国家", id: "participants", label: "总参与者", value: participants.toLocaleString("en-US") },
    { emphasis: completed > 0 ? "neutral" : "muted", helper: "100% 成功率", id: "completedSales", label: "完成发售", value: String(completed) },
  ];
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
