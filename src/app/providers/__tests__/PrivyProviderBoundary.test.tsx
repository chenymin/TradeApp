import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderElement, type PlainNode } from "../../../test/renderElement";

vi.mock("@privy-io/expo", () => ({
  PrivyProvider: ({ children }: { children?: ReactNode }) =>
    React.createElement("privy-provider", null, children),
}));

vi.mock("@privy-io/expo/ui", () => ({
  PrivyElements: () => React.createElement("privy-elements"),
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children?: ReactNode }) =>
    React.createElement("safe-area-provider", null, children),
}));

describe("PrivyProviderBoundary", () => {
  it("wraps Privy UI with SafeAreaProvider", async () => {
    const { PrivyProviderBoundary } = await import("../PrivyProviderBoundary");

    const tree = renderElement(
      React.createElement(
        PrivyProviderBoundary,
        {
          config: {
            chainId: 97,
            privyAppId: "test-privy-app-id",
            supabaseAnonKey: "anon-key",
            supabaseUrl: "https://example.supabase.co",
            walletLoginPath: "/test-auth-path",
          },
        },
        React.createElement("app-content"),
      ),
    );

    if (!isPlainElement(tree)) {
      throw new Error("Expected PrivyProviderBoundary to render an element");
    }

    expect(tree.type).toBe("safe-area-provider");
    expect(findType(tree, "app-content")).toBeTruthy();
    expect(findType(tree, "privy-elements")).toBeTruthy();
  });
});

function findType(node: PlainNode, type: unknown): PlainNode | null {
  if (isPlainElement(node) && node.type === type) {
    return node;
  }

  if (isPlainElement(node)) {
    for (const child of node.children) {
      const match = findType(child, type);

      if (match) {
        return match;
      }
    }
  }

  return null;
}

function isPlainElement(
  node: PlainNode,
): node is Extract<PlainNode, { props: Record<string, unknown> }> {
  return typeof node === "object" && node !== null && "props" in node;
}
