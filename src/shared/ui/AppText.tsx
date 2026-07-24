import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

import { colors, typography } from "./theme";

export type AppTextVariant =
  | "body"
  | "caption"
  | "display"
  | "label"
  | "micro"
  | "numberRow"
  | "pageTitle"
  | "sectionTitle"
  | "subtitle"
  | "title";

export function AppText({
  children,
  numeric = false,
  style,
  variant = "body",
  ...props
}: {
  children: React.ReactNode;
  numeric?: boolean;
  style?: StyleProp<TextStyle>;
  variant?: AppTextVariant;
} & Omit<TextProps, "style">) {
  return (
    <Text {...props} style={[styles[variant], numeric ? styles.numeric : null, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    ...typography.body,
  },
  caption: {
    color: colors.muted,
    ...typography.caption,
  },
  display: {
    color: colors.text,
    ...typography.display,
  },
  label: {
    color: colors.text,
    ...typography.label,
  },
  micro: {
    color: colors.muted,
    ...typography.micro,
  },
  numberRow: {
    color: colors.text,
    ...typography.numberRow,
  },
  numeric: {
    fontVariant: ["tabular-nums"],
  },
  pageTitle: {
    color: colors.text,
    ...typography.pageTitle,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  subtitle: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    ...typography.display,
    textAlign: "center",
  },
});
