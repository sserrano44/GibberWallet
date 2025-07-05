import { ethers } from 'ethers';

/**
 * Cryptographic utilities for Ethereum transactions
 */
export class CryptoUtils {
    constructor(privateKey) {
        this.wallet = new ethers.Wallet(privateKey);
        this.address = this.wallet.address;
    }

    /**
     * Sign a transaction
     */
    async signTransaction(transaction) {
        try {
            const signedTx = await this.wallet.signTransaction(transaction);
            const txHash = ethers.keccak256(signedTx);
            
            return {
                raw: signedTx,
                hash: txHash
            };
        } catch (error) {
            throw new Error(`Failed to sign transaction: ${error.message}`);
        }
    }

    /**
     * Create ETH transfer transaction
     */
    createEthTransaction(to, value, nonce, gasPrice, gasLimit, chainId) {
        return {
            to: to,
            value: value,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            nonce: nonce,
            chainId: chainId,
            type: 0 // Legacy transaction type
        };
    }

    /**
     * Create ERC-20 transfer transaction
     */
    createErc20Transaction(tokenAddress, to, amount, nonce, gasPrice, gasLimit, chainId) {
        // ERC-20 transfer function signature: transfer(address,uint256)
        const iface = new ethers.Interface([
            'function transfer(address to, uint256 amount) returns (bool)'
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
            type: 0 // Legacy transaction type
        };
    }

    /**
     * Get wallet address
     */
    getAddress() {
        return this.address;
    }

    /**
     * Sign a message
     */
    async signMessage(message) {
        return await this.wallet.signMessage(message);
    }

    /**
     * Validate Ethereum address
     */
    static validateAddress(address) {
        try {
            return ethers.isAddress(address);
        } catch {
            return false;
        }
    }

    /**
     * Validate private key format
     */
    static validatePrivateKey(privateKey) {
        try {
            // Remove 0x prefix if present
            if (privateKey.startsWith('0x')) {
                privateKey = privateKey.slice(2);
            }
            
            // Check length (64 hex characters = 32 bytes)
            if (privateKey.length !== 64) {
                return false;
            }
            
            // Check if valid hex
            parseInt(privateKey, 16);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Convert Wei to ETH
     */
    static weiToEth(weiAmount) {
        return ethers.formatEther(weiAmount);
    }

    /**
     * Convert ETH to Wei
     */
    static ethToWei(ethAmount) {
        return ethers.parseEther(ethAmount.toString());
    }

    /**
     * Format transaction for display
     */
    static formatTransactionForDisplay(transaction) {
        const lines = [];
        lines.push('Transaction Details:');
        lines.push(`To: ${transaction.to || 'N/A'}`);
        lines.push(`Value: ${CryptoUtils.weiToEth(transaction.value || 0)} ETH`);
        lines.push(`Gas Price: ${transaction.gasPrice || 0} wei`);
        lines.push(`Gas Limit: ${transaction.gasLimit || 0}`);
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
    static parseHexToNumber(hexString) {
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
    static numberToHex(number) {
        return `0x${number.toString(16)}`;
    }
}