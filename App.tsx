import React, { useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { GameProvider, useGame } from './contexts/GameContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RoomScreen } from './screens/RoomScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createStackNavigator();

// Navigation ref for programmatic navigation
const navigationRef = React.createRef<NavigationContainerRef<any>>();

// Navigasyon yönlendirmesi için wrapper component
const NavigationHandler: React.FC = () => {
  const { gameStatus } = useGame();

  useEffect(() => {
    if (!navigationRef.current?.isReady()) {
      return;
    }

    if (gameStatus === 'playing') {
      navigationRef.current?.navigate('Game' as never);
    } else if (gameStatus === 'finished') {
      navigationRef.current?.navigate('Result' as never);
    } else if (gameStatus === 'idle') {
      navigationRef.current?.navigate('Room' as never);
    }
  }, [gameStatus]);

  return null;
};

// Navigasyon yönlendirmesi için wrapper component
const AppNavigator: React.FC = () => {
  const { user, clearAllData } = useGame();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Storage'ı temizle ve uygulamayı sıfırla
    const initApp = async () => {
      try {
        await clearAllData();
        console.log('✅ Storage temizlendi, uygulama sıfırlandı');
      } catch (error) {
        console.error('❌ Storage temizleme hatası:', error);
      } finally {
        // Kullanıcı bilgisi yüklenene kadar bekle
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    };
    
    initApp();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      <NavigationHandler />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4CAF50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
        initialRouteName={user ? 'Room' : 'Welcome'}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Room"
          component={RoomScreen}
          options={{
            title: 'Oda Seçimi',
            headerBackTitle: 'Geri',
          }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            title: 'Oyun',
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            title: 'Sonuçlar',
            headerBackTitle: 'Geri',
          }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            title: 'Liderlik Tablosu',
            headerBackTitle: 'Geri',
          }}
        />
      </Stack.Navigator>
    </>
  );
};

// Ana App component
export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

