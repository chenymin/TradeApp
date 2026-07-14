import { describe, expect, it, vi } from "vitest";

import {
  SessionStorageError,
  clearStoredSession,
  restoreStoredSession,
  setStoredSession,
} from "../services/sessionStorage";

describe("sessionStorage", () => {
  it("sets the Supabase session and persists it in secure storage", async () => {
    const supabase = fakeSupabaseClient();
    const secureStorage = fakeSecureStorage();
    const session = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 1_800_000_000,
    };

    await setStoredSession({ secureStorage, session, supabase });

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(secureStorage.setItemAsync).toHaveBeenCalledWith(
      "mytradeapp.supabase.session",
      JSON.stringify(session),
    );
  });

  it("uses an access-token-only session for Supabase auth compatibility", async () => {
    const supabase = fakeSupabaseClient();
    const secureStorage = fakeSecureStorage();
    const session = { accessToken: "access-token" };

    await setStoredSession({ secureStorage, session, supabase });

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "access-token",
    });
    expect(secureStorage.setItemAsync).toHaveBeenCalledWith(
      "mytradeapp.supabase.session",
      JSON.stringify(session),
    );
  });

  it("restores a valid session into Supabase auth", async () => {
    const supabase = fakeSupabaseClient();
    const session = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    };
    const secureStorage = fakeSecureStorage(JSON.stringify(session));

    await expect(restoreStoredSession({ secureStorage, supabase })).resolves.toEqual(
      session,
    );
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
  });

  it("restores an access-token-only session using the compatibility token", async () => {
    const supabase = fakeSupabaseClient();
    const session = {
      accessToken: "access-token",
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    };
    const secureStorage = fakeSecureStorage(JSON.stringify(session));

    await expect(restoreStoredSession({ secureStorage, supabase })).resolves.toEqual(
      session,
    );
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "access-token",
    });
  });

  it("treats missing, expired, or invalid stored sessions as logged out", async () => {
    const supabase = fakeSupabaseClient();

    await expect(
      restoreStoredSession({ secureStorage: fakeSecureStorage(null), supabase }),
    ).resolves.toBeNull();

    await expect(
      restoreStoredSession({
        secureStorage: fakeSecureStorage(
          JSON.stringify({ accessToken: "expired", expiresAt: 1 }),
        ),
        supabase,
      }),
    ).resolves.toBeNull();

    await expect(
      restoreStoredSession({ secureStorage: fakeSecureStorage("not-json"), supabase }),
    ).resolves.toBeNull();
  });

  it("clears Supabase auth and secure storage", async () => {
    const supabase = fakeSupabaseClient();
    const secureStorage = fakeSecureStorage();

    await clearStoredSession({ secureStorage, supabase });

    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expect(secureStorage.deleteItemAsync).toHaveBeenCalledWith(
      "mytradeapp.supabase.session",
    );
  });

  it("raises a storage error when session persistence fails", async () => {
    const supabase = fakeSupabaseClient();
    const secureStorage = fakeSecureStorage();
    secureStorage.setItemAsync.mockRejectedValue(new Error("keychain unavailable"));

    await expect(
      setStoredSession({
        secureStorage,
        session: { accessToken: "access-token" },
        supabase,
      }),
    ).rejects.toEqual(
      new SessionStorageError("session_storage_failed", { operation: "set_session" }),
    );
  });
});

function fakeSupabaseClient() {
  return {
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

function fakeSecureStorage(storedValue: string | null = null) {
  return {
    deleteItemAsync: vi.fn().mockResolvedValue(undefined),
    getItemAsync: vi.fn().mockResolvedValue(storedValue),
    setItemAsync: vi.fn().mockResolvedValue(undefined),
  };
}
