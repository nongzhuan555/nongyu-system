module.exports = function (api) {
  api.cache(true);
  return {
    // pnpm 下 Gradle Metro 从 @babel/core 隔离目录解析字符串 preset 会找不到包
    presets: [require.resolve("babel-preset-expo")],
    plugins: [require.resolve("react-native-reanimated/plugin")],
  };
};
