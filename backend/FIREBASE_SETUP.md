# Firebase Entegrasyonu - Gerekli Bilgiler

Firebase'e geçiş için aşağıdaki bilgilere ihtiyacımız var:

## 1. Firebase Project Bilgileri

### Firebase Console'dan Alınacaklar:
- **Project ID**: Firebase projenizin ID'si
- **Project Number**: (Opsiyonel, gerekirse)

### Firebase Console'a Erişim:
1. https://console.firebase.google.com/ adresine gidin
2. Projenizi seçin veya yeni proje oluşturun
3. Project Settings > General sekmesinden Project ID'yi kopyalayın

## 2. Service Account Key (Backend için)

Firebase Admin SDK kullanmak için Service Account Key JSON dosyası gerekiyor:

### Adımlar:
1. Firebase Console > Project Settings > Service Accounts
2. "Generate new private key" butonuna tıklayın
3. JSON dosyasını indirin
4. Bu dosyayı `backend/firebase-service-account.json` olarak kaydedin
   - **ÖNEMLİ**: Bu dosyayı `.gitignore`'a ekleyin (güvenlik için)

### Alternatif (Environment Variables):
Service Account Key'in içeriğini environment variable olarak da kullanabiliriz:
- `FIREBASE_SERVICE_ACCOUNT_KEY` - JSON string olarak

## 3. Firestore Database

Firestore Database'in aktif olması gerekiyor:
1. Firebase Console > Firestore Database
2. "Create database" ile başlatın
3. Test mode veya Production mode seçin (başlangıç için test mode yeterli)

## 4. Environment Variables (.env)

Backend `.env` dosyasına eklenecekler:

```env
# Firebase Config
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
# VEYA
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...} # JSON string olarak
```

## Özet - Bana Göndermeniz Gerekenler:

1. ✅ **Firebase Project ID**
2. ✅ **Service Account Key JSON dosyası** (veya içeriği)
3. ✅ Firestore Database'in aktif olduğunu onaylayın

Bu bilgileri aldıktan sonra:
- Firebase Admin SDK'yı kuracağım
- Bağlantıyı test edeceğim
- Tüm Prisma kodlarını Firebase'e çevireceğim

