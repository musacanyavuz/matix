#!/bin/bash

# Android test scripti
# Kullanım: ./scripts/test-android.sh

echo "🤖 Android Test Başlatılıyor..."

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# Bağımlılıkları kontrol et ve yükle
if [ ! -d "node_modules" ]; then
    echo "📦 Bağımlılıklar yükleniyor..."
    npm install
fi

# Socket.io sunucusunun çalışıp çalışmadığını kontrol et
echo "🔍 Socket.io sunucusu kontrol ediliyor..."
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "⚠️  Socket.io sunucusu çalışmıyor!"
    echo "💡 Sunucuyu başlatmak için: ./scripts/start-server.sh"
    echo ""
    read -p "Sunucuyu şimdi başlatmak ister misiniz? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Arka planda sunucuyu başlat
        ./scripts/start-server.sh &
        SERVER_PID=$!
        echo "⏳ Sunucu başlatılıyor, 5 saniye bekleniyor..."
        sleep 5
    else
        echo "❌ Sunucu olmadan test yapılamaz. Çıkılıyor..."
        exit 1
    fi
fi

# IP adresini al (macOS/Linux için)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP_ADDRESS=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP_ADDRESS=$(hostname -I | awk '{print $1}' || echo "localhost")
else
    IP_ADDRESS="localhost"
fi

echo "📱 IP Adresi: $IP_ADDRESS"
echo ""

# Config dosyasındaki API URL'ini güncelle (fiziksel cihaz için)
echo "⚙️  API URL güncelleniyor..."
if [ -f "constants/config.ts" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|const DEV_DEFAULT_URL = 'http://[^']*'|const DEV_DEFAULT_URL = 'http://$IP_ADDRESS:3001'|" constants/config.ts
    else
        sed -i "s|const DEV_DEFAULT_URL = 'http://[^']*'|const DEV_DEFAULT_URL = 'http://$IP_ADDRESS:3001'|" constants/config.ts
    fi
    echo "✅ API URL güncellendi: http://$IP_ADDRESS:3001"
else
    echo "⚠️  constants/config.ts dosyası bulunamadı!"
fi

echo ""
echo "📱 Android cihazınızı hazırlayın:"
echo "   1. Expo Go uygulamasını yükleyin (Play Store'dan)"
echo "   2. Bilgisayarınız ve telefonunuz aynı WiFi ağında olmalı"
echo "   3. QR kodu okutun veya terminalden 'a' tuşuna basın"
echo ""

# Expo'yu başlat
echo "🚀 Expo başlatılıyor..."
npx expo start --android

# Temizlik (eğer sunucu bu script tarafından başlatıldıysa)
if [ ! -z "$SERVER_PID" ]; then
    trap "kill $SERVER_PID 2>/dev/null" EXIT
fi

