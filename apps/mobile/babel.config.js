const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // expo-router lives in the mobile workspace; babel-preset-expo won't auto-detect it in a monorepo.
    plugins: [expoRouterBabelPlugin],
  };
};
