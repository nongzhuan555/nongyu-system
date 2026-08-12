const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// monorepo：监听仓库根，便于解析 workspace 包
const workspaceRoot = path.resolve(__dirname, "../..");
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

/**
 * nongyu-tool-jiaowu 使用 iconv-lite 解码教务 GBK 响应。
 * iconv-lite 会 require Node 内置 `string_decoder`，Hermes/Metro 默认没有，
 * 需映射到 npm polyfill，否则教务相关页面 bundling 失败（白屏）。
 */
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  string_decoder: path.dirname(require.resolve("string_decoder/package.json")),
  buffer: path.dirname(require.resolve("buffer/package.json")),
};

module.exports = config;
