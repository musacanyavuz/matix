/**
 * Friend Service
 * Arkadaşlık işlemlerini yönetir (Firebase Firestore)
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { admin } = require('../config/firebase');
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
    const friendshipsSnapshot = await db.collection('friendships')
      .where('status', '==', 'accepted')
      .get();
    
    const existingFriendship = friendshipsSnapshot.docs.find(doc => {
      const data = doc.data();
      return (
        (data.requesterId === requesterId && data.receiverId === receiver.id) ||
        (data.requesterId === receiver.id && data.receiverId === requesterId)
      );
    });

    if (existingFriendship) {
      throw new Error('Bu kullanıcı zaten arkadaşınız');
    }

    // Zaten bekleyen istek var mı kontrol et
    const pendingSnapshot = await db.collection('friendships')
      .where('status', '==', 'pending')
      .get();
    
    const pendingRequest = pendingSnapshot.docs.find(doc => {
      const data = doc.data();
      return (
        (data.requesterId === requesterId && data.receiverId === receiver.id) ||
        (data.requesterId === receiver.id && data.receiverId === requesterId)
      );
    });

    if (pendingRequest) {
      throw new Error('Zaten bekleyen bir arkadaşlık isteği var');
    }

    // Arkadaşlık isteği oluştur
    const friendshipId = uuidv4();
    const now = admin.firestore.Timestamp.now();
    
    const requester = await userService.getUserById(requesterId);
    
    const friendshipData = {
      id: friendshipId,
      requesterId,
      receiverId: receiver.id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('friendships').doc(friendshipId).set(friendshipData);

    return {
      ...friendshipData,
      requester: requester ? {
        id: requester.id,
        nickname: requester.nickname,
        avatar: requester.avatar,
      } : null,
      receiver: {
        id: receiver.id,
        nickname: receiver.nickname,
        avatar: receiver.avatar,
      },
    };
  }

  /**
   * Arkadaşlık isteğini kabul et
   */
  async acceptFriendRequest(friendshipId, receiverId) {
    const friendshipDoc = await db.collection('friendships').doc(friendshipId).get();
    
    if (!friendshipDoc.exists) {
      throw new Error('Arkadaşlık isteği bulunamadı');
    }

    const friendship = { id: friendshipDoc.id, ...friendshipDoc.data() };

    if (friendship.receiverId !== receiverId) {
      throw new Error('Bu isteği kabul etme yetkiniz yok');
    }

    if (friendship.status !== 'pending') {
      throw new Error('Bu istek zaten işlenmiş');
    }

    // İsteği kabul et
    await db.collection('friendships').doc(friendshipId).update({
      status: 'accepted',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Güncellenmiş friendship'i getir
    const updatedDoc = await db.collection('friendships').doc(friendshipId).get();
    const updated = { id: updatedDoc.id, ...updatedDoc.data() };

    // Requester ve receiver bilgilerini getir
    const requester = await userService.getUserById(updated.requesterId);
    const receiver = await userService.getUserById(updated.receiverId);

    return {
      ...updated,
      requester: requester ? {
        id: requester.id,
        nickname: requester.nickname,
        avatar: requester.avatar,
      } : null,
      receiver: receiver ? {
        id: receiver.id,
        nickname: receiver.nickname,
        avatar: receiver.avatar,
      } : null,
    };
  }

  /**
   * Arkadaşlık isteğini reddet
   */
  async rejectFriendRequest(friendshipId, receiverId) {
    const friendshipDoc = await db.collection('friendships').doc(friendshipId).get();
    
    if (!friendshipDoc.exists) {
      throw new Error('Arkadaşlık isteği bulunamadı');
    }

    const friendship = friendshipDoc.data();

    if (friendship.receiverId !== receiverId) {
      throw new Error('Bu isteği reddetme yetkiniz yok');
    }

    // İsteği reddet
    await db.collection('friendships').doc(friendshipId).update({
      status: 'rejected',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return { success: true };
  }

  /**
   * Arkadaş listesi
   */
  async getFriends(userId) {
    const friendshipsSnapshot = await db.collection('friendships')
      .where('status', '==', 'accepted')
      .get();

    const friendships = [];
    
    for (const doc of friendshipsSnapshot.docs) {
      const data = doc.data();
      if (data.requesterId === userId || data.receiverId === userId) {
        friendships.push({ id: doc.id, ...data });
      }
    }

    // Arkadaşları döndür (requester veya receiver olarak)
    const friends = await Promise.all(
      friendships.map(async (f) => {
        const friendId = f.requesterId === userId ? f.receiverId : f.requesterId;
        const friend = await userService.getUserById(friendId);
        
        if (!friend) return null;

        // Aktif oyun bilgisini al
        let currentGame = null;
        if (friend.currentRoomId) {
          try {
            const roomDoc = await db.collection('rooms').doc(friend.currentRoomId).get();
            if (roomDoc.exists) {
              const roomData = roomDoc.data();
              currentGame = {
                roomCode: roomData.code,
                roomId: roomData.id,
              };
            }
          } catch (error) {
            console.error('Aktif oyun bilgisi alınırken hata:', error);
          }
        }
        
        return {
          id: friend.id,
          nickname: friend.nickname,
          avatar: friend.avatar,
          totalScore: friend.totalScore || 0,
          isOnline: friend.isOnline || false,
          currentGame: currentGame,
        };
      })
    );

    return friends.filter(f => f !== null);
  }

  /**
   * Bekleyen arkadaşlık istekleri
   */
  async getPendingRequests(userId) {
    const requestsSnapshot = await db.collection('friendships')
      .where('receiverId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    const requests = [];
    
    for (const doc of requestsSnapshot.docs) {
      const data = doc.data();
      const requester = await userService.getUserById(data.requesterId);
      
      requests.push({
        id: doc.id,
        ...data,
        requester: requester ? {
          id: requester.id,
          nickname: requester.nickname,
          avatar: requester.avatar,
        } : null,
      });
    }

    return requests;
  }

  /**
   * Arkadaşı kaldır
   */
  async removeFriend(userId, friendId) {
    const friendshipsSnapshot = await db.collection('friendships')
      .where('status', '==', 'accepted')
      .get();

    const friendship = friendshipsSnapshot.docs.find(doc => {
      const data = doc.data();
      return (
        (data.requesterId === userId && data.receiverId === friendId) ||
        (data.requesterId === friendId && data.receiverId === userId)
      );
    });

    if (!friendship) {
      throw new Error('Arkadaşlık bulunamadı');
    }

    await db.collection('friendships').doc(friendship.id).delete();

    return { success: true };
  }

  /**
   * Kullanıcı ara (arkadaş eklemek için)
   */
  async searchUsers(query, currentUserId) {
    // Firestore'da case-insensitive arama yok, bu yüzden tüm kullanıcıları getirip filtreleyeceğiz
    const usersSnapshot = await db.collection('users')
      .where('isGuest', '==', false)
      .limit(100) // Performans için limit
      .get();

    const queryLower = query.toLowerCase();
    const users = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => 
        user.id !== currentUserId &&
        (user.nickname?.toLowerCase().includes(queryLower) || 
         user.email?.toLowerCase().includes(queryLower))
      )
      .slice(0, 20)
      .map(user => ({
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        totalScore: user.totalScore || 0,
      }));

    // Arkadaşlık durumunu kontrol et
    const friendshipsSnapshot = await db.collection('friendships').get();
    
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = friendshipsSnapshot.docs.find(doc => {
          const data = doc.data();
          return (
            (data.requesterId === currentUserId && data.receiverId === user.id) ||
            (data.requesterId === user.id && data.receiverId === currentUserId)
          );
        });

        return {
          ...user,
          friendshipStatus: friendship ? friendship.data().status : null,
          friendshipId: friendship ? friendship.id : null,
        };
      })
    );

    return usersWithStatus;
  }
}

module.exports = new FriendService();
