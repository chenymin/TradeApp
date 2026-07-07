const REQUIRED_PUBLIC_KEYS = [
  "EXPO_PUBLIC_PRIVY_APP_ID",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export type PublicConfigEnv = Partial<
  Record<
    | (typeof REQUIRED_PUBLIC_KEYS)[number]
    | "EXPO_PUBLIC_PRIVY_CLIENT_ID"
    | "EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH",
    string
  >
>;

export type PublicConfig = {
  privyAppId: string;
  privyClientId?: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
  walletLoginPath: string;
};

export type PublicConfigResult =
  | { config: PublicConfig; ok: true }
  | { missingKeys: string[]; ok: false };

export function parsePublicConfig(env: PublicConfigEnv): PublicConfigResult {
  const normalized = normalizeEnv(env);
  const privyAppId = normalized.EXPO_PUBLIC_PRIVY_APP_ID;
  const supabaseAnonKey = normalized.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrl = normalized.EXPO_PUBLIC_SUPABASE_URL;
  const missingKeys = REQUIRED_PUBLIC_KEYS.filter((key) => !normalized[key]);

  if (missingKeys.length > 0 || !privyAppId || !supabaseAnonKey || !supabaseUrl) {
    return {
      missingKeys,
      ok: false,
    };
  }

  return {
    config: {
      privyAppId,
      privyClientId: normalized.EXPO_PUBLIC_PRIVY_CLIENT_ID,
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
    EXPO_PUBLIC_PRIVY_APP_ID: process.env.EXPO_PUBLIC_PRIVY_APP_ID,
    EXPO_PUBLIC_PRIVY_CLIENT_ID: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH:
      process.env.EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH,
  });
}

function normalizeEnv(env: PublicConfigEnv): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => {
      const trimmed = value?.trim();
      return [key, trimmed ? trimmed : undefined];
    }),
  );
}
