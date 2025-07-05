import { Message } from './message-protocol.js';
import Speaker from 'speaker';
import record from 'node-record-lpcm16';

// ggwave import with fallback for development
let ggwave = null;
let ggwaveInstance = null;
let GGWAVE_AVAILABLE = false;
let initializationPromise = null;

// Initialize ggwave asynchronously
async function initializeGgwave() {
    if (ggwaveInstance && ggwave) {
        console.log('[SOUND] ggwave already initialized, reusing instance');
        return { ggwave, ggwaveInstance };
    }
    
    try {
        // Import ggwave package (it's a CommonJS module, needs dynamic import)
        const ggwaveFactory = (await import('ggwave')).default;
        
        // Initialize ggwave using factory pattern
        ggwave = await ggwaveFactory();
        
        // Create ggwave instance with default parameters
        let parameters;
        try {
            parameters = ggwave.getDefaultParameters();
            console.log('[SOUND] Got default parameters');
        } catch (paramError) {
            console.log('[SOUND] Failed to get default parameters:', paramError.message);
            // Try with null/undefined parameters
            parameters = null;
        }
        
        try {
            ggwaveInstance = ggwave.init(parameters);
            console.log(`[SOUND] ggwave.init() returned: ${ggwaveInstance}`);
        } catch (initError) {
            console.log('[SOUND] ggwave.init() failed:', initError.message);
            // Try alternative initialization
            try {
                ggwaveInstance = ggwave.init();
                console.log(`[SOUND] ggwave.init() (no params) returned: ${ggwaveInstance}`);
            } catch (altError) {
                console.log('[SOUND] Alternative init failed:', altError.message);
            }
        }
        
        GGWAVE_AVAILABLE = (ggwaveInstance !== null && ggwaveInstance !== undefined);
        console.log('[SOUND] ggwave loaded and initialized successfully');
        console.log(`[SOUND] Created ggwaveInstance: ${GGWAVE_AVAILABLE ? 'success' : 'failed'} (ID: ${ggwaveInstance})`);
        
        return { ggwave, ggwaveInstance };
    } catch (error) {
        console.log('[SOUND] ggwave not available, using simulation mode');
        console.log('[SOUND] Install with: npm install ggwave');
        console.log('[SOUND] Error:', error.message);
        GGWAVE_AVAILABLE = false;
        throw error;
    }
}

// Start initialization immediately
initializationPromise = initializeGgwave().catch(() => null);

/**
 * Sound protocol for transmitting messages via audio
 */
export class SoundProtocol {
    constructor(timeout = 5000, retries = 3) {
        this.timeout = timeout;
        this.retries = retries;
        this.isListening = false;
        this.receivedCallback = null;
        this.messageQueue = [];
        
        // ggwave instances will be set after initialization
        this.ggwaveInstance = null;
        this.ggwave = null;
        this.isInitialized = false;
        
        // Audio recording setup
        this.recording = null;
        this.audioBuffer = [];
        this.sampleRate = 48000; // ggwave default sample rate
        
        // Initialize ggwave asynchronously
        this.initializeAsync();
    }
    
    /**
     * Initialize ggwave asynchronously
     */
    async initializeAsync() {
        try {
            // Initialize ggwave directly for this instance
            const result = await initializeGgwave();
            
            if (result && (result.ggwaveInstance !== null && result.ggwaveInstance !== undefined)) {
                this.ggwaveInstance = result.ggwaveInstance;
                this.ggwave = result.ggwave;
                this.isInitialized = true;
                console.log(`[SOUND] SoundProtocol initialized - ggwaveInstance: ready (ID: ${this.ggwaveInstance})`);
            } else {
                this.isInitialized = false;
                console.log(`[SOUND] SoundProtocol initialized - ggwaveInstance: missing (result: ${result ? 'present' : 'null'})`);
            }
        } catch (error) {
            console.log('[SOUND] Failed to initialize ggwave:', error.message);
            this.isInitialized = false;
        }
    }

    /**
     * Send a message via sound
     */
    async sendMessage(message) {
        // Wait for initialization if not ready
        if (!this.isInitialized) {
            console.log('[SOUND] Waiting for ggwave initialization...');
            let attempts = 0;
            while (!this.isInitialized && attempts < 10) {
                await this.sleep(100);
                attempts++;
            }
        }
        
        if (this.ggwaveInstance === null || this.ggwaveInstance === undefined) {
            console.log(`[SOUND] Would send: ${message.toJSON()}`);
            return true;
        }

        try {
            const jsonStr = message.toJSON();
            console.log(`[SOUND] Sending: ${message.type} (ID: ${message.id})`);
            
            // Encode message to sound using ggwave
            const protocol = this.ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST;
            
            const waveform = this.ggwave.encode(
                this.ggwaveInstance, 
                jsonStr, 
                protocol, 
                10 // volume level
            );
            
            console.log(`[SOUND] Encoded ${waveform.length} bytes to audio`);
            
            // Play the waveform through speakers
            await this.playAudio(waveform);
            
            return true;
            
        } catch (error) {
            console.log(`[SOUND] Error sending message:`, error.message);
            return false;
        }
    }

    /**
     * Start listening for sound messages
     */
    async startListening(callback) {
        if (this.isListening) {
            return;
        }

        this.receivedCallback = callback;
        this.isListening = true;
        this.audioBuffer = [];

        // Wait for initialization if needed
        if (!this.isInitialized) {
            console.log('[SOUND] Waiting for ggwave initialization before starting listener...');
            let attempts = 0;
            while (!this.isInitialized && attempts < 20) {
                await this.sleep(100);
                attempts++;
            }
        }

        const instanceStatus = (this.ggwaveInstance === null || this.ggwaveInstance === undefined) ? 'missing' : `present(ID:${this.ggwaveInstance})`;
        console.log(`[SOUND] startListening check - isInitialized: ${this.isInitialized}, ggwaveInstance: ${instanceStatus}`);
        
        if (this.isInitialized && (this.ggwaveInstance !== null && this.ggwaveInstance !== undefined)) {
            console.log('[SOUND] Listening for real audio messages...');
            this.startRecording();
            this.listenLoop();
        } else {
            console.log('[SOUND] Listening mode started (simulated - ggwave not available)');
        }
    }

    /**
     * Stop listening for messages
     */
    stopListening() {
        this.isListening = false;
        this.stopRecording();
        console.log('[SOUND] Stopped listening');
    }

    /**
     * Play audio waveform through speakers
     */
    async playAudio(waveform) {
        return new Promise((resolve, reject) => {
            try {
                // Convert Float32Array to Int16Array for speaker
                const int16Buffer = new Int16Array(waveform.length);
                for (let i = 0; i < waveform.length; i++) {
                    // Convert from float [-1, 1] to int16 [-32768, 32767]
                    int16Buffer[i] = Math.max(-32768, Math.min(32767, Math.floor(waveform[i] * 32767)));
                }
                
                // Create speaker instance
                const speaker = new Speaker({
                    channels: 1,          // Mono
                    bitDepth: 16,         // 16-bit samples
                    sampleRate: this.sampleRate
                });
                
                // Handle speaker events
                speaker.on('error', (err) => {
                    console.error('[SOUND] Speaker error:', err);
                    reject(err);
                });
                
                speaker.on('close', () => {
                    console.log('[SOUND] Audio playback completed');
                    resolve();
                });
                
                // Convert Int16Array to Buffer and write to speaker
                const buffer = Buffer.from(int16Buffer.buffer);
                speaker.write(buffer);
                speaker.end();
                
            } catch (error) {
                console.error('[SOUND] Error playing audio:', error);
                reject(error);
            }
        });
    }

    /**
     * Start recording audio from microphone
     */
    startRecording() {
        try {
            this.recording = record.record({
                sampleRate: this.sampleRate,
                channels: 1,
                audioType: 'raw',
                recorder: 'sox', // sox is now installed
                device: null, // use default device
                // Remove all filtering/threshold options to capture all audio
                verbose: false
            });
            
            // Process incoming audio data
            this.recording.stream().on('data', (data) => {
                // Convert buffer to Float32Array for ggwave
                const int16Array = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
                const float32Array = new Float32Array(int16Array.length);
                
                // Calculate audio level for debugging
                let maxLevel = 0;
                for (let i = 0; i < int16Array.length; i++) {
                    // Convert from int16 to float [-1, 1]
                    float32Array[i] = int16Array[i] / 32768.0;
                    maxLevel = Math.max(maxLevel, Math.abs(float32Array[i]));
                }
                
                // Add to buffer
                this.audioBuffer.push(...float32Array);
                
                // Log audio activity if significant
                if (maxLevel > 0.01) {
                    console.log(`[SOUND] Audio detected - Level: ${(maxLevel * 100).toFixed(1)}%, Buffer size: ${this.audioBuffer.length}`);
                }
                
                // Process buffer more frequently for better responsiveness
                // Process every 0.25 seconds instead of 1 second
                if (this.audioBuffer.length >= this.sampleRate / 4) {
                    console.log('[SOUND] Processing audio buffer...');
                    this.processAudioBuffer();
                }
            });
            
            this.recording.stream().on('error', (err) => {
                console.error('[SOUND] Recording error:', err);
            });
            
            console.log('[SOUND] Started recording from microphone');
        } catch (error) {
            console.error('[SOUND] Failed to start recording:', error);
        }
    }
    
    /**
     * Stop recording audio
     */
    stopRecording() {
        if (this.recording) {
            this.recording.stop();
            this.recording = null;
            console.log('[SOUND] Stopped recording');
        }
    }
    
    /**
     * Process accumulated audio buffer
     */
    processAudioBuffer() {
        if (!this.isInitialized || (this.ggwaveInstance === null || this.ggwaveInstance === undefined) || !this.receivedCallback) {
            const instanceStatus = (this.ggwaveInstance === null || this.ggwaveInstance === undefined) ? 'missing' : `present(ID:${this.ggwaveInstance})`;
            console.log(`[SOUND] Cannot process buffer - initialized: ${this.isInitialized}, ggwaveInstance: ${instanceStatus}, receivedCallback: ${this.receivedCallback ? 'present' : 'missing'}`);
            // Don't clear the buffer if we're just waiting for initialization
            if (!this.isInitialized) {
                return; // Keep the audio buffer for when initialization completes
            }
            this.audioBuffer = [];
            return;
        }
        
        try {
            // Create Float32Array from buffer
            const audioData = new Float32Array(this.audioBuffer);
            console.log(`[SOUND] Attempting to decode ${audioData.length} samples`);
            
            // Try to decode with ggwave
            try {
                const decodedData = this.ggwave.decode(this.ggwaveInstance, audioData);
                
                if (decodedData && decodedData.length > 0) {
                    console.log(`[SOUND] Decoded ${decodedData.length} bytes`);
                    try {
                        const messageStr = new TextDecoder().decode(decodedData);
                        console.log(`[SOUND] Decoded string: ${messageStr.substring(0, 100)}...`);
                        const messageData = JSON.parse(messageStr);
                        console.log(`[SOUND] Successfully decoded message: ${messageData.type}`);
                        
                        // Call the callback with the decoded message
                        const message = Message.fromJSON(messageStr);
                        this.receivedCallback(message);
                        
                        // Clear buffer after successful decode
                        this.audioBuffer = [];
                        return; // Exit early on successful decode
                    } catch (parseError) {
                        console.log(`[SOUND] Failed to parse decoded data: ${parseError.message}`);
                        // Not a valid message, continue accumulating
                    }
                }
                // No valid data decoded - this is normal for most audio
            } catch (decodeError) {
                // This is normal - most audio doesn't contain ggwave data
                // Only log if it's not the common "Cannot pass non-string" error
                if (!decodeError.message.includes('Cannot pass non-string')) {
                    console.log(`[SOUND] Decode error: ${decodeError.message}`);
                }
            }
            
            // Keep only last second of audio to avoid memory issues
            if (this.audioBuffer.length > this.sampleRate * 2) {
                console.log('[SOUND] Trimming audio buffer to prevent overflow');
                this.audioBuffer = this.audioBuffer.slice(-this.sampleRate);
            }
            
        } catch (error) {
            console.error('[SOUND] Error processing audio buffer:', error);
        }
    }

    /**
     * Listen loop for real audio messages
     */
    async listenLoop() {
        console.log('[SOUND] Real audio listening loop started');
        
        // The actual audio processing happens in the recording callbacks
        // This loop just keeps the listening state active
        while (this.isListening) {
            await this.sleep(100);
        }
        
        console.log('[SOUND] Real audio listening loop stopped');
    }

    /**
     * Simulate receiving a message (for testing)
     */
    simulateReceiveMessage(message) {
        if (this.receivedCallback && this.isListening) {
            console.log(`[SOUND] Simulated receive: ${message.type} (ID: ${message.id})`);
            this.receivedCallback(message);
        }
    }

    /**
     * Wait for a specific message type
     */
    async waitForMessage(expectedType, timeout = null) {
        timeout = timeout || this.timeout;
        
        return new Promise((resolve) => {
            const originalCallback = this.receivedCallback;
            let timeoutId;
            
            const messageCallback = (message) => {
                if (message.type === expectedType) {
                    clearTimeout(timeoutId);
                    this.receivedCallback = originalCallback;
                    resolve(message);
                } else if (originalCallback) {
                    originalCallback(message);
                }
            };
            
            this.receivedCallback = messageCallback;
            
            timeoutId = setTimeout(() => {
                this.receivedCallback = originalCallback;
                console.log(`[SOUND] Timeout waiting for ${expectedType}`);
                resolve(null);
            }, timeout);
        });
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if ggwave is available
     */
    static isAvailable() {
        return GGWAVE_AVAILABLE;
    }
}