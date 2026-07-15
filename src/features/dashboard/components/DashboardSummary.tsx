import {
  LayoutGrid,
  ShieldCheck,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, colors, radii, spacing } from "../../../shared/ui";

type MetricTone = "default" | "negative" | "positive";

export type DashboardSummaryProps = {
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

type MetricTileProps = {
  accessibilityLabel: string;
  emphasized?: boolean;
  icon: LucideIcon;
  label: string;
  secondaryValue?: string;
  tone?: MetricTone;
  value: string;
};

export function DashboardSummary({
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
      <View style={styles.metricGrid}>
        <MetricTile
          accessibilityLabel="Portfolio value metric"
          emphasized
          icon={Wallet}
          label="Portfolio value"
          value={portfolioValue}
        />
        <MetricTile
          accessibilityLabel="Total PnL metric"
          icon={TrendingUp}
          label="Total PnL"
          secondaryValue={pnlPercent}
          tone={pnlTone}
          value={pnlAmount}
        />
        <MetricTile
          accessibilityLabel="Tier and points metric"
          icon={LayoutGrid}
          label="Tier / points"
          secondaryValue={pointsValue}
          value={tierValue}
        />
        <MetricTile
          accessibilityLabel="KYC metric"
          icon={ShieldCheck}
          label="KYC status"
          tone={kycTone}
          value={kycValue}
        />
      </View>

      <View accessibilityLabel="Commission summary" style={styles.commissionRow}>
        <AppText variant="caption">Commission earned</AppText>
        <AppText style={styles.commissionValue}>{commissionValue}</AppText>
      </View>
    </View>
  );
}

function MetricTile({
  accessibilityLabel,
  emphasized = false,
  icon: Icon,
  label,
  secondaryValue,
  tone = "default",
  value,
}: MetricTileProps) {
  const statusStyle = tone === "negative"
    ? styles.negative
    : tone === "positive"
      ? styles.positive
      : undefined;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.metricTile, emphasized && styles.emphasizedTile]}
    >
      <View style={styles.metricHeading}>
        <Icon
          color={emphasized ? colors.primaryMuted : colors.muted}
          size={17}
          strokeWidth={2.2}
        />
        <AppText style={[styles.metricLabel, emphasized && styles.emphasizedLabel]}>
          {label}
        </AppText>
      </View>

      <View style={styles.metricNumbers}>
        <AppText
          style={[
            styles.metricValue,
            emphasized && styles.emphasizedValue,
            !emphasized && statusStyle,
          ]}
        >
          {value}
        </AppText>
        {secondaryValue ? (
          <AppText style={[styles.metricSecondary, statusStyle]}>
            {secondaryValue}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  commissionRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commissionValue: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
  },
  emphasizedLabel: {
    color: colors.primaryMuted,
  },
  emphasizedTile: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  emphasizedValue: {
    color: colors.surface,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  metricHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  metricNumbers: {
    gap: spacing.xs,
  },
  metricSecondary: {
    fontSize: 14,
    fontWeight: "700",
  },
  metricTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 116,
    padding: spacing.md,
    width: "48%",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  negative: {
    color: colors.danger,
  },
  positive: {
    color: colors.primary,
  },
  summary: {
    gap: spacing.sm,
  },
});
