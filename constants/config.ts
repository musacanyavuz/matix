/**
 * API ve Socket sunucu yapılandırması
 *
 * Development: Fiziksel cihaz testi için ./scripts/test-android.sh gibi scriptler
 *   bu dosyadaki API_BASE_URL'i otomatik günceller.
 *
 * Production: EXPO_PUBLIC_API_URL ortam değişkeni (EAS Build / CI)
 *   Örnek .env: EXPO_PUBLIC_API_URL=https://api.matix.app
 */

// @ts-ignore - Expo injects EXPO_PUBLIC_* at build time
const envUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;

// Scriptler (test-android.sh vb.) bu satırı sed ile günceller: http://YOUR_IP:3001
const DEV_DEFAULT_URL = 'http://192.168.1.106:3001';

export const API_BASE_URL =
  (typeof envUrl === 'string' && envUrl.length > 0 ? envUrl.replace(/\/$/, '') : null) ??
  (__DEV__ ? DEV_DEFAULT_URL : 'https://api.matix.app');
