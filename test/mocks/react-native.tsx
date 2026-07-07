import React from "react";

type Props = Record<string, unknown> & {
  children?: React.ReactNode;
};

export function Pressable({ children, ...props }: Props) {
  return React.createElement("Pressable", props, children);
}

export function Text({ children, ...props }: Props) {
  return React.createElement("Text", props, children);
}

export function TextInput(props: Props) {
  return React.createElement("TextInput", props);
}

export function View({ children, ...props }: Props) {
  return React.createElement("View", props, children);
}

export const StyleSheet = {
  create<T extends Record<string, unknown>>(styles: T): T {
    return styles;
  },
};

export const Share = {
  share: async () => ({ action: "sharedAction" }),
};
