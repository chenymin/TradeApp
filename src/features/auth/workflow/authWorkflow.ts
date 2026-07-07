import type {
  AuthExchangeSession,
  AuthExchangeUserStatus,
} from "../services/authExchangeClient";
import type { RegistrationPayload } from "../../registration/domain/registrationPayload";
import type { AuthState } from "./authStateMachine";

export type AuthWorkflowError = {
  code: string;
  details?: string;
  retryable: boolean;
};

export type AuthWorkflowResult = AuthState & {
  error?: AuthWorkflowError;
  notice?: "existing_user_with_invite";
};

export type AuthWorkflowAdapters = {
  exchange: {
    exchange: (privyAccessToken: string) => Promise<{
      session: AuthExchangeSession;
      userStatus?: AuthExchangeUserStatus;
    }>;
  };
  privy: {
    login: () => Promise<{ accessToken: string }>;
    logout: () => Promise<void>;
  };
  session: {
    clearSession: () => Promise<void>;
    restoreSession: () => Promise<AuthExchangeSession | null>;
    setSession: (session: AuthExchangeSession) => Promise<void>;
  };
  registration?: {
    clearPayload: () => Promise<void>;
    getPayload: () => Promise<RegistrationPayload | null>;
    register: ({
      accessToken,
      payload,
    }: {
      accessToken: string;
      payload: RegistrationPayload;
    }) => Promise<void>;
    setExistingUserInviteIgnored: () => Promise<void>;
  };
};

export function createAuthWorkflow(adapters: AuthWorkflowAdapters) {
  let pendingRecoverySession: AuthExchangeSession | null = null;

  return {
    login: () =>
      login(adapters, {
        setPendingRecoverySession: (session) => {
          pendingRecoverySession = session;
        },
      }),
    logout: () => {
      pendingRecoverySession = null;
      return logout(adapters);
    },
    recoverAsInvestor: () =>
      recoverAsInvestor(adapters, {
        clearPendingRecoverySession: () => {
          pendingRecoverySession = null;
        },
        getPendingRecoverySession: () => pendingRecoverySession,
      }),
    restoreSession: () => restoreSession(adapters),
  };
}

async function login(
  adapters: AuthWorkflowAdapters,
  recovery: {
    setPendingRecoverySession: (session: AuthExchangeSession) => void;
  },
): Promise<AuthWorkflowResult> {
  let privyLogin: { accessToken: string };

  try {
    privyLogin = await adapters.privy.login();
  } catch (error) {
    const authError = normalizeWorkflowError(error);
    return {
      error: authError,
      status: authError.code === "privy_cancelled" ? "logged_out" : "auth_failed",
    };
  }

  try {
    const exchanged = await exchangeWithRetry(adapters, privyLogin.accessToken);
    const registrationResult = await resolveRegistration(adapters, exchanged);

    if (registrationResult.status === "orphaned_recovery") {
      recovery.setPendingRecoverySession(exchanged.session);
      await clearSessionBestEffort(adapters);
      return { status: "orphaned_recovery" };
    }

    await adapters.session.setSession(exchanged.session);
    return {
      ...(registrationResult.notice ? { notice: registrationResult.notice } : {}),
      status: "authenticated",
    };
  } catch (error) {
    const authError = normalizeWorkflowError(error);

    if (authError.code === "account_disabled") {
      return { error: authError, status: "account_disabled" };
    }

    await clearSessionBestEffort(adapters);
    return { error: authError, status: "auth_failed" };
  }
}

async function resolveRegistration(
  adapters: AuthWorkflowAdapters,
  exchanged: {
    session: AuthExchangeSession;
    userStatus?: AuthExchangeUserStatus;
  },
): Promise<
  | { notice?: "existing_user_with_invite"; status: "authenticated" }
  | { status: "orphaned_recovery" }
> {
  const registration = adapters.registration;
  const userStatus = exchanged.userStatus ?? "existing";

  if (!registration) {
    return { status: "authenticated" };
  }

  const storedPayload = await registration.getPayload();

  if (userStatus === "existing") {
    if (storedPayload) {
      await registration.clearPayload();
      await registration.setExistingUserInviteIgnored();
      return { notice: "existing_user_with_invite", status: "authenticated" };
    }

    return { status: "authenticated" };
  }

  if (userStatus === "orphaned" && !storedPayload) {
    return { status: "orphaned_recovery" };
  }

  const payload = storedPayload ?? { selectedType: "investor" as const };
  await registration.register({
    accessToken: exchanged.session.accessToken,
    payload,
  });
  await registration.clearPayload();

  return { status: "authenticated" };
}

async function recoverAsInvestor(
  adapters: AuthWorkflowAdapters,
  recovery: {
    clearPendingRecoverySession: () => void;
    getPendingRecoverySession: () => AuthExchangeSession | null;
  },
): Promise<AuthWorkflowResult> {
  const pendingRecoverySession = recovery.getPendingRecoverySession();

  if (!pendingRecoverySession || !adapters.registration) {
    return {
      error: { code: "orphaned_recovery_unavailable", retryable: false },
      status: "auth_failed",
    };
  }

  try {
    await adapters.registration.register({
      accessToken: pendingRecoverySession.accessToken,
      payload: { selectedType: "investor" },
    });
    await adapters.session.setSession(pendingRecoverySession);
    recovery.clearPendingRecoverySession();
    return { status: "authenticated" };
  } catch (error) {
    await clearSessionBestEffort(adapters);
    return {
      error: normalizeWorkflowError(error),
      status: "auth_failed",
    };
  }
}

async function restoreSession(
  adapters: AuthWorkflowAdapters,
): Promise<AuthWorkflowResult> {
  try {
    const session = await adapters.session.restoreSession();
    return { status: session ? "authenticated" : "logged_out" };
  } catch (error) {
    return {
      error: normalizeWorkflowError(error),
      status: "auth_failed",
    };
  }
}

async function logout(adapters: AuthWorkflowAdapters): Promise<AuthWorkflowResult> {
  try {
    await adapters.session.clearSession();
    await adapters.privy.logout();
    return { status: "logged_out" };
  } catch (error) {
    return {
      error: normalizeWorkflowError(error),
      status: "auth_failed",
    };
  }
}

async function exchangeWithRetry(
  adapters: AuthWorkflowAdapters,
  privyAccessToken: string,
): Promise<{ session: AuthExchangeSession }> {
  try {
    return await adapters.exchange.exchange(privyAccessToken);
  } catch (error) {
    const authError = normalizeWorkflowError(error);

    if (!authError.retryable) {
      throw authError;
    }

    return adapters.exchange.exchange(privyAccessToken);
  }
}

async function clearSessionBestEffort(adapters: AuthWorkflowAdapters): Promise<void> {
  try {
    await adapters.session.clearSession();
  } catch {
    // Login failure cleanup is best effort; the failure result remains auth_failed.
  }
}

function normalizeWorkflowError(error: unknown): AuthWorkflowError {
  const maybeError = error as {
    code?: unknown;
    details?: unknown;
    retryable?: unknown;
  };

  if (typeof maybeError.code === "string") {
    const authError: AuthWorkflowError = {
      code: maybeError.code,
      retryable: maybeError.retryable === true,
    };

    if (typeof maybeError.details === "string") {
      authError.details = maybeError.details;
    }

    return authError;
  }

  return { code: "unknown_auth_error", retryable: false };
}
