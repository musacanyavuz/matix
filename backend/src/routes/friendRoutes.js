/**
 * Friend Routes
 * Arkadaşlık endpoint'leri
 */

const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// Arkadaşlık isteği gönder
router.post('/request', friendController.sendFriendRequest.bind(friendController));

// Arkadaşlık isteğini kabul et
router.post('/accept', friendController.acceptFriendRequest.bind(friendController));

// Arkadaşlık isteğini reddet
router.post('/reject', friendController.rejectFriendRequest.bind(friendController));

// Arkadaş listesi
router.get('/', friendController.getFriends.bind(friendController));

// Bekleyen istekler
router.get('/pending', friendController.getPendingRequests.bind(friendController));

// Kullanıcı ara
router.get('/search', friendController.searchUsers.bind(friendController));

// Arkadaşı kaldır
router.delete('/:friendId', friendController.removeFriend.bind(friendController));

module.exports = router;

