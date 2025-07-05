# Audio Setup for GibberWallet

## macOS Audio Permissions

When running the offline wallet for the first time, macOS will prompt you to grant microphone access to Terminal (or your terminal app). You must allow this for the audio communication to work.

### Granting Microphone Access

1. When prompted, click "OK" to allow microphone access
2. If you missed the prompt, go to:
   - System Settings → Privacy & Security → Microphone
   - Enable access for Terminal (or iTerm2, VS Code, etc.)

### Troubleshooting

If audio is not working:

1. **Check microphone permissions**: 
   - System Settings → Privacy & Security → Microphone
   - Ensure your terminal app has permission

2. **Check sox installation**:
   ```bash
   which sox
   # Should output: /opt/homebrew/bin/sox or similar
   ```

3. **Test audio separately**:
   ```bash
   node test-audio.js
   ```

4. **Volume issues**:
   - Make sure your system volume is audible
   - The audio uses audible tones (not ultrasonic)

## Running the System

1. **Terminal 1 - Offline Wallet**:
   ```bash
   cd NodePoC
   npm run offline
   ```

2. **Terminal 2 - Online Client**:
   ```bash
   cd NodePoC
   npm run online
   ```

The devices should communicate via sound. You'll hear:
- A "ping" sound when the online client initiates contact
- A "pong" response from the offline wallet
- Transaction data transmitted as audio tones
- Signed transaction response sent back via audio

## Notes

- Keep the devices within hearing distance (1-2 meters works best)
- Minimize background noise for better reliability
- The audio uses FSK modulation and is audible to humans