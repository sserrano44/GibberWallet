import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { TransactionApprovalRequest } from '../lib/OfflineWallet';
import { CryptoUtils } from '../lib/CryptoUtils';

interface TransactionApprovalProps {
  transaction: TransactionApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}

export const TransactionApproval: React.FC<TransactionApprovalProps> = ({
  transaction,
  onApprove,
  onReject,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { transaction: txData, formattedTransaction } = transaction;

  const getTransactionType = () => {
    if (txData.data && txData.data !== '0x') {
      return 'Smart Contract Interaction';
    }
    return 'ETH Transfer';
  };

  const getValueInEth = () => {
    try {
      return CryptoUtils.weiToEth(txData.value);
    } catch {
      return '0';
    }
  };

  const formatGasPrice = () => {
    try {
      const gasPriceWei = CryptoUtils.parseHexToNumber(txData.gasPrice);
      return `${(gasPriceWei / 1e9).toFixed(2)} Gwei`;
    } catch {
      return txData.gasPrice;
    }
  };

  const calculateMaxFee = () => {
    try {
      const gasLimit = CryptoUtils.parseHexToNumber(txData.gasLimit);
      const gasPrice = CryptoUtils.parseHexToNumber(txData.gasPrice);
      const maxFeeWei = gasLimit * gasPrice;
      return CryptoUtils.weiToEth(maxFeeWei.toString());
    } catch {
      return 'Unknown';
    }
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Transaction',
      'Are you sure you want to sign and send this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: onApprove,
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Transaction',
      'Are you sure you want to reject this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: onReject,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerIcon}>⚠️</Text>
        <Text style={styles.headerTitle}>Transaction Approval Required</Text>
      </View>

      <View style={styles.transactionContainer}>
        <View style={styles.transactionRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={[styles.value, styles.typeValue]}>{getTransactionType()}</Text>
        </View>

        <View style={styles.transactionRow}>
          <Text style={styles.label}>To:</Text>
          <Text style={[styles.value, styles.addressValue]}>
            {`${txData.to.slice(0, 8)}...${txData.to.slice(-6)}`}
          </Text>
        </View>

        <View style={styles.transactionRow}>
          <Text style={styles.label}>Value:</Text>
          <Text style={[styles.value, styles.amountValue]}>
            {getValueInEth()} ETH
          </Text>
        </View>

        <View style={styles.transactionRow}>
          <Text style={styles.label}>Network:</Text>
          <Text style={styles.value}>Chain ID {txData.chainId}</Text>
        </View>

        <View style={styles.transactionRow}>
          <Text style={styles.label}>Gas Price:</Text>
          <Text style={styles.value}>{formatGasPrice()}</Text>
        </View>

        <View style={styles.transactionRow}>
          <Text style={styles.label}>Max Fee:</Text>
          <Text style={styles.value}>{calculateMaxFee()} ETH</Text>
        </View>

        {txData.data && txData.data !== '0x' && (
          <View style={styles.dataContainer}>
            <TouchableOpacity
              onPress={() => setIsExpanded(!isExpanded)}
              style={styles.dataHeader}
            >
              <Text style={styles.label}>Transaction Data:</Text>
              <Text style={styles.expandIcon}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            {isExpanded && (
              <ScrollView style={styles.dataScroll} nestedScrollEnabled>
                <Text style={styles.dataText}>{txData.data}</Text>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <View style={styles.warningContainer}>
        <Text style={styles.warningText}>
          ⚠️ Carefully review all transaction details before approving
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={handleReject}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={handleApprove}
        >
          <Text style={styles.buttonText}>Approve & Sign</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff8dc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ffa500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  transactionContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#666',
    flex: 2,
    textAlign: 'right',
  },
  typeValue: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addressValue: {
    fontFamily: 'Monaco',
    fontSize: 14,
  },
  amountValue: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 18,
  },
  dataContainer: {
    marginTop: 10,
  },
  dataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  expandIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  dataScroll: {
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 10,
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'Monaco',
    color: '#666',
    lineHeight: 16,
  },
  warningContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#c62828',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});