/**
 * Friend Controller
 * Arkadaşlık işlemleri için HTTP isteklerini yönetir
 */

const friendService = require('../services/friendService');

class FriendController {
  /**
   * Arkadaşlık isteği gönder
   * POST /api/friends/request
   */
  async sendFriendRequest(req, res, next) {
    try {
      const { receiverNickname } = req.body;
      const requesterId = req.userId; // Middleware'den gelir

      if (!receiverNickname) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı adı gereklidir',
        });
      }

      const friendship = await friendService.sendFriendRequest(requesterId, receiverNickname);

      res.status(201).json({
        success: true,
        data: friendship,
        message: 'Arkadaşlık isteği gönderildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Arkadaşlık isteğini kabul et
   * POST /api/friends/accept
   */
  async acceptFriendRequest(req, res, next) {
    try {
      const { friendshipId } = req.body;
      const receiverId = req.userId;

      if (!friendshipId) {
        return res.status(400).json({
          success: false,
          message: 'Arkadaşlık isteği ID gereklidir',
        });
      }

      const friendship = await friendService.acceptFriendRequest(friendshipId, receiverId);

      res.json({
        success: true,
        data: friendship,
        message: 'Arkadaşlık isteği kabul edildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Arkadaşlık isteğini reddet
   * POST /api/friends/reject
   */
  async rejectFriendRequest(req, res, next) {
    try {
      const { friendshipId } = req.body;
      const receiverId = req.userId;

      if (!friendshipId) {
        return res.status(400).json({
          success: false,
          message: 'Arkadaşlık isteği ID gereklidir',
        });
      }

      await friendService.rejectFriendRequest(friendshipId, receiverId);

      res.json({
        success: true,
        message: 'Arkadaşlık isteği reddedildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Arkadaş listesi
   * GET /api/friends
   */
  async getFriends(req, res, next) {
    try {
      const userId = req.userId;
      const friends = await friendService.getFriends(userId);

      res.json({
        success: true,
        data: friends,
        message: 'Arkadaş listesi başarıyla alındı',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bekleyen arkadaşlık istekleri
   * GET /api/friends/pending
   */
  async getPendingRequests(req, res, next) {
    try {
      const userId = req.userId;
      const requests = await friendService.getPendingRequests(userId);

      res.json({
        success: true,
        data: requests,
        message: 'Bekleyen istekler başarıyla alındı',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Arkadaşı kaldır
   * DELETE /api/friends/:friendId
   */
  async removeFriend(req, res, next) {
    try {
      const { friendId } = req.params;
      const userId = req.userId;

      await friendService.removeFriend(userId, friendId);

      res.json({
        success: true,
        message: 'Arkadaş kaldırıldı',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kullanıcı ara
   * GET /api/friends/search?q=query
   */
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;
      const userId = req.userId;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Arama sorgusu en az 2 karakter olmalıdır',
        });
      }

      const users = await friendService.searchUsers(q.trim(), userId);

      res.json({
        success: true,
        data: users,
        message: 'Arama sonuçları',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FriendController();

