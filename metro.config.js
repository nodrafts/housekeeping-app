const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro/
 */
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util/'),
  process: require.resolve('process/browser'),
  events: require.resolve('events/'),
  zlib: require.resolve('browserify-zlib'),
  path: require.resolve('path-browserify'),
  assert: require.resolve('assert/'),
};

module.exports = config;
