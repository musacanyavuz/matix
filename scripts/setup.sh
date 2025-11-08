#!/bin/bash

# Proje kurulum scripti
# Kullanım: ./scripts/setup.sh

echo "🔧 Matix Proje Kurulumu Başlatılıyor..."
echo ""

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# Ana proje bağımlılıklarını yükle
echo "📦 Ana proje bağımlılıkları yükleniyor..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Ana proje bağımlılıkları yüklendi"
else
    echo "✅ Ana proje bağımlılıkları zaten yüklü"
fi

echo ""

# Sunucu bağımlılıklarını yükle
echo "📦 Sunucu bağımlılıkları yükleniyor..."
if [ ! -d "server/node_modules" ]; then
    cd server
    npm install
    cd ..
    echo "✅ Sunucu bağımlılıkları yüklendi"
else
    echo "✅ Sunucu bağımlılıkları zaten yüklü"
fi

echo ""
echo "✨ Kurulum tamamlandı!"
echo ""
echo "📝 Sonraki adımlar:"
echo "   1. Socket.io sunucusunu başlatın: ./scripts/start-server.sh"
echo "   2. Android için test: ./scripts/test-android.sh"
echo "   3. iOS için test: ./scripts/test-ios.sh"
echo ""

