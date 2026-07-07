import { describe, expect, it, vi } from "vitest";

import { createAuthWorkflow } from "../workflow/authWorkflow";

describe("authWorkflow", () => {
  it("logs in only after Privy, Supabase exchange, and session storage all succeed", async () => {
    const adapters = fakeAdapters();
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({ status: "authenticated" });

    expect(adapters.privy.login).toHaveBeenCalledOnce();
    expect(adapters.exchange.exchange).toHaveBeenCalledWith("privy-token");
    expect(adapters.session.setSession).toHaveBeenCalledWith({
      accessToken: "supabase-token",
    });
  });

  it("registers new users with a stored invitation payload before persisting the session", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "supabase-token" },
      userStatus: "new",
    });
    adapters.registration.getPayload.mockResolvedValue({
      referrerCode: "A3K9M2",
      selectedType: "investor",
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({ status: "authenticated" });

    expect(adapters.registration.register).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      payload: { referrerCode: "A3K9M2", selectedType: "investor" },
    });
    expect(adapters.registration.clearPayload).toHaveBeenCalledOnce();
    expect(adapters.session.setSession).toHaveBeenCalledWith({
      accessToken: "supabase-token",
    });
  });

  it("defaults new users without invitation payload to investor registration", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "supabase-token" },
      userStatus: "new",
    });
    adapters.registration.getPayload.mockResolvedValue(null);
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({ status: "authenticated" });

    expect(adapters.registration.register).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      payload: { selectedType: "investor" },
    });
  });

  it("clears ignored invitation payloads for existing users without re-registering", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "supabase-token" },
      userStatus: "existing",
    });
    adapters.registration.getPayload.mockResolvedValue({
      invitationToken: "token-abc",
      selectedType: "collector",
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      notice: "existing_user_with_invite",
      status: "authenticated",
    });

    expect(adapters.registration.register).not.toHaveBeenCalled();
    expect(adapters.registration.clearPayload).toHaveBeenCalledOnce();
    expect(adapters.registration.setExistingUserInviteIgnored).toHaveBeenCalledOnce();
  });

  it("requires explicit recovery for orphaned users without a stored payload", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "supabase-token" },
      userStatus: "orphaned",
    });
    adapters.registration.getPayload.mockResolvedValue(null);
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      status: "orphaned_recovery",
    });

    expect(adapters.registration.register).not.toHaveBeenCalled();
    expect(adapters.session.setSession).not.toHaveBeenCalled();
  });

  it("recovers orphaned users as investors using the pending token", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "supabase-token" },
      userStatus: "orphaned",
    });
    adapters.registration.getPayload.mockResolvedValue(null);
    const workflow = createAuthWorkflow(adapters);

    await workflow.login();
    await expect(workflow.recoverAsInvestor()).resolves.toEqual({
      status: "authenticated",
    });

    expect(adapters.registration.register).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      payload: { selectedType: "investor" },
    });
    expect(adapters.session.setSession).toHaveBeenCalledWith({
      accessToken: "supabase-token",
    });
  });

  it("does not call Supabase exchange when Privy login is cancelled", async () => {
    const adapters = fakeAdapters();
    adapters.privy.login.mockRejectedValue({ code: "privy_cancelled" });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      error: { code: "privy_cancelled", retryable: false },
      status: "logged_out",
    });

    expect(adapters.exchange.exchange).not.toHaveBeenCalled();
  });

  it("maps account disabled exchange responses", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockRejectedValue({
      code: "account_disabled",
      retryable: false,
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      error: { code: "account_disabled", retryable: false },
      status: "account_disabled",
    });
  });

  it("retries retryable exchange failures once", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange
      .mockRejectedValueOnce({ code: "server_unavailable", retryable: true })
      .mockResolvedValueOnce({ session: { accessToken: "supabase-token" } });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({ status: "authenticated" });
    expect(adapters.exchange.exchange).toHaveBeenCalledTimes(2);
  });

  it("cleans up when session storage fails after exchange succeeds", async () => {
    const adapters = fakeAdapters();
    adapters.session.setSession.mockRejectedValue({
      code: "session_storage_failed",
      retryable: false,
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      error: { code: "session_storage_failed", retryable: false },
      status: "auth_failed",
    });
    expect(adapters.session.clearSession).toHaveBeenCalledOnce();
  });

  it("restores and logs out through the session and Privy boundaries", async () => {
    const adapters = fakeAdapters();
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.restoreSession()).resolves.toEqual({
      status: "authenticated",
    });
    await expect(workflow.logout()).resolves.toEqual({ status: "logged_out" });

    expect(adapters.session.restoreSession).toHaveBeenCalledOnce();
    expect(adapters.session.clearSession).toHaveBeenCalledOnce();
    expect(adapters.privy.logout).toHaveBeenCalledOnce();
  });
});

function fakeAdapters() {
  return {
    exchange: {
      exchange: vi.fn().mockResolvedValue({
        session: { accessToken: "supabase-token" },
        userStatus: "existing",
      }),
    },
    privy: {
      login: vi.fn().mockResolvedValue({ accessToken: "privy-token" }),
      logout: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      clearSession: vi.fn().mockResolvedValue(undefined),
      restoreSession: vi.fn().mockResolvedValue({ accessToken: "supabase-token" }),
      setSession: vi.fn().mockResolvedValue(undefined),
    },
    registration: {
      clearPayload: vi.fn().mockResolvedValue(undefined),
      getPayload: vi.fn().mockResolvedValue(null),
      register: vi.fn().mockResolvedValue(undefined),
      setExistingUserInviteIgnored: vi.fn().mockResolvedValue(undefined),
    },
  };
}
