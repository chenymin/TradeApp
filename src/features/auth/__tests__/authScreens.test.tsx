import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AccountDisabledScreen } from "../components/AccountDisabledScreen";
import { AuthGate } from "../components/AuthGate";
import { LoginScreen } from "../components/LoginScreen";

describe("auth screens", () => {
  it("disables login while auth is in flight", () => {
    const tree = renderElement(
      <LoginScreen
        actions={createActions()}
        state={{ status: "privy_authenticating" }}
      />,
    );

    const button = findByProps(tree, { accessibilityLabel: "Sign in" });
    expect(button.props.disabled).toBe(true);
  });

  it("runs login from the login screen", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const tree = renderElement(
      <LoginScreen
        actions={createActions({ login })}
        state={{ status: "auth_failed", error: { code: "network_timeout", retryable: true } }}
      />,
    );

    await getPressHandler(tree, "Sign in")();

    expect(login).toHaveBeenCalledOnce();
  });

  it("shows the auth error code for development diagnosis", () => {
    const tree = renderElement(
      <LoginScreen
        actions={createActions()}
        state={{
          status: "auth_failed",
          error: { code: "invalid_response", retryable: false },
        }}
      />,
    );

    expect(textContent(tree)).toContain("Error code: invalid_response");
  });

  it("shows safe auth error details for development diagnosis", () => {
    const tree = renderElement(
      <LoginScreen
        actions={createActions()}
        state={{
          status: "auth_failed",
          error: {
            code: "privy_login_failed",
            details: "Native app ID com.artstar.mytradeapp is not allowed",
            retryable: false,
          },
        }}
      />,
    );

    expect(textContent(tree)).toContain(
      "Details: Native app ID com.artstar.mytradeapp is not allowed",
    );
  });

  it("lets disabled users return to logged out", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const tree = renderElement(<AccountDisabledScreen onLogout={logout} />);

    await getPressHandler(tree, "Back to sign in")();

    expect(logout).toHaveBeenCalledOnce();
  });

  it("lets orphaned users continue recovery as an investor", async () => {
    const recoverAsInvestor = vi.fn().mockResolvedValue(undefined);
    const tree = renderElement(
      <LoginScreen
        actions={createActions({ recoverAsInvestor })}
        state={{ status: "orphaned_recovery" }}
      />,
    );

    expect(textContent(tree)).toContain("Registration recovery");

    await getPressHandler(tree, "Continue as Investor")();

    expect(recoverAsInvestor).toHaveBeenCalledOnce();
  });

  it("gates app content by auth status", () => {
    expect(renderGate({ status: "restoring_session" })).toContain("Restoring session");
    expect(renderGate({ status: "logged_out" })).toContain("Sign in");
    expect(renderGate({ status: "account_disabled" })).toContain("Account unavailable");
    expect(renderGate({ status: "authenticated" })).toContain("Dashboard");
  });
});

function renderGate(state: Parameters<typeof AuthGate>[0]["state"]) {
  return textContent(
    renderElement(
      <AuthGate
        actions={createActions()}
        state={state}
      />,
    ),
  );
}

function createActions(
  overrides: Partial<Parameters<typeof LoginScreen>[0]["actions"]> = {},
) {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    recoverAsInvestor: vi.fn(),
    replaceViewer: vi.fn().mockResolvedValue(true),
    refreshSession: vi.fn().mockResolvedValue(true),
    restoreSession: vi.fn(),
    ...overrides,
  };
}

type PlainNode =
  | string
  | number
  | null
  | undefined
  | {
      children: PlainNode[];
      props: Record<string, unknown>;
      type: unknown;
    };

function renderElement(node: ReactNode): PlainNode {
  if (!isValidElement(node)) {
    return node as PlainNode;
  }

  const props = node.props as Record<string, unknown>;

  if (typeof node.type === "function" && !isClassComponent(node.type)) {
    const component = node.type as (props: Record<string, unknown>) => ReactNode;
    return renderElement(component(props));
  }

  return {
    children: renderChildren(props.children),
    props,
    type: node.type,
  };
}

function renderChildren(children: unknown): PlainNode[] {
  if (Array.isArray(children)) {
    return children.map((child) => renderElement(child as ReactNode));
  }

  return [renderElement(children as ReactNode)];
}

function findByProps(
  node: PlainNode,
  props: Record<string, unknown>,
): Extract<PlainNode, { props: Record<string, unknown> }> {
  if (isPlainElement(node) && matchesProps(node, props)) {
    return node;
  }

  if (isPlainElement(node)) {
    for (const child of node.children) {
      const match = findByPropsOrNull(child, props);

      if (match) {
        return match;
      }
    }
  }

  throw new Error(`No element found for props ${JSON.stringify(props)}`);
}

function findByPropsOrNull(
  node: PlainNode,
  props: Record<string, unknown>,
): Extract<PlainNode, { props: Record<string, unknown> }> | null {
  try {
    return findByProps(node, props);
  } catch {
    return null;
  }
}

function getPressHandler(tree: PlainNode, label: string): () => Promise<void> | void {
  const handler = findByProps(tree, { accessibilityLabel: label }).props.onPress;

  if (typeof handler !== "function") {
    throw new Error(`No onPress handler found for ${label}`);
  }

  return handler as () => Promise<void> | void;
}

function matchesProps(
  node: Extract<PlainNode, { props: Record<string, unknown> }>,
  props: Record<string, unknown>,
): boolean {
  return Object.entries(props).every(([key, value]) => node.props[key] === value);
}

function textContent(node: PlainNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!isPlainElement(node)) {
    return "";
  }

  return node.children.map((child) => textContent(child)).join("");
}

function isPlainElement(
  node: PlainNode,
): node is Extract<PlainNode, { props: Record<string, unknown> }> {
  return typeof node === "object" && node !== null && "props" in node;
}

function isClassComponent(component: unknown): boolean {
  return (
    typeof component === "function" &&
    "prototype" in component &&
    Boolean(
      (component as { prototype?: { isReactComponent?: unknown } }).prototype
        ?.isReactComponent,
    )
  );
}
