/**
 * Auth Service
 * Kimlik doğrulama işlemlerini yönetir (kayıt, giriş, token oluşturma)
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('./userService');
const db = require('../config/database');
const { admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'matix-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
  /**
   * Kullanıcı kaydı
   * @param {Object} userData - { password, nickname, avatar, ageGroup }
   * @returns {Object} { user, token }
   */
  async register(userDataParam) {
    const { password, nickname, avatar, ageGroup } = userDataParam;

    // Validasyon
    if (!password || !nickname) {
      throw new Error('Şifre ve kullanıcı adı gereklidir');
    }

    if (password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır');
    }

    if (nickname.length < 3) {
      throw new Error('Kullanıcı adı en az 3 karakter olmalıdır');
    }

    if (nickname.length > 20) {
      throw new Error('Kullanıcı adı en fazla 20 karakter olabilir');
    }

    // Kullanıcı adı format kontrolü (sadece harf, rakam ve alt çizgi)
    const nicknameRegex = /^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+$/;
    if (!nicknameRegex.test(nickname)) {
      throw new Error('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
    }

    // Nickname kontrolü
    const existingUserByNickname = await userService.getUserByNickname(nickname);
    if (existingUserByNickname) {
      throw new Error('Bu kullanıcı adı zaten kullanılıyor');
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur (userService kullanarak)
    const userId = uuidv4();
    const now = admin.firestore.Timestamp.now();
    
    const userData = {
      id: userId,
      password: hashedPassword,
      nickname,
      avatar: avatar || '🐱',
      isGuest: false,
      totalScore: 0,
      adventureChapter: 1,
      lastLogin: now,
      createdAt: now,
    };

    await db.collection('users').doc(userId).set(userData);

    // JWT token oluştur
    const token = this.generateToken(userId);

    // Şifreyi response'dan çıkar
    const user = { ...userData };
    delete user.password;

    return { user, token };
  }

  /**
   * Kullanıcı girişi
   * @param {Object} credentials - { username (nickname), password }
   * @returns {Object} { user, token }
   */
  async login(credentials) {
    const { username, password } = credentials;

    if (!username || !password) {
      throw new Error('Kullanıcı adı ve şifre gereklidir');
    }

    // Kullanıcıyı nickname ile bul
    const user = await userService.getUserByNickname(username);
    if (!user) {
      throw new Error('Kullanıcı adı veya şifre hatalı');
    }

    // Misafir kullanıcı kontrolü
    if (user.isGuest) {
      throw new Error('Misafir kullanıcılar giriş yapamaz. Lütfen kayıt olun.');
    }

    // Şifre kontrolü
    if (!user.password) {
      throw new Error('Bu hesap için şifre tanımlanmamış');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Kullanıcı adı veya şifre hatalı');
    }

    // lastLogin güncelle
    await db.collection('users').doc(user.id).update({
      lastLogin: admin.firestore.Timestamp.now(),
    });

    // JWT token oluştur
    const token = this.generateToken(user.id);

    // Şifreyi response'dan çıkar
    delete user.password;

    return { user, token };
  }

  /**
   * JWT token oluştur
   * @param {String} userId
   * @returns {String} JWT token
   */
  generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * JWT token doğrula
   * @param {String} token
   * @returns {Object} { userId }
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { userId: decoded.userId };
    } catch (error) {
      throw new Error('Geçersiz veya süresi dolmuş token');
    }
  }

  /**
   * Misafir kullanıcıyı kayıtlı kullanıcıya dönüştür
   * @param {String} guestUserId - Misafir kullanıcı ID
   * @param {Object} userData - { email, password, nickname, avatar, ageGroup }
   * @returns {Object} { user, token }
   */
  async convertGuestToUser(guestUserId, userData) {
    const { password, nickname, avatar, ageGroup } = userData;

    // Validasyon
    if (!password || !nickname) {
      throw new Error('Şifre ve kullanıcı adı gereklidir');
    }

    if (password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır');
    }

    if (nickname.length < 3) {
      throw new Error('Kullanıcı adı en az 3 karakter olmalıdır');
    }

    if (nickname.length > 20) {
      throw new Error('Kullanıcı adı en fazla 20 karakter olabilir');
    }

    // Kullanıcı adı format kontrolü
    const nicknameRegex = /^[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+$/;
    if (!nicknameRegex.test(nickname)) {
      throw new Error('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
    }

    // Misafir kullanıcıyı bul
    const guestUser = await userService.getUserById(guestUserId);
    if (!guestUser) {
      throw new Error('Misafir kullanıcı bulunamadı');
    }

    // Eğer kullanıcı zaten kayıtlıysa, direkt login yapmasını öner
    if (!guestUser.isGuest) {
      throw new Error('Bu kullanıcı zaten kayıtlı. Lütfen giriş yapın.');
    }

    // Nickname kontrolü (eğer değiştiriliyorsa)
    if (nickname !== guestUser.nickname) {
      const existingUserByNickname = await userService.getUserByNickname(nickname);
      if (existingUserByNickname) {
        throw new Error('Bu kullanıcı adı zaten kullanılıyor');
      }
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Misafir kullanıcıyı kayıtlı kullanıcıya dönüştür
    // Skorları koru, sadece password ekle
    const updateData = {
      password: hashedPassword,
      nickname: nickname || guestUser.nickname,
      avatar: avatar || guestUser.avatar,
      isGuest: false,
      lastLogin: admin.firestore.Timestamp.now(),
    };

    await db.collection('users').doc(guestUserId).update(updateData);

    // Güncellenmiş kullanıcıyı getir
    const updatedDoc = await db.collection('users').doc(guestUserId).get();
    const user = { id: updatedDoc.id, ...updatedDoc.data() };

    // JWT token oluştur
    const token = this.generateToken(user.id);

    // Şifreyi response'dan çıkar
    delete user.password;

    return { user, token };
  }

  /**
   * Şifre sıfırlama (geliştirme için)
   * @param {String} username
   * @param {String} newPassword
   * @returns {Object} { user }
   */
  async resetPassword(username, newPassword) {
    // Kullanıcıyı bul
    const user = await userService.getUserByNickname(username);
    if (!user) {
      throw new Error('Bu kullanıcı adı ile kayıtlı kullanıcı bulunamadı');
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle
    await db.collection('users').doc(user.id).update({
      password: hashedPassword,
    });

    // Güncellenmiş kullanıcıyı getir
    const updatedDoc = await db.collection('users').doc(user.id).get();
    const updatedUser = { id: updatedDoc.id, ...updatedDoc.data() };

    // Şifreyi response'dan çıkar
    delete updatedUser.password;

    return { user: updatedUser };
  }
}

module.exports = new AuthService();

