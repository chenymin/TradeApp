import { describe, expect, it, vi } from "vitest";

import { createAuthWorkflow } from "../workflow/authWorkflow";

describe("authWorkflow", () => {
  it("logs in only after Privy, Supabase exchange, and session storage all succeed", async () => {
    const adapters = fakeAdapters();
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      status: "authenticated",
      viewer: viewer(),
    });

    expect(adapters.privy.login).toHaveBeenCalledOnce();
    expect(adapters.exchange.exchange).toHaveBeenCalledWith("privy-token");
    expect(adapters.session.setSession).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      viewer: viewer(),
    });
  });

  it("registers new users with a stored invitation payload before persisting the session", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "supabase-token" },
      userStatus: "new",
      viewer: viewer(),
    });
    adapters.registration.getPayload.mockResolvedValue({
      referrerCode: "A3K9M2",
      selectedType: "investor",
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      status: "authenticated",
      viewer: viewer(),
    });

    expect(adapters.registration.register).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      payload: { referrerCode: "A3K9M2", selectedType: "investor" },
    });
    expect(adapters.registration.clearPayload).toHaveBeenCalledOnce();
    expect(adapters.session.setSession).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      viewer: viewer(),
    });
  });

  it("defaults new users without invitation payload to investor registration", async () => {
    const adapters = fakeAdapters();
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "supabase-token" },
      userStatus: "new",
      viewer: viewer(),
    });
    adapters.registration.getPayload.mockResolvedValue(null);
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      status: "authenticated",
      viewer: viewer(),
    });

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
      viewer: viewer(),
    });
    adapters.registration.getPayload.mockResolvedValue({
      invitationToken: "token-abc",
      selectedType: "collector",
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.login()).resolves.toEqual({
      notice: "existing_user_with_invite",
      status: "authenticated",
      viewer: viewer(),
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
      viewer: viewer(),
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
      viewer: viewer(),
    });
    adapters.registration.getPayload.mockResolvedValue(null);
    const workflow = createAuthWorkflow(adapters);

    await workflow.login();
    await expect(workflow.recoverAsInvestor()).resolves.toEqual({
      status: "authenticated",
      viewer: viewer(),
    });

    expect(adapters.registration.register).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      payload: { selectedType: "investor" },
    });
    expect(adapters.session.setSession).toHaveBeenCalledWith({
      accessToken: "supabase-token",
      viewer: viewer(),
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

  it("refreshes an authenticated session without opening Privy login", async () => {
    const adapters = fakeAdapters();
    const replacementViewer = { ...viewer(), walletAddress: "0xdef" };
    adapters.privy.getAccessToken.mockResolvedValue("fresh-privy-token");
    adapters.exchange.exchange.mockResolvedValue({
      session: { accessToken: "replacement-token" },
      userStatus: "existing",
      viewer: replacementViewer,
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.refreshSession()).resolves.toEqual({
      ok: true,
      viewer: replacementViewer,
    });

    expect(adapters.privy.login).not.toHaveBeenCalled();
    expect(adapters.exchange.exchange).toHaveBeenCalledWith("fresh-privy-token");
    expect(adapters.session.setSession).toHaveBeenCalledWith({
      accessToken: "replacement-token",
      viewer: replacementViewer,
    });
  });

  it("does not clear the working session when refresh fails", async () => {
    const adapters = fakeAdapters();
    adapters.privy.getAccessToken.mockResolvedValue("fresh-privy-token");
    adapters.exchange.exchange.mockRejectedValue({
      code: "server_unavailable",
      retryable: false,
    });
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.refreshSession()).resolves.toEqual({
      error: { code: "server_unavailable", retryable: false },
      ok: false,
    });

    expect(adapters.session.clearSession).not.toHaveBeenCalled();
  });

  it("does not persist a refresh superseded by another auth operation", async () => {
    let resolveExchange: ((value: {
      session: { accessToken: string };
      viewer: ReturnType<typeof viewer>;
    }) => void) | undefined;
    let refreshCurrent = true;
    const adapters = fakeAdapters();
    adapters.privy.getAccessToken.mockResolvedValue("fresh-privy-token");
    adapters.exchange.exchange.mockReturnValue(new Promise((resolve) => {
      resolveExchange = resolve;
    }));
    const workflow = createAuthWorkflow(adapters);

    const refresh = workflow.refreshSession(() => refreshCurrent);
    refreshCurrent = false;
    resolveExchange?.({
      session: { accessToken: "replacement-token" },
      viewer: viewer(),
    });

    await expect(refresh).resolves.toEqual({
      error: { code: "session_refresh_superseded", retryable: true },
      ok: false,
    });
    expect(adapters.session.setSession).not.toHaveBeenCalled();
  });

  it("restores and logs out through the session and Privy boundaries", async () => {
    const adapters = fakeAdapters();
    const workflow = createAuthWorkflow(adapters);

    await expect(workflow.restoreSession()).resolves.toEqual({
      status: "authenticated",
      viewer: viewer(),
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
        viewer: viewer(),
      }),
    },
    privy: {
      getAccessToken: vi.fn().mockResolvedValue("privy-token"),
      login: vi.fn().mockResolvedValue({ accessToken: "privy-token" }),
      logout: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      clearSession: vi.fn().mockResolvedValue(undefined),
      restoreSession: vi.fn().mockResolvedValue({
        accessToken: "supabase-token",
        viewer: viewer(),
      }),
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

function viewer() {
  return {
    email: "viewer@example.com",
    id: "viewer-1",
    walletAddress: "0xabc",
  };
}
