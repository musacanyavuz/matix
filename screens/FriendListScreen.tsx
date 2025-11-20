import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/Button';

interface Friend {
  id: string;
  nickname: string;
  avatar: string;
  totalScore: number;
}

export const FriendListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { getFriends, removeFriend, createRoom, token, isAuthenticated } = useGame();
  const { t } = useLanguage();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);

  useEffect(() => {
    loadFriends();
    
    // Screen'e focus olduğunda arkadaş listesini yenile
    const unsubscribe = navigation.addListener('focus', () => {
      loadFriends();
    });
    return unsubscribe;
  }, [navigation]);

  const loadFriends = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    try {
      const friendsList = await getFriends();
      setFriends(friendsList);
    } catch (error) {
      console.error('Arkadaş listesi yüklenirken hata:', error);
      Alert.alert('Hata', error instanceof Error ? error.message : 'Arkadaş listesi yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFriends();
  };

  const handleRemoveFriend = (friend: Friend) => {
    Alert.alert(
      'Arkadaşı Kaldır',
      `${friend.nickname} arkadaşlıktan kaldırılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setRemovingFriendId(friend.id);
            try {
              await removeFriend(friend.id);
              setFriends(friends.filter(f => f.id !== friend.id));
              Alert.alert('Başarılı', 'Arkadaş kaldırıldı');
            } catch (error) {
              Alert.alert('Hata', error instanceof Error ? error.message : 'Arkadaş kaldırılamadı');
            } finally {
              setRemovingFriendId(null);
            }
          },
        },
      ]
    );
  };

  const handlePlayWithFriend = async (friend: Friend) => {
    try {
      // Normal modda oda oluştur (arkadaşla oynamak için)
      await createRoom(0, false);
      // Oyun başladığında otomatik olarak Game ekranına yönlendirilecek
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Oyun başlatılamadı');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Arkadaşlar yükleniyor...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Arkadaş özelliklerini kullanmak için giriş yapmanız gerekiyor.</Text>
        <Button
          title="Giriş Yap"
          onPress={() => navigation.navigate('Login' as never)}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>👥 Arkadaşlarım</Text>
          <Text style={styles.subtitle}>{friends.length} arkadaş</Text>
        </View>

        {friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>Henüz arkadaşınız yok</Text>
            <Text style={styles.emptySubtext}>Arkadaş eklemek için yukarıdaki butonu kullanın</Text>
            <Button
              title="➕ Arkadaş Ekle"
              onPress={() => navigation.navigate('AddFriend' as never)}
              variant="primary"
            />
          </View>
        ) : (
          <View style={styles.friendsList}>
            {friends.map((friend) => (
              <View key={friend.id} style={styles.friendCard}>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendAvatar}>{friend.avatar}</Text>
                  <View style={styles.friendDetails}>
                    <Text style={styles.friendNickname}>{friend.nickname}</Text>
                    <Text style={styles.friendScore}>🏆 Toplam Skor: {friend.totalScore || 0}</Text>
                  </View>
                </View>
                <View style={styles.friendActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.playButton]}
                    onPress={() => handlePlayWithFriend(friend)}
                  >
                    <Text style={styles.playButtonText}>🎮 Oyna</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => handleRemoveFriend(friend)}
                    disabled={removingFriendId === friend.id}
                  >
                    {removingFriendId === friend.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.removeButtonText}>🗑️</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomActions}>
          <Button
            title="➕ Arkadaş Ekle"
            onPress={() => navigation.navigate('AddFriend' as never)}
            variant="primary"
          />
          <Button
            title="📬 Bekleyen İstekler"
            onPress={() => navigation.navigate('FriendRequests' as never)}
            variant="secondary"
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    marginBottom: 30,
    textAlign: 'center',
  },
  friendsList: {
    marginBottom: 20,
  },
  friendCard: {
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
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    fontSize: 50,
    marginRight: 15,
  },
  friendDetails: {
    flex: 1,
  },
  friendNickname: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  friendScore: {
    fontSize: 14,
    color: '#666',
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  playButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    minWidth: 50,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  bottomActions: {
    marginTop: 20,
    marginBottom: 40,
  },
});

