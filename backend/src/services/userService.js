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
   * Macera modu bölüm ilerlemesini güncelle
   */
  async updateAdventureChapter(userId, newChapter) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { adventureChapter: true },
    });

    // Sadece yeni bölüm mevcut bölümden büyükse güncelle
    if (!user || newChapter > user.adventureChapter) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { adventureChapter: newChapter },
        select: { id: true, adventureChapter: true },
      });
      return updatedUser;
    }

    return user;
  }

  /**
   * Kullanıcının macera modu ilerlemesini getir
   */
  async getAdventureProgress(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, adventureChapter: true },
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
    const rooms = await prisma.roomParticipant.findMany({
      where: {
        userId: userId,
      },
      include: {
        room: {
          include: {
            participants: true,
            gameSessions: true, // Soru sayısını hesaplamak için
          },
        },
      },
    });

    let wonGames = 0;
    let totalQuestions = 0;
    let totalCorrectAnswers = 0;

    for (const participant of rooms) {
      const roomParticipants = participant.room.participants;
      const maxScore = Math.max(...roomParticipants.map(p => p.score));
      const userScore = participant.score;
      
      // Oyun kazanma kontrolü
      if (userScore === maxScore && roomParticipants.filter(p => p.score === maxScore).length === 1) {
        wonGames++;
      }

      // Soru sayısı (her oyun 10 soru)
      const questionCount = participant.room.gameSessions.length;
      totalQuestions += questionCount;
      // Doğru cevap sayısı = skor (her doğru cevap +1 puan)
      totalCorrectAnswers += userScore;
    }

    // Yanlış cevap sayısı = toplam soru - doğru cevap
    const totalWrongAnswers = totalQuestions - totalCorrectAnswers;
    
    // Başarı oranı
    const successRate = totalQuestions > 0 
      ? ((totalCorrectAnswers / totalQuestions) * 100).toFixed(1) 
      : 0;

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

    // Günlük performans (son 7 gün)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRooms = await prisma.roomParticipant.findMany({
      where: {
        userId: userId,
        room: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      },
      include: {
        room: {
          include: {
            gameSessions: true,
          },
        },
      },
      orderBy: {
        room: {
          createdAt: 'asc',
        },
      },
    });

    // Günlük performans verileri
    const dailyPerformance = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRooms = recentRooms.filter(p => {
        const roomDate = new Date(p.room.createdAt);
        return roomDate >= date && roomDate < nextDate;
      });

      let dayQuestions = 0;
      let dayCorrect = 0;
      let dayScore = 0;

      dayRooms.forEach(participant => {
        const questionCount = participant.room.gameSessions.length;
        dayQuestions += questionCount;
        dayCorrect += participant.score; // Skor = doğru cevap sayısı
        dayScore += participant.score;
      });

      dailyPerformance.push({
        date: date.toISOString().split('T')[0],
        questions: dayQuestions,
        correct: dayCorrect,
        wrong: dayQuestions - dayCorrect,
        score: dayScore,
        successRate: dayQuestions > 0 ? ((dayCorrect / dayQuestions) * 100).toFixed(1) : 0,
      });
    }

    // Günlük performans artışı (bugün vs dün)
    const todayData = dailyPerformance[dailyPerformance.length - 1];
    const yesterdayData = dailyPerformance[dailyPerformance.length - 2];
    const dailyImprovement = yesterdayData && todayData
      ? ((parseFloat(todayData.successRate) - parseFloat(yesterdayData.successRate)).toFixed(1))
      : '0.0';

    return {
      ...user,
      totalGames,
      wonGames,
      winRate: totalGames > 0 ? ((wonGames / totalGames) * 100).toFixed(1) : 0,
      leaderboardPosition,
      // Performans verileri
      totalQuestions,
      totalCorrectAnswers,
      totalWrongAnswers,
      successRate,
      dailyPerformance,
      dailyImprovement,
    };
  }
}

module.exports = new UserService();

