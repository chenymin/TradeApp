import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type {
  AuthDisplayState,
  AuthProviderActions,
  AuthProviderState,
} from "../providers/AuthProvider";
import { AccountDisabledScreen } from "../../features/auth/components/AccountDisabledScreen";
import { LoginScreen } from "../../features/auth/components/LoginScreen";
import { InviteFriendSheet } from "../../features/referral/components/InviteFriendSheet";
import type { RewardsDataDependencies } from "../../features/referral/screens/RewardsScreen";
import { runInviteFriendCommand } from "../../features/referral/workflow/inviteFriendCommand";
import { LaunchpadScreen } from "../../features/assets/screens/LaunchpadScreen";
import { MarketScreen } from "../../features/assets/screens/MarketScreen";
import { AssetDetailScreen } from "../../features/assets/screens/AssetDetailScreen";
import type { AssetDetailLoader } from "../../features/assets/domain/assetDetailModels";
import type { PublicAssetPageLoader, PublicAssetSummary } from "../../features/assets/domain/assetModels";
import type { ExternalLinkAdapter } from "../../shared/platform/linkingAdapter";
import { expoClipboardAdapter } from "../../shared/platform/clipboardAdapter";
import { reactNativeShareAdapter } from "../../shared/platform/shareAdapter";
import { AppText, Button, Screen, colors, spacing } from "../../shared/ui";
import { AppShell } from "./components/AppShell";
import { RoutePlaceholder } from "./components/RoutePlaceholder";
import {
  DashboardScreen,
  type DashboardDataDependencies,
} from "../../features/dashboard/screens/DashboardScreen";
import type { DashboardTab } from "../../features/dashboard/components/DashboardHeader";
import {
  getHeaderConfig,
  getInitialRoute,
  getTabRoutes,
  type AppRouteName,
  type MainTabRouteName,
} from "./navigationState";

type InviteFeedback =
  | "idle"
  | "loading"
  | "session_unavailable"
  | "invite_code_unavailable"
  | "origin_unavailable"
  | "unavailable";

export function AppNavigator({
  actions,
  assetDetailLoader,
  assetPageLoader,
  dashboardDependencies,
  externalLinkAdapter,
  initialRouteName,
  publicWebOrigin,
  rewardsDependencies,
  state,
}: {
  actions: AuthProviderActions;
  assetDetailLoader?: AssetDetailLoader;
  assetPageLoader?: PublicAssetPageLoader;
  dashboardDependencies?: DashboardDataDependencies;
  externalLinkAdapter?: ExternalLinkAdapter;
  initialRouteName?: AppRouteName;
  publicWebOrigin?: string;
  rewardsDependencies?: RewardsDataDependencies;
  state: AuthDisplayState & Partial<
    Pick<AuthProviderState, "isSessionReady" | "viewer">
  >;
}) {
  if (state.status === "restoring_session") {
    return (
      <Screen centered>
        <AppText variant="title">Restoring session</AppText>
      </Screen>
    );
  }

  if (state.status === "account_disabled") {
    return <AccountDisabledScreen onLogout={actions.logout} />;
  }

  if (state.status === "orphaned_recovery") {
    return <LoginScreen actions={actions} state={state} />;
  }

  if (
    state.status === "authenticated" &&
    (state.isSessionReady !== true || !state.viewer)
  ) {
    return (
      <Screen centered style={styles.sessionRecovery}>
        <AppText variant="title">Session needs to be refreshed</AppText>
        <AppText variant="subtitle">
          Sign in again to finish upgrading your secure session.
        </AppText>
        <Button
          accessibilityLabel="Sign in again"
          label="Sign in again"
          onPress={async () => {
            await actions.logout();
            await actions.login();
          }}
        />
      </Screen>
    );
  }

  if (state.status === "authenticated") {
    return (
      <MainTabs
        activeRouteName={toMainTab(
          initialRouteName ?? getInitialRoute(state.status),
          state.status,
        )}
        assetDetailLoader={assetDetailLoader ?? EMPTY_ASSET_DETAIL_LOADER}
        assetPageLoader={assetPageLoader ?? EMPTY_ASSET_PAGE_LOADER}
        authStatus="authenticated"
        dashboardDependencies={dashboardDependencies ?? EMPTY_DASHBOARD_DEPENDENCIES}
        externalLinkAdapter={externalLinkAdapter ?? NOOP_EXTERNAL_LINK_ADAPTER}
        initialDashboardTab={dashboardTabForRoute(initialRouteName ?? "dashboard")}
        onLogout={actions.logout}
        publicWebOrigin={publicWebOrigin}
        rewardsDependencies={rewardsDependencies ?? EMPTY_REWARDS_DEPENDENCIES}
        viewerState={{
          isSessionReady: state.isSessionReady === true,
          viewer: state.viewer ?? null,
        }}
      />
    );
  }

  return (
    <MainTabs
      activeRouteName={toMainTab(
        initialRouteName ?? getInitialRoute(state.status),
        "logged_out",
      )}
      assetDetailLoader={assetDetailLoader ?? EMPTY_ASSET_DETAIL_LOADER}
      assetPageLoader={assetPageLoader ?? EMPTY_ASSET_PAGE_LOADER}
      authStatus="logged_out"
      dashboardDependencies={dashboardDependencies ?? EMPTY_DASHBOARD_DEPENDENCIES}
      externalLinkAdapter={externalLinkAdapter ?? NOOP_EXTERNAL_LINK_ADAPTER}
      initialDashboardTab="holdings"
      onLogin={actions.login}
      onLogout={actions.logout}
      publicWebOrigin={publicWebOrigin}
      rewardsDependencies={rewardsDependencies ?? EMPTY_REWARDS_DEPENDENCIES}
      viewerState={{ isSessionReady: false, viewer: null }}
    />
  );
}

function MainTabs({
  activeRouteName,
  assetDetailLoader,
  assetPageLoader,
  authStatus,
  dashboardDependencies,
  externalLinkAdapter,
  initialDashboardTab,
  onLogin,
  onLogout,
  publicWebOrigin,
  rewardsDependencies,
  viewerState,
}: {
  activeRouteName: MainTabRouteName;
  assetDetailLoader: AssetDetailLoader;
  assetPageLoader: PublicAssetPageLoader;
  authStatus: "authenticated" | "logged_out";
  dashboardDependencies: DashboardDataDependencies;
  externalLinkAdapter: ExternalLinkAdapter;
  initialDashboardTab: DashboardTab;
  onLogin?: () => Promise<void>;
  onLogout: () => Promise<void>;
  publicWebOrigin?: string;
  rewardsDependencies: RewardsDataDependencies;
  viewerState: Pick<AuthProviderState, "isSessionReady" | "viewer">;
}) {
  const [currentRouteName, setCurrentRouteName] =
    useState<MainTabRouteName>(activeRouteName);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(initialDashboardTab);
  const [inviteSheet, setInviteSheet] = useState<{
    inviteCode: string;
    webOrigin: string;
  } | null>(null);
  const [detailRoute, setDetailRoute] = useState<{
    assetId: string;
    placeholder: PublicAssetSummary;
    returnTo: MainTabRouteName;
  } | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<InviteFeedback>("idle");

  const handleTabSelect = (routeName: MainTabRouteName) => {
    const tab = getTabRoutes().find((candidate) => candidate.routeName === routeName);

    if (authStatus !== "authenticated" && tab?.requiresAuth) {
      void onLogin?.();
      return;
    }

    setCurrentRouteName(routeName);
    setDetailRoute(null);
    setInviteFeedback("idle");
    if (routeName === "dashboard") setDashboardTab("holdings");
  };

  const openDashboardTab = (tab: DashboardTab) => {
    setCurrentRouteName("dashboard");
    setDashboardTab(tab);
    setDetailRoute(null);
    setInviteFeedback("idle");
  };

  const handleInvitePress = async () => {
    if (authStatus !== "authenticated") {
      await onLogin?.();
      return;
    }

    setInviteFeedback("loading");
    const result = await runInviteFriendCommand({
      dependencies: rewardsDependencies,
      publicWebOrigin,
      viewerState,
    });

    if (result.status === "ready") {
      setInviteFeedback("idle");
      setInviteSheet({
        inviteCode: result.inviteCode,
        webOrigin: result.webOrigin,
      });
      return;
    }
    if (result.status === "kyc_required") {
      openDashboardTab("whitelist");
      return;
    }
    setInviteFeedback(result.status);
  };

  return (
    <AppShell
      activeRouteName={detailRoute ? undefined : currentRouteName}
      header={getHeaderConfig(
        detailRoute ? "assetDetail" : currentRouteName,
        authStatus,
      )}
      onBack={detailRoute
        ? () => setDetailRoute(null)
        : undefined}
      onLogin={onLogin}
      onTabSelect={handleTabSelect}
      overlay={
        inviteSheet ? (
          <InviteFriendSheet
            clipboard={expoClipboardAdapter}
            inviteCode={inviteSheet.inviteCode}
            onClose={() => setInviteSheet(null)}
            share={reactNativeShareAdapter}
            webOrigin={inviteSheet.webOrigin}
          />
        ) : null
      }
      tabs={detailRoute ? undefined : getTabRoutes()}
    >
      {detailRoute ? (
        <AssetDetailScreen
          assetId={detailRoute.assetId}
          loader={assetDetailLoader}
          onLogin={() => { void onLogin?.(); }}
          onPurchasePreview={() => undefined}
          onViewMarket={() => {
            setCurrentRouteName("market");
            setDetailRoute(null);
          }}
          openExternalUrl={(url) => externalLinkAdapter.open(url)}
          placeholder={detailRoute.placeholder}
          viewer={{
            isLoggedIn: authStatus === "authenticated",
            kycApproved: "unknown",
            walletAddress: null,
            whitelisted: "unknown",
          }}
        />
      ) : renderRoute(
        currentRouteName,
        authStatus,
        assetPageLoader,
        dashboardDependencies,
        viewerState,
        externalLinkAdapter,
        onLogout,
        dashboardTab,
        inviteFeedback,
        () => { void handleInvitePress(); },
        () => openDashboardTab("whitelist"),
        rewardsDependencies,
        (asset) => setDetailRoute({
          assetId: asset.id,
          placeholder: asset,
          returnTo: currentRouteName,
        }),
      )}
    </AppShell>
  );
}

function renderRoute(
  routeName: MainTabRouteName,
  authStatus: "authenticated" | "logged_out",
  assetPageLoader: PublicAssetPageLoader,
  dashboardDependencies: DashboardDataDependencies,
  viewerState: Pick<AuthProviderState, "isSessionReady" | "viewer">,
  externalLinkAdapter: ExternalLinkAdapter,
  onLogout: () => Promise<void>,
  dashboardTab: DashboardTab,
  inviteFeedback: InviteFeedback,
  onInvitePress: () => void,
  onKycPress: () => void,
  rewardsDependencies: RewardsDataDependencies,
  onAssetPress: (asset: PublicAssetSummary) => void,
) {
  if (routeName === "launchpad") {
    return <LaunchpadScreen loader={assetPageLoader} onAssetPress={onAssetPress} />;
  }

  if (routeName === "market") {
    return <MarketScreen loader={assetPageLoader} onAssetPress={onAssetPress} />;
  }

  if (routeName === "profile") {
    return (
      <ProfileRoute
        authStatus={authStatus}
        inviteFeedback={inviteFeedback}
        onInvitePress={onInvitePress}
        onKycPress={onKycPress}
        onLogout={onLogout}
      />
    );
  }

  if (routeName === "dashboard") {
    return (
      <DashboardScreen
        {...dashboardDependencies}
        externalLinkAdapter={externalLinkAdapter}
        initialTab={dashboardTab}
        rewardsDependencies={rewardsDependencies}
        viewerState={viewerState}
      />
    );
  }

  return (
    <RoutePlaceholder
      description={publicDescription(routeName)}
      label={authStatus === "authenticated" ? "MainTabs" : "PublicTabs"}
      title={mainTitle(routeName)}
    />
  );
}

function ProfileRoute({
  authStatus,
  inviteFeedback,
  onInvitePress,
  onKycPress,
  onLogout,
}: {
  authStatus: "authenticated" | "logged_out";
  inviteFeedback: InviteFeedback;
  onInvitePress: () => void;
  onKycPress: () => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <View style={styles.profile}>
      <RoutePlaceholder
        description="Account hub for compliance, growth, security, and settings flows."
        label="MainTabs"
        title="Profile"
      />
      <View accessibilityLabel="Profile menu section" style={styles.profileLinks}>
        <ProfileMenuItem label="Wallet" />
        <ProfileMenuItem label="KYC" onPress={onKycPress} />
        <ProfileMenuItem label="邀请好友" onPress={onInvitePress} />
        <ProfileMenuItem label="Settings" />
      </View>
      {inviteFeedback !== "idle" ? (
        <View accessibilityLabel="Invite command status" style={styles.inviteFeedback}>
          <AppText style={styles.inviteFeedbackText} variant="body">
            {inviteFeedbackLabel(inviteFeedback)}
          </AppText>
          {inviteFeedback === "unavailable" ? (
            <Pressable
              accessibilityLabel="Retry invite"
              accessibilityRole="button"
              onPress={onInvitePress}
              style={styles.inviteRetry}
            >
              <AppText style={styles.inviteRetryText} variant="caption">Retry</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {authStatus === "authenticated" ? (
        <View accessibilityLabel="Profile action section" style={styles.profileActions}>
          <Button accessibilityLabel="Sign out" label="Sign out" onPress={onLogout} />
        </View>
      ) : null}
    </View>
  );
}

function inviteFeedbackLabel(feedback: Exclude<InviteFeedback, "idle">): string {
  if (feedback === "loading") return "Loading invite details";
  if (feedback === "session_unavailable") {
    return "Sign in again to create an invite";
  }
  if (feedback === "invite_code_unavailable") return "Invite code unavailable";
  if (feedback === "origin_unavailable") return "Invite sharing is not configured";
  return "Unable to load invite details";
}

function ProfileMenuItem({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`Profile item ${label}`}
      onPress={onPress}
      style={styles.profileMenuItem}
    >
      <AppText variant="body">{label}</AppText>
      <View
        accessibilityLabel={`Profile item ${label} arrow`}
        style={styles.profileMenuArrow}
      />
      <View
        accessibilityLabel={`Profile item ${label} divider`}
        style={styles.profileMenuDivider}
      />
    </Pressable>
  );
}

function toMainTab(
  routeName: AppRouteName,
  authStatus: "authenticated" | "logged_out",
): MainTabRouteName {
  if (
    routeName === "launchpad" ||
    routeName === "market" ||
    routeName === "referralPublic" ||
    routeName === "profile"
  ) {
    return routeName;
  }

  if (authStatus !== "authenticated") {
    return "launchpad";
  }

  if (routeName === "dashboard") {
    return routeName;
  }

  if (routeName === "home") {
    return "dashboard";
  }

  if (routeName === "referral" || routeName === "kyc") {
    return "dashboard";
  }

  return "launchpad";
}

function dashboardTabForRoute(routeName: AppRouteName): DashboardTab {
  if (routeName === "referral") return "rewards";
  if (routeName === "kyc") return "whitelist";
  return "holdings";
}

function mainTitle(routeName: MainTabRouteName): string {
  if (routeName === "market") {
    return "Market";
  }

  if (routeName === "referralPublic") {
    return "Referral";
  }

  if (routeName === "dashboard") {
    return "Dashboard";
  }

  if (routeName === "profile") {
    return "My";
  }

  return "Launchpad";
}

function publicDescription(routeName: MainTabRouteName): string {
  if (routeName === "market") {
    return "Public market browsing lands in Task 3.";
  }

  if (routeName === "referralPublic") {
    return "Public referral rules and leaderboard land in Task 6.";
  }

  return "Public asset discovery lands in Task 3.";
}

function protectedDescription(routeName: MainTabRouteName): string {
  return "Dashboard summary, holdings, points, and KYC reminders land in Task 5.";
}

const EMPTY_ASSET_PAGE_LOADER: PublicAssetPageLoader = async () => ({
  items: [],
  nextCursor: null,
});

const EMPTY_DASHBOARD_DEPENDENCIES: DashboardDataDependencies = {
  commissionLoader: async () => null,
  fetchAccessToken: async () => null,
  holdingsLoader: async () => null,
  identityClient: {
    async fetchDetails() {
      throw new Error("KYC identity details are unavailable");
    },
  },
  kycLoader: async () => null,
  nicknameRepository: { updateNickname: async () => undefined },
  profileLoader: async () => null,
};

const EMPTY_REWARDS_DEPENDENCIES: RewardsDataDependencies = {
  fetchAccessToken: async () => null,
  kycLoader: async () => null,
  pointLedgerRepository: { fetchRecent: async () => [] },
  referralRecordsClient: { fetchRecords: async () => [] },
  rewardsProfileRepository: {
    fetchProfile: async () => {
      throw new Error("Rewards profile loader is unavailable");
    },
  },
};

const EMPTY_ASSET_DETAIL_LOADER: AssetDetailLoader = async () => {
  throw new Error("Asset detail loader is unavailable");
};

const NOOP_EXTERNAL_LINK_ADAPTER: ExternalLinkAdapter = {
  async open() {
    return "unsupported";
  },
};

const styles = StyleSheet.create({
  inviteFeedback: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  inviteFeedbackText: {
    fontWeight: "700",
  },
  inviteRetry: {
    justifyContent: "center",
    minHeight: 40,
    paddingRight: spacing.lg,
  },
  inviteRetryText: {
    color: colors.primary,
    fontWeight: "800",
  },
  profile: {
    gap: spacing.md,
  },
  profileLinks: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  profileActions: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  profileMenuArrow: {
    borderRightColor: colors.muted,
    borderRightWidth: 2,
    borderTopColor: colors.muted,
    borderTopWidth: 2,
    height: 9,
    marginRight: 2,
    transform: [{ rotate: "45deg" }],
    width: 9,
  },
  profileMenuDivider: {
    backgroundColor: colors.border,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  profileMenuItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    position: "relative",
  },
  sessionRecovery: {
    alignItems: "center",
    gap: spacing.md,
  },
});
