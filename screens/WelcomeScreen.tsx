import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { clearAllData } = useGame();

  // Uygulama açıldığında storage'ı temizle (geliştirme için)
  React.useEffect(() => {
    // Geliştirme modunda otomatik temizleme için yorum satırını kaldırın
    // clearAllData();
  }, []);

  const handleGuestMode = () => {
    // Misafir modu - direkt Room ekranına git
    (navigation as any).navigate('Room');
  };

  const handleRegister = () => {
    (navigation as any).navigate('Register');
  };

  const handleLogin = () => {
    (navigation as any).navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🎮 Matix</Text>
          <Text style={styles.subtitle}>Matematik Yarışması</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRegister}
          >
            <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleLogin}
          >
            <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.guestButton]}
            onPress={handleGuestMode}
          >
            <Text style={styles.guestButtonText}>Misafir olarak devam et</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.infoText}>
          Kayıt olarak skorlarınızı kaydedebilir ve liderlik tablosunda yer alabilirsiniz!
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 24,
    color: '#666',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guestButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  guestButtonText: {
    color: '#666',
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});

