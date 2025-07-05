#!/usr/bin/env node

/**
 * Demo script for the sound-based airgap wallet proof of concept.
 * This script demonstrates the complete flow of the protocol.
 */

import { MessageType, MessageProtocol } from '../src/message-protocol.js';
import { SoundProtocol } from '../src/sound-protocol.js';
import { CryptoUtils } from '../src/crypto-utils.js';
import { OfflineWallet } from '../src/offline-wallet.js';
import { OnlineClient } from '../src/online-client.js';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class Demo {
    constructor() {
        // Get configuration
        this.privateKey = process.env.PRIVATE_KEY;
        this.rpcUrl = process.env.JSON_RPC_URL;
        this.chainId = parseInt(process.env.CHAIN_ID || '11155111');
        this.erc20Address = process.env.ERC20_CONTRACT_ADDRESS;
        
        // Validate configuration
        if (!this.privateKey) {
            throw new Error('PRIVATE_KEY not found in environment');
        }
        if (!this.rpcUrl) {
            throw new Error('JSON_RPC_URL not found in environment');
        }
        
        // Create crypto utils to get address
        this.crypto = new CryptoUtils(this.privateKey);
        this.walletAddress = this.crypto.getAddress();
        
        // Setup readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log('='.repeat(60));
        console.log('SOUND-BASED AIRGAP WALLET DEMO');
        console.log('='.repeat(60));
        console.log(`Wallet Address: ${this.walletAddress}`);
        console.log(`Chain ID: ${this.chainId}`);
        console.log(`RPC URL: ${this.rpcUrl}`);
        console.log('='.repeat(60));
    }

    /**
     * Run a simulated demo without real sound transmission
     */
    async runSimulatedDemo() {
        console.log('\n[DEMO] Starting simulated demo...');
        console.log('[DEMO] This demo simulates the sound protocol without actual audio');
        
        // Demo scenarios
        const scenarios = [
            {
                name: 'ETH Transfer',
                type: 'eth',
                to: '0x742d35Cc6634C0532925a3b8D4b33e8b71c7da2d',
                amount: 0.001
            },
            {
                name: 'ERC-20 Transfer',
                type: 'erc20',
                token: this.erc20Address || '0xA0b86a33E6411a3cf06Da4BD3E3a8d23B99d863a',
                to: '0x742d35Cc6634C0532925a3b8D4b33e8b71c7da2d',
                amount: 1000n
            }
        ];
        
        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];
            console.log(`\n[DEMO] Scenario ${i + 1}: ${scenario.name}`);
            console.log('-'.repeat(40));
            
            await this.simulateTransactionFlow(scenario);
            
            if (i < scenarios.length - 1) {
                await this.askQuestion('\nPress Enter to continue to next scenario...');
            }
        }
        
        console.log('\n[DEMO] All scenarios completed!');
    }

    /**
     * Simulate a complete transaction flow
     */
    async simulateTransactionFlow(scenario) {
        // Step 1: Create transaction request
        console.log('[DEMO] 1. Creating transaction request...');
        
        let txRequest;
        if (scenario.type === 'eth') {
            const nonce = 0; // Simulated nonce
            const gasPrice = 20000000000n; // 20 gwei
            const gasLimit = 21000n;
            const valueWei = CryptoUtils.ethToWei(scenario.amount);
            
            txRequest = MessageProtocol.createTxRequest(
                this.chainId,
                scenario.to,
                valueWei,
                '0x',
                nonce,
                gasPrice,
                gasLimit
            );
        } else { // ERC-20
            const nonce = 0; // Simulated nonce
            const gasPrice = 20000000000n; // 20 gwei
            const gasLimit = 100000n;
            
            // Create ERC-20 transfer data
            const crypto = new CryptoUtils(this.privateKey);
            const erc20Tx = crypto.createErc20Transaction(
                scenario.token,
                scenario.to,
                scenario.amount,
                nonce,
                gasPrice,
                gasLimit,
                this.chainId
            );
            
            txRequest = MessageProtocol.createTxRequest(
                this.chainId,
                scenario.token,
                0,
                erc20Tx.data,
                nonce,
                gasPrice,
                gasLimit
            );
        }
        
        console.log(`[DEMO] Transaction request created (ID: ${txRequest.id})`);
        
        // Step 2: Simulate ping/pong handshake
        console.log('[DEMO] 2. Simulating ping/pong handshake...');
        
        const ping = MessageProtocol.createPing();
        console.log(`[DEMO] Online -> Offline: PING (${ping.id})`);
        
        const pong = MessageProtocol.createPong(ping.id);
        console.log(`[DEMO] Offline -> Online: PONG (${pong.id})`);
        
        // Step 3: Send transaction request
        console.log('[DEMO] 3. Sending transaction request...');
        console.log(`[DEMO] Online -> Offline: TX_REQUEST (${txRequest.id})`);
        
        // Step 4: Offline wallet processing
        console.log('[DEMO] 4. Offline wallet processing...');
        
        // Extract transaction data
        const txData = txRequest.payload.transaction;
        
        // Convert hex values
        const chainId = CryptoUtils.parseHexToNumber(txData.chainId);
        const nonce = CryptoUtils.parseHexToNumber(txData.nonce);
        const gasPrice = CryptoUtils.parseHexToNumber(txData.gasPrice);
        const gasLimit = CryptoUtils.parseHexToNumber(txData.gasLimit);
        const to = txData.to;
        const value = CryptoUtils.parseHexToNumber(txData.value);
        const data = txData.data;
        
        // Create transaction for signing
        let transaction, txType;
        if (data && data !== '0x') {
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
            transaction = this.crypto.createEthTransaction(
                to, value, nonce, gasPrice, gasLimit, chainId
            );
            txType = 'ETH Transfer';
        }
        
        console.log(`[DEMO] Transaction type: ${txType}`);
        console.log(`[DEMO] Transaction details:`);
        console.log(CryptoUtils.formatTransactionForDisplay(transaction));
        
        // Auto-approve for demo
        console.log('[DEMO] Auto-approving transaction for demo...');
        
        // Sign transaction
        const signedTx = await this.crypto.signTransaction(transaction);
        
        // Step 5: Send signed transaction
        console.log('[DEMO] 5. Sending signed transaction...');
        
        const txResponse = MessageProtocol.createTxResponse(
            signedTx.raw,
            signedTx.hash
        );
        
        console.log(`[DEMO] Offline -> Online: TX_RESPONSE (${txResponse.id})`);
        console.log(`[DEMO] Transaction hash: ${signedTx.hash}`);
        
        // Step 6: Simulate broadcast (optional)
        console.log('[DEMO] 6. Would broadcast to network...');
        console.log(`[DEMO] Signed transaction: ${signedTx.raw.slice(0, 50)}...`);
        
        console.log(`[DEMO] ${scenario.name} simulation completed!`);
    }

    /**
     * Run an interactive demo with real components
     */
    async runInteractiveDemo() {
        console.log('\n[DEMO] Starting interactive demo...');
        console.log('[DEMO] This will start the actual offline wallet and online client');
        console.log('[DEMO] You\'ll need to run them in separate terminals');
        
        const choice = await this.askQuestion('\nWhich component would you like to start?\n1. Offline Wallet\n2. Online Client\nChoice: ');
        
        if (choice.trim() === '1') {
            console.log('[DEMO] Starting offline wallet...');
            const offlineWallet = new OfflineWallet(this.privateKey);
            await offlineWallet.start();
        } else if (choice.trim() === '2') {
            console.log('[DEMO] Starting online client...');
            const onlineClient = new OnlineClient(this.rpcUrl, this.chainId);
            await onlineClient.runInteractiveMenu();
        } else {
            console.log('Invalid choice');
        }
    }

    /**
     * Test message protocol functionality
     */
    testMessageProtocol() {
        console.log('\n[DEMO] Testing message protocol...');
        
        // Test ping/pong
        const ping = MessageProtocol.createPing();
        console.log(`[DEMO] Created ping: ${ping.toJSON()}`);
        
        const pong = MessageProtocol.createPong(ping.id);
        console.log(`[DEMO] Created pong: ${pong.toJSON()}`);
        
        // Test transaction request
        const txRequest = MessageProtocol.createTxRequest(
            1, '0x742d35Cc6634C0532925a3b8D4b33e8b71c7da2d', 1000000000000000000n, '0x', 0, 20000000000n, 21000n
        );
        console.log(`[DEMO] Created tx request: ${txRequest.toJSON()}`);
        
        // Test serialization/deserialization
        const jsonStr = txRequest.toJSON();
        const parsed = MessageProtocol.Message.fromJSON(jsonStr);
        console.log(`[DEMO] Serialization test: ${parsed.id === txRequest.id ? 'PASS' : 'FAIL'}`);
        
        console.log('[DEMO] Message protocol test completed!');
    }

    /**
     * Test sound protocol functionality
     */
    async testSoundProtocol() {
        console.log('\n[DEMO] Testing sound protocol...');
        
        const sound = new SoundProtocol();
        
        // Test message sending
        const ping = MessageProtocol.createPing();
        const sendResult = await sound.sendMessage(ping);
        console.log(`[DEMO] Send test: ${sendResult ? 'PASS' : 'FAIL'}`);
        
        // Test listening (simulated)
        sound.startListening((message) => {
            console.log(`[DEMO] Received: ${message.type}`);
        });
        
        // Simulate receiving a message
        const pong = MessageProtocol.createPong(ping.id);
        sound.simulateReceiveMessage(pong);
        
        sound.stopListening();
        console.log('[DEMO] Sound protocol test completed!');
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
     * Clean up resources
     */
    cleanup() {
        this.rl.close();
    }
}

async function main() {
    try {
        const demo = new Demo();
        
        console.log('\n[DEMO] Choose demo mode:');
        console.log('1. Simulated Demo (no real sound)');
        console.log('2. Interactive Demo (real components)');
        console.log('3. Test Message Protocol');
        console.log('4. Test Sound Protocol');
        
        const choice = await demo.askQuestion('Enter choice (1-4): ');
        
        switch (choice.trim()) {
            case '1':
                await demo.runSimulatedDemo();
                break;
            case '2':
                await demo.runInteractiveDemo();
                break;
            case '3':
                demo.testMessageProtocol();
                break;
            case '4':
                await demo.testSoundProtocol();
                break;
            default:
                console.log('Invalid choice');
        }
        
        demo.cleanup();
        
    } catch (error) {
        if (error.message.includes('interrupted')) {
            console.log('\n[DEMO] Demo interrupted by user');
        } else {
            console.log(`[DEMO] Error: ${error.message}`);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[DEMO] Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

main().catch(console.error);