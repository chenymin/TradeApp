import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type {
  AuthWorkflowResult,
  createAuthWorkflow,
} from "../../features/auth/workflow/authWorkflow";
import type { AuthStatus } from "../../features/auth/workflow/authStateMachine";
import type { AuthViewer } from "../../features/auth/domain/authViewer";

export type AuthProviderState = {
  error?: AuthWorkflowResult["error"];
  isSessionReady: boolean;
  status: AuthStatus;
  viewer: AuthViewer | null;
};

export type AuthDisplayState = Pick<AuthProviderState, "error" | "status">;

export type AuthProviderActions = {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  recoverAsInvestor: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export type AuthWorkflowInstance = ReturnType<typeof createAuthWorkflow>;

const AuthStateContext = createContext<AuthProviderState | null>(null);
const AuthActionsContext = createContext<AuthProviderActions | null>(null);

export function AuthProvider({
  children,
  workflow,
}: PropsWithChildren<{
  workflow: AuthWorkflowInstance;
}>) {
  const [state, setState] = useState<AuthProviderState>({
    isSessionReady: false,
    status: "restoring_session",
    viewer: null,
  });

  const applyResult = useCallback((result: AuthWorkflowResult) => {
    setState({
      ...(result.error ? { error: result.error } : {}),
      isSessionReady: result.status === "authenticated",
      status: result.status,
      viewer: result.viewer ?? null,
    });
  }, []);

  const restoreSession = useCallback(async () => {
    setState({
      isSessionReady: false,
      status: "restoring_session",
      viewer: null,
    });
    applyResult(await workflow.restoreSession());
  }, [applyResult, workflow]);

  const login = useCallback(async () => {
    setState({
      isSessionReady: false,
      status: "privy_authenticating",
      viewer: null,
    });
    applyResult(await workflow.login());
  }, [applyResult, workflow]);

  const logout = useCallback(async () => {
    setState({ isSessionReady: false, status: "logging_out", viewer: null });
    applyResult(await workflow.logout());
  }, [applyResult, workflow]);

  const recoverAsInvestor = useCallback(async () => {
    setState({
      isSessionReady: false,
      status: "exchanging_session",
      viewer: null,
    });
    applyResult(await workflow.recoverAsInvestor());
  }, [applyResult, workflow]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const actions = useMemo(
    () => ({
      login,
      logout,
      recoverAsInvestor,
      restoreSession,
    }),
    [login, logout, recoverAsInvestor, restoreSession],
  );

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuthStateContext(): AuthProviderState {
  const state = useContext(AuthStateContext);

  if (!state) {
    throw new Error("useAuthState must be used within AuthProvider");
  }

  return state;
}

export function useAuthActionsContext(): AuthProviderActions {
  const actions = useContext(AuthActionsContext);

  if (!actions) {
    throw new Error("useAuthActions must be used within AuthProvider");
  }

  return actions;
}
