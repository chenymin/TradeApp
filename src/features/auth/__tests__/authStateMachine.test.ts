import { describe, expect, it } from "vitest";

import {
  getInitialAuthState,
  transitionAuthState,
} from "../workflow/authStateMachine";

describe("authStateMachine", () => {
  it("starts logged out without a trusted client identity", () => {
    expect(getInitialAuthState()).toEqual({ status: "logged_out" });
  });

  it("moves through the successful Privy and Supabase exchange path", () => {
    let state = getInitialAuthState();

    state = transitionAuthState(state, { type: "restore_session" });
    expect(state).toEqual({ status: "restoring_session" });

    state = transitionAuthState(state, { type: "session_missing" });
    expect(state).toEqual({ status: "logged_out" });

    state = transitionAuthState(state, { type: "start_login" });
    expect(state).toEqual({ status: "privy_authenticating" });

    state = transitionAuthState(state, { type: "privy_authenticated" });
    expect(state).toEqual({ status: "privy_authenticated" });

    state = transitionAuthState(state, { type: "start_exchange" });
    expect(state).toEqual({ status: "exchanging_session" });

    state = transitionAuthState(state, { type: "session_established" });
    expect(state).toEqual({ status: "authenticated" });
  });

  it("keeps illegal shortcuts out of authenticated state", () => {
    expect(
      transitionAuthState({ status: "logged_out" }, { type: "session_established" }),
    ).toEqual({ status: "logged_out" });

    expect(
      transitionAuthState(
        { status: "privy_authenticated" },
        { type: "session_established" },
      ),
    ).toEqual({ status: "privy_authenticated" });

    expect(
      transitionAuthState({ status: "account_disabled" }, { type: "session_established" }),
    ).toEqual({ status: "account_disabled" });
  });

  it("models disabled accounts, failed auth, and logout explicitly", () => {
    expect(
      transitionAuthState({ status: "exchanging_session" }, { type: "account_disabled" }),
    ).toEqual({ status: "account_disabled" });

    expect(
      transitionAuthState({ status: "privy_authenticating" }, { type: "auth_failed" }),
    ).toEqual({ status: "auth_failed" });

    const loggingOut = transitionAuthState(
      { status: "authenticated" },
      { type: "start_logout" },
    );
    expect(loggingOut).toEqual({ status: "logging_out" });
    expect(transitionAuthState(loggingOut, { type: "logout_complete" })).toEqual({
      status: "logged_out",
    });
  });

  it("models orphaned account recovery as an explicit auth state", () => {
    expect(
      transitionAuthState({ status: "exchanging_session" }, { type: "orphaned_recovery" }),
    ).toEqual({ status: "orphaned_recovery" });
    expect(
      transitionAuthState({ status: "orphaned_recovery" }, { type: "start_login" }),
    ).toEqual({ status: "privy_authenticating" });
    expect(
      transitionAuthState({ status: "orphaned_recovery" }, { type: "start_logout" }),
    ).toEqual({ status: "logging_out" });
  });
});
