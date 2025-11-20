import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/Button';

interface SearchResult {
  id: string;
  nickname: string;
  avatar: string;
}

export const AddFriendScreen: React.FC = () => {
  const navigation = useNavigation();
  const { searchUsers, sendFriendRequest, token, isAuthenticated } = useGame();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      Alert.alert('Uyarı', 'Arama sorgusu en az 2 karakter olmalıdır');
      return;
    }

    if (!isAuthenticated || !token) {
      Alert.alert('Hata', 'Arkadaş eklemek için giriş yapmanız gerekiyor');
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
      Alert.alert('Hata', error instanceof Error ? error.message : 'Kullanıcılar aranamadı');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (user: SearchResult) => {
    if (!isAuthenticated || !token) {
      Alert.alert('Hata', 'Arkadaşlık isteği göndermek için giriş yapmanız gerekiyor');
      return;
    }

    setSendingRequestId(user.id);
    try {
      await sendFriendRequest(user.nickname);
      Alert.alert('Başarılı', `${user.nickname} kullanıcısına arkadaşlık isteği gönderildi`);
      // İsteği gönderilen kullanıcıyı listeden kaldır
      setSearchResults(searchResults.filter(u => u.id !== user.id));
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Arkadaşlık isteği gönderilemedi');
    } finally {
      setSendingRequestId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔒</Text>
        <Text style={styles.emptyText}>Arkadaş eklemek için giriş yapmanız gerekiyor</Text>
        <Button
          title="Giriş Yap"
          onPress={() => navigation.navigate('Login' as never)}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>➕ Arkadaş Ekle</Text>
            <Text style={styles.subtitle}>Kullanıcı adı ile arama yapın</Text>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı adı girin (en az 2 karakter)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              title={searching ? 'Aranıyor...' : 'Ara'}
              onPress={handleSearch}
              variant="primary"
              disabled={searching || !searchQuery.trim() || searchQuery.trim().length < 2}
              loading={searching}
            />
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Arama Sonuçları ({searchResults.length})</Text>
              {searchResults.map((user) => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userAvatar}>{user.avatar}</Text>
                    <Text style={styles.userNickname}>{user.nickname}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      sendingRequestId === user.id && styles.addButtonDisabled,
                    ]}
                    onPress={() => handleSendRequest(user)}
                    disabled={sendingRequestId === user.id}
                  >
                    {sendingRequestId === user.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.addButtonText}>➕ İstek Gönder</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
              <Text style={styles.emptySubtext}>
                Farklı bir kullanıcı adı ile tekrar deneyin
              </Text>
            </View>
          )}

          {!searchQuery.trim() && searchResults.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Kullanıcı aramak için yukarıdaki alanı kullanın</Text>
              <Text style={styles.emptySubtext}>
                En az 2 karakter girerek arama yapabilirsiniz
              </Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    fontSize: 50,
    marginRight: 15,
  },
  userNickname: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

