/**
 * User Routes
 * Kullanıcı endpoint'leri
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Yeni kullanıcı oluştur (misafir kullanıcılar için)
router.post('/', userController.createUser.bind(userController));

// Liderlik tablosu
router.get('/leaderboard', userController.getLeaderboard.bind(userController));

// Kullanıcı istatistiklerini getir (stats route'u :id'den önce olmalı)
router.get('/stats/:userId', userController.getUserStats.bind(userController));

// Kullanıcı profilini güncelle (token gereklidir)
router.put('/profile', authenticateToken, userController.updateProfile.bind(userController));

// Macera modu ilerlemesini getir (token gereklidir)
router.get('/adventure/progress', authenticateToken, userController.getAdventureProgress.bind(userController));

// Kullanıcıyı ID ile getir (en sona)
router.get('/:id', userController.getUserById.bind(userController));

module.exports = router;

