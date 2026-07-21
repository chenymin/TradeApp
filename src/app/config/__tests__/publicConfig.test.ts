import { describe, expect, it } from "vitest";

import { parsePublicConfig } from "../publicConfig";

describe("parsePublicConfig", () => {
  it("returns a fatal config result with every missing public key", () => {
    const result = parsePublicConfig({});

    expect(result).toEqual({
      invalidKeys: [],
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
        chainId: 97,
        privyAppId: "privy-app-id",
        privyClientId: "privy-client-id",
        supabaseAnonKey: "anon-key",
        supabaseUrl: "https://example.supabase.co",
        walletLoginPath: "/functions/v1/wallet-login",
        walletSelectPath: "/functions/v1/wallet-select",
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

  it("defaults and overrides the wallet-select endpoint path", () => {
    const defaultResult = parsePublicConfig(validEnv());
    const customResult = parsePublicConfig(validEnv({
      EXPO_PUBLIC_SUPABASE_WALLET_SELECT_PATH: "/custom-wallet-select",
    }));

    expect(defaultResult).toMatchObject({
      ok: true,
      config: { walletSelectPath: "/functions/v1/wallet-select" },
    });
    expect(customResult).toMatchObject({
      ok: true,
      config: { walletSelectPath: "/custom-wallet-select" },
    });
  });

  it("treats Reown project id as an optional connection capability", () => {
    const disabled = parsePublicConfig(validEnv());
    const enabled = parsePublicConfig(validEnv({
      EXPO_PUBLIC_REOWN_PROJECT_ID: "  reown-project-id  ",
    }));

    expect(disabled).toMatchObject({
      ok: true,
      config: { reownProjectId: undefined },
    });
    expect(enabled).toMatchObject({
      ok: true,
      config: { reownProjectId: "reown-project-id" },
    });
    expect(JSON.stringify(disabled)).not.toContain("reown-project-id");
  });

  it("normalizes an optional secure public web origin", () => {
    const result = parsePublicConfig(validEnv({
      EXPO_PUBLIC_WEB_ORIGIN: "  https://test.artstarex.com/  ",
    }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.publicWebOrigin).toBe("https://test.artstarex.com");
    }
  });

  it.each([
    "http://localhost:5173",
    "not a url",
    "https://user:password@example.com",
    "https://example.com/register",
    "https://example.com/?ref=value",
  ])("ignores unsafe or non-origin public web value %s", (publicWebOrigin) => {
    const result = parsePublicConfig(validEnv({
      EXPO_PUBLIC_WEB_ORIGIN: publicWebOrigin,
    }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.publicWebOrigin).toBeUndefined();
    }
  });

  it.each([
    [undefined, 97],
    [" 56 ", 56],
    [" 97 ", 97],
  ])("maps EXPO_PUBLIC_CHAIN_ID=%s to %s", (value, chainId) => {
    const result = parsePublicConfig(validEnv({
      ...(value ? { EXPO_PUBLIC_CHAIN_ID: value } : {}),
    }));

    expect(result).toMatchObject({ ok: true, config: { chainId } });
  });

  it.each(["0", "1", "98", "bsc", "56.0"])(
    "rejects unsupported chain value %s",
    (value) => {
      expect(parsePublicConfig(validEnv({ EXPO_PUBLIC_CHAIN_ID: value })))
        .toEqual({
          invalidKeys: ["EXPO_PUBLIC_CHAIN_ID"],
          missingKeys: [],
          ok: false,
        });
    },
  );
});

function validEnv(overrides: Record<string, string> = {}) {
  return {
    EXPO_PUBLIC_PRIVY_APP_ID: "privy-app-id",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    ...overrides,
  };
}
