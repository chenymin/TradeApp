import { describe, expect, it } from "vitest";

import metroConfig = require("../../../metro.config.js");

describe("Metro config", () => {
  it("uses browser conditional exports for native bundles", () => {
    const platforms = ["ios", "android"] as const;

    for (const platform of platforms) {
      expect(
        metroConfig.resolver.unstable_conditionsByPlatform[platform],
      ).toContain("browser");
    }
  });
});
