# 🎮 Matix - Matematik Yarışması

İlkokul seviyesindeki çocuklar için tasarlanmış, online multiplayer matematik yarışması oyunu.

## 📱 Özellikler

- ✅ Profil oluşturma (nickname + hayvan avatar seçimi)
- ✅ **Yaş/Sınıf seçimi** (4-5-6 yaş, 1-2-3-4. sınıf)
- ✅ **Yaş grubuna göre soru zorluk seviyesi**
- ✅ Gerçek zamanlı multiplayer oyun (Socket.io)
- ✅ Oda oluşturma ve katılma sistemi
- ✅ 10 soruluk matematik yarışması (toplama, çıkarma, çarpma, bölme)
- ✅ Anlık skor takibi
- ✅ Çocuk dostu, renkli ve eğlenceli arayüz
- ✅ Sonuç ekranı ve kazanan belirleme

## 🛠️ Teknolojiler

- **React Native** (Expo)
- **Socket.io** (WebSocket bağlantısı)
- **React Context API** (State yönetimi)
- **React Navigation** (Navigasyon)
- **AsyncStorage** (Yerel veri depolama)

## 📦 Kurulum

### Hızlı Başlangıç (Önerilen)

```bash
# 1. Projeyi kur
./scripts/setup.sh

# 2. Socket.io sunucusunu başlat (ayrı terminal)
./scripts/start-server.sh

# 3. Test seçenekleri:

# Tek cihaz için:
./scripts/test-android.sh    # Android (Port 8081)
./scripts/test-ios.sh         # iOS (Port 8081)

# İki cihaz aynı anda (farklı portlar):
./scripts/start-both.sh       # iOS (8081) + Android (8082) aynı anda

# Veya manuel olarak iki terminal:
# Terminal 1: ./scripts/start-ios.sh      (Port 8081)
# Terminal 2: ./scripts/start-android.sh  (Port 8082)
```

### Manuel Kurulum

#### 1. Bağımlılıkları Yükle

```bash
npm install
cd server && npm install && cd ..
```

#### 2. Socket.io Sunucusunu Başlat

```bash
cd server
npm start
```

Sunucu varsayılan olarak `http://localhost:3001` adresinde çalışacaktır.

**Not:** Test scriptleri otomatik olarak IP adresinizi bulur ve Socket URL'ini günceller.

#### 3. Mobil Uygulamayı Başlat

```bash
npm start
```

Ardından:
- iOS için: `i` tuşuna basın veya Expo Go uygulamasından QR kodu tarayın
- Android için: `a` tuşuna basın veya Expo Go uygulamasından QR kodu tarayın

## 🎯 Kullanım

1. **Profil Oluştur**: İlk açılışta nickname, avatar ve **yaş/sınıf** seçin
2. **Oda Oluştur veya Katıl**: Yeni bir oda oluşturun veya mevcut bir odaya kod ile katılın
3. **Oyuncu Bekle**: İkinci oyuncu katılana kadar bekleyin
4. **Oyna**: Seçilen yaş grubuna uygun 10 matematik sorusunu hızlıca cevaplayın
5. **Kazanan**: En yüksek skora sahip oyuncu kazanır!

### Yaş Grupları ve Soru Zorlukları

- **4 Yaş**: Sadece toplama (1-5 arası)
- **5 Yaş**: Toplama ve çıkarma (1-10 arası)
- **6 Yaş**: Toplama ve çıkarma (1-15 arası)
- **1. Sınıf**: Toplama ve çıkarma (1-20 arası)
- **2. Sınıf**: Toplama, çıkarma ve çarpma (1-50 arası)
- **3. Sınıf**: Toplama, çıkarma ve çarpma (1-100 arası)
- **4. Sınıf**: Tüm işlemler (toplama, çıkarma, çarpma, bölme)

## 📁 Proje Yapısı

```
matix/
├── App.tsx                 # Ana uygulama ve navigasyon
├── contexts/
│   └── GameContext.tsx     # Oyun state yönetimi ve Socket.io
├── screens/
│   ├── ProfileScreen.tsx   # Profil oluşturma ekranı
│   ├── RoomScreen.tsx      # Oda oluşturma/katılma ekranı
│   ├── GameScreen.tsx      # Oyun ekranı
│   └── ResultScreen.tsx    # Sonuç ekranı
├── components/
│   ├── AvatarSelector.tsx      # Avatar seçim bileşeni
│   ├── AgeGroupSelector.tsx    # Yaş/sınıf seçim bileşeni
│   ├── Button.tsx             # Buton bileşeni
│   ├── AnswerButton.tsx       # Cevap butonu bileşeni
│   └── PlayerCard.tsx         # Oyuncu kartı bileşeni
├── constants/
│   ├── avatars.ts          # Avatar seçenekleri
│   └── ageGroups.ts        # Yaş/sınıf grupları
├── utils/
│   └── gameLogic.ts        # Oyun mantığı fonksiyonları
├── scripts/
│   ├── setup.sh            # Proje kurulum scripti
│   ├── start-server.sh     # Sunucu başlatma scripti
│   ├── test-android.sh     # Android test scripti
│   └── test-ios.sh         # iOS test scripti
└── server/
    ├── server.js           # Socket.io sunucusu
    └── package.json        # Sunucu bağımlılıkları
```

## 🎨 Özellikler Detayı

### Profil Sistemi
- Kullanıcılar sadece bir kez profil oluşturur
- Profil bilgileri AsyncStorage'da saklanır
- 12 farklı hayvan avatar seçeneği

### Multiplayer Sistemi
- WebSocket ile gerçek zamanlı bağlantı
- 6 karakterlik rastgele oda kodları
- Maksimum 2 oyuncu

### Oyun Mekaniği
- Her turda rastgele matematik sorusu (toplama, çıkarma, çarpma, bölme)
- 6 cevap seçeneği (1 doğru + 5 yanlış, karışık sıralı)
- İlk doğru cevap veren oyuncu +1 skor alır
- 10 soru sonunda oyun biter

## 🔧 Geliştirme

### Socket.io Sunucu Yapılandırması

Sunucu portunu değiştirmek için `server/server.js` dosyasındaki `PORT` değişkenini düzenleyin:

```javascript
const PORT = process.env.PORT || 3001;
```

### Mobil Uygulama Yapılandırması

Socket.io sunucu URL'ini değiştirmek için `contexts/GameContext.tsx` dosyasını düzenleyin:

```typescript
const SOCKET_URL = 'http://localhost:3001';
```

## 📝 Lisans

Bu proje eğitim amaçlı oluşturulmuştur.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add some amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 Destek

Sorularınız için issue açabilirsiniz.

---

**Not:** Bu uygulama geliştirme aşamasındadır. Production kullanımı için ek güvenlik ve optimizasyon önlemleri alınmalıdır.
