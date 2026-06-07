const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Inject DOMException polyfill at the absolute earliest stage
config.serializer.polyfillModuleNames = [
  require.resolve('./polyfill.js'),
  ...(config.serializer.polyfillModuleNames || [])
];

module.exports = withNativeWind(config, { input: "./src/global.css" });
