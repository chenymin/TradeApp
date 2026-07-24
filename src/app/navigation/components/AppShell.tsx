import { StyleSheet, View } from "react-native";

import { colors } from "../../../shared/ui";
import { AppHeader } from "./AppHeader";
import { BottomTabBar } from "./BottomTabBar";
import type {
  HeaderConfig,
  MainTabRouteName,
  TabRoute,
} from "../navigationState";

export function AppShell({
  activeRouteName,
  children,
  header,
  onBack,
  onLogin,
  onTabSelect,
  overlay,
  tabs,
}: {
  activeRouteName?: MainTabRouteName;
  children: React.ReactNode;
  header: HeaderConfig;
  onBack?: () => void;
  onLogin?: () => Promise<void> | void;
  onTabSelect?: (routeName: MainTabRouteName) => void;
  overlay?: React.ReactNode;
  tabs?: TabRoute[];
}) {
  return (
    <View style={styles.root}>
      <AppHeader
        action={header.action}
        eyebrow={header.eyebrow}
        onBack={onBack}
        onLogin={onLogin}
        title={header.title}
        variant={header.variant}
      />
      <View style={styles.content}>{children}</View>
      {tabs && activeRouteName && onTabSelect ? (
        <BottomTabBar
          activeRouteName={activeRouteName}
          onSelect={onTabSelect}
          tabs={tabs}
        />
      ) : null}
      {overlay ? (
        <View accessibilityLabel="Invite friends overlay" style={styles.overlay}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  overlay: {
    bottom: 0,
    elevation: 12,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 12,
  },
});
