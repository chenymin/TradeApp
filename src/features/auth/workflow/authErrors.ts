export type AuthErrorInput =
  | { source: "privy"; reason: "cancelled" | "token_missing" | "unknown" }
  | { source: "exchange"; status: number }
  | { source: "network"; reason: "timeout" | "offline" | "unknown" }
  | { source: "storage"; operation: "restore_session" | "set_session" | "clear_session" };

export type AuthErrorCode =
  | "privy_cancelled"
  | "privy_token_missing"
  | "unauthorized"
  | "account_disabled"
  | "server_unavailable"
  | "network_timeout"
  | "network_unavailable"
  | "session_storage_failed"
  | "unknown_auth_error";

export type ClassifiedAuthError = {
  code: AuthErrorCode;
  retryable: boolean;
};

export function classifyAuthError(error: AuthErrorInput): ClassifiedAuthError {
  if (error.source === "privy") {
    if (error.reason === "cancelled") {
      return { code: "privy_cancelled", retryable: false };
    }
    if (error.reason === "token_missing") {
      return { code: "privy_token_missing", retryable: false };
    }
    return { code: "unknown_auth_error", retryable: false };
  }

  if (error.source === "exchange") {
    if (error.status === 401) {
      return { code: "unauthorized", retryable: false };
    }
    if (error.status === 403) {
      return { code: "account_disabled", retryable: false };
    }
    if (error.status >= 500) {
      return { code: "server_unavailable", retryable: true };
    }
    return { code: "unknown_auth_error", retryable: false };
  }

  if (error.source === "network") {
    if (error.reason === "timeout") {
      return { code: "network_timeout", retryable: true };
    }
    return { code: "network_unavailable", retryable: true };
  }

  return { code: "session_storage_failed", retryable: false };
}
