const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      process: require.resolve('process/browser'),
      events: require.resolve('events/'),
      zlib: require.resolve('browserify-zlib'),
      path: require.resolve('path-browserify'),
      assert: require.resolve('assert/'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
