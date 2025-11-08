/**
 * Auth Controller
 * Kimlik doğrulama işlemleri için HTTP isteklerini yönetir
 */

const authService = require('../services/authService');
const userService = require('../services/userService');

class AuthController {
  /**
   * Kullanıcı kaydı
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, nickname, avatar, ageGroup } = req.body;

      if (!email || !password || !nickname) {
        return res.status(400).json({
          success: false,
          message: 'Email, şifre ve takma ad gereklidir',
        });
      }

      const result = await authService.register({
        email,
        password,
        nickname,
        avatar,
        ageGroup,
      });

      res.status(201).json({
        success: true,
        message: 'Kullanıcı başarıyla kaydedildi',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kullanıcı girişi
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email ve şifre gereklidir',
        });
      }

      const result = await authService.login({ email, password });

      res.json({
        success: true,
        message: 'Giriş başarılı',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mevcut kullanıcı bilgisi
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const userId = req.userId;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı',
        });
      }

      // Şifreyi response'dan çıkar
      delete user.password;

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Misafir kullanıcıyı kayıtlı kullanıcıya dönüştür
   * POST /api/auth/convert-guest
   */
  async convertGuest(req, res, next) {
    try {
      const { guestUserId, email, password, nickname, avatar, ageGroup } = req.body;

      if (!guestUserId) {
        return res.status(400).json({
          success: false,
          message: 'Misafir kullanıcı ID gereklidir',
        });
      }

      const result = await authService.convertGuestToUser(guestUserId, {
        email,
        password,
        nickname,
        avatar,
        ageGroup,
      });

      res.json({
        success: true,
        message: 'Misafir kullanıcı kayıtlı kullanıcıya dönüştürüldü',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Şifre sıfırlama (geliştirme için - production'da email ile yapılmalı)
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email ve yeni şifre gereklidir',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Şifre en az 6 karakter olmalıdır',
        });
      }

      const result = await authService.resetPassword(email, newPassword);

      res.json({
        success: true,
        message: 'Şifre başarıyla sıfırlandı',
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
