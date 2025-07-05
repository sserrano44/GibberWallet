# Sound-Based Airgap Wallet - Node.js Proof of Concept

This is a Node.js proof of concept implementation of a sound-based airgap wallet that uses audio transmission instead of QR codes for secure offline transaction signing.

## Features

- **Sound-based Communication**: Uses ggwave library for audio data transmission
- **EIP-compliant Protocol**: Implements the sound-based wallet communication standard
- **ETH and ERC-20 Support**: Handles both native ETH transfers and ERC-20 token transfers
- **Airgap Security**: Private keys never leave the offline device
- **User Confirmation**: All transactions require explicit user approval
- **Modern JavaScript**: Built with ES modules and async/await
- **Interactive Demo**: Multiple demo modes for testing

## Architecture

The system consists of two main components:

1. **Offline Wallet** (`src/offline-wallet.js`): Holds private keys, listens for transaction requests, signs transactions
2. **Online Client** (`src/online-client.js`): Connects to Ethereum network, creates transactions, broadcasts signed transactions

## Installation

1. Navigate to the NodePoC directory:
   ```bash
   cd NodePoC
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create configuration file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration:
   ```env
   JSON_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   CHAIN_ID=11155111
   PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ERC20_CONTRACT_ADDRESS=0xA0b86a33E6411a3cf06Da4BD3E3a8d23B99d863a
   ```

## Usage

### Quick Demo

Run the demo script to see the protocol in action:

```bash
npm run demo
# or
node examples/demo.js
```

Choose option 1 for a simulated demo that shows the complete flow without real sound transmission.

### Manual Operation

#### Terminal 1 - Offline Wallet (Airgap Device)
```bash
npm run offline
# or
node src/offline-wallet.js
```

This starts the offline wallet in listening mode. It will:
- Listen for sound-based transaction requests
- Display transaction details for user confirmation
- Sign approved transactions
- Send signed transactions back via sound

#### Terminal 2 - Online Client (Hot Wallet)
```bash
npm run online
# or
node src/online-client.js
```

This starts the online client interface. You can:
- Send ETH transfers
- Send ERC-20 token transfers
- Check transaction status
- Monitor confirmations

### Interactive Flow

1. **Start offline wallet** on the airgap device
2. **Start online client** on the connected device
3. **Choose transaction type** (ETH or ERC-20)
4. **Enter transaction details** (recipient, amount, etc.)
5. **Audio handshake** occurs automatically (ping/pong)
6. **Transaction request** is sent via sound
7. **User confirms** transaction on offline wallet
8. **Signed transaction** is sent back via sound
9. **Transaction is broadcasted** to the network

## Protocol Details

The implementation follows the EIP specification for sound-based wallet communication:

### Message Types
- `ping/pong`: Connection establishment
- `tx_request`: Transaction signing request
- `tx_response`: Signed transaction response
- `ack`: Message acknowledgment
- `error`: Error conditions

### Message Format
```javascript
{
  "version": "1.0",
  "type": "tx_request",
  "payload": {
    "transaction": {
      "chainId": 11155111,
      "nonce": "0x0",
      "gasPrice": "0x4a817c800",
      "gasLimit": "0x5208",
      "to": "0x742d35Cc6634C0532925a3b8D4b33e8b71c7da2d",
      "value": "0x38d7ea4c68000",
      "data": "0x"
    }
  },
  "id": "unique-message-id"
}
```

## Core Modules

### `src/message-protocol.js`
- Implements EIP message format with versioning
- Provides factory methods for all message types
- Handles JSON serialization/deserialization

### `src/sound-protocol.js`
- Audio transmission using ggwave-js library
- Fallback simulation mode when ggwave-js is unavailable
- Async/await based API with timeout handling

### `src/crypto-utils.js`
- Ethereum transaction utilities using ethers.js
- Support for both ETH and ERC-20 transfers
- Transaction signing and validation

### `src/offline-wallet.js`
- Airgap wallet component
- User confirmation interface
- Transaction processing and signing

### `src/online-client.js`
- Hot wallet component
- Ethereum network interaction
- Transaction broadcasting

## Dependencies

- **ethers**: ^6.13.0 - Ethereum library for web3 operations
- **dotenv**: ^16.4.5 - Environment variable management
- **ggwave**: ^0.4.0 - Audio data transmission library
- **uuid**: ^10.0.0 - UUID generation for message IDs
- **readline**: ^1.3.0 - Interactive command line interface

## Security Features

- **Airgap Isolation**: Private keys never leave the offline device
- **User Confirmation**: All transactions require explicit approval
- **Short-range Audio**: Sound signals work only at close proximity
- **Version Validation**: Protocol version checking prevents attacks
- **Data Integrity**: Built-in error correction via ggwave

## Testing

The proof of concept includes:

1. **Simulated Demo**: Test the protocol flow without real sound
2. **Interactive Mode**: Test with actual components
3. **Protocol Testing**: Test message and sound protocol modules
4. **Both ETH and ERC-20**: Support for native and token transfers

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `JSON_RPC_URL` | Ethereum RPC endpoint | Required |
| `CHAIN_ID` | Network chain ID | 11155111 (Sepolia) |
| `PRIVATE_KEY` | Wallet private key | Required |
| `ERC20_CONTRACT_ADDRESS` | Token contract address | Optional |
| `GAS_PRICE` | Default gas price | 20000000000 |
| `GAS_LIMIT_ETH` | Gas limit for ETH transfers | 21000 |
| `GAS_LIMIT_ERC20` | Gas limit for ERC-20 transfers | 100000 |
| `SOUND_TIMEOUT` | Audio timeout in milliseconds | 5000 |
| `SOUND_RETRIES` | Number of retry attempts | 3 |

## Network Support

The implementation supports any Ethereum-compatible network:

- **Mainnet**: `CHAIN_ID=1`
- **Sepolia Testnet**: `CHAIN_ID=11155111`
- **Polygon**: `CHAIN_ID=137`
- **Arbitrum**: `CHAIN_ID=42161`
- **Optimism**: `CHAIN_ID=10`

## Requirements

- **Node.js**: >=18.0.0
- **Audio Hardware**: Speakers and microphones on both devices
- **Environment**: Works best in quiet environments
- **Proximity**: Devices should be within 1-2 meters

## Script Commands

```bash
npm start          # Run demo script
npm run offline    # Start offline wallet
npm run online     # Start online client
npm run demo       # Run interactive demo
```

## File Structure

```
NodePoC/
├── src/
│   ├── message-protocol.js    # EIP message format implementation
│   ├── sound-protocol.js      # Audio transmission using ggwave-js
│   ├── crypto-utils.js        # Ethereum cryptography utilities
│   ├── offline-wallet.js      # Airgap wallet component
│   └── online-client.js       # Hot wallet component
├── examples/
│   └── demo.js               # Interactive demonstration
├── package.json              # Node.js package configuration
├── .env.example             # Configuration template
└── README.md                # This file
```

## Future Enhancements

- **Hardware Integration**: Support for dedicated hardware wallets
- **Multi-signature**: Support for multi-sig transactions
- **DeFi Integration**: Support for DeFi protocol interactions
- **Web Interface**: Browser-based implementation
- **QR Fallback**: Automatic fallback to QR codes when sound fails

## Contributing

This is a proof of concept implementation. For production use, additional security audits and testing would be required.

## License

MIT License - See LICENSE file for details