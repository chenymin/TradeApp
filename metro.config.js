const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const nativePlatforms = ["ios", "android", "tvos", "macos"];

for (const platform of nativePlatforms) {
  const conditions = config.resolver.unstable_conditionsByPlatform[platform] ?? [];

  if (!conditions.includes("browser")) {
    config.resolver.unstable_conditionsByPlatform[platform] = [
      ...conditions,
      "browser",
    ];
  }
}

module.exports = config;
