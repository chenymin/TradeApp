import { StyleSheet, View } from "react-native";

import { AppText, colors, radii, spacing } from "../../../shared/ui";

type MetricTone = "default" | "negative" | "positive";

export type DashboardSummaryProps = {
  assetCountValue: string;
  commissionValue: string;
  kycTone: MetricTone;
  kycValue: string;
  pnlAmount: string;
  pnlPercent: string;
  pnlTone: MetricTone;
  pointsValue: string;
  portfolioValue: string;
  tierValue: string;
};

type CompactMetricProps = {
  accessibilityLabel: string;
  label: string;
  secondaryValue?: string;
  tone?: MetricTone;
  value: string;
};

export function DashboardSummary({
  assetCountValue,
  commissionValue,
  kycTone,
  kycValue,
  pnlAmount,
  pnlPercent,
  pnlTone,
  pointsValue,
  portfolioValue,
  tierValue,
}: DashboardSummaryProps) {
  return (
    <View style={styles.summary}>
      <View accessibilityLabel="Portfolio value metric" style={styles.hero}>
        <AppText style={styles.heroLabel} variant="label">
          Portfolio value
        </AppText>
        <AppText
          accessibilityLabel="Portfolio value"
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          numberOfLines={1}
          numeric
          style={styles.heroValue}
          variant="display"
        >
          {portfolioValue}
        </AppText>
        <View accessibilityLabel="Total PnL metric" style={styles.heroPnl}>
          <AppText style={styles.heroPnlLabel} variant="caption">
            Total PnL
          </AppText>
          <View style={styles.heroPnlValues}>
            <AppText numeric style={[styles.heroPnlValue, toneStyle(pnlTone)]}>
              {pnlAmount}
            </AppText>
            {pnlPercent ? (
              <AppText numeric style={[styles.heroPnlPercent, toneStyle(pnlTone)]}>
                {pnlPercent}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <CompactMetric
          accessibilityLabel="Tier and points metric"
          label="Tier / points"
          secondaryValue={pointsValue}
          value={tierValue}
        />
        <CompactMetric
          accessibilityLabel="KYC metric"
          label="KYC status"
          tone={kycTone}
          value={kycValue}
        />
        <CompactMetric
          accessibilityLabel="Commission summary"
          label="Commission earned"
          value={commissionValue}
        />
        <CompactMetric
          accessibilityLabel="Asset count metric"
          label="Assets"
          value={assetCountValue}
        />
      </View>
    </View>
  );
}

function CompactMetric({
  accessibilityLabel,
  label,
  secondaryValue,
  tone = "default",
  value,
}: CompactMetricProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.metric}>
      <AppText style={styles.metricLabel} variant="caption">
        {label}
      </AppText>
      <View style={styles.metricNumbers}>
        <AppText
          adjustsFontSizeToFit
          minimumFontScale={0.76}
          numberOfLines={1}
          numeric
          style={[styles.metricValue, toneStyle(tone)]}
        >
          {value}
        </AppText>
        {secondaryValue ? (
          <AppText style={[styles.metricSecondary, toneStyle(tone)]}>
            {secondaryValue}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function toneStyle(tone: MetricTone) {
  if (tone === "negative") return styles.negative;
  if (tone === "positive") return styles.positive;
  return undefined;
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    minHeight: 156,
    padding: spacing.lg,
  },
  heroLabel: {
    color: colors.primaryMuted,
  },
  heroPnl: {
    borderTopColor: "rgba(255, 255, 255, 0.16)",
    borderTopWidth: 1,
    marginTop: "auto",
    paddingTop: spacing.md,
  },
  heroPnlLabel: {
    color: colors.primaryMuted,
  },
  heroPnlPercent: {
    fontSize: 13,
    fontWeight: "700",
  },
  heroPnlValue: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800",
  },
  heroPnlValues: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroValue: {
    color: colors.surface,
    marginTop: spacing.xs,
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
  metricLabel: {
    color: colors.muted,
  },
  metricNumbers: {
    gap: spacing.xs,
  },
  metricSecondary: {
    fontSize: 13,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  negative: {
    color: colors.danger,
  },
  positive: {
    color: colors.primary,
  },
  summary: {
    gap: spacing.md,
  },
});
