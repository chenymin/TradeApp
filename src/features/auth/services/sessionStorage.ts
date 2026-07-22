import type { AuthExchangeSession } from "./authExchangeClient";
import { parseAuthViewer } from "../domain/authViewer";
import type { AuthViewer } from "../domain/authViewer";

export const SUPABASE_SESSION_STORAGE_KEY = "mytradeapp.supabase.session";

export type SupabaseSessionClient = {
  auth: {
    setSession: (session: {
      access_token: string;
      refresh_token: string;
    }) => Promise<{ error: unknown | null }>;
    signOut: () => Promise<{ error: unknown | null }>;
  };
};

export type SecureSessionStorage = {
  deleteItemAsync: (key: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

export type SessionStorageOperation =
  | "restore_session"
  | "set_session"
  | "replace_viewer"
  | "clear_session";

export class SessionStorageError extends Error {
  readonly code: "session_storage_failed";
  readonly operation: SessionStorageOperation;

  constructor(
    code: "session_storage_failed",
    options: { operation: SessionStorageOperation },
  ) {
    super(code);
    this.name = "SessionStorageError";
    this.code = code;
    this.operation = options.operation;
  }
}

export type SessionStorageOptions = {
  secureStorage: SecureSessionStorage;
  supabase: SupabaseSessionClient;
};

export async function setStoredSession({
  secureStorage,
  session,
  supabase,
}: SessionStorageOptions & {
  session: AuthExchangeSession;
}): Promise<void> {
  try {
    await setSupabaseSession(supabase, session);
    await secureStorage.setItemAsync(
      SUPABASE_SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );
  } catch {
    throw new SessionStorageError("session_storage_failed", {
      operation: "set_session",
    });
  }
}

export async function restoreStoredSession({
  secureStorage,
  supabase,
}: SessionStorageOptions): Promise<AuthExchangeSession | null> {
  let rawSession: string | null;

  try {
    rawSession = await secureStorage.getItemAsync(SUPABASE_SESSION_STORAGE_KEY);
  } catch {
    throw new SessionStorageError("session_storage_failed", {
      operation: "restore_session",
    });
  }

  const session = parseStoredSession(rawSession);

  if (!session || isExpired(session)) {
    return null;
  }

  if (!session.viewer) {
    try {
      await supabase.auth.signOut();
      await secureStorage.deleteItemAsync(SUPABASE_SESSION_STORAGE_KEY);
    } catch {
      throw new SessionStorageError("session_storage_failed", {
        operation: "restore_session",
      });
    }
    return null;
  }

  try {
    await setSupabaseSession(supabase, session);
  } catch {
    throw new SessionStorageError("session_storage_failed", {
      operation: "restore_session",
    });
  }

  return session;
}

export async function clearStoredSession({
  secureStorage,
  supabase,
}: SessionStorageOptions): Promise<void> {
  try {
    await supabase.auth.signOut();
    await secureStorage.deleteItemAsync(SUPABASE_SESSION_STORAGE_KEY);
  } catch {
    throw new SessionStorageError("session_storage_failed", {
      operation: "clear_session",
    });
  }
}

export async function replaceStoredSessionViewer({
  expectedViewerId,
  secureStorage,
  viewer,
}: {
  expectedViewerId: string;
  secureStorage: SecureSessionStorage;
  viewer: AuthViewer;
}): Promise<void> {
  try {
    const session = parseStoredSession(
      await secureStorage.getItemAsync(SUPABASE_SESSION_STORAGE_KEY),
    );
    if (
      !session ||
      isExpired(session) ||
      !session.viewer ||
      session.viewer.id !== expectedViewerId ||
      viewer.id !== expectedViewerId
    ) {
      throw new Error("viewer_session_mismatch");
    }

    await secureStorage.setItemAsync(
      SUPABASE_SESSION_STORAGE_KEY,
      JSON.stringify({ ...session, viewer }),
    );
  } catch {
    throw new SessionStorageError("session_storage_failed", {
      operation: "replace_viewer",
    });
  }
}

async function setSupabaseSession(
  supabase: SupabaseSessionClient,
  session: AuthExchangeSession,
): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    // wallet-login currently returns a short-lived Supabase JWT without a refresh token.
    refresh_token: session.refreshToken ?? session.accessToken,
  });

  if (error) {
    throw error;
  }
}

function parseStoredSession(rawSession: string | null): AuthExchangeSession | null {
  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as Partial<AuthExchangeSession>;

    if (typeof parsed.accessToken !== "string") {
      return null;
    }

    const viewer = parseAuthViewer(parsed.viewer);

    return {
      accessToken: parsed.accessToken,
      expiresAt:
        typeof parsed.expiresAt === "number" ? parsed.expiresAt : undefined,
      refreshToken:
        typeof parsed.refreshToken === "string" ? parsed.refreshToken : undefined,
      ...(viewer ? { viewer } : {}),
    };
  } catch {
    return null;
  }
}

function isExpired(session: AuthExchangeSession): boolean {
  if (!session.expiresAt) {
    return false;
  }

  return session.expiresAt <= Math.floor(Date.now() / 1000);
}
