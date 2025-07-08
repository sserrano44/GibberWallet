import { NativeModules, NativeEventEmitter } from 'react-native';

/**
 * Audio protocol parameters
 */
export interface AudioProtocolParams {
  sampleRate: number;
  payloadLength: number;
  protocolId: number;
  volume: number;
}

/**
 * Audio transmission result
 */
export interface AudioTransmissionResult {
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Audio reception event data
 */
export interface AudioReceptionData {
  message: string;
  timestamp: number;
  signalStrength?: number;
}

/**
 * GGWave native module interface
 */
export interface IGGWaveModule {
  /**
   * Initialize the ggwave audio system
   */
  initialize(params: AudioProtocolParams): Promise<boolean>;

  /**
   * Start listening for audio messages
   */
  startListening(): Promise<boolean>;

  /**
   * Stop listening for audio messages
   */
  stopListening(): Promise<boolean>;

  /**
   * Transmit a message via audio
   */
  transmitMessage(message: string): Promise<AudioTransmissionResult>;

  /**
   * Check if the system is currently listening
   */
  isListening(): Promise<boolean>;

  /**
   * Check if the system is currently transmitting
   */
  isTransmitting(): Promise<boolean>;

  /**
   * Get current audio level (0-100)
   */
  getAudioLevel(): Promise<number>;

  /**
   * Cleanup and destroy the audio system
   */
  destroy(): Promise<boolean>;
}

import { mockGGWaveModule, mockEventEmitter } from './GGWaveModuleMock';

/**
 * Native module instance
 * This will be implemented by the iOS native module
 * Falls back to mock implementation for development
 */
const GGWaveModuleNative = NativeModules.GGWaveModule || mockGGWaveModule;

// Log whether we're using the native module or mock
if (!NativeModules.GGWaveModule) {
  console.warn('[GGWaveModule] Native module not available, using mock implementation');
}

/**
 * Event emitter for native module events
 */
export const GGWaveEventEmitter = NativeModules.GGWaveModule 
  ? new NativeEventEmitter(NativeModules.GGWaveModule)
  : mockEventEmitter;

/**
 * Event types emitted by the native module
 */
export const GGWaveEvents = {
  MESSAGE_RECEIVED: 'onMessageReceived',
  LISTENING_STARTED: 'onListeningStarted',
  LISTENING_STOPPED: 'onListeningStopped',
  TRANSMISSION_STARTED: 'onTransmissionStarted',
  TRANSMISSION_COMPLETED: 'onTransmissionCompleted',
  AUDIO_LEVEL_CHANGED: 'onAudioLevelChanged',
  ERROR: 'onError',
} as const;

/**
 * Wrapper class for the GGWave native module
 */
export class GGWaveModule {
  private static instance: GGWaveModule | null = null;
  private isInitialized = false;
  private eventListeners: Map<string, any> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): GGWaveModule {
    if (!GGWaveModule.instance) {
      GGWaveModule.instance = new GGWaveModule();
    }
    return GGWaveModule.instance;
  }

  /**
   * Initialize the ggwave system
   */
  async initialize(params?: Partial<AudioProtocolParams>): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    const defaultParams: AudioProtocolParams = {
      sampleRate: 48000,
      payloadLength: -1,
      protocolId: 1, // AUDIBLE_FAST
      volume: 15,
      ...params,
    };

    try {
      const success = await GGWaveModuleNative.initialize(defaultParams);
      this.isInitialized = success;
      return success;
    } catch (error) {
      console.error('Failed to initialize GGWave:', error);
      return false;
    }
  }

  /**
   * Start listening for audio messages
   */
  async startListening(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('GGWave not initialized');
    }

    try {
      return await GGWaveModuleNative.startListening();
    } catch (error) {
      console.error('Failed to start listening:', error);
      return false;
    }
  }

  /**
   * Stop listening for audio messages
   */
  async stopListening(): Promise<boolean> {
    if (!this.isInitialized) {
      return true;
    }

    try {
      return await GGWaveModuleNative.stopListening();
    } catch (error) {
      console.error('Failed to stop listening:', error);
      return false;
    }
  }

  /**
   * Transmit a message via audio
   */
  async transmitMessage(message: string): Promise<AudioTransmissionResult> {
    if (!this.isInitialized) {
      throw new Error('GGWave not initialized');
    }

    try {
      return await GGWaveModuleNative.transmitMessage(message);
    } catch (error) {
      console.error('Failed to transmit message:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if currently listening
   */
  async isListening(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      return await GGWaveModuleNative.isListening();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if currently transmitting
   */
  async isTransmitting(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      return await GGWaveModuleNative.isTransmitting();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current audio level
   */
  async getAudioLevel(): Promise<number> {
    if (!this.isInitialized) {
      return 0;
    }

    try {
      return await GGWaveModuleNative.getAudioLevel();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: (data: any) => void): void {
    const subscription = GGWaveEventEmitter.addListener(event, callback);
    this.eventListeners.set(event, subscription);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string): void {
    const subscription = this.eventListeners.get(event);
    if (subscription) {
      subscription.remove();
      this.eventListeners.delete(event);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners(): void {
    this.eventListeners.forEach((subscription) => {
      subscription.remove();
    });
    this.eventListeners.clear();
  }

  /**
   * Cleanup and destroy
   */
  async destroy(): Promise<boolean> {
    this.removeAllEventListeners();

    if (!this.isInitialized) {
      return true;
    }

    try {
      const success = await GGWaveModuleNative.destroy();
      this.isInitialized = false;
      return success;
    } catch (error) {
      console.error('Failed to destroy GGWave:', error);
      return false;
    }
  }
}

export default GGWaveModule;