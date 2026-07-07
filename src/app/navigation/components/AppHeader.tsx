import { Pressable, StyleSheet, Text, View } from "react-native";
import { LogIn } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing } from "../../../shared/ui";
import type { HeaderAction } from "../navigationState";

export function AppHeader({
  action,
  eyebrow,
  onLogin,
  title,
}: {
  action: HeaderAction;
  eyebrow: string;
  onLogin?: () => Promise<void> | void;
  title: string;
}) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(spacing.md, insets.top + spacing.sm);

  return (
    <View
      accessibilityLabel="App header"
      style={[
        styles.header,
        {
          minHeight: topPadding + 50,
          paddingTop: topPadding,
        },
      ]}
    >
      <View accessibilityLabel="Header side spacer" style={styles.sideSlot} />
      <View accessibilityLabel="Header title group" style={styles.titleGroup}>
        <Text
          accessibilityLabel={`Header title ${title}`}
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </Text>
      </View>
      <View accessibilityLabel="Header action slot" style={styles.actionSlot}>
        {action === "login" ? (
          <Pressable accessibilityLabel="Sign in" onPress={onLogin} style={styles.loginButton}>
            <LogIn
              accessibilityLabel="Sign in icon"
              color="#FFFFFF"
              size={16}
              strokeWidth={2.4}
            />
            <Text style={styles.loginText}>Sign in</Text>
          </Pressable>
        ) : null}
        {action === "walletStatus" ? (
          <View accessibilityLabel="Wallet status" style={styles.walletBadge}>
            <Text style={styles.walletText}>0x</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionSlot: {
    alignItems: "flex-end",
    minWidth: 104,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 82,
    paddingHorizontal: spacing.lg,
    position: "relative",
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 92,
    paddingHorizontal: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  sideSlot: {
    minWidth: 104,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  titleGroup: {
    alignItems: "center",
    flex: 1,
  },
  walletBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 44,
  },
  walletText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
