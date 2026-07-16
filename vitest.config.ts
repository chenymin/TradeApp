import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "expo-clipboard": "/test/mocks/expo-clipboard.ts",
      "lucide-react-native": "/test/mocks/lucide-react-native.tsx",
      "react-native": "/test/mocks/react-native.tsx",
      "react-native-qrcode-styled": "/test/mocks/react-native-qrcode-styled.tsx",
      "react-native-safe-area-context": "/test/mocks/react-native-safe-area-context.tsx",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
