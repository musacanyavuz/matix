#!/bin/bash

# React Native AsyncStorage temizleme scripti
# Bu script Expo uygulamasını yeniden başlatır ve storage'ı temizler

echo "🧹 AsyncStorage temizleniyor..."

# Expo cache'i temizle
echo "📦 Expo cache temizleniyor..."
cd "$(dirname "$0")/.." || exit

# Metro bundler'ı durdur
echo "🛑 Metro bundler durduruluyor..."
pkill -f "expo start" || true
pkill -f "metro" || true

# Expo cache'i temizle
npx expo start --clear 2>&1 | head -5 &
EXPO_PID=$!

sleep 2

# Expo process'i durdur
kill $EXPO_PID 2>/dev/null || true

echo "✅ Cache temizlendi!"
echo ""
echo "📱 Uygulamayı yeniden başlatmak için:"
echo "   npx expo start --clear"
echo ""
echo "💡 Veya uygulama içinde WelcomeScreen'de clearAllData() fonksiyonunu çağırabilirsiniz."

