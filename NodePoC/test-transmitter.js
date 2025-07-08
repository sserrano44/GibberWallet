/**
 * Test transmitter to send ggwave audio for testing debug-live-monitor.js
 */

import Speaker from 'speaker';

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

async function playAudio(waveform) {
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
                sampleRate: 48000     // Same as ggwave default
            });
            
            // Handle speaker events
            speaker.on('error', (err) => {
                console.error('Speaker error:', err);
                reject(err);
            });
            
            speaker.on('close', () => {
                console.log('🔊 Audio transmission completed');
                resolve();
            });
            
            // Convert Int16Array to Buffer and write to speaker
            const buffer = Buffer.from(int16Buffer.buffer);
            speaker.write(buffer);
            speaker.end();
            
        } catch (error) {
            console.error('Error playing audio:', error);
            reject(error);
        }
    });
}

async function sendTestMessage(message) {
    if (ggwaveInstance === null || ggwaveInstance === undefined) {
        console.log('❌ ggwave not initialized');
        return false;
    }
    
    try {
        console.log(`📤 Sending test message: "${message}"`);
        
        // Encode message to sound using ggwave
        // Using AUDIBLE_FAST to match GibberWeb
        const protocol = ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST;
        
        const waveform = ggwave.encode(
            ggwaveInstance, 
            message, 
            protocol, 
            15 // volume level
        );
        
        console.log(`🎵 Encoded ${waveform.length} samples to audio`);
        
        // Play the waveform through speakers
        await playAudio(waveform);
        
        return true;
        
    } catch (error) {
        console.log(`❌ Error sending message:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🎯 GGWAVE TEST TRANSMITTER');
    console.log('This will send test messages for debug-live-monitor.js to detect\n');
    
    if (!(await initGgwave())) {
        console.log('❌ Failed to initialize ggwave');
        return;
    }
    
    console.log('🚀 Starting transmission test...\n');
    
    // Send a few test messages with delays
    const testMessages = [
        'Hello World!',
        'Test message 1',
        'This is a test transmission',
        'Final test message'
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
        const message = testMessages[i];
        console.log(`\n--- Test ${i + 1}/${testMessages.length} ---`);
        
        await sendTestMessage(message);
        
        // Wait between messages
        if (i < testMessages.length - 1) {
            console.log('⏳ Waiting 3 seconds before next message...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('\n✅ All test messages sent!');
    console.log('Check your debug-live-monitor.js output for decoded messages.');
}

main().catch(console.error);