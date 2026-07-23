import "@walletconnect/react-native-compat";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { EthersAdapter } from "@reown/appkit-ethers-react-native";
import {
  AppKit,
  AppKitProvider,
  createAppKit,
  type AppKitNetwork,
  type Storage,
} from "@reown/appkit-react-native";
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { bsc, bscTestnet as viemBscTestnet } from "viem/chains";

const bscMainnet: AppKitNetwork = {
  ...bsc,
  caipNetworkId: "eip155:56",
  chainNamespace: "eip155",
};

const bscTestnet: AppKitNetwork = {
  ...viemBscTestnet,
  caipNetworkId: "eip155:97",
  chainNamespace: "eip155",
};

type WalletConnectionController = {
  disconnect(): Promise<void>;
};

const WalletConnectionControllerContext =
  createContext<WalletConnectionController | null>(null);

export function useWalletConnectionController(): WalletConnectionController {
  const controller = useContext(WalletConnectionControllerContext);
  if (!controller) {
    throw new Error("Wallet connection controller is unavailable");
  }
  return controller;
}

const appKitStorage: Storage = {
  async getEntries<T>() {
    const entries = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys());
    return entries.flatMap(([key, value]) => {
      const parsed = parseStoredValue<T>(value);
      return parsed === undefined ? [] : [[key, parsed] as [string, T]];
    });
  },
  async getItem<T>(key: string) {
    return parseStoredValue<T>(await AsyncStorage.getItem(key));
  },
  async getKeys() {
    return [...await AsyncStorage.getAllKeys()];
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  },
  async setItem<T>(key: string, value: T) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
};

function parseStoredValue<T>(value: string | null): T | undefined {
  if (value === null) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function WalletConnectionProvider({
  chainId,
  children,
  projectId,
  publicWebOrigin,
}: PropsWithChildren<{
  chainId: 56 | 97;
  projectId?: string;
  publicWebOrigin?: string;
}>) {
  if (!projectId) return <>{children}</>;

  return (
    <EnabledWalletConnectionProvider
      chainId={chainId}
      projectId={projectId}
      publicWebOrigin={publicWebOrigin}
    >
      {children}
    </EnabledWalletConnectionProvider>
  );
}

function EnabledWalletConnectionProvider({
  chainId,
  children,
  projectId,
  publicWebOrigin,
}: PropsWithChildren<{
  chainId: 56 | 97;
  projectId: string;
  publicWebOrigin?: string;
}>) {
  const instance = useMemo(() => {
    const webOrigin = publicWebOrigin ?? "https://artstarex.com";
    const configuredNetwork = chainId === 56 ? bscMainnet : bscTestnet;

    return createAppKit({
      adapters: [new EthersAdapter()],
      defaultNetwork: configuredNetwork,
      enableAnalytics: false,
      features: {
        onramp: false,
        showWallets: true,
        socials: false,
        swaps: false,
      },
      logger: "error",
      metadata: {
        description: "ArtStar investor wallet connection",
        icons: [`${webOrigin}/favicon.ico`],
        name: "ArtStar",
        redirect: {
          native: "mytradeapp://",
          universal: webOrigin,
        },
        url: webOrigin,
      },
      networks: [configuredNetwork],
      projectId,
      storage: appKitStorage,
      themeMode: "light",
    });
  }, [chainId, projectId, publicWebOrigin]);
  const controller = useMemo<WalletConnectionController>(() => ({
    async disconnect() {
      await instance.disconnect("eip155");
      await instance.disconnect("eip155", false);
    },
  }), [instance]);

  return (
    <WalletConnectionControllerContext.Provider value={controller}>
      <AppKitProvider instance={instance}>
        {children}
        <AppKit />
      </AppKitProvider>
    </WalletConnectionControllerContext.Provider>
  );
}
