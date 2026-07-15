import { describe, expect, it, vi } from "vitest";

import { createNicknameUpdater } from "../services/nicknameUpdater";

describe("nickname updater", () => {
  it("does not write invalid or unchanged nicknames", async () => {
    const repository = { updateNickname: vi.fn() };
    const refreshProfile = vi.fn();
    const update = createNicknameUpdater({ refreshProfile, repository });

    await expect(update({ currentNickname: "Alice", draft: " Alice " }))
      .resolves.toEqual({ ok: false, reason: "unchanged" });
    expect(repository.updateNickname).not.toHaveBeenCalled();
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  it("writes the trimmed nickname and refreshes profile after success", async () => {
    const repository = { updateNickname: vi.fn().mockResolvedValue(undefined) };
    const refreshProfile = vi.fn().mockResolvedValue(undefined);
    const update = createNicknameUpdater({ refreshProfile, repository });

    await expect(update({ currentNickname: null, draft: " Alice " }))
      .resolves.toEqual({ ok: true, value: "Alice" });
    expect(repository.updateNickname).toHaveBeenCalledWith("Alice");
    expect(refreshProfile).toHaveBeenCalledOnce();
    expect(repository.updateNickname.mock.invocationCallOrder[0])
      .toBeLessThan(refreshProfile.mock.invocationCallOrder[0]);
  });
});
