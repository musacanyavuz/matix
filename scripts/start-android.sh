#!/bin/bash

# Android Expo Dev Server Başlatıcı (Port 8082)
# Kullanım: ./scripts/start-android.sh

echo "🤖 Android Expo Dev Server Başlatılıyor (Port 8082)..."

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# IP adresini al (macOS için)
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP_ADDRESS=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
else
    IP_ADDRESS="localhost"
fi

echo "📱 IP Adresi: $IP_ADDRESS"
echo "🔌 Port: 8082 (Android)"
echo ""

# Config dosyasındaki API URL'ini güncelle
echo "⚙️  API URL güncelleniyor..."
if [ -f "constants/config.ts" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|const DEV_DEFAULT_URL = 'http://[^']*'|const DEV_DEFAULT_URL = 'http://$IP_ADDRESS:3001'|" constants/config.ts
    else
        sed -i "s|const DEV_DEFAULT_URL = 'http://[^']*'|const DEV_DEFAULT_URL = 'http://$IP_ADDRESS:3001'|" constants/config.ts
    fi
    echo "✅ API URL güncellendi: http://$IP_ADDRESS:3001"
fi

echo ""
echo "📱 Android cihazınızı hazırlayın:"
echo "   1. Expo Go uygulamasını açın"
echo "   2. QR kodu tarayın veya terminalden 'a' tuşuna basın"
echo ""

# Expo'yu Android portunda başlat
npx expo start --port 8082


