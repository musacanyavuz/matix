# Matix Backend API

Node.js + Express.js + PostgreSQL + Prisma + Socket.io tabanlı backend API.

## 📋 Gereksinimler

- Node.js 18+
- PostgreSQL 14+
- npm veya yarn

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle

```bash
cd backend
npm install
```

### 2. Veritabanı Yapılandırması

`.env` dosyasını `.env.example`'dan kopyalayın:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin ve PostgreSQL bağlantı bilgilerinizi girin:

**Bağlantı String Formatı:**
- Prisma formatı: `postgresql://username:password@host:port/database?schema=public`
- Örnek: `postgresql://postgres:123456@localhost:5432/matix?schema=public`

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/matix?schema=public"
PORT=3001
NODE_ENV=development
```

### 3. Veritabanını Oluştur

PostgreSQL'de veritabanı oluşturun:

```sql
CREATE DATABASE matix;
```

### 4. Prisma Migrations

```bash
# Prisma client'ı oluştur
npm run prisma:generate

# Veritabanı migration'larını çalıştır
npm run prisma:migrate
```

### 5. Sunucuyu Başlat

```bash
# Development (nodemon ile)
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Kullanıcı İşlemleri

- `POST /api/users` - Yeni kullanıcı oluştur
- `GET /api/users/leaderboard` - Global liderlik tablosu (top 10)
- `GET /api/users/:id` - Kullanıcı detayı

### Oda İşlemleri

- `POST /api/rooms` - Yeni oda oluştur
- `POST /api/rooms/join` - Odaya katıl
- `GET /api/rooms/:code/participants` - Oda katılımcılarını listele
- `DELETE /api/rooms/:id` - Odayı sil

## 🔌 Socket.io Events

### Client → Server

- `register` - Kullanıcı kaydı
- `joinRoom` - Odaya katıl
- `startGame` - Oyunu başlat
- `sendAnswer` - Cevap gönder
- `leaveRoom` - Odadan ayrıl

### Server → Client

- `playerJoined` - Yeni oyuncu katıldı
- `gameStarted` - Oyun başladı
- `newQuestion` - Yeni soru
- `scoreUpdate` - Skor güncellemesi
- `answerResult` - Cevap sonucu
- `endGame` - Oyun bitti
- `error` - Hata mesajı

## 📁 Proje Yapısı

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Prisma client
│   ├── controllers/
│   │   ├── userController.js    # Kullanıcı controller
│   │   └── roomController.js    # Oda controller
│   ├── services/
│   │   ├── userService.js       # Kullanıcı iş mantığı
│   │   └── roomService.js       # Oda iş mantığı
│   ├── routes/
│   │   ├── userRoutes.js        # Kullanıcı route'ları
│   │   └── roomRoutes.js        # Oda route'ları
│   ├── middleware/
│   │   ├── errorHandler.js      # Hata yönetimi
│   │   └── rateLimiter.js       # Rate limiting
│   ├── socket/
│   │   └── socketHandler.js     # Socket.io handler'ları
│   ├── utils/
│   │   └── gameLogic.js         # Oyun mantığı
│   └── server.js                # Ana server dosyası
├── prisma/
│   └── schema.prisma            # Veritabanı şeması
├── .env.example                  # Ortam değişkenleri örneği
├── package.json
└── README.md
```

## 🗄️ Veritabanı Modelleri

- **users** - Kullanıcılar
- **rooms** - Oyun odaları
- **room_participants** - Oda katılımcıları
- **game_sessions** - Oyun oturumları

## 🔧 Prisma Komutları

```bash
# Prisma client oluştur
npm run prisma:generate

# Migration oluştur ve uygula
npm run prisma:migrate

# Prisma Studio (veritabanı görüntüleme)
npm run prisma:studio
```

## 📝 Notlar

- Rate limiting aktif (varsayılan: 15 dakikada 100 istek)
- CORS yapılandırılabilir
- Tüm hatalar JSON formatında döner
- Socket.io bağlantıları kullanıcı kimliği ile doğrulanır

## 🐛 Sorun Giderme

**Veritabanı bağlantı hatası:**
- `.env` dosyasındaki `DATABASE_URL`'i kontrol edin
- PostgreSQL servisinin çalıştığından emin olun

**Port zaten kullanılıyor:**
- `.env` dosyasında farklı bir `PORT` değeri kullanın

**Prisma migration hatası:**
- Veritabanının boş olduğundan emin olun
- `npm run prisma:migrate reset` ile sıfırlayın (dikkat: tüm veriler silinir)

