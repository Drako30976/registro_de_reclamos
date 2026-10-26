const express = require('express');
const router = express.Router();
const chatsController = require('../controllers/chats.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/contactos', chatsController.getContactos);
router.get('/unread-count', chatsController.getUnreadCount);
router.get('/mensajes/:contactoId', chatsController.getHistorial);

router.post('/mensajes', chatsController.upload.array('adjuntos', 6), chatsController.enviarMensaje);
router.put('/mensajes/:id', chatsController.editarMensaje);
router.delete('/mensajes/:id', chatsController.eliminarMensaje);

module.exports = router;
