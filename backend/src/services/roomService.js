/**
 * Room Service
 * Oda işlemlerini yönetir (Firebase Firestore)
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { admin } = require('../config/firebase');
const userService = require('./userService');

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
  async createRoom(hostId, ageGroup = null, isPrivate = false, difficultyLevel = 0, adventureMode = false, chapter = 1) {
    let code;
    let isUnique = false;

    // Benzersiz kod üret
    while (!isUnique) {
      code = this.generateRoomCode();
      const snapshot = await db.collection('rooms')
        .where('code', '==', code)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        isUnique = true;
      }
    }

    const roomId = uuidv4();
    const now = admin.firestore.Timestamp.now();
    
    // Host bilgisini getir
    const host = await userService.getUserById(hostId);
    if (!host) {
      throw new Error('Host kullanıcı bulunamadı');
    }

    const roomData = {
      id: roomId,
      code,
      hostId,
      isActive: true,
      isPrivate: isPrivate,
      ageGroup,
      difficultyLevel: difficultyLevel || 0,
      adventureMode: adventureMode || false,
      currentChapter: adventureMode ? (chapter || 1) : null,
      createdAt: now,
    };

    await db.collection('rooms').doc(roomId).set(roomData);

    return {
      ...roomData,
      host: {
        id: host.id,
        nickname: host.nickname,
        avatar: host.avatar,
      },
    };
  }

  /**
   * Odaya katıl
   */
  async joinRoom(roomCode, userId) {
    // Odayı bul
    const roomSnapshot = await db.collection('rooms')
      .where('code', '==', roomCode)
      .limit(1)
      .get();
    
    if (roomSnapshot.empty) {
      throw new Error('Oda bulunamadı');
    }

    const roomDoc = roomSnapshot.docs[0];
    const room = { id: roomDoc.id, ...roomDoc.data() };

    if (!room.isActive) {
      throw new Error('Oda aktif değil');
    }

    // Zaten katılımcı mı kontrol et
    const existingParticipantSnapshot = await db.collection('room_participants')
      .where('roomId', '==', room.id)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingParticipantSnapshot.empty) {
      // Zaten katılımcı, mevcut odayı döndür
      return await this._getRoomWithDetails(room.id);
    }

    // Maksimum 4 oyuncu kontrolü
    const participantsSnapshot = await db.collection('room_participants')
      .where('roomId', '==', room.id)
      .get();
    
    if (participantsSnapshot.size >= 4) {
      throw new Error('Oda dolu (Maksimum 4 oyuncu)');
    }

    // Katılımcı ekle
    const participantId = uuidv4();
    await db.collection('room_participants').doc(participantId).set({
      id: participantId,
      roomId: room.id,
      userId,
      score: 0,
    });

    // Güncellenmiş odayı döndür
    return await this._getRoomWithDetails(room.id);
  }

  /**
   * Oda detaylarını getir (internal helper)
   */
  async _getRoomWithDetails(roomId) {
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    if (!roomDoc.exists) {
      throw new Error('Oda bulunamadı');
    }

    const room = { id: roomDoc.id, ...roomDoc.data() };

    // Host bilgisini getir
    const host = await userService.getUserById(room.hostId);
    
    // Katılımcıları getir
    const participantsSnapshot = await db.collection('room_participants')
      .where('roomId', '==', roomId)
      .get();
    
    const participants = [];
    for (const participantDoc of participantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const user = await userService.getUserById(participantData.userId);
      
      if (user) {
        participants.push({
          id: participantDoc.id,
          roomId: participantData.roomId,
          userId: participantData.userId,
          score: participantData.score || 0,
          user: {
            id: user.id,
            nickname: user.nickname,
            avatar: user.avatar,
            totalScore: user.totalScore || 0,
            isGuest: user.isGuest || false,
          },
        });
      }
    }

    return {
      ...room,
      host: host ? {
        id: host.id,
        nickname: host.nickname,
        avatar: host.avatar,
      } : null,
      participants,
    };
  }

  /**
   * Oda katılımcısını kaldır
   */
  async removeParticipant(roomCode, userId) {
    const roomSnapshot = await db.collection('rooms')
      .where('code', '==', roomCode)
      .limit(1)
      .get();
    
    if (roomSnapshot.empty) {
      throw new Error('Oda bulunamadı');
    }

    const roomDoc = roomSnapshot.docs[0];
    const roomId = roomDoc.id;

    // Katılımcıyı kaldır
    const participantSnapshot = await db.collection('room_participants')
      .where('roomId', '==', roomId)
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    participantSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return { id: roomId, ...roomDoc.data() };
  }

  /**
   * Odayı deaktif et (tüm oyuncular çıktığında)
   */
  async deactivateRoom(roomCode) {
    const roomSnapshot = await db.collection('rooms')
      .where('code', '==', roomCode)
      .limit(1)
      .get();
    
    if (!roomSnapshot.empty) {
      await roomSnapshot.docs[0].ref.update({
        isActive: false,
      });
    }
  }

  /**
   * Private room oluştur
   */
  async createPrivateRoom(hostId, ageGroup = null, difficultyLevel = 0) {
    const roomCode = this.generateRoomCode();
    const roomId = uuidv4();
    const now = admin.firestore.Timestamp.now();

    const host = await userService.getUserById(hostId);
    if (!host) {
      throw new Error('Host kullanıcı bulunamadı');
    }

    const roomData = {
      id: roomId,
      code: roomCode,
      hostId,
      isActive: true,
      isPrivate: true,
      ageGroup,
      difficultyLevel: difficultyLevel || 0,
      adventureMode: false,
      currentChapter: null,
      createdAt: now,
    };

    await db.collection('rooms').doc(roomId).set(roomData);

    return {
      ...roomData,
      host: {
        id: host.id,
        nickname: host.nickname,
        avatar: host.avatar,
      },
      participants: [],
    };
  }

  /**
   * Private room'a davet gönder
   */
  async inviteToPrivateRoom(roomCode, inviterId, inviteeId) {
    const roomSnapshot = await db.collection('rooms')
      .where('code', '==', roomCode)
      .limit(1)
      .get();
    
    if (roomSnapshot.empty) {
      throw new Error('Oda bulunamadı');
    }

    const roomDoc = roomSnapshot.docs[0];
    const room = { id: roomDoc.id, ...roomDoc.data() };

    if (!room.isPrivate) {
      throw new Error('Bu oda private değil');
    }

    if (room.hostId !== inviterId) {
      throw new Error('Sadece oda sahibi davet gönderebilir');
    }

    // Zaten davet var mı kontrol et
    const existingInvitationSnapshot = await db.collection('room_invitations')
      .where('roomId', '==', room.id)
      .where('inviteeId', '==', inviteeId)
      .limit(1)
      .get();

    if (!existingInvitationSnapshot.empty) {
      throw new Error('Bu kullanıcıya zaten davet gönderilmiş');
    }

    // Davet oluştur
    const invitationId = uuidv4();
    const now = admin.firestore.Timestamp.now();
    
    const invitee = await userService.getUserById(inviteeId);
    const inviter = await userService.getUserById(inviterId);

    const invitationData = {
      id: invitationId,
      roomId: room.id,
      inviterId,
      inviteeId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('room_invitations').doc(invitationId).set(invitationData);

    return {
      ...invitationData,
      invitee: invitee ? {
        id: invitee.id,
        nickname: invitee.nickname,
        avatar: invitee.avatar,
      } : null,
      inviter: inviter ? {
        id: inviter.id,
        nickname: inviter.nickname,
        avatar: inviter.avatar,
      } : null,
      room: {
        id: room.id,
        code: room.code,
        ageGroup: room.ageGroup,
      },
    };
  }

  /**
   * Aktif odaları listele (sadece public ve dolu odalar)
   */
  async getActiveRooms() {
    const roomsSnapshot = await db.collection('rooms')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const rooms = [];
    
    for (const roomDoc of roomsSnapshot.docs) {
      const room = { id: roomDoc.id, ...roomDoc.data() };
      
      // Host bilgisini getir
      const host = await userService.getUserById(room.hostId);
      
      // Katılımcıları getir
      const participantsSnapshot = await db.collection('room_participants')
        .where('roomId', '==', room.id)
        .get();
      
      const participants = [];
      for (const participantDoc of participantsSnapshot.docs) {
        const participantData = participantDoc.data();
        const user = await userService.getUserById(participantData.userId);
        
        if (user) {
          participants.push({
            id: participantDoc.id,
            ...participantData,
            user: {
              id: user.id,
              nickname: user.nickname,
              avatar: user.avatar,
            },
          });
        }
      }

      // En az 1 gerçek oyuncu var mı? (botlar isGuest = true)
      const realPlayers = participants.filter((p) => !p.user.isGuest);
      
      if (realPlayers.length > 0) {
        rooms.push({
          id: room.id,
          code: room.code,
          host: host ? {
            id: host.id,
            nickname: host.nickname,
            avatar: host.avatar,
          } : null,
          ageGroup: room.ageGroup,
          participantCount: participants.length,
          maxParticipants: 4,
          createdAt: room.createdAt,
        });
      }
    }

    return rooms;
  }

  /**
   * Oda katılımcılarını listele
   */
  async getRoomParticipants(roomCode) {
    const roomSnapshot = await db.collection('rooms')
      .where('code', '==', roomCode)
      .limit(1)
      .get();
    
    if (roomSnapshot.empty) {
      throw new Error('Oda bulunamadı');
    }

    return await this._getRoomWithDetails(roomSnapshot.docs[0].id);
  }

  /**
   * Odayı sil (sadece host)
   */
  async deleteRoom(roomId, userId) {
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      throw new Error('Oda bulunamadı');
    }

    const room = roomDoc.data();
    if (room.hostId !== userId) {
      throw new Error('Sadece oda sahibi odayı silebilir');
    }

    await db.collection('rooms').doc(roomId).delete();

    return { message: 'Oda başarıyla silindi' };
  }

  /**
   * Odayı ID ile bul
   */
  async getRoomById(roomId) {
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    
    if (!roomDoc.exists) {
      return null;
    }

    const room = { id: roomDoc.id, ...roomDoc.data() };
    
    // Katılımcıları getir
    const participantsSnapshot = await db.collection('room_participants')
      .where('roomId', '==', roomId)
      .get();
    
    const participants = [];
    for (const participantDoc of participantsSnapshot.docs) {
      const participantData = participantDoc.data();
      const user = await userService.getUserById(participantData.userId);
      
      if (user) {
        participants.push({
          id: participantDoc.id,
          ...participantData,
          user: {
            id: user.id,
            nickname: user.nickname,
            avatar: user.avatar,
          },
        });
      }
    }

    return {
      ...room,
      participants,
    };
  }

  /**
   * Odayı koda göre bul
   */
  async getRoomByCode(roomCode) {
    const roomSnapshot = await db.collection('rooms')
      .where('code', '==', roomCode)
      .limit(1)
      .get();
    
    if (roomSnapshot.empty) {
      return null;
    }

    const roomDoc = roomSnapshot.docs[0];
    return await this._getRoomWithDetails(roomDoc.id);
  }

  /**
   * Oyun oturumu oluştur
   */
  async createGameSession(roomId, questionText, correctAnswer) {
    const sessionId = uuidv4();
    const now = admin.firestore.Timestamp.now();
    
    const sessionData = {
      id: sessionId,
      roomId,
      questionText,
      correctAnswer,
      createdAt: now,
      finished: false,
    };

    await db.collection('game_sessions').doc(sessionId).set(sessionData);
    
    return sessionData;
  }

  /**
   * Katılımcı skorunu güncelle
   */
  async updateParticipantScore(roomId, userId, additionalScore) {
    const participantSnapshot = await db.collection('room_participants')
      .where('roomId', '==', roomId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (participantSnapshot.empty) {
      throw new Error('Katılımcı bulunamadı');
    }

    const participantDoc = participantSnapshot.docs[0];
    const participantData = participantDoc.data();
    const currentScore = participantData.score || 0;

    await participantDoc.ref.update({
      score: currentScore + additionalScore,
    });

    const updatedDoc = await participantDoc.ref.get();
    const updatedData = updatedDoc.data();
    
    const user = await userService.getUserById(userId);

    return {
      id: updatedDoc.id,
      ...updatedData,
      user: user ? {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
      } : null,
    };
  }

  /**
   * Macera modunda bölümü güncelle
   */
  async updateRoomChapter(roomCode, newChapter) {
    const roomSnapshot = await db.collection('rooms')
      .where('code', '==', roomCode)
      .limit(1)
      .get();
    
    if (!roomSnapshot.empty) {
      await roomSnapshot.docs[0].ref.update({
        currentChapter: newChapter,
      });
    }
  }

  /**
   * Oyun oturumunu bitir
   */
  async finishGameSession(sessionId) {
    await db.collection('game_sessions').doc(sessionId).update({
      finished: true,
    });
  }

  /**
   * Arkadaşı oyuna davet et
   */
  async inviteFriendToRoom(inviterId, inviteeId, roomId) {
    // Zaten davet var mı kontrol et
    const existingInvitationSnapshot = await db.collection('room_invitations')
      .where('roomId', '==', roomId)
      .where('inviteeId', '==', inviteeId)
      .where('status', '==', 'pending')
      .get();

    if (!existingInvitationSnapshot.empty) {
      throw new Error('Bu kullanıcıya zaten davet gönderilmiş');
    }

    // Oda bilgisini kontrol et
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    if (!roomDoc.exists) {
      throw new Error('Oda bulunamadı');
    }

    const room = roomDoc.data();
    
    // Oda dolu mu kontrol et
    const participantsSnapshot = await db.collection('room_participants')
      .where('roomId', '==', roomId)
      .get();
    
    if (participantsSnapshot.size >= 4) {
      throw new Error('Oda dolu (Maksimum 4 oyuncu)');
    }

    // Davet oluştur
    const invitationId = uuidv4();
    const now = admin.firestore.Timestamp.now();
    
    await db.collection('room_invitations').doc(invitationId).set({
      id: invitationId,
      roomId,
      inviterId,
      inviteeId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: invitationId,
      roomId,
      roomCode: room.code,
      inviterId,
      inviteeId,
      status: 'pending',
      createdAt: now,
    };
  }

  /**
   * Oda davetini kabul et
   */
  async acceptRoomInvitation(invitationId, inviteeId) {
    const invitationDoc = await db.collection('room_invitations').doc(invitationId).get();
    
    if (!invitationDoc.exists) {
      throw new Error('Davet bulunamadı');
    }

    const invitation = { id: invitationDoc.id, ...invitationDoc.data() };

    if (invitation.inviteeId !== inviteeId) {
      throw new Error('Bu daveti kabul etme yetkiniz yok');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Bu davet zaten işlenmiş');
    }

    // Odaya katıl
    const room = await this.joinRoom(invitation.roomCode, inviteeId);

    // Daveti kabul olarak işaretle
    await db.collection('room_invitations').doc(invitationId).update({
      status: 'accepted',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return room;
  }

  /**
   * Oda davetini reddet
   */
  async rejectRoomInvitation(invitationId, inviteeId) {
    const invitationDoc = await db.collection('room_invitations').doc(invitationId).get();
    
    if (!invitationDoc.exists) {
      throw new Error('Davet bulunamadı');
    }

    const invitation = { id: invitationDoc.id, ...invitationDoc.data() };

    if (invitation.inviteeId !== inviteeId) {
      throw new Error('Bu daveti reddetme yetkiniz yok');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Bu davet zaten işlenmiş');
    }

    // Daveti reddet olarak işaretle
    await db.collection('room_invitations').doc(invitationId).update({
      status: 'rejected',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return { success: true };
  }

  /**
   * Kullanıcının bekleyen oda davetlerini getir
   */
  async getPendingRoomInvitations(inviteeId) {
    const invitationsSnapshot = await db.collection('room_invitations')
      .where('inviteeId', '==', inviteeId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const invitations = [];
    
    for (const doc of invitationsSnapshot.docs) {
      const data = doc.data();
      const roomDoc = await db.collection('rooms').doc(data.roomId).get();
      const inviter = await userService.getUserById(data.inviterId);
      
      if (roomDoc.exists && inviter) {
        const roomData = roomDoc.data();
        invitations.push({
          id: doc.id,
          roomId: data.roomId,
          roomCode: roomData.code,
          inviter: {
            id: inviter.id,
            nickname: inviter.nickname,
            avatar: inviter.avatar,
          },
          createdAt: data.createdAt,
        });
      }
    }

    return invitations;
  }
}

module.exports = new RoomService();
