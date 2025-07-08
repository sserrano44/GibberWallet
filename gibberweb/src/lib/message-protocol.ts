import { v4 as uuidv4 } from 'uuid';

/**
 * Message types supported by the protocol
 */
export const MessageType = {
    CONNECT: 'connect',
    CONNECT_RESPONSE: 'connect_response',
    TX_REQUEST: 'tx_request',
    TX_RESPONSE: 'tx_response',
    ACK: 'ack',
    ERROR: 'error'
} as const;

export type MessageTypeValues = typeof MessageType[keyof typeof MessageType];

/**
 * Message class for the sound-based wallet protocol
 */
export class Message {
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
            id: this.id
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
     * Create a connect message
     */
    static createConnect(): Message {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.CONNECT,
            {}
        );
    }

    /**
     * Create a connect response message
     */
    static createConnectResponse(address: string, connectId: string): Message {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.CONNECT_RESPONSE,
            { 
                address: address,
                received_id: connectId
            }
        );
    }

    /**
     * Create a transaction request message
     */
    static createTxRequest(
        chainId: number, 
        to: string, 
        value: string | bigint, 
        data: string, 
        nonce: number, 
        gasPrice: string | bigint, 
        gasLimit: string | bigint
    ): Message {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.TX_REQUEST,
            {
                transaction: {
                    chainId: chainId,
                    nonce: `0x${nonce.toString(16)}`,
                    gasPrice: `0x${gasPrice.toString(16)}`,
                    gasLimit: `0x${gasLimit.toString(16)}`,
                    to: to,
                    value: `0x${value.toString(16)}`,
                    data: data
                }
            }
        );
    }

    /**
     * Create a transaction response message
     */
    static createTxResponse(signedTx: string, txHash: string): Message {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.TX_RESPONSE,
            {
                signedTransaction: {
                    raw: signedTx,
                    hash: txHash
                }
            }
        );
    }

    /**
     * Create an acknowledgment message
     */
    static createAck(receivedId: string): Message {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.ACK,
            { received_id: receivedId }
        );
    }

    /**
     * Create an error message
     */
    static createError(message: string, receivedId?: string): Message {
        const payload: any = { message };
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
}