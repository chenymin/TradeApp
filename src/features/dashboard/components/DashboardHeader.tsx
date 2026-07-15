import { RefreshCw } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  Input,
  SegmentedControl,
  colors,
  radii,
  spacing,
  type SegmentedControlOption,
} from "../../../shared/ui";
import { formatPoints, formatTier } from "../domain/dashboardFormatting";
import type { DashboardProfile } from "../domain/dashboardModels";
import type { DashboardCommissionResult } from "../services/dashboardCommissionRepository";
import type { DashboardHoldingsResult } from "../services/dashboardHoldingsLoader";
import type { DashboardKycSummary } from "../services/dashboardKycRepository";
import { DashboardSummary } from "./DashboardSummary";

export type DashboardTab =
  | "holdings"
  | "transactions"
  | "whitelist"
  | "rewards";

export type DashboardHeaderProps = {
  commission: DashboardCommissionResult | null;
  editingNickname: boolean;
  errors: string[];
  holdings: DashboardHoldingsResult | null;
  kyc: DashboardKycSummary | null;
  kycUnavailable: boolean;
  nicknameDraft: string;
  nicknameError: string | null;
  onBeginNicknameEdit(): void;
  onChangeNickname(value: string): void;
  onFinishNicknameEdit(): void;
  onRefresh(): void;
  onTabChange(tab: DashboardTab): void;
  profile: DashboardProfile | null;
  tab: DashboardTab;
  viewerEmail: string | null;
};

const DASHBOARD_TABS = [
  { label: "Holdings", value: "holdings" },
  { label: "Transactions", value: "transactions" },
  { label: "Whitelist", value: "whitelist" },
  { label: "Rewards", value: "rewards" },
] satisfies Array<SegmentedControlOption<DashboardTab>>;

export function DashboardHeader({
  commission,
  editingNickname,
  errors,
  holdings,
  kyc,
  kycUnavailable,
  nicknameDraft,
  nicknameError,
  onBeginNicknameEdit,
  onChangeNickname,
  onFinishNicknameEdit,
  onRefresh,
  onTabChange,
  profile,
  tab,
  viewerEmail,
}: DashboardHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <AppText style={styles.title}>Dashboard</AppText>
          {editingNickname ? (
            <View
              onTouchStart={(event) => event.stopPropagation()}
              style={styles.nicknameEditor}
            >
              <Input
                accessibilityLabel="Nickname"
                autoFocus
                onBlur={onFinishNicknameEdit}
                onChangeText={onChangeNickname}
                onSubmitEditing={onFinishNicknameEdit}
                placeholder="Set nickname"
                returnKeyType="done"
                selectTextOnFocus
                style={styles.nicknameInput}
                submitBehavior="blurAndSubmit"
                value={nicknameDraft}
              />
              {nicknameError ? (
                <AppText style={styles.errorText}>{nicknameError}</AppText>
              ) : null}
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Edit nickname"
              onPress={onBeginNicknameEdit}
            >
              <AppText style={styles.nickname}>
                {profile?.nickname ?? viewerEmail ?? "Set nickname"}
              </AppText>
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityLabel="Refresh dashboard"
          accessibilityRole="button"
          onPress={onRefresh}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshButtonPressed,
          ]}
        >
          <RefreshCw color={colors.primary} size={19} strokeWidth={2.4} />
        </Pressable>
      </View>

      {errors.length ? (
        <View style={styles.warning}>
          <AppText style={styles.warningText}>{errors.join(" · ")}</AppText>
        </View>
      ) : null}

      <DashboardSummary
        commissionValue={commissionLabel(commission)}
        kycTone={kyc?.approved ? "positive" : "default"}
        kycValue={kycUnavailable ? "Unavailable" : kycLabel(kyc)}
        pnlAmount={signedMoney(holdings?.summary.totalPnlUsdt ?? "0")}
        pnlPercent={signedPercent(holdings?.summary.pnlPercent ?? "0")}
        pnlTone={isNegative(holdings?.summary.totalPnlUsdt) ? "negative" : "positive"}
        pointsValue={`${formatPoints(profile?.totalPoints)} points`}
        portfolioValue={money(holdings?.summary.totalValueUsdt ?? "0")}
        tierValue={`Tier ${formatTier(profile?.tier)}`}
      />

      {holdings?.warnings.length ? (
        <AppText variant="caption">
          Some chain balances are temporarily unavailable.
        </AppText>
      ) : null}

      <SegmentedControl
        onChange={onTabChange}
        options={DASHBOARD_TABS}
        value={tab}
      />
    </View>
  );
}

function money(value: string): string {
  return `$${displayNumber(value, 2)}`;
}

function signedMoney(value: string): string {
  return `${isNegative(value) ? "-" : "+"}$${displayNumber(value.replace(/^-/, ""), 2)}`;
}

function signedPercent(value: string): string {
  return `${isNegative(value) ? "" : "+"}${displayNumber(value, 2)}%`;
}

function displayNumber(value: string, maximumFractionDigits: number): string {
  const numeric = Number(value);
  return (Number.isFinite(numeric) ? numeric : 0).toLocaleString("en-US", {
    minimumFractionDigits: maximumFractionDigits === 2 ? 2 : 0,
    maximumFractionDigits,
  });
}

function isNegative(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith("-"));
}

function kycLabel(summary: DashboardKycSummary | null): string {
  if (summary?.status === "approved") return "Verified";
  if (summary?.status === "under_review") return "Under review";
  if (summary?.status === "awaiting_resubmission") return "Action required";
  if (summary?.status === "rejected") return "Not approved";
  if (summary?.status === "pending") return "Pending";
  return "Not started";
}

function commissionLabel(result: DashboardCommissionResult | null): string {
  if (!result || result.status === "unavailable") return "Unavailable";
  return `${money(result.summary.lifetimeTotalUsdt)} lifetime`;
}

const styles = StyleSheet.create({
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  header: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  nickname: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  nicknameEditor: {
    gap: spacing.xs,
    width: 220,
  },
  nicknameInput: {
    borderBottomWidth: 1,
    borderColor: colors.primary,
    borderRadius: 0,
    borderWidth: 0,
    fontSize: 14,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  refreshButtonPressed: {
    opacity: 0.72,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  warning: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 6,
    padding: spacing.sm,
  },
  warningText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
