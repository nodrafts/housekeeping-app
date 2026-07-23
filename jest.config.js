module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system-legacy.js',
    '^expo-image-picker$': '<rootDir>/__mocks__/expo-image-picker.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-.*|@tanstack|expo|expo-.*|@expo/.*)/)',
  ],
};
