import { useLogin } from "@privy-io/expo/ui";
import * as Linking from "expo-linking";
import { useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/expo";

import { createLinkingAdapter } from "./linking/createLinkingAdapter";
import { AuthProvider } from "./providers/AuthProvider";
import { PrivyProviderBoundary } from "./providers/PrivyProviderBoundary";
import { createRuntimeAuthWorkflow } from "./auth/createAuthWorkflow";
import { FatalConfigScreen } from "./config/FatalConfigScreen";
import { readPublicConfig } from "./config/publicConfig";
import { AppNavigator } from "./navigation/AppNavigator";
import { useAuthActions } from "../features/auth/hooks/useAuthActions";
import { useAuthState } from "../features/auth/hooks/useAuthState";
import { expoSecureSessionStorage } from "../features/auth/services/expoSecureSessionStorage";
import { handleRegistrationLink } from "../features/registration/workflow/registrationLinkHandler";
import { createDefaultPublicAssetLoader } from "../features/assets/services/createDefaultPublicAssetLoader";
import { createDefaultPublicAssetDetailLoader } from "../features/assets/services/createDefaultPublicAssetDetailLoader";
import { createDefaultExternalLinkAdapter } from "../shared/platform/createDefaultExternalLinkAdapter";
import { createDefaultDashboardHoldingsLoader } from "../features/dashboard/services/createDefaultDashboardHoldingsLoader";
import {
  createDefaultDashboardCommissionLoader,
  createDefaultDashboardKycLoader,
  createDefaultDashboardPointsLoader,
  createDefaultDashboardProfileLoader,
  createDefaultNicknameRepository,
} from "../features/dashboard/services/createDefaultDashboardServices";

export function AppRoot() {
  const publicConfig = readPublicConfig();

  if (!publicConfig.ok) {
    return <FatalConfigScreen missingKeys={publicConfig.missingKeys} />;
  }

  return (
    <PrivyProviderBoundary config={publicConfig.config}>
      <AuthRuntime />
    </PrivyProviderBoundary>
  );
}

function AuthRuntime() {
  const { getAccessToken, logout } = usePrivy();
  const { login } = useLogin();
  const workflow = useMemo(
    () => createRuntimeAuthWorkflow({ getAccessToken, login, logout }),
    [getAccessToken, login, logout],
  );

  return (
    <AuthProvider workflow={workflow}>
      <AuthGateRuntime />
    </AuthProvider>
  );
}

function AuthGateRuntime() {
  const state = useAuthState();
  const actions = useAuthActions();
  const assetDetailLoader = useMemo(() => createDefaultPublicAssetDetailLoader(), []);
  const assetPageLoader = useMemo(() => createDefaultPublicAssetLoader(), []);
  const externalLinkAdapter = useMemo(() => createDefaultExternalLinkAdapter(), []);
  const dashboardDependencies = useMemo(() => ({
    commissionLoader: createDefaultDashboardCommissionLoader(),
    holdingsLoader: createDefaultDashboardHoldingsLoader(),
    kycLoader: createDefaultDashboardKycLoader(),
    nicknameRepository: createDefaultNicknameRepository(),
    pointsLoader: createDefaultDashboardPointsLoader(),
    profileLoader: createDefaultDashboardProfileLoader(),
  }), []);

  useEffect(() => {
    const adapter = createLinkingAdapter({
      linking: Linking,
      onUrl: async (url) => {
        await handleRegistrationLink({
          link: url,
          storage: expoSecureSessionStorage,
        });
      },
    });

    void adapter.start();

    return () => {
      adapter.stop();
    };
  }, []);

  return (
    <AppNavigator
      actions={actions}
      assetDetailLoader={assetDetailLoader}
      assetPageLoader={assetPageLoader}
      dashboardDependencies={dashboardDependencies}
      externalLinkAdapter={externalLinkAdapter}
      state={state}
    />
  );
}
