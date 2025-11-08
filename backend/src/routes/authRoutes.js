/**
 * Auth Routes
 * Kimlik doğrulama endpoint'leri
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Kullanıcı kaydı
router.post('/register', authController.register.bind(authController));

// Kullanıcı girişi
router.post('/login', authController.login.bind(authController));

// Mevcut kullanıcı bilgisi (token gereklidir)
router.get('/me', authenticateToken, authController.getMe.bind(authController));

// Misafir kullanıcıyı kayıtlı kullanıcıya dönüştür
router.post('/convert-guest', authController.convertGuest.bind(authController));

// Şifre sıfırlama (geliştirme için)
router.post('/reset-password', authController.resetPassword.bind(authController));

module.exports = router;

