import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { spacing } from "./theme";

export function ListState({
  message,
  title,
}: {
  message?: string;
  title: string;
}) {
  return (
    <View style={styles.root}>
      <AppText variant="body" style={styles.title}>
        {title}
      </AppText>
      {message ? <AppText variant="caption">{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    fontWeight: "700",
  },
});
