import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

interface WalletInfoProps {
  address: string;
}

export const WalletInfo: React.FC<WalletInfoProps> = ({ address }) => {
  const formatAddress = (addr: string) => {
    if (addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async () => {
    try {
      Clipboard.setString(address);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Wallet Information</Text>
      
      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Your Address:</Text>
        <TouchableOpacity onPress={copyToClipboard} style={styles.addressTouchable}>
          <Text style={styles.addressShort}>{formatAddress(address)}</Text>
          <Text style={styles.addressFull}>{address}</Text>
          <Text style={styles.copyHint}>Tap to copy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Network:</Text>
        <Text style={styles.infoValue}>All EVM Compatible</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Mode:</Text>
        <Text style={styles.infoValue}>Offline (Airgapped)</Text>
      </View>

      <View style={styles.securityContainer}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityText}>
          Your private key is stored securely on this device and never transmitted
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  addressContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  addressTouchable: {
    alignItems: 'center',
  },
  addressShort: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Monaco',
    marginBottom: 5,
  },
  addressFull: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Monaco',
    marginBottom: 5,
  },
  copyHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#2d6e2d',
    lineHeight: 18,
  },
});