import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface AudioStatusProps {
  isListening: boolean;
  audioLevel: number;
  statusMessage: string;
  pulseAnim: Animated.Value;
}

export const AudioStatus: React.FC<AudioStatusProps> = ({
  isListening,
  audioLevel,
  statusMessage,
  pulseAnim,
}) => {
  const renderAudioLevelBars = () => {
    const bars = [];
    const barCount = 10;
    const activeBarCount = Math.ceil((audioLevel / 100) * barCount);

    for (let i = 0; i < barCount; i++) {
      const isActive = i < activeBarCount;
      const height = 20 + (i * 3); // Increasing height
      
      bars.push(
        <View
          key={i}
          style={[
            styles.audioBar,
            {
              height,
              backgroundColor: isActive
                ? isListening
                  ? '#34C759'
                  : '#ccc'
                : '#eee',
            },
          ]}
        />
      );
    }

    return bars;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Audio Status</Text>
      
      <View style={styles.statusContainer}>
        <Animated.View
          style={[
            styles.statusIndicator,
            {
              backgroundColor: isListening ? '#34C759' : '#ccc',
              transform: [{ scale: isListening ? pulseAnim : 1 }],
            },
          ]}
        />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusText}>
            {isListening ? 'Listening' : 'Not Listening'}
          </Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </View>

      <View style={styles.audioLevelContainer}>
        <Text style={styles.audioLevelLabel}>Audio Level</Text>
        <View style={styles.audioLevelBars}>
          {renderAudioLevelBars()}
        </View>
        <Text style={styles.audioLevelValue}>{Math.round(audioLevel)}%</Text>
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 15,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  audioLevelContainer: {
    alignItems: 'center',
  },
  audioLevelLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  audioLevelBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 40,
    marginBottom: 10,
  },
  audioBar: {
    width: 8,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  audioLevelValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});