# GibberWallet Mobile - iOS Offline Wallet

A React Native iOS application that serves as the offline wallet component for the GibberWallet sound-based airgap wallet system. This app enables secure transaction signing using audio transmission instead of QR codes.

## Features

- **Sound-Based Communication**: Uses ggwave library for audio data transmission
- **Secure Storage**: Private keys stored in iOS Keychain with biometric protection
- **Airgap Security**: No network connectivity required for operation
- **Transaction Signing**: Support for ETH and ERC-20 token transactions
- **User-Friendly Interface**: Modern React Native UI with clear transaction approval flow
- **TypeScript**: Full type safety throughout the application

## Architecture

### Core Components

- **OfflineWallet**: Main wallet logic for transaction signing and audio communication
- **GGWaveModule**: Native iOS module for ggwave audio protocol integration
- **SecureStorage**: iOS Keychain integration for secure private key storage
- **MessageProtocol**: EIP-compliant message format for wallet communication
- **CryptoUtils**: Ethereum transaction utilities using ethers.js

### React Native Components

- **WalletSetupScreen**: Private key import/generation and secure storage
- **WalletScreen**: Main interface for audio listening and transaction approval
- **TransactionApproval**: Detailed transaction review and approval interface
- **AudioStatus**: Real-time audio transmission monitoring
- **WalletInfo**: Wallet address and security information display

## Prerequisites

- **iOS Development Environment**: Xcode 14+ with iOS 15+ SDK
- **Node.js**: Version 18+ for React Native development
- **React Native CLI**: For building and running the app
- **CocoaPods**: For iOS dependency management

## Installation

1. **Clone the repository and navigate to mobile app**:
   ```bash
   cd GibberWalletMobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install iOS dependencies**:
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Run on iOS Simulator**:
   ```bash
   npm run ios
   ```

## Project Structure

```
GibberWalletMobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AudioStatus.tsx
│   │   ├── TransactionApproval.tsx
│   │   └── WalletInfo.tsx
│   ├── lib/                 # Core library modules
│   │   ├── CryptoUtils.ts
│   │   ├── MessageProtocol.ts
│   │   ├── OfflineWallet.ts
│   │   └── SecureStorage.ts
│   ├── native/              # Native module interfaces
│   │   └── GGWaveModule.ts
│   ├── screens/             # App screens
│   │   ├── WalletSetupScreen.tsx
│   │   └── WalletScreen.tsx
│   └── types/               # TypeScript definitions
│       └── MessageTypes.ts
├── ios/                     # iOS native code
│   └── GibberWalletMobile/
│       ├── GGWaveModule.h
│       ├── GGWaveModule.m
│       └── GibberWalletMobile-Bridging-Header.h
└── App.tsx                  # Main application component
```

## Usage

### First Time Setup

1. **Launch the app** and you'll see the wallet setup screen
2. **Generate a new wallet** or import an existing private key
3. **Enable biometric authentication** if supported on your device
4. **Save your wallet** securely to the iOS Keychain

### Transaction Signing

1. **Start listening** for audio messages by tapping "Start Listening"
2. **Initiate a transaction** from the web client (GibberWeb)
3. **Review transaction details** when the approval screen appears
4. **Approve or reject** the transaction
5. **Signed transaction** is automatically sent back via audio

### Audio Protocol Flow

1. **Ping/Pong Handshake**: Web client establishes communication
2. **Transaction Request**: Transaction details received via sound
3. **User Approval**: Review and approve/reject transaction
4. **Transaction Signing**: Private key signs the transaction locally
5. **Response Transmission**: Signed transaction sent back via sound
6. **Network Broadcast**: Web client broadcasts to Ethereum network

## Security Features

### Airgap Protection
- **No Network Access**: App operates completely offline
- **Local Signing Only**: Private keys never leave the device
- **Sound-Only Communication**: Limited range prevents remote attacks

### Secure Storage
- **iOS Keychain**: Private keys stored with hardware encryption
- **Biometric Authentication**: Touch/Face ID protection for key access
- **Secure Enclave**: Hardware-backed key protection on supported devices

### Transaction Security
- **Manual Approval**: All transactions require explicit user confirmation
- **Detailed Review**: Complete transaction information displayed
- **Rejection Capability**: Users can reject suspicious transactions

## Development

### Native Module Integration

The app includes a native iOS module (`GGWaveModule`) that bridges ggwave functionality to React Native. The current implementation includes:

- **Audio system initialization** with configurable parameters
- **Real-time audio listening** for incoming messages
- **Audio transmission** of response messages
- **Audio level monitoring** for user feedback
- **Event-driven architecture** for React Native communication

### Adding ggwave Library

To complete the integration, you'll need to:

1. **Download ggwave source** from the official repository
2. **Add ggwave files** to the iOS project in Xcode
3. **Update GGWaveModule.m** to use actual ggwave functions
4. **Configure build settings** for ggwave compilation

### Testing

- **Unit tests** for crypto utilities and message protocol
- **Integration tests** with the web client
- **Audio transmission tests** for reliability
- **Security tests** for key storage and transaction signing

## Configuration

### Audio Settings

The app uses these default audio parameters:
- **Sample Rate**: 48kHz for high-quality transmission
- **Protocol**: AUDIBLE_FAST for faster data transfer
- **Volume**: Level 15 for optimal cross-device transmission
- **Range**: Optimized for 1-2 meter transmission distance

### Security Settings

- **Biometric Authentication**: Enabled by default if available
- **Keychain Access Control**: Requires device passcode or biometrics
- **Private Key Format**: Standard 32-byte Ethereum private keys
- **Address Validation**: Full Ethereum address format validation

## Integration

This mobile app integrates with:

- **GibberWeb**: The web-based hot wallet client
- **Ethereum Networks**: Any EVM-compatible blockchain
- **iOS Keychain**: Secure hardware-backed storage
- **ggwave Protocol**: Cross-platform audio data transmission

## Troubleshooting

### Audio Issues
- **Permissions**: Ensure microphone access is granted
- **Volume**: Check device volume levels for transmission
- **Distance**: Keep devices 1-2 meters apart for optimal transmission
- **Interference**: Minimize background noise during operation

### Security Issues
- **Biometric Failures**: Use device passcode as fallback
- **Keychain Errors**: Check iOS security settings
- **Private Key Issues**: Verify key format and validity

### App Issues
- **Build Errors**: Ensure all dependencies are properly installed
- **Native Module**: Check iOS native module integration
- **TypeScript Errors**: Verify all type definitions are correct

## Future Enhancements

- **Multiple Wallet Support**: Manage multiple private keys
- **Advanced Transaction Types**: Support for complex smart contracts
- **Enhanced Audio Protocols**: Better transmission reliability
- **Hardware Wallet Integration**: Support for external signing devices
- **Multi-Language Support**: Internationalization for global users

## License

This project is part of the GibberWallet system and follows the same licensing terms as the main project.

## Support

For issues and support:
1. Check the troubleshooting section above
2. Review the main GibberWallet documentation
3. Test with the NodePoC implementation first
4. Verify iOS development environment setup