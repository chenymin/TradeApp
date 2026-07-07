import { describe, expect, it } from "vitest";

import { parsePublicConfig } from "../publicConfig";

describe("parsePublicConfig", () => {
  it("returns a fatal config result with every missing public key", () => {
    const result = parsePublicConfig({});

    expect(result).toEqual({
      ok: false,
      missingKeys: [
        "EXPO_PUBLIC_PRIVY_APP_ID",
        "EXPO_PUBLIC_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      ],
    });
  });

  it("trims values and ignores optional empty wallet login path", () => {
    const result = parsePublicConfig({
      EXPO_PUBLIC_PRIVY_APP_ID: "  privy-app-id  ",
      EXPO_PUBLIC_PRIVY_CLIENT_ID: "  privy-client-id  ",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "  anon-key  ",
      EXPO_PUBLIC_SUPABASE_URL: "  https://example.supabase.co  ",
      EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH: "   ",
    });

    expect(result).toEqual({
      config: {
        privyAppId: "privy-app-id",
        privyClientId: "privy-client-id",
        supabaseAnonKey: "anon-key",
        supabaseUrl: "https://example.supabase.co",
        walletLoginPath: "/functions/v1/wallet-login",
      },
      ok: true,
    });
  });

  it("keeps an explicit wallet login path when supplied", () => {
    const result = parsePublicConfig({
      EXPO_PUBLIC_PRIVY_APP_ID: "privy-app-id",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH: "/custom-wallet-login",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.walletLoginPath).toBe("/custom-wallet-login");
    }
  });
});
