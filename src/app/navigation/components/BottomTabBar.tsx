import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Home,
  LayoutDashboard,
  Share2,
  Store,
  User,
  type LucideIcon,
} from "lucide-react-native";

import { colors, radii, spacing } from "../../../shared/ui";
import type { MainTabRouteName, TabIconName, TabRoute } from "../navigationState";

export function BottomTabBar({
  activeRouteName,
  onSelect,
  tabs,
}: {
  activeRouteName: MainTabRouteName;
  onSelect: (routeName: MainTabRouteName) => void;
  tabs: TabRoute[];
}) {
  return (
    <View style={styles.root}>
      {tabs.map((tab) => {
        const selected = tab.routeName === activeRouteName;
        return (
          <Pressable
            accessibilityLabel={`Tab ${tab.label}`}
            accessibilityState={{ selected }}
            key={tab.routeName}
            onPress={() => onSelect(tab.routeName)}
            style={[styles.item, selected ? styles.itemSelected : null]}
          >
            <TabIcon
              color={selected ? colors.primary : colors.muted}
              label={tab.label}
              name={tab.icon}
            />
            <Text
              numberOfLines={1}
              style={[styles.label, selected ? styles.textSelected : null]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({
  color,
  label,
  name,
}: {
  color: string;
  label: string;
  name: TabIconName;
}) {
  const Icon = getTabIcon(name);

  return (
    <Icon
      accessibilityLabel={`Tab ${label} icon`}
      color={color}
      size={22}
      strokeWidth={2.2}
    />
  );
}

function getTabIcon(name: TabIconName): LucideIcon {
  if (name === "launchpad") {
    return Home;
  }

  if (name === "market") {
    return Store;
  }

  if (name === "referral") {
    return Share2;
  }

  if (name === "dashboard") {
    return LayoutDashboard;
  }

  return User;
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    borderRadius: radii.lg,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 48,
  },
  itemSelected: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  root: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 70,
    padding: spacing.sm,
  },
  textSelected: {
    color: colors.primary,
  },
});
