import { PrivyProvider } from "@privy-io/expo";
import { PrivyElements } from "@privy-io/expo/ui";
import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { PublicConfig } from "../config/publicConfig";

export function PrivyProviderBoundary({
  children,
  config,
}: PropsWithChildren<{ config: PublicConfig }>) {
  if (!config.privyAppId) {
    throw new Error("Missing public Privy app id");
  }

  return (
    <SafeAreaProvider>
      <PrivyProvider appId={config.privyAppId} clientId={config.privyClientId}>
        {children}
        <PrivyElements />
      </PrivyProvider>
    </SafeAreaProvider>
  );
}
