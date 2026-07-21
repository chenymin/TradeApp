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
export const Copy = createIcon("lucide-copy");
export const Image = createIcon("lucide-image");
export const LayoutDashboard = createIcon("lucide-layout-dashboard");
export const LayoutGrid = createIcon("lucide-layout-grid");
export const LogIn = createIcon("lucide-log-in");
export const Plus = createIcon("lucide-plus");
export const RefreshCw = createIcon("lucide-refresh-cw");
export const Share2 = createIcon("lucide-share-2");
export const ShieldCheck = createIcon("lucide-shield-check");
export const Store = createIcon("lucide-store");
export const Trash2 = createIcon("lucide-trash-2");
export const TrendingUp = createIcon("lucide-trending-up");
export const User = createIcon("lucide-user");
export const Wallet = createIcon("lucide-wallet");
export const ArrowLeft = createIcon("lucide-arrow-left");
export const ExternalLink = createIcon("lucide-external-link");
