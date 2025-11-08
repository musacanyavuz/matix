#!/bin/bash

# iOS Expo Dev Server Başlatıcı (Port 8081)
# Kullanım: ./scripts/start-ios.sh

echo "🍎 iOS Expo Dev Server Başlatılıyor (Port 8081)..."

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# IP adresini al (macOS için)
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP_ADDRESS=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
else
    IP_ADDRESS="localhost"
fi

echo "📱 IP Adresi: $IP_ADDRESS"
echo "🔌 Port: 8081 (iOS)"
echo ""

# Context dosyasındaki SOCKET_URL'i güncelle
echo "⚙️  Socket URL güncelleniyor..."
if [ -f "contexts/GameContext.tsx" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|const SOCKET_URL = 'http://.*'|const SOCKET_URL = 'http://$IP_ADDRESS:3001'|" contexts/GameContext.tsx
    else
        sed -i "s|const SOCKET_URL = 'http://.*'|const SOCKET_URL = 'http://$IP_ADDRESS:3001'|" contexts/GameContext.tsx
    fi
    echo "✅ Socket URL güncellendi: http://$IP_ADDRESS:3001"
fi

echo ""
echo "📱 iPhone'unuzu hazırlayın:"
echo "   1. Expo Go uygulamasını açın"
echo "   2. QR kodu tarayın veya terminalden 'i' tuşuna basın"
echo ""

# Expo'yu iOS portunda başlat
npx expo start --port 8081


