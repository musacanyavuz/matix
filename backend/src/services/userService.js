/**
 * User Service
 * Kullanıcı işlemlerini yönetir
 */

const prisma = require('../config/database');

class UserService {
  /**
   * Yeni kullanıcı oluştur (misafir veya kayıtlı)
   */
  async createUser(nickname, avatar, isGuest = true) {
    try {
      const user = await prisma.user.create({
        data: {
          nickname,
          avatar,
          isGuest: isGuest, // Misafir kullanıcılar için true
        },
      });
      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Bu takma ad zaten kullanılıyor');
      }
      throw error;
    }
  }

  /**
   * Kullanıcıyı ID ile bul
   */
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  }

  /**
   * Kullanıcıyı nickname ile bul
   */
  async getUserByNickname(nickname) {
    const user = await prisma.user.findUnique({
      where: { nickname },
    });
    return user;
  }

  /**
   * Kullanıcıyı email ile bul
   */
  async getUserByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user;
  }

  /**
   * Kullanıcının toplam skorunu güncelle
   */
  async updateTotalScore(userId, additionalScore) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        totalScore: {
          increment: additionalScore,
        },
      },
    });
    return user;
  }

  /**
   * Global liderlik tablosu (top 10)
   */
  async getLeaderboard(limit = 10) {
    const users = await prisma.user.findMany({
      where: {
        isGuest: false, // Sadece kayıtlı kullanıcılar
      },
      orderBy: {
        totalScore: 'desc',
      },
      take: limit,
      select: {
        id: true,
        nickname: true,
        avatar: true,
        totalScore: true,
      },
    });
    return users;
  }

  /**
   * Kullanıcı profilini güncelle
   */
  async updateProfile(userId, updates) {
    const { nickname, avatar } = updates;

    const updateData = {};
    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return user;
  }

  /**
   * Kullanıcı istatistiklerini getir
   */
  async getUserStats(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        totalScore: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Toplam oyun sayısı (katıldığı oda sayısı)
    const totalGames = await prisma.roomParticipant.count({
      where: {
        userId: userId,
      },
    });

    // Kazanılan oyun sayısı (oda içinde en yüksek skora sahip olduğu oyunlar)
    // Bu hesaplama için her oda için en yüksek skoru bulmamız gerekiyor
    const rooms = await prisma.roomParticipant.findMany({
      where: {
        userId: userId,
      },
      include: {
        room: {
          include: {
            participants: true,
          },
        },
      },
    });

    let wonGames = 0;
    for (const participant of rooms) {
      const roomParticipants = participant.room.participants;
      const maxScore = Math.max(...roomParticipants.map(p => p.score));
      const userScore = participant.score;
      if (userScore === maxScore && roomParticipants.filter(p => p.score === maxScore).length === 1) {
        wonGames++;
      }
    }

    // Liderlik sırası (sadece kayıtlı kullanıcılar arasında)
    const leaderboardPosition = user.isGuest 
      ? null 
      : await prisma.user.count({
          where: {
            isGuest: false,
            totalScore: {
              gt: user.totalScore,
            },
          },
        }) + 1;

    return {
      ...user,
      totalGames,
      wonGames,
      winRate: totalGames > 0 ? ((wonGames / totalGames) * 100).toFixed(1) : 0,
      leaderboardPosition,
    };
  }
}

module.exports = new UserService();

