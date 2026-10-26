const express = require('express');
const router = express.Router();
const mensajesController = require('../controllers/mensajes.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/contactos', mensajesController.getContactos);
router.get('/inbox', mensajesController.getInbox);
router.get('/sent', mensajesController.getSent);
router.get('/unread-count', mensajesController.getUnreadCount);
router.get('/:id', mensajesController.getMensajePorId);

router.post('/', mensajesController.upload.array('adjuntos', 10), mensajesController.crearMensaje);

router.patch('/:id/leido', mensajesController.marcarLeido);
router.patch('/:id/favorito', mensajesController.marcarFavorito);
router.delete('/:id', mensajesController.eliminarMensaje);

module.exports = router;
