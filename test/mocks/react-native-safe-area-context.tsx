import React from "react";

type Props = {
  children?: React.ReactNode;
};

export function SafeAreaProvider({ children }: Props) {
  return React.createElement("safe-area-provider", null, children);
}

export function useSafeAreaInsets() {
  return {
    bottom: 34,
    left: 0,
    right: 0,
    top: 47,
  };
}
