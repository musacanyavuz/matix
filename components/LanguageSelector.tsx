import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, language === 'tr' && styles.buttonActive]}
        onPress={() => setLanguage('tr')}
      >
        <Text style={[styles.buttonText, language === 'tr' && styles.buttonTextActive]}>
          🇹🇷 TR
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, language === 'en' && styles.buttonActive]}
        onPress={() => setLanguage('en')}
      >
        <Text style={[styles.buttonText, language === 'en' && styles.buttonTextActive]}>
          🇬🇧 EN
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 10,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonTextActive: {
    fontWeight: 'bold',
    fontSize: 13,
  },
});

