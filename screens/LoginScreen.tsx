import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login } = useGame();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validasyon
    if (!username.trim()) {
      Alert.alert(t('common.error'), t('login.enterUsername'));
      return;
    }

    if (!password) {
      Alert.alert(t('common.error'), t('login.enterPassword'));
      return;
    }

    setLoading(true);

    try {
      await login(username.trim(), password);

      Alert.alert(t('common.success'), t('login.loginSuccess'), [
        {
          text: 'Tamam',
          onPress: () => {
            (navigation as any).navigate('Room');
          },
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('login.login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('login.title')}</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('login.username')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t('login.usernamePlaceholder')}
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('login.password')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t('login.passwordPlaceholder')}
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <Button
            title={loading ? t('login.loggingIn') : t('login.login')}
            onPress={handleLogin}
            variant="primary"
            disabled={loading}
          />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => (navigation as any).navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              {t('login.noAccountAction')} <Text style={styles.registerLinkBold}>{t('login.registerAction')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    position: 'relative',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    color: '#333',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
    color: '#666',
  },
  registerLinkBold: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

