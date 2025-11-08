import React, { useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { GameProvider, useGame } from './contexts/GameContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RoomScreen } from './screens/RoomScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { LanguageSelector } from './components/LanguageSelector';
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
  const { user } = useGame();
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = React.useState(true);
  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    // Kullanıcı bilgisi yüklenene kadar bekle
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  // Dil değiştiğinde navigation header'larını güncelle
  useEffect(() => {
    if (navigationRef.current?.isReady()) {
      // Navigation header'ları otomatik olarak güncellenecek
      // çünkü options fonksiyonları her render'da çağrılıyor
    }
  }, [language, t]);

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
          headerRight: () => <LanguageSelector />,
        }}
        initialRouteName={user ? 'Room' : 'Welcome'}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ 
            headerShown: true,
            title: t('welcome.title'),
            headerRight: () => <LanguageSelector />,
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ 
            headerShown: true,
            title: t('register.title'),
            headerRight: () => <LanguageSelector />,
          }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ 
            headerShown: true,
            title: t('login.title'),
            headerRight: () => <LanguageSelector />,
          }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ 
            headerShown: true,
            title: t('profile.title'),
            headerRight: () => <LanguageSelector />,
          }}
        />
        <Stack.Screen
          name="Room"
          component={RoomScreen}
          options={{
            title: t('room.title'),
            headerBackTitle: t('common.back'),
            headerRight: () => <LanguageSelector />,
          }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            title: t('game.title'),
            gestureEnabled: false,
            headerLeft: () => null,
            headerRight: () => <LanguageSelector />,
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            title: t('result.title'),
            headerBackTitle: t('common.back'),
            headerRight: () => <LanguageSelector />,
          }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            title: t('leaderboard.title'),
            headerBackTitle: t('common.back'),
            headerRight: () => <LanguageSelector />,
          }}
        />
      </Stack.Navigator>
    </>
  );
};

// Ana App component
export default function App() {
  return (
    <LanguageProvider>
      <GameProvider>
        <StatusBar style="light" />
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </GameProvider>
    </LanguageProvider>
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

