import { ethers } from 'ethers';
import { MessageType, MessageProtocol } from './message-protocol.js';
import { SoundProtocol } from './sound-protocol.js';
import { CryptoUtils } from './crypto-utils.js';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Online client component for hot wallet functionality
 */
export class OnlineClient {
    constructor(rpcUrl, chainId, soundTimeout = 5000, soundRetries = 3) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.chainId = chainId;
        this.sound = new SoundProtocol(soundTimeout, soundRetries);
        
        // Setup readline interface for user input
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.init();
    }

    /**
     * Initialize the client and check connection
     */
    async init() {
        try {
            const network = await this.provider.getNetwork();
            console.log(`[ONLINE] Connected to network (Chain ID: ${network.chainId})`);
            
            const blockNumber = await this.provider.getBlockNumber();
            console.log(`[ONLINE] Latest block: ${blockNumber}`);
        } catch (error) {
            throw new Error(`Failed to connect to RPC: ${error.message}`);
        }
    }

    /**
     * Get the transaction nonce for an address
     */
    async getNonce(address) {
        return await this.provider.getTransactionCount(address);
    }

    /**
     * Get current gas price
     */
    async getGasPrice() {
        const feeData = await this.provider.getFeeData();
        return feeData.gasPrice;
    }

    /**
     * Estimate gas for a transaction
     */
    async estimateGas(transaction) {
        try {
            return await this.provider.estimateGas(transaction);
        } catch (error) {
            console.log(`[ONLINE] Gas estimation failed: ${error.message}`);
            return 21000n; // Default for simple transfers
        }
    }

    /**
     * Send ETH transfer request to offline wallet
     */
    async sendEthTransfer(fromAddress, toAddress, amountEth, gasPrice = null, gasLimit = null) {
        console.log(`[ONLINE] Preparing ETH transfer: ${amountEth} ETH to ${toAddress}`);
        
        // Validate addresses
        if (!CryptoUtils.validateAddress(fromAddress)) {
            console.log(`[ONLINE] Invalid from address: ${fromAddress}`);
            return null;
        }
        
        if (!CryptoUtils.validateAddress(toAddress)) {
            console.log(`[ONLINE] Invalid to address: ${toAddress}`);
            return null;
        }
        
        // Get transaction parameters
        const nonce = await this.getNonce(fromAddress);
        gasPrice = gasPrice || await this.getGasPrice();
        gasLimit = gasLimit || 21000n;
        const valueWei = CryptoUtils.ethToWei(amountEth);
        
        console.log(`[ONLINE] Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);
        
        // Create transaction request
        const txRequest = MessageProtocol.createTxRequest(
            this.chainId, toAddress, valueWei, '0x', nonce, gasPrice, gasLimit
        );
        
        return await this.sendTransactionRequest(txRequest);
    }

    /**
     * Send ERC-20 transfer request to offline wallet
     */
    async sendErc20Transfer(fromAddress, tokenAddress, toAddress, amount, gasPrice = null, gasLimit = null) {
        console.log(`[ONLINE] Preparing ERC-20 transfer: ${amount} tokens to ${toAddress}`);
        
        // Validate addresses
        if (!CryptoUtils.validateAddress(fromAddress)) {
            console.log(`[ONLINE] Invalid from address: ${fromAddress}`);
            return null;
        }
        
        if (!CryptoUtils.validateAddress(tokenAddress)) {
            console.log(`[ONLINE] Invalid token address: ${tokenAddress}`);
            return null;
        }
        
        if (!CryptoUtils.validateAddress(toAddress)) {
            console.log(`[ONLINE] Invalid to address: ${toAddress}`);
            return null;
        }
        
        // Get transaction parameters
        const nonce = await this.getNonce(fromAddress);
        gasPrice = gasPrice || await this.getGasPrice();
        gasLimit = gasLimit || 100000n; // Higher limit for ERC-20
        
        // Create ERC-20 transfer data
        const iface = new ethers.Interface([
            'function transfer(address to, uint256 amount) returns (bool)'
        ]);
        const data = iface.encodeFunctionData('transfer', [toAddress, amount]);
        
        console.log(`[ONLINE] Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);
        
        // Create transaction request
        const txRequest = MessageProtocol.createTxRequest(
            this.chainId, tokenAddress, 0, data, nonce, gasPrice, gasLimit
        );
        
        return await this.sendTransactionRequest(txRequest);
    }

    /**
     * Send transaction request and handle response
     */
    async sendTransactionRequest(txRequest) {
        try {
            // Start listening for responses
            this.sound.startListening((message) => this.handleResponse(message));
            
            // Send ping to establish connection
            console.log('[ONLINE] Sending ping to offline wallet...');
            const ping = MessageProtocol.createPing();
            
            if (!await this.sound.sendMessage(ping)) {
                console.log('[ONLINE] Failed to send ping');
                return null;
            }
            
            // Wait for pong
            console.log('[ONLINE] Waiting for pong...');
            const pong = await this.sound.waitForMessage(MessageType.PONG, 10000);
            
            if (!pong) {
                console.log('[ONLINE] No pong received, offline wallet may not be listening');
                return null;
            }
            
            console.log('[ONLINE] Pong received, sending transaction request...');
            
            // Send transaction request
            if (!await this.sound.sendMessage(txRequest)) {
                console.log('[ONLINE] Failed to send transaction request');
                return null;
            }
            
            // Wait for transaction response
            console.log('[ONLINE] Waiting for signed transaction...');
            const response = await this.sound.waitForMessage(MessageType.TX_RESPONSE, 30000);
            
            if (!response) {
                console.log('[ONLINE] No transaction response received');
                return null;
            }
            
            // Extract signed transaction
            const signedTxData = response.payload.signedTransaction;
            const signedTxRaw = signedTxData.raw;
            
            if (!signedTxRaw) {
                console.log('[ONLINE] No signed transaction in response');
                return null;
            }
            
            // Broadcast transaction
            console.log('[ONLINE] Broadcasting transaction...');
            const txHash = await this.broadcastTransaction(signedTxRaw);
            
            if (txHash) {
                console.log(`[ONLINE] Transaction broadcasted successfully: ${txHash}`);
                return txHash;
            } else {
                console.log('[ONLINE] Failed to broadcast transaction');
                return null;
            }
            
        } catch (error) {
            console.log(`[ONLINE] Error in transaction flow:`, error.message);
            return null;
        } finally {
            this.sound.stopListening();
        }
    }

    /**
     * Handle responses from offline wallet
     */
    handleResponse(message) {
        if (message.type === MessageType.ERROR) {
            const errorMsg = message.payload.message || 'Unknown error';
            console.log(`[ONLINE] Error from offline wallet: ${errorMsg}`);
        }
    }

    /**
     * Broadcast signed transaction to the network
     */
    async broadcastTransaction(signedTxRaw) {
        try {
            const txResponse = await this.provider.broadcastTransaction(signedTxRaw);
            return txResponse.hash;
        } catch (error) {
            console.log(`[ONLINE] Broadcast failed:`, error.message);
            return null;
        }
    }

    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(txHash) {
        try {
            return await this.provider.getTransactionReceipt(txHash);
        } catch (error) {
            console.log(`[ONLINE] Failed to get receipt:`, error.message);
            return null;
        }
    }

    /**
     * Wait for transaction confirmation
     */
    async waitForConfirmation(txHash, timeout = 300000) {
        console.log(`[ONLINE] Waiting for confirmation of ${txHash}...`);
        
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const receipt = await this.getTransactionReceipt(txHash);
                if (receipt) {
                    if (receipt.status === 1) {
                        console.log(`[ONLINE] Transaction confirmed in block ${receipt.blockNumber}`);
                        return true;
                    } else {
                        console.log(`[ONLINE] Transaction failed`);
                        return false;
                    }
                }
            } catch (error) {
                // Continue waiting
            }
            
            await this.sleep(5000);
        }
        
        console.log(`[ONLINE] Transaction confirmation timeout`);
        return false;
    }

    /**
     * Interactive menu for the online client
     */
    async runInteractiveMenu() {
        while (true) {
            console.log('\n[ONLINE] Choose an option:');
            console.log('1. Send ETH transfer');
            console.log('2. Send ERC-20 transfer');
            console.log('3. Check transaction status');
            console.log('4. Exit');
            
            const choice = await this.askQuestion('Enter choice (1-4): ');
            
            switch (choice.trim()) {
                case '1':
                    await this.handleEthTransfer();
                    break;
                case '2':
                    await this.handleErc20Transfer();
                    break;
                case '3':
                    await this.handleTransactionStatus();
                    break;
                case '4':
                    console.log('[ONLINE] Exiting...');
                    this.rl.close();
                    return;
                default:
                    console.log('Invalid choice');
            }
        }
    }

    /**
     * Handle ETH transfer input
     */
    async handleEthTransfer() {
        try {
            const fromAddr = await this.askQuestion('From address: ');
            const toAddr = await this.askQuestion('To address: ');
            const amount = await this.askQuestion('Amount in ETH: ');
            
            const txHash = await this.sendEthTransfer(fromAddr.trim(), toAddr.trim(), parseFloat(amount));
            if (txHash) {
                await this.waitForConfirmation(txHash);
            }
        } catch (error) {
            console.log('[ONLINE] Error in ETH transfer:', error.message);
        }
    }

    /**
     * Handle ERC-20 transfer input
     */
    async handleErc20Transfer() {
        try {
            const fromAddr = await this.askQuestion('From address: ');
            const tokenAddr = await this.askQuestion('Token contract address: ');
            const toAddr = await this.askQuestion('To address: ');
            const amount = await this.askQuestion('Amount (in token units): ');
            
            const txHash = await this.sendErc20Transfer(
                fromAddr.trim(), 
                tokenAddr.trim(), 
                toAddr.trim(), 
                BigInt(amount)
            );
            if (txHash) {
                await this.waitForConfirmation(txHash);
            }
        } catch (error) {
            console.log('[ONLINE] Error in ERC-20 transfer:', error.message);
        }
    }

    /**
     * Handle transaction status check
     */
    async handleTransactionStatus() {
        try {
            const txHash = await this.askQuestion('Transaction hash: ');
            const receipt = await this.getTransactionReceipt(txHash.trim());
            
            if (receipt) {
                console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
                console.log(`Block: ${receipt.blockNumber}`);
                console.log(`Gas Used: ${receipt.gasUsed}`);
            } else {
                console.log('Transaction not found or pending');
            }
        } catch (error) {
            console.log('[ONLINE] Error checking transaction:', error.message);
        }
    }

    /**
     * Ask a question using readline
     */
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main function to run the online client
async function main() {
    const rpcUrl = process.env.JSON_RPC_URL;
    if (!rpcUrl) {
        console.error('Error: JSON_RPC_URL not found in environment variables');
        process.exit(1);
    }
    
    const chainId = parseInt(process.env.CHAIN_ID || '1');
    const soundTimeout = parseInt(process.env.SOUND_TIMEOUT || '5000');
    const soundRetries = parseInt(process.env.SOUND_RETRIES || '3');
    
    try {
        // Create online client
        const client = new OnlineClient(rpcUrl, chainId, soundTimeout, soundRetries);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n[ONLINE] Received SIGINT, shutting down gracefully...');
            client.rl.close();
            process.exit(0);
        });
        
        // Run interactive menu
        await client.runInteractiveMenu();
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}