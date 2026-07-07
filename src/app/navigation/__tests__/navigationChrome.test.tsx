import { describe, expect, it, vi } from "vitest";

import {
  findByProps,
  getPressHandler,
  renderElement,
  textContent,
} from "../../../test/renderElement";
import { AppHeader } from "../components/AppHeader";
import { BottomTabBar } from "../components/BottomTabBar";
import { RoutePlaceholder } from "../components/RoutePlaceholder";

describe("navigation chrome", () => {
  it("renders a compact header with an optional action", async () => {
    const onLogin = vi.fn();
    const tree = renderElement(
      <AppHeader action="login" eyebrow="Public" onLogin={onLogin} title="Launchpad" />,
    );

    expect(textContent(tree)).not.toContain("Public");
    expect(textContent(tree)).toContain("Launchpad");
    expect(findByProps(tree, { accessibilityLabel: "App header" }).props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          minHeight: 105,
          paddingTop: 55,
        }),
      ]),
    );
    expect(findByProps(tree, { accessibilityLabel: "Header title group" }).props.style).toMatchObject({
      alignItems: "center",
      flex: 1,
    });
    expect(findByProps(tree, { accessibilityLabel: "Header action slot" }).props.style).toMatchObject({
      alignItems: "flex-end",
      minWidth: 104,
    });
    expect(findByProps(tree, { accessibilityLabel: "Header title Launchpad" }).props.style).toMatchObject({
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
    });
    expect(findByProps(tree, { accessibilityLabel: "Sign in" }).props.style).toMatchObject({
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 36,
      minWidth: 92,
    });
    expect(findByProps(tree, { accessibilityLabel: "Sign in icon" }).props).toMatchObject({
      size: 16,
      strokeWidth: 2.4,
      testID: "lucide-log-in",
    });
    expect(() => findByProps(tree, { accessibilityLabel: "Header eyebrow Public" })).toThrow();

    await getPressHandler(tree, "Sign in")();

    expect(onLogin).toHaveBeenCalledOnce();
  });

  it("marks exactly one bottom tab as selected", () => {
    const tree = renderElement(
      <BottomTabBar
        activeRouteName="profile"
        onSelect={vi.fn()}
        tabs={[
          { icon: "dashboard", label: "Dashboard", requiresAuth: true, routeName: "dashboard" },
          { icon: "profile", label: "My", requiresAuth: false, routeName: "profile" },
        ]}
      />,
    );

    expect(findByProps(tree, { accessibilityLabel: "Tab Dashboard" }).props.accessibilityState).toEqual({
      selected: false,
    });
    expect(findByProps(tree, { accessibilityLabel: "Tab My" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(findByProps(tree, { accessibilityLabel: "Tab Dashboard icon" })).toBeTruthy();
    expect(findByProps(tree, { accessibilityLabel: "Tab My icon" })).toBeTruthy();
    expect(findByProps(tree, { accessibilityLabel: "Tab Dashboard icon" }).props).toMatchObject({
      size: 22,
      strokeWidth: 2.2,
      testID: "lucide-layout-dashboard",
    });
    expect(findByProps(tree, { accessibilityLabel: "Tab My icon" }).props).toMatchObject({
      size: 22,
      strokeWidth: 2.2,
      testID: "lucide-user",
    });
    expect(textContent(findByProps(tree, { accessibilityLabel: "Tab Dashboard icon" }))).toBe("");
    expect(textContent(findByProps(tree, { accessibilityLabel: "Tab My icon" }))).toBe("");
  });

  it("renders placeholders without pretending real feature data exists", () => {
    const tree = renderElement(
      <RoutePlaceholder
        description="Feature implementation lands in a later task."
        label="Task 3"
        title="Launchpad"
      />,
    );

    expect(textContent(tree)).toContain("Launchpad");
    expect(textContent(tree)).toContain("Task 3");
    expect(textContent(tree)).toContain("later task");
  });
});
