import { AccessibilityInfo, Animated } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import {
  findByProps,
  getPressHandler,
  renderElement,
} from "../../../test/renderElement";
import { AppText, type AppTextVariant } from "../AppText";
import {
  GlassSurface,
  GlassSurfaceView,
  selectGlassPresentation,
} from "../GlassSurface";
import { SegmentedControl } from "../SegmentedControl";
import {
  getSkeletonAnimationMode,
  SkeletonBlock,
  SkeletonGroup,
} from "../Skeleton";
import { colors, spacing, typography } from "../theme";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("visual primitives", () => {
  it("selects native glass only when supported and transparency is allowed", () => {
    expect(selectGlassPresentation({
      nativeGlassAvailable: true,
      platform: "ios",
      platformVersion: 26,
      reduceTransparency: false,
    })).toBe("native_glass");
    expect(selectGlassPresentation({
      nativeGlassAvailable: true,
      platform: "ios",
      platformVersion: 26,
      reduceTransparency: true,
    })).toBe("opaque");
  });

  it("uses blur on older iOS and static translucency on Android", () => {
    expect(selectGlassPresentation({
      nativeGlassAvailable: false,
      platform: "ios",
      platformVersion: 18,
      reduceTransparency: false,
    })).toBe("blur");
    expect(selectGlassPresentation({
      nativeGlassAvailable: false,
      platform: "android",
      platformVersion: 36,
      reduceTransparency: false,
    })).toBe("translucent");
  });

  it("disables skeleton motion when Reduce Motion is enabled", () => {
    expect(getSkeletonAnimationMode(true)).toBe("static");
    expect(getSkeletonAnimationMode(false)).toBe("pulse");
  });

  it.each(["native_glass", "blur", "translucent", "opaque"] as const)(
    "renders the %s glass presentation with a stable outer contract",
    (presentation) => {
      const tree = renderElement(
        <GlassSurfaceView presentation={presentation} variant="header">
          Header content
        </GlassSurfaceView>,
      );

      expect(findByProps(tree, { testID: `glass-surface-${presentation}` }))
        .toBeTruthy();
    },
  );

  it("keeps an opaque glass fallback and cleans up when preference lookup fails", async () => {
    const remove = vi.fn();
    const addEventListener = vi.spyOn(AccessibilityInfo, "addEventListener")
      .mockReturnValue(
        { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>,
      );
    const preference = vi.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
      .mockRejectedValue(new Error("preference unavailable"));
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <GlassSurface variant="header">Header</GlassSurface>,
      );
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ testID: "glass-surface-opaque" })).toBeTruthy();
    await act(async () => renderer!.unmount());
    expect(remove).toHaveBeenCalledOnce();
    addEventListener.mockRestore();
    preference.mockRestore();
  });

  it("shares one animated value and one loop across a skeleton group", async () => {
    const start = vi.fn();
    const stop = vi.fn();
    const reset = vi.fn();
    const loop = vi.spyOn(Animated, "loop").mockReturnValue({ reset, start, stop });
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <SkeletonGroup accessibilityLabel="Balances loading" reduceMotion={false}>
          <SkeletonBlock height={16} testID="skeleton-one" width="40%" />
          <SkeletonBlock height={20} testID="skeleton-two" width="60%" />
        </SkeletonGroup>,
      );
    });

    expect(loop).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();
    const firstStyle = renderer!.root.find((node) => (
      String(node.type) === "AnimatedView" && node.props.testID === "skeleton-one"
    )).props.style;
    const secondStyle = renderer!.root.find((node) => (
      String(node.type) === "AnimatedView" && node.props.testID === "skeleton-two"
    )).props.style;
    expect(firstStyle.at(-1).opacity).toBe(secondStyle.at(-1).opacity);
    expect(renderer!.root.find((node) => (
      String(node.type) === "View" && node.props.accessibilityLabel === "Balances loading"
    )).props.accessibilityRole).toBe("progressbar");

    await act(async () => renderer!.unmount());
    expect(stop).toHaveBeenCalledOnce();
    loop.mockRestore();
  });

  it("keeps skeletons static and cleans up when motion preference lookup fails", async () => {
    const remove = vi.fn();
    const addEventListener = vi.spyOn(AccessibilityInfo, "addEventListener")
      .mockReturnValue(
        { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>,
      );
    const preference = vi.spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockRejectedValue(new Error("preference unavailable"));
    const loop = vi.spyOn(Animated, "loop");
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <SkeletonGroup accessibilityLabel="Static loading">
          <SkeletonBlock height={16} width="40%" />
        </SkeletonGroup>,
      );
      await Promise.resolve();
    });

    expect(loop).not.toHaveBeenCalled();
    await act(async () => renderer!.unmount());
    expect(remove).toHaveBeenCalledOnce();
    addEventListener.mockRestore();
    preference.mockRestore();
    loop.mockRestore();
  });

  it("makes glass segmented controls opt-in without changing selection", async () => {
    const onChange = vi.fn();
    const tree = renderElement(
      <SegmentedControl
        onChange={onChange}
        options={[
          { label: "Holdings", value: "holdings" },
          { label: "Transactions", value: "transactions" },
        ]}
        surface="glass"
        value="holdings"
      />,
    );

    expect(findByProps(tree, { variant: "control" })).toBeTruthy();
    expect(findByProps(tree, { accessibilityLabel: "Holdings" }).props.accessibilityState)
      .toEqual({ selected: true });
    await getPressHandler(tree, "Transactions")();
    expect(onChange).toHaveBeenCalledWith("transactions");
  });

  it("exposes the institutional color and spacing tokens", () => {
    expect(colors).toMatchObject({
      ink: "#172421",
      primary: "#176B58",
      surfaceSubtle: "#EDF2EF",
    });
    expect(spacing).toMatchObject({
      page: 20,
      section: 24,
    });
  });

  it("renders row numbers with stable tabular typography", () => {
    const tree = renderElement(
      <AppText accessibilityLabel="Balance value" numeric variant="numberRow">
        123456.78
      </AppText>,
    );

    expect(typography.numberRow).toMatchObject({
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
    });
    expect(findByProps(tree, { accessibilityLabel: "Balance value" }).props.style)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          fontSize: 16,
          fontWeight: "700",
          lineHeight: 22,
        }),
        expect.objectContaining({
          fontVariant: ["tabular-nums"],
        }),
      ]));
  });

  it.each<{
    expected: { fontSize: number; fontWeight: string; lineHeight: number };
    variant: AppTextVariant;
  }>([
    { expected: typography.display, variant: "display" },
    { expected: typography.pageTitle, variant: "pageTitle" },
    { expected: typography.sectionTitle, variant: "sectionTitle" },
    { expected: typography.body, variant: "body" },
    { expected: typography.label, variant: "label" },
    { expected: typography.caption, variant: "caption" },
    { expected: typography.micro, variant: "micro" },
    { expected: typography.numberRow, variant: "numberRow" },
    { expected: typography.display, variant: "title" },
    { expected: typography.body, variant: "subtitle" },
  ])("maps $variant to its stable typography contract", ({ expected, variant }) => {
    const accessibilityLabel = `Typography ${variant}`;
    const tree = renderElement(
      <AppText accessibilityLabel={accessibilityLabel} variant={variant}>
        Example
      </AppText>,
    );

    expect(findByProps(tree, { accessibilityLabel }).props.style)
      .toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
  });
});
