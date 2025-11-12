import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/Button';
import { PlayerCard } from '../components/PlayerCard';
import { RoomList } from '../components/RoomList';


export const RoomScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, roomId, players, gameStatus, createRoom, joinRoom, userId, token } = useGame();
  const { t } = useLanguage();
  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showRoomList, setShowRoomList] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState<number>(0); // -1: Kolay, 0: Normal, 1: Zor
  const [gameMode, setGameMode] = useState<'normal' | 'adventure'>('normal'); // Normal veya Macera modu

  const handleCreateRoom = () => {
    if (gameMode === 'adventure') {
      // Macera modunda harita ekranına yönlendir
      navigation.navigate('AdventureMap' as never);
    } else {
      // Normal modda direkt oda oluştur
      createRoom(difficultyLevel, false);
    }
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

  const handleJoinRoomFromList = async (room: { id: string; code: string; participantCount: number; maxParticipants: number }) => {
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
      {showRoomList && !roomId ? (
        // Oda listesi gösterildiğinde ScrollView kullan, FlatList yerine map kullan
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <View style={styles.content}>
            <View style={styles.actions}>
              {/* Oyun Modu Seçimi */}
              <View style={styles.gameModeContainer}>
                <Text style={styles.gameModeLabel}>{t('room.gameMode')}</Text>
                <View style={styles.gameModeButtons}>
                  <TouchableOpacity
                    style={[styles.gameModeButton, gameMode === 'normal' && styles.gameModeButtonActive]}
                    onPress={() => setGameMode('normal')}
                  >
                    <Text style={styles.gameModeIcon}>🎮</Text>
                    <Text style={[styles.gameModeButtonText, gameMode === 'normal' && styles.gameModeButtonTextActive]}>
                      {t('room.normalMode')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gameModeButton, gameMode === 'adventure' && styles.gameModeButtonActive]}
                    onPress={() => setGameMode('adventure')}
                  >
                    <Text style={styles.gameModeIcon}>⚔️</Text>
                    <Text style={[styles.gameModeButtonText, gameMode === 'adventure' && styles.gameModeButtonTextActive]}>
                      {t('room.adventureMode')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {gameMode === 'adventure' && (
                  <Text style={styles.adventureHint}>{t('room.adventureHint')}</Text>
                )}
              </View>

              {/* Zorluk Seviyesi Seçimi (Sadece normal modda) */}
              {gameMode === 'normal' && (
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
              )}

              <Button
                title={gameMode === 'adventure' ? t('room.startAdventure') : t('room.createRoom')}
                onPress={handleCreateRoom}
                variant="primary"
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowRoomList(!showRoomList)}
              >
                <Text style={styles.toggleButtonText}>
                  {showRoomList ? '📝 Oda Kodu ile Katıl' : '📋 Oda Listesinden Seç'}
                </Text>
              </TouchableOpacity>

              <RoomList onJoinRoom={handleJoinRoomFromList} joining={joining} />
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <View style={styles.content}>
        {!roomId ? (
          <View style={styles.actions}>
            {/* Oyun Modu Seçimi */}
            <View style={styles.gameModeContainer}>
              <Text style={styles.gameModeLabel}>{t('room.gameMode')}</Text>
              <View style={styles.gameModeButtons}>
                <TouchableOpacity
                  style={[styles.gameModeButton, gameMode === 'normal' && styles.gameModeButtonActive]}
                  onPress={() => setGameMode('normal')}
                >
                  <Text style={styles.gameModeIcon}>🎮</Text>
                  <Text style={[styles.gameModeButtonText, gameMode === 'normal' && styles.gameModeButtonTextActive]}>
                    {t('room.normalMode')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gameModeButton, gameMode === 'adventure' && styles.gameModeButtonActive]}
                  onPress={() => setGameMode('adventure')}
                >
                  <Text style={styles.gameModeIcon}>⚔️</Text>
                  <Text style={[styles.gameModeButtonText, gameMode === 'adventure' && styles.gameModeButtonTextActive]}>
                    {t('room.adventureMode')}
                  </Text>
                </TouchableOpacity>
              </View>
              {gameMode === 'adventure' && (
                <Text style={styles.adventureHint}>{t('room.adventureHint')}</Text>
              )}
            </View>

            {/* Zorluk Seviyesi Seçimi (Sadece normal modda) */}
            {gameMode === 'normal' && (
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
            )}

            <Button
              title={gameMode === 'adventure' ? t('room.startAdventure') : t('room.createRoom')}
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
              <RoomList onJoinRoom={handleJoinRoomFromList} joining={joining} />
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
        </ScrollView>
      )}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    padding: 20,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    height: 400,
    borderWidth: 2,
    borderColor: '#4CAF50',
    overflow: 'hidden',
  },
  roomListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  roomListScrollContainer: {
    flex: 1,
    minHeight: 0,
  },
  roomListScrollView: {
    flex: 1,
  },
  roomListScrollContent: {
    paddingBottom: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRoomsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
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
  gameModeContainer: {
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
  gameModeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  gameModeButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  gameModeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 100,
  },
  gameModeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  gameModeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  gameModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  gameModeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  adventureHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

