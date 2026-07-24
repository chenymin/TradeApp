import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import type { ExternalLinkAdapter } from "../../../shared/platform/linkingAdapter";
import { AppText, colors, spacing } from "../../../shared/ui";
import {
  RewardsScreen,
  type RewardsDataDependencies,
} from "../../referral/screens/RewardsScreen";
import {
  DashboardHeader,
  type DashboardTab,
} from "../components/DashboardHeader";
import { DashboardRowsSkeleton } from "../components/DashboardRowsSkeleton";
import type {
  DashboardHolding,
  DashboardTransaction,
} from "../domain/holdings";
import type { DashboardProfile } from "../domain/dashboardModels";
import type {
  DashboardHoldingsLoader,
  DashboardHoldingsResult,
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
import type { KycIdentityDetailsClient } from "../services/kycIdentityDetailsClient";
import {
  WhitelistScreen,
  type WhitelistStatusState,
} from "./WhitelistScreen";

type DashboardRow =
  | { id: string; kind: "holding"; value: DashboardHolding }
  | { id: string; kind: "transaction"; value: DashboardTransaction };

export type DashboardDataDependencies = {
  commissionLoader(state: DashboardViewerState): Promise<DashboardCommissionResult | null>;
  fetchAccessToken(): Promise<string | null>;
  holdingsLoader: DashboardHoldingsLoader;
  identityClient: KycIdentityDetailsClient;
  kycLoader(state: DashboardViewerState): Promise<DashboardKycSummary | null>;
  nicknameRepository: NicknameRepository;
  profileLoader: DashboardProfileLoader;
};

export function DashboardScreen({
  commissionLoader,
  externalLinkAdapter,
  fetchAccessToken,
  holdingsLoader,
  identityClient,
  initialTab = "holdings",
  kycLoader,
  nicknameRepository,
  profileLoader,
  rewardsDependencies,
  viewerState,
}: DashboardDataDependencies & {
  externalLinkAdapter: ExternalLinkAdapter;
  initialTab?: DashboardTab;
  rewardsDependencies: RewardsDataDependencies;
  viewerState: DashboardViewerState;
}) {
  const [tab, setTab] = useState<DashboardTab>(initialTab);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [holdings, setHoldings] = useState<DashboardHoldingsResult | null>(null);
  const [kycState, setKycState] = useState<WhitelistStatusState>({ status: "loading" });
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
      setKycState({ status: "loading" });
      setCommission(null);
      return;
    }

    setStatus("loading");
    setKycState({ status: "loading" });
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
      if (kycResult.value) {
        setKycState({ data: kycResult.value, status: "ready" });
      } else {
        setKycState({ status: "error" });
        nextErrors.push("KYC status unavailable");
      }
    } else {
      setKycState({ status: "error" });
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

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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

  const viewer = viewerState.viewer;

  const kyc = kycState.status === "ready" ? kycState.data : null;
  const renderHeader = (onRefresh: () => Promise<void>) => (
    <DashboardHeader
      commission={commission}
      editingNickname={editingNickname}
      errors={errors}
      holdings={holdings}
      kyc={kyc}
      kycUnavailable={kycState.status === "error"}
      loading={status !== "ready"}
      nicknameDraft={nicknameDraft}
      nicknameError={nicknameError}
      onBeginNicknameEdit={() => {
        setNicknameDraft(profile?.nickname ?? "");
        setNicknameError(null);
        setEditingNickname(true);
      }}
      onChangeNickname={setNicknameDraft}
      onFinishNicknameEdit={() => { void saveNickname(); }}
      onRefresh={() => { void onRefresh(); }}
      onTabChange={setTab}
      profile={profile}
      tab={tab}
      viewerEmail={viewer.email}
    />
  );

  let body;
  if (tab === "whitelist") {
    body = (
      <WhitelistScreen
        fetchAccessToken={fetchAccessToken}
        identityClient={identityClient}
        onRefreshCommon={load}
        renderHeader={renderHeader}
        statusState={kycState}
        viewerId={viewer.id}
      />
    );
  } else if (tab === "rewards") {
    body = (
      <RewardsScreen
        dependencies={rewardsDependencies}
        onRefreshCommon={load}
        renderHeader={renderHeader}
        viewerState={viewerState}
      />
    );
  } else {
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

    body = (
      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyboardDismissMode="on-drag"
        keyExtractor={(row) => `${row.kind}:${row.id}`}
        ListEmptyComponent={status !== "ready"
          ? <DashboardRowsSkeleton />
          : (
            <View style={styles.empty}>
              <AppText style={styles.emptyTitle}>
                {tab === "holdings" ? "No holdings yet" : "No transactions yet"}
              </AppText>
              <AppText variant="caption">
                {tab === "holdings"
                  ? "Assets appear after an indexed purchase and a positive chain balance."
                  : "Indexed purchases will appear here."}
              </AppText>
            </View>
          )}
        ListHeaderComponent={renderHeader(load)}
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
    );
  }

  return (
    <View
      onTouchStart={dismissNicknameEditor}
      style={styles.screen}
      testID="dashboard-dismiss-surface"
    >
      {body}
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
  list: {
    flex: 1,
  },
  negativeSmall: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  positiveSmall: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
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
});
