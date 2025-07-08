//
//  GGWaveModule.m
//  GibberWalletMobile
//
//  Created by Claude Code on 2025-07-08.
//  Copyright © 2025 GibberWallet. All rights reserved.
//

#import "GGWaveModule.h"
#import <React/RCTLog.h>
#import <AudioToolbox/AudioToolbox.h>
#import <AVFoundation/AVFoundation.h>

// TODO: Import ggwave library headers once integrated
// #import "ggwave.h"

@interface GGWaveModule () {
    // Audio session and components
    AVAudioSession *audioSession;
    AVAudioEngine *audioEngine;
    AVAudioPlayerNode *playerNode;
    AVAudioMixerNode *mixerNode;
    
    // ggwave instance - will be properly typed once ggwave is integrated
    void *ggwaveInstance;
    
    // Audio level monitoring
    float currentAudioLevel;
    NSTimer *audioLevelTimer;
    
    // State management
    BOOL _isInitialized;
    BOOL _isListening;
    BOOL _isTransmitting;
}

@end

@implementation GGWaveModule

// Synthesize readonly properties
@synthesize isInitialized = _isInitialized;
@synthesize isListening = _isListening;
@synthesize isTransmitting = _isTransmitting;

// MARK: - React Native Bridge Setup

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"onMessageReceived",
        @"onListeningStarted",
        @"onListeningStopped",
        @"onTransmissionStarted",
        @"onTransmissionCompleted",
        @"onAudioLevelChanged",
        @"onError"
    ];
}

// MARK: - Lifecycle

- (instancetype)init {
    self = [super init];
    if (self) {
        _isInitialized = NO;
        _isListening = NO;
        _isTransmitting = NO;
        currentAudioLevel = 0.0f;
        
        // Set default parameters
        self.sampleRate = 48000;
        self.payloadLength = -1;
        self.protocolId = 1; // AUDIBLE_FAST
        self.volume = 15;
        
        // Initialize audio components
        [self setupAudioSession];
    }
    return self;
}

- (void)dealloc {
    [self cleanup];
}

// MARK: - Audio Session Setup

- (void)setupAudioSession {
    audioSession = [AVAudioSession sharedInstance];
    
    NSError *error;
    BOOL success = [audioSession setCategory:AVAudioSessionCategoryPlayAndRecord
                                 withOptions:AVAudioSessionCategoryOptionDefaultToSpeaker | AVAudioSessionCategoryOptionAllowBluetooth
                                       error:&error];
    
    if (!success) {
        RCTLogError(@"Failed to set audio session category: %@", error.localizedDescription);
        return;
    }
    
    success = [audioSession setMode:AVAudioSessionModeDefault error:&error];
    if (!success) {
        RCTLogError(@"Failed to set audio session mode: %@", error.localizedDescription);
        return;
    }
}

// MARK: - React Native Exported Methods

RCT_EXPORT_METHOD(initialize:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (_isInitialized) {
        resolve(@YES);
        return;
    }
    
    // Update parameters from React Native
    if (params[@"sampleRate"]) {
        self.sampleRate = [params[@"sampleRate"] intValue];
    }
    if (params[@"payloadLength"]) {
        self.payloadLength = [params[@"payloadLength"] intValue];
    }
    if (params[@"protocolId"]) {
        self.protocolId = [params[@"protocolId"] intValue];
    }
    if (params[@"volume"]) {
        self.volume = [params[@"volume"] intValue];
    }
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        BOOL success = [self initializeGGWave];
        
        dispatch_async(dispatch_get_main_queue(), ^{
            if (success) {
                self->_isInitialized = YES;
                resolve(@YES);
            } else {
                reject(@"INITIALIZATION_FAILED", @"Failed to initialize ggwave", nil);
            }
        });
    });
}

RCT_EXPORT_METHOD(startListening:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!_isInitialized) {
        reject(@"NOT_INITIALIZED", @"GGWave not initialized", nil);
        return;
    }
    
    if (_isListening) {
        resolve(@YES);
        return;
    }
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        BOOL success = [self startAudioListening];
        
        dispatch_async(dispatch_get_main_queue(), ^{
            if (success) {
                self->_isListening = YES;
                [self sendEventWithName:@"onListeningStarted" body:@{}];
                resolve(@YES);
            } else {
                reject(@"LISTENING_FAILED", @"Failed to start listening", nil);
            }
        });
    });
}

RCT_EXPORT_METHOD(stopListening:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!_isListening) {
        resolve(@YES);
        return;
    }
    
    BOOL success = [self stopAudioListening];
    
    if (success) {
        _isListening = NO;
        [self sendEventWithName:@"onListeningStopped" body:@{}];
        resolve(@YES);
    } else {
        reject(@"STOP_LISTENING_FAILED", @"Failed to stop listening", nil);
    }
}

RCT_EXPORT_METHOD(transmitMessage:(NSString *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!_isInitialized) {
        reject(@"NOT_INITIALIZED", @"GGWave not initialized", nil);
        return;
    }
    
    if (_isTransmitting) {
        reject(@"ALREADY_TRANSMITTING", @"Already transmitting", nil);
        return;
    }
    
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [self sendEventWithName:@"onTransmissionStarted" body:@{}];
        self->_isTransmitting = YES;
        
        BOOL success = [self transmitAudioMessage:message];
        
        dispatch_async(dispatch_get_main_queue(), ^{
            self->_isTransmitting = NO;
            [self sendEventWithName:@"onTransmissionCompleted" body:@{@"success": @(success)}];
            
            if (success) {
                resolve(@{@"success": @YES});
            } else {
                resolve(@{@"success": @NO, @"error": @"Transmission failed"});
            }
        });
    });
}

RCT_EXPORT_METHOD(isListeningState:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(_isListening));
}

RCT_EXPORT_METHOD(isTransmittingState:(RCTPromiseResolveBlock)resolve
                   rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(_isTransmitting));
}

RCT_EXPORT_METHOD(getAudioLevel:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    resolve(@(currentAudioLevel));
}

RCT_EXPORT_METHOD(destroy:(RCTPromiseResolveBlock)resolve
           rejecter:(RCTPromiseRejectBlock)reject) {
    
    [self cleanup];
    resolve(@YES);
}

// MARK: - Private Implementation Methods

- (BOOL)initializeGGWave {
    // TODO: Initialize ggwave library once integrated
    // This is a placeholder implementation
    
    RCTLogInfo(@"Initializing GGWave with sampleRate: %d, protocolId: %d, volume: %d", 
               self.sampleRate, self.protocolId, self.volume);
    
    // Placeholder - would initialize ggwave instance here
    ggwaveInstance = NULL; // Will be actual ggwave instance
    
    // Start audio level monitoring
    [self startAudioLevelMonitoring];
    
    return YES; // Would return actual initialization result
}

- (BOOL)startAudioListening {
    // TODO: Implement actual audio listening with ggwave
    // This is a placeholder implementation
    
    NSError *error;
    BOOL success = [audioSession setActive:YES error:&error];
    
    if (!success) {
        RCTLogError(@"Failed to activate audio session: %@", error.localizedDescription);
        return NO;
    }
    
    RCTLogInfo(@"Started audio listening");
    return YES;
}

- (BOOL)stopAudioListening {
    // TODO: Implement actual stop listening
    // This is a placeholder implementation
    
    RCTLogInfo(@"Stopped audio listening");
    return YES;
}

- (BOOL)transmitAudioMessage:(NSString *)message {
    // TODO: Implement actual audio transmission with ggwave
    // This is a placeholder implementation
    
    RCTLogInfo(@"Transmitting message: %@", message);
    
    // Simulate transmission delay
    [NSThread sleepForTimeInterval:1.0];
    
    return YES; // Would return actual transmission result
}

- (void)startAudioLevelMonitoring {
    audioLevelTimer = [NSTimer scheduledTimerWithTimeInterval:0.1
                                                       target:self
                                                     selector:@selector(updateAudioLevel)
                                                     userInfo:nil
                                                      repeats:YES];
}

- (void)updateAudioLevel {
    // TODO: Get actual audio level from ggwave or AVAudioEngine
    // This is a placeholder implementation
    
    // Simulate audio level changes
    currentAudioLevel = arc4random_uniform(100) / 100.0f;
    
    [self sendEventWithName:@"onAudioLevelChanged" body:@{@"level": @(currentAudioLevel)}];
}

- (void)cleanup {
    [audioLevelTimer invalidate];
    audioLevelTimer = nil;
    
    if (_isListening) {
        [self stopAudioListening];
    }
    
    // TODO: Cleanup ggwave instance
    if (ggwaveInstance) {
        // ggwave_destroy(ggwaveInstance);
        ggwaveInstance = NULL;
    }
    
    _isInitialized = NO;
    _isListening = NO;
    _isTransmitting = NO;
}

@end