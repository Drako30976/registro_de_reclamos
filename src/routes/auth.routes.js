const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');

router.post('/login', authController.login);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
