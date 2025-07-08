/**
 * Real-time audio monitoring for debugging
 * Shows live audio levels and decode attempts
 */

import record from 'node-record-lpcm16';

// Initialize ggwave
let ggwave = null;
let ggwaveInstance = null;

async function initGgwave() {
    try {
        const ggwaveFactory = (await import('ggwave')).default;
        ggwave = await ggwaveFactory();
        
        // Try to get default parameters
        let parameters;
        try {
            parameters = ggwave.getDefaultParameters();
            console.log('✅ Got default parameters');
        } catch (paramError) {
            console.log('⚠️  Failed to get default parameters:', paramError.message);
            parameters = null;
        }
        
        // Try to initialize with parameters
        try {
            ggwaveInstance = ggwave.init(parameters);
            console.log(`✅ ggwave.init() returned: ${ggwaveInstance}`);
        } catch (initError) {
            console.log('⚠️  ggwave.init() failed:', initError.message);
            // Try alternative initialization without parameters
            try {
                ggwaveInstance = ggwave.init();
                console.log(`✅ ggwave.init() (no params) returned: ${ggwaveInstance}`);
            } catch (altError) {
                console.log('❌ Alternative init failed:', altError.message);
                return false;
            }
        }
        
        const success = (ggwaveInstance !== null && ggwaveInstance !== undefined);
        console.log(`✅ ggwave ready, instance: ${success ? 'created' : 'failed'} (ID: ${ggwaveInstance})`);
        return success;
    } catch (error) {
        console.error('❌ ggwave failed:', error.message);
        return false;
    }
}

class LiveMonitor {
    constructor() {
        this.sampleRate = 48000;
        this.audioBuffer = [];
        this.isRunning = false;
    }

    start() {
        console.log('🎤 Live Audio Monitor Started');
        console.log('📊 Audio Level | Buffer Size | Decode Status');
        console.log('─'.repeat(50));

        this.isRunning = true;

        try {
            this.recording = record.record({
                sampleRate: this.sampleRate,
                channels: 1,
                audioType: 'raw',
                recorder: 'sox',
                device: null,
                verbose: false
            });

            this.recording.stream().on('data', (data) => {
                if (this.isRunning) {
                    this.processAudio(data);
                }
            });

        } catch (error) {
            console.error('Recording failed:', error);
        }
    }

    processAudio(data) {
        // Convert to float array
        const int16Array = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
        const float32Array = new Float32Array(int16Array.length);

        let maxLevel = 0;
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
            maxLevel = Math.max(maxLevel, Math.abs(float32Array[i]));
        }

        this.audioBuffer.push(...float32Array);

        // Create audio level bar
        const levelPercent = maxLevel * 100;
        const barLength = Math.min(20, Math.floor(levelPercent / 2.5));
        const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
        
        // Show live status
        const statusIcon = levelPercent > 5 ? '🔊' : (levelPercent > 1 ? '🔉' : '🔈');
        process.stdout.write(`\r${statusIcon} ${bar} ${levelPercent.toFixed(1)}% | ${this.audioBuffer.length.toString().padStart(6)} samples | `);

        // Try decode every 0.25 seconds
        if (this.audioBuffer.length >= this.sampleRate / 4) {
            this.tryDecode();
        }

        // Prevent overflow
        if (this.audioBuffer.length > this.sampleRate * 1000) {
            this.audioBuffer = this.audioBuffer.slice(-this.sampleRate);
            process.stdout.write('TRIMMED');
        }
    }

    tryDecode() {
        if (ggwaveInstance === null || ggwaveInstance === undefined) {
            process.stdout.write('NO_GGWAVE');
            return;
        }
        
        if (!ggwave) {
            process.stdout.write('NO_GGWAVE_LIB');
            return;
        }

        const audioData = new Float32Array(this.audioBuffer);

        try {
            // ggwave.decode automatically detects the protocol from the audio
            const decoded = ggwave.decode(ggwaveInstance, audioData);
            
            if (decoded && decoded.length > 0) {
                try {
                    const message = new TextDecoder().decode(decoded);
                    process.stdout.write(`\n🎉 DECODED: ${message}\n`);
                    console.log('─'.repeat(50));
                    this.audioBuffer = []; // Clear on success
                    return;
                } catch (e) {
                    process.stdout.write(`DATA(${decoded.length}bytes)`);
                }
            } else {
                // Show we're actively trying to decode
                process.stdout.write('LISTENING');
            }
        } catch (error) {
            if (!error.message.includes('Cannot pass non-string')) {
                process.stdout.write(`ERR:${error.message.substring(0,10)}`);
            } else {
                process.stdout.write('SILENCE');
            }
        }
    }

    stop() {
        this.isRunning = false;
        if (this.recording) {
            this.recording.stop();
        }
        console.log('\n\n🛑 Monitor stopped');
    }
}

async function main() {
    console.log('🎯 LIVE AUDIO MONITOR');
    console.log('Press Ctrl+C to stop\n');

    if (!(await initGgwave())) {
        return;
    }

    const monitor = new LiveMonitor();
    monitor.start();

    process.on('SIGINT', () => {
        monitor.stop();
        process.exit(0);
    });
}

main().catch(console.error);