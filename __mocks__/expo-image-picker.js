module.exports = {
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
};
