
/**
 * Simple microphone test to verify audio input is working
 */

import record from 'node-record-lpcm16';

console.log('🎤 MICROPHONE TEST');
console.log('Make some noise or play sounds to test microphone input\n');

const recording = record.record({
    sampleRate: 48000,
    channels: 1,
    audioType: 'raw',
    recorder: 'sox',
    device: null,
    verbose: false
});

let sampleCount = 0;
let maxLevel = 0;

recording.stream().on('data', (data) => {
    // Convert buffer to Int16Array
    const int16Array = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    
    // Calculate audio level
    let currentMax = 0;
    for (let i = 0; i < int16Array.length; i++) {
        currentMax = Math.max(currentMax, Math.abs(int16Array[i] / 32768.0));
    }
    
    sampleCount += int16Array.length;
    maxLevel = Math.max(maxLevel, currentMax);
    
    // Create audio level bar
    const levelPercent = currentMax * 100;
    const barLength = Math.min(40, Math.floor(levelPercent));
    const bar = '█'.repeat(barLength) + '░'.repeat(40 - barLength);
    
    process.stdout.write(`\r${bar} ${levelPercent.toFixed(1)}% | Max: ${(maxLevel * 100).toFixed(1)}% | Samples: ${sampleCount}`);
});

recording.stream().on('error', (err) => {
    console.error('\n❌ Recording error:', err);
});

console.log('Recording... Press Ctrl+C to stop\n');

process.on('SIGINT', () => {
    recording.stop();
    console.log('\n\n✅ Recording stopped');
    process.exit(0);
});