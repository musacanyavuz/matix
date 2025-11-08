import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/Button';
import { PlayerCard } from '../components/PlayerCard';

interface Room {
  id: string;
  code: string;
  host: { nickname: string; avatar: string };
  ageGroup: string | null;
  participantCount: number;
  maxParticipants: number;
  createdAt: string;
}

export const RoomScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, roomId, players, gameStatus, createRoom, joinRoom, userId, token } = useGame();
  const { t } = useLanguage();
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState<number>(0); // -1: Kolay, 0: Normal, 1: Zor

  const handleCreateRoom = () => {
    createRoom(difficultyLevel);
  };

  const handleShowLeaderboard = () => {
    (navigation as any).navigate('Leaderboard');
  };

  const SOCKET_URL = 'http://192.168.1.107:3001';

  useEffect(() => {
    loadRooms();
    // Her 10 saniyede bir oda listesini yenile (sadece scroll yapılmıyorsa)
    const interval = setInterval(() => {
      if (!isScrolling) {
        loadRooms();
      }
    }, 10000); // 5 saniyeden 10 saniyeye çıkarıldı
    return () => {
      clearInterval(interval);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isScrolling]);

  const loadRooms = async (silent = false) => {
    // Scroll yapılıyorsa refresh'i atla (sessiz mod hariç)
    if (isScrolling && !silent) {
      return;
    }

    try {
      if (!silent) {
        setLoadingRooms(true);
      }
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${SOCKET_URL}/api/rooms`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data.data || []);
      }
    } catch (error) {
      console.error('Oda listesi yüklenirken hata:', error);
    } finally {
      if (!silent) {
        setLoadingRooms(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setIsScrolling(false); // Refresh sırasında scroll durumunu sıfırla
    loadRooms(false);
  };

  const handleJoinRoom = async (code?: string) => {
    const codeToJoin = code || roomCode.trim().toUpperCase();
    if (!codeToJoin) {
      Alert.alert('Hata', 'Lütfen oda kodunu girin.');
      return;
    }
    
    setJoining(true);
    try {
      await joinRoom(codeToJoin);
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Odaya katılamadı');
    } finally {
      setTimeout(() => setJoining(false), 2000);
    }
  };

  const handleJoinRoomFromList = async (room: Room) => {
    if (room.participantCount >= room.maxParticipants) {
      Alert.alert('Hata', 'Bu oda dolu!');
      return;
    }
    await handleJoinRoom(room.code);
  };

  const currentUser = players.find((p) => p.nickname === user?.nickname);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Odaya Katıl</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => (navigation as any).navigate('Profile')}
            >
              <Text style={styles.profileAvatar}>{user?.avatar}</Text>
              <Text style={styles.profileNickname}>{user?.nickname}</Text>
              <Text style={styles.profileButtonText}>👤 Profil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.leaderboardButton}
              onPress={handleShowLeaderboard}
            >
              <Text style={styles.leaderboardButtonText}>🏆 Liderlik</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!roomId ? (
          <View style={styles.actions}>
            {/* Zorluk Seviyesi Seçimi */}
            <View style={styles.difficultyContainer}>
              <Text style={styles.difficultyLabel}>{t('room.difficultyLevel')}</Text>
              <View style={styles.difficultyButtons}>
                <TouchableOpacity
                  style={[styles.difficultyButton, difficultyLevel === -1 && styles.difficultyButtonActive]}
                  onPress={() => setDifficultyLevel(-1)}
                >
                  <Text style={[styles.difficultyButtonText, difficultyLevel === -1 && styles.difficultyButtonTextActive]}>
                    😊 {t('room.easy')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.difficultyButton, difficultyLevel === 0 && styles.difficultyButtonActive]}
                  onPress={() => setDifficultyLevel(0)}
                >
                  <Text style={[styles.difficultyButtonText, difficultyLevel === 0 && styles.difficultyButtonTextActive]}>
                    😐 {t('room.normal')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.difficultyButton, difficultyLevel === 1 && styles.difficultyButtonActive]}
                  onPress={() => setDifficultyLevel(1)}
                >
                  <Text style={[styles.difficultyButtonText, difficultyLevel === 1 && styles.difficultyButtonTextActive]}>
                    😤 {t('room.hard')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title="Yeni Oda Oluştur"
              onPress={handleCreateRoom}
              variant="primary"
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Oda listesi / Oda kodu seçimi */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowRoomList(!showRoomList)}
            >
              <Text style={styles.toggleButtonText}>
                {showRoomList ? '📝 Oda Kodu ile Katıl' : '📋 Oda Listesinden Seç'}
              </Text>
            </TouchableOpacity>

            {showRoomList ? (
              <View style={styles.roomListContainer}>
                <Text style={styles.roomListTitle}>Aktif Odalar</Text>
                {loadingRooms ? (
                  <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
                ) : rooms.length === 0 ? (
                  <Text style={styles.noRoomsText}>Aktif oda bulunamadı</Text>
                ) : (
                  <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.roomItem,
                          item.participantCount >= item.maxParticipants && styles.roomItemFull,
                        ]}
                        onPress={() => handleJoinRoomFromList(item)}
                        disabled={item.participantCount >= item.maxParticipants || joining}
                      >
                        <View style={styles.roomItemHeader}>
                          <Text style={styles.roomItemCode}>{item.code}</Text>
                          <Text style={styles.roomItemHost}>
                            {item.host.avatar} {item.host.nickname}
                          </Text>
                        </View>
                        <View style={styles.roomItemInfo}>
                          <Text style={styles.roomItemParticipants}>
                            👥 {item.participantCount}/{item.maxParticipants}
                          </Text>
                          {item.ageGroup && (
                            <Text style={styles.roomItemAgeGroup}>
                              📚 {item.ageGroup}
                            </Text>
                          )}
                        </View>
                        {item.participantCount >= item.maxParticipants && (
                          <Text style={styles.roomItemFullText}>Dolu</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    onScrollBeginDrag={() => {
                      setIsScrolling(true);
                      // Scroll timeout'unu temizle
                      if (scrollTimeoutRef.current) {
                        clearTimeout(scrollTimeoutRef.current);
                      }
                    }}
                    onScrollEndDrag={() => {
                      // Scroll bittikten 2 saniye sonra refresh'i tekrar aktif et
                      if (scrollTimeoutRef.current) {
                        clearTimeout(scrollTimeoutRef.current);
                      }
                      scrollTimeoutRef.current = setTimeout(() => {
                        setIsScrolling(false);
                      }, 2000);
                    }}
                    onMomentumScrollEnd={() => {
                      // Momentum scroll bittikten 2 saniye sonra refresh'i tekrar aktif et
                      if (scrollTimeoutRef.current) {
                        clearTimeout(scrollTimeoutRef.current);
                      }
                      scrollTimeoutRef.current = setTimeout(() => {
                        setIsScrolling(false);
                      }, 2000);
                    }}
                    style={styles.roomList}
                  />
                )}
              </View>
            ) : (
              <View style={styles.joinSection}>
                <TextInput
                  style={styles.input}
                  value={roomCode}
                  onChangeText={(text) => setRoomCode(text.toUpperCase())}
                  placeholder="Oda Kodu"
                  placeholderTextColor="#999"
                  maxLength={6}
                  autoCapitalize="characters"
                />
                <Button
                  title="Odaya Katıl"
                  onPress={() => handleJoinRoom()}
                  variant="secondary"
                  loading={joining}
                />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.roomInfo}>
            <View style={styles.roomCodeContainer}>
              <Text style={styles.roomCodeLabel}>Oda Kodu</Text>
              <Text style={styles.roomCode}>{roomId}</Text>
              <Text style={styles.roomCodeHint}>
                Diğer oyuncu bu kodu girerek katılabilir
              </Text>
            </View>

            <View style={styles.playersContainer}>
              <Text style={styles.playersLabel}>Oyuncular ({players.length}/4)</Text>
              <View style={styles.playersList}>
                {players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isCurrentUser={player.nickname === user?.nickname}
                  />
                ))}
              </View>
            </View>

            {gameStatus === 'waiting' && players.length < 2 && (
              <Text style={styles.waitingText}>
                ⏳ İkinci oyuncu bekleniyor... (Bot otomatik eklenecek)
              </Text>
            )}

            {gameStatus === 'waiting' && players.length >= 2 && players.length < 4 && (
              <Text style={styles.readyText}>
                ✅ {players.length} oyuncu hazır! Oyun başlamak üzere... (Daha fazla oyuncu katılabilir)
              </Text>
            )}

            {gameStatus === 'waiting' && players.length >= 4 && (
              <Text style={styles.readyText}>
                ✅ Maksimum {players.length} oyuncu hazır! Oyun başlamak üzere...
              </Text>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  profileButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4CAF50',
    minWidth: 150,
  },
  profileAvatar: {
    fontSize: 40,
    marginBottom: 5,
  },
  profileNickname: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  leaderboardButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#FF9800',
    flex: 1,
  },
  leaderboardButtonText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  actions: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#999',
    fontSize: 14,
  },
  joinSection: {
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 3,
  },
  roomInfo: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  roomCodeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#e8f5e9',
    borderRadius: 15,
  },
  roomCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  roomCode: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 5,
    marginBottom: 5,
  },
  roomCodeHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  playersContainer: {
    marginBottom: 20,
  },
  playersLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  playersList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  waitingText: {
    fontSize: 16,
    color: '#ff9800',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },
  readyText: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  roomListContainer: {
    marginTop: 10,
    maxHeight: 400,
  },
  roomListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  roomList: {
    maxHeight: 350,
  },
  roomItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  roomItemFull: {
    opacity: 0.6,
    borderColor: '#999',
  },
  roomItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomItemCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 2,
  },
  roomItemHost: {
    fontSize: 14,
    color: '#666',
  },
  roomItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomItemParticipants: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  roomItemAgeGroup: {
    fontSize: 12,
    color: '#666',
  },
  roomItemFullText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  loader: {
    marginVertical: 20,
  },
  noRoomsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginVertical: 20,
  },
  difficultyContainer: {
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
  difficultyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  difficultyButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

