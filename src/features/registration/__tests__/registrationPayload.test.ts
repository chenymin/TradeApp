import { describe, expect, it } from "vitest";

import {
  parseRegistrationLink,
  toRegisterUserRequestBody,
} from "../domain/registrationPayload";

describe("registrationPayload", () => {
  it("parses referral-code invitation links", () => {
    expect(parseRegistrationLink("mytradeapp://register?ref=A3K9M2&type=investor")).toEqual({
      payload: {
        referrerCode: "A3K9M2",
        selectedType: "investor",
      },
      valid: true,
    });
  });

  it("parses invitation-token links", () => {
    expect(
      parseRegistrationLink(
        "https://app.example.com/register?invitation_token=token-abc&type=collector",
      ),
    ).toEqual({
      payload: {
        invitationToken: "token-abc",
        selectedType: "collector",
      },
      valid: true,
    });
  });

  it("rejects missing type unsupported type and mutually exclusive invite params", () => {
    expect(parseRegistrationLink("mytradeapp://register?ref=A3K9M2")).toEqual({
      error: "missing_user_type",
      valid: false,
    });
    expect(parseRegistrationLink("mytradeapp://register?ref=A3K9M2&type=admin")).toEqual({
      error: "invalid_user_type",
      valid: false,
    });
    expect(
      parseRegistrationLink(
        "mytradeapp://register?ref=A3K9M2&invitation_token=token-abc&type=investor",
      ),
    ).toEqual({
      error: "referrer_code_and_token_are_mutually_exclusive",
      valid: false,
    });
  });

  it("serializes payload using register-user field names", () => {
    expect(
      toRegisterUserRequestBody({
        invitationToken: "token-abc",
        selectedType: "institution",
      }),
    ).toEqual({
      invitation_token: "token-abc",
      selected_type: "institution",
    });
  });
});
