import { describe, expect, it } from "vitest";

import { validateNickname } from "../domain/nickname";

describe("nickname validation", () => {
  it("trims a valid nickname", () => {
    expect(validateNickname("  Alice  ", null)).toEqual({
      ok: true,
      value: "Alice",
    });
  });

  it("rejects blank and unchanged values", () => {
    expect(validateNickname("   ", null)).toEqual({ ok: false, reason: "blank" });
    expect(validateNickname(" Alice ", "Alice")).toEqual({
      ok: false,
      reason: "unchanged",
    });
  });

  it("counts Unicode code points and accepts exactly 254", () => {
    expect(validateNickname("😀".repeat(254), null)).toMatchObject({ ok: true });
    expect(validateNickname("😀".repeat(255), null)).toEqual({
      ok: false,
      reason: "too_long",
    });
  });
});
