/**
 * Auth Service
 * Kimlik doğrulama işlemlerini yönetir (kayıt, giriş, token oluşturma)
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('./userService');
const prisma = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'matix-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
  /**
   * Kullanıcı kaydı
   * @param {Object} userData - { email, password, nickname, avatar, ageGroup }
   * @returns {Object} { user, token }
   */
  async register(userData) {
    const { email, password, nickname, avatar, ageGroup } = userData;

    // Validasyon
    if (!email || !password || !nickname) {
      throw new Error('Email, şifre ve takma ad gereklidir');
    }

    if (password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır');
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Geçerli bir email adresi giriniz');
    }

    // Email kontrolü
    const existingUserByEmail = await userService.getUserByEmail(email);
    if (existingUserByEmail) {
      throw new Error('Bu email zaten kullanılıyor');
    }

    // Nickname kontrolü
    const existingUserByNickname = await userService.getUserByNickname(nickname);
    if (existingUserByNickname) {
      throw new Error('Bu takma ad zaten kullanılıyor');
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        avatar: avatar || '🐱',
        isGuest: false,
        lastLogin: new Date(),
      },
    });

    // JWT token oluştur
    const token = this.generateToken(user.id);

    // Şifreyi response'dan çıkar
    delete user.password;

    return { user, token };
  }

  /**
   * Kullanıcı girişi
   * @param {Object} credentials - { email, password }
   * @returns {Object} { user, token }
   */
  async login(credentials) {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new Error('Email ve şifre gereklidir');
    }

    // Kullanıcıyı bul
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new Error('Email veya şifre hatalı');
    }

    // Şifre kontrolü
    if (!user.password) {
      throw new Error('Bu hesap için şifre tanımlanmamış');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Email veya şifre hatalı');
    }

    // lastLogin güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
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
    const { email, password, nickname, avatar, ageGroup } = userData;

    // Validasyon
    if (!email || !password || !nickname) {
      throw new Error('Email, şifre ve takma ad gereklidir');
    }

    if (password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır');
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Geçerli bir email adresi giriniz');
    }

    // Misafir kullanıcıyı bul
    const guestUser = await userService.getUserById(guestUserId);
    if (!guestUser) {
      throw new Error('Misafir kullanıcı bulunamadı');
    }

    // Eğer kullanıcı zaten kayıtlıysa (email varsa), direkt login yapmasını öner
    if (!guestUser.isGuest || guestUser.email) {
      // Kullanıcı zaten kayıtlı, email ile login yapabilir
      throw new Error('Bu kullanıcı zaten kayıtlı. Lütfen giriş yapın.');
    }

    // Email kontrolü
    const existingUserByEmail = await userService.getUserByEmail(email);
    if (existingUserByEmail) {
      throw new Error('Bu email zaten kullanılıyor');
    }

    // Nickname kontrolü (eğer değiştiriliyorsa)
    if (nickname !== guestUser.nickname) {
      const existingUserByNickname = await userService.getUserByNickname(nickname);
      if (existingUserByNickname) {
        throw new Error('Bu takma ad zaten kullanılıyor');
      }
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Misafir kullanıcıyı kayıtlı kullanıcıya dönüştür
    // Skorları koru, sadece email ve password ekle
    const user = await prisma.user.update({
      where: { id: guestUserId },
      data: {
        email,
        password: hashedPassword,
        nickname: nickname || guestUser.nickname,
        avatar: avatar || guestUser.avatar,
        isGuest: false,
        lastLogin: new Date(),
      },
    });

    // JWT token oluştur
    const token = this.generateToken(user.id);

    // Şifreyi response'dan çıkar
    delete user.password;

    return { user, token };
  }

  /**
   * Şifre sıfırlama (geliştirme için)
   * @param {String} email
   * @param {String} newPassword
   * @returns {Object} { user }
   */
  async resetPassword(email, newPassword) {
    // Kullanıcıyı bul
    const user = await userService.getUserByEmail(email);
    if (!user) {
      throw new Error('Bu email ile kayıtlı kullanıcı bulunamadı');
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Şifreyi response'dan çıkar
    delete updatedUser.password;

    return { user: updatedUser };
  }
}

module.exports = new AuthService();

