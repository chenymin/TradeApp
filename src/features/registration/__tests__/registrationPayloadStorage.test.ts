import { describe, expect, it, vi } from "vitest";

import {
  clearRegistrationPayload,
  getRegistrationPayload,
  setExistingUserInviteIgnored,
  setRegistrationPayload,
} from "../services/registrationPayloadStorage";

describe("registrationPayloadStorage", () => {
  it("persists and restores a registration payload", async () => {
    const storage = fakeSecureStorage();

    await setRegistrationPayload({
      payload: { referrerCode: "A3K9M2", selectedType: "investor" },
      storage,
    });

    expect(storage.setItemAsync).toHaveBeenCalledWith(
      "mytradeapp.registration.payload",
      JSON.stringify({ referrerCode: "A3K9M2", selectedType: "investor" }),
    );

    storage.getItemAsync.mockResolvedValueOnce(
      JSON.stringify({ referrerCode: "A3K9M2", selectedType: "investor" }),
    );

    await expect(getRegistrationPayload({ storage })).resolves.toEqual({
      referrerCode: "A3K9M2",
      selectedType: "investor",
    });
  });

  it("returns null for missing or invalid stored payloads", async () => {
    await expect(getRegistrationPayload({ storage: fakeSecureStorage(null) })).resolves.toBeNull();
    await expect(getRegistrationPayload({ storage: fakeSecureStorage("not-json") })).resolves.toBeNull();
    await expect(
      getRegistrationPayload({
        storage: fakeSecureStorage(JSON.stringify({ selectedType: "admin" })),
      }),
    ).resolves.toBeNull();
  });

  it("clears payload and stores existing-user invite ignored flag", async () => {
    const storage = fakeSecureStorage();

    await clearRegistrationPayload({ storage });
    await setExistingUserInviteIgnored({ storage });

    expect(storage.deleteItemAsync).toHaveBeenCalledWith("mytradeapp.registration.payload");
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      "mytradeapp.registration.existing_user_invite_ignored",
      "1",
    );
  });
});

function fakeSecureStorage(storedValue: string | null = null) {
  return {
    deleteItemAsync: vi.fn().mockResolvedValue(undefined),
    getItemAsync: vi.fn().mockResolvedValue(storedValue),
    setItemAsync: vi.fn().mockResolvedValue(undefined),
  };
}
