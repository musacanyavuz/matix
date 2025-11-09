import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';

const SOCKET_URL = 'http://192.168.1.107:3001';

interface LeaderboardEntry {
  id: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  rank?: number;
}

export const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { userId, token } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${SOCKET_URL}/api/users/leaderboard?limit=50`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        const entries = (data.data || []).map((user: any, index: number) => ({
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          totalScore: user.totalScore || 0,
          rank: index + 1,
        }));
        setLeaderboard(entries);

        // Kullanıcının sırasını bul
        if (userId) {
          const userIndex = entries.findIndex((entry: LeaderboardEntry) => entry.id === userId);
          if (userIndex !== -1) {
            setUserRank(userIndex + 1);
          }
        }
      }
    } catch (error) {
      console.error('Liderlik tablosu yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const renderRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = userId && item.id === userId;
    return (
      <TouchableOpacity
        style={[
          styles.leaderboardItem,
          isCurrentUser && styles.currentUserItem,
        ]}
      >
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>{renderRankIcon(item.rank || index + 1)}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.avatar}</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.nicknameText, isCurrentUser && styles.currentUserText]}>
            {item.nickname}
            {isCurrentUser && ' (Sen)'}
          </Text>
          <Text style={styles.scoreText}>{item.totalScore} puan</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {userRank && (
        <View style={styles.userRankCard}>
          <Text style={styles.userRankTitle}>Senin Sıran</Text>
          <Text style={styles.userRankNumber}>#{userRank}</Text>
        </View>
      )}

      {loading && leaderboard.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Liderlik tablosu yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz skor yok</Text>
              <Text style={styles.emptySubtext}>İlk oyunu oyna ve liderlik tablosuna gir!</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  userRankCard: {
    backgroundColor: '#FFD700',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userRankTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userRankNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserItem: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
  },
  nicknameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  currentUserText: {
    color: '#4CAF50',
  },
  scoreText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

