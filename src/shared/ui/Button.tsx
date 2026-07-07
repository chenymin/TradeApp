import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "./theme";

export function Button({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => Promise<void> | void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled ? styles.disabled : null]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  disabled: {
    backgroundColor: colors.primaryMuted,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
