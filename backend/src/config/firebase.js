/**
 * Firebase Admin SDK Configuration
 * Firestore Database bağlantısını yönetir
 */

const admin = require('firebase-admin');

let firestore = null;

/**
 * Firebase'i başlat
 */
function initializeFirebase() {
  try {
    // Eğer zaten başlatılmışsa tekrar başlatma
    if (admin.apps.length > 0) {
      firestore = admin.firestore();
      console.log('✅ Firebase zaten başlatılmış');
      return firestore;
    }

    // Service Account Key yolu veya JSON string
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable gerekli');
    }

    let serviceAccount;

    // Service Account Key JSON string olarak mı yoksa dosya yolu olarak mı?
    if (serviceAccountKey) {
      // JSON string olarak
      try {
        serviceAccount = typeof serviceAccountKey === 'string' 
          ? JSON.parse(serviceAccountKey) 
          : serviceAccountKey;
      } catch (error) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY geçerli bir JSON değil');
      }
    } else if (serviceAccountPath) {
      // Dosya yolu olarak
      const path = require('path');
      const fs = require('fs');
      const fullPath = path.resolve(process.cwd(), serviceAccountPath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Service Account dosyası bulunamadı: ${fullPath}`);
      }

      serviceAccount = require(fullPath);
    } else {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH veya FIREBASE_SERVICE_ACCOUNT_KEY gerekli');
    }

    // Firebase Admin SDK'yı başlat
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });

    firestore = admin.firestore();

    // Firestore ayarları
    if (process.env.NODE_ENV === 'development') {
      firestore.settings({
        // Development modunda daha detaylı log
        ignoreUndefinedProperties: true,
      });
    }

    console.log('✅ Firebase Admin SDK başarıyla başlatıldı');
    console.log(`📦 Project ID: ${projectId}`);

    return firestore;
  } catch (error) {
    console.error('❌ Firebase başlatma hatası:', error.message);
    throw error;
  }
}

/**
 * Firestore instance'ını döndür
 */
function getFirestore() {
  if (!firestore) {
    return initializeFirebase();
  }
  return firestore;
}

/**
 * Firebase'i kapat
 */
async function closeFirebase() {
  try {
    if (admin.apps.length > 0) {
      await admin.app().delete();
      firestore = null;
      console.log('✅ Firebase bağlantısı kapatıldı');
    }
  } catch (error) {
    console.error('❌ Firebase kapatma hatası:', error.message);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await closeFirebase();
});

module.exports = {
  initializeFirebase,
  getFirestore,
  closeFirebase,
  admin, // Admin SDK'ya direkt erişim için
};

