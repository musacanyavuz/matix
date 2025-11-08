/**
 * Storage Utilities
 * AsyncStorage işlemleri için yardımcı fonksiyonlar
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tüm AsyncStorage verilerini temizle
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log('✅ AsyncStorage temizlendi');
  } catch (error) {
    console.error('❌ AsyncStorage temizleme hatası:', error);
    throw error;
  }
};

/**
 * Belirli bir key'i temizle
 */
export const removeItem = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`✅ ${key} temizlendi`);
  } catch (error) {
    console.error(`❌ ${key} temizleme hatası:`, error);
    throw error;
  }
};

/**
 * Tüm kullanıcı verilerini temizle (user, token, userId)
 */
export const clearUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(['user', 'token', 'userId']);
    console.log('✅ Kullanıcı verileri temizlendi');
  } catch (error) {
    console.error('❌ Kullanıcı verileri temizleme hatası:', error);
    throw error;
  }
};

