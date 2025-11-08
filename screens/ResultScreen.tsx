import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../contexts/GameContext';
import { Button } from '../components/Button';
import { PlayerCard } from '../components/PlayerCard';

export const ResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, players, winner, resetGame, restartGame, disconnect, roomId } = useGame();

  const currentUser = players.find((p) => p.nickname === user?.nickname);
  const isWinner = winner?.nickname === user?.nickname;

  // Oyuncuları skora göre sırala
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const handlePlayAgain = () => {
    // Aynı odada oyunu yeniden başlat
    if (roomId) {
      restartGame();
      // Game ekranına yönlendir (oyun başladığında otomatik yönlendirilecek)
      (navigation as any).navigate('Game');
    } else {
      // Oda yoksa Room ekranına yönlendir
      resetGame();
      disconnect();
      (navigation as any).navigate('Room');
    }
  };

  const handleGoHome = () => {
    resetGame();
    disconnect();
    (navigation as any).navigate('Room');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          {isWinner ? (
            <>
              <Text style={styles.trophy}>🏆</Text>
              <Text style={styles.winnerText}>Tebrikler!</Text>
              <Text style={styles.winnerSubtext}>Kazandınız! 🎉</Text>
            </>
          ) : (
            <>
              <Text style={styles.trophy}>😊</Text>
              <Text style={styles.loserText}>Güzel Oyun!</Text>
              <Text style={styles.loserSubtext}>
                {winner?.nickname} kazandı! 🎉
              </Text>
            </>
          )}
        </View>

        <View style={styles.scoresContainer}>
          <Text style={styles.scoresTitle}>🏆 Final Skorları</Text>
          <View style={styles.playersList}>
            {sortedPlayers.map((player, index) => {
              const isCurrentUser = player.nickname === user?.nickname;
              const isTopPlayer = index === 0;
              
              return (
                <View 
                  key={player.id} 
                  style={[
                    styles.playerWrapper,
                    isTopPlayer && styles.topPlayerWrapper
                  ]}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </Text>
                  </View>
                  <PlayerCard player={player} isCurrentUser={isCurrentUser} />
                  {isTopPlayer && (
                    <Text style={styles.winnerBadge}>🏆 Kazanan</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Yeniden Oyna"
            onPress={handlePlayAgain}
            variant="primary"
          />
          <View style={styles.buttonSpacing} />
          <Button
            title="🏠 Anasayfaya Dön"
            onPress={handleGoHome}
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
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  trophy: {
    fontSize: 80,
    marginBottom: 20,
  },
  winnerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  winnerSubtext: {
    fontSize: 20,
    color: '#666',
  },
  loserText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: 10,
  },
  loserSubtext: {
    fontSize: 20,
    color: '#666',
  },
  scoresContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scoresTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  playersList: {
    // gap: 15, // React Native'de gap desteği yok, margin kullanıyoruz
  },
  playerWrapper: {
    alignItems: 'center',
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  topPlayerWrapper: {
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  rankBadge: {
    marginBottom: 10,
  },
  rankText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  winnerBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  actions: {
    marginTop: 20,
    marginBottom: 40,
  },
  buttonSpacing: {
    height: 15,
  },
});
