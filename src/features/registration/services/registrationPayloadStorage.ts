import {
  isRegistrationPayload,
  type RegistrationPayload,
} from "../domain/registrationPayload";

export const REGISTRATION_PAYLOAD_STORAGE_KEY =
  "mytradeapp.registration.payload";
export const EXISTING_USER_INVITE_IGNORED_STORAGE_KEY =
  "mytradeapp.registration.existing_user_invite_ignored";

export type RegistrationSecureStorage = {
  deleteItemAsync: (key: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

export async function setRegistrationPayload({
  payload,
  storage,
}: {
  payload: RegistrationPayload;
  storage: RegistrationSecureStorage;
}) {
  await storage.setItemAsync(
    REGISTRATION_PAYLOAD_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export async function getRegistrationPayload({
  storage,
}: {
  storage: RegistrationSecureStorage;
}): Promise<RegistrationPayload | null> {
  const rawPayload = await storage.getItemAsync(REGISTRATION_PAYLOAD_STORAGE_KEY);

  if (!rawPayload) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(rawPayload) as unknown;
    return isRegistrationPayload(parsedPayload) ? parsedPayload : null;
  } catch {
    return null;
  }
}

export async function clearRegistrationPayload({
  storage,
}: {
  storage: RegistrationSecureStorage;
}) {
  await storage.deleteItemAsync(REGISTRATION_PAYLOAD_STORAGE_KEY);
}

export async function setExistingUserInviteIgnored({
  storage,
}: {
  storage: RegistrationSecureStorage;
}) {
  await storage.setItemAsync(EXISTING_USER_INVITE_IGNORED_STORAGE_KEY, "1");
}
