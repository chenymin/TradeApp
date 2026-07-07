import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors, spacing } from "./theme";

export function Screen({
  children,
  centered = false,
  style,
}: {
  children: React.ReactNode;
  centered?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.screen, centered ? styles.centered : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    padding: spacing.lg,
  },
});
