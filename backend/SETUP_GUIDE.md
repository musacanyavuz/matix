# Backend Kurulum Rehberi

## 1. PostgreSQL Kontrolü

PostgreSQL servisinin çalıştığından emin olun:

```bash
# macOS (Homebrew)
brew services list | grep postgresql

# Servisi başlat
brew services start postgresql@14
# veya
brew services start postgresql@15
```

## 2. Veritabanı Oluşturma

PostgreSQL'e bağlanın ve veritabanını oluşturun:

```bash
# psql ile bağlan
psql -U postgres

# Veritabanını oluştur
CREATE DATABASE matix;

# Çıkış
\q
```

Veya tek satırda:
```bash
psql -U postgres -c "CREATE DATABASE matix;"
```

## 3. Migration Çalıştırma

```bash
cd backend

# Migration oluştur ve uygula
npx prisma migrate dev --name init
```

Eğer interaktif soru sorarsa, "init" yazın veya Enter'a basın.

## 4. Alternatif: Schema'yı Doğrudan Uygula

Eğer migration sorun yaşarsa:

```bash
# Prisma schema'yı doğrudan veritabanına uygula (production için uygun değil)
npx prisma db push
```

## 5. Sunucuyu Başlat

```bash
npm run dev
```

## Sorun Giderme

### PostgreSQL Bağlantı Hatası

1. PostgreSQL servisinin çalıştığını kontrol edin
2. Port 5432'nin açık olduğunu kontrol edin
3. `.env` dosyasındaki bağlantı bilgilerini kontrol edin

### Veritabanı Bulunamadı

```sql
-- PostgreSQL'de veritabanı listesini kontrol et
\l

-- Veritabanı oluştur
CREATE DATABASE matix;

-- Kullanıcı oluştur (gerekirse)
CREATE USER postgres WITH PASSWORD '123456';
GRANT ALL PRIVILEGES ON DATABASE matix TO postgres;
```

### Migration Lock Hatası

Eğer advisory lock hatası alırsanız:

```bash
# PostgreSQL'de aktif bağlantıları kontrol et
psql -U postgres -d matix -c "SELECT * FROM pg_stat_activity WHERE datname = 'matix';"

# Gerekirse bağlantıları sonlandır
psql -U postgres -d matix -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'matix' AND pid <> pg_backend_pid();"
```

## Bağlantı Testi

```bash
# .env dosyasındaki bağlantıyı test et
cd backend
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

