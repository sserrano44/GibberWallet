// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve(true)),
  getInternetCredentials: jest.fn(() => Promise.resolve({ password: 'test' })),
  resetInternetCredentials: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve(null)),
  canImplyAuthentication: jest.fn(() => Promise.resolve(false)),
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
  },
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
  },
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock react-native-clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

// Mock native modules
jest.mock('./src/native/GGWaveModule', () => ({
  getInstance: jest.fn(() => ({
    initialize: jest.fn(() => Promise.resolve(true)),
    startListening: jest.fn(() => Promise.resolve(true)),
    stopListening: jest.fn(() => Promise.resolve()),
    transmitMessage: jest.fn(() => Promise.resolve({ success: true })),
    addEventListener: jest.fn(),
    removeAllEventListeners: jest.fn(),
    destroy: jest.fn(() => Promise.resolve()),
  })),
  GGWaveEvents: {
    MESSAGE_RECEIVED: 'messageReceived',
    LISTENING_STARTED: 'listeningStarted',
    LISTENING_STOPPED: 'listeningStopped',
    AUDIO_LEVEL_CHANGED: 'audioLevelChanged',
    ERROR: 'error',
  },
}));