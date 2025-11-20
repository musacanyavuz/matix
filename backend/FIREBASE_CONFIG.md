# Firebase Configuration - matix-573eb

## Bilgiler
- **Project ID**: matix-573eb
- **Project Number**: 979802238732
- **Service Account Key**: matix-573eb-firebase-adminsdk-fbsvc-e2949ac1c0.json
- **Firestore**: PROD mode aktif

## Kurulum Adımları

### 1. Service Account Key Dosyasını Yerleştirin

Service Account Key JSON dosyasını (`matix-573eb-firebase-adminsdk-fbsvc-e2949ac1c0.json`) backend klasörüne kopyalayın:

```bash
# Dosyayı backend klasörüne kopyalayın
cp /path/to/matix-573eb-firebase-adminsdk-fbsvc-e2949ac1c0.json backend/firebase-service-account.json
```

VEYA dosya adını değiştirmeden kullanmak isterseniz `.env` dosyasında tam dosya adını belirtin.

### 2. .env Dosyasını Güncelleyin

Backend klasöründeki `.env` dosyasına şunları ekleyin:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=matix-573eb
FIREBASE_SERVICE_ACCOUNT_PATH=./matix-573eb-firebase-adminsdk-fbsvc-e2949ac1c0.json
```

VEYA dosyayı `firebase-service-account.json` olarak yeniden adlandırırsanız:

```env
FIREBASE_PROJECT_ID=matix-573eb
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### 3. Bağlantıyı Test Edin

```bash
cd backend
node scripts/test-firebase.js
```

Başarılı olursa şu çıktıyı göreceksiniz:
```
✅ Firebase Admin SDK başarıyla başlatıldı
📦 Project ID: matix-573eb
✅ Test verisi yazıldı
✅ Test verisi okundu
🎉 Firebase bağlantı testi başarılı!
```

## Sonraki Adımlar

Test başarılı olduktan sonra:
1. Tüm Prisma kodlarını Firebase'e çevireceğim
2. UserService, RoomService, AuthService güncellenecek
3. SocketHandler Firebase'e uyarlanacak
4. PostgreSQL bağımlılıkları kaldırılacak

