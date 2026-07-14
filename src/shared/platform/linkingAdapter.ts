export type ExternalLinkResult = "opened" | "invalid" | "unsupported";

export type ExternalLinkAdapter = {
  open(url: string): Promise<ExternalLinkResult>;
};

type LinkingPlatform = {
  canOpenURL(url: string): Promise<boolean>;
  openURL(url: string): Promise<unknown>;
};

export function createExternalLinkAdapter(
  platform: LinkingPlatform,
): ExternalLinkAdapter {
  return {
    async open(value) {
      const url = safeUrl(value);
      if (!url) return "invalid";
      try {
        if (!await platform.canOpenURL(url)) return "unsupported";
        await platform.openURL(url);
        return "opened";
      } catch {
        return "unsupported";
      }
    },
  };
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
