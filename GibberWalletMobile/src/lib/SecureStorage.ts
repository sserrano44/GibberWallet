import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure storage utility for managing sensitive data like private keys
 */
export class SecureStorage {
  private static readonly PRIVATE_KEY_SERVICE = 'GibberWallet_PrivateKey';
  private static readonly WALLET_CONFIG_KEY = 'GibberWallet_Config';

  /**
   * Store private key securely in iOS Keychain
   */
  static async storePrivateKey(
    privateKey: string,
    alias: string = 'default'
  ): Promise<boolean> {
    try {
      const options: Keychain.Options = {
        service: SecureStorage.PRIVATE_KEY_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        authenticatePrompt: 'Authenticate to access your wallet',
      };

      await Keychain.setInternetCredentials(
        SecureStorage.PRIVATE_KEY_SERVICE,
        alias,
        privateKey,
        options
      );

      return true;
    } catch (error) {
      console.error('Failed to store private key:', error);
      return false;
    }
  }

  /**
   * Retrieve private key from iOS Keychain
   */
  static async getPrivateKey(alias: string = 'default'): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(
        SecureStorage.PRIVATE_KEY_SERVICE
      );

      if (credentials && credentials.username === alias) {
        return credentials.password;
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve private key:', error);
      return null;
    }
  }

  /**
   * Check if private key exists
   */
  static async hasPrivateKey(alias: string = 'default'): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(
        SecureStorage.PRIVATE_KEY_SERVICE
      );

      return credentials && credentials.username === alias;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete private key from storage
   */
  static async deletePrivateKey(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials(SecureStorage.PRIVATE_KEY_SERVICE);
      return true;
    } catch (error) {
      console.error('Failed to delete private key:', error);
      return false;
    }
  }

  /**
   * Store non-sensitive configuration data
   */
  static async storeConfig(config: Record<string, any>): Promise<boolean> {
    try {
      await AsyncStorage.setItem(
        SecureStorage.WALLET_CONFIG_KEY,
        JSON.stringify(config)
      );
      return true;
    } catch (error) {
      console.error('Failed to store config:', error);
      return false;
    }
  }

  /**
   * Retrieve configuration data
   */
  static async getConfig(): Promise<Record<string, any> | null> {
    try {
      const configStr = await AsyncStorage.getItem(SecureStorage.WALLET_CONFIG_KEY);
      if (configStr) {
        return JSON.parse(configStr);
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve config:', error);
      return null;
    }
  }

  /**
   * Delete configuration data
   */
  static async deleteConfig(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(SecureStorage.WALLET_CONFIG_KEY);
      return true;
    } catch (error) {
      console.error('Failed to delete config:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported biometry type
   */
  static async getBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      return null;
    }
  }
}