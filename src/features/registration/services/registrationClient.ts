import {
  toRegisterUserRequestBody,
  type RegistrationPayload,
} from "../domain/registrationPayload";

export type RegisterUserErrorCode =
  | "invalid_auth_token"
  | "invalid_or_expired_invitation_token"
  | "invalid_referrer_code"
  | "invalid_user_type"
  | "missing_auth_token"
  | "missing_user_type"
  | "network_unavailable"
  | "referrer_code_and_token_are_mutually_exclusive"
  | "register_failed"
  | "server_unavailable";

export class RegisterUserError extends Error {
  readonly code: RegisterUserErrorCode | string;
  readonly details?: string;
  readonly retryable: boolean;

  constructor(
    code: RegisterUserErrorCode | string,
    options: { details?: string; retryable: boolean },
  ) {
    super(code);
    this.name = "RegisterUserError";
    this.code = code;
    this.details = options.details;
    this.retryable = options.retryable;
  }
}

export async function registerUser({
  accessToken,
  endpoint,
  fetch: fetchImpl = fetch,
  payload,
}: {
  accessToken: string;
  endpoint: string;
  fetch?: typeof fetch;
  payload: RegistrationPayload;
}): Promise<void> {
  let response: Response;

  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toRegisterUserRequestBody(payload)),
    });
  } catch {
    throw new RegisterUserError("network_unavailable", { retryable: true });
  }

  if (!response.ok) {
    throw mapRegisterStatusToError(response.status, await parseErrorDetails(response));
  }
}

function mapRegisterStatusToError(
  status: number,
  details: string | undefined,
): RegisterUserError {
  const code = extractErrorCode(details) ?? "register_failed";

  if (status >= 500) {
    return new RegisterUserError(
      code === "internal_error" ? "internal_error" : "server_unavailable",
      { details, retryable: true },
    );
  }

  return new RegisterUserError(code, { details, retryable: false });
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

function extractErrorCode(details: string | undefined): string | null {
  if (!details) {
    return null;
  }

  const match = /^HTTP \d+: ([^:]+)/.exec(details);
  return match?.[1] ?? null;
}
