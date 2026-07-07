import {
  parseRegistrationLink,
  type RegistrationPayload,
  type RegistrationQueryError,
} from "../domain/registrationPayload";
import {
  setRegistrationPayload,
  type RegistrationSecureStorage,
} from "../services/registrationPayloadStorage";

export type RegistrationLinkHandleResult =
  | {
      payload: RegistrationPayload;
      status: "stored";
    }
  | {
      error: RegistrationQueryError;
      status: "invalid";
    };

export async function handleRegistrationLink({
  link,
  storage,
}: {
  link: string;
  storage: RegistrationSecureStorage;
}): Promise<RegistrationLinkHandleResult> {
  const parsed = parseRegistrationLink(link);

  if (!parsed.valid) {
    return {
      error: parsed.error,
      status: "invalid",
    };
  }

  await setRegistrationPayload({
    payload: parsed.payload,
    storage,
  });

  return {
    payload: parsed.payload,
    status: "stored",
  };
}
