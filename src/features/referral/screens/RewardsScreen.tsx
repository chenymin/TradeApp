import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import type { AuthViewer } from "../../auth/domain/authViewer";
import type { DashboardKycSummary } from "../../dashboard/services/dashboardKycRepository";
import type { DashboardViewerState } from "../../dashboard/services/dashboardProfileLoader";
import { AppText, SegmentedControl, colors, spacing } from "../../../shared/ui";
import { CommissionUnavailableState } from "../components/CommissionUnavailableState";
import { InviteSection } from "../components/InviteSection";
import { PointLedgerRow } from "../components/PointLedgerRow";
import { PointsSummary } from "../components/PointsSummary";
import { ReferralRecordRow } from "../components/ReferralRecordRow";
import { TierBenefitsSection } from "../components/TierBenefitsSection";
import type {
  PointLedgerEntry,
  ReferralRecord,
  RewardsProfile,
} from "../domain/rewardModels";
import type { PointLedgerRepository } from "../services/pointLedgerRepository";
import type { ReferralRecordsClient } from "../services/referralRecordsClient";
import type { RewardsProfileRepository } from "../services/rewardsProfileRepository";

type AsyncState<T> =
  | { status: "idle" | "loading" }
  | { data: T; status: "ready" }
  | { error: "auth" | "permission" | "unavailable"; status: "error" };

type RewardsTab = "commission" | "points" | "referrals";
type RewardsListRow =
  | { id: string; kind: "point"; value: PointLedgerEntry }
  | { id: string; kind: "referral"; value: ReferralRecord };

export type RewardsDataDependencies = {
  fetchAccessToken(): Promise<string | null>;
  kycLoader(state: DashboardViewerState): Promise<DashboardKycSummary | null>;
  pointLedgerRepository: PointLedgerRepository;
  referralRecordsClient: ReferralRecordsClient;
  rewardsProfileRepository: RewardsProfileRepository;
};

const TABS = [
  { accessibilityLabel: "Rewards tab Referrals", label: "Referrals", value: "referrals" },
  { accessibilityLabel: "Rewards tab Points", label: "Points", value: "points" },
  { accessibilityLabel: "Rewards tab Commission", label: "Commission", value: "commission" },
] satisfies Array<{
  accessibilityLabel: string;
  label: string;
  value: RewardsTab;
}>;

export function RewardsScreen({
  dependencies,
  onOpenInvite,
  onOpenKyc,
  publicWebOrigin,
  viewerState,
}: {
  dependencies: RewardsDataDependencies;
  onOpenInvite: (value: { inviteCode: string; webOrigin: string }) => void;
  onOpenKyc: () => void;
  publicWebOrigin?: string;
  viewerState: { isSessionReady: boolean; viewer: AuthViewer | null };
}) {
  const [profile, setProfile] = useState<AsyncState<RewardsProfile>>({ status: "idle" });
  const [kyc, setKyc] = useState<AsyncState<DashboardKycSummary | null>>({ status: "idle" });
  const [points, setPoints] = useState<AsyncState<PointLedgerEntry[]>>({ status: "idle" });
  const [referrals, setReferrals] = useState<AsyncState<ReferralRecord[]>>({ status: "idle" });
  const [tab, setTab] = useState<RewardsTab>("referrals");
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const viewerId = viewerState.viewer?.id ?? null;

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const loadProfile = useCallback(async () => {
    if (!viewerId) return;
    setProfile({ status: "loading" });
    try {
      const data = await dependencies.rewardsProfileRepository.fetchProfile(viewerId);
      if (mounted.current) setProfile({ data, status: "ready" });
    } catch {
      if (mounted.current) setProfile({ error: "unavailable", status: "error" });
    }
  }, [dependencies.rewardsProfileRepository, viewerId]);

  const loadKyc = useCallback(async () => {
    if (!viewerId) return;
    setKyc({ status: "loading" });
    try {
      const data = await dependencies.kycLoader(viewerState);
      if (mounted.current) setKyc({ data, status: "ready" });
    } catch {
      if (mounted.current) setKyc({ error: "unavailable", status: "error" });
    }
  }, [dependencies, viewerId, viewerState]);

  const loadPoints = useCallback(async () => {
    if (!viewerId) return;
    setPoints({ status: "loading" });
    try {
      const data = await dependencies.pointLedgerRepository.fetchRecent(viewerId);
      if (mounted.current) setPoints({ data, status: "ready" });
    } catch {
      if (mounted.current) setPoints({ error: "unavailable", status: "error" });
    }
  }, [dependencies.pointLedgerRepository, viewerId]);

  const loadReferrals = useCallback(async () => {
    setReferrals({ status: "loading" });
    try {
      const accessToken = await dependencies.fetchAccessToken();
      if (!accessToken) {
        if (mounted.current) setReferrals({ error: "auth", status: "error" });
        return;
      }
      const data = await dependencies.referralRecordsClient.fetchRecords(accessToken);
      if (mounted.current) setReferrals({ data, status: "ready" });
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      const reason = code === "unauthorized"
        ? "auth"
        : code === "forbidden"
          ? "permission"
          : "unavailable";
      if (mounted.current) setReferrals({ error: reason, status: "error" });
    }
  }, [dependencies]);

  const loadAll = useCallback(async () => {
    if (!viewerState.isSessionReady || !viewerId) return;
    await Promise.all([loadProfile(), loadKyc(), loadPoints(), loadReferrals()]);
  }, [loadKyc, loadPoints, loadProfile, loadReferrals, viewerId, viewerState.isSessionReady]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    if (mounted.current) setRefreshing(false);
  }, [loadAll]);

  const rows = useMemo<RewardsListRow[]>(() => {
    if (tab === "referrals" && referrals.status === "ready") {
      return referrals.data.map((value) => ({ id: value.id, kind: "referral", value }));
    }
    if (tab === "points" && points.status === "ready") {
      return points.data.map((value) => ({ id: value.id, kind: "point", value }));
    }
    return [];
  }, [points, referrals, tab]);

  if (!viewerState.isSessionReady || !viewerState.viewer) {
    return (
      <View style={styles.state}>
        <AppText style={styles.stateTitle} variant="body">Session unavailable</AppText>
        <AppText variant="caption">Sign in again to load My Rewards.</AppText>
      </View>
    );
  }

  const empty = renderListState({ points, referrals, retryReferrals: loadReferrals, tab });

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={rows}
      keyboardDismissMode="on-drag"
      keyExtractor={(row) => `${row.kind}:${row.id}`}
      ListEmptyComponent={empty}
      ListHeaderComponent={(
        <View style={styles.header}>
          <AppText style={styles.screenTitle} variant="title">My Rewards</AppText>
          {profile.status === "ready" ? (
            <PointsSummary profile={profile.data} />
          ) : profile.status === "error" ? (
            <InlineState title="Rewards summary unavailable" />
          ) : (
            <InlineState title="Loading rewards summary..." />
          )}
          <InviteSection
            inviteCode={profile.status === "ready" ? profile.data.inviteCode : null}
            kycApproved={kyc.status === "ready" ? (kyc.data?.approved ?? false) : null}
            onOpenInvite={onOpenInvite}
            onOpenKyc={onOpenKyc}
            publicWebOrigin={publicWebOrigin}
          />
          {profile.status === "ready" ? (
            <TierBenefitsSection tier={profile.data.tier} />
          ) : null}
          <SegmentedControl onChange={setTab} options={TABS} value={tab} />
        </View>
      )}
      onRefresh={refresh}
      refreshing={refreshing}
      renderItem={({ item }) => item.kind === "referral"
        ? <ReferralRecordRow record={item.value} />
        : <PointLedgerRow entry={item.value} />}
    />
  );
}

function renderListState({
  points,
  referrals,
  retryReferrals,
  tab,
}: {
  points: AsyncState<PointLedgerEntry[]>;
  referrals: AsyncState<ReferralRecord[]>;
  retryReferrals: () => Promise<void>;
  tab: RewardsTab;
}) {
  if (tab === "commission") return <CommissionUnavailableState />;
  const state = tab === "referrals" ? referrals : points;
  if (state.status === "loading" || state.status === "idle") {
    return <InlineState title={tab === "referrals" ? "Loading referral records..." : "Loading point activity..."} />;
  }
  if (state.status === "error") {
    if (tab === "referrals") {
      return (
        <InlineState
          action={{ label: "Retry referral records", onPress: retryReferrals }}
          title={state.error === "auth" ? "Sign in again to load referrals" : "Referral records unavailable"}
        />
      );
    }
    return <InlineState title="Point activity unavailable" />;
  }
  return <InlineState title={tab === "referrals" ? "No referral records yet" : "No point activity yet"} />;
}

function InlineState({
  action,
  title,
}: {
  action?: { label: string; onPress: () => void | Promise<void> };
  title: string;
}) {
  return (
    <View style={styles.state}>
      <AppText style={styles.stateTitle} variant="body">{title}</AppText>
      {action ? (
        <Pressable accessibilityLabel={action.label} onPress={action.onPress}>
          <AppText style={styles.retry} variant="caption">Retry</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  retry: {
    color: colors.primary,
    fontWeight: "800",
  },
  screenTitle: {
    fontSize: 28,
    paddingTop: spacing.md,
    textAlign: "left",
  },
  state: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  stateTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
});
