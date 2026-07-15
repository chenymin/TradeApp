import { describe, expect, it, vi } from "vitest";

import { createNicknameRepository } from "../services/nicknameRepository";

describe("nickname repository", () => {
  it("updates through update_my_nickname only", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });

    await createNicknameRepository({ rpc }).updateNickname("Alice");

    expect(rpc).toHaveBeenCalledWith("update_my_nickname", {
      p_nickname: "Alice",
    });
  });

  it("maps RPC failures", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "nickname_too_long" },
    });

    await expect(createNicknameRepository({ rpc }).updateNickname("Alice"))
      .rejects.toThrow("Unable to update nickname: nickname_too_long");
  });
});
