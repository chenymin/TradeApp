import {
  REGISTRATION_USER_TYPES,
  type RegistrationUserType,
} from "../../registration/domain/registrationPayload";

export type InviteLinks = Record<RegistrationUserType, string>;

export type BuildInviteLinksInput =
  | {
      inviteCode: string;
      webOrigin: string;
      scheme?: never;
    }
  | {
      inviteCode: string;
      scheme: string;
      webOrigin?: never;
    };

export function buildInviteLinks(input: BuildInviteLinksInput): InviteLinks {
  const inviteCode = input.inviteCode.trim();
  if (!inviteCode) {
    throw new Error("Invite code is required");
  }

  const normalizedInput = input.scheme !== undefined
    ? { inviteCode, scheme: normalizeScheme(input.scheme) }
    : { inviteCode, webOrigin: normalizeWebOrigin(input.webOrigin) };

  return REGISTRATION_USER_TYPES.reduce<InviteLinks>((links, selectedType) => {
    return {
      ...links,
      [selectedType]: buildInviteLink({
        ...normalizedInput,
        selectedType,
      }),
    };
  }, {} as InviteLinks);
}

function buildInviteLink(
  input: BuildInviteLinksInput & { selectedType: RegistrationUserType },
): string {
  const query = `ref=${encodeURIComponent(input.inviteCode)}&type=${input.selectedType}`;

  if ("scheme" in input) {
    return `${input.scheme}://register?${query}`;
  }

  return `${input.webOrigin.replace(/\/+$/, "")}/register?${query}`;
}

function normalizeWebOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error();
    }
    return url.origin;
  } catch {
    throw new Error("Invite web origin must use HTTPS");
  }
}

function normalizeScheme(value: string): string {
  const scheme = value.trim().replace(/:\/\/$/, "");
  if (!/^[a-z][a-z0-9+.-]*$/i.test(scheme)) {
    throw new Error("Invite scheme is invalid");
  }
  return scheme;
}
