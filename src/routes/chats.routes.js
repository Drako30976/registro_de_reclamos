const express = require('express');
const router = express.Router();
const chatsController = require('../controllers/chats.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/contactos', chatsController.getContactos);
router.get('/unread-count', chatsController.getUnreadCount);

// Rutas para historial de conversacion
router.get('/:contactoId', chatsController.getHistorial);
router.get('/mensajes/:contactoId', chatsController.getHistorial);

// Rutas para enviar mensaje (soporta / y /mensajes)
router.post('/', chatsController.upload.any(), chatsController.enviarMensaje);
router.post('/mensajes', chatsController.upload.any(), chatsController.enviarMensaje);

// Rutas para editar mensaje (soporta /:id y /mensajes/:id)
router.put('/:id', chatsController.editarMensaje);
router.put('/mensajes/:id', chatsController.editarMensaje);

// Rutas para eliminar mensaje (soporta /:id y /mensajes/:id)
router.delete('/:id', chatsController.eliminarMensaje);
router.delete('/mensajes/:id', chatsController.eliminarMensaje);

module.exports = router;
