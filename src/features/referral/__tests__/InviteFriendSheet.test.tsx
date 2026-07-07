import { describe, expect, it, vi } from "vitest";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { InviteFriendSheet } from "../components/InviteFriendSheet";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("InviteFriendSheet", () => {
  it("renders the app invite type picker layout", async () => {
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <InviteFriendSheet
          clipboard={{ setString: vi.fn() }}
          inviteCode="ABC"
          onClose={vi.fn()}
          share={{ share: vi.fn() }}
          webOrigin="https://artstar.example"
        />,
      );
    });

    if (!renderer) {
      throw new Error("Expected InviteFriendSheet to mount");
    }
    const mountedRenderer = renderer;
    const treeText = JSON.stringify(mountedRenderer.toJSON());

    expect(treeText).toContain("选择邀请类型");
    expect(treeText).toContain("复制链接发送给你的朋友即可完成邀请。");
    expect(treeText).toContain("投资者");
    expect(treeText).toContain("藏家 - 需艺委会审核评级，授予声誉积分");
    expect(treeText).toContain("艺术家 - 需艺委会审核评级，授予声誉积分");
    expect(treeText).toContain("机构 - 需艺委会审核评级，授予声誉积分");
    expect(mountedRenderer.root.findByProps({ accessibilityLabel: "Invite type 投资者" }).props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: "#E4F1DE",
          borderColor: "#159100",
          borderWidth: 2,
        }),
      ]),
    );
    expect(mountedRenderer.root.findByProps({ accessibilityLabel: "Copy invite link" }).props.style).toMatchObject({
      backgroundColor: "#000000",
      borderRadius: 999,
    });
  });

  it("switches invite type and copies the selected link", async () => {
    const clipboard = { setString: vi.fn().mockResolvedValue(undefined) };
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <InviteFriendSheet
          clipboard={clipboard}
          inviteCode="ABC"
          onClose={vi.fn()}
          share={{ share: vi.fn() }}
          webOrigin="https://artstar.example"
        />,
      );
    });

    if (!renderer) {
      throw new Error("Expected InviteFriendSheet to mount");
    }
    const mountedRenderer = renderer;

    await act(async () => {
      mountedRenderer.root.findByProps({ accessibilityLabel: "Invite type 艺术家" }).props.onPress();
    });

    expect(JSON.stringify(mountedRenderer.toJSON())).toContain(
      "https://artstar.example/register?ref=ABC&type=creator",
    );

    await act(async () => {
      await mountedRenderer.root.findByProps({ accessibilityLabel: "Copy invite link" }).props.onPress();
    });

    expect(clipboard.setString).toHaveBeenCalledWith(
      "https://artstar.example/register?ref=ABC&type=creator",
    );
    expect(JSON.stringify(mountedRenderer.toJSON())).toContain("Copied");
  });

  it("shares the selected invite link", async () => {
    const share = { share: vi.fn().mockResolvedValue({ action: "sharedAction" }) };
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(
        <InviteFriendSheet
          clipboard={{ setString: vi.fn() }}
          inviteCode="ABC"
          onClose={vi.fn()}
          share={share}
          webOrigin="https://artstar.example"
        />,
      );
    });

    if (!renderer) {
      throw new Error("Expected InviteFriendSheet to mount");
    }
    const mountedRenderer = renderer;

    await act(async () => {
      await mountedRenderer.root.findByProps({ accessibilityLabel: "Share invite link" }).props.onPress();
    });

    expect(share.share).toHaveBeenCalledWith({
      message: "Join MyTradeApp: https://artstar.example/register?ref=ABC&type=investor",
      url: "https://artstar.example/register?ref=ABC&type=investor",
    });
  });
});
