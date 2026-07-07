import type { RegistrationUserType } from "../../registration/domain/registrationPayload";
import { buildInviteLinks } from "../domain/inviteLinks";

export type InviteClipboardAdapter = {
  setString(value: string): Promise<void> | void;
};

export type InviteShareAdapter = {
  share(input: { message: string; url: string }): Promise<unknown> | unknown;
};

export type CreateInviteShareWorkflowInput = {
  clipboard: InviteClipboardAdapter;
  inviteCode: string;
  share: InviteShareAdapter;
  webOrigin: string;
};

export function createInviteShareWorkflow({
  clipboard,
  inviteCode,
  share,
  webOrigin,
}: CreateInviteShareWorkflowInput) {
  const links = buildInviteLinks({ inviteCode, webOrigin });

  return {
    copy: async (selectedType: RegistrationUserType) => {
      await clipboard.setString(links[selectedType]);
      return { status: "copied" as const };
    },
    links,
    share: async (selectedType: RegistrationUserType) => {
      const url = links[selectedType];
      await share.share({
        message: `Join MyTradeApp: ${url}`,
        url,
      });
      return { status: "shared" as const };
    },
  };
}
