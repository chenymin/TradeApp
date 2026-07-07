import { describe, expect, it, vi } from "vitest";

import { handleRegistrationLink } from "../workflow/registrationLinkHandler";

describe("registrationLinkHandler", () => {
  it("stores valid app invitation links", async () => {
    const storage = fakeSecureStorage();

    await expect(
      handleRegistrationLink({
        link: "mytradeapp://register?ref=A3K9M2&type=investor",
        storage,
      }),
    ).resolves.toEqual({
      payload: { referrerCode: "A3K9M2", selectedType: "investor" },
      status: "stored",
    });

    expect(storage.setItemAsync).toHaveBeenCalledWith(
      "mytradeapp.registration.payload",
      JSON.stringify({ referrerCode: "A3K9M2", selectedType: "investor" }),
    );
  });

  it("returns invalid results without writing storage", async () => {
    const storage = fakeSecureStorage();

    await expect(
      handleRegistrationLink({
        link: "mytradeapp://register?ref=A3K9M2",
        storage,
      }),
    ).resolves.toEqual({
      error: "missing_user_type",
      status: "invalid",
    });

    expect(storage.setItemAsync).not.toHaveBeenCalled();
  });
});

function fakeSecureStorage() {
  return {
    deleteItemAsync: vi.fn().mockResolvedValue(undefined),
    getItemAsync: vi.fn().mockResolvedValue(null),
    setItemAsync: vi.fn().mockResolvedValue(undefined),
  };
}
