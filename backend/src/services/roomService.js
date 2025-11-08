/**
 * Room Service
 * Oda işlemlerini yönetir
 */

const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RoomService {
  /**
   * Rastgele oda kodu üret (6 karakter)
   */
  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Yeni oda oluştur
   */
  async createRoom(hostId, ageGroup = null, isPrivate = false, difficultyLevel = 0) {
    let code;
    let isUnique = false;

    // Benzersiz kod üret
    while (!isUnique) {
      code = this.generateRoomCode();
      const existing = await prisma.room.findUnique({
        where: { code },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    const room = await prisma.room.create({
      data: {
        code,
        hostId,
        isPrivate: isPrivate,
        ageGroup,
        difficultyLevel: difficultyLevel || 0,
      },
      include: {
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    return room;
  }

  /**
   * Odaya katıl
   */
  async joinRoom(roomCode, userId) {
    // Odayı bul
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    if (!room) {
      throw new Error('Oda bulunamadı');
    }

    if (!room.isActive) {
      throw new Error('Oda aktif değil');
    }

    // Zaten katılımcı mı kontrol et
    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId,
        },
      },
    });

    if (existingParticipant) {
      return room;
    }

    // Maksimum 4 oyuncu kontrolü (bot dahil)
    if (room.participants.length >= 4) {
      throw new Error('Oda dolu (Maksimum 4 oyuncu)');
    }

    // Katılımcı ekle
    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId,
      },
    });

    // Güncellenmiş odayı döndür
    const updatedRoom = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                totalScore: true,
              },
            },
          },
        },
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    return updatedRoom;
  }

  /**
   * Oda katılımcısını kaldır
   */
  async removeParticipant(roomCode, userId) {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: true,
      },
    });

    if (!room) {
      throw new Error('Oda bulunamadı');
    }

    // Katılımcıyı kaldır
    await prisma.roomParticipant.deleteMany({
      where: {
        roomId: room.id,
        userId: userId,
      },
    });

    return room;
  }

  /**
   * Odayı deaktif et (tüm oyuncular çıktığında)
   */
  async deactivateRoom(roomCode) {
    await prisma.room.update({
      where: { code: roomCode },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Private room oluştur
   */
  async createPrivateRoom(hostId, ageGroup = null, difficultyLevel = 0) {
    const roomCode = this.generateRoomCode();
    const room = await prisma.room.create({
      data: {
        code: roomCode,
        hostId,
        isActive: true,
        isPrivate: true,
        ageGroup,
        difficultyLevel: difficultyLevel || 0,
      },
      include: {
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return room;
  }

  /**
   * Private room'a davet gönder
   */
  async inviteToPrivateRoom(roomCode, inviterId, inviteeId) {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
    });

    if (!room) {
      throw new Error('Oda bulunamadı');
    }

    if (!room.isPrivate) {
      throw new Error('Bu oda private değil');
    }

    if (room.hostId !== inviterId) {
      throw new Error('Sadece oda sahibi davet gönderebilir');
    }

    // Zaten davet var mı kontrol et
    const existingInvitation = await prisma.roomInvitation.findUnique({
      where: {
        roomId_inviteeId: {
          roomId: room.id,
          inviteeId: inviteeId,
        },
      },
    });

    if (existingInvitation) {
      throw new Error('Bu kullanıcıya zaten davet gönderilmiş');
    }

    // Davet oluştur
    const invitation = await prisma.roomInvitation.create({
      data: {
        roomId: room.id,
        inviterId: inviterId,
        inviteeId: inviteeId,
        status: 'pending',
      },
      include: {
        invitee: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        inviter: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        room: {
          select: {
            id: true,
            code: true,
            ageGroup: true,
          },
        },
      },
    });

    return invitation;
  }

  /**
   * Aktif odaları listele (sadece public ve dolu odalar)
   * GET /api/rooms
   */
  async getActiveRooms() {
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
      },
      include: {
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Son 20 aktif oda
    });

    // Sadece en az 1 gerçek oyuncusu olan odaları döndür (botlar hariç)
    return rooms
      .filter((room) => {
        // En az 1 gerçek oyuncu var mı? (botlar nickname'inde "Bot" içerir)
        const realPlayers = room.participants.filter((p) => !p.user.nickname.includes('Bot'));
        return realPlayers.length > 0;
      })
      .map((room) => ({
        id: room.id,
        code: room.code,
        host: room.host,
        ageGroup: room.ageGroup,
        participantCount: room.participants.length,
        maxParticipants: 4,
        createdAt: room.createdAt,
      }));
  }

  /**
   * Oda katılımcılarını listele
   */
  async getRoomParticipants(roomCode) {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                totalScore: true,
              },
            },
          },
        },
        host: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    if (!room) {
      throw new Error('Oda bulunamadı');
    }

    return room;
  }

  /**
   * Odayı sil (sadece host)
   */
  async deleteRoom(roomId, userId) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error('Oda bulunamadı');
    }

    if (room.hostId !== userId) {
      throw new Error('Sadece oda sahibi odayı silebilir');
    }

    await prisma.room.delete({
      where: { id: roomId },
    });

    return { message: 'Oda başarıyla silindi' };
  }

  /**
   * Odayı ID ile bul
   */
  async getRoomById(roomId) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    return room;
  }

  /**
   * Odayı koda göre bul
   */
  async getRoomByCode(roomCode) {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    return room;
  }

  /**
   * Oyun oturumu oluştur
   */
  async createGameSession(roomId, questionText, correctAnswer) {
    const session = await prisma.gameSession.create({
      data: {
        roomId,
        questionText,
        correctAnswer,
      },
    });
    return session;
  }

  /**
   * Katılımcı skorunu güncelle
   */
  async updateParticipantScore(roomId, userId, additionalScore) {
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new Error('Katılımcı bulunamadı');
    }

    const updated = await prisma.roomParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      data: {
        score: {
          increment: additionalScore,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Oyun oturumunu bitir
   */
  async finishGameSession(sessionId) {
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { finished: true },
    });
  }
}

module.exports = new RoomService();

