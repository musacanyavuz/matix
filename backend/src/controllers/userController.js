/**
 * User Controller
 * Kullanıcı işlemleri için HTTP isteklerini yönetir
 */

const userService = require('../services/userService');
const { authenticateToken } = require('../middleware/authMiddleware');

class UserController {
  /**
   * Yeni kullanıcı oluştur
   * POST /api/users
   */
  async createUser(req, res, next) {
    try {
      const { nickname, avatar } = req.body;

      if (!nickname || !avatar) {
        return res.status(400).json({
          success: false,
          message: 'Nickname ve avatar gereklidir',
        });
      }

      const user = await userService.createUser(nickname, avatar);

      res.status(201).json({
        success: true,
        data: user,
        message: 'Kullanıcı başarıyla oluşturuldu',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Global liderlik tablosu
   * GET /api/users/leaderboard
   */
  async getLeaderboard(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const users = await userService.getLeaderboard(limit);

      res.json({
        success: true,
        data: users,
        message: 'Liderlik tablosu başarıyla alındı',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kullanıcıyı ID ile getir
   * GET /api/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

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
   * Kullanıcı istatistiklerini getir
   * GET /api/users/stats/:userId
   */
  async getUserStats(req, res, next) {
    try {
      const { userId } = req.params;
      const stats = await userService.getUserStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kullanıcı profilini güncelle
   * PUT /api/users/profile
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.userId; // Middleware'den gelir
      const { nickname, avatar } = req.body;

      // Nickname kontrolü (eğer değiştiriliyorsa)
      if (nickname) {
        const existingUser = await userService.getUserByNickname(nickname);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({
            success: false,
            message: 'Bu takma ad zaten kullanılıyor',
          });
        }
      }

      const user = await userService.updateProfile(userId, { nickname, avatar });

      // Şifreyi response'dan çıkar
      delete user.password;

      res.json({
        success: true,
        message: 'Profil güncellendi',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Macera modu ilerlemesini getir
   * GET /api/users/adventure/progress
   */
  async getAdventureProgress(req, res, next) {
    try {
      const userId = req.userId; // Middleware'den gelir
      const progress = await userService.getAdventureProgress(userId);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();

