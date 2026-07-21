import { parseAuthViewer, type AuthViewer } from "../domain/authViewer";

export type AuthExchangeSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  viewer?: AuthViewer;
};

export type AuthExchangeResult = {
  userStatus?: AuthExchangeUserStatus;
  session: AuthExchangeSession;
  viewer: AuthViewer;
};

export type AuthExchangeUserStatus = "existing" | "new" | "orphaned";

export type AuthExchangeErrorCode =
  | "unauthorized"
  | "account_disabled"
  | "server_unavailable"
  | "network_unavailable"
  | "invalid_response"
  | "exchange_failed";

export class AuthExchangeError extends Error {
  readonly code: AuthExchangeErrorCode;
  readonly details?: string;
  readonly retryable: boolean;

  constructor(
    code: AuthExchangeErrorCode,
    options: { details?: string; retryable: boolean },
  ) {
    super(code);
    this.name = "AuthExchangeError";
    this.code = code;
    this.details = options.details;
    this.retryable = options.retryable;
  }
}

export type ExchangePrivyTokenOptions = {
  endpoint: string;
  fetch?: typeof fetch;
  now?: () => number;
  privyAccessToken: string;
};

type ExchangeResponseBody = {
  access_token?: unknown;
  expires_in?: unknown;
  user?: unknown;
  user_status?: unknown;
  session?: {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_at?: unknown;
  };
};

export async function exchangePrivyTokenForSession({
  endpoint,
  fetch: fetchImpl = fetch,
  now = () => Math.floor(Date.now() / 1000),
  privyAccessToken,
}: ExchangePrivyTokenOptions): Promise<AuthExchangeResult> {
  let response: Response;

  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ privyToken: privyAccessToken }),
    });
  } catch {
    throw new AuthExchangeError("network_unavailable", { retryable: true });
  }

  if (!response.ok) {
    throw mapStatusToError(response.status, await parseErrorDetails(response));
  }

  const body = await parseJson(response);
  return parseAuthExchangeResponse(body, now);
}

function mapStatusToError(
  status: number,
  details: string | undefined,
): AuthExchangeError {
  if (status === 401) {
    return new AuthExchangeError("unauthorized", { details, retryable: false });
  }

  if (status === 403) {
    return new AuthExchangeError("account_disabled", { details, retryable: false });
  }

  if (status >= 500) {
    return new AuthExchangeError("server_unavailable", { details, retryable: true });
  }

  return new AuthExchangeError("exchange_failed", { details, retryable: false });
}

async function parseErrorDetails(response: Response): Promise<string | undefined> {
  const prefix = `HTTP ${response.status}`;

  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    const details = [
      typeof body.error === "string" ? body.error : null,
      typeof body.message === "string" ? body.message : null,
    ].filter((detail): detail is string => Boolean(detail));

    return details.length ? `${prefix}: ${details.join(": ")}` : prefix;
  } catch {
    return prefix;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AuthExchangeError("invalid_response", { retryable: false });
  }
}

export function parseAuthExchangeResponse(
  body: unknown,
  now: () => number = () => Math.floor(Date.now() / 1000),
): AuthExchangeResult {
  const parsedBody = body as ExchangeResponseBody;
  const session = parsedBody.session;
  const userStatus = parseUserStatus(parsedBody.user_status);
  const viewer = parseAuthViewer(parsedBody.user);

  if (!viewer) {
    throw new AuthExchangeError("invalid_response", { retryable: false });
  }

  if (typeof parsedBody.access_token === "string") {
    const result: AuthExchangeResult = {
      ...(userStatus ? { userStatus } : {}),
      session: {
        accessToken: parsedBody.access_token,
      },
      viewer,
    };

    if (typeof parsedBody.expires_in === "number") {
      result.session.expiresAt = now() + parsedBody.expires_in;
    }

    return result;
  }

  if (!session || typeof session.access_token !== "string") {
    throw new AuthExchangeError("invalid_response", { retryable: false });
  }

  const result: AuthExchangeResult = {
    ...(userStatus ? { userStatus } : {}),
    session: {
      accessToken: session.access_token,
    },
    viewer,
  };

  if (typeof session.refresh_token === "string") {
    result.session.refreshToken = session.refresh_token;
  }

  if (typeof session.expires_at === "number") {
    result.session.expiresAt = session.expires_at;
  }

  return result;
}

function parseUserStatus(value: unknown): AuthExchangeUserStatus | null {
  if (value === "existing" || value === "new" || value === "orphaned") {
    return value;
  }

  return null;
}
