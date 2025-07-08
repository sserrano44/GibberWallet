/**
 * GibberWallet - Sound-Based Airgap Wallet
 * React Native iOS Application
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { WalletSetupScreen } from './src/screens/WalletSetupScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { SecureStorage } from './src/lib/SecureStorage';

type AppState = 'loading' | 'setup' | 'ready';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [walletAddress, setWalletAddress] = useState<string>('');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if a wallet already exists
      const hasExistingWallet = await SecureStorage.hasPrivateKey();
      
      if (hasExistingWallet) {
        // Try to load the existing wallet
        const privateKey = await SecureStorage.getPrivateKey();
        if (privateKey) {
          // We have a wallet but don't want to expose the private key
          // The actual wallet loading will happen in WalletScreen
          setAppState('ready');
          // Set a placeholder address that will be updated by WalletScreen
          setWalletAddress('Loading...');
          return;
        }
      }
      
      // No existing wallet, show setup
      setAppState('setup');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the application. Please restart the app.',
        [
          {
            text: 'Retry',
            onPress: initializeApp,
          },
        ]
      );
    }
  };

  const handleWalletReady = (address: string) => {
    setWalletAddress(address);
    setAppState('ready');
  };

  const handleReset = async () => {
    try {
      await SecureStorage.deletePrivateKey();
      await SecureStorage.deleteConfig();
      setWalletAddress('');
      setAppState('setup');
    } catch (error) {
      console.error('Failed to reset wallet:', error);
      Alert.alert('Error', 'Failed to reset wallet');
    }
  };

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>GibberWallet</Text>
            <Text style={styles.loadingSubtitle}>Secure Offline Signing</Text>
            <Text style={styles.loadingText}>Initializing...</Text>
          </View>
        );
        
      case 'setup':
        return <WalletSetupScreen onWalletReady={handleWalletReady} />;
        
      case 'ready':
        return (
          <WalletScreen
            walletAddress={walletAddress}
            onReset={handleReset}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#f5f5f5"
      />
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loadingSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
});

export default App;
