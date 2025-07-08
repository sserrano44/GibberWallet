#!/usr/bin/env node

import { Message, MessageProtocol } from './src/message-protocol.js';

console.log('Testing NodePoC and GibberWeb protocol compatibility...\n');

// Test CONNECT message
const connectMsg = MessageProtocol.createConnect();
console.log('NodePoC CONNECT message:');
console.log(connectMsg.toJSON());
console.log();

// Test CONNECT_RESPONSE message
const connectResponse = MessageProtocol.createConnectResponse(
    '0x1234567890123456789012345678901234567890',
    connectMsg.id
);
console.log('NodePoC CONNECT_RESPONSE message:');
console.log(connectResponse.toJSON());
console.log();

// Test TX_REQUEST message
const txRequest = MessageProtocol.createTxRequest(
    1, // chainId
    '0x1234567890123456789012345678901234567890', // to
    '1000000000000000000', // value (1 ETH)
    '0x', // data
    5, // nonce
    '20000000000', // gasPrice (20 Gwei)
    '21000' // gasLimit
);
console.log('NodePoC TX_REQUEST message:');
console.log(txRequest.toJSON());
console.log();

// Test TX_RESPONSE message  
const txResponse = MessageProtocol.createTxResponse(
    '0xf86c0585...',  // signed tx
    '0xabcdef...'     // tx hash
);
console.log('NodePoC TX_RESPONSE message:');
console.log(txResponse.toJSON());
console.log();

console.log('Expected GibberWeb message formats should match the above.');
console.log('\nProtocol version:', MessageProtocol.PROTOCOL_VERSION);