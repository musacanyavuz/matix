import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Countdown } from '../components/Countdown';

export const GameScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const {
    user,
    players,
    currentQuestion,
    questionNumber,
    isAnswering,
    submitAnswer,
    showGameStartCountdown,
    setShowGameStartCountdown,
    showQuestionCountdown,
    setShowQuestionCountdown,
    playerAnswers, // Diğer oyuncuların seçimleri
    resetGame,
    disconnect,
  } = useGame();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleExitGame = () => {
    Alert.alert(
      t('game.home'),
      t('game.exitConfirm'),
      [
        { text: t('game.cancel'), style: 'cancel' },
        {
          text: t('game.home'),
          style: 'default',
          onPress: () => {
            resetGame();
            disconnect();
            (navigation as any).navigate('Room');
          },
        },
      ]
    );
  };

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
  }, [currentQuestion]);

  const handleAnswer = (answer: number) => {
    // Çift tıklamayı önle
    if (isAnswering || selectedAnswer !== null) return;
    
    // Hemen state'i güncelle (UI'da buton disabled olsun)
    setSelectedAnswer(answer);
    setShowResult(true);
    
    // Cevabı gönder (submitAnswer içinde setIsAnswering(true) yapılacak)
    submitAnswer(answer);
  };

  // Oyuncuları skora göre sırala
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Oyun başlangıç geri sayımı gösteriliyorsa
  if (showGameStartCountdown) {
    return (
      <View style={styles.container}>
        <Countdown
          duration={5}
          onComplete={() => {
            setShowGameStartCountdown(false);
            // Geri sayım bittiğinde soru gelene kadar loading göster
          }}
          message={t('countdown.gameStart')}
        />
      </View>
    );
  }

  // Soru yoksa ve geri sayım da yoksa loading göster
  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>{t('game.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Anasayfaya dönüş butonu */}
      <TouchableOpacity style={styles.exitButton} onPress={handleExitGame}>
        <Text style={styles.exitButtonText}>🏠 {t('game.home')}</Text>
      </TouchableOpacity>

      {/* Geri sayım overlay (arka plan silik kalır) */}
      {showQuestionCountdown && (
        <View style={styles.overlay}>
          <Countdown
            duration={2}
            onComplete={() => setShowQuestionCountdown(false)}
            message={t('countdown.nextQuestion')}
          />
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header: Soru numarası ve oyuncular */}
        <View style={styles.header}>
          <Text style={styles.questionNumber}>Soru {questionNumber}/10</Text>
          
          {/* Oyuncular - kompakt */}
          <View style={styles.playersRow}>
            {sortedPlayers.map((player) => (
              <View key={player.id} style={styles.playerBadge}>
                <Text style={styles.playerAvatar}>{player.avatar}</Text>
                <Text style={styles.playerScore}>{player.score}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Soru */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Cevaplar - Avatar şeklinde tek satır */}
        <View style={styles.answersRow}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = showResult && option === currentQuestion.correctAnswer;
            const isWrong = showResult && isSelected && option !== currentQuestion.correctAnswer;
            
            // Bu cevabı seçen oyuncuları bul
            const playersWhoSelected = playerAnswers?.filter(pa => pa.answer === option) || [];
            const isDisabled = isAnswering || selectedAnswer !== null;

            return (
              <View key={index} style={styles.answerWrapper}>
                <TouchableOpacity
                  style={[
                    styles.answerAvatar,
                    isSelected && styles.answerSelected,
                    isCorrect && styles.answerCorrect,
                    isWrong && styles.answerWrong,
                    isDisabled && styles.answerDisabled,
                  ]}
                  onPress={() => handleAnswer(option)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.answerNumber,
                    (isSelected || isCorrect) && styles.answerNumberSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
                
                {/* Bu cevabı seçen oyuncuların avatarları */}
                {playersWhoSelected.length > 0 && (
                  <View style={styles.answerPlayers}>
                    {playersWhoSelected.map((pa) => {
                      const player = players.find(p => p.id === pa.userId);
                      return player ? (
                        <Text key={pa.userId} style={styles.answerPlayerAvatar}>
                          {player.avatar}
                        </Text>
                      ) : null;
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Sonuç mesajı */}
        {showResult && (
          <View style={styles.resultContainer}>
            {selectedAnswer === currentQuestion.correctAnswer ? (
              <Text style={styles.correctText}>✅ {t('game.correct')}</Text>
            ) : (
              <Text style={styles.wrongText}>❌ {t('game.wrong')}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  exitButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  exitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
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
  questionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  playerBadge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  playerAvatar: {
    fontSize: 20,
  },
  playerScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  questionContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  questionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  answersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  answerWrapper: {
    alignItems: 'center',
  },
  answerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  answerCorrect: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  answerWrong: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  answerDisabled: {
    opacity: 0.6,
  },
  answerNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  answerNumberSelected: {
    color: '#fff',
  },
  answerPlayers: {
    marginTop: 5,
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 70,
  },
  answerPlayerAvatar: {
    fontSize: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
  },
  correctText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  wrongText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});
