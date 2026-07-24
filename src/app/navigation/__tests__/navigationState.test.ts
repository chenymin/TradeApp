import { describe, expect, it } from "vitest";

import {
  getHeaderConfig,
  getInitialRoute,
  getRouteAccess,
  getTabRoutes,
  type AppRouteName,
} from "../navigationState";

describe("navigationState", () => {
  it.each<AppRouteName>(["launchpad", "market", "assetDetail", "referralPublic", "profile"])(
    "allows logged out users to open public route %s",
    (routeName) => {
      expect(getRouteAccess(routeName, "logged_out")).toEqual({
        allowed: true,
        routeName,
      });
    },
  );

  it.each<AppRouteName>(["dashboard", "wallet", "kyc", "referral"])(
    "redirects logged out users from protected route %s to login",
    (routeName) => {
      expect(getRouteAccess(routeName, "logged_out")).toEqual({
        allowed: false,
        reason: "auth_required",
        routeName: "login",
      });
    },
  );

  it("allows authenticated users to open protected routes", () => {
    expect(getRouteAccess("dashboard", "authenticated")).toEqual({
      allowed: true,
      routeName: "dashboard",
    });
  });

  it("keeps account disabled users on the account disabled route", () => {
    expect(getRouteAccess("wallet", "account_disabled")).toEqual({
      allowed: false,
      reason: "account_disabled",
      routeName: "accountDisabled",
    });
  });

  it("uses launchpad as the public initial route and dashboard for authenticated users", () => {
    expect(getInitialRoute("logged_out")).toBe("launchpad");
    expect(getInitialRoute("authenticated")).toBe("dashboard");
  });

  it("defines stable bottom tabs in the approved order", () => {
    expect(getTabRoutes().map((route) => route.routeName)).toEqual([
      "launchpad",
      "market",
      "referralPublic",
      "dashboard",
      "profile",
    ]);
    expect(getTabRoutes().map((route) => route.label)).toEqual([
      "Launchpad",
      "Market",
      "Referral",
      "Dashboard",
      "My",
    ]);
  });

  it("marks public bottom tabs and keeps wallet off the bottom bar", () => {
    expect(getTabRoutes().map((route) => [route.routeName, route.requiresAuth])).toEqual([
      ["launchpad", false],
      ["market", false],
      ["referralPublic", false],
      ["dashboard", true],
      ["profile", false],
    ]);
    expect(getTabRoutes().map((route) => route.routeName)).not.toContain("wallet");
    expect(getTabRoutes().map((route) => route.routeName)).not.toContain("kyc");
  });

  it("provides concise headers for public and protected routes", () => {
    expect(getHeaderConfig("launchpad", "logged_out")).toEqual({
      action: "login",
      eyebrow: "Public",
      title: "Launchpad",
      variant: "routeTitle",
    });
    expect(getHeaderConfig("home", "authenticated")).toEqual({
      action: "walletStatus",
      eyebrow: "Portfolio",
      title: "Home",
      variant: "routeTitle",
    });
    expect(getHeaderConfig("dashboard", "authenticated")).toEqual({
      action: "walletStatus",
      eyebrow: "Portfolio",
      title: "Home",
      variant: "brand",
    });
    expect(getHeaderConfig("wallet", "authenticated")).toEqual({
      action: "walletStatus",
      eyebrow: "Assets",
      title: "Wallet",
      variant: "brand",
    });
  });
});
