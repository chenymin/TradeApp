import { StyleSheet, View } from "react-native";

import { AppText, Card, Screen, spacing } from "../../shared/ui";

export function FatalConfigScreen({
  invalidKeys = [],
  missingKeys,
}: {
  invalidKeys?: string[];
  missingKeys: string[];
}) {
  const keys = [...missingKeys, ...invalidKeys];

  return (
    <Screen centered>
      <Card>
        <View style={styles.content}>
          <AppText variant="title">
            {invalidKeys.length > 0
              ? "Unsupported public configuration"
              : "Missing public configuration"}
          </AppText>
          <AppText variant="subtitle">
            Add the required Expo public environment values before starting the app.
          </AppText>
          <View style={styles.keys}>
            {keys.map((key) => (
              <AppText key={key} variant="caption">
                {key}
              </AppText>
            ))}
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  keys: {
    gap: spacing.sm,
  },
});
