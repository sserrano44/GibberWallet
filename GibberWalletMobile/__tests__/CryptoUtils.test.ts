import { CryptoUtils } from '../src/lib/CryptoUtils';

describe('CryptoUtils', () => {
  const testPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  
  describe('Private key validation', () => {
    it('should validate correct private key format', () => {
      expect(CryptoUtils.validatePrivateKey(testPrivateKey)).toBe(true);
      expect(CryptoUtils.validatePrivateKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')).toBe(true);
    });

    it('should reject invalid private key format', () => {
      expect(CryptoUtils.validatePrivateKey('0x123')).toBe(false);
      expect(CryptoUtils.validatePrivateKey('invalid')).toBe(false);
      expect(CryptoUtils.validatePrivateKey('')).toBe(false);
    });
  });

  describe('Address generation', () => {
    it('should generate address from private key', () => {
      const crypto = new CryptoUtils(testPrivateKey);
      const address = crypto.getAddress();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('Utility functions', () => {
    it('should convert wei to eth', () => {
      expect(CryptoUtils.weiToEth('1000000000000000000')).toBe('1.0');
      expect(CryptoUtils.weiToEth('1500000000000000000')).toBe('1.5');
      expect(CryptoUtils.weiToEth('100000000000000')).toBe('0.0001');
    });

    it('should parse hex to number', () => {
      expect(CryptoUtils.parseHexToNumber('0x1')).toBe(1);
      expect(CryptoUtils.parseHexToNumber('0xff')).toBe(255);
      expect(CryptoUtils.parseHexToNumber('0x5208')).toBe(21000);
    });

    it('should format transaction for display', () => {
      const txData = {
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD8c',
        value: '0x1',
        gasLimit: '0x5208',
        gasPrice: '0x3b9aca00',
        nonce: '0x0',
        chainId: 1,
        data: '0x',
      };
      
      const formatted = CryptoUtils.formatTransactionForDisplay(txData);
      expect(formatted).toContain('To: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD8c');
      expect(formatted).toContain('Chain ID: 1');
    });
  });

  describe('Transaction signing', () => {
    it('should sign a transaction', async () => {
      const crypto = new CryptoUtils(testPrivateKey);
      const tx = {
        to: '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
        value: '0x1',
        gasLimit: '0x5208',
        gasPrice: '0x3b9aca00',
        nonce: 0,
        chainId: 1,
        data: '0x',
        type: 0,
      };
      
      const signed = await crypto.signTransaction(tx);
      expect(signed.raw).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(signed.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });
});