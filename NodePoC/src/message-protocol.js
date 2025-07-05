import { v4 as uuidv4 } from 'uuid';

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
};

/**
 * Message class for the sound-based wallet protocol
 */
export class Message {
    constructor(version, type, payload, id = null) {
        this.version = version;
        this.type = type;
        this.payload = payload;
        this.id = id || uuidv4();
    }

    /**
     * Convert message to JSON string
     */
    toJSON() {
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
    static fromJSON(jsonStr) {
        const data = JSON.parse(jsonStr);
        return new Message(data.version, data.type, data.payload, data.id);
    }
}

/**
 * Message protocol utilities
 */
export class MessageProtocol {
    static PROTOCOL_VERSION = '1.0';

    /**
     * Create a ping message
     */
    static createPing() {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.PING,
            {}
        );
    }

    /**
     * Create a pong response message
     */
    static createPong(pingId) {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.PONG,
            { received_id: pingId }
        );
    }

    /**
     * Create a transaction request message
     */
    static createTxRequest(chainId, to, value, data, nonce, gasPrice, gasLimit) {
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
    static createTxResponse(signedTx, txHash) {
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
    static createAck(receivedId) {
        return new Message(
            MessageProtocol.PROTOCOL_VERSION,
            MessageType.ACK,
            { received_id: receivedId }
        );
    }

    /**
     * Create an error message
     */
    static createError(message, receivedId = null) {
        const payload = { message };
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
    static validateVersion(message) {
        return message.version === MessageProtocol.PROTOCOL_VERSION;
    }
}