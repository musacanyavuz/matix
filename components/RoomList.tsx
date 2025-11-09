import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useGame } from '../contexts/GameContext';

interface Room {
  id: string;
  code: string;
  host: { nickname: string; avatar: string };
  ageGroup: string | null;
  participantCount: number;
  maxParticipants: number;
  createdAt: string;
}

interface RoomListProps {
  onJoinRoom: (room: Room) => void;
  joining: boolean;
}

const SOCKET_URL = 'http://192.168.1.107:3001';

export const RoomList: React.FC<RoomListProps> = ({ onJoinRoom, joining }) => {
  const { token } = useGame();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      }
    }
  };

  useEffect(() => {
    loadRooms();
    // Her 30 saniyede bir oda listesini yenile (sadece scroll yapılmıyorsa)
    const interval = setInterval(() => {
      if (!isScrolling) {
        loadRooms(true); // Sessiz modda refresh
      }
    }, 30000); // 30 saniye
    return () => {
      clearInterval(interval);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // Sadece mount olduğunda çalışsın

  const onScrollBeginDrag = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };

  const onScrollEndDrag = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 2000);
  };

  const onMomentumScrollEnd = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 2000);
  };

  return (
    <View style={styles.roomListContainer}>
      <Text style={styles.roomListTitle}>Aktif Odalar</Text>
      <View style={styles.roomListScrollContainer}>
        {loadingRooms && rooms.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : rooms.length === 0 ? (
          <View style={styles.emptyRoomsContainer}>
            <Text style={styles.noRoomsText}>Aktif oda bulunamadı</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.roomListScrollView}
            contentContainerStyle={styles.roomListScrollContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
          >
            {rooms.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.roomItem,
                  item.participantCount >= item.maxParticipants && styles.roomItemFull,
                ]}
                onPress={() => onJoinRoom(item)}
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
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  noRoomsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    color: '#333',
  },
  roomItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomItemParticipants: {
    fontSize: 14,
    color: '#666',
  },
  roomItemAgeGroup: {
    fontSize: 14,
    color: '#666',
  },
  roomItemFullText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
});

