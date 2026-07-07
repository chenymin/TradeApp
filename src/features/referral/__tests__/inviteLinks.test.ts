import { describe, expect, it } from "vitest";

import { buildInviteLinks } from "../domain/inviteLinks";

describe("buildInviteLinks", () => {
  it("builds web fallback invite links for every registration user type", () => {
    expect(
      buildInviteLinks({
        inviteCode: "ART STAR/42",
        webOrigin: "https://artstar.example",
      }),
    ).toEqual({
      collector: "https://artstar.example/register?ref=ART%20STAR%2F42&type=collector",
      creator: "https://artstar.example/register?ref=ART%20STAR%2F42&type=creator",
      institution:
        "https://artstar.example/register?ref=ART%20STAR%2F42&type=institution",
      investor: "https://artstar.example/register?ref=ART%20STAR%2F42&type=investor",
    });
  });

  it("builds custom scheme invite links for local app handoff", () => {
    expect(
      buildInviteLinks({
        inviteCode: "INVITE-7",
        scheme: "mytradeapp",
      }).creator,
    ).toBe("mytradeapp://register?ref=INVITE-7&type=creator");
  });
});
