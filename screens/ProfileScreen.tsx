import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AvatarSelector } from '../components/AvatarSelector';
import { AgeGroupSelector } from '../components/AgeGroupSelector';
import { Button } from '../components/Button';
import { AgeGroup } from '../constants/ageGroups';

const SOCKET_URL = 'http://192.168.1.107:3001';

interface UserStats {
  totalScore: number;
  totalGames: number;
  wonGames: number;
  winRate: string;
  leaderboardPosition: number | null;
}

export const ProfileScreen: React.FC = () => {
  const { user, setUser, userId, isAuthenticated, token, logout, convertGuestToUser } = useGame();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '🐱');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(user?.ageGroup || null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isEditing, setIsEditing] = useState(!user); // Yeni kullanıcıysa düzenleme modu
  const [showGuestRegister, setShowGuestRegister] = useState(false); // Misafir kayıt formu
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // İstatistikleri yükle (kayıtlı kullanıcılar için)
  useEffect(() => {
    if (isAuthenticated && userId && token) {
      loadStats();
    }
  }, [isAuthenticated, userId, token]);

  // Profil bilgilerini güncelle
  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setSelectedAvatar(user.avatar);
      setSelectedAgeGroup(user.ageGroup);
    }
  }, [user]);

  const loadStats = async () => {
    if (!userId || !token) return;
    
    setLoadingStats(true);
    try {
      const response = await fetch(`${SOCKET_URL}/api/users/stats/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSave = async () => {
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
      // Kayıtlı kullanıcıysa API'ye gönder
      if (isAuthenticated && token) {
        const response = await fetch(`${SOCKET_URL}/api/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            nickname: nickname.trim(),
            avatar: selectedAvatar,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Profil güncellenemedi');
        }

        const data = await response.json();
        // Local state'i güncelle
        await setUser({
          nickname: data.data.nickname,
          avatar: data.data.avatar,
          ageGroup: selectedAgeGroup,
        });
      } else {
        // Misafir kullanıcı - önce backend'de kullanıcı oluştur (eğer yoksa)
        let guestUserId = userId;
        
        if (!guestUserId) {
          try {
            const createResponse = await fetch(`${SOCKET_URL}/api/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                nickname: nickname.trim(),
                avatar: selectedAvatar,
              }),
            });

            if (createResponse.ok) {
              const createData = await createResponse.json();
              guestUserId = createData.data.id;
              console.log('✅ Misafir kullanıcı backend\'de oluşturuldu:', guestUserId);
            } else {
              const errorText = await createResponse.text();
              console.warn('⚠️ Backend kullanıcı oluşturma hatası:', errorText);
              // Backend hatası olsa bile local storage'a kaydet (offline mod)
            }
          } catch (error) {
            console.warn('⚠️ Backend bağlantı hatası (offline mod):', error);
            // Network hatası olsa bile local storage'a kaydet (offline mod)
            // Kullanıcı daha sonra bağlandığında userId oluşturulabilir
          }
        }
        
        // Local storage'a kaydet (userId ile birlikte, backend bağlantısı olsa da olmasa da)
        try {
          await setUser({
            nickname: nickname.trim(),
            avatar: selectedAvatar,
            ageGroup: selectedAgeGroup,
          }, guestUserId || null);
        } catch (setUserError) {
          console.error('setUser hatası:', setUserError);
          // setUser hatası olsa bile devam et
        }
      }

      setIsEditing(false);
      if (!user) {
        // İlk kez profil oluşturuyorsa Room ekranına git
        (navigation as any).navigate('Room');
      } else {
        Alert.alert('Başarılı', 'Profil güncellendi!');
      }
    } catch (error) {
      console.error('Profil kaydetme hatası:', error);
      Alert.alert('Hata', error instanceof Error ? error.message : 'Profil kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestRegister = async () => {
    if (!guestEmail.trim()) {
      Alert.alert('Hata', 'Lütfen email adresinizi girin.');
      return;
    }

    if (!guestPassword || guestPassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (guestPassword !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    if (!nickname.trim()) {
      Alert.alert('Hata', 'Lütfen bir takma ad girin.');
      return;
    }

    if (!selectedAgeGroup) {
      Alert.alert('Hata', 'Lütfen bir yaş veya sınıf seçin.');
      return;
    }

    setLoading(true);

    try {
      await convertGuestToUser(
        guestEmail.trim(),
        guestPassword,
        nickname.trim(),
        selectedAvatar,
        selectedAgeGroup
      );

      Alert.alert('Başarılı', 'Hesabınız oluşturuldu! Skorlarınız korundu.', [
        {
          text: 'Tamam',
          onPress: () => {
            setShowGuestRegister(false);
            loadStats();
          },
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kayıt başarısız';
      
      // Eğer kullanıcı zaten kayıtlıysa, login ekranına yönlendir
      if (errorMessage.includes('zaten kayıtlı') || errorMessage.includes('giriş yapın')) {
        Alert.alert(
          'Bilgi',
          'Bu kullanıcı zaten kayıtlı. Lütfen giriş yapın.',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Giriş Yap',
              onPress: () => {
                setShowGuestRegister(false);
                (navigation as any).navigate('Login');
              },
            },
          ]
        );
      } else {
        Alert.alert('Hata', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              (navigation as any).navigate('Welcome');
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılamadı');
            }
          },
        },
      ]
    );
  };

  // İstatistik kartı
  const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon: string }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🎮 Matix Oyunu</Text>
          <Text style={styles.subtitle}>
            {isAuthenticated ? 'Profilim' : 'Profil Oluştur'}
          </Text>
        </View>

        {/* İstatistikler (kayıtlı kullanıcılar için) */}
        {isAuthenticated && stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>📊 İstatistiklerim</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Toplam Skor" value={stats.totalScore} icon="🏆" />
              <StatCard label="Toplam Oyun" value={stats.totalGames} icon="🎮" />
              <StatCard label="Kazanma" value={`${stats.wonGames}`} icon="✅" />
              <StatCard 
                label="Kazanma Oranı" 
                value={`%${stats.winRate}`} 
                icon="📈" 
              />
            </View>
            {stats.leaderboardPosition && (
              <View style={styles.leaderboardBadge}>
                <Text style={styles.leaderboardText}>
                  🥇 Liderlik Sırası: {stats.leaderboardPosition}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.leaderboardButton}
              onPress={() => (navigation as any).navigate('Leaderboard')}
            >
              <Text style={styles.leaderboardButtonText}>🏆 {t('profile.viewLeaderboard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.leaderboardButton, styles.performanceButton]}
              onPress={() => (navigation as any).navigate('Performance')}
            >
              <Text style={styles.leaderboardButtonText}>📊 {t('profile.performance')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadingStats && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
          </View>
        )}

        {/* Profil Düzenleme */}
        <View style={styles.form}>
          {isAuthenticated && !isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>✏️ Profili Düzenle</Text>
            </TouchableOpacity>
          )}

          {isEditing ? (
            <>
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
                  editable={!loading}
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
                title={loading ? 'Kaydediliyor...' : 'Kaydet'}
                onPress={handleSave}
                variant="primary"
                disabled={loading}
              />

              {isAuthenticated && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    // Değişiklikleri geri al
                    if (user) {
                      setNickname(user.nickname);
                      setSelectedAvatar(user.avatar);
                      setSelectedAgeGroup(user.ageGroup);
                    }
                  }}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            // Sadece görüntüleme modu
            <View style={styles.viewMode}>
              <View style={styles.avatarDisplay}>
                <Text style={styles.avatarLarge}>{user?.avatar || '🐱'}</Text>
                <Text style={styles.nicknameDisplay}>{user?.nickname || 'Kullanıcı'}</Text>
              </View>
            </View>
          )}

          {/* Misafir kullanıcılar için kayıt ol butonu */}
          {!isAuthenticated && user && (
            <View style={styles.guestSection}>
              <Text style={styles.guestSectionTitle}>
                💡 Hesap oluşturarak skorlarınızı kaydedin!
              </Text>
              {!showGuestRegister ? (
                <TouchableOpacity
                  style={styles.guestRegisterButton}
                  onPress={() => setShowGuestRegister(true)}
                >
                  <Text style={styles.guestRegisterButtonText}>
                    Hesap Oluştur
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.guestRegisterForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={guestEmail}
                      onChangeText={setGuestEmail}
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
                      value={guestPassword}
                      onChangeText={setGuestPassword}
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
                  <Button
                    title={loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}
                    onPress={handleGuestRegister}
                    variant="primary"
                    disabled={loading}
                  />
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowGuestRegister(false);
                      setGuestEmail('');
                      setGuestPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Ayarlar Butonu */}
          <TouchableOpacity
            style={[styles.leaderboardButton, styles.settingsButton]}
            onPress={() => (navigation as any).navigate('Settings')}
          >
            <Text style={styles.leaderboardButtonText}>⚙️ {t('settings.title')}</Text>
          </TouchableOpacity>

          {/* Çıkış Yap butonu (kayıtlı kullanıcılar için) */}
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
            </TouchableOpacity>
          )}
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
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  leaderboardBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  leaderboardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
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
  editButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  viewMode: {
    alignItems: 'center',
    padding: 20,
  },
  avatarDisplay: {
    alignItems: 'center',
  },
  avatarLarge: {
    fontSize: 80,
    marginBottom: 10,
  },
  nicknameDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  guestSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  guestSectionTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  guestRegisterButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  guestRegisterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestRegisterForm: {
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboardButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  performanceButton: {
    backgroundColor: '#2196F3',
    marginTop: 10,
  },
  settingsButton: {
    backgroundColor: '#9C27B0',
    marginTop: 10,
  },
  leaderboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
