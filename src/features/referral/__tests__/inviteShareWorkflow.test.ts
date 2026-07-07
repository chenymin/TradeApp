import { describe, expect, it, vi } from "vitest";

import { createInviteShareWorkflow } from "../workflow/inviteShareWorkflow";

describe("createInviteShareWorkflow", () => {
  it("copies the selected invite link", async () => {
    const clipboard = { setString: vi.fn().mockResolvedValue(undefined) };
    const workflow = createInviteShareWorkflow({
      clipboard,
      inviteCode: "ABC",
      share: { share: vi.fn() },
      webOrigin: "https://artstar.example",
    });

    await expect(workflow.copy("collector")).resolves.toEqual({ status: "copied" });

    expect(clipboard.setString).toHaveBeenCalledWith(
      "https://artstar.example/register?ref=ABC&type=collector",
    );
  });

  it("shares the selected invite link with a message", async () => {
    const share = { share: vi.fn().mockResolvedValue({ action: "sharedAction" }) };
    const workflow = createInviteShareWorkflow({
      clipboard: { setString: vi.fn() },
      inviteCode: "ABC",
      share,
      webOrigin: "https://artstar.example",
    });

    await expect(workflow.share("creator")).resolves.toEqual({ status: "shared" });

    expect(share.share).toHaveBeenCalledWith({
      message: "Join MyTradeApp: https://artstar.example/register?ref=ABC&type=creator",
      url: "https://artstar.example/register?ref=ABC&type=creator",
    });
  });
});
