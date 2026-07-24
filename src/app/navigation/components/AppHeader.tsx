import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, LogIn } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, GlassSurface, radii, spacing } from "../../../shared/ui";
import type { HeaderAction, HeaderVariant } from "../navigationState";

export function AppHeader({
  action,
  eyebrow,
  onBack,
  onLogin,
  title,
  variant,
}: {
  action: HeaderAction;
  eyebrow: string;
  onBack?: () => void;
  onLogin?: () => Promise<void> | void;
  title: string;
  variant: HeaderVariant;
}) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(spacing.md, insets.top + spacing.sm);
  const visibleTitle = variant === "brand" ? "ARTSTAR" : title;

  return (
    <GlassSurface
      accessibilityLabel="App header"
      style={[
        styles.header,
        {
          minHeight: topPadding + 50,
          paddingTop: topPadding,
        },
      ]}
      variant="header"
    >
      <View accessibilityLabel="Header side slot" style={styles.sideSlot}>
        {onBack ? (
          <Pressable accessibilityLabel="Back" onPress={onBack} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={22} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>
      <View accessibilityLabel="Header title group" style={styles.titleGroup}>
        <Text
          accessibilityLabel={`Header title ${visibleTitle}`}
          numberOfLines={1}
          style={variant === "brand" ? [styles.title, styles.brandTitle] : styles.title}
        >
          {visibleTitle}
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
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  actionSlot: {
    alignItems: "flex-end",
    minWidth: 104,
  },
  backButton: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    width: 44,
  },
  brandTitle: {
    color: colors.ink,
  },
  header: {
    alignItems: "center",
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
    minHeight: 44,
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
    alignItems: "flex-start",
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
