import { v4 as uuidv4 } from 'uuid';
import {
  IMessage,
  MessageType,
  MessageTypeValues,
  PingPayload,
  PongPayload,
  TxRequestPayload,
  TxResponsePayload,
  AckPayload,
  ErrorPayload,
  TransactionData,
  SignedTransaction,
} from '../types/MessageTypes';

/**
 * Message class for the sound-based wallet protocol
 */
export class Message implements IMessage {
  public version: string;
  public type: MessageTypeValues;
  public payload: any;
  public id: string;

  constructor(version: string, type: MessageTypeValues, payload: any, id?: string) {
    this.version = version;
    this.type = type;
    this.payload = payload;
    this.id = id || uuidv4();
  }

  /**
   * Convert message to JSON string
   */
  toJSON(): string {
    return JSON.stringify({
      version: this.version,
      type: this.type,
      payload: this.payload,
      id: this.id,
    });
  }

  /**
   * Create message from JSON string
   */
  static fromJSON(jsonStr: string): Message {
    const data = JSON.parse(jsonStr);
    return new Message(data.version, data.type, data.payload, data.id);
  }
}

/**
 * Message protocol utilities
 */
export class MessageProtocol {
  static readonly PROTOCOL_VERSION = '1.0';

  /**
   * Create a ping message
   */
  static createPing(): Message {
    return new Message(
      MessageProtocol.PROTOCOL_VERSION,
      MessageType.PING,
      {} as PingPayload
    );
  }

  /**
   * Create a pong response message
   */
  static createPong(pingId: string): Message {
    return new Message(
      MessageProtocol.PROTOCOL_VERSION,
      MessageType.PONG,
      { received_id: pingId } as PongPayload
    );
  }

  /**
   * Create a transaction request message
   */
  static createTxRequest(
    chainId: number,
    to: string,
    value: bigint | string,
    data: string,
    nonce: number,
    gasPrice: bigint | string,
    gasLimit: bigint | string
  ): Message {
    const transaction: TransactionData = {
      chainId: chainId,
      nonce: `0x${nonce.toString(16)}`,
      gasPrice: `0x${gasPrice.toString(16)}`,
      gasLimit: `0x${gasLimit.toString(16)}`,
      to: to,
      value: `0x${value.toString(16)}`,
      data: data,
    };

    return new Message(
      MessageProtocol.PROTOCOL_VERSION,
      MessageType.TX_REQUEST,
      { transaction } as TxRequestPayload
    );
  }

  /**
   * Create a transaction response message
   */
  static createTxResponse(signedTx: string, txHash: string): Message {
    const signedTransaction: SignedTransaction = {
      raw: signedTx,
      hash: txHash,
    };

    return new Message(
      MessageProtocol.PROTOCOL_VERSION,
      MessageType.TX_RESPONSE,
      { signedTransaction } as TxResponsePayload
    );
  }

  /**
   * Create an acknowledgment message
   */
  static createAck(receivedId: string): Message {
    return new Message(
      MessageProtocol.PROTOCOL_VERSION,
      MessageType.ACK,
      { received_id: receivedId } as AckPayload
    );
  }

  /**
   * Create an error message
   */
  static createError(message: string, receivedId?: string): Message {
    const payload: ErrorPayload = { message };
    if (receivedId) {
      payload.received_id = receivedId;
    }

    return new Message(
      MessageProtocol.PROTOCOL_VERSION,
      MessageType.ERROR,
      payload
    );
  }

  /**
   * Validate message version
   */
  static validateVersion(message: Message): boolean {
    return message.version === MessageProtocol.PROTOCOL_VERSION;
  }

  /**
   * Type guard for ping messages
   */
  static isPing(message: Message): message is Message & { payload: PingPayload } {
    return message.type === MessageType.PING;
  }

  /**
   * Type guard for pong messages
   */
  static isPong(message: Message): message is Message & { payload: PongPayload } {
    return message.type === MessageType.PONG;
  }

  /**
   * Type guard for transaction request messages
   */
  static isTxRequest(message: Message): message is Message & { payload: TxRequestPayload } {
    return message.type === MessageType.TX_REQUEST;
  }

  /**
   * Type guard for transaction response messages
   */
  static isTxResponse(message: Message): message is Message & { payload: TxResponsePayload } {
    return message.type === MessageType.TX_RESPONSE;
  }

  /**
   * Type guard for acknowledgment messages
   */
  static isAck(message: Message): message is Message & { payload: AckPayload } {
    return message.type === MessageType.ACK;
  }

  /**
   * Type guard for error messages
   */
  static isError(message: Message): message is Message & { payload: ErrorPayload } {
    return message.type === MessageType.ERROR;
  }
}