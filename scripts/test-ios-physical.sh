#!/bin/bash

# iOS Fiziksel Cihaz Test Scripti (Xcode Gerektirmez)
# Kullanım: ./scripts/test-ios-physical.sh

echo "📱 iOS Fiziksel Cihaz Test Başlatılıyor..."
echo "⚠️  Xcode GEREKMEZ - Sadece Expo Go uygulaması yeterli!"
echo ""

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

# IP adresini al (macOS için)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP_ADDRESS=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
else
    IP_ADDRESS="localhost"
fi

echo "📱 IP Adresi: $IP_ADDRESS"
echo ""

# Context dosyasındaki SOCKET_URL'i güncelle
echo "⚙️  Socket URL güncelleniyor..."
if [ -f "contexts/GameContext.tsx" ]; then
    # macOS için sed komutu
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|const SOCKET_URL = 'http://.*'|const SOCKET_URL = 'http://$IP_ADDRESS:3001'|" contexts/GameContext.tsx
    else
        sed -i "s|const SOCKET_URL = 'http://.*'|const SOCKET_URL = 'http://$IP_ADDRESS:3001'|" contexts/GameContext.tsx
    fi
    echo "✅ Socket URL güncellendi: http://$IP_ADDRESS:3001"
else
    echo "⚠️  contexts/GameContext.tsx dosyası bulunamadı!"
fi

echo ""
echo "📱 iPhone'unuzu hazırlayın:"
echo "   1. App Store'dan 'Expo Go' uygulamasını yükleyin"
echo "   2. Bilgisayarınız ve iPhone'unuz AYNI WiFi ağında olmalı"
echo "   3. Terminal'de çıkan QR kodu Expo Go ile tarayın"
echo "   4. Veya terminalden 'i' tuşuna basıp URL'i manuel girin"
echo ""

# Expo'yu başlat (Xcode gerektirmez)
echo "🚀 Expo başlatılıyor..."
echo "💡 QR kod terminal'de görünecek - Expo Go ile tarayın!"
echo ""

npx expo start

# Temizlik (eğer sunucu bu script tarafından başlatıldıysa)
if [ ! -z "$SERVER_PID" ]; then
    trap "kill $SERVER_PID 2>/dev/null" EXIT
fi


