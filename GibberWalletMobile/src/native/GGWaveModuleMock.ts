/**
 * Mock implementation of GGWaveModule for development
 * This will be used when the native module is not available
 */
import { EventEmitter } from 'eventemitter3';
import { AudioProtocolParams, AudioTransmissionResult, IGGWaveModule } from './GGWaveModule';

class GGWaveModuleMock implements IGGWaveModule {
  private eventEmitter = new EventEmitter();
  private listening = false;
  private transmitting = false;
  private audioLevel = 0;
  private audioLevelInterval?: any;

  async initialize(params: AudioProtocolParams): Promise<boolean> {
    console.log('[GGWaveMock] Initializing with params:', params);
    return true;
  }

  async startListening(): Promise<boolean> {
    console.log('[GGWaveMock] Starting listening');
    this.listening = true;
    
    // Simulate audio level changes
    this.audioLevelInterval = setInterval(() => {
      this.audioLevel = Math.random() * 30;
      this.eventEmitter.emit('onAudioLevelChanged', { level: this.audioLevel });
    }, 500);
    
    this.eventEmitter.emit('onListeningStarted');
    return true;
  }

  async stopListening(): Promise<boolean> {
    console.log('[GGWaveMock] Stopping listening');
    this.listening = false;
    
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = undefined;
    }
    
    this.eventEmitter.emit('onListeningStopped');
    return true;
  }

  async transmitMessage(message: string): Promise<AudioTransmissionResult> {
    console.log('[GGWaveMock] Transmitting message:', message);
    this.transmitting = true;
    this.eventEmitter.emit('onTransmissionStarted');
    
    // Simulate transmission delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.transmitting = false;
    this.eventEmitter.emit('onTransmissionCompleted');
    
    return {
      success: true,
      duration: 1000,
    };
  }

  async isListening(): Promise<boolean> {
    return this.listening;
  }

  async isTransmitting(): Promise<boolean> {
    return this.transmitting;
  }

  async getAudioLevel(): Promise<number> {
    return this.audioLevel;
  }

  async destroy(): Promise<boolean> {
    console.log('[GGWaveMock] Destroying');
    await this.stopListening();
    this.eventEmitter.removeAllListeners();
    return true;
  }
  
  addListener(eventName: string, listener: (...args: any[]) => void): { remove: () => void } {
    this.eventEmitter.on(eventName, listener);
    return {
      remove: () => {
        this.eventEmitter.off(eventName, listener);
      }
    };
  }
}

// Create a mock event emitter to match NativeEventEmitter behavior
export class MockEventEmitter {
  private mock: GGWaveModuleMock;
  
  constructor(mock: GGWaveModuleMock) {
    this.mock = mock;
  }
  
  addListener(eventName: string, listener: (...args: any[]) => void) {
    return this.mock.addListener(eventName, listener);
  }
}

export const mockGGWaveModule = new GGWaveModuleMock();
export const mockEventEmitter = new MockEventEmitter(mockGGWaveModule);