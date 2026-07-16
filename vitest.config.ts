import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "expo-clipboard": "/test/mocks/expo-clipboard.ts",
      "expo-file-system/legacy": "/test/mocks/expo-file-system-legacy.ts",
      "expo-sharing": "/test/mocks/expo-sharing.ts",
      "lucide-react-native": "/test/mocks/lucide-react-native.tsx",
      "react-native": "/test/mocks/react-native.tsx",
      "react-native-qrcode-styled": "/test/mocks/react-native-qrcode-styled.tsx",
      "react-native-view-shot": "/test/mocks/react-native-view-shot.ts",
      "react-native-safe-area-context": "/test/mocks/react-native-safe-area-context.tsx",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
