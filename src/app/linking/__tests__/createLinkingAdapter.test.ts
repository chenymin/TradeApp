import { describe, expect, it, vi } from "vitest";

import { createLinkingAdapter } from "../createLinkingAdapter";

describe("createLinkingAdapter", () => {
  it("handles the initial URL once during startup", async () => {
    const linking = fakeLinking({ initialUrl: "mytradeapp://register?ref=ABC&type=investor" });
    const onUrl = vi.fn().mockResolvedValue(undefined);

    const adapter = createLinkingAdapter({ linking, onUrl });

    await adapter.start();

    expect(onUrl).toHaveBeenCalledWith("mytradeapp://register?ref=ABC&type=investor");
  });

  it("handles runtime URL events and unsubscribes on stop", async () => {
    const linking = fakeLinking({ initialUrl: null });
    const onUrl = vi.fn().mockResolvedValue(undefined);

    const adapter = createLinkingAdapter({ linking, onUrl });
    await adapter.start();

    await linking.emit("https://artstar.example/register?ref=ABC&type=creator");

    expect(onUrl).toHaveBeenCalledWith(
      "https://artstar.example/register?ref=ABC&type=creator",
    );

    adapter.stop();
    await linking.emit("mytradeapp://register?ref=NEXT&type=collector");

    expect(onUrl).toHaveBeenCalledTimes(1);
    expect(linking.remove).toHaveBeenCalledOnce();
  });
});

function fakeLinking({ initialUrl }: { initialUrl: string | null }) {
  let listener: ((event: { url: string }) => void) | undefined;

  return {
    addEventListener: vi.fn((_eventName: "url", callback: (event: { url: string }) => void) => {
      listener = callback;
      return {
        remove: vi.fn(() => {
          listener = undefined;
        }),
      };
    }),
    async emit(url: string) {
      listener?.({ url });
    },
    getInitialURL: vi.fn().mockResolvedValue(initialUrl),
    get remove() {
      return this.addEventListener.mock.results[0]?.value.remove ?? vi.fn();
    },
  };
}
