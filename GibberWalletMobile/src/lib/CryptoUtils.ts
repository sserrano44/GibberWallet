import { ethers } from 'ethers';
import { TransactionData, SignedTransaction } from '../types/MessageTypes';

/**
 * Transaction structure for ethers.js
 */
export interface EthersTransaction {
  to?: string;
  value?: string | bigint;
  gasLimit?: string | bigint;
  gasPrice?: string | bigint;
  nonce?: number;
  chainId?: number;
  data?: string;
  type?: number;
}

/**
 * Cryptographic utilities for Ethereum transactions (React Native compatible)
 */
export class CryptoUtils {
  private wallet: ethers.Wallet;
  public readonly address: string;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
    this.address = this.wallet.address;
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: EthersTransaction): Promise<SignedTransaction> {
    try {
      const signedTx = await this.wallet.signTransaction(transaction);
      const txHash = ethers.keccak256(signedTx);
      
      return {
        raw: signedTx,
        hash: txHash,
      };
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Create ETH transfer transaction
   */
  createEthTransaction(
    to: string,
    value: string | bigint,
    nonce: number,
    gasPrice: string | bigint,
    gasLimit: string | bigint,
    chainId: number
  ): EthersTransaction {
    return {
      to: to,
      value: value,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
      nonce: nonce,
      chainId: chainId,
      type: 0, // Legacy transaction type
    };
  }

  /**
   * Create ERC-20 transfer transaction
   */
  createErc20Transaction(
    tokenAddress: string,
    to: string,
    amount: string | bigint,
    nonce: number,
    gasPrice: string | bigint,
    gasLimit: string | bigint,
    chainId: number
  ): EthersTransaction {
    // ERC-20 transfer function signature: transfer(address,uint256)
    const iface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)',
    ]);
    
    const data = iface.encodeFunctionData('transfer', [to, amount]);
    
    return {
      to: tokenAddress,
      value: 0, // No ETH value for ERC-20 transfers
      gasLimit: gasLimit,
      gasPrice: gasPrice,
      nonce: nonce,
      chainId: chainId,
      data: data,
      type: 0, // Legacy transaction type
    };
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }

  /**
   * Validate Ethereum address
   */
  static validateAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate private key format
   */
  static validatePrivateKey(privateKey: string): boolean {
    try {
      // Remove 0x prefix if present
      let key = privateKey;
      if (key.startsWith('0x')) {
        key = key.slice(2);
      }
      
      // Check length (64 hex characters = 32 bytes)
      if (key.length !== 64) {
        return false;
      }
      
      // Check if valid hex
      parseInt(key, 16);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert Wei to ETH
   */
  static weiToEth(weiAmount: string | bigint): string {
    return ethers.formatEther(weiAmount);
  }

  /**
   * Convert ETH to Wei
   */
  static ethToWei(ethAmount: string | number): bigint {
    return ethers.parseEther(ethAmount.toString());
  }

  /**
   * Format transaction for display
   */
  static formatTransactionForDisplay(transaction: TransactionData): string {
    const lines: string[] = [];
    lines.push('Transaction Details:');
    lines.push(`To: ${transaction.to || 'N/A'}`);
    lines.push(`Value: ${CryptoUtils.weiToEth(transaction.value || '0')} ETH`);
    lines.push(`Gas Price: ${transaction.gasPrice || '0'} wei`);
    lines.push(`Gas Limit: ${transaction.gasLimit || '0'}`);
    lines.push(`Nonce: ${transaction.nonce || 0}`);
    lines.push(`Chain ID: ${transaction.chainId || 0}`);
    
    if (transaction.data && transaction.data !== '0x') {
      const dataStr = transaction.data.length > 50 
        ? transaction.data.slice(0, 50) + '...'
        : transaction.data;
      lines.push(`Data: ${dataStr}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Parse hex string to number
   */
  static parseHexToNumber(hexString: string | number): number {
    if (typeof hexString === 'number') {
      return hexString;
    }
    
    if (typeof hexString === 'string') {
      if (hexString.startsWith('0x')) {
        return parseInt(hexString, 16);
      }
      return parseInt(hexString, 10);
    }
    
    return 0;
  }

  /**
   * Convert number to hex string
   */
  static numberToHex(number: number): string {
    return `0x${number.toString(16)}`;
  }

  /**
   * Generate a new random private key
   */
  static generatePrivateKey(): string {
    const wallet = ethers.Wallet.createRandom();
    return wallet.privateKey;
  }

  /**
   * Get address from private key without creating wallet instance
   */
  static getAddressFromPrivateKey(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }
}