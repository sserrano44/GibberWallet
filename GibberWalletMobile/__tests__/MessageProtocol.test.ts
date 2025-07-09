import { MessageProtocol, Message } from '../src/lib/MessageProtocol';
import { MessageType } from '../src/types/MessageTypes';

describe('MessageProtocol', () => {
  describe('Message creation', () => {
    it('should create a ping message', () => {
      const ping = MessageProtocol.createPing();
      expect(ping.type).toBe(MessageType.PING);
      expect(ping.version).toBe('1.0');
      expect(ping.payload).toEqual({});
    });

    it('should create a pong message with correlationId', () => {
      const correlationId = 'test-123';
      const pong = MessageProtocol.createPong(correlationId);
      expect(pong.type).toBe(MessageType.PONG);
      expect(pong.payload.received_id).toBe(correlationId);
    });

    it('should create a transaction request message', () => {
      const chainId = 1;
      const to = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD8c';
      const value = BigInt(1);
      const data = '0x';
      const nonce = 0;
      const gasPrice = BigInt('1000000000');
      const gasLimit = BigInt('21000');
      
      const txRequest = MessageProtocol.createTxRequest(
        chainId,
        to,
        value,
        data,
        nonce,
        gasPrice,
        gasLimit
      );
      
      expect(txRequest.type).toBe(MessageType.TX_REQUEST);
      expect(txRequest.payload.transaction.chainId).toBe(chainId);
      expect(txRequest.payload.transaction.to).toBe(to);
      expect(txRequest.payload.transaction.value).toBe('0x1');
      expect(txRequest.payload.transaction.gasLimit).toBe('0x5208');
    });

    it('should create an error message', () => {
      const errorMsg = 'Test error';
      const correlationId = 'test-456';
      const error = MessageProtocol.createError(errorMsg, correlationId);
      
      expect(error.type).toBe(MessageType.ERROR);
      expect(error.payload.message).toBe(errorMsg);
      expect(error.payload.received_id).toBe(correlationId);
    });
  });

  describe('Message validation', () => {
    it('should validate supported version', () => {
      const msg = MessageProtocol.createPing();
      expect(MessageProtocol.validateVersion(msg)).toBe(true);
    });

    it('should invalidate unsupported version', () => {
      const msg = MessageProtocol.createPing();
      msg.version = '2.0';
      expect(MessageProtocol.validateVersion(msg)).toBe(false);
    });
  });

  describe('Type guards', () => {
    it('should identify ping message', () => {
      const ping = MessageProtocol.createPing();
      expect(MessageProtocol.isPing(ping)).toBe(true);
      
      const pong = MessageProtocol.createPong();
      expect(MessageProtocol.isPing(pong)).toBe(false);
    });

    it('should identify transaction request', () => {
      const chainId = 1;
      const to = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD8c';
      const value = BigInt(1);
      const data = '0x';
      const nonce = 0;
      const gasPrice = BigInt('1000000000');
      const gasLimit = BigInt('21000');
      
      const txRequest = MessageProtocol.createTxRequest(
        chainId,
        to,
        value,
        data,
        nonce,
        gasPrice,
        gasLimit
      );
      expect(MessageProtocol.isTxRequest(txRequest)).toBe(true);
      
      const ping = MessageProtocol.createPing();
      expect(MessageProtocol.isTxRequest(ping)).toBe(false);
    });
  });

  describe('Message serialization', () => {
    it('should serialize and deserialize message', () => {
      const original = MessageProtocol.createPing();
      const json = original.toJSON();
      const parsed = Message.fromJSON(json);
      
      expect(parsed.id).toBe(original.id);
      expect(parsed.type).toBe(original.type);
      expect(parsed.version).toBe(original.version);
      expect(parsed.timestamp).toBe(original.timestamp);
    });
  });
});