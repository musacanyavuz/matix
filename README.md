# 🎮 Matix - Matematik Yarışması

İlkokul seviyesindeki çocuklar için tasarlanmış, online multiplayer matematik yarışması oyunu.

## 📱 Özellikler

- ✅ Kayıt/Giriş ve misafir modu
- ✅ Profil oluşturma (nickname + hayvan avatar seçimi)
- ✅ **Yaş/Sınıf seçimi** (4-5-6 yaş, 1-2-3-4. sınıf)
- ✅ **Yaş grubuna göre soru zorluk seviyesi**
- ✅ Gerçek zamanlı multiplayer oyun (Socket.io)
- ✅ Arkadaş ekleme ve oyun daveti
- ✅ Macera modu (botlarla bölüm geçme)
- ✅ Oda oluşturma ve katılma sistemi
- ✅ 10 soruluk matematik yarışması (toplama, çıkarma, çarpma, bölme)
- ✅ Anlık skor takibi
- ✅ Liderlik tablosu ve performans istatistikleri
- ✅ Türkçe / İngilizce dil desteği

## 🛠️ Teknolojiler

- **Mobil:** React Native (Expo), Socket.io Client
- **Backend:** Express.js, Socket.io, Firebase Firestore
- **Kimlik:** JWT, bcrypt
- **State:** React Context API, AsyncStorage

## 📦 Kurulum

### Hızlı Başlangıç (Önerilen)

```bash
# 1. Projeyi kur (mobil + backend)
./scripts/setup.sh

# 2. Backend yapılandırması
cp backend/.env.example backend/.env
# backend/.env dosyasında Firebase ayarlarını yapın

# 3. Backend sunucusunu başlat (ayrı terminal)
./scripts/start-server.sh

# 4. Test seçenekleri:
./scripts/test-android.sh    # Android
./scripts/test-ios.sh        # iOS (fiziksel cihaz)
```

### Manuel Kurulum

#### 1. Bağımlılıkları Yükle

```bash
npm install
cd backend && npm install && cd ..
```

#### 2. Backend Yapılandırması

```bash
cp backend/.env.example backend/.env
```

`backend/.env` dosyasında:
- `FIREBASE_PROJECT_ID` - Firebase proje ID
- `FIREBASE_SERVICE_ACCOUNT_PATH` veya `FIREBASE_SERVICE_ACCOUNT_KEY` - Service Account
- `JWT_SECRET` - Production için mutlaka değiştirin!

#### 3. Backend Sunucusunu Başlat

```bash
cd backend
npm run dev
```

Sunucu varsayılan olarak `http://localhost:3001` adresinde çalışır.

#### 4. Mobil Uygulamayı Başlat

```bash
npm start
```

- **Simülatör/Emülatör:** Varsayılan `localhost:3001` kullanılır
- **Fiziksel cihaz:** Test scriptleri (`test-android.sh`, `test-ios.sh`) IP adresini otomatik günceller

## 🚀 Production / Store Yayını

### API URL Yapılandırması

Production build için `EXPO_PUBLIC_API_URL` ortam değişkenini ayarlayın:

```bash
# EAS Build örneği
export EXPO_PUBLIC_API_URL=https://api.matix.app
eas build --platform android
```

Veya `.env` dosyasında:
```
EXPO_PUBLIC_API_URL=https://api.matix.app
```

### App Icon ve Splash

Store'a gönderirken özel ikon eklemek için `assets/` klasörüne bakın. Detaylar: `assets/README.md`

### Backend Deployment

Backend'i (Express + Socket.io + Firebase) bir cloud servise deploy edin (Railway, Render, Google Cloud Run vb.). CORS ayarlarını `backend/.env` ile yapılandırın.

### Android Yayın Konfigürasyonu (Play Store)

Bu repo Android yayın için EAS profilleriyle hazırlandı:

- `preview` -> APK (`internal` dağıtım)
- `production` -> AAB (`internal` track submit)

#### İlk Kurulum

```bash
# Expo hesabına giriş
npx eas login

# Build konfigürasyonu
npx eas build:configure
```

#### Environment

```bash
cp .env.example .env
# .env içinde EXPO_PUBLIC_API_URL değerini production backend URL'iniz yapın
```

#### Android Build

```bash
# İç test APK (QA)
npm run build:android:preview

# Play Store için AAB
npm run build:android:production
```

#### Play Store'a Gönderim

```bash
# Google Play Console internal track
npm run submit:android:production
```

> Not: İlk submit'te EAS sizden Google Play Service Account JSON veya Play Console bağlantısı ister.
> `app.json` içindeki `android.versionCode` ve EAS `autoIncrement` birlikte sürüm yönetimi yapar.

## 📁 Proje Yapısı

```
matix/
├── App.tsx
├── contexts/
│   ├── GameContext.tsx      # Oyun + Auth + Socket
│   └── LanguageContext.tsx
├── screens/
│   ├── WelcomeScreen, LoginScreen, RegisterScreen
│   ├── HomeScreen, ProfileScreen, RoomScreen
│   ├── GameScreen, ResultScreen
│   ├── LeaderboardScreen, PerformanceScreen
│   ├── AdventureMapScreen, FriendListScreen...
│   └── ...
├── constants/
│   ├── config.ts            # API_BASE_URL (merkezi)
│   ├── avatars.ts, ageGroups.ts
│   └── ...
├── locales/                 # tr.json, en.json
└── backend/
    ├── src/
    │   ├── server.js        # Express + Socket.io
    │   ├── routes/          # Auth, Users, Rooms, Friends
    │   ├── services/        # Firebase Firestore
    │   └── socket/          # Oyun mantığı
    ├── prisma/              # Schema (Firebase kullanılıyor)
    └── .env.example
```

## 🔧 Geliştirme

### API URL Değişikliği

- **constants/config.ts** - Merkezi yapılandırma
- Development: `localhost` veya test scriptleri ile IP
- Production: `EXPO_PUBLIC_API_URL` env variable

### Backend Port

```bash
# backend/.env
PORT=3001
```

## 📝 Lisans

Bu proje eğitim amaçlı oluşturulmuştur.

---

**Not:** Production öncesi `JWT_SECRET` mutlaka güçlü bir değerle değiştirilmelidir.
