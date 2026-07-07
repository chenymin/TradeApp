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

export type AuthProviderState = {
  error?: AuthWorkflowResult["error"];
  status: AuthStatus;
};

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
    status: "restoring_session",
  });

  const applyResult = useCallback((result: AuthWorkflowResult) => {
    setState({
      error: result.error,
      status: result.status,
    });
  }, []);

  const restoreSession = useCallback(async () => {
    setState({ status: "restoring_session" });
    applyResult(await workflow.restoreSession());
  }, [applyResult, workflow]);

  const login = useCallback(async () => {
    setState({ status: "privy_authenticating" });
    applyResult(await workflow.login());
  }, [applyResult, workflow]);

  const logout = useCallback(async () => {
    setState({ status: "logging_out" });
    applyResult(await workflow.logout());
  }, [applyResult, workflow]);

  const recoverAsInvestor = useCallback(async () => {
    setState({ status: "exchanging_session" });
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
