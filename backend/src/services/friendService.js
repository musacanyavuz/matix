/**
 * Friend Service
 * Arkadaşlık işlemlerini yönetir
 */

const prisma = require('../config/database');
const userService = require('./userService');

class FriendService {
  /**
   * Arkadaşlık isteği gönder
   */
  async sendFriendRequest(requesterId, receiverNickname) {
    // Alıcıyı bul
    const receiver = await userService.getUserByNickname(receiverNickname);
    if (!receiver) {
      throw new Error('Kullanıcı bulunamadı');
    }

    if (requesterId === receiver.id) {
      throw new Error('Kendinize arkadaşlık isteği gönderemezsiniz');
    }

    // Zaten arkadaş mı kontrol et
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: requesterId },
        ],
        status: 'accepted',
      },
    });

    if (existingFriendship) {
      throw new Error('Bu kullanıcı zaten arkadaşınız');
    }

    // Zaten bekleyen istek var mı kontrol et
    const pendingRequest = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: receiver.id, status: 'pending' },
          { requesterId: receiver.id, receiverId: requesterId, status: 'pending' },
        ],
      },
    });

    if (pendingRequest) {
      throw new Error('Zaten bekleyen bir arkadaşlık isteği var');
    }

    // Arkadaşlık isteği oluştur
    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        receiverId: receiver.id,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    return friendship;
  }

  /**
   * Arkadaşlık isteğini kabul et
   */
  async acceptFriendRequest(friendshipId, receiverId) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    if (!friendship) {
      throw new Error('Arkadaşlık isteği bulunamadı');
    }

    if (friendship.receiverId !== receiverId) {
      throw new Error('Bu isteği kabul etme yetkiniz yok');
    }

    if (friendship.status !== 'pending') {
      throw new Error('Bu istek zaten işlenmiş');
    }

    // İsteği kabul et
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: 'accepted',
      },
      include: {
        requester: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        receiver: {
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
   * Arkadaşlık isteğini reddet
   */
  async rejectFriendRequest(friendshipId, receiverId) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new Error('Arkadaşlık isteği bulunamadı');
    }

    if (friendship.receiverId !== receiverId) {
      throw new Error('Bu isteği reddetme yetkiniz yok');
    }

    // İsteği reddet
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: 'rejected',
      },
    });

    return { success: true };
  }

  /**
   * Arkadaş listesi
   */
  async getFriends(userId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            totalScore: true,
          },
        },
        receiver: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            totalScore: true,
          },
        },
      },
    });

    // Arkadaşları döndür (requester veya receiver olarak)
    const friends = friendships.map((f) => {
      if (f.requesterId === userId) {
        return f.receiver;
      } else {
        return f.requester;
      }
    });

    return friends;
  }

  /**
   * Bekleyen arkadaşlık istekleri
   */
  async getPendingRequests(userId) {
    const requests = await prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * Arkadaşı kaldır
   */
  async removeFriend(userId, friendId) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: friendId },
          { requesterId: friendId, receiverId: userId },
        ],
        status: 'accepted',
      },
    });

    if (!friendship) {
      throw new Error('Arkadaşlık bulunamadı');
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { success: true };
  }

  /**
   * Kullanıcı ara (arkadaş eklemek için)
   */
  async searchUsers(query, currentUserId) {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { nickname: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          { id: { not: currentUserId } },
          { isGuest: false }, // Sadece kayıtlı kullanıcılar
        ],
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        totalScore: true,
      },
      take: 20,
    });

    // Arkadaşlık durumunu kontrol et
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: currentUserId, receiverId: user.id },
              { requesterId: user.id, receiverId: currentUserId },
            ],
          },
        });

        return {
          ...user,
          friendshipStatus: friendship ? friendship.status : null,
          friendshipId: friendship ? friendship.id : null,
        };
      })
    );

    return usersWithStatus;
  }
}

module.exports = new FriendService();

