# Script Rehberi

## 🚀 Expo Dev Server Script'leri

### Tek Cihaz İçin

#### iOS (Port 8081)
```bash
./scripts/start-ios.sh
```
- iOS cihazınız için Expo dev server başlatır
- Port: 8081
- QR kod terminal'de görünür

#### Android (Port 8082)
```bash
./scripts/start-android.sh
```
- Android cihazınız için Expo dev server başlatır
- Port: 8082
- QR kod terminal'de görünür

### İki Cihaz Aynı Anda

#### Otomatik (macOS)
```bash
./scripts/start-both.sh
```
- iOS için Port 8081
- Android için Port 8082
- İki ayrı terminal penceresi açar

#### Manuel (Tüm Platformlar)
İki ayrı terminal açın:

**Terminal 1 (iOS):**
```bash
./scripts/start-ios.sh
```

**Terminal 2 (Android):**
```bash
./scripts/start-android.sh
```

## 🔧 Diğer Script'ler

### Backend Sunucusu
```bash
./scripts/start-server.sh
```
- Backend sunucusunu başlatır (Port 3001)
- Socket.io aktif olur

### Test Script'leri
```bash
./scripts/test-ios.sh      # iOS test (backend kontrolü + iOS)
./scripts/test-android.sh  # Android test (backend kontrolü + Android)
```

## 📱 Port Kullanımı

- **Backend**: Port 3001 (Socket.io + REST API)
- **iOS Expo**: Port 8081
- **Android Expo**: Port 8082

## 💡 Kullanım İpuçları

1. **Backend sunucusu çalışıyor olmalı** (Port 3001)
2. **Her iki cihaz aynı WiFi ağında** olmalı
3. **Expo Go** uygulaması her iki cihazda da yüklü olmalı
4. QR kodları farklı portlardan gelecek:
   - iOS: `exp://192.168.1.104:8081`
   - Android: `exp://192.168.1.104:8082`

## 🔍 Sorun Giderme

### Port zaten kullanımda
```bash
# Port kontrolü
lsof -ti:8081  # iOS port
lsof -ti:8082  # Android port
lsof -ti:3001  # Backend port

# Port'u temizle
lsof -ti:8081 | xargs kill -9
```

### Backend bağlantı hatası
- Backend sunucusunun çalıştığından emin olun: `curl http://localhost:3001/health`
- IP adresinin doğru olduğunu kontrol edin


