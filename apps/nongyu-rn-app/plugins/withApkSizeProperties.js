/**
 * Persist APK-size gradle toggles across `expo prebuild`.
 * (expo-build-properties does not cover expo.gif.enabled.)
 */
const { withGradleProperties } = require("expo/config-plugins");

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withApkSizeProperties(config) {
  return withGradleProperties(config, (cfg) => {
    const next = [
      { type: "property", key: "expo.gif.enabled", value: "false" },
      {
        type: "property",
        key: "android.enableMinifyInReleaseBuilds",
        value: "true",
      },
      {
        type: "property",
        key: "android.enableShrinkResourcesInReleaseBuilds",
        value: "true",
      },
    ];

    for (const item of next) {
      const idx = cfg.modResults.findIndex(
        (entry) => entry.type === "property" && entry.key === item.key,
      );
      if (idx >= 0) {
        cfg.modResults[idx] = item;
      } else {
        cfg.modResults.push(item);
      }
    }

    return cfg;
  });
}

module.exports = withApkSizeProperties;
