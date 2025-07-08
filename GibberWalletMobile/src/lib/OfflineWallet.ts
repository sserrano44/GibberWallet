import { EventEmitter } from 'events';
import { CryptoUtils, EthersTransaction } from './CryptoUtils';
import { MessageProtocol, Message } from './MessageProtocol';
import { MessageType, TransactionData } from '../types/MessageTypes';
import { SecureStorage } from './SecureStorage';
import GGWaveModule, { AudioReceptionData, GGWaveEvents } from '../native/GGWaveModule';

/**
 * Transaction approval request
 */
export interface TransactionApprovalRequest {
  message: Message;
  transaction: TransactionData;
  formattedTransaction: string;
}

/**
 * Offline wallet events
 */
export interface OfflineWalletEvents {
  'transactionRequest': (request: TransactionApprovalRequest) => void;
  'messageReceived': (message: Message) => void;
  'listeningStarted': () => void;
  'listeningStopped': () => void;
  'audioLevelChanged': (level: number) => void;
  'error': (error: Error) => void;
}

/**
 * Offline wallet component for airgap transaction signing (React Native)
 */
export class OfflineWallet extends EventEmitter {
  private crypto: CryptoUtils | null = null;
  private ggwave: GGWaveModule;
  private isRunning = false;
  private soundTimeout: number;
  private soundRetries: number;

  constructor(soundTimeout: number = 5000, soundRetries: number = 3) {
    super();
    this.soundTimeout = soundTimeout;
    this.soundRetries = soundRetries;
    this.ggwave = GGWaveModule.getInstance();
    
    this.setupAudioEventListeners();
  }

  /**
   * Initialize the offline wallet with a private key
   */
  async initialize(privateKey: string): Promise<boolean> {
    try {
      // Validate private key
      if (!CryptoUtils.validatePrivateKey(privateKey)) {
        throw new Error('Invalid private key format');
      }

      // Initialize crypto utilities
      this.crypto = new CryptoUtils(privateKey);
      
      // Initialize audio system
      const audioInitialized = await this.ggwave.initialize({
        sampleRate: 48000,
        protocolId: 1, // AUDIBLE_FAST
        volume: 15,
      });

      if (!audioInitialized) {
        throw new Error('Failed to initialize audio system');
      }

      console.log(`[OFFLINE] Wallet initialized with address: ${this.crypto.getAddress()}`);
      return true;

    } catch (error) {
      console.error('[OFFLINE] Failed to initialize wallet:', error);
      this.emit('error', error as Error);
      return false;
    }
  }

  /**
   * Load wallet from secure storage
   */
  async loadFromStorage(alias: string = 'default'): Promise<boolean> {
    try {
      const privateKey = await SecureStorage.getPrivateKey(alias);
      if (!privateKey) {
        throw new Error('No private key found in secure storage');
      }

      return await this.initialize(privateKey);
    } catch (error) {
      console.error('[OFFLINE] Failed to load wallet from storage:', error);
      this.emit('error', error as Error);
      return false;
    }
  }

  /**
   * Start the offline wallet in listening mode
   */
  async start(): Promise<boolean> {
    if (!this.crypto) {
      throw new Error('Wallet not initialized');
    }

    console.log('[OFFLINE] Starting offline wallet...');
    this.isRunning = true;
    
    try {
      // Start listening for sound messages
      const success = await this.ggwave.startListening();
      
      if (success) {
        console.log('[OFFLINE] Offline wallet is listening for sound messages...');
        this.emit('listeningStarted');
        return true;
      } else {
        throw new Error('Failed to start audio listening');
      }
    } catch (error) {
      console.error('[OFFLINE] Failed to start wallet:', error);
      this.emit('error', error as Error);
      return false;
    }
  }

  /**
   * Stop the offline wallet
   */
  async stop(): Promise<void> {
    console.log('[OFFLINE] Stopping offline wallet...');
    this.isRunning = false;
    
    try {
      await this.ggwave.stopListening();
      this.emit('listeningStopped');
    } catch (error) {
      console.error('[OFFLINE] Error stopping wallet:', error);
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.crypto?.getAddress() || null;
  }

  /**
   * Check if wallet is running
   */
  isWalletRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Approve and sign a transaction
   */
  async approveTransaction(message: Message): Promise<boolean> {
    if (!this.crypto) {
      throw new Error('Wallet not initialized');
    }

    if (!MessageProtocol.isTxRequest(message)) {
      throw new Error('Invalid transaction request message');
    }

    try {
      const { transaction } = message.payload;
      
      // Convert to ethers transaction format
      const ethersTransaction: EthersTransaction = {
        to: transaction.to,
        value: transaction.value,
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice,
        nonce: CryptoUtils.parseHexToNumber(transaction.nonce),
        chainId: transaction.chainId,
        data: transaction.data,
        type: 0,
      };

      console.log('[OFFLINE] Signing transaction...');
      const signedTx = await this.crypto.signTransaction(ethersTransaction);
      
      // Create response message
      const response = MessageProtocol.createTxResponse(signedTx.raw, signedTx.hash);
      
      // Send response via sound
      const result = await this.ggwave.transmitMessage(response.toJSON());
      
      if (result.success) {
        console.log('[OFFLINE] Transaction signed and response sent');
        return true;
      } else {
        throw new Error(result.error || 'Failed to transmit response');
      }

    } catch (error) {
      console.error('[OFFLINE] Failed to approve transaction:', error);
      
      // Send error response
      const errorMsg = MessageProtocol.createError(
        `Transaction signing failed: ${(error as Error).message}`,
        message.id
      );
      
      try {
        await this.ggwave.transmitMessage(errorMsg.toJSON());
      } catch (transmitError) {
        console.error('[OFFLINE] Failed to send error response:', transmitError);
      }
      
      this.emit('error', error as Error);
      return false;
    }
  }

  /**
   * Reject a transaction
   */
  async rejectTransaction(message: Message, reason: string = 'Transaction rejected by user'): Promise<void> {
    try {
      const errorMsg = MessageProtocol.createError(reason, message.id);
      await this.ggwave.transmitMessage(errorMsg.toJSON());
      console.log('[OFFLINE] Transaction rejected and response sent');
    } catch (error) {
      console.error('[OFFLINE] Failed to send rejection response:', error);
    }
  }

  /**
   * Set up audio event listeners
   */
  private setupAudioEventListeners(): void {
    this.ggwave.addEventListener(GGWaveEvents.MESSAGE_RECEIVED, this.handleAudioMessage.bind(this));
    this.ggwave.addEventListener(GGWaveEvents.LISTENING_STARTED, () => {
      this.emit('listeningStarted');
    });
    this.ggwave.addEventListener(GGWaveEvents.LISTENING_STOPPED, () => {
      this.emit('listeningStopped');
    });
    this.ggwave.addEventListener(GGWaveEvents.AUDIO_LEVEL_CHANGED, (data: { level: number }) => {
      this.emit('audioLevelChanged', data.level);
    });
    this.ggwave.addEventListener(GGWaveEvents.ERROR, (error: { message: string }) => {
      this.emit('error', new Error(error.message));
    });
  }

  /**
   * Handle incoming audio messages
   */
  private async handleAudioMessage(data: AudioReceptionData): Promise<void> {
    try {
      const message = Message.fromJSON(data.message);
      console.log(`[OFFLINE] Received message: ${message.type} (ID: ${message.id})`);
      
      // Validate message version
      if (!MessageProtocol.validateVersion(message)) {
        console.warn('[OFFLINE] Unsupported message version:', message.version);
        return;
      }

      this.emit('messageReceived', message);

      // Handle different message types
      switch (message.type) {
        case MessageType.PING:
          await this.handlePing(message);
          break;
          
        case MessageType.TX_REQUEST:
          await this.handleTransactionRequest(message);
          break;
          
        default:
          console.log('[OFFLINE] Unhandled message type:', message.type);
      }

    } catch (error) {
      console.error('[OFFLINE] Failed to handle audio message:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Handle ping message
   */
  private async handlePing(message: Message): Promise<void> {
    try {
      const pong = MessageProtocol.createPong(message.id);
      const result = await this.ggwave.transmitMessage(pong.toJSON());
      
      if (result.success) {
        console.log('[OFFLINE] Pong sent in response to ping');
      } else {
        throw new Error(result.error || 'Failed to send pong');
      }
    } catch (error) {
      console.error('[OFFLINE] Failed to send pong:', error);
    }
  }

  /**
   * Handle transaction request
   */
  private async handleTransactionRequest(message: Message): Promise<void> {
    if (!MessageProtocol.isTxRequest(message)) {
      console.error('[OFFLINE] Invalid transaction request message');
      return;
    }

    const { transaction } = message.payload;
    const formattedTransaction = CryptoUtils.formatTransactionForDisplay(transaction);
    
    console.log('[OFFLINE] Transaction request received:');
    console.log(formattedTransaction);

    // Emit transaction request event for UI handling
    this.emit('transactionRequest', {
      message,
      transaction,
      formattedTransaction,
    });
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.stop();
    this.ggwave.removeAllEventListeners();
    await this.ggwave.destroy();
    this.removeAllListeners();
  }
}