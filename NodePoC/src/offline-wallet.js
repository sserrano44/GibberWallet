import { MessageType, MessageProtocol } from './message-protocol.js';
import { SoundProtocol } from './sound-protocol.js';
import { CryptoUtils } from './crypto-utils.js';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Offline wallet component for airgap transaction signing
 */
export class OfflineWallet {
    constructor(privateKey, soundTimeout = 5000, soundRetries = 3) {
        this.crypto = new CryptoUtils(privateKey);
        this.sound = new SoundProtocol(soundTimeout, soundRetries);
        this.isRunning = false;
        
        // Setup readline interface for user input
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log(`[OFFLINE] Wallet ready: ${this.crypto.getAddress()}`);
    }

    /**
     * Start the offline wallet in listening mode
     */
    async start() {
        console.log('[OFFLINE] Starting...');
        this.isRunning = true;
        
        // Start listening for sound messages
        await this.sound.startListening((message) => this.handleMessage(message));
        
        console.log('[OFFLINE] Listening for sound messages (Press Ctrl+C to stop)');
        
        // Keep the process running
        try {
            while (this.isRunning) {
                await this.sleep(1000);
            }
        } catch (error) {
            this.stop();
        }
    }

    /**
     * Stop the offline wallet
     */
    stop() {
        this.isRunning = false;
        this.sound.stopListening();
        this.rl.close();
        console.log('[OFFLINE] Stopped');
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(message) {
        console.log(`[OFFLINE] Received: ${message.type}`);
        
        // Validate protocol version
        if (!MessageProtocol.validateVersion(message)) {
            const errorMsg = MessageProtocol.createError(
                `Unsupported protocol version: ${message.version}`,
                message.id
            );
            await this.sound.sendMessage(errorMsg);
            return;
        }
        
        // Handle different message types
        switch (message.type) {
            case MessageType.CONNECT:
                await this.handleConnect(message);
                break;
            case MessageType.TX_REQUEST:
                await this.handleTransactionRequest(message);
                break;
            default:
                console.log(`[OFFLINE] Unknown message type: ${message.type}`);
        }
    }

    /**
     * Handle connect messages
     */
    async handleConnect(message) {
        console.log('[OFFLINE] Sending wallet address');
        const address = this.crypto.getAddress();
        const connectResponse = MessageProtocol.createConnectResponse(address, message.id);
        await this.sound.sendMessage(connectResponse);
    }

    /**
     * Handle transaction signing requests
     */
    async handleTransactionRequest(message) {
        try {
            const txData = message.payload.transaction;
            
            // Convert hex strings to numbers
            const chainId = CryptoUtils.parseHexToNumber(txData.chainId);
            const nonce = CryptoUtils.parseHexToNumber(txData.nonce);
            const gasPrice = CryptoUtils.parseHexToNumber(txData.gasPrice);
            const gasLimit = CryptoUtils.parseHexToNumber(txData.gasLimit);
            const to = txData.to;
            const value = CryptoUtils.parseHexToNumber(txData.value);
            const data = txData.data;
            
            // Create transaction object
            let transaction;
            let txType;
            
            if (data && data !== '0x') {
                // ERC-20 or contract interaction
                transaction = {
                    to: to,
                    value: value,
                    gasLimit: gasLimit,
                    gasPrice: gasPrice,
                    nonce: nonce,
                    chainId: chainId,
                    data: data,
                    type: 0
                };
                txType = 'ERC-20/Contract';
            } else {
                // ETH transfer
                transaction = this.crypto.createEthTransaction(
                    to, value, nonce, gasPrice, gasLimit, chainId
                );
                txType = 'ETH Transfer';
            }
            
            // Display transaction for user confirmation
            console.log(`\n[OFFLINE] ${txType} Transaction Request:`);
            console.log(CryptoUtils.formatTransactionForDisplay(transaction));
            console.log();
            
            // Ask for user confirmation
            const confirmed = await this.getUserConfirmation();
            
            if (confirmed) {
                // Sign the transaction
                const signedTx = await this.crypto.signTransaction(transaction);
                
                // Send response
                const response = MessageProtocol.createTxResponse(
                    signedTx.raw,
                    signedTx.hash
                );
                
                console.log(`[OFFLINE] Transaction signed: ${signedTx.hash}`);
                await this.sound.sendMessage(response);
            } else {
                // Send error response
                const errorMsg = MessageProtocol.createError(
                    'Transaction rejected by user',
                    message.id
                );
                await this.sound.sendMessage(errorMsg);
            }
            
        } catch (error) {
            console.log(`[OFFLINE] Transaction error: ${error.message}`);
            const errorMsg = MessageProtocol.createError(
                `Transaction processing failed: ${error.message}`,
                message.id
            );
            await this.sound.sendMessage(errorMsg);
        }
    }

    /**
     * Get user confirmation for transaction signing
     */
    async getUserConfirmation() {
        return new Promise((resolve) => {
            const askConfirmation = () => {
                this.rl.question('[OFFLINE] Sign this transaction? (y/n): ', (answer) => {
                    const response = answer.toLowerCase().trim();
                    if (response === 'y' || response === 'yes') {
                        resolve(true);
                    } else if (response === 'n' || response === 'no') {
                        resolve(false);
                    } else {
                        console.log("Please enter 'y' or 'n'");
                        askConfirmation();
                    }
                });
            };
            askConfirmation();
        });
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main function to run the offline wallet
async function main() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        console.error('Error: PRIVATE_KEY not found in environment variables');
        console.error('Please create a .env file based on .env.example');
        process.exit(1);
    }
    
    // Validate private key
    if (!CryptoUtils.validatePrivateKey(privateKey)) {
        console.error('Error: Invalid private key format');
        process.exit(1);
    }
    
    // Get sound configuration
    const soundTimeout = parseInt(process.env.SOUND_TIMEOUT || '5000');
    const soundRetries = parseInt(process.env.SOUND_RETRIES || '3');
    
    // Create and start offline wallet
    const wallet = new OfflineWallet(privateKey, soundTimeout, soundRetries);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n[OFFLINE] Received SIGINT, shutting down gracefully...');
        wallet.stop();
        process.exit(0);
    });
    
    await wallet.start();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}