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
import { AvatarSelector } from '../components/AvatarSelector';
import { AgeGroupSelector } from '../components/AgeGroupSelector';
import { AgeGroup } from '../constants/ageGroups';
import { Button } from '../components/Button';
import { useGame } from '../contexts/GameContext';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { register } = useGame();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🐱');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validasyon
    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen email adresinizi girin.');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    if (!nickname.trim()) {
      Alert.alert('Hata', 'Lütfen bir takma ad girin.');
      return;
    }

    if (nickname.length > 15) {
      Alert.alert('Hata', 'Takma ad en fazla 15 karakter olabilir.');
      return;
    }

    if (!selectedAgeGroup) {
      Alert.alert('Hata', 'Lütfen bir yaş veya sınıf seçin.');
      return;
    }

    setLoading(true);

    try {
      await register(
        email.trim(),
        password,
        nickname.trim(),
        selectedAvatar,
        selectedAgeGroup
      );

      Alert.alert('Başarılı', 'Kayıt işlemi tamamlandı!', [
        {
          text: 'Tamam',
          onPress: () => {
            (navigation as any).navigate('Room');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Kayıt başarısız');
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
          <Text style={styles.title}>Kayıt Ol</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Şifre (Min. 6 karakter)</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Şifre Tekrar</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Takma Adınız</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Örn: Süper Çocuk"
              placeholderTextColor="#999"
              maxLength={15}
              autoCapitalize="words"
            />
          </View>

          <AvatarSelector
            selectedAvatar={selectedAvatar}
            onSelect={setSelectedAvatar}
          />

          <AgeGroupSelector
            selectedAgeGroup={selectedAgeGroup}
            onSelect={setSelectedAgeGroup}
          />

          <Button
            title={loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
            onPress={handleRegister}
            variant="primary"
            disabled={loading}
          />
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
  },
  header: {
    marginBottom: 20,
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
});

