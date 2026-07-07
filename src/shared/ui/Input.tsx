import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { colors, spacing } from "./theme";

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
});
