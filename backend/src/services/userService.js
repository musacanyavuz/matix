/**
 * User Service
 * Kullanıcı işlemlerini yönetir (Firebase Firestore)
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { admin } = require('../config/firebase');

class UserService {
  /**
   * Yeni kullanıcı oluştur (misafir veya kayıtlı)
   */
  async createUser(nickname, avatar, isGuest = true) {
    try {
      // Nickname unique kontrolü
      const existingUser = await this.getUserByNickname(nickname);
      if (existingUser) {
        throw new Error('Bu takma ad zaten kullanılıyor');
      }

      const userId = uuidv4();
      const now = admin.firestore.Timestamp.now();
      
      const userData = {
        id: userId,
        nickname,
        avatar,
        isGuest: isGuest,
        totalScore: 0,
        isOnline: false,
        lastSeen: admin.firestore.Timestamp.now(),
        currentRoomId: null,
        adventureChapter: 1,
        lastLogin: null,
        createdAt: now,
      };

      await db.collection('users').doc(userId).set(userData);
      
      return userData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Kullanıcıyı ID ile bul
   */
  async getUserById(userId) {
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Kullanıcıyı nickname ile bul
   */
  async getUserByNickname(nickname) {
    const snapshot = await db.collection('users')
      .where('nickname', '==', nickname)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Kullanıcıyı email ile bul
   */
  async getUserByEmail(email) {
    if (!email) return null;
    
    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Kullanıcının toplam skorunu güncelle
   */
  async updateTotalScore(userId, additionalScore) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    const currentScore = userDoc.data().totalScore || 0;
    await userRef.update({
      totalScore: currentScore + additionalScore,
    });
    
    const updatedDoc = await userRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  /**
   * Global liderlik tablosu (top 10)
   */
  async getLeaderboard(limit = 10) {
    const snapshot = await db.collection('users')
      .where('isGuest', '==', false)
      .orderBy('totalScore', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nickname: data.nickname,
        avatar: data.avatar,
        totalScore: data.totalScore || 0,
      };
    });
  }

  /**
   * Kullanıcı profilini güncelle
   */
  async updateProfile(userId, updates) {
    const { nickname, avatar } = updates;
    const updateData = {};
    
    if (nickname) {
      // Nickname unique kontrolü
      const existingUser = await this.getUserByNickname(nickname);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Bu takma ad zaten kullanılıyor');
      }
      updateData.nickname = nickname;
    }
    
    if (avatar) {
      updateData.avatar = avatar;
    }

    await db.collection('users').doc(userId).update(updateData);
    
    const updatedDoc = await db.collection('users').doc(userId).get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  /**
   * Macera modu bölüm ilerlemesini güncelle
   */
  async updateAdventureChapter(userId, newChapter) {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('Kullanıcı bulunamadı');
    }
    
    const userData = userDoc.data();
    const currentChapter = userData.adventureChapter || 1;
    
    // Sadece yeni bölüm mevcut bölümden büyükse güncelle
    if (newChapter > currentChapter) {
      await userRef.update({ adventureChapter: newChapter });
      return {
        id: userDoc.id,
        adventureChapter: newChapter,
      };
    }
    
    return {
      id: userDoc.id,
      adventureChapter: currentChapter,
    };
  }

  /**
   * Kullanıcının macera modu ilerlemesini getir
   */
  async getAdventureProgress(userId) {
    const user = await this.getUserById(userId);
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      adventureChapter: user.adventureChapter || 1,
    };
  }

  /**
   * Kullanıcı istatistiklerini getir
   */
  async getUserStats(userId) {
    const user = await this.getUserById(userId);
    
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Toplam oyun sayısı (katıldığı oda sayısı)
    const participantsSnapshot = await db.collection('room_participants')
      .where('userId', '==', userId)
      .get();
    
    const totalGames = participantsSnapshot.size;

    // Katıldığı odaları getir
    const roomIds = [...new Set(participantsSnapshot.docs.map(doc => doc.data().roomId))];
    
    let wonGames = 0;
    let totalQuestions = 0;
    let totalCorrectAnswers = 0;

    // Her oda için detaylı bilgi
    for (const roomId of roomIds) {
      const roomDoc = await db.collection('rooms').doc(roomId).get();
      if (!roomDoc.exists) continue;
      
      const roomData = roomDoc.data();
      
      // Oda katılımcılarını getir
      const roomParticipantsSnapshot = await db.collection('room_participants')
        .where('roomId', '==', roomId)
        .get();
      
      const participants = roomParticipantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Kullanıcının skorunu bul
      const userParticipant = participants.find(p => p.userId === userId);
      if (!userParticipant) continue;
      
      const userScore = userParticipant.score || 0;
      const maxScore = Math.max(...participants.map(p => p.score || 0));
      
      // Oyun kazanma kontrolü
      if (userScore === maxScore && participants.filter(p => (p.score || 0) === maxScore).length === 1) {
        wonGames++;
      }
      
      // Soru sayısı (game sessions)
      const gameSessionsSnapshot = await db.collection('game_sessions')
        .where('roomId', '==', roomId)
        .get();
      
      const questionCount = gameSessionsSnapshot.size;
      totalQuestions += questionCount;
      totalCorrectAnswers += userScore;
    }

    // Yanlış cevap sayısı = toplam soru - doğru cevap
    const totalWrongAnswers = totalQuestions - totalCorrectAnswers;
    
    // Başarı oranı
    const successRate = totalQuestions > 0 
      ? ((totalCorrectAnswers / totalQuestions) * 100).toFixed(1) 
      : 0;

    // Liderlik sırası (sadece kayıtlı kullanıcılar arasında)
    let leaderboardPosition = null;
    if (!user.isGuest) {
      const higherScoreUsers = await db.collection('users')
        .where('isGuest', '==', false)
        .where('totalScore', '>', user.totalScore || 0)
        .get();
      
      leaderboardPosition = higherScoreUsers.size + 1;
    }

    // Günlük performans (son 7 gün)
    const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const recentParticipantsSnapshot = await db.collection('room_participants')
      .where('userId', '==', userId)
      .get();
    
    const recentRooms = [];
    for (const participantDoc of recentParticipantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const roomDoc = await db.collection('rooms').doc(participantData.roomId).get();
      
      if (roomDoc.exists) {
        const roomData = roomDoc.data();
        const createdAt = roomData.createdAt;
        
        if (createdAt && createdAt.toMillis() >= sevenDaysAgo.toMillis()) {
          const gameSessionsSnapshot = await db.collection('game_sessions')
            .where('roomId', '==', participantData.roomId)
            .get();
          
          recentRooms.push({
            participant: { id: participantDoc.id, ...participantData },
            room: { id: roomDoc.id, ...roomData, createdAt },
            questionCount: gameSessionsSnapshot.size,
          });
        }
      }
    }

    // Günlük performans verileri
    const dailyPerformance = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRooms = recentRooms.filter(r => {
        const roomDate = r.room.createdAt.toDate();
        return roomDate >= date && roomDate < nextDate;
      });

      let dayQuestions = 0;
      let dayCorrect = 0;
      let dayScore = 0;

      dayRooms.forEach(room => {
        dayQuestions += room.questionCount;
        dayCorrect += room.participant.score || 0;
        dayScore += room.participant.score || 0;
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
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      totalScore: user.totalScore || 0,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      totalGames,
      wonGames,
      winRate: totalGames > 0 ? ((wonGames / totalGames) * 100).toFixed(1) : 0,
      leaderboardPosition,
      totalQuestions,
      totalCorrectAnswers,
      totalWrongAnswers,
      successRate,
      dailyPerformance,
      dailyImprovement,
    };
  }

  /**
   * Kullanıcının online durumunu güncelle
   */
  async setUserOnline(userId) {
    try {
      await db.collection('users').doc(userId).update({
        isOnline: true,
        lastSeen: admin.firestore.Timestamp.now(),
      });
    } catch (error) {
      console.error('Online durumu güncellenirken hata:', error);
    }
  }

  /**
   * Kullanıcının offline durumunu güncelle
   */
  async setUserOffline(userId) {
    try {
      await db.collection('users').doc(userId).update({
        isOnline: false,
        lastSeen: admin.firestore.Timestamp.now(),
        currentRoomId: null, // Odayı da temizle
      });
    } catch (error) {
      console.error('Offline durumu güncellenirken hata:', error);
    }
  }

  /**
   * Kullanıcının aktif oyununu güncelle
   */
  async setUserCurrentRoom(userId, roomId) {
    try {
      await db.collection('users').doc(userId).update({
        currentRoomId: roomId || null,
      });
    } catch (error) {
      console.error('Aktif oyun güncellenirken hata:', error);
    }
  }
}

module.exports = new UserService();
