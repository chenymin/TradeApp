import { describe, expect, it, vi } from "vitest";

import {
  PrivyAuthError,
  loginWithPrivy,
  logoutFromPrivy,
} from "../services/privyAuthClient";

describe("privyAuthClient", () => {
  it("runs the Privy UI login flow and returns a fresh access token", async () => {
    const login = vi.fn().mockResolvedValue({ user: { id: "privy-user" } });
    const getAccessToken = vi.fn().mockResolvedValue("privy-access-token");

    await expect(
      loginWithPrivy({
        getAccessToken,
        login,
        loginConfig: { loginMethods: ["email"] },
      }),
    ).resolves.toEqual({ accessToken: "privy-access-token" });

    expect(login).toHaveBeenCalledWith({ loginMethods: ["email"] });
    expect(getAccessToken).toHaveBeenCalledOnce();
  });

  it("maps user-cancelled Privy UI flows", async () => {
    const login = vi.fn().mockRejectedValue({ code: "login_flow_closed" });

    await expect(
      loginWithPrivy({
        getAccessToken: vi.fn(),
        login,
        loginConfig: { loginMethods: ["email"] },
      }),
    ).rejects.toEqual(new PrivyAuthError("privy_cancelled"));
  });

  it("rejects missing access tokens", async () => {
    const login = vi.fn().mockResolvedValue({ user: { id: "privy-user" } });
    const getAccessToken = vi.fn().mockResolvedValue(null);

    await expect(
      loginWithPrivy({
        getAccessToken,
        login,
        loginConfig: { loginMethods: ["email"] },
      }),
    ).rejects.toEqual(new PrivyAuthError("privy_token_missing"));
  });

  it("continues when Privy reports an existing logged-in user", async () => {
    const login = vi.fn().mockRejectedValue({
      code: "user_already_logged_in",
      message: "User is already logged in",
    });
    const getAccessToken = vi.fn().mockResolvedValue("privy-access-token");

    await expect(
      loginWithPrivy({
        getAccessToken,
        login,
        loginConfig: { loginMethods: ["email"] },
      }),
    ).resolves.toEqual({ accessToken: "privy-access-token" });

    expect(getAccessToken).toHaveBeenCalledOnce();
  });

  it("preserves safe Privy error details for diagnosis", async () => {
    const login = vi.fn().mockRejectedValue({
      message: "Native app ID com.artstar.mytradeapp is not allowed",
    });

    await expect(
      loginWithPrivy({
        getAccessToken: vi.fn(),
        login,
        loginConfig: { loginMethods: ["email"] },
      }),
    ).rejects.toMatchObject({
      code: "privy_login_failed",
      details: "Native app ID com.artstar.mytradeapp is not allowed",
    });
  });

  it("delegates logout to Privy", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);

    await logoutFromPrivy({ logout });

    expect(logout).toHaveBeenCalledOnce();
  });
});
