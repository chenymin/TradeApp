import { useLogin } from "@privy-io/expo/ui";
import * as Linking from "expo-linking";
import { useEffect, useMemo } from "react";
import { usePrivy, useUnlinkWallet } from "@privy-io/expo";

import { createLinkingAdapter } from "./linking/createLinkingAdapter";
import { AuthProvider } from "./providers/AuthProvider";
import { PrivyProviderBoundary } from "./providers/PrivyProviderBoundary";
import { WalletConnectionProvider } from "./providers/WalletConnectionProvider";
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
  WalletSelectionRuntime,
  type WalletSelectionRuntimeConfig,
} from "../features/wallet/components/WalletSelectionRuntime";
import type { WalletSelectionRuntimeDependencies } from "../features/wallet/workflow/walletSelectionWorkflow";
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
      <WalletConnectionProvider
        chainId={publicConfig.config.chainId}
        projectId={publicConfig.config.reownProjectId}
        publicWebOrigin={publicConfig.config.publicWebOrigin}
      >
        <AuthRuntime
          walletSelectionConfig={
            publicConfig.config.reownProjectId &&
              publicConfig.config.publicWebOrigin
              ? {
                  endpoint: new URL(
                    publicConfig.config.walletSelectPath,
                    publicConfig.config.supabaseUrl,
                  ).toString(),
                  publicWebOrigin: publicConfig.config.publicWebOrigin,
                }
              : undefined
          }
          publicWebOrigin={publicConfig.config.publicWebOrigin}
          walletChain={walletChain}
        />
      </WalletConnectionProvider>
    </PrivyProviderBoundary>
  );
}

function AuthRuntime({
  publicWebOrigin,
  walletSelectionConfig,
  walletChain,
}: {
  publicWebOrigin?: string;
  walletSelectionConfig?: WalletSelectionRuntimeConfig;
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
        getAccessToken={getAccessToken}
        privyWalletMetadata={privyWalletMetadata}
        publicWebOrigin={publicWebOrigin}
        unlinkWallet={unlinkWallet}
        walletSelectionConfig={walletSelectionConfig}
        walletDependencies={walletDependencies}
        walletChain={walletChain}
      />
    </AuthProvider>
  );
}

function AuthGateRuntime({
  getAccessToken,
  privyWalletMetadata,
  publicWebOrigin,
  unlinkWallet,
  walletSelectionConfig,
  walletDependencies,
  walletChain,
}: {
  getAccessToken: () => Promise<string | null>;
  privyWalletMetadata: ReturnType<typeof mapPrivyWalletMetadata>;
  publicWebOrigin?: string;
  unlinkWallet: (input: { address: string }) => Promise<unknown>;
  walletSelectionConfig?: WalletSelectionRuntimeConfig;
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

  const renderNavigator = (
    walletSelectionDependencies?: WalletSelectionRuntimeDependencies,
  ) => (
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
      walletSelectionDependencies={walletSelectionDependencies}
      walletUnlinkDependencies={walletUnlinkDependencies}
      walletChain={walletChain}
    />
  );

  return walletSelectionConfig ? (
    <WalletSelectionRuntime
      config={walletSelectionConfig}
      getAccessToken={getAccessToken}
      replaceSession={actions.replaceSession}
      viewerId={state.viewer?.id ?? null}
    >
      {renderNavigator}
    </WalletSelectionRuntime>
  ) : renderNavigator();
}
