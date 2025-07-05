# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

- **Node.js Version**: Use Node.js 18+ for ES module support
- **Dependencies**: Install via `npm install` in NodePoC directory (includes ggwave for audio transmission)
- **Operating System**: We are running on mac

## Project Architecture

This is a sound-based airgap wallet implementation that uses audio transmission instead of QR codes for secure offline transaction signing. The project implements an EIP (Ethereum Improvement Proposal) specification for sound-based wallet communication.

### Core Components

**NodePoC/** contains the Node.js proof-of-concept implementation:

1. **Protocol Layer**:
   - `src/message-protocol.js`: EIP-compliant message format using ES modules and modern JavaScript
   - `src/sound-protocol.js`: Audio transmission using ggwave library with async/await API

2. **Wallet Components**:
   - `src/offline-wallet.js`: Airgap wallet with interactive CLI using readline
   - `src/online-client.js`: Hot wallet using ethers.js for Ethereum interaction
   - `src/crypto-utils.js`: Ethereum utilities with ethers.js v6

3. **Demo & Testing**:
   - `examples/demo.js`: Comprehensive demo with multiple testing modes

### Key Architecture Patterns

- **Airgap Security**: Private keys never leave the offline device
- **Sound Communication**: Uses ggwave for FSK-based audio data transmission
- **EIP Compliance**: Implements version 1.0 of the sound-based wallet communication standard
- **Environment Configuration**: All network and wallet settings via `.env` files

## Common Commands

### Setup and Configuration
```bash
# Navigate to Node.js PoC
cd NodePoC

# Install dependencies
npm install

# Create configuration (first time only)
cp .env.example .env
# Edit .env with your RPC URL, private key, and chain ID
```

### Running the System

```bash
# Run complete demo (simulated mode)
npm run demo

# Run offline wallet component (airgap device)
npm run offline

# Run online client component (connected device)
npm run online
```

### Testing Transaction Types

The system supports two transaction types:
- **ETH Transfers**: Native Ethereum transfers
- **ERC-20 Transfers**: Token transfers using standard ERC-20 ABI

Both require the complete ping/pong handshake → transaction request → user confirmation → signed response → broadcast flow.

## Protocol Flow

1. **Handshake**: Online client sends ping via sound, offline wallet responds with pong
2. **Transaction Request**: Online client sends tx_request with transaction details
3. **User Confirmation**: Offline wallet displays transaction and requires user approval
4. **Signing**: Offline wallet signs transaction with private key
5. **Response**: Offline wallet sends tx_response with signed transaction via sound
6. **Broadcast**: Online client broadcasts signed transaction to Ethereum network

## Configuration Requirements

Essential `.env` variables:
- `JSON_RPC_URL`: Ethereum RPC endpoint
- `CHAIN_ID`: Network chain ID (1=mainnet, 11155111=sepolia)
- `PRIVATE_KEY`: Wallet private key for signing
- `ERC20_CONTRACT_ADDRESS`: Token contract for ERC-20 transfers (optional)

## EIP Specification

The implementation follows the draft EIP in `EIP-Draft-Sound-Based-Offline-Wallet-Communication.markdown` which defines:
- Message format with version field for compatibility
- Audio encoding using ggwave library
- Security considerations for short-range communication
- Error handling and timeout mechanisms