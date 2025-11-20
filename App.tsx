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
import { PerformanceScreen } from './screens/PerformanceScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AdventureMapScreen } from './screens/AdventureMapScreen';
import { FriendListScreen } from './screens/FriendListScreen';
import { AddFriendScreen } from './screens/AddFriendScreen';
import { FriendRequestsScreen } from './screens/FriendRequestsScreen';
import { HomeScreen } from './screens/HomeScreen';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';

// Room Header Buttons Component
const RoomHeaderButtons: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isAuthenticated } = useGame();

  return (
    <View style={headerButtonStyles.container}>
      {isAuthenticated && (
        <TouchableOpacity
          style={headerButtonStyles.button}
          onPress={() => navigation.navigate('FriendList')}
        >
          <Text style={headerButtonStyles.icon}>👥</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={headerButtonStyles.button}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={headerButtonStyles.avatar}>{user?.avatar || '👤'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={headerButtonStyles.button}
        onPress={() => navigation.navigate('Leaderboard')}
      >
        <Text style={headerButtonStyles.icon}>🏆</Text>
      </TouchableOpacity>
    </View>
  );
};

const headerButtonStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatar: {
    fontSize: 24,
  },
  icon: {
    fontSize: 20,
  },
});

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

    if (gameStatus === 'playing' || gameStatus === 'waiting') {
      // Oyun başladı veya bekleniyor - Game ekranına yönlendir
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
  const { user, isLoadingUser, isAuthenticated } = useGame();
  const { t, language } = useLanguage();
  const navigationRef = React.useRef<any>(null);

  // Dil değiştiğinde navigation header'larını güncelle
  useEffect(() => {
    if (navigationRef.current?.isReady()) {
      // Navigation header'ları otomatik olarak güncellenecek
      // çünkü options fonksiyonları her render'da çağrılıyor
    }
  }, [language, t]);

  // Kullanıcı bilgisi yüklenene kadar bekle
  if (isLoadingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Login olmuş kullanıcıyı Home ekranına yönlendir, misafir kullanıcıyı Room'a
  // isAuthenticated true ise kayıtlı kullanıcı, user varsa misafir veya kayıtlı
  const initialRoute = isAuthenticated ? 'Home' : (user ? 'Room' : 'Welcome');

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
        initialRouteName={initialRoute}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ 
            headerShown: true,
            title: '🏠 Ana Sayfa',
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ 
            headerShown: true,
            title: t('welcome.title'),
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ 
            headerShown: true,
            title: t('register.title'),
          }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ 
            headerShown: true,
            title: t('login.title'),
          }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ 
            headerShown: true,
            title: t('profile.title'),
          }}
        />
        <Stack.Screen
          name="Room"
          component={RoomScreen}
          options={({ navigation }) => ({
            title: `🎯 ${t('room.title')}`,
            headerBackTitle: t('common.back'),
            contentStyle: { flex: 1 },
            headerRight: () => <RoomHeaderButtons navigation={navigation} />,
          })}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            title: t('game.title'),
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            title: t('result.title'),
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            title: `🏆 ${t('leaderboard.title')}`,
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Performance"
          component={PerformanceScreen}
          options={{
            title: t('performance.title'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ 
            title: t('settings.title'),
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="AdventureMap"
          component={AdventureMapScreen}
          options={{ 
            title: '🗺️ Macera Haritası',
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="FriendList"
          component={FriendListScreen}
          options={{ 
            title: '👥 Arkadaşlarım',
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="AddFriend"
          component={AddFriendScreen}
          options={{ 
            title: '➕ Arkadaş Ekle',
            headerBackTitle: t('common.back'),
          }}
        />
        <Stack.Screen
          name="FriendRequests"
          component={FriendRequestsScreen}
          options={{ 
            title: '📬 Bekleyen İstekler',
            headerBackTitle: t('common.back'),
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

