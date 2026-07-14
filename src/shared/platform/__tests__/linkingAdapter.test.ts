import { describe, expect, it, vi } from "vitest";

import { createExternalLinkAdapter } from "../linkingAdapter";

describe("external linking adapter", () => {
  it("opens a supported HTTPS URL", async () => {
    const platform = {
      canOpenURL: vi.fn().mockResolvedValue(true),
      openURL: vi.fn().mockResolvedValue(undefined),
    };

    await expect(createExternalLinkAdapter(platform).open("https://bscscan.com/tx/0x123"))
      .resolves.toBe("opened");
    expect(platform.openURL).toHaveBeenCalledWith("https://bscscan.com/tx/0x123");
  });

  it.each(["javascript:alert(1)", "file:///tmp/a", "not a url"])(
    "rejects unsafe URL %s without consulting the platform",
    async (url) => {
      const platform = {
        canOpenURL: vi.fn(),
        openURL: vi.fn(),
      };

      await expect(createExternalLinkAdapter(platform).open(url)).resolves.toBe("invalid");
      expect(platform.canOpenURL).not.toHaveBeenCalled();
      expect(platform.openURL).not.toHaveBeenCalled();
    },
  );

  it("does not open a URL rejected by the platform", async () => {
    const platform = {
      canOpenURL: vi.fn().mockResolvedValue(false),
      openURL: vi.fn(),
    };

    await expect(createExternalLinkAdapter(platform).open("https://example.com/report.pdf"))
      .resolves.toBe("unsupported");
    expect(platform.openURL).not.toHaveBeenCalled();
  });

  it("localizes platform API failures", async () => {
    const platform = {
      canOpenURL: vi.fn().mockRejectedValue(new Error("native unavailable")),
      openURL: vi.fn(),
    };

    await expect(createExternalLinkAdapter(platform).open("https://example.com/report.pdf"))
      .resolves.toBe("unsupported");
    expect(platform.openURL).not.toHaveBeenCalled();
  });
});
