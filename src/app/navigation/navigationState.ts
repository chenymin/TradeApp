import type { AuthStatus } from "../../features/auth/workflow/authStateMachine";

export type AppRouteName =
  | "launchpad"
  | "market"
  | "assetDetail"
  | "referralPublic"
  | "login"
  | "home"
  | "invest"
  | "dashboard"
  | "wallet"
  | "kyc"
  | "referral"
  | "security"
  | "settings"
  | "profile"
  | "accountDisabled";

export type HeaderAction = "login" | "none" | "walletStatus";

export type HeaderConfig = {
  action: HeaderAction;
  eyebrow: string;
  title: string;
};

export type TabIconName =
  | "dashboard"
  | "launchpad"
  | "market"
  | "profile"
  | "referral";

export type MainTabRouteName = Extract<
  AppRouteName,
  "launchpad" | "market" | "referralPublic" | "dashboard" | "profile"
>;

export type TabRoute = {
  icon: TabIconName;
  label: string;
  requiresAuth: boolean;
  routeName: MainTabRouteName;
};

export type RouteAccessResult =
  | {
      allowed: true;
      routeName: AppRouteName;
    }
  | {
      allowed: false;
      reason: "account_disabled" | "auth_required";
      routeName: AppRouteName;
    };

const PUBLIC_ROUTES = new Set<AppRouteName>([
  "assetDetail",
  "launchpad",
  "login",
  "market",
  "profile",
  "referralPublic",
]);

const MAIN_TABS: TabRoute[] = [
  { icon: "launchpad", label: "Launchpad", requiresAuth: false, routeName: "launchpad" },
  { icon: "market", label: "Market", requiresAuth: false, routeName: "market" },
  { icon: "referral", label: "Referral", requiresAuth: false, routeName: "referralPublic" },
  { icon: "dashboard", label: "Dashboard", requiresAuth: true, routeName: "dashboard" },
  { icon: "profile", label: "My", requiresAuth: false, routeName: "profile" },
];

const HEADER_CONFIGS: Record<AppRouteName, Omit<HeaderConfig, "action">> = {
  accountDisabled: { eyebrow: "Account", title: "Unavailable" },
  assetDetail: { eyebrow: "Asset", title: "Details" },
  dashboard: { eyebrow: "Portfolio", title: "Home" },
  home: { eyebrow: "Portfolio", title: "Home" },
  invest: { eyebrow: "Primary market", title: "Invest" },
  kyc: { eyebrow: "Compliance", title: "KYC" },
  launchpad: { eyebrow: "Public", title: "Launchpad" },
  login: { eyebrow: "Account", title: "Sign in" },
  market: { eyebrow: "Secondary market", title: "Market" },
  profile: { eyebrow: "Account", title: "Profile" },
  referral: { eyebrow: "Growth", title: "Referral" },
  referralPublic: { eyebrow: "Public", title: "Referral" },
  security: { eyebrow: "Account", title: "Security" },
  settings: { eyebrow: "Account", title: "Settings" },
  wallet: { eyebrow: "Assets", title: "Wallet" },
};

export function getInitialRoute(authStatus: AuthStatus): AppRouteName {
  if (authStatus === "authenticated") {
    return "dashboard";
  }

  if (authStatus === "account_disabled") {
    return "accountDisabled";
  }

  return "launchpad";
}

export function getTabRoutes(): TabRoute[] {
  return MAIN_TABS;
}

export function getHeaderConfig(
  routeName: AppRouteName,
  authStatus: AuthStatus,
): HeaderConfig {
  return {
    ...HEADER_CONFIGS[routeName],
    action: getHeaderAction(routeName, authStatus),
  };
}

export function getRouteAccess(
  requestedRoute: AppRouteName,
  authStatus: AuthStatus,
): RouteAccessResult {
  if (authStatus === "account_disabled") {
    return {
      allowed: false,
      reason: "account_disabled",
      routeName: "accountDisabled",
    };
  }

  if (authStatus === "authenticated" || PUBLIC_ROUTES.has(requestedRoute)) {
    return {
      allowed: true,
      routeName: requestedRoute,
    };
  }

  return {
    allowed: false,
    reason: "auth_required",
    routeName: "login",
  };
}

function getHeaderAction(routeName: AppRouteName, authStatus: AuthStatus): HeaderAction {
  if (authStatus === "authenticated") {
    return "walletStatus";
  }

  if (routeName === "login" || authStatus === "account_disabled") {
    return "none";
  }

  return "login";
}
