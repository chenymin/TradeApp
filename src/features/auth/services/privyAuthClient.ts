export type PrivyLoginMethod = "email" | "sms" | "apple" | "discord" | "github" | "google";

export type PrivyLoginConfig = {
  loginMethods: PrivyLoginMethod[];
};

export type PrivyLogin = (config: PrivyLoginConfig) => Promise<unknown>;

export type PrivyGetAccessToken = () => Promise<string | null>;

export type PrivyLogout = () => Promise<void>;

export type PrivyAuthErrorCode =
  | "privy_cancelled"
  | "privy_token_missing"
  | "privy_login_failed"
  | "privy_logout_failed";

export class PrivyAuthError extends Error {
  readonly code: PrivyAuthErrorCode;
  readonly details?: string;

  constructor(code: PrivyAuthErrorCode, options: { details?: string } = {}) {
    super(code);
    this.name = "PrivyAuthError";
    this.code = code;
    this.details = options.details;
  }
}

export type LoginWithPrivyOptions = {
  getAccessToken: PrivyGetAccessToken;
  login: PrivyLogin;
  loginConfig: PrivyLoginConfig;
};

export type LoginWithPrivyResult = {
  accessToken: string;
};

export async function loginWithPrivy({
  getAccessToken,
  login,
  loginConfig,
}: LoginWithPrivyOptions): Promise<LoginWithPrivyResult> {
  try {
    await login(loginConfig);
  } catch (error) {
    if (isPrivyAlreadyLoggedIn(error)) {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new PrivyAuthError("privy_token_missing");
      }

      return { accessToken };
    }

    if (isPrivyCancellation(error)) {
      throw new PrivyAuthError("privy_cancelled");
    }

    throw new PrivyAuthError("privy_login_failed", {
      details: getSafePrivyErrorDetails(error),
    });
  }

  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new PrivyAuthError("privy_token_missing");
  }

  return { accessToken };
}

export async function logoutFromPrivy({
  logout,
}: {
  logout: PrivyLogout;
}): Promise<void> {
  try {
    await logout();
  } catch {
    throw new PrivyAuthError("privy_logout_failed");
  }
}

function isPrivyCancellation(error: unknown): boolean {
  const maybeError = error as { code?: unknown };

  return (
    maybeError.code === "login_flow_closed" ||
    maybeError.code === "ui_flow_closed" ||
    maybeError.code === "funding_flow_cancelled"
  );
}

function isPrivyAlreadyLoggedIn(error: unknown): boolean {
  const maybeError = error as { code?: unknown };

  return maybeError.code === "user_already_logged_in";
}

function getSafePrivyErrorDetails(error: unknown): string | undefined {
  const maybeError = error as { code?: unknown; message?: unknown };
  const details = [
    typeof maybeError.code === "string" ? maybeError.code : null,
    typeof maybeError.message === "string" ? maybeError.message : null,
  ].filter((detail): detail is string => Boolean(detail));

  return details.length ? details.join(": ") : undefined;
}
