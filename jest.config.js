module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
    '^expo-localization$': '<rootDir>/__mocks__/expo-localization.js',
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system-legacy.js',
    '^expo-image-picker$': '<rootDir>/__mocks__/expo-image-picker.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-.*|@tanstack|expo|expo-.*|@expo/.*)/)',
  ],
};
