import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type {
  AuthProviderActions,
  AuthProviderState,
} from "../providers/AuthProvider";
import { AccountDisabledScreen } from "../../features/auth/components/AccountDisabledScreen";
import { LoginScreen } from "../../features/auth/components/LoginScreen";
import { InviteFriendSheet } from "../../features/referral/components/InviteFriendSheet";
import { expoClipboardAdapter } from "../../shared/platform/clipboardAdapter";
import { reactNativeShareAdapter } from "../../shared/platform/shareAdapter";
import { AppText, Button, Screen, colors, spacing } from "../../shared/ui";
import { AppShell } from "./components/AppShell";
import { RoutePlaceholder } from "./components/RoutePlaceholder";
import {
  getHeaderConfig,
  getInitialRoute,
  getTabRoutes,
  type AppRouteName,
  type MainTabRouteName,
} from "./navigationState";

export function AppNavigator({
  actions,
  initialRouteName,
  state,
}: {
  actions: AuthProviderActions;
  initialRouteName?: AppRouteName;
  state: AuthProviderState;
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

  if (state.status === "authenticated") {
    return (
      <MainTabs
        activeRouteName={toMainTab(
          initialRouteName ?? getInitialRoute(state.status),
          state.status,
        )}
        authStatus="authenticated"
        onLogout={actions.logout}
      />
    );
  }

  return (
    <MainTabs
      activeRouteName={toMainTab(
        initialRouteName ?? getInitialRoute(state.status),
        "logged_out",
      )}
      authStatus="logged_out"
      onLogin={actions.login}
      onLogout={actions.logout}
    />
  );
}

function MainTabs({
  activeRouteName,
  authStatus,
  onLogin,
  onLogout,
}: {
  activeRouteName: MainTabRouteName;
  authStatus: "authenticated" | "logged_out";
  onLogin?: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [currentRouteName, setCurrentRouteName] =
    useState<MainTabRouteName>(activeRouteName);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);

  const handleTabSelect = (routeName: MainTabRouteName) => {
    const tab = getTabRoutes().find((candidate) => candidate.routeName === routeName);

    if (authStatus !== "authenticated" && tab?.requiresAuth) {
      void onLogin?.();
      return;
    }

    setCurrentRouteName(routeName);
  };

  return (
    <AppShell
      activeRouteName={currentRouteName}
      header={getHeaderConfig(currentRouteName, authStatus)}
      onLogin={onLogin}
      onTabSelect={handleTabSelect}
      overlay={
        inviteSheetOpen ? (
          <InviteFriendSheet
            clipboard={expoClipboardAdapter}
            inviteCode="DEMO-CODE"
            onClose={() => setInviteSheetOpen(false)}
            share={reactNativeShareAdapter}
            webOrigin="https://app.mytrade.local"
          />
        ) : null
      }
      tabs={getTabRoutes()}
    >
      {renderRoute(currentRouteName, authStatus, onLogout, () => setInviteSheetOpen(true))}
    </AppShell>
  );
}

function renderRoute(
  routeName: MainTabRouteName,
  authStatus: "authenticated" | "logged_out",
  onLogout: () => Promise<void>,
  onInvitePress: () => void,
) {
  if (routeName === "profile") {
    return (
      <ProfileRoute
        authStatus={authStatus}
        onInvitePress={onInvitePress}
        onLogout={onLogout}
      />
    );
  }

  if (routeName === "dashboard") {
    return (
      <RoutePlaceholder
        description={protectedDescription(routeName)}
        label="MainTabs"
        title={mainTitle(routeName)}
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
  onInvitePress,
  onLogout,
}: {
  authStatus: "authenticated" | "logged_out";
  onInvitePress: () => void;
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
        <ProfileMenuItem label="KYC" />
        <ProfileMenuItem label="邀请好友" onPress={onInvitePress} />
        <ProfileMenuItem label="Settings" />
      </View>
      {authStatus === "authenticated" ? (
        <View accessibilityLabel="Profile action section" style={styles.profileActions}>
          <Button accessibilityLabel="Sign out" label="Sign out" onPress={onLogout} />
        </View>
      ) : null}
    </View>
  );
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

  if (routeName === "referral") {
    return "profile";
  }

  return "launchpad";
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

const styles = StyleSheet.create({
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
});
