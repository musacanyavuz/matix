import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { language, setLanguage, t } = useLanguage();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={[styles.languageButton, language === 'tr' && styles.languageButtonActive]}
              onPress={() => setLanguage('tr')}
            >
              <Text style={[styles.languageButtonText, language === 'tr' && styles.languageButtonTextActive]}>
                🇹🇷 {t('settings.turkish')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.languageButtonText, language === 'en' && styles.languageButtonTextActive]}>
                🇬🇧 {t('settings.english')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

