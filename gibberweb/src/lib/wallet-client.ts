import { EventEmitter } from 'events';
import { AudioProtocol } from './audio-protocol';
import { MessageType, MessageProtocol, Message } from './message-protocol';
import { CryptoUtils, TransactionData } from './crypto-utils';
import { WalletConfig, TransactionRequest, TransactionResponse, ConnectionStatus, AudioStatus } from '@/types/wallet';

export interface WalletClientEvents {
  'connectionChanged': (status: ConnectionStatus) => void;
  'audioChanged': (status: AudioStatus) => void;
  'transactionSent': (txHash: string) => void;
  'transactionConfirmed': (receipt: any) => void;
  'error': (error: Error) => void;
}

export class WalletClient extends EventEmitter {
  private audio: AudioProtocol;
  private crypto: CryptoUtils;
  private config: WalletConfig | null = null;
  private connectionStatus: ConnectionStatus = { connected: false };
  private audioStatus: AudioStatus = { isListening: false, isTransmitting: false, level: 0 };

  constructor() {
    super();
    this.audio = new AudioProtocol();
    this.crypto = new CryptoUtils();
    
    // Set up audio event listeners
    this.audio.on('message', this.handleMessage.bind(this));
    this.audio.on('listening', this.handleListeningChange.bind(this));
    this.audio.on('transmitting', this.handleTransmittingChange.bind(this));
    this.audio.on('audioLevel', this.handleAudioLevel.bind(this));
    this.audio.on('error', this.handleAudioError.bind(this));
  }

  /**
   * Initialize wallet with configuration
   */
  async initialize(config: WalletConfig): Promise<boolean> {
    try {
      this.config = config;
      this.crypto.setProvider(config.rpcUrl);
      
      // Test connection
      const provider = this.crypto.getProvider();
      if (provider) {
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        
        this.connectionStatus = {
          connected: true,
          chainId: Number(network.chainId),
          blockNumber: blockNumber
        };
        
        console.log(`Connected to ${config.chainName} (Chain ID: ${network.chainId})`);
        console.log(`Latest block: ${blockNumber}`);
      }
      
      // Initialize audio
      const audioInitialized = await this.audio.initialize();
      if (!audioInitialized) {
        throw new Error('Failed to initialize audio');
      }
      
      this.emit('connectionChanged', this.connectionStatus);
      return true;
      
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      this.connectionStatus = { 
        connected: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
      this.emit('connectionChanged', this.connectionStatus);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Start listening for audio messages
   */
  async startListening(): Promise<boolean> {
    return await this.audio.startListening();
  }

  /**
   * Stop listening for audio messages
   */
  stopListening(): void {
    this.audio.stopListening();
  }

  /**
   * Send ETH transfer transaction
   */
  async sendEthTransfer(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      if (!this.config || !this.crypto.getProvider()) {
        throw new Error('Wallet not initialized');
      }

      console.log(`Preparing ETH transfer: ${CryptoUtils.weiToEth(request.value)} ETH to ${request.to}`);

      // Get transaction parameters
      const nonce = await this.crypto.getNonce(request.from);
      const gasPrice = request.gasPrice ? BigInt(request.gasPrice) : await this.crypto.getGasPrice();
      const gasLimit = request.gasLimit ? BigInt(request.gasLimit) : BigInt(21000);

      console.log(`Nonce: ${nonce}, Gas Price: ${gasPrice}, Gas Limit: ${gasLimit}`);

      // Create transaction request message
      const txRequest = MessageProtocol.createTxRequest(
        this.config.chainId,
        request.to,
        request.value,
        request.data || '0x',
        nonce,
        gasPrice,
        gasLimit
      );

      // Send transaction via audio protocol
      return await this.sendTransactionRequest(txRequest);

    } catch (error) {
      console.error('ETH transfer failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send ERC-20 transfer transaction
   */
  async sendErc20Transfer(request: TransactionRequest & { tokenAddress: string; amount: string }): Promise<TransactionResponse> {
    try {
      if (!this.config || !this.crypto.getProvider()) {
        throw new Error('Wallet not initialized');
      }

      console.log(`Preparing ERC-20 transfer: ${request.amount} tokens to ${request.to}`);

      // Get transaction parameters
      const nonce = await this.crypto.getNonce(request.from);
      const gasPrice = request.gasPrice ? BigInt(request.gasPrice) : await this.crypto.getGasPrice();
      const gasLimit = request.gasLimit ? BigInt(request.gasLimit) : BigInt(100000);

      // Create ERC-20 transaction
      const transaction = this.crypto.createErc20Transaction(
        request.tokenAddress,
        request.to,
        request.amount,
        nonce,
        gasPrice,
        gasLimit,
        this.config.chainId
      );

      // Create transaction request message
      const txRequest = MessageProtocol.createTxRequest(
        this.config.chainId,
        transaction.to,
        transaction.value,
        transaction.data || '0x',
        transaction.nonce,
        transaction.gasPrice,
        transaction.gasLimit
      );

      // Send transaction via audio protocol
      return await this.sendTransactionRequest(txRequest);

    } catch (error) {
      console.error('ERC-20 transfer failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send transaction request via audio protocol
   */
  private async sendTransactionRequest(txRequest: Message): Promise<TransactionResponse> {
    try {
      // Step 1: Send ping and wait for pong
      console.log('Sending ping to offline wallet...');
      const ping = MessageProtocol.createPing();
      
      if (!await this.audio.sendMessage(ping)) {
        throw new Error('Failed to send ping');
      }

      console.log('Waiting for pong...');
      const pong = await this.audio.waitForMessage(MessageType.PONG, 10000);
      
      if (!pong) {
        throw new Error('No pong received from offline wallet');
      }

      console.log('Pong received, sending transaction request...');

      // Step 2: Send transaction request
      if (!await this.audio.sendMessage(txRequest)) {
        throw new Error('Failed to send transaction request');
      }

      console.log('Waiting for signed transaction...');

      // Step 3: Wait for signed transaction response
      const response = await this.audio.waitForMessage(MessageType.TX_RESPONSE, 30000);
      
      if (!response) {
        throw new Error('No transaction response received');
      }

      if (!response.payload || !response.payload.signed_transaction) {
        throw new Error('Invalid transaction response');
      }

      console.log('Signed transaction received, broadcasting...');

      // Step 4: Broadcast signed transaction
      const signedTx = response.payload.signed_transaction;
      const txHash = await this.crypto.broadcastTransaction(signedTx);

      console.log(`Transaction broadcasted successfully: ${txHash}`);
      this.emit('transactionSent', txHash);

      // Step 5: Wait for confirmation (optional)
      try {
        const receipt = await this.crypto.waitForTransaction(txHash, 60000);
        if (receipt) {
          console.log('Transaction confirmed:', receipt);
          this.emit('transactionConfirmed', receipt);
        }
      } catch (confirmError) {
        console.warn('Failed to wait for confirmation:', confirmError);
        // Don't fail the whole transaction for confirmation timeout
      }

      return {
        hash: txHash,
        success: true
      };

    } catch (error) {
      console.error('Transaction request failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<string> {
    return await this.crypto.getBalance(address);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get current audio status
   */
  getAudioStatus(): AudioStatus {
    return this.audioStatus;
  }

  /**
   * Handle received audio messages
   */
  private handleMessage(message: Message): void {
    console.log('Received message:', message.type, message.id);
    
    switch (message.type) {
      case MessageType.PONG:
        console.log('Pong received from offline wallet');
        break;
      case MessageType.TX_RESPONSE:
        console.log('Transaction response received');
        break;
      case MessageType.ERROR:
        console.error('Error from offline wallet:', message.payload.message);
        this.emit('error', new Error(message.payload.message));
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Handle audio listening state changes
   */
  private handleListeningChange(isListening: boolean): void {
    this.audioStatus.isListening = isListening;
    this.emit('audioChanged', this.audioStatus);
  }

  /**
   * Handle audio transmitting state changes
   */
  private handleTransmittingChange(isTransmitting: boolean): void {
    this.audioStatus.isTransmitting = isTransmitting;
    this.emit('audioChanged', this.audioStatus);
  }

  /**
   * Handle audio level changes
   */
  private handleAudioLevel(level: number): void {
    this.audioStatus.level = level;
    this.emit('audioChanged', this.audioStatus);
  }

  /**
   * Handle audio errors
   */
  private handleAudioError(error: Error): void {
    this.audioStatus.error = error.message;
    this.emit('audioChanged', this.audioStatus);
    this.emit('error', error);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.audio.destroy();
    this.removeAllListeners();
  }
}