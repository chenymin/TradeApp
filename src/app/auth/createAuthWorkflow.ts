import {
  loginWithPrivy,
  logoutFromPrivy,
  type PrivyLogin,
} from "../../features/auth/services/privyAuthClient";
import { exchangePrivyTokenForSession } from "../../features/auth/services/authExchangeClient";
import {
  clearStoredSession,
  restoreStoredSession,
  setStoredSession,
} from "../../features/auth/services/sessionStorage";
import { expoSecureSessionStorage } from "../../features/auth/services/expoSecureSessionStorage";
import { createAuthWorkflow } from "../../features/auth/workflow/authWorkflow";
import { registerUser } from "../../features/registration/services/registrationClient";
import {
  clearRegistrationPayload,
  getRegistrationPayload,
  setExistingUserInviteIgnored,
} from "../../features/registration/services/registrationPayloadStorage";
import { supabase } from "../../lib/supabase/client";

export type PrivyRuntimeBindings = {
  getAccessToken: () => Promise<string | null>;
  login: PrivyLogin;
  logout: () => Promise<void>;
};

export function createRuntimeAuthWorkflow(privy: PrivyRuntimeBindings) {
  return createAuthWorkflow({
    exchange: {
      exchange: async (privyAccessToken) =>
        exchangePrivyTokenForSession({
          endpoint: getWalletLoginEndpoint(),
          privyAccessToken,
        }),
    },
    privy: {
      login: () =>
        loginWithPrivy({
          getAccessToken: privy.getAccessToken,
          login: privy.login,
          loginConfig: { loginMethods: ["email"] },
        }),
      logout: () => logoutFromPrivy({ logout: privy.logout }),
    },
    registration: {
      clearPayload: () =>
        clearRegistrationPayload({
          storage: expoSecureSessionStorage,
        }),
      getPayload: () =>
        getRegistrationPayload({
          storage: expoSecureSessionStorage,
        }),
      register: ({ accessToken, payload }) =>
        registerUser({
          accessToken,
          endpoint: getRegisterUserEndpoint(),
          payload,
        }),
      setExistingUserInviteIgnored: () =>
        setExistingUserInviteIgnored({
          storage: expoSecureSessionStorage,
        }),
    },
    session: {
      clearSession: () =>
        clearStoredSession({
          secureStorage: expoSecureSessionStorage,
          supabase,
        }),
      restoreSession: () =>
        restoreStoredSession({
          secureStorage: expoSecureSessionStorage,
          supabase,
        }),
      setSession: (session) =>
        setStoredSession({
          secureStorage: expoSecureSessionStorage,
          session,
          supabase,
        }),
    },
  });
}

function getWalletLoginEndpoint(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const loginPath =
    process.env.EXPO_PUBLIC_SUPABASE_WALLET_LOGIN_PATH ?? "/functions/v1/wallet-login";

  if (!supabaseUrl) {
    throw new Error("Missing public Supabase URL");
  }

  return new URL(loginPath, supabaseUrl).toString();
}

function getRegisterUserEndpoint(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing public Supabase URL");
  }

  return new URL("/functions/v1/register-user", supabaseUrl).toString();
}
