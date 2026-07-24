import { describe, expect, it } from "vitest";

import { findByProps, renderElement } from "../../../test/renderElement";
import { AppText, type AppTextVariant } from "../AppText";
import { colors, spacing, typography } from "../theme";

describe("visual primitives", () => {
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
