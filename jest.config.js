module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^expo-image-picker$': '<rootDir>/__mocks__/expo-image-picker.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-.*|@tanstack|expo|expo-.*|@expo/.*)/)',
  ],
};
