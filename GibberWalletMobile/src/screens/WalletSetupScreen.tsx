import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { CryptoUtils } from '../lib/CryptoUtils';
import { SecureStorage } from '../lib/SecureStorage';

interface WalletSetupScreenProps {
  onWalletReady: (address: string) => void;
}

export const WalletSetupScreen: React.FC<WalletSetupScreenProps> = ({ onWalletReady }) => {
  const [privateKey, setPrivateKey] = useState('');
  const [isValidKey, setIsValidKey] = useState(false);
  const [previewAddress, setPreviewAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);
  const [useBiometrics, setUseBiometrics] = useState(true);
  const [biometryType, setBiometryType] = useState<string | null>(null);

  useEffect(() => {
    checkExistingWallet();
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (privateKey) {
      validatePrivateKey(privateKey);
    } else {
      setIsValidKey(false);
      setPreviewAddress('');
    }
  }, [privateKey]);

  const checkExistingWallet = async () => {
    const hasWallet = await SecureStorage.hasPrivateKey();
    setHasExistingWallet(hasWallet);
  };

  const checkBiometrics = async () => {
    const biometrySupported = await SecureStorage.getBiometryType();
    setBiometryType(biometrySupported);
    setUseBiometrics(biometrySupported !== null);
  };

  const validatePrivateKey = (key: string) => {
    const isValid = CryptoUtils.validatePrivateKey(key);
    setIsValidKey(isValid);
    
    if (isValid) {
      try {
        const address = CryptoUtils.getAddressFromPrivateKey(key);
        setPreviewAddress(address);
      } catch (error) {
        setIsValidKey(false);
        setPreviewAddress('');
      }
    } else {
      setPreviewAddress('');
    }
  };

  const generateNewWallet = () => {
    Alert.alert(
      'Generate New Wallet',
      'This will create a new private key. Make sure to back it up securely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            const newPrivateKey = CryptoUtils.generatePrivateKey();
            setPrivateKey(newPrivateKey);
          },
        },
      ]
    );
  };

  const loadExistingWallet = async () => {
    setIsLoading(true);
    try {
      const existingKey = await SecureStorage.getPrivateKey();
      if (existingKey) {
        const address = CryptoUtils.getAddressFromPrivateKey(existingKey);
        onWalletReady(address);
      } else {
        Alert.alert('Error', 'No existing wallet found');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load existing wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWallet = async () => {
    if (!isValidKey || !privateKey) {
      Alert.alert('Error', 'Please enter a valid private key');
      return;
    }

    setIsLoading(true);
    try {
      const success = await SecureStorage.storePrivateKey(privateKey);
      if (success) {
        Alert.alert('Success', 'Wallet saved securely', [
          {
            text: 'Continue',
            onPress: () => onWalletReady(previewAddress),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save wallet securely');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const clearWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'This will permanently delete your wallet. Make sure you have backed up your private key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await SecureStorage.deletePrivateKey();
            setHasExistingWallet(false);
            setPrivateKey('');
            Alert.alert('Success', 'Wallet deleted');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>GibberWallet Setup</Text>
      <Text style={styles.subtitle}>Secure Offline Transaction Signing</Text>

      {hasExistingWallet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Existing Wallet</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={loadExistingWallet}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Load Existing Wallet</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={clearWallet}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Delete Existing Wallet</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create or Import Wallet</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={generateNewWallet}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Generate New Wallet</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Or enter your private key:</Text>
        <TextInput
          style={[styles.textInput, !isValidKey && privateKey ? styles.invalidInput : null]}
          placeholder="Enter your private key (64 hex characters)"
          value={privateKey}
          onChangeText={setPrivateKey}
          multiline
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {privateKey && !isValidKey && (
          <Text style={styles.errorText}>Invalid private key format</Text>
        )}

        {isValidKey && previewAddress && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Wallet Address:</Text>
            <Text style={styles.previewAddress}>{previewAddress}</Text>
          </View>
        )}

        {biometryType && (
          <View style={styles.biometricOption}>
            <Text style={styles.label}>
              Use {biometryType} for wallet access
            </Text>
            <Switch
              value={useBiometrics}
              onValueChange={setUseBiometrics}
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (!isValidKey || isLoading) && styles.disabledButton,
          ]}
          onPress={saveWallet}
          disabled={!isValidKey || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Saving...' : 'Save Wallet'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.warningContainer}>
        <Text style={styles.warningTitle}>⚠️ Important Security Notes</Text>
        <Text style={styles.warningText}>
          • Your private key is stored securely on this device only
        </Text>
        <Text style={styles.warningText}>
          • Back up your private key safely - it cannot be recovered if lost
        </Text>
        <Text style={styles.warningText}>
          • Never share your private key with anyone
        </Text>
        <Text style={styles.warningText}>
          • This device should remain offline (airgapped) for maximum security
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
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
    fontFamily: 'Monaco',
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  invalidInput: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
  },
  previewContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  previewAddress: {
    fontSize: 14,
    fontFamily: 'Monaco',
    color: '#0066cc',
  },
  biometricOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
});