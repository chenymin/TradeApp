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
