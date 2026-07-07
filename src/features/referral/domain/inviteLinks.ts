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
  return REGISTRATION_USER_TYPES.reduce<InviteLinks>((links, selectedType) => {
    return {
      ...links,
      [selectedType]: buildInviteLink({
        ...input,
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
