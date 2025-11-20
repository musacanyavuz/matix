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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🐱');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validasyon
    if (!nickname.trim()) {
      Alert.alert('Hata', 'Lütfen bir kullanıcı adı girin.');
      return;
    }

    if (nickname.length < 3) {
      Alert.alert('Hata', 'Kullanıcı adı en az 3 karakter olmalıdır.');
      return;
    }

    if (nickname.length > 20) {
      Alert.alert('Hata', 'Kullanıcı adı en fazla 20 karakter olabilir.');
      return;
    }

    // Kullanıcı adı format kontrolü
    const nicknameRegex = /^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+$/;
    if (!nicknameRegex.test(nickname.trim())) {
      Alert.alert('Hata', 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir.');
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

    if (!selectedAgeGroup) {
      Alert.alert('Hata', 'Lütfen bir yaş veya sınıf seçin.');
      return;
    }

    setLoading(true);

    try {
      await register(
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
            <Text style={styles.label}>Kullanıcı Adı (Min. 3, Max. 20 karakter)</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Örn: super_cocuk"
              placeholderTextColor="#999"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hintText}>Sadece harf, rakam ve alt çizgi kullanabilirsiniz</Text>
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
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});

