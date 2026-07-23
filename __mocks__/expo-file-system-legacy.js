module.exports = {
  FileSystemUploadType: {
    BINARY_CONTENT: 0,
    MULTIPART: 1,
  },
  FileSystemSessionType: {
    BACKGROUND: 0,
    FOREGROUND: 1,
  },
  getInfoAsync: jest.fn(async (uri) => ({
    exists: true,
    uri,
    isDirectory: false,
    size: 1024,
    modificationTime: Date.now() / 1000,
  })),
  uploadAsync: jest.fn(async () => ({
    status: 200,
    headers: {},
    body: '',
    mimeType: null,
  })),
};
