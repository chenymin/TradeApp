export const REGISTRATION_USER_TYPES = [
  "investor",
  "collector",
  "creator",
  "institution",
] as const;

export type RegistrationUserType = (typeof REGISTRATION_USER_TYPES)[number];

export type RegistrationPayload = {
  invitationToken?: string;
  referrerCode?: string;
  selectedType: RegistrationUserType;
};

export type RegistrationQueryError =
  | "invalid_user_type"
  | "missing_user_type"
  | "referrer_code_and_token_are_mutually_exclusive";

export type RegistrationParseResult =
  | {
      payload: RegistrationPayload;
      valid: true;
    }
  | {
      error: RegistrationQueryError;
      valid: false;
    };

export type RegisterUserRequestBody = {
  invitation_token?: string;
  referrer_code?: string;
  selected_type: RegistrationUserType;
};

export function parseRegistrationLink(link: string): RegistrationParseResult {
  const params = new URL(link).searchParams;
  const selectedType = params.get("type");
  const referrerCode = params.get("ref");
  const invitationToken = params.get("invitation_token");

  if (!selectedType) {
    return { error: "missing_user_type", valid: false };
  }

  if (!isRegistrationUserType(selectedType)) {
    return { error: "invalid_user_type", valid: false };
  }

  if (referrerCode && invitationToken) {
    return {
      error: "referrer_code_and_token_are_mutually_exclusive",
      valid: false,
    };
  }

  return {
    payload: {
      ...(invitationToken ? { invitationToken } : {}),
      ...(referrerCode ? { referrerCode } : {}),
      selectedType,
    },
    valid: true,
  };
}

export function toRegisterUserRequestBody(
  payload: RegistrationPayload,
): RegisterUserRequestBody {
  return {
    ...(payload.invitationToken ? { invitation_token: payload.invitationToken } : {}),
    ...(payload.referrerCode ? { referrer_code: payload.referrerCode } : {}),
    selected_type: payload.selectedType,
  };
}

export function isRegistrationPayload(value: unknown): value is RegistrationPayload {
  const payload = value as RegistrationPayload;

  if (!payload || !isRegistrationUserType(payload.selectedType)) {
    return false;
  }

  if (
    payload.referrerCode &&
    payload.invitationToken
  ) {
    return false;
  }

  return (
    (payload.referrerCode === undefined || typeof payload.referrerCode === "string") &&
    (payload.invitationToken === undefined ||
      typeof payload.invitationToken === "string")
  );
}

export function isRegistrationUserType(
  value: unknown,
): value is RegistrationUserType {
  return (
    typeof value === "string" &&
    REGISTRATION_USER_TYPES.includes(value as RegistrationUserType)
  );
}
