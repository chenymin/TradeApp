export type AppLinkingSource = {
  addEventListener(
    eventName: "url",
    callback: (event: { url: string }) => void,
  ): { remove(): void };
  getInitialURL(): Promise<string | null>;
};

export type CreateLinkingAdapterInput = {
  linking: AppLinkingSource;
  onUrl(url: string): Promise<void> | void;
};

export function createLinkingAdapter({ linking, onUrl }: CreateLinkingAdapterInput) {
  let subscription: { remove(): void } | null = null;
  let started = false;

  return {
    async start() {
      if (started) {
        return;
      }

      started = true;
      subscription = linking.addEventListener("url", (event) => {
        void onUrl(event.url);
      });

      const initialUrl = await linking.getInitialURL();
      if (initialUrl) {
        await onUrl(initialUrl);
      }
    },
    stop() {
      subscription?.remove();
      subscription = null;
      started = false;
    },
  };
}
