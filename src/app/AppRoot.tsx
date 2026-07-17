import { useLogin } from "@privy-io/expo/ui";
import * as Linking from "expo-linking";
import { useEffect, useMemo } from "react";
import { usePrivy, useUnlinkWallet } from "@privy-io/expo";

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
  createDefaultDashboardIdentityClient,
  createDefaultDashboardKycLoader,
  createDefaultDashboardProfileLoader,
  createDefaultNicknameRepository,
} from "../features/dashboard/services/createDefaultDashboardServices";
import { createDefaultRewardsServices } from "../features/referral/services/createDefaultRewardsServices";
import { mapPrivyWalletMetadata } from "../features/wallet/domain/walletIdentity";
import { createDefaultWalletServices } from "../features/wallet/services/createDefaultWalletServices";
import { createWalletUnlinkDependencies } from "../features/wallet/services/createWalletUnlinkDependencies";
import {
  getPublicChainConfig,
  type PublicChainConfig,
} from "../lib/chain/publicChainRegistry";

export function AppRoot() {
  const publicConfig = readPublicConfig();

  if (!publicConfig.ok) {
    return (
      <FatalConfigScreen
        invalidKeys={publicConfig.invalidKeys}
        missingKeys={publicConfig.missingKeys}
      />
    );
  }

  const walletChain = getPublicChainConfig(publicConfig.config.chainId);

  return (
    <PrivyProviderBoundary config={publicConfig.config}>
      <AuthRuntime
        publicWebOrigin={publicConfig.config.publicWebOrigin}
        walletChain={walletChain}
      />
    </PrivyProviderBoundary>
  );
}

function AuthRuntime({
  publicWebOrigin,
  walletChain,
}: {
  publicWebOrigin?: string;
  walletChain: PublicChainConfig;
}) {
  const { getAccessToken, logout, user } = usePrivy();
  const { unlinkWallet } = useUnlinkWallet();
  const { login } = useLogin();
  const privyWalletMetadata = useMemo(
    () => mapPrivyWalletMetadata(user),
    [user],
  );
  const walletDependencies = useMemo(
    () => createDefaultWalletServices(walletChain),
    [walletChain],
  );
  const workflow = useMemo(
    () => createRuntimeAuthWorkflow({ getAccessToken, login, logout }),
    [getAccessToken, login, logout],
  );

  return (
    <AuthProvider workflow={workflow}>
      <AuthGateRuntime
        privyWalletMetadata={privyWalletMetadata}
        publicWebOrigin={publicWebOrigin}
        unlinkWallet={unlinkWallet}
        walletDependencies={walletDependencies}
        walletChain={walletChain}
      />
    </AuthProvider>
  );
}

function AuthGateRuntime({
  privyWalletMetadata,
  publicWebOrigin,
  unlinkWallet,
  walletDependencies,
  walletChain,
}: {
  privyWalletMetadata: ReturnType<typeof mapPrivyWalletMetadata>;
  publicWebOrigin?: string;
  unlinkWallet: (input: { address: string }) => Promise<unknown>;
  walletDependencies: ReturnType<typeof createDefaultWalletServices>;
  walletChain: PublicChainConfig;
}) {
  const state = useAuthState();
  const actions = useAuthActions();
  const walletUnlinkDependencies = useMemo(
    () => createWalletUnlinkDependencies({
      refreshSession: actions.refreshSession,
      unlinkWallet,
    }),
    [actions.refreshSession, unlinkWallet],
  );
  const assetDetailLoader = useMemo(() => createDefaultPublicAssetDetailLoader(), []);
  const assetPageLoader = useMemo(() => createDefaultPublicAssetLoader(), []);
  const externalLinkAdapter = useMemo(() => createDefaultExternalLinkAdapter(), []);
  const rewardsDependencies = useMemo(() => createDefaultRewardsServices(), []);
  const dashboardDependencies = useMemo(() => ({
    commissionLoader: createDefaultDashboardCommissionLoader(),
    fetchAccessToken: rewardsDependencies.fetchAccessToken,
    holdingsLoader: createDefaultDashboardHoldingsLoader(),
    identityClient: createDefaultDashboardIdentityClient(),
    kycLoader: createDefaultDashboardKycLoader(),
    nicknameRepository: createDefaultNicknameRepository(),
    profileLoader: createDefaultDashboardProfileLoader(),
  }), [rewardsDependencies]);

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
      privyWalletMetadata={privyWalletMetadata}
      publicWebOrigin={publicWebOrigin}
      rewardsDependencies={rewardsDependencies}
      state={state}
      walletDependencies={walletDependencies}
      walletUnlinkDependencies={walletUnlinkDependencies}
      walletChain={walletChain}
    />
  );
}
