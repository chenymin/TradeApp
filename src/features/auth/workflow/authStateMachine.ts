export type AuthStatus =
  | "logged_out"
  | "restoring_session"
  | "privy_authenticating"
  | "privy_authenticated"
  | "exchanging_session"
  | "orphaned_recovery"
  | "authenticated"
  | "account_disabled"
  | "auth_failed"
  | "logging_out";

export type AuthState = {
  status: AuthStatus;
};

export type AuthEvent =
  | { type: "restore_session" }
  | { type: "session_missing" }
  | { type: "start_login" }
  | { type: "privy_authenticated" }
  | { type: "start_exchange" }
  | { type: "session_established" }
  | { type: "orphaned_recovery" }
  | { type: "account_disabled" }
  | { type: "auth_failed" }
  | { type: "start_logout" }
  | { type: "logout_complete" };

export function getInitialAuthState(): AuthState {
  return { status: "logged_out" };
}

export function transitionAuthState(state: AuthState, _event: AuthEvent): AuthState {
  switch (state.status) {
    case "logged_out":
      if (_event.type === "restore_session") {
        return { status: "restoring_session" };
      }
      if (_event.type === "start_login") {
        return { status: "privy_authenticating" };
      }
      return state;
    case "restoring_session":
      if (_event.type === "session_missing") {
        return { status: "logged_out" };
      }
      return state;
    case "privy_authenticating":
      if (_event.type === "privy_authenticated") {
        return { status: "privy_authenticated" };
      }
      if (_event.type === "auth_failed") {
        return { status: "auth_failed" };
      }
      return state;
    case "privy_authenticated":
      if (_event.type === "start_exchange") {
        return { status: "exchanging_session" };
      }
      return state;
    case "exchanging_session":
      if (_event.type === "session_established") {
        return { status: "authenticated" };
      }
      if (_event.type === "account_disabled") {
        return { status: "account_disabled" };
      }
      if (_event.type === "orphaned_recovery") {
        return { status: "orphaned_recovery" };
      }
      if (_event.type === "auth_failed") {
        return { status: "auth_failed" };
      }
      return state;
    case "orphaned_recovery":
      if (_event.type === "start_login") {
        return { status: "privy_authenticating" };
      }
      if (_event.type === "start_logout") {
        return { status: "logging_out" };
      }
      return state;
    case "authenticated":
      if (_event.type === "start_logout") {
        return { status: "logging_out" };
      }
      return state;
    case "logging_out":
      if (_event.type === "logout_complete") {
        return { status: "logged_out" };
      }
      return state;
    case "account_disabled":
    case "auth_failed":
      return state;
    default:
      return state;
  }
}
