import { deleteAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

export type WalletImageShareTarget = { current: unknown };

export type WalletImageShareAdapter = {
  share(target: WalletImageShareTarget): Promise<"shared" | "unavailable">;
};

export type WalletImageShareIo = {
  capture(target: WalletImageShareTarget): Promise<string>;
  deleteFile(uri: string): Promise<void>;
  isSharingAvailable(): Promise<boolean>;
  shareFile(uri: string): Promise<void>;
};

export function createWalletImageShareAdapter(
  io: WalletImageShareIo,
): WalletImageShareAdapter {
  return {
    async share(target) {
      let uri: string | null = null;

      try {
        if (!target.current || !(await io.isSharingAvailable())) {
          return "unavailable";
        }
        uri = await io.capture(target);
        await io.shareFile(uri);
        return "shared";
      } catch {
        return "unavailable";
      } finally {
        if (uri) {
          try {
            await io.deleteFile(uri);
          } catch {
            // Cleanup is best effort and must not expose a temporary path.
          }
        }
      }
    },
  };
}

export function createDefaultWalletImageShareAdapter(): WalletImageShareAdapter {
  return createWalletImageShareAdapter({
    async capture(target) {
      return captureRef(target.current as never, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
    },
    async deleteFile(uri) {
      await deleteAsync(uri, { idempotent: true });
    },
    isSharingAvailable: Sharing.isAvailableAsync,
    async shareFile(uri) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
      });
    },
  });
}
