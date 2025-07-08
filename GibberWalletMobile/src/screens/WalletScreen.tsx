import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { OfflineWallet, TransactionApprovalRequest } from '../lib/OfflineWallet';
import { AudioStatus } from '../components/AudioStatus';
import { TransactionApproval } from '../components/TransactionApproval';
import { WalletInfo } from '../components/WalletInfo';

interface WalletScreenProps {
  walletAddress: string;
  onReset: () => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ walletAddress, onReset }) => {
  const [wallet] = useState(() => new OfflineWallet());
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionApprovalRequest | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing wallet...');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeWallet();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const initializeWallet = async () => {
    try {
      setStatusMessage('Loading wallet from secure storage...');
      
      const success = await wallet.loadFromStorage();
      if (!success) {
        Alert.alert('Error', 'Failed to load wallet from storage');
        onReset();
        return;
      }

      setIsInitialized(true);
      setStatusMessage('Wallet ready');

      // Set up event listeners
      wallet.on('transactionRequest', handleTransactionRequest);
      wallet.on('listeningStarted', () => {
        setIsListening(true);
        setStatusMessage('Listening for transactions...');
      });
      wallet.on('listeningStopped', () => {
        setIsListening(false);
        setStatusMessage('Not listening');
      });
      wallet.on('audioLevelChanged', setAudioLevel);
      wallet.on('error', handleError);

    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      Alert.alert('Error', 'Failed to initialize wallet');
      onReset();
    }
  };

  const cleanup = async () => {
    try {
      await wallet.destroy();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleTransactionRequest = (request: TransactionApprovalRequest) => {
    console.log('Transaction request received');
    setCurrentTransaction(request);
    setStatusMessage('Transaction approval required');
  };

  const handleError = (error: Error) => {
    console.error('Wallet error:', error);
    Alert.alert('Wallet Error', error.message);
  };

  const toggleListening = async () => {
    try {
      if (isListening) {
        await wallet.stop();
      } else {
        await wallet.start();
      }
    } catch (error) {
      console.error('Failed to toggle listening:', error);
      Alert.alert('Error', 'Failed to change listening state');
    }
  };

  const approveTransaction = async () => {
    if (!currentTransaction) return;

    try {
      setStatusMessage('Signing transaction...');
      const success = await wallet.approveTransaction(currentTransaction.message);
      
      if (success) {
        setStatusMessage('Transaction signed and sent');
        setCurrentTransaction(null);
        
        // Show success message briefly
        setTimeout(() => {
          if (isListening) {
            setStatusMessage('Listening for transactions...');
          } else {
            setStatusMessage('Wallet ready');
          }
        }, 3000);
      } else {
        setStatusMessage('Failed to sign transaction');
      }
    } catch (error) {
      console.error('Failed to approve transaction:', error);
      Alert.alert('Error', 'Failed to approve transaction');
      setStatusMessage('Transaction approval failed');
    }
  };

  const rejectTransaction = async () => {
    if (!currentTransaction) return;

    try {
      await wallet.rejectTransaction(currentTransaction.message);
      setCurrentTransaction(null);
      setStatusMessage(isListening ? 'Listening for transactions...' : 'Wallet ready');
    } catch (error) {
      console.error('Failed to reject transaction:', error);
    }
  };

  const resetWallet = () => {
    Alert.alert(
      'Reset Wallet',
      'This will delete your wallet from this device. Make sure you have backed up your private key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: onReset,
        },
      ]
    );
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.title}>GibberWallet</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>GibberWallet</Text>
      <Text style={styles.subtitle}>Offline Transaction Signer</Text>

      <WalletInfo address={walletAddress} />

      <AudioStatus
        isListening={isListening}
        audioLevel={audioLevel}
        statusMessage={statusMessage}
        pulseAnim={pulseAnim}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio Control</Text>
        <TouchableOpacity
          style={[
            styles.button,
            isListening ? styles.stopButton : styles.startButton,
          ]}
          onPress={toggleListening}
        >
          <Text style={styles.buttonText}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.helpText}>
          {isListening
            ? 'The wallet is listening for transaction requests via sound'
            : 'Start listening to receive transaction requests from the web client'}
        </Text>
      </View>

      {currentTransaction && (
        <TransactionApproval
          transaction={currentTransaction}
          onApprove={approveTransaction}
          onReject={rejectTransaction}
        />
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={resetWallet}
        >
          <Text style={styles.buttonText}>Reset Wallet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>💡 How to Use</Text>
        <Text style={styles.infoText}>
          1. Tap "Start Listening" to enable audio reception
        </Text>
        <Text style={styles.infoText}>
          2. Use the web client to initiate a transaction
        </Text>
        <Text style={styles.infoText}>
          3. Keep devices close together (1-2 meters)
        </Text>
        <Text style={styles.infoText}>
          4. Approve or reject transactions as they arrive
        </Text>
        <Text style={styles.infoText}>
          5. The signed transaction is sent back via sound
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  statusMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF9500',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    marginBottom: 5,
    lineHeight: 20,
  },
});