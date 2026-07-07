import React from "react";

import { View } from "react-native";

type IconProps = Record<string, unknown> & {
  accessibilityLabel?: string;
};

export type LucideIcon = (props: IconProps) => React.ReactElement;

function createIcon(testID: string): LucideIcon {
  return function MockLucideIcon(props: IconProps) {
    return React.createElement(View, { ...props, testID });
  };
}

export const Home = createIcon("lucide-home");
export const LayoutDashboard = createIcon("lucide-layout-dashboard");
export const LogIn = createIcon("lucide-log-in");
export const Share2 = createIcon("lucide-share-2");
export const Store = createIcon("lucide-store");
export const User = createIcon("lucide-user");
