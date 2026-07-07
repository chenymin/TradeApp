import { StyleSheet, View } from "react-native";

import { AppText, Card, ListState, spacing } from "../../../shared/ui";

export function RoutePlaceholder({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <View style={styles.root}>
      <Card>
        <View style={styles.stack}>
          <AppText variant="caption">{label}</AppText>
          <AppText variant="title" style={styles.title}>
            {title}
          </AppText>
          <ListState title="Feature placeholder" message={description} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: spacing.lg,
  },
  stack: {
    gap: spacing.sm,
  },
  title: {
    textAlign: "left",
  },
});
