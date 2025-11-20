import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/Button';

const SOCKET_URL = 'http://192.168.1.107:3001';

interface UserStats {
  totalScore: number;
  totalGames: number;
  wonGames: number;
  winRate: string;
  leaderboardPosition: number | null;
  adventureChapter: number;
}

interface Friend {
  id: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  isOnline: boolean;
  currentGame: {
    roomCode: string;
    roomId: string;
  } | null;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, userId, token, isAuthenticated, getFriends, createRoom, inviteFriendToRoom, roomId } = useGame();
  const { t } = useLanguage();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Screen'e focus olduğunda verileri yenile
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadFriends(),
      ]);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    if (!isAuthenticated || !userId || !token) {
      return;
    }

    try {
      // İstatistikleri al
      const statsResponse = await fetch(`${SOCKET_URL}/api/users/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
        }
      }

      // Macera ilerlemesini al
      const progressResponse = await fetch(`${SOCKET_URL}/api/users/adventure/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        if (progressData.success && progressData.data) {
          setStats(prev => ({
            ...prev!,
            adventureChapter: progressData.data.adventureChapter || 1,
          }));
        }
      }
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    }
  };

  const loadFriends = async () => {
    if (!isAuthenticated || !token) {
      return;
    }

    try {
      const friendsList = await getFriends();
      setFriends(friendsList);
    } catch (error) {
      console.error('Arkadaş listesi yüklenirken hata:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlay = () => {
    navigation.navigate('Room' as never);
  };

  const handleInviteFriend = async (friend: Friend) => {
    if (!isAuthenticated || !token) {
      Alert.alert('Hata', 'Arkadaş davet etmek için giriş yapmanız gerekiyor');
      return;
    }

    if (!friend.isOnline) {
      Alert.alert('Uyarı', `${friend.nickname} şu anda çevrimdışı`);
      return;
    }

    if (friend.currentGame) {
      Alert.alert('Bilgi', `${friend.nickname} zaten bir oyunda`);
      return;
    }

    setInvitingFriendId(friend.id);
    try {
      // Önce oda oluştur
      await createRoom(0, false);
      
      // Oda oluşturulduktan sonra roomId'yi almak için kısa bir bekleme
      // roomId socket event'inden gelecek
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // roomId context'ten al (roomCode olarak geliyor)
      if (roomId) {
        // Backend'de roomCode'dan roomId'yi almak için API çağrısı yap
        const response = await fetch(`${SOCKET_URL}/api/rooms/${roomId}/participants`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const roomData = await response.json();
          if (roomData.success && roomData.data && roomData.data.id) {
            const actualRoomId = roomData.data.id;
            await inviteFriendToRoom(friend.id, actualRoomId);
            Alert.alert('Başarılı', `${friend.nickname} oyuna davet edildi!`);
          } else {
            throw new Error('Oda bilgisi alınamadı');
          }
        } else {
          throw new Error('Oda bilgisi alınamadı');
        }
      } else {
        throw new Error('Oda oluşturulamadı');
      }
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Davet gönderilemedi');
    } finally {
      setInvitingFriendId(null);
    }
  };

  const handleViewFriends = () => {
    navigation.navigate('FriendList' as never);
  };

  const handleViewAdventure = () => {
    navigation.navigate('AdventureMap' as never);
  };

  if (loading && !stats && friends.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
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
        {/* Hoş Geldin Mesajı */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {isAuthenticated ? `Hoş geldin, ${user?.nickname}! 👋` : 'Hoş geldin! 👋'}
          </Text>
          <Text style={styles.welcomeSubtext}>
            {isAuthenticated ? 'Oyun istatistiklerin ve arkadaşların burada' : 'Oyun oynamaya başlamak için giriş yap'}
          </Text>
        </View>

        {/* Oyna Butonu */}
        <View style={styles.playSection}>
          <Button
            title="🎮 Oyna"
            onPress={handlePlay}
            variant="primary"
          />
        </View>

        {/* Kullanıcı İstatistikleri */}
        {isAuthenticated && stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>📊 İstatistiklerim</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🏆</Text>
                <Text style={styles.statValue}>{stats.totalScore || 0}</Text>
                <Text style={styles.statLabel}>Toplam Skor</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🎮</Text>
                <Text style={styles.statValue}>{stats.totalGames || 0}</Text>
                <Text style={styles.statLabel}>Toplam Oyun</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.statValue}>{stats.wonGames || 0}</Text>
                <Text style={styles.statLabel}>Kazanma</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📈</Text>
                <Text style={styles.statValue}>%{stats.winRate || '0'}</Text>
                <Text style={styles.statLabel}>Kazanma Oranı</Text>
              </View>
            </View>
            {stats.leaderboardPosition && (
              <View style={styles.leaderboardBadge}>
                <Text style={styles.leaderboardText}>
                  🥇 Liderlik Sırası: {stats.leaderboardPosition}
                </Text>
              </View>
            )}
            {stats.adventureChapter && (
              <View style={styles.adventureBadge}>
                <Text style={styles.adventureText}>
                  ⚔️ Macera Bölümü: {stats.adventureChapter}
                </Text>
                <TouchableOpacity
                  style={styles.adventureButton}
                  onPress={handleViewAdventure}
                >
                  <Text style={styles.adventureButtonText}>Macera Parkuruna Git →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Arkadaşlar Bölümü */}
        {isAuthenticated && (
          <View style={styles.friendsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👥 Arkadaşlarım</Text>
              <TouchableOpacity onPress={handleViewFriends}>
                <Text style={styles.viewAllText}>Tümünü Gör →</Text>
              </TouchableOpacity>
            </View>

            {friends.length === 0 ? (
              <View style={styles.emptyFriendsContainer}>
                <Text style={styles.emptyFriendsIcon}>👥</Text>
                <Text style={styles.emptyFriendsText}>Henüz arkadaşınız yok</Text>
                <Button
                  title="➕ Arkadaş Ekle"
                  onPress={() => navigation.navigate('AddFriend' as never)}
                  variant="secondary"
                />
              </View>
            ) : (
              <View style={styles.friendsList}>
                {friends.slice(0, 5).map((friend) => (
                  <View key={friend.id} style={styles.friendCard}>
                    <View style={styles.friendInfo}>
                      <View style={styles.friendAvatarContainer}>
                        <Text style={styles.friendAvatar}>{friend.avatar}</Text>
                        {friend.isOnline && (
                          <View style={styles.onlineIndicator} />
                        )}
                      </View>
                      <View style={styles.friendDetails}>
                        <Text style={styles.friendNickname}>{friend.nickname}</Text>
                        <Text style={styles.friendScore}>🏆 {friend.totalScore || 0} skor</Text>
                        {friend.currentGame ? (
                          <Text style={styles.friendGameStatus}>🎮 Oyun oynuyor ({friend.currentGame.roomCode})</Text>
                        ) : friend.isOnline ? (
                          <Text style={styles.friendOnlineStatus}>🟢 Çevrimiçi</Text>
                        ) : (
                          <Text style={styles.friendOfflineStatus}>⚫ Çevrimdışı</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.inviteButton,
                        invitingFriendId === friend.id && styles.inviteButtonDisabled,
                      ]}
                      onPress={() => handleInviteFriend(friend)}
                      disabled={invitingFriendId === friend.id || !friend.isOnline || !!friend.currentGame}
                    >
                      {invitingFriendId === friend.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.inviteButtonText}>🎮 Davet Et</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
                {friends.length > 5 && (
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={handleViewFriends}
                  >
                    <Text style={styles.viewMoreText}>
                      +{friends.length - 5} arkadaş daha görüntüle
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Hızlı Erişim Butonları */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>⚡ Hızlı Erişim</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Leaderboard' as never)}
            >
              <Text style={styles.quickActionIcon}>🏆</Text>
              <Text style={styles.quickActionText}>Liderlik</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Profile' as never)}
            >
              <Text style={styles.quickActionIcon}>👤</Text>
              <Text style={styles.quickActionText}>Profil</Text>
            </TouchableOpacity>
            {isAuthenticated && (
              <>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => navigation.navigate('FriendList' as never)}
                >
                  <Text style={styles.quickActionIcon}>👥</Text>
                  <Text style={styles.quickActionText}>Arkadaşlar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={handleViewAdventure}
                >
                  <Text style={styles.quickActionIcon}>⚔️</Text>
                  <Text style={styles.quickActionText}>Macera</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  welcomeSection: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#666',
  },
  playSection: {
    marginBottom: 25,
  },
  statsSection: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
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
    fontSize: 30,
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
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  leaderboardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  adventureBadge: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  adventureText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  adventureButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  adventureButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  friendsSection: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyFriendsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyFriendsIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyFriendsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  friendsList: {
    gap: 10,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 10,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  friendAvatar: {
    fontSize: 40,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendDetails: {
    flex: 1,
  },
  friendNickname: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  friendScore: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  friendGameStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  friendOnlineStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  friendOfflineStatus: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  viewMoreButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  quickActionsSection: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

