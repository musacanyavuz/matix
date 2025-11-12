import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';

const SOCKET_URL = 'http://192.168.1.107:3001';
const { width } = Dimensions.get('window');
const CHAPTERS_PER_ROW = 5; // Her satırda 5 bölüm
const MAX_CHAPTERS = 50; // Toplam 50 bölüm

interface AdventureProgress {
  id: string;
  adventureChapter: number;
}

export const AdventureMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, userId, token, createRoom } = useGame();
  const { t } = useLanguage();
  const [currentChapter, setCurrentChapter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadAdventureProgress();
  }, []);

  const loadAdventureProgress = async () => {
    if (!userId || !token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${SOCKET_URL}/api/users/adventure/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCurrentChapter(data.data.adventureChapter || 1);
        }
      }
    } catch (error) {
      console.error('Macera ilerlemesi yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterSelect = async (chapter: number) => {
    // Sadece açık olan bölümler seçilebilir
    if (chapter > currentChapter) {
      Alert.alert('Kilitli Bölüm', `Bu bölümü açmak için önce ${currentChapter}. bölümü tamamlamalısınız!`);
      return;
    }

    setStarting(true);
    try {
      // Macera modunda oda oluştur (chapter parametresi ile)
      await createRoom(0, true, chapter); // difficultyLevel: 0 (normal), adventureMode: true, chapter
      // createRoom başarılı olursa otomatik olarak oyun başlayacak
    } catch (error) {
      Alert.alert('Hata', error instanceof Error ? error.message : 'Oyun başlatılamadı');
    } finally {
      setStarting(false);
    }
  };

  const renderChapter = (chapter: number, index: number) => {
    const isLocked = chapter > currentChapter;
    const isCompleted = chapter < currentChapter;
    const isCurrent = chapter === currentChapter;
    const row = Math.floor(index / CHAPTERS_PER_ROW);
    const col = index % CHAPTERS_PER_ROW;
    
    // Zigzag pattern için satır numarasına göre yön değiştir
    const isEvenRow = row % 2 === 0;
    const actualCol = isEvenRow ? col : CHAPTERS_PER_ROW - 1 - col;

    return (
      <TouchableOpacity
        key={chapter}
        style={[
          styles.chapterButton,
          isLocked && styles.chapterLocked,
          isCompleted && styles.chapterCompleted,
          isCurrent && styles.chapterCurrent,
          {
            left: (actualCol * (width / CHAPTERS_PER_ROW)) + (width / CHAPTERS_PER_ROW / 2) - 30,
            top: row * 120 + 50,
          },
        ]}
        onPress={() => !isLocked && handleChapterSelect(chapter)}
        disabled={isLocked || starting}
      >
        <View style={styles.chapterContent}>
          {isLocked ? (
            <Text style={styles.chapterLockIcon}>🔒</Text>
          ) : isCompleted ? (
            <Text style={styles.chapterCheckIcon}>✅</Text>
          ) : isCurrent ? (
            <Text style={styles.chapterPlayIcon}>▶️</Text>
          ) : null}
          <Text style={[styles.chapterNumber, isLocked && styles.chapterNumberLocked]}>
            {chapter}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Path rendering basitleştirildi - sadece görsel olarak bölümler arası bağlantı gösterilir
  const renderPaths = () => {
    const paths: JSX.Element[] = [];
    
    for (let i = 0; i < MAX_CHAPTERS - 1; i++) {
      const row = Math.floor(i / CHAPTERS_PER_ROW);
      const col = i % CHAPTERS_PER_ROW;
      const isEvenRow = row % 2 === 0;
      const actualCol = isEvenRow ? col : CHAPTERS_PER_ROW - 1 - col;
      
      // Sadece açık bölümler arasında yol göster
      if ((i + 1) <= currentChapter) {
        const startX = (actualCol * (width / CHAPTERS_PER_ROW)) + (width / CHAPTERS_PER_ROW / 2);
        const startY = row * 120 + 50 + 30;
        
        // Son sütunda değilse yatay yol
        if (col < CHAPTERS_PER_ROW - 1) {
          const endX = ((actualCol + (isEvenRow ? 1 : -1)) * (width / CHAPTERS_PER_ROW)) + (width / CHAPTERS_PER_ROW / 2);
          paths.push(
            <View
              key={`path-h-${i}`}
              style={[
                styles.path,
                {
                  left: Math.min(startX, endX),
                  top: startY - 1,
                  width: Math.abs(endX - startX),
                  height: 2,
                },
              ]}
            />
          );
        } else if (row < Math.floor((MAX_CHAPTERS - 1) / CHAPTERS_PER_ROW)) {
          // Son sütunda ve son satır değilse dikey yol
          const endY = (row + 1) * 120 + 50 + 30;
          paths.push(
            <View
              key={`path-v-${i}`}
              style={[
                styles.path,
                {
                  left: startX - 1,
                  top: startY,
                  width: 2,
                  height: endY - startY,
                },
              ]}
            />
          );
        }
      }
    }
    
    return paths;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Macera haritası yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Macera Haritası</Text>
        <Text style={styles.subtitle}>Bölüm {currentChapter}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.mapContainer}>
          {/* Yollar */}
          {renderPaths()}
          
          {/* Bölümler */}
          {Array.from({ length: MAX_CHAPTERS }, (_, i) => renderChapter(i + 1, i))}
        </View>
      </ScrollView>

      {starting && (
        <View style={styles.startingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.startingText}>Oyun başlatılıyor...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  mapContainer: {
    minHeight: Math.ceil(MAX_CHAPTERS / CHAPTERS_PER_ROW) * 120 + 100,
    position: 'relative',
  },
  chapterButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  chapterLocked: {
    backgroundColor: '#ccc',
    borderColor: '#999',
  },
  chapterCompleted: {
    backgroundColor: '#81C784',
  },
  chapterCurrent: {
    backgroundColor: '#FF9800',
    borderColor: '#FF6F00',
    transform: [{ scale: 1.1 }],
  },
  chapterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterLockIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  chapterCheckIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  chapterPlayIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  chapterNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  chapterNumberLocked: {
    color: '#666',
  },
  path: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    opacity: 0.5,
    zIndex: 0,
  },
  startingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  startingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});

