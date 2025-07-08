//
//  GGWaveModule.h
//  GibberWalletMobile
//
//  Created by Claude Code on 2025-07-08.
//  Copyright © 2025 GibberWallet. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@interface GGWaveModule : RCTEventEmitter <RCTBridgeModule>

// Audio protocol parameters
@property (nonatomic, assign) int sampleRate;
@property (nonatomic, assign) int payloadLength;
@property (nonatomic, assign) int protocolId;
@property (nonatomic, assign) int volume;

// State properties
@property (nonatomic, assign, readonly) BOOL isInitialized;
@property (nonatomic, assign, readonly) BOOL isListening;
@property (nonatomic, assign, readonly) BOOL isTransmitting;

// Public methods exposed to React Native
- (void)initialize:(NSDictionary *)params
          resolver:(RCTPromiseResolveBlock)resolve
          rejecter:(RCTPromiseRejectBlock)reject;

- (void)startListening:(RCTPromiseResolveBlock)resolve
              rejecter:(RCTPromiseRejectBlock)reject;

- (void)stopListening:(RCTPromiseResolveBlock)resolve
             rejecter:(RCTPromiseRejectBlock)reject;

- (void)transmitMessage:(NSString *)message
               resolver:(RCTPromiseResolveBlock)resolve
               rejecter:(RCTPromiseRejectBlock)reject;

- (void)isListeningState:(RCTPromiseResolveBlock)resolve
                rejecter:(RCTPromiseRejectBlock)reject;

- (void)isTransmittingState:(RCTPromiseResolveBlock)resolve
                   rejecter:(RCTPromiseRejectBlock)reject;

- (void)getAudioLevel:(RCTPromiseResolveBlock)resolve
             rejecter:(RCTPromiseRejectBlock)reject;

- (void)destroy:(RCTPromiseResolveBlock)resolve
       rejecter:(RCTPromiseRejectBlock)reject;

@end

NS_ASSUME_NONNULL_END