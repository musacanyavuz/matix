/**
 * Room Controller
 * Oda işlemleri için HTTP isteklerini yönetir
 */

const roomService = require('../services/roomService');
const userService = require('../services/userService');

class RoomController {
  /**
   * Yeni oda oluştur
   * POST /api/rooms
   */
  async createRoom(req, res, next) {
    try {
      const { hostId, ageGroup, isPrivate, difficultyLevel, adventureMode, chapter } = req.body;

      if (!hostId) {
        return res.status(400).json({
          success: false,
          message: 'Host ID gereklidir',
        });
      }

      // Kullanıcı var mı kontrol et
      const user = await userService.getUserById(hostId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı',
        });
      }

      // Zorluk seviyesi validasyonu (-1, 0, 1)
      const validDifficultyLevel = difficultyLevel !== undefined && [-1, 0, 1].includes(parseInt(difficultyLevel))
        ? parseInt(difficultyLevel)
        : 0;

      // Macera modu için chapter parametresi
      const validChapter = adventureMode && chapter ? parseInt(chapter) : 1;

      const room = await roomService.createRoom(hostId, ageGroup, isPrivate || false, validDifficultyLevel, adventureMode || false, validChapter);

      res.status(201).json({
        success: true,
        data: room,
        message: 'Oda başarıyla oluşturuldu',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Private room oluştur
   * POST /api/rooms/private
   */
  async createPrivateRoom(req, res, next) {
    try {
      const { ageGroup } = req.body;
      const hostId = req.userId; // Middleware'den gelir

      const room = await roomService.createPrivateRoom(hostId, ageGroup);

      res.status(201).json({
        success: true,
        data: room,
        message: 'Private oda başarıyla oluşturuldu',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Private room'a davet gönder
   * POST /api/rooms/invite
   */
  async inviteToRoom(req, res, next) {
    try {
      const { roomCode, inviteeId } = req.body;
      const inviterId = req.userId;

      if (!roomCode || !inviteeId) {
        return res.status(400).json({
          success: false,
          message: 'Oda kodu ve kullanıcı ID gereklidir',
        });
      }

      const invitation = await roomService.inviteToPrivateRoom(roomCode, inviterId, inviteeId);

      res.status(201).json({
        success: true,
        data: invitation,
        message: 'Davet gönderildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Arkadaşı oyuna davet et
   * POST /api/rooms/invite-friend
   */
  async inviteFriendToRoom(req, res, next) {
    try {
      const { friendId, roomId } = req.body;
      const inviterId = req.userId;

      if (!friendId || !roomId) {
        return res.status(400).json({
          success: false,
          message: 'Arkadaş ID ve oda ID gereklidir',
        });
      }

      const invitation = await roomService.inviteFriendToRoom(inviterId, friendId, roomId);

      res.status(201).json({
        success: true,
        data: invitation,
        message: 'Arkadaş oyuna davet edildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Oda davetini kabul et
   * POST /api/rooms/accept-invitation
   */
  async acceptRoomInvitation(req, res, next) {
    try {
      const { invitationId } = req.body;
      const inviteeId = req.userId;

      if (!invitationId) {
        return res.status(400).json({
          success: false,
          message: 'Davet ID gereklidir',
        });
      }

      const room = await roomService.acceptRoomInvitation(invitationId, inviteeId);

      res.json({
        success: true,
        data: room,
        message: 'Davet kabul edildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Oda davetini reddet
   * POST /api/rooms/reject-invitation
   */
  async rejectRoomInvitation(req, res, next) {
    try {
      const { invitationId } = req.body;
      const inviteeId = req.userId;

      if (!invitationId) {
        return res.status(400).json({
          success: false,
          message: 'Davet ID gereklidir',
        });
      }

      await roomService.rejectRoomInvitation(invitationId, inviteeId);

      res.json({
        success: true,
        message: 'Davet reddedildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bekleyen oda davetlerini getir
   * GET /api/rooms/pending-invitations
   */
  async getPendingRoomInvitations(req, res, next) {
    try {
      const inviteeId = req.userId;
      const invitations = await roomService.getPendingRoomInvitations(inviteeId);

      res.json({
        success: true,
        data: invitations,
        message: 'Bekleyen davetler başarıyla alındı',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aktif odaları listele
   * GET /api/rooms
   */
  async getActiveRooms(req, res, next) {
    try {
      const rooms = await roomService.getActiveRooms();

      res.json({
        success: true,
        data: rooms,
        message: 'Aktif odalar başarıyla listelendi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Odaya katıl
   * POST /api/rooms/join
   */
  async joinRoom(req, res, next) {
    try {
      const { roomCode, userId } = req.body;

      if (!roomCode || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Oda kodu ve kullanıcı ID gereklidir',
        });
      }

      const room = await roomService.joinRoom(roomCode, userId);

      res.json({
        success: true,
        data: room,
        message: 'Odaya başarıyla katıldınız',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Oda katılımcılarını listele
   * GET /api/rooms/:code/participants
   */
  async getRoomParticipants(req, res, next) {
    try {
      const { code } = req.params;
      const room = await roomService.getRoomParticipants(code);

      res.json({
        success: true,
        data: room,
        message: 'Katılımcılar başarıyla alındı',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Odayı sil
   * DELETE /api/rooms/:id
   */
  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı ID gereklidir',
        });
      }

      const result = await roomService.deleteRoom(id, userId);

      res.json({
        success: true,
        data: result,
        message: 'Oda başarıyla silindi',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoomController();

