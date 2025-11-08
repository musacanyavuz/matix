/**
 * Room Routes
 * Oda endpoint'leri
 */

const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Aktif odaları listele (GET /api/rooms - bu route en üstte olmalı, çünkü /:code/participants ile çakışabilir)
router.get('/', roomController.getActiveRooms.bind(roomController));

// Yeni oda oluştur
router.post('/', roomController.createRoom.bind(roomController));

// Private room oluştur (authentication gerektirir)
router.post('/private', authenticateToken, roomController.createPrivateRoom.bind(roomController));

// Private room'a davet gönder (authentication gerektirir)
router.post('/invite', authenticateToken, roomController.inviteToRoom.bind(roomController));

// Odaya katıl
router.post('/join', roomController.joinRoom.bind(roomController));

// Oda katılımcılarını listele
router.get('/:code/participants', roomController.getRoomParticipants.bind(roomController));

// Odayı sil
router.delete('/:id', roomController.deleteRoom.bind(roomController));

module.exports = router;

