import { StyleSheet, View } from "react-native";

import { AppText, colors, radii, spacing } from "../../../shared/ui";

export function CommissionUnavailableState() {
  return (
    <View style={styles.root}>
      <AppText style={styles.title} variant="body">
        Commission data is temporarily unavailable
      </AppText>
      <AppText variant="caption">Access controls are under security review.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontWeight: "800",
  },
});
