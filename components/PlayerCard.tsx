import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player } from '../contexts/GameContext';

interface PlayerCardProps {
  player: Player;
  isCurrentUser?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isCurrentUser = false }) => {
  return (
    <View style={[styles.container, isCurrentUser && styles.currentUserContainer]}>
      <Text style={styles.avatar}>{player.avatar}</Text>
      <Text style={styles.nickname} numberOfLines={1}>
        {player.nickname}
      </Text>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Skor</Text>
        <Text style={styles.scoreValue}>{player.score}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  currentUserContainer: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  avatar: {
    fontSize: 50,
    marginBottom: 8,
  },
  nickname: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    maxWidth: 100,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

