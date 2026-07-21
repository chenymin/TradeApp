import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../AuthProvider";
import { useAuthActions } from "../../../features/auth/hooks/useAuthActions";
import { useAuthState } from "../../../features/auth/hooks/useAuthState";

describe("AuthProvider", () => {
  it("restores session on startup and exposes auth state", async () => {
    const workflow = fakeWorkflow();
    workflow.restoreSession.mockResolvedValue({
      status: "authenticated",
      viewer: viewer(),
    });
    const snapshots: Array<unknown> = [];

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    expect(snapshots).toContainEqual({
      isSessionReady: false,
      status: "restoring_session",
      viewer: null,
    });
    expect(snapshots).toContainEqual({
      isSessionReady: true,
      status: "authenticated",
      viewer: viewer(),
    });
  });

  it("runs login and logout actions through the workflow", async () => {
    const workflow = fakeWorkflow();
    workflow.restoreSession.mockResolvedValue({ status: "logged_out" });
    workflow.login.mockResolvedValue({ status: "authenticated", viewer: viewer() });
    workflow.logout.mockResolvedValue({ status: "logged_out" });
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    expect(snapshots).toContainEqual({
      isSessionReady: false,
      status: "logged_out",
      viewer: null,
    });

    await act(async () => {
      await actions.login?.();
    });
    expect(snapshots).toContainEqual({
      isSessionReady: true,
      status: "authenticated",
      viewer: viewer(),
    });

    await act(async () => {
      await actions.logout?.();
    });
    expect(snapshots.at(-1)).toEqual({
      isSessionReady: false,
      status: "logged_out",
      viewer: null,
    });
  });

  it("exposes account disabled and error states", async () => {
    const workflow = fakeWorkflow();
    workflow.restoreSession.mockResolvedValue({ status: "logged_out" });
    workflow.login.mockResolvedValue({
      error: { code: "account_disabled", retryable: false },
      status: "account_disabled",
    });
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    expect(snapshots).toContainEqual({
      isSessionReady: false,
      status: "logged_out",
      viewer: null,
    });
    await act(async () => {
      await actions.login?.();
    });

    expect(snapshots).toContainEqual({
      error: { code: "account_disabled", retryable: false },
      isSessionReady: false,
      status: "account_disabled",
      viewer: null,
    });
  });

  it("exposes orphaned recovery state and recover action", async () => {
    const workflow = fakeWorkflow();
    workflow.restoreSession.mockResolvedValue({ status: "logged_out" });
    workflow.login.mockResolvedValue({ status: "orphaned_recovery" });
    workflow.recoverAsInvestor.mockResolvedValue({
      status: "authenticated",
      viewer: viewer(),
    });
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await actions.login?.();
    });

    expect(snapshots).toContainEqual({
      isSessionReady: false,
      status: "orphaned_recovery",
      viewer: null,
    });

    await act(async () => {
      await actions.recoverAsInvestor?.();
    });

    expect(workflow.recoverAsInvestor).toHaveBeenCalledOnce();
    expect(snapshots).toContainEqual({
      isSessionReady: true,
      status: "authenticated",
      viewer: viewer(),
    });
  });

  it("replaces the viewer after a non-interactive session refresh", async () => {
    const workflow = fakeWorkflow();
    const replacementViewer = { ...viewer(), walletAddress: "0xdef" };
    workflow.restoreSession.mockResolvedValue({
      status: "authenticated",
      viewer: viewer(),
    });
    workflow.refreshSession.mockResolvedValue({
      ok: true,
      viewer: replacementViewer,
    });
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await expect(actions.refreshSession?.()).resolves.toBe(true);
    });

    expect(snapshots.at(-1)).toEqual({
      isSessionReady: true,
      status: "authenticated",
      viewer: replacementViewer,
    });
  });

  it("preserves the authenticated viewer when session refresh fails", async () => {
    const workflow = fakeWorkflow();
    const authenticatedSnapshot = {
      isSessionReady: true,
      status: "authenticated",
      viewer: viewer(),
    };
    workflow.restoreSession.mockResolvedValue({
      status: "authenticated",
      viewer: viewer(),
    });
    workflow.refreshSession.mockResolvedValue({
      error: { code: "server_unavailable", retryable: true },
      ok: false,
    });
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await expect(actions.refreshSession?.()).resolves.toBe(false);
    });

    expect(snapshots.at(-1)).toEqual(authenticatedSnapshot);
  });

  it("ignores a session refresh that completes after logout starts", async () => {
    let resolveRefresh: ((result: {
      ok: true;
      viewer: ReturnType<typeof viewer>;
    }) => void) | undefined;
    const workflow = fakeWorkflow();
    workflow.restoreSession.mockResolvedValue({
      status: "authenticated",
      viewer: viewer(),
    });
    workflow.refreshSession.mockReturnValue(new Promise((resolve) => {
      resolveRefresh = resolve;
    }));
    workflow.logout.mockResolvedValue({ status: "logged_out" });
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    let refreshResult: Promise<boolean> | undefined;
    await act(async () => {
      refreshResult = actions.refreshSession?.();
      await actions.logout?.();
      resolveRefresh?.({ ok: true, viewer: { ...viewer(), walletAddress: "0xdef" } });
      await expect(refreshResult).resolves.toBe(false);
    });

    expect(snapshots.at(-1)).toEqual({
      isSessionReady: false,
      status: "logged_out",
      viewer: null,
    });
  });

  it("replaces the authenticated Viewer from a current wallet-select session", async () => {
    const workflow = fakeWorkflow();
    const replacementViewer = { ...viewer(), walletAddress: "0xdef" };
    workflow.restoreSession.mockResolvedValue({
      status: "authenticated",
      viewer: viewer(),
    });
    workflow.replaceSession.mockResolvedValue({
      ok: true,
      viewer: replacementViewer,
    });
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await expect(actions.replaceSession?.({
        session: { accessToken: "replacement-token" },
        viewer: replacementViewer,
      })).resolves.toBe(true);
    });

    expect(snapshots.at(-1)).toEqual({
      isSessionReady: true,
      status: "authenticated",
      viewer: replacementViewer,
    });
  });

  it("ignores a wallet session replacement that completes after logout", async () => {
    let resolveReplacement: ((result: {
      ok: true;
      viewer: ReturnType<typeof viewer>;
    }) => void) | undefined;
    const workflow = fakeWorkflow();
    workflow.restoreSession.mockResolvedValue({
      status: "authenticated",
      viewer: viewer(),
    });
    workflow.replaceSession.mockReturnValue(new Promise((resolve) => {
      resolveReplacement = resolve;
    }));
    const snapshots: Array<unknown> = [];
    const actions: Partial<ReturnType<typeof useAuthActions>> = {};

    await act(async () => {
      create(
        <AuthProvider workflow={workflow}>
          <ActionProbe actions={actions} />
          <StateProbe snapshots={snapshots} />
        </AuthProvider>,
      );
    });

    let replacement: Promise<boolean> | undefined;
    await act(async () => {
      replacement = actions.replaceSession?.({
        session: { accessToken: "replacement-token" },
        viewer: { ...viewer(), walletAddress: "0xdef" },
      });
      await actions.logout?.();
      resolveReplacement?.({
        ok: true,
        viewer: { ...viewer(), walletAddress: "0xdef" },
      });
      await expect(replacement).resolves.toBe(false);
    });

    expect(snapshots.at(-1)).toEqual({
      isSessionReady: false,
      status: "logged_out",
      viewer: null,
    });
  });
});

function StateProbe({ snapshots }: { snapshots: Array<unknown> }) {
  const state = useAuthState();
  snapshots.push(state);

  return null;
}

function ActionProbe({
  actions,
}: {
  actions: Partial<ReturnType<typeof useAuthActions>>;
}) {
  const authActions = useAuthActions();
  Object.assign(actions, authActions);

  return null;
}

function fakeWorkflow() {
  return {
    login: vi.fn().mockResolvedValue({ status: "authenticated" }),
    logout: vi.fn().mockResolvedValue({ status: "logged_out" }),
    recoverAsInvestor: vi.fn().mockResolvedValue({ status: "authenticated" }),
    replaceSession: vi.fn().mockResolvedValue({ ok: true, viewer: viewer() }),
    refreshSession: vi.fn().mockResolvedValue({ ok: true, viewer: viewer() }),
    restoreSession: vi.fn().mockResolvedValue({ status: "logged_out" }),
  };
}

function viewer() {
  return {
    email: "viewer@example.com",
    id: "viewer-1",
    walletAddress: "0xabc",
  };
}
