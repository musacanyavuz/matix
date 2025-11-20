/**
 * Matix Backend Server
 * Express.js + Socket.io + PostgreSQL + Prisma
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const friendRoutes = require('./routes/friendRoutes');

// Socket
const setupSocketHandlers = require('./socket/socketHandler');

// Express app oluştur
const app = express();
const server = http.createServer(app);

// Socket.io yapılandırması
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000, // 60 saniye (mobil cihazlar için daha uzun)
  pingInterval: 25000, // 25 saniye (ping gönderme aralığı)
  transports: ['websocket', 'polling'], // WebSocket ve polling desteği
  allowEIO3: true, // Eski Engine.IO versiyonları için uyumluluk
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Matix Backend Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/friends', friendRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı',
  });
});

// Error Handler
app.use(errorHandler);

// Socket.io handler'larını yapılandır
setupSocketHandlers(io);

// Server'ı başlat
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Matix Backend Server ${PORT} portunda çalışıyor`);
  console.log(`📡 Socket.io aktif`);
  console.log(`🌍 CORS: ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };

