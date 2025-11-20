/**
 * Firebase Bağlantı Test Scripti
 * 
 * Kullanım:
 * node scripts/test-firebase.js
 * 
 * Önce .env dosyasında Firebase config bilgilerini ayarlayın:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_SERVICE_ACCOUNT_PATH veya FIREBASE_SERVICE_ACCOUNT_KEY
 */

require('dotenv').config();
const { initializeFirebase, getFirestore, closeFirebase, admin } = require('../src/config/firebase');

async function testFirebaseConnection() {
  console.log('🔥 Firebase bağlantı testi başlatılıyor...\n');

  try {
    // Firebase'i başlat
    const db = initializeFirebase();
    
    // Test: Firestore'a basit bir yazma/okuma işlemi
    console.log('📝 Test verisi yazılıyor...');
    const testRef = db.collection('_test').doc('connection-test');
    
    const testData = {
      message: 'Firebase bağlantı testi',
      timestamp: admin.firestore.Timestamp.now(),
      success: true,
    };

    await testRef.set(testData);
    console.log('✅ Test verisi yazıldı');

    // Test: Veriyi oku
    console.log('📖 Test verisi okunuyor...');
    const doc = await testRef.get();
    
    if (doc.exists) {
      console.log('✅ Test verisi okundu:', doc.data());
    } else {
      throw new Error('Test verisi bulunamadı');
    }

    // Test: Veriyi sil
    console.log('🗑️  Test verisi siliniyor...');
    await testRef.delete();
    console.log('✅ Test verisi silindi');

    // Test: Collection listesi
    console.log('\n📋 Firestore collections test ediliyor...');
    const collections = await db.listCollections();
    console.log(`✅ Toplam ${collections.length} collection bulundu`);
    
    if (collections.length > 0) {
      console.log('Collections:');
      collections.forEach(col => {
        console.log(`  - ${col.id}`);
      });
    }

    console.log('\n🎉 Firebase bağlantı testi başarılı!');
    console.log('✅ Firebase entegrasyonu hazır.\n');

  } catch (error) {
    console.error('\n❌ Firebase bağlantı testi başarısız!');
    console.error('Hata:', error.message);
    console.error('\nKontrol edin:');
    console.error('1. .env dosyasında FIREBASE_PROJECT_ID ayarlı mı?');
    console.error('2. FIREBASE_SERVICE_ACCOUNT_PATH veya FIREBASE_SERVICE_ACCOUNT_KEY ayarlı mı?');
    console.error('3. Service Account dosyası doğru yolda mı?');
    console.error('4. Firestore Database aktif mi?');
    process.exit(1);
  } finally {
    await closeFirebase();
    process.exit(0);
  }
}

// Script'i çalıştır
testFirebaseConnection();

