import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AVATARS } from '../constants/avatars';

interface AvatarSelectorProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selectedAvatar, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Avatar Seç</Text>
      <View style={styles.grid}>
        {AVATARS.map((avatar) => (
          <TouchableOpacity
            key={avatar.id}
            style={[
              styles.avatarButton,
              selectedAvatar === avatar.id && styles.avatarButtonSelected,
            ]}
            onPress={() => onSelect(avatar.id)}
          >
            <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  avatarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
    transform: [{ scale: 1.1 }],
  },
  avatarEmoji: {
    fontSize: 30,
  },
});

