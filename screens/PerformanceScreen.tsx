import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';

const SOCKET_URL = 'http://192.168.1.107:3001';
const { width } = Dimensions.get('window');

interface DailyPerformance {
  date: string;
  questions: number;
  correct: number;
  wrong: number;
  score: number;
  successRate: string;
}

interface PerformanceData {
  totalQuestions: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  successRate: string;
  dailyPerformance: DailyPerformance[];
  dailyImprovement: string;
}

export const PerformanceScreen: React.FC = () => {
  const { userId, token } = useGame();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);

  useEffect(() => {
    loadPerformanceData();
  }, [userId]);

  const loadPerformanceData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${SOCKET_URL}/api/users/stats/${userId}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPerformanceData({
            totalQuestions: result.data.totalQuestions || 0,
            totalCorrectAnswers: result.data.totalCorrectAnswers || 0,
            totalWrongAnswers: result.data.totalWrongAnswers || 0,
            successRate: result.data.successRate || '0',
            dailyPerformance: result.data.dailyPerformance || [],
            dailyImprovement: result.data.dailyImprovement || '0.0',
          });
        }
      }
    } catch (error) {
      console.error('Performans verisi yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('common.today') || 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('common.yesterday') || 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
  };

  const getMaxValue = (data: DailyPerformance[], key: 'questions' | 'correct' | 'wrong' | 'score') => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d[key]), 1);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t('performance.loading')}</Text>
        </View>
      </View>
    );
  }

  if (!performanceData || performanceData.totalQuestions === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('performance.noData')}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const maxQuestions = getMaxValue(performanceData.dailyPerformance, 'questions');
  const maxScore = getMaxValue(performanceData.dailyPerformance, 'score');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Genel Performans Kartları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('performance.overall')}</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.successCard]}>
              <Text style={styles.statValue}>{performanceData.successRate}%</Text>
              <Text style={styles.statLabel}>{t('performance.successRate')}</Text>
            </View>

            <View style={[styles.statCard, styles.correctCard]}>
              <Text style={styles.statValue}>{performanceData.totalCorrectAnswers}</Text>
              <Text style={styles.statLabel}>{t('performance.correctAnswers')}</Text>
            </View>

            <View style={[styles.statCard, styles.wrongCard]}>
              <Text style={styles.statValue}>{performanceData.totalWrongAnswers}</Text>
              <Text style={styles.statLabel}>{t('performance.wrongAnswers')}</Text>
            </View>

            <View style={[styles.statCard, styles.totalCard]}>
              <Text style={styles.statValue}>{performanceData.totalQuestions}</Text>
              <Text style={styles.statLabel}>{t('performance.totalQuestions')}</Text>
            </View>
          </View>

          {/* Günlük Artış */}
          <View style={styles.improvementCard}>
            <Text style={styles.improvementLabel}>{t('performance.dailyImprovement')}</Text>
            <Text style={[
              styles.improvementValue,
              parseFloat(performanceData.dailyImprovement) >= 0 ? styles.improvementPositive : styles.improvementNegative
            ]}>
              {parseFloat(performanceData.dailyImprovement) >= 0 ? '+' : ''}{performanceData.dailyImprovement}%
            </Text>
          </View>
        </View>

        {/* Günlük Performans Grafiği */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('performance.dailyPerformance')}</Text>
          <Text style={styles.sectionSubtitle}>{t('performance.last7Days')}</Text>

          <View style={styles.chartContainer}>
            {performanceData.dailyPerformance.map((day, index) => {
              const questionHeight = maxQuestions > 0 ? (day.questions / maxQuestions) * 150 : 0;
              const correctHeight = maxQuestions > 0 ? (day.correct / maxQuestions) * 150 : 0;
              const wrongHeight = maxQuestions > 0 ? (day.wrong / maxQuestions) * 150 : 0;

              return (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, styles.correctBar, { height: correctHeight }]} />
                    <View style={[styles.bar, styles.wrongBar, { height: wrongHeight }]} />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {formatDate(day.date)}
                  </Text>
                  <Text style={styles.barValue}>{day.score}</Text>
                </View>
              );
            })}
          </View>

          {/* Günlük Detaylar */}
          <View style={styles.dailyDetails}>
            {performanceData.dailyPerformance.map((day, index) => (
              <View key={index} style={styles.dailyItem}>
                <View style={styles.dailyHeader}>
                  <Text style={styles.dailyDate}>{formatDate(day.date)}</Text>
                  <Text style={styles.dailySuccessRate}>{day.successRate}%</Text>
                </View>
                <View style={styles.dailyStats}>
                  <View style={styles.dailyStat}>
                    <Text style={styles.dailyStatValue}>{day.questions}</Text>
                    <Text style={styles.dailyStatLabel}>{t('performance.questions')}</Text>
                  </View>
                  <View style={styles.dailyStat}>
                    <Text style={[styles.dailyStatValue, styles.correctText]}>{day.correct}</Text>
                    <Text style={styles.dailyStatLabel}>{t('performance.correct')}</Text>
                  </View>
                  <View style={styles.dailyStat}>
                    <Text style={[styles.dailyStatValue, styles.wrongText]}>{day.wrong}</Text>
                    <Text style={styles.dailyStatLabel}>{t('performance.wrong')}</Text>
                  </View>
                  <View style={styles.dailyStat}>
                    <Text style={[styles.dailyStatValue, styles.scoreText]}>{day.score}</Text>
                    <Text style={styles.dailyStatLabel}>{t('performance.score')}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  correctCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  wrongCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  improvementCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  improvementLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  improvementValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  improvementPositive: {
    color: '#4CAF50',
  },
  improvementNegative: {
    color: '#F44336',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    minHeight: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    width: '100%',
    height: 150,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 5,
  },
  bar: {
    width: '45%',
    marginHorizontal: '2.5%',
    borderRadius: 4,
  },
  correctBar: {
    backgroundColor: '#4CAF50',
  },
  wrongBar: {
    backgroundColor: '#F44336',
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  dailyDetails: {
    gap: 10,
  },
  dailyItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dailyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dailySuccessRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  dailyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dailyStat: {
    alignItems: 'center',
  },
  dailyStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  dailyStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  correctText: {
    color: '#4CAF50',
  },
  wrongText: {
    color: '#F44336',
  },
  scoreText: {
    color: '#2196F3',
  },
});

