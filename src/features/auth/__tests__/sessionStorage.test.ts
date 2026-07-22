import { describe, expect, it, vi } from "vitest";

import {
  SessionStorageError,
  clearStoredSession,
  replaceStoredSessionViewer,
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
      viewer: {
        email: "viewer@example.com",
        id: "viewer-1",
        walletAddress: "0xabc",
      },
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
      viewer: {
        email: null,
        id: "viewer-1",
        walletAddress: null,
      },
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

  it("invalidates a stored session that has no verified viewer", async () => {
    const supabase = fakeSupabaseClient();
    const session = {
      accessToken: "access-token",
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    };
    const secureStorage = fakeSecureStorage(JSON.stringify(session));

    await expect(restoreStoredSession({ secureStorage, supabase })).resolves.toBeNull();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledOnce();
    expect(secureStorage.deleteItemAsync).toHaveBeenCalledWith(
      "mytradeapp.supabase.session",
    );
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

  it("replaces only the Viewer while preserving every session credential", async () => {
    const supabase = fakeSupabaseClient();
    const session = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      viewer: {
        email: "viewer@example.com",
        id: "viewer-1",
        walletAddress: "0xabc",
      },
    };
    const secureStorage = fakeSecureStorage(JSON.stringify(session));
    const replacementViewer = {
      ...session.viewer,
      walletAddress: "0xdef",
    };

    await replaceStoredSessionViewer({
      expectedViewerId: "viewer-1",
      secureStorage,
      viewer: replacementViewer,
    });

    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(secureStorage.setItemAsync).toHaveBeenCalledOnce();
    expect(JSON.parse(secureStorage.setItemAsync.mock.calls[0][1])).toEqual({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      viewer: replacementViewer,
    });
  });

  it.each([
    ["response account mismatch", "other-viewer", Math.floor(Date.now() / 1000) + 60],
    ["expired session", "viewer-1", 1],
  ])("rejects Viewer persistence for %s", async (_case, viewerId, expiresAt) => {
    const session = {
      accessToken: "access-token",
      expiresAt,
      viewer: { email: null, id: "viewer-1", walletAddress: "0xabc" },
    };
    const secureStorage = fakeSecureStorage(JSON.stringify(session));

    await expect(replaceStoredSessionViewer({
      expectedViewerId: "viewer-1",
      secureStorage,
      viewer: { email: null, id: viewerId, walletAddress: "0xdef" },
    })).rejects.toEqual(
      new SessionStorageError("session_storage_failed", {
        operation: "replace_viewer",
      }),
    );
    expect(secureStorage.setItemAsync).not.toHaveBeenCalled();
  });

  it("rejects Viewer persistence when the stored session belongs to another account", async () => {
    const session = {
      accessToken: "access-token",
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      viewer: { email: null, id: "other-viewer", walletAddress: "0xabc" },
    };
    const secureStorage = fakeSecureStorage(JSON.stringify(session));

    await expect(replaceStoredSessionViewer({
      expectedViewerId: "viewer-1",
      secureStorage,
      viewer: { email: null, id: "viewer-1", walletAddress: "0xdef" },
    })).rejects.toEqual(
      new SessionStorageError("session_storage_failed", {
        operation: "replace_viewer",
      }),
    );
    expect(secureStorage.setItemAsync).not.toHaveBeenCalled();
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
