/**
 * Debug script to dump all microphone data and ggwave decoding attempts
 * This will help diagnose why audio is detected but not decoded
 */

import record from 'node-record-lpcm16';
import fs from 'fs';

// Initialize ggwave
let ggwave, ggwaveInstance;

async function initGgwave() {
    try {
        const ggwaveFactory = (await import('ggwave')).default;
        ggwave = await ggwaveFactory();
        const params = ggwave.getDefaultParameters();
        ggwaveInstance = ggwave.init(params);
        console.log('✅ ggwave initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize ggwave:', error);
        return false;
    }
}

class AudioDebugger {
    constructor() {
        this.sampleRate = 48000;
        this.recording = null;
        this.audioBuffer = [];
        this.rawAudioLog = [];
        this.decodeAttempts = [];
        this.sessionStart = Date.now();
        this.bufferCount = 0;
    }

    startCapture(durationSeconds = 30) {
        console.log(`🎤 Starting ${durationSeconds}s debug capture...`);
        console.log('📊 This will log all audio data and decode attempts');
        console.log('🔊 Play audio from another device now!\n');

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
                this.processAudioChunk(data);
            });

            this.recording.stream().on('error', (err) => {
                console.error('Recording error:', err);
            });

            // Stop after duration
            setTimeout(() => {
                this.stopCapture();
            }, durationSeconds * 1000);

            console.log('🎯 Recording started - play sounds now!');

        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }

    processAudioChunk(data) {
        const timestamp = Date.now() - this.sessionStart;
        this.bufferCount++;

        // Convert buffer to Float32Array
        const int16Array = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
        const float32Array = new Float32Array(int16Array.length);

        let maxLevel = 0;
        let rmsLevel = 0;
        let sum = 0;

        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
            const abs = Math.abs(float32Array[i]);
            maxLevel = Math.max(maxLevel, abs);
            sum += abs * abs;
        }

        rmsLevel = Math.sqrt(sum / float32Array.length);

        // Log raw audio stats
        const audioStats = {
            timestamp,
            bufferCount: this.bufferCount,
            samples: float32Array.length,
            maxLevel: (maxLevel * 100).toFixed(2),
            rmsLevel: (rmsLevel * 100).toFixed(2),
            bufferSize: this.audioBuffer.length
        };

        this.rawAudioLog.push(audioStats);

        // Add to main buffer
        this.audioBuffer.push(...float32Array);

        // Log significant audio activity
        if (maxLevel > 0.01) {
            console.log(`📈 [${(timestamp/1000).toFixed(1)}s] Audio: Max=${audioStats.maxLevel}%, RMS=${audioStats.rmsLevel}%, Samples=${audioStats.samples}, TotalBuffer=${this.audioBuffer.length}`);
        }

        // Try decoding every 0.25 seconds of audio
        if (this.audioBuffer.length >= this.sampleRate / 4) {
            this.attemptDecode(timestamp);
        }

        // Prevent buffer overflow - keep only last 2 seconds
        if (this.audioBuffer.length > this.sampleRate * 2) {
            const removed = this.audioBuffer.length - this.sampleRate;
            this.audioBuffer = this.audioBuffer.slice(-this.sampleRate);
            console.log(`🗑️  Trimmed ${removed} samples from buffer`);
        }
    }

    attemptDecode(timestamp) {
        if (!ggwaveInstance) return;

        const audioData = new Float32Array(this.audioBuffer);
        
        console.log(`🔍 [${(timestamp/1000).toFixed(1)}s] Decode attempt: ${audioData.length} samples`);

        const decodeAttempt = {
            timestamp,
            samples: audioData.length,
            protocols: []
        };

        // Try all available protocols
        const protocols = [
            { id: 0, name: 'AUDIBLE_NORMAL' },
            { id: 1, name: 'AUDIBLE_FAST' },
            { id: 2, name: 'AUDIBLE_FASTEST' },
            { id: 6, name: 'DT_NORMAL' },
            { id: 7, name: 'DT_FAST' },
            { id: 8, name: 'DT_FASTEST' }
        ];

        for (const protocol of protocols) {
            try {
                const decodedData = ggwave.decode(ggwaveInstance, audioData);
                
                const protocolResult = {
                    protocol: protocol.name,
                    protocolId: protocol.id,
                    success: false,
                    dataLength: 0,
                    message: null,
                    error: null
                };

                if (decodedData && decodedData.length > 0) {
                    protocolResult.success = true;
                    protocolResult.dataLength = decodedData.length;
                    
                    try {
                        const messageStr = new TextDecoder().decode(decodedData);
                        protocolResult.message = messageStr;
                        
                        console.log(`🎉 [${(timestamp/1000).toFixed(1)}s] SUCCESS! Protocol ${protocol.name}: "${messageStr}"`);
                        
                        // Clear buffer on successful decode
                        this.audioBuffer = [];
                        
                    } catch (parseError) {
                        protocolResult.error = `Parse error: ${parseError.message}`;
                        console.log(`⚠️  [${(timestamp/1000).toFixed(1)}s] ${protocol.name}: Decoded ${decodedData.length} bytes but failed to parse`);
                    }
                }

                decodeAttempt.protocols.push(protocolResult);

            } catch (decodeError) {
                const protocolResult = {
                    protocol: protocol.name,
                    protocolId: protocol.id,
                    success: false,
                    dataLength: 0,
                    message: null,
                    error: decodeError.message
                };
                
                decodeAttempt.protocols.push(protocolResult);

                // Only log non-standard errors
                if (!decodeError.message.includes('Cannot pass non-string')) {
                    console.log(`❌ [${(timestamp/1000).toFixed(1)}s] ${protocol.name}: ${decodeError.message}`);
                }
            }
        }

        this.decodeAttempts.push(decodeAttempt);
    }

    stopCapture() {
        console.log('\n🛑 Stopping capture...');
        
        if (this.recording) {
            this.recording.stop();
            this.recording = null;
        }

        this.generateReport();
    }

    generateReport() {
        const reportData = {
            sessionInfo: {
                duration: (Date.now() - this.sessionStart) / 1000,
                sampleRate: this.sampleRate,
                totalBuffers: this.bufferCount,
                totalDecodeAttempts: this.decodeAttempts.length
            },
            rawAudioLog: this.rawAudioLog,
            decodeAttempts: this.decodeAttempts,
            summary: this.generateSummary()
        };

        const filename = `audio-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(filename, JSON.stringify(reportData, null, 2));
        
        console.log(`\n📊 CAPTURE COMPLETE`);
        console.log(`📄 Full report saved to: ${filename}`);
        console.log('\n📈 SUMMARY:');
        console.log(this.generateSummary());
    }

    generateSummary() {
        const audioWithSignal = this.rawAudioLog.filter(log => parseFloat(log.maxLevel) > 1.0);
        const successfulDecodes = this.decodeAttempts.filter(attempt => 
            attempt.protocols.some(p => p.success)
        );

        const maxAudioLevel = Math.max(...this.rawAudioLog.map(log => parseFloat(log.maxLevel)));
        const avgAudioLevel = this.rawAudioLog.reduce((sum, log) => sum + parseFloat(log.maxLevel), 0) / this.rawAudioLog.length;

        return {
            duration: `${((Date.now() - this.sessionStart) / 1000).toFixed(1)}s`,
            audioBuffers: this.bufferCount,
            buffersWithSignal: audioWithSignal.length,
            maxAudioLevel: `${maxAudioLevel.toFixed(2)}%`,
            avgAudioLevel: `${avgAudioLevel.toFixed(2)}%`,
            decodeAttempts: this.decodeAttempts.length,
            successfulDecodes: successfulDecodes.length,
            protocols: this.getProtocolStats()
        };
    }

    getProtocolStats() {
        const stats = {};
        
        for (const attempt of this.decodeAttempts) {
            for (const protocol of attempt.protocols) {
                if (!stats[protocol.protocol]) {
                    stats[protocol.protocol] = { attempts: 0, successes: 0 };
                }
                stats[protocol.protocol].attempts++;
                if (protocol.success) {
                    stats[protocol.protocol].successes++;
                }
            }
        }
        
        return stats;
    }
}

async function main() {
    console.log('🔍 GGWAVE MICROPHONE DEBUG TOOL\n');
    console.log('This tool will:');
    console.log('- Capture all microphone input');
    console.log('- Log audio levels and buffer states');
    console.log('- Attempt decoding with all ggwave protocols');
    console.log('- Generate detailed debug report\n');

    if (!(await initGgwave())) {
        return;
    }

    const debugger = new AudioDebugger();
    
    // Get duration from command line or default to 30s
    const duration = process.argv[2] ? parseInt(process.argv[2]) : 30;
    
    console.log(`⏱️  Capture duration: ${duration} seconds`);
    console.log('📢 Start playing audio from the other device NOW!\n');
    
    debugger.startCapture(duration);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n⚠️  Interrupted by user');
        debugger.stopCapture();
        process.exit(0);
    });
}

main().catch(console.error);