#!/bin/bash

# Hem iOS hem Android Expo Dev Server'ları Başlatıcı
# Kullanım: ./scripts/start-both.sh

echo "🚀 iOS ve Android Expo Dev Server'ları Başlatılıyor..."
echo ""

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# IP adresini al (macOS için)
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP_ADDRESS=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
else
    IP_ADDRESS="localhost"
fi

echo "📱 IP Adresi: $IP_ADDRESS"
echo "🔌 iOS Port: 8081"
echo "🔌 Android Port: 8082"
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

# Backend sunucusunun çalışıp çalışmadığını kontrol et
echo ""
echo "🔍 Backend sunucusu kontrol ediliyor..."
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "⚠️  Backend sunucusu çalışmıyor!"
    echo "💡 Sunucuyu başlatmak için: ./scripts/start-server.sh"
    echo ""
    read -p "Sunucuyu şimdi başlatmak ister misiniz? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/start-server.sh &
        SERVER_PID=$!
        echo "⏳ Sunucu başlatılıyor, 5 saniye bekleniyor..."
        sleep 5
    fi
fi

echo ""
echo "📱 Cihazlarınızı hazırlayın:"
echo "   iPhone: Expo Go ile QR kodu tarayın (Port 8081)"
echo "   Android: Expo Go ile QR kodu tarayın (Port 8082)"
echo ""
echo "💡 İki ayrı terminal açılacak:"
echo "   - Terminal 1: iOS (Port 8081)"
echo "   - Terminal 2: Android (Port 8082)"
echo ""
read -p "Devam etmek için Enter'a basın..."

# Yeni terminal pencerelerinde başlat
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - yeni Terminal pencereleri aç
    osascript -e "tell application \"Terminal\" to do script \"cd '$(pwd)' && ./scripts/start-ios.sh\""
    sleep 2
    osascript -e "tell application \"Terminal\" to do script \"cd '$(pwd)' && ./scripts/start-android.sh\""
    echo ""
    echo "✅ İki terminal penceresi açıldı!"
    echo "   - Terminal 1: iOS (Port 8081)"
    echo "   - Terminal 2: Android (Port 8082)"
else
    # Linux - tmux veya screen kullan
    if command -v tmux &> /dev/null; then
        tmux new-session -d -s ios "cd '$(pwd)' && ./scripts/start-ios.sh"
        tmux new-session -d -s android "cd '$(pwd)' && ./scripts/start-android.sh"
        echo ""
        echo "✅ tmux session'ları oluşturuldu!"
        echo "   - iOS: tmux attach -t ios"
        echo "   - Android: tmux attach -t android"
    else
        echo ""
        echo "⚠️  macOS'ta yeni terminal pencereleri açılamadı."
        echo "💡 Manuel olarak iki terminal açıp şu komutları çalıştırın:"
        echo ""
        echo "Terminal 1 (iOS):"
        echo "  ./scripts/start-ios.sh"
        echo ""
        echo "Terminal 2 (Android):"
        echo "  ./scripts/start-android.sh"
    fi
fi

# Temizlik
if [ ! -z "$SERVER_PID" ]; then
    trap "kill $SERVER_PID 2>/dev/null" EXIT
fi


