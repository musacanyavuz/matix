#!/bin/bash

# Proje kurulum scripti
# Kullanım: ./scripts/setup.sh

echo "🔧 Matix Proje Kurulumu Başlatılıyor..."
echo ""

# Node.js kontrolü
if ! command -v npm &>/dev/null; then
    echo "❌ Node.js/npm bulunamadı!"
    echo ""
    echo "Lütfen önce Node.js kurun:"
    echo "   • macOS: brew install node"
    echo "   • veya: https://nodejs.org adresinden indirin"
    echo ""
    exit 1
fi
echo "✅ Node.js $(node -v) / npm $(npm -v)"
echo ""

# Proje kök dizinine git
cd "$(dirname "$0")/.." || exit

# Backend .env oluştur (yoksa)
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ backend/.env oluşturuldu"
fi

# Mobil uygulama (Expo) bağımlılıklarını yükle
echo "📦 Mobil uygulama bağımlılıkları yükleniyor..."
if [ ! -d "node_modules" ]; then
    npm install && echo "✅ Ana proje bağımlılıkları yüklendi" || exit 1
else
    echo "✅ Ana proje bağımlılıkları zaten yüklü"
fi

echo ""

# Backend bağımlılıklarını yükle (Auth, Socket.io, Firebase)
echo "📦 Backend bağımlılıkları yükleniyor..."
if [ ! -d "backend/node_modules" ]; then
    (cd backend && npm install) && echo "✅ Backend bağımlılıkları yüklendi" || exit 1
else
    echo "✅ Backend bağımlılıkları zaten yüklü"
fi

echo ""
echo "✨ Kurulum tamamlandı!"
echo ""
echo "📝 Sonraki adımlar:"
echo "   1. Firebase ayarlarını backend/.env dosyasında yapılandırın"
echo "   2. Backend başlatın: ./scripts/start-server.sh"
echo "   3. Test: ./scripts/test-android.sh veya ./scripts/test-ios.sh"
echo ""

