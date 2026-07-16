const REQUIRED_PUBLIC_KEYS = [
  "EXPO_PUBLIC_PRIVY_APP_ID",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export type PublicConfigEnv = Partial<
  Record<
    | (typeof REQUIRED_PUBLIC_KEYS)[number]
    | "EXPO_PUBLIC_CHAIN_ID"
    | "EXPO_PUBLIC_WEB_ORIGIN"
    | "EXPO_PUBLIC_PRIVY_CLIENT_ID"
    | "EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH",
    string
  >
>;

export type SupportedPublicChainId = 56 | 97;

export type PublicConfig = {
  chainId: SupportedPublicChainId;
  privyAppId: string;
  privyClientId?: string;
  publicWebOrigin?: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
  walletLoginPath: string;
};

export type PublicConfigResult =
  | { config: PublicConfig; ok: true }
  | { invalidKeys: string[]; missingKeys: string[]; ok: false };

export function parsePublicConfig(env: PublicConfigEnv): PublicConfigResult {
  const normalized = normalizeEnv(env);
  const chainId = parseChainId(normalized.EXPO_PUBLIC_CHAIN_ID);
  const privyAppId = normalized.EXPO_PUBLIC_PRIVY_APP_ID;
  const supabaseAnonKey = normalized.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = normalized.EXPO_PUBLIC_SUPABASE_URL;
  const publicWebOrigin = normalizePublicWebOrigin(
    normalized.EXPO_PUBLIC_WEB_ORIGIN,
  );
  const missingKeys = REQUIRED_PUBLIC_KEYS.filter((key) => !normalized[key]);

  if (
    missingKeys.length > 0 ||
    !privyAppId ||
    !supabaseAnonKey ||
    !supabaseUrl ||
    chainId === null
  ) {
    return {
      invalidKeys: chainId === null ? ["EXPO_PUBLIC_CHAIN_ID"] : [],
      missingKeys,
      ok: false,
    };
  }

  return {
    config: {
      chainId,
      privyAppId,
      privyClientId: normalized.EXPO_PUBLIC_PRIVY_CLIENT_ID,
      ...(publicWebOrigin ? { publicWebOrigin } : {}),
      supabaseAnonKey,
      supabaseUrl,
      walletLoginPath:
        normalized.EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH ??
        "/functions/v1/wallet-login",
    },
    ok: true,
  };
}

export function readPublicConfig(): PublicConfigResult {
  return parsePublicConfig({
    EXPO_PUBLIC_CHAIN_ID: process.env.EXPO_PUBLIC_CHAIN_ID,
    EXPO_PUBLIC_PRIVY_APP_ID: process.env.EXPO_PUBLIC_PRIVY_APP_ID,
    EXPO_PUBLIC_PRIVY_CLIENT_ID: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,
    EXPO_PUBLIC_WEB_ORIGIN: process.env.EXPO_PUBLIC_WEB_ORIGIN,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH:
      process.env.EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH,
  });
}

function parseChainId(
  value: string | undefined,
): SupportedPublicChainId | null {
  if (value === undefined) return 97;
  if (value === "56") return 56;
  if (value === "97") return 97;
  return null;
}

function normalizePublicWebOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function normalizeEnv(env: PublicConfigEnv): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => {
      const trimmed = value?.trim();
      return [key, trimmed ? trimmed : undefined];
    }),
  );
}
