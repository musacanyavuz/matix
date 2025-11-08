/**
 * Auth Middleware
 * JWT token doğrulama middleware'i
 */

const authService = require('../services/authService');

/**
 * JWT token doğrulama middleware'i
 * req.userId'yi set eder
 */
const authenticateToken = (req, res, next) => {
  try {
    // Token'ı header'dan al
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token gereklidir',
      });
    }

    // Token'ı doğrula
    const { userId } = authService.verifyToken(token);

    // req'e userId ekle
    req.userId = userId;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Geçersiz token',
    });
  }
};

/**
 * Opsiyonel token doğrulama (token yoksa da devam eder)
 * Token varsa req.userId'yi set eder
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { userId } = authService.verifyToken(token);
      req.userId = userId;
    }

    next();
  } catch (error) {
    // Token geçersizse bile devam et (opsiyonel)
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};

