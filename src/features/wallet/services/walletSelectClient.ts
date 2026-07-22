import {
  parseAuthViewer,
  type AuthViewer,
} from "../../auth/domain/authViewer";

export type WalletSelectClientErrorCode =
  | "internal_error"
  | "invalid_response"
  | "network_unavailable"
  | "operation_conflict"
  | "server_unavailable"
  | "stale_previous_wallet"
  | "unauthorized"
  | "wallet_owned_by_another_investor"
  | "wallet_state_inconsistent";

export class WalletSelectClientError extends Error {
  readonly code: WalletSelectClientErrorCode;
  readonly retryable: boolean;
  readonly serverCode?: string;

  constructor(
    code: WalletSelectClientErrorCode,
    options: { retryable: boolean; serverCode?: string },
  ) {
    super(code);
    this.name = "WalletSelectClientError";
    this.code = code;
    this.retryable = options.retryable;
    this.serverCode = options.serverCode;
  }
}

type WalletSelectRequest = {
  endpoint: string;
  expectedPreviousAddress: `0x${string}`;
  fetcher?: typeof fetch;
  operationId: string;
  privyToken: string;
  supabasePublicKey: string;
  targetAddress: `0x${string}`;
};

const CONFLICT_CODES = new Set<WalletSelectClientErrorCode>([
  "operation_conflict",
  "stale_previous_wallet",
  "wallet_owned_by_another_investor",
  "wallet_state_inconsistent",
]);

export async function selectWalletForViewer({
  endpoint,
  expectedPreviousAddress,
  fetcher = fetch,
  operationId,
  privyToken,
  supabasePublicKey,
  targetAddress,
}: WalletSelectRequest): Promise<{
  idempotent: boolean;
  operationId: string;
  viewer: AuthViewer;
}> {
  let response: Response;

  try {
    response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        apikey: supabasePublicKey,
        Authorization: `Bearer ${supabasePublicKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedPreviousAddress,
        operationId,
        privyToken,
        targetAddress,
      }),
    });
  } catch {
    throw new WalletSelectClientError("network_unavailable", {
      retryable: true,
    });
  }

  const body = await parseResponseBody(response);
  if (!response.ok) {
    throw mapWalletSelectError(response.status, body);
  }

  const responseOperationId = getStringField(body, "operation_id");
  const idempotent = getBooleanField(body, "idempotent");
  const viewer = getObjectField(body, "user");
  if (
    responseOperationId !== operationId ||
    idempotent === undefined ||
    hasOwnField(body, "access_token") ||
    hasOwnField(body, "expires_in") ||
    hasOwnField(body, "session")
  ) {
    throw new WalletSelectClientError("invalid_response", {
      retryable: false,
    });
  }

  const parsedViewer = parseAuthViewer(viewer);
  if (!parsedViewer) {
    throw new WalletSelectClientError("invalid_response", {
      retryable: false,
    });
  }

  return {
    idempotent,
    operationId: responseOperationId,
    viewer: parsedViewer,
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new WalletSelectClientError("invalid_response", {
      retryable: false,
    });
  }
}

function mapWalletSelectError(
  status: number,
  body: unknown,
): WalletSelectClientError {
  const serverCode = getStringField(body, "error");

  if (status === 401) {
    return new WalletSelectClientError("unauthorized", {
      retryable: false,
      ...(serverCode ? { serverCode } : {}),
    });
  }

  if (status === 409 && serverCode && CONFLICT_CODES.has(
    serverCode as WalletSelectClientErrorCode,
  )) {
    return new WalletSelectClientError(
      serverCode as WalletSelectClientErrorCode,
      { retryable: false, serverCode },
    );
  }

  if (status >= 500) {
    return new WalletSelectClientError("server_unavailable", {
      retryable: true,
      ...(serverCode ? { serverCode } : {}),
    });
  }

  return new WalletSelectClientError("internal_error", {
    retryable: false,
    ...(serverCode ? { serverCode } : {}),
  });
}

function getStringField(value: unknown, field: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}

function getBooleanField(value: unknown, field: string): boolean | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === "boolean" ? candidate : undefined;
}

function getObjectField(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[field];
}

function hasOwnField(value: unknown, field: string): boolean {
  return !!value && typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, field);
}
