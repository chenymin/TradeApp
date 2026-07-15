import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react-native";
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import type { ExternalLinkAdapter } from "../../../shared/platform/linkingAdapter";
import {
  AppText,
  Input,
  SegmentedControl,
  colors,
  radii,
  spacing,
} from "../../../shared/ui";
import { DashboardSummary } from "../components/DashboardSummary";
import { formatPoints, formatTier } from "../domain/dashboardFormatting";
import type {
  DashboardHolding,
  DashboardTransaction,
} from "../domain/holdings";
import type { DashboardProfile } from "../domain/dashboardModels";
import type {
  DashboardHoldingsLoader,
} from "../services/dashboardHoldingsLoader";
import type {
  DashboardKycSummary,
} from "../services/dashboardKycRepository";
import type {
  DashboardProfileLoader,
  DashboardViewerState,
} from "../services/dashboardProfileLoader";
import type { NicknameRepository } from "../services/nicknameRepository";
import { createNicknameUpdater } from "../services/nicknameUpdater";
import type { DashboardCommissionResult } from "../services/dashboardCommissionRepository";

type DashboardTab = "holdings" | "transactions";
type DashboardRow =
  | { id: string; kind: "holding"; value: DashboardHolding }
  | { id: string; kind: "transaction"; value: DashboardTransaction };

type HoldingsResult = NonNullable<Awaited<ReturnType<DashboardHoldingsLoader>>>;

export type DashboardDataDependencies = {
  commissionLoader(state: DashboardViewerState): Promise<DashboardCommissionResult | null>;
  holdingsLoader: DashboardHoldingsLoader;
  kycLoader(state: DashboardViewerState): Promise<DashboardKycSummary | null>;
  nicknameRepository: NicknameRepository;
  profileLoader: DashboardProfileLoader;
};

const TABS = [
  { label: "Holdings", value: "holdings" },
  { label: "Transactions", value: "transactions" },
] satisfies Array<{ label: string; value: DashboardTab }>;

export function DashboardScreen({
  commissionLoader,
  externalLinkAdapter,
  holdingsLoader,
  kycLoader,
  nicknameRepository,
  profileLoader,
  viewerState,
}: DashboardDataDependencies & {
  externalLinkAdapter: ExternalLinkAdapter;
  viewerState: DashboardViewerState;
}) {
  const [tab, setTab] = useState<DashboardTab>("holdings");
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [holdings, setHoldings] = useState<HoldingsResult | null>(null);
  const [kyc, setKyc] = useState<DashboardKycSummary | null>(null);
  const [commission, setCommission] = useState<DashboardCommissionResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const nicknameSaveInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!viewerState.isSessionReady || !viewerState.viewer) {
      setStatus("idle");
      setProfile(null);
      setHoldings(null);
      setKyc(null);
      setCommission(null);
      return;
    }

    setStatus("loading");
    const [
      profileResult,
      holdingsResult,
      kycResult,
      commissionResult,
    ] = await Promise.allSettled([
      profileLoader(viewerState),
      holdingsLoader(viewerState),
      kycLoader(viewerState),
      commissionLoader(viewerState),
    ]);
    const nextErrors: string[] = [];

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value);
    } else {
      setProfile(null);
      nextErrors.push("Profile unavailable");
    }

    if (holdingsResult.status === "fulfilled") {
      setHoldings(holdingsResult.value);
    } else {
      setHoldings(null);
      nextErrors.push("Portfolio unavailable");
    }

    if (kycResult.status === "fulfilled") {
      setKyc(kycResult.value);
    } else {
      setKyc(null);
      nextErrors.push("KYC status unavailable");
    }

    if (commissionResult.status === "fulfilled") {
      setCommission(commissionResult.value);
    } else {
      setCommission(null);
      nextErrors.push("Commission summary unavailable");
    }

    setErrors(nextErrors);
    setStatus("ready");
  }, [
    commissionLoader,
    holdingsLoader,
    kycLoader,
    profileLoader,
    viewerState,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const nicknameUpdater = useMemo(() => createNicknameUpdater({
    refreshProfile: async () => {
      const nextProfile = await profileLoader(viewerState);
      setProfile(nextProfile);
    },
    repository: nicknameRepository,
  }), [nicknameRepository, profileLoader, viewerState]);

  const saveNickname = useCallback(async () => {
    if (nicknameSaveInFlight.current) return;
    nicknameSaveInFlight.current = true;

    try {
      const currentNickname = profile?.nickname ?? null;
      if (nicknameDraft.trim() === (currentNickname ?? "").trim()) {
        setEditingNickname(false);
        setNicknameError(null);
        return;
      }

      const result = await nicknameUpdater({
        currentNickname,
        draft: nicknameDraft,
      });

      if (!result.ok) {
        setNicknameError(nicknameErrorLabel(result.reason));
        return;
      }

      setEditingNickname(false);
      setNicknameError(null);
    } catch {
      setNicknameError("Unable to update nickname");
    } finally {
      nicknameSaveInFlight.current = false;
    }
  }, [nicknameDraft, nicknameUpdater, profile?.nickname]);

  const dismissNicknameEditor = useCallback(() => {
    if (!editingNickname) return;
    Keyboard.dismiss();
    void saveNickname();
  }, [editingNickname, saveNickname]);

  if (!viewerState.isSessionReady || !viewerState.viewer) {
    return (
      <View style={styles.centered}>
        <AppText variant="title">Session unavailable</AppText>
        <AppText variant="subtitle">Sign in again to load your dashboard.</AppText>
      </View>
    );
  }

  const rows: DashboardRow[] = tab === "holdings"
    ? (holdings?.holdings ?? []).map((value) => ({
      id: value.assetId,
      kind: "holding" as const,
      value,
    }))
    : (holdings?.transactions ?? []).map((value) => ({
      id: value.id,
      kind: "transaction" as const,
      value,
    }));

  return (
    <View
      onTouchStart={dismissNicknameEditor}
      style={styles.screen}
      testID="dashboard-dismiss-surface"
    >
      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyboardDismissMode="on-drag"
        keyExtractor={(row) => `${row.kind}:${row.id}`}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <AppText style={styles.emptyTitle}>
              {status === "loading"
                ? "Loading dashboard..."
                : tab === "holdings"
                  ? "No holdings yet"
                  : "No transactions yet"}
            </AppText>
            {status !== "loading" ? (
              <AppText variant="caption">
                {tab === "holdings"
                  ? "Assets appear after an indexed purchase and a positive chain balance."
                  : "Indexed purchases will appear here."}
              </AppText>
            ) : null}
          </View>
        )}
        ListHeaderComponent={(
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
                      onBlur={() => { void saveNickname(); }}
                      onChangeText={setNicknameDraft}
                      onSubmitEditing={() => { void saveNickname(); }}
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
                    onPress={() => {
                      setNicknameDraft(profile?.nickname ?? "");
                      setNicknameError(null);
                      setEditingNickname(true);
                    }}
                  >
                    <AppText style={styles.nickname}>
                      {profile?.nickname ?? viewerState.viewer.email ?? "Set nickname"}
                    </AppText>
                  </Pressable>
                )}
              </View>
              <Pressable
                accessibilityLabel="Refresh dashboard"
                accessibilityRole="button"
                onPress={() => { void load(); }}
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
              kycValue={kycLabel(kyc)}
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

            <SegmentedControl onChange={setTab} options={TABS} value={tab} />
          </View>
        )}
        onRefresh={() => { void load(); }}
        refreshing={status === "loading"}
        renderItem={({ item }) => item.kind === "holding"
          ? <HoldingRow holding={item.value} />
          : (
            <TransactionRow
              externalLinkAdapter={externalLinkAdapter}
              transaction={item.value}
            />
          )}
        style={styles.list}
      />
    </View>
  );
}

function HoldingRow({ holding }: { holding: DashboardHolding }) {
  return (
    <View accessibilityLabel={`Holding ${holding.assetId}`} style={styles.row}>
      <View style={styles.rowIdentity}>
        <AppText style={styles.rowTitle}>{holding.title}</AppText>
        <AppText variant="caption">{holding.symbol}</AppText>
      </View>
      <View style={styles.rowNumbers}>
        <AppText style={styles.rowValue}>{money(holding.valueUsdt)}</AppText>
        <AppText variant="caption">
          {quantity(holding.currentShares)} shares · {money(holding.currentPriceUsdt)}
        </AppText>
        <AppText style={holding.gainPercent && isNegative(holding.gainPercent)
          ? styles.negativeSmall
          : styles.positiveSmall}
        >
          {holding.gainPercent === null ? "Cost N/A" : signedPercent(holding.gainPercent)}
        </AppText>
      </View>
    </View>
  );
}

function TransactionRow({
  externalLinkAdapter,
  transaction,
}: {
  externalLinkAdapter: ExternalLinkAdapter;
  transaction: DashboardTransaction;
}) {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowIdentity}>
        <AppText style={styles.buyLabel}>Buy</AppText>
        <AppText style={styles.rowTitle}>{transaction.symbol}</AppText>
        <AppText variant="caption">{dateLabel(transaction.timestamp)}</AppText>
      </View>
      <View style={styles.rowNumbers}>
        <AppText style={styles.rowValue}>{money(transaction.amountUsdt)}</AppText>
        <AppText variant="caption">
          {quantity(transaction.shares)} shares · {money(transaction.priceUsdt)}
        </AppText>
        <AppText variant="caption">{shortHash(transaction.txHash)}</AppText>
      </View>
    </View>
  );

  if (!transaction.explorerUrl) {
    return content;
  }

  return (
    <Pressable
      accessibilityLabel={`Open transaction ${transaction.id}`}
      onPress={() => { void externalLinkAdapter.open(transaction.explorerUrl!); }}
    >
      {content}
    </Pressable>
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

function quantity(value: string): string {
  return displayNumber(value, 4);
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

function dateLabel(value: string | null): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleDateString("en-CA");
}

function shortHash(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function nicknameErrorLabel(reason: "blank" | "too_long" | "unchanged"): string {
  if (reason === "blank") return "Nickname cannot be blank";
  if (reason === "too_long") return "Nickname is too long";
  return "Nickname is unchanged";
}

const styles = StyleSheet.create({
  buyLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  centered: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.background,
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  header: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  list: {
    flex: 1,
  },
  negativeSmall: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
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
    borderColor: colors.primary,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    fontSize: 14,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  positiveSmall: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
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
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  rowIdentity: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  rowNumbers: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  rowTitle: {
    fontWeight: "700",
  },
  rowValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
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
