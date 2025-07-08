/**
 * Message types supported by the protocol
 */
export const MessageType = {
  PING: 'ping',
  PONG: 'pong',
  TX_REQUEST: 'tx_request',
  TX_RESPONSE: 'tx_response',
  ACK: 'ack',
  ERROR: 'error'
} as const;

export type MessageTypeValues = typeof MessageType[keyof typeof MessageType];

/**
 * Transaction data structure
 */
export interface TransactionData {
  chainId: number;
  nonce: string;
  gasPrice: string;
  gasLimit: string;
  to: string;
  value: string;
  data: string;
}

/**
 * Signed transaction structure
 */
export interface SignedTransaction {
  raw: string;
  hash: string;
}

/**
 * Message payload types
 */
export interface PingPayload {}

export interface PongPayload {
  received_id: string;
}

export interface TxRequestPayload {
  transaction: TransactionData;
}

export interface TxResponsePayload {
  signedTransaction: SignedTransaction;
}

export interface AckPayload {
  received_id: string;
}

export interface ErrorPayload {
  message: string;
  received_id?: string;
}

/**
 * Base message interface
 */
export interface IMessage {
  version: string;
  type: MessageTypeValues;
  payload: PingPayload | PongPayload | TxRequestPayload | TxResponsePayload | AckPayload | ErrorPayload;
  id: string;
}