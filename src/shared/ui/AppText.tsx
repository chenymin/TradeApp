import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

import { colors } from "./theme";

type AppTextVariant = "body" | "caption" | "subtitle" | "title";

export function AppText({
  children,
  style,
  variant = "body",
  ...props
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: AppTextVariant;
} & Omit<TextProps, "style">) {
  return (
    <Text {...props} style={[styles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: 16,
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
});
