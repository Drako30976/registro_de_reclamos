const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor, reintente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, authController.login);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
