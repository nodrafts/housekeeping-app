const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro/
 */
const config = getDefaultConfig(__dirname);

// Metro can fail to resolve the empty type-only export in React Navigation's
// web package when pnpm installs a peer-specific package variant.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    moduleName === './types.js' &&
    context.originModulePath.includes('@react-navigation')
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/shims/react-navigation-native-types.js'),
    };
  }

  if (
    platform === 'web' &&
    moduleName === './lib/extract/types' &&
    context.originModulePath.includes('react-native-svg')
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/shims/react-native-svg-extract-types.js'),
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

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
