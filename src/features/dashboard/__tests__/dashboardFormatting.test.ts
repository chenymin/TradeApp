import { describe, expect, it } from "vitest";

import {
  formatIntegerPoints,
  formatPoints,
  formatTier,
} from "../domain/dashboardFormatting";

describe("dashboard formatting", () => {
  it("formats finite whole and fractional points", () => {
    expect(formatPoints(1234)).toBe("1,234");
    expect(formatPoints(1234.5)).toBe("1,234.50");
    expect(formatPoints(Number.NaN)).toBe("0");
    expect(formatIntegerPoints(1234.9)).toBe("1,235");
  });

  it("falls back to tier D without changing the profile source value", () => {
    expect(formatTier("S")).toBe("S");
    expect(formatTier("A")).toBe("A");
    expect(formatTier(null)).toBe("D");
    expect(formatTier("unknown")).toBe("D");
  });
});
