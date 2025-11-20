/**
 * Firebase Firestore Database Client
 * Veritabanı bağlantısını yönetir
 * 
 * NOT: Prisma'dan Firebase'e geçiş yapıldı.
 * Artık Prisma yerine Firebase Firestore kullanılıyor.
 */

const { getFirestore } = require('./firebase');

// Firebase'i başlat (ilk kullanımda)
const db = getFirestore();

module.exports = db;

