#!/bin/bash

# Backend sunucu başlatma scripti
# Kullanım: ./scripts/start-server.sh

echo "🚀 Matix Backend Sunucusu Başlatılıyor..."

# Backend klasörüne git
cd "$(dirname "$0")/../server" || exit

# Bağımlılıkları kontrol et ve yükle
if [ ! -d "node_modules" ]; then
    echo "📦 Bağımlılıklar yükleniyor..."
    npm install
fi

# Prisma client'ı generate et
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 Prisma client oluşturuluyor..."
    npm run prisma:generate
fi

# Port kontrolü
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3001 zaten kullanımda. Mevcut süreç sonlandırılıyor..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Sunucuyu başlat
echo "✅ Sunucu başlatılıyor..."
npm run dev

