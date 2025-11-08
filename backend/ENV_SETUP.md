# .env Dosyası Kurulumu

Backend klasöründe `.env` dosyası oluşturun ve aşağıdaki içeriği ekleyin:

```env
# Database
DATABASE_URL="postgresql://postgres:123456@localhost:5432/matix?schema=public"

# Server
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-change-in-production

# CORS
CORS_ORIGIN=http://localhost:8081,http://localhost:19006,exp://192.168.1.104:8081

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Bağlantı String Formatı

Verdiğiniz bilgiler:
- Host: localhost
- Port: 5432
- Database: matix
- Username: postgres
- Password: 123456

Prisma formatına dönüştürülmüş hali:
```
postgresql://postgres:123456@localhost:5432/matix?schema=public
```

## Hızlı Kurulum

```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:123456@localhost:5432/matix?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:8081,http://localhost:19006,exp://192.168.1.104:8081
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

