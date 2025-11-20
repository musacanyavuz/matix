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

interface PendingRequest {
  id: string;
  requester: {
    id: string;
    nickname: string;
    avatar: string;
  } | null;
  createdAt: any;
}

export const FriendRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { getPendingRequests, acceptFriendRequest, rejectFriendRequest, token, isAuthenticated } = useGame();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    
    // Screen'e focus olduğunda istekleri yenile
    const unsubscribe = navigation.addListener('focus', () => {
      loadRequests();
    });
    return unsubscribe;
  }, [navigation]);

  const loadRequests = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    try {
      const pendingRequests = await getPendingRequests();
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Bekleyen istekler yüklenirken hata:', error);
      Alert.alert('Hata', error instanceof Error ? error.message : 'Bekleyen istekler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleAccept = async (request: PendingRequest) => {
    if (!request.requester) return;

    setProcessingId(request.id);
    try {
      await acceptFriendRequest(request.id);
      Alert.alert('Başarılı', `${request.requester.nickname} arkadaş olarak eklendi`);
      setRequests(requests.filter(r => r.id !== request.id));
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Arkadaşlık isteği kabul edilemedi');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: PendingRequest) => {
    if (!request.requester) return;

    Alert.alert(
      'İsteği Reddet',
      `${request.requester.nickname} kullanıcısının arkadaşlık isteğini reddetmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(request.id);
            try {
              await rejectFriendRequest(request.id);
              setRequests(requests.filter(r => r.id !== request.id));
              Alert.alert('Başarılı', 'Arkadaşlık isteği reddedildi');
            } catch (error) {
              Alert.alert('Hata', error instanceof Error ? error.message : 'Arkadaşlık isteği reddedilemedi');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>İstekler yükleniyor...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Bekleyen istekleri görmek için giriş yapmanız gerekiyor.</Text>
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
          <Text style={styles.title}>📬 Bekleyen İstekler</Text>
          <Text style={styles.subtitle}>{requests.length} bekleyen istek</Text>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Bekleyen arkadaşlık isteği yok</Text>
            <Text style={styles.emptySubtext}>
              Size gönderilen arkadaşlık istekleri burada görünecek
            </Text>
            <Button
              title="👥 Arkadaşlarım"
              onPress={() => navigation.navigate('FriendList' as never)}
              variant="primary"
            />
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => {
              if (!request.requester) return null;
              
              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestAvatar}>{request.requester.avatar}</Text>
                    <View style={styles.requestDetails}>
                      <Text style={styles.requestNickname}>{request.requester.nickname}</Text>
                      <Text style={styles.requestDate}>
                        {request.createdAt?.toDate
                          ? new Date(request.createdAt.toDate()).toLocaleDateString('tr-TR')
                          : 'Yakın zamanda'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAccept(request)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.acceptButtonText}>✓ Kabul</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(request)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.rejectButtonText}>✗ Reddet</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomActions}>
          <Button
            title="👥 Arkadaşlarım"
            onPress={() => navigation.navigate('FriendList' as never)}
            variant="primary"
          />
          <Button
            title="➕ Arkadaş Ekle"
            onPress={() => navigation.navigate('AddFriend' as never)}
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
  requestsList: {
    marginBottom: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  requestAvatar: {
    fontSize: 50,
    marginRight: 15,
  },
  requestDetails: {
    flex: 1,
  },
  requestNickname: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomActions: {
    marginTop: 20,
    marginBottom: 40,
  },
});

